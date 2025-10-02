const { HelloMessage, AlertMessage, AckMessage, MessageTypes } = require('../messages');

class SensorAgent {
  constructor(id, x, y, communicationRange = 5, maxNeighbors = 5) {
    this.id = id;
    this.location = { x, y };
    this.communicationRange = communicationRange; // 5 meters
    this.maxNeighbors = maxNeighbors; // max number of neighbors to maintain
    this.batteryLevel = Math.random() * 0.3 + 0.7; // 70-100%
    this.waterLevel = 0;
    this.waterThreshold = 1.0; // meters
    this.isActive = true;
    this.isFlooding = false; // Track if flooding is detected

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

  updateWaterLevel(level) {
    this.waterLevel = level;

    // Check for sensor failure when water level exceeds 2m
    if (level > 2.0 && this.isActive) {
      // Randomly fail one of the sensors in the flood zone
      // This sensor has a chance to fail due to high water level
      if (Math.random() < 0.3) { // 30% chance of failure when water exceeds 2m
        this.fail();
        return; // Exit early since sensor has failed
      }
    }

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
    this.messageBuffer.push({
      message,
      timestamp: Date.now(),
      action: 'central_server_delivery'
    });
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

  getStatus() {
    return {
      id: this.id,
      location: this.location,
      batteryLevel: this.batteryLevel,
      waterLevel: this.waterLevel,
      isActive: this.isActive,
      neighborCount: this.neighbors.size,
      messageCount: this.messageBuffer.length
    };
  }

  // Simulate hardware failure
  fail() {
    this.isActive = false;
    this.stop();
  }

  // Restore from failure
  restore() {
    if (this.batteryLevel > 0) {
      this.isActive = true;
      this.startPeriodicTasks();
    }
  }
}

module.exports = SensorAgent;