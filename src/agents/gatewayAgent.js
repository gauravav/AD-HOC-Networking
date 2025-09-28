const { HelloMessage, AlertMessage, AckMessage, MessageTypes } = require('../messages');

class GatewayAgent {
  constructor(id, x, y, communicationRange = 15, maxSensors = 10) {
    this.id = id;
    this.location = { x, y };
    this.communicationRange = communicationRange; // Larger range than sensors
    this.maxSensors = maxSensors; // Max sensors this gateway can handle
    this.batteryLevel = 1.0; // Gateways have better power
    this.isActive = true;
    this.isGateway = true;

    // Connected sensors
    this.connectedSensors = new Set();
    this.sensorData = new Map(); // Store latest data from each sensor

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
      .some(data => data.waterLevel > 1.5);
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
}

module.exports = GatewayAgent;