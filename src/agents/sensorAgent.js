const { HelloMessage, AlertMessage, AckMessage, MessageTypes } = require('../messages');

class SensorAgent {
  constructor(id, x, y, communicationRange = 5, maxNeighbors = 5) {
    this.id = id;
    this.location = { x, y };
    this.communicationRange = communicationRange; // 5 meters
    this.originalCommunicationRange = communicationRange; // Store original range
    this.maxNeighbors = maxNeighbors; // max number of neighbors to maintain
    this.batteryLevel = Math.random() * 0.3 + 0.7; // 70-100%
    this.waterLevel = 0;
    this.waterThreshold = 1.0; // meters
    this.isActive = true;
    this.isFlooding = false; // Track if flooding is detected
    this.connectivityReliability = 1.0; // 100% connectivity reliability initially
    this.centralServerConnectivity = true; // Can reach central server directly
    this.hopCount = 0; // Current hop count for routing

    // Message handling
    this.messageBuffer = [];
    this.sentMessages = new Set();
    this.receivedMessages = new Set();
    this.neighbors = new Set();
    this.neighborData = new Map(); // Store neighbor details

    // Timers
    this.helloInterval = null;
    this.waterReportInterval = null;
    this.lastHeartbeat = Date.now();

    this.startPeriodicTasks();
  }

  startPeriodicTasks() {
    // Disable random HELLO messages - now using round-robin scheduling
    // HELLO messages are now sent via scheduled round-robin communication

    // Keep this method for potential future use or water reporting
    // Individual sensors no longer send random HELLO messages
  }

  stop() {
    if (this.helloInterval) {
      clearInterval(this.helloInterval);
    }
    if (this.waterReportInterval) {
      clearInterval(this.waterReportInterval);
    }
  }

  updateFloodConnectivity(level) {
    // Progressive connectivity degradation based on realistic flood water levels
    // Measured in meters - based on real-world flood severity standards

    if (level >= 2.5) {
      // Complete sensor failure at 2.5+ meters - catastrophic flooding
      if (this.isActive) {
        this.fail();
        this.log(`Sensor ${this.id} failed due to catastrophic flood level: ${level.toFixed(1)}m`);
        return;
      }
    } else if (level >= 1.5) {
      // Major flooding: 1.5-2.5m - severe equipment damage
      this.connectivityReliability = 0.2; // 20% reliability
      this.communicationRange *= 0.4; // 40% range
      if (Math.random() < 0.6) { // 60% chance of failure
        this.fail();
        this.log(`Sensor ${this.id} failed due to major flood level: ${level.toFixed(1)}m`);
        return;
      }
    } else if (level >= 1.0) {
      // Moderate flooding: 1.0-1.5m - significant equipment stress
      this.connectivityReliability = 0.5; // 50% reliability
      this.communicationRange *= 0.6; // 60% range
      if (Math.random() < 0.3) { // 30% chance of failure
        this.fail();
        this.log(`Sensor ${this.id} failed due to moderate flood level: ${level.toFixed(1)}m`);
        return;
      }
    } else if (level >= 0.5) {
      // Early flooding: 0.5-1.0m - minor equipment impact
      this.connectivityReliability = 0.8; // 80% reliability
      this.communicationRange *= 0.8; // 80% range
      if (Math.random() < 0.1) { // 10% chance of failure
        this.fail();
        this.log(`Sensor ${this.id} failed due to early flood level: ${level.toFixed(1)}m`);
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

      // Attempt automatic recovery if node was previously failed due to flooding
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

    if (level > this.waterThreshold && this.isActive) {
      if (!this.isFlooding) {
        // First detection of flooding
        this.isFlooding = true;
        this.detectFlood();
        this.startWaterLevelReporting();
      } else {
        // Continuous reporting during flooding
        this.reportWaterLevel();
      }
    } else if (this.isFlooding && level <= this.waterThreshold) {
      // Flooding has receded
      this.isFlooding = false;
      this.stopWaterLevelReporting();
      // Send final clear alert with current low water level
      this.reportWaterLevel();
    }
  }

  detectFlood() {
    const alert = new AlertMessage(
      this.id,
      this.location,
      this.waterLevel,
      'HIGH'
    );

    // Send to central server immediately
    this.deliverToCentralServer(alert);

    // Also broadcast to neighbors
    this.broadcastMessage(alert);
    return alert;
  }

  startWaterLevelReporting() {
    // Start reporting water levels every 10 seconds during flooding
    this.waterReportInterval = setInterval(() => {
      if (this.isActive && this.isFlooding) {
        this.reportWaterLevel();
      }
    }, 10000); // 10 seconds
  }

  stopWaterLevelReporting() {
    if (this.waterReportInterval) {
      clearInterval(this.waterReportInterval);
      this.waterReportInterval = null;
    }
  }

  reportWaterLevel() {
    if (!this.isActive) return;

    const alert = new AlertMessage(
      this.id,
      this.location,
      this.waterLevel,
      this.waterLevel > 3.0 ? 'CRITICAL' :
      this.waterLevel > 2.0 ? 'HIGH' :
      this.waterLevel > 1.5 ? 'MEDIUM' : 'LOW'
    );

    // Send current water level to central server
    this.deliverToCentralServer(alert);
  }

  broadcastHello() {
    // Emergency broadcast HELLO (used only for flooding/critical situations)
    // Regular HELLO messages are now sent via round-robin scheduling
    const nearestNeighbors = this.getNearestNeighbors();

    const hello = new HelloMessage(
      this.id,
      this.batteryLevel,
      this.location,
      nearestNeighbors
    );

    // Mark as emergency broadcast
    hello.data.emergencyBroadcast = true;

    // Send to central server for emergency situations
    this.deliverToCentralServer(hello);

    // Also broadcast to neighbors for emergency coordination
    this.broadcastMessage(hello);
  }

  broadcastMessage(message) {
    if (!this.isActive) return;

    this.sentMessages.add(message.id);
    this.messageBuffer.push({
      message,
      timestamp: Date.now(),
      action: 'broadcast'
    });

    // Simulate battery drain
    this.batteryLevel -= 0.001;
    if (this.batteryLevel <= 0) {
      this.isActive = false;
    }
  }

  receiveMessage(message, fromAgent) {
    if (!this.isActive || this.receivedMessages.has(message.id)) {
      return false;
    }

    // Check if within communication range
    const distance = this.calculateDistance(fromAgent.location);
    if (distance > this.communicationRange) {
      return false;
    }

    // Apply connectivity reliability due to flood conditions
    if (Math.random() > this.connectivityReliability) {
      // Message lost due to flood-related connectivity issues
      return false;
    }

    this.receivedMessages.add(message.id);
    this.processMessage(message, fromAgent);

    return true;
  }

  processMessage(message, fromAgent) {
    switch (message.type) {
      case MessageTypes.HELLO:
        this.processHelloMessage(message, fromAgent);
        break;
      case MessageTypes.ALERT:
        this.processAlertMessage(message, fromAgent);
        break;
      case MessageTypes.ACK:
        this.processAckMessage(message);
        break;
    }
  }

  processHelloMessage(message, fromAgent) {
    // Calculate distance to this neighbor
    const distance = this.calculateDistance(fromAgent.location);

    // Store detailed neighbor information
    this.neighborData.set(fromAgent.id, {
      id: fromAgent.id,
      location: fromAgent.location,
      batteryLevel: fromAgent.batteryLevel,
      lastSeen: Date.now(),
      distance: distance
    });

    // Limit neighbors to maxNeighbors nearest ones
    this.pruneNeighbors();

    // Update neighbors set based on current neighbor data
    this.neighbors.clear();
    this.neighborData.forEach((data, id) => {
      this.neighbors.add(id);
    });

    // Send ACK
    const ack = new AckMessage(this.id, message.id, 'RECEIVED');
    this.sendMessage(ack, fromAgent);
  }

  processAlertMessage(message, fromAgent) {
    // Send ACK first
    const ack = new AckMessage(this.id, message.id, 'RECEIVED');
    this.sendMessage(ack, fromAgent);

    // Deliver directly to central server
    this.deliverToCentralServer(message);

    // Also forward to neighbors for redundancy
    this.forwardAlert(message);
  }

  processAckMessage(message) {
    // Handle acknowledgment
    this.messageBuffer.push({
      message,
      timestamp: Date.now(),
      action: 'ack_received'
    });
  }

  forwardAlert(originalMessage) {
    // Don't forward if we've already sent this message
    if (this.sentMessages.has(originalMessage.id)) {
      return;
    }

    // Create forwarded message
    const forwardedMessage = { ...originalMessage };
    forwardedMessage.hopCount++;

    // Limit hop count to prevent infinite loops
    if (forwardedMessage.hopCount > 10) {
      return;
    }

    this.broadcastMessage(forwardedMessage);
  }

  deliverToCentralServer(message) {
    // Attempt multi-hop routing in flat organization
    if (this.centralServerConnectivity) {
      // Direct delivery to central server
      this.log(`Direct delivery to central server (connectivity: ${this.centralServerConnectivity})`);
      this.messageBuffer.push({
        message,
        timestamp: Date.now(),
        action: 'central_server_delivery',
        hopCount: 0,
        route: [this.id]
      });
    } else {
      // Use multi-hop routing through neighbors
      this.log(`No direct connectivity - attempting multi-hop delivery (neighbors: ${this.neighbors.size})`);
      this.attemptMultiHopDelivery(message);
    }
  }

  attemptMultiHopDelivery(message) {
    // Find the best neighbor to forward message towards central server
    const bestNeighbor = this.findBestNeighborForRouting();

    if (bestNeighbor) {
      // Forward message to best neighbor for relay
      const relayMessage = {
        ...message,
        isRelayMessage: true,
        originalSender: this.id,
        hopCount: (message.hopCount || 0) + 1,
        route: [...(message.route || []), this.id],
        forwardedBy: this.id,
        targetDestination: 'CENTRAL_SERVER'
      };

      // Send to neighbor for forwarding
      bestNeighbor.receiveRelayMessage(relayMessage, this);

      this.log(`Relaying message via neighbor ${bestNeighbor.id} (hop ${relayMessage.hopCount})`);
    } else {
      // No available neighbors - store for later retry
      this.messageBuffer.push({
        message,
        timestamp: Date.now(),
        action: 'retry_later',
        hopCount: message.hopCount || 0,
        retryCount: (message.retryCount || 0) + 1
      });

      this.log(`No neighbors available for relay - will retry later`);
    }
  }

  findBestNeighborForRouting() {
    // Find active neighbors that can potentially reach central server
    const availableNeighbors = Array.from(this.neighborData.values())
      .filter(neighbor => {
        // Check if neighbor is active and has connectivity
        const neighborAgent = this.getNeighborAgent(neighbor.id);
        return neighborAgent &&
               neighborAgent.isActive &&
               (neighborAgent.centralServerConnectivity || neighborAgent.neighbors.size > 0);
      })
      .sort((a, b) => {
        // Sort by battery level and connectivity strength
        const neighborA = this.getNeighborAgent(a.id);
        const neighborB = this.getNeighborAgent(b.id);

        if (!neighborA || !neighborB) return 0;

        // Prefer neighbors with direct central server connectivity
        if (neighborA.centralServerConnectivity && !neighborB.centralServerConnectivity) return -1;
        if (!neighborA.centralServerConnectivity && neighborB.centralServerConnectivity) return 1;

        // Then prefer higher battery levels
        return neighborB.batteryLevel - neighborA.batteryLevel;
      });

    return availableNeighbors.length > 0 ? this.getNeighborAgent(availableNeighbors[0].id) : null;
  }

  receiveRelayMessage(relayMessage, fromAgent) {
    if (!this.isActive) return false;

    // Prevent routing loops
    if (relayMessage.route && relayMessage.route.includes(this.id)) {
      return false;
    }

    // Check hop count limit to prevent infinite routing
    if (relayMessage.hopCount > 10) {
      this.log(`Dropping message - hop count exceeded limit`);
      return false;
    }

    // Apply connectivity reliability
    if (Math.random() > this.connectivityReliability) {
      return false;
    }

    // If we can reach central server, deliver it
    if (this.centralServerConnectivity) {
      this.messageBuffer.push({
        message: relayMessage,
        timestamp: Date.now(),
        action: 'central_server_delivery',
        hopCount: relayMessage.hopCount,
        route: [...relayMessage.route, this.id]
      });

      this.log(`Relayed message to central server (${relayMessage.hopCount} hops)`);
      return true;
    } else {
      // Continue multi-hop routing
      this.attemptMultiHopDelivery(relayMessage);
      return true;
    }
  }

  // Helper method to get neighbor agent reference (needs to be provided by simulation)
  getNeighborAgent(neighborId) {
    // This will be set by the simulation to provide access to other agents
    return this.simulation ? this.simulation.getAgentById(neighborId) : null;
  }

  sendMessage(message, targetAgent) {
    if (targetAgent && targetAgent.receiveMessage) {
      targetAgent.receiveMessage(message, this);
    }
  }

  calculateDistance(otherLocation) {
    const dx = this.location.x - otherLocation.x;
    const dy = this.location.y - otherLocation.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getNearestNeighbors() {
    // Convert neighbor data to array with distances
    const neighborsWithDistance = Array.from(this.neighborData.values()).map(neighbor => ({
      id: neighbor.id,
      location: neighbor.location,
      batteryLevel: neighbor.batteryLevel,
      distance: neighbor.distance || this.calculateDistance(neighbor.location),
      lastSeen: neighbor.lastSeen
    }));

    // Sort by distance (nearest first) and limit to maxNeighbors
    return neighborsWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, this.maxNeighbors);
  }

  pruneNeighbors() {
    // If we have more neighbors than allowed, keep only the nearest ones
    if (this.neighborData.size > this.maxNeighbors) {
      const allNeighbors = Array.from(this.neighborData.entries()).map(([id, data]) => ({
        id,
        ...data,
        distance: data.distance || this.calculateDistance(data.location)
      }));

      // Sort by distance and keep only the nearest maxNeighbors
      const nearestNeighbors = allNeighbors
        .sort((a, b) => a.distance - b.distance)
        .slice(0, this.maxNeighbors);

      // Clear and rebuild neighbor data with only nearest neighbors
      this.neighborData.clear();
      nearestNeighbors.forEach(neighbor => {
        this.neighborData.set(neighbor.id, {
          id: neighbor.id,
          location: neighbor.location,
          batteryLevel: neighbor.batteryLevel,
          lastSeen: neighbor.lastSeen,
          distance: neighbor.distance
        });
      });
    }
  }

  createScheduledDataMessage() {
    // Create a HELLO message for scheduled round-robin communication
    const nearestNeighbors = this.getNearestNeighbors();

    const hello = new HelloMessage(
      this.id,
      this.batteryLevel,
      this.location,
      nearestNeighbors
    );

    // Add additional sensor data for scheduled transmission
    hello.data = {
      ...hello.data,
      waterLevel: this.waterLevel,
      isFlooding: this.isFlooding,
      lastHeartbeat: this.lastHeartbeat,
      scheduledTransmission: true,
      timestamp: Date.now()
    };

    return hello;
  }

  log(message) {
    console.log(`[${this.id}] ${message}`);
  }

  getStatus() {
    return {
      id: this.id,
      location: this.location,
      batteryLevel: this.batteryLevel,
      waterLevel: this.waterLevel,
      isActive: this.isActive,
      neighborCount: this.neighbors.size,
      messageCount: this.messageBuffer.length,
      connectivityReliability: this.connectivityReliability,
      communicationRange: this.communicationRange
    };
  }

  // Simulate hardware failure
  fail() {
    this.isActive = false;
    this.stop();
  }

  // Restore from failure (manual restoration)
  restore() {
    if (this.batteryLevel > 0) {
      this.isActive = true;
      this.startPeriodicTasks();
    }
  }

  // Automatic recovery from flood damage
  recover() {
    if (this.batteryLevel > 0) {
      this.isActive = true;
      this.startPeriodicTasks();
      this.log(`Sensor ${this.id} recovered automatically after flood waters receded`);

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
      this.getNearestNeighbors()
    );

    // Mark as recovery message
    recoveryMessage.data.recoveryNotification = true;
    recoveryMessage.data.recoveredAt = Date.now();

    // Send to central server and neighbors
    this.deliverToCentralServer(recoveryMessage);
    this.broadcastMessage(recoveryMessage);
  }
}

module.exports = SensorAgent;