const { HelloMessage, AlertMessage, AckMessage, MessageTypes } = require('../messages');

class GatewayAgent {
  constructor(id, x, y, communicationRange = 15, maxSensors = 10) {
    this.id = id;
    this.location = { x, y };
    this.communicationRange = communicationRange; // Larger range than sensors
    this.originalCommunicationRange = communicationRange; // Store original range
    this.maxSensors = maxSensors; // Max sensors this gateway can handle
    this.batteryLevel = 1.0; // Gateways have better power
    this.isActive = true;
    this.isGateway = true;
    this.waterLevel = 0; // Track flood water level at gateway location
    this.connectivityReliability = 1.0; // 100% connectivity reliability initially

    // Connected sensors
    this.connectedSensors = new Set();
    this.sensorData = new Map(); // Store latest data from each sensor
    
    // Connected gateways for inter-gateway communication
    this.connectedGateways = new Set();

    // Message handling
    this.messageBuffer = [];
    this.forwardingQueue = [];
    this.receivedMessages = new Set();
    this.lastHeartbeat = Date.now();

    // Forwarding metrics
    this.messagesForwarded = 0;
    this.forwardingDelay = 50; // ms delay for message processing

    this.startPeriodicTasks();
  }

  startPeriodicTasks() {
    // Process forwarding queue
    this.forwardingInterval = setInterval(() => {
      this.processForwardingQueue();
    }, this.forwardingDelay);

    // Send gateway status to central server
    this.statusInterval = setInterval(() => {
      if (this.isActive) {
        this.broadcastGatewayStatus();
      }
    }, 60000); // Every minute
  }

  stop() {
    if (this.forwardingInterval) {
      clearInterval(this.forwardingInterval);
    }
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }
  }

  updateFloodConnectivity(level) {
    // Progressive connectivity degradation based on realistic flood water levels
    // Measured in meters - based on real-world flood severity standards

    if (level >= 2.5) {
      // Complete gateway failure at 2.5+ meters - catastrophic flooding
      if (this.isActive) {
        this.fail();
        this.log(`Gateway ${this.id} failed due to catastrophic flood level: ${level.toFixed(1)}m`);
        return;
      }
    } else if (level >= 1.5) {
      // Major flooding: 1.5-2.5m - severe equipment damage
      this.connectivityReliability = 0.2; // 20% reliability
      this.communicationRange *= 0.4; // 40% range
      if (Math.random() < 0.6) { // 60% chance of failure
        this.fail();
        this.log(`Gateway ${this.id} failed due to major flood level: ${level.toFixed(1)}m`);
        return;
      }
    } else if (level >= 1.0) {
      // Moderate flooding: 1.0-1.5m - significant equipment stress
      this.connectivityReliability = 0.5; // 50% reliability
      this.communicationRange *= 0.6; // 60% range
      if (Math.random() < 0.3) { // 30% chance of failure
        this.fail();
        this.log(`Gateway ${this.id} failed due to moderate flood level: ${level.toFixed(1)}m`);
        return;
      }
    } else if (level >= 0.5) {
      // Early flooding: 0.5-1.0m - minor equipment impact
      this.connectivityReliability = 0.8; // 80% reliability
      this.communicationRange *= 0.8; // 80% range
      if (Math.random() < 0.1) { // 10% chance of failure
        this.fail();
        this.log(`Gateway ${this.id} failed due to early flood level: ${level.toFixed(1)}m`);
        return;
      }
    } else if (level >= 0.2) {
      // Light water exposure: 0.2-0.5m - minimal impact
      this.connectivityReliability = 0.95; // 95% reliability
      this.communicationRange *= 0.95; // 95% range
    } else {
      // Normal operation - restore full connectivity if water recedes
      this.connectivityReliability = 1.0; // 100% reliability
      this.communicationRange = this.originalCommunicationRange || this.communicationRange;

      // Attempt automatic recovery if gateway was previously failed due to flooding
      if (!this.isActive && this.batteryLevel > 0) {
        // Recovery chance based on how long the water has been low
        const recoveryChance = 0.8; // 80% chance of successful recovery when water recedes
        if (Math.random() < recoveryChance) {
          this.recover();
        }
      }
    }
  }

  updateWaterLevel(level) {
    this.waterLevel = level;

    // Check for flood-based connectivity degradation and failure
    this.updateFloodConnectivity(level);
  }

  log(message) {
    console.log(`[GATEWAY ${this.id}] ${message}`);
  }

  // Simulate hardware failure
  fail() {
    this.isActive = false;
    this.stop();
    // Disconnect all sensors when gateway fails
    this.connectedSensors.clear();
    this.sensorData.clear();
  }

  // Automatic recovery from flood damage
  recover() {
    if (this.batteryLevel > 0) {
      this.isActive = true;
      this.startPeriodicTasks();
      this.log(`Gateway ${this.id} recovered automatically after flood waters receded`);

      // Reset communication range to original
      this.communicationRange = this.originalCommunicationRange;

      // Send recovery notification
      this.broadcastRecoveryNotification();
    }
  }

  // Broadcast recovery notification to network
  broadcastRecoveryNotification() {
    const recoveryMessage = new HelloMessage(
      this.id,
      this.batteryLevel,
      this.location,
      Array.from(this.connectedSensors),
      'GATEWAY'
    );

    // Mark as recovery message
    recoveryMessage.data.recoveryNotification = true;
    recoveryMessage.data.recoveredAt = Date.now();
    recoveryMessage.data.gatewayRecovery = true;

    // Send to central server
    this.forwardToCentralServer(recoveryMessage, this, 1);
  }

  // Register a sensor with this gateway
  registerSensor(sensor) {
    if (this.connectedSensors.size < this.maxSensors) {
      this.connectedSensors.add(sensor.id);
      this.sensorData.set(sensor.id, {
        location: sensor.location,
        lastSeen: Date.now(),
        batteryLevel: sensor.batteryLevel,
        waterLevel: sensor.waterLevel
      });
      return true;
    }
    return false;
  }

  // Remove a sensor from this gateway
  unregisterSensor(sensorId) {
    this.connectedSensors.delete(sensorId);
    this.sensorData.delete(sensorId);
  }

  // Receive message from sensor or other gateway
  receiveMessage(message, sender) {
    if (!this.isActive) return;

    // Prevent processing same message twice
    if (this.receivedMessages.has(message.id)) return;

    // Apply connectivity reliability due to flood conditions
    if (Math.random() > this.connectivityReliability) {
      // Message lost due to flood-related connectivity issues
      return;
    }

    this.receivedMessages.add(message.id);

    // Update sender info if it's a connected sensor
    if (this.connectedSensors.has(sender.id)) {
      this.updateSensorData(sender.id, sender);
    }

    // Add to forwarding queue for central server
    this.forwardingQueue.push({
      message: message,
      originalSender: sender,
      receivedAt: Date.now(),
      hops: (message.hops || 0) + 1
    });
  }

  updateSensorData(sensorId, sensorData) {
    const existing = this.sensorData.get(sensorId) || {};
    this.sensorData.set(sensorId, {
      ...existing,
      lastSeen: Date.now(),
      batteryLevel: sensorData.batteryLevel,
      waterLevel: sensorData.waterLevel,
      location: sensorData.location
    });
  }

  processForwardingQueue() {
    while (this.forwardingQueue.length > 0) {
      const item = this.forwardingQueue.shift();
      this.forwardToCentralServer(item.message, item.originalSender, item.hops);
      this.messagesForwarded++;
    }
  }

  forwardToCentralServer(message, originalSender, hops) {
    // Add federation-specific metadata
    const federatedMessage = {
      ...message,
      gatewayId: this.id,
      originalSender: originalSender.id,
      hops: hops,
      forwardedAt: Date.now(),
      forwardingLatency: Date.now() - message.timestamp
    };

    // Store in message buffer for simulation processing
    this.messageBuffer.push({
      message: federatedMessage,
      sender: originalSender,
      timestamp: Date.now(),
      action: 'central_server_delivery'
    });

    // Simulate battery drain (less than sensors)
    this.batteryLevel -= 0.0005;
    if (this.batteryLevel <= 0) {
      this.isActive = false;
      this.connectedSensors.clear();
    }
  }

  broadcastGatewayStatus() {
    const statusMessage = new HelloMessage(
      this.id,
      this.batteryLevel,
      this.location,
      Array.from(this.connectedSensors),
      'GATEWAY'
    );

    // Add gateway-specific info
    statusMessage.data = {
      ...statusMessage.data,
      connectedSensors: this.connectedSensors.size,
      messagesForwarded: this.messagesForwarded,
      sensorData: Array.from(this.sensorData.entries()).map(([id, data]) => ({
        sensorId: id,
        lastSeen: data.lastSeen,
        waterLevel: data.waterLevel,
        batteryLevel: data.batteryLevel
      }))
    };

    this.forwardToCentralServer(statusMessage, this, 1);
  }

  // Get average water level from connected sensors
  getAverageWaterLevel() {
    const waterLevels = Array.from(this.sensorData.values())
      .map(data => data.waterLevel)
      .filter(level => level > 0);

    if (waterLevels.length === 0) return 0;
    return waterLevels.reduce((sum, level) => sum + level, 0) / waterLevels.length;
  }

  // Check if any connected sensor has high water level
  hasFloodingAlert() {
    return Array.from(this.sensorData.values())
      .some(data => data.waterLevel > 1.0);
  }

  // Get statistics for this gateway
  getStats() {
    return {
      id: this.id,
      location: this.location,
      isActive: this.isActive,
      connectedSensors: this.connectedSensors.size,
      messagesForwarded: this.messagesForwarded,
      batteryLevel: this.batteryLevel,
      waterLevel: this.waterLevel,
      connectivityReliability: this.connectivityReliability,
      communicationRange: this.communicationRange,
      averageWaterLevel: this.getAverageWaterLevel(),
      hasFlooding: this.hasFloodingAlert()
    };
  }

  // Calculate distance to another node
  calculateDistance(location) {
    const dx = this.location.x - location.x;
    const dy = this.location.y - location.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Check if a sensor is within communication range
  canCommunicateWith(sensor) {
    return this.calculateDistance(sensor.location) <= this.communicationRange;
  }

  // Send message to other gateways (inter-gateway communication)
  broadcastToGateways(message, excludeGatewayIds = []) {
    if (!this.isActive) return;
    
    // Forward message to all connected gateways except excluded ones
    this.connectedGateways.forEach(gatewayId => {
      if (!excludeGatewayIds.includes(gatewayId)) {
        // In a real implementation, this would send over network
        // For simulation, we'll add to a broadcast queue
        console.log(`Gateway ${this.id} broadcasting to Gateway ${gatewayId}`);
      }
    });
  }

  // Receive message from another gateway
  receiveFromGateway(message, senderGatewayId) {
    if (!this.isActive) return;
    
    // Prevent loops - don't process if we've seen this message
    if (this.receivedMessages.has(message.id)) return;
    
    console.log(`Gateway ${this.id} received message from Gateway ${senderGatewayId}`);
    
    // Process the message (forward to central server if needed)
    this.receiveMessage(message, { id: senderGatewayId, isGateway: true });
  }
}

module.exports = GatewayAgent;