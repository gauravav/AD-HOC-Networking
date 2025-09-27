const { HelloMessage, AlertMessage, AckMessage, MessageTypes } = require('../messages');

class SensorAgent {
  constructor(id, x, y, communicationRange = 5) {
    this.id = id;
    this.location = { x, y };
    this.communicationRange = communicationRange; // 5 meters
    this.batteryLevel = Math.random() * 0.3 + 0.7; // 70-100%
    this.waterLevel = 0;
    this.waterThreshold = 1.5; // meters
    this.isActive = true;

    // Message handling
    this.messageBuffer = [];
    this.sentMessages = new Set();
    this.receivedMessages = new Set();
    this.neighbors = new Set();
    this.neighborData = new Map(); // Store neighbor details

    // Timers
    this.helloInterval = null;
    this.lastHeartbeat = Date.now();

    this.startPeriodicTasks();
  }

  startPeriodicTasks() {
    // Send HELLO messages every 30-60 seconds
    const helloIntervalMs = (30 + Math.random() * 30) * 1000;
    this.helloInterval = setInterval(() => {
      if (this.isActive) {
        this.broadcastHello();
      }
    }, helloIntervalMs);
  }

  stop() {
    if (this.helloInterval) {
      clearInterval(this.helloInterval);
    }
  }

  updateWaterLevel(level) {
    this.waterLevel = level;
    if (level > this.waterThreshold && this.isActive) {
      this.detectFlood();
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

  broadcastHello() {
    // Collect neighbor data for central server
    const neighborInfo = Array.from(this.neighborData.values()).map(neighbor => ({
      id: neighbor.id,
      location: neighbor.location,
      batteryLevel: neighbor.batteryLevel,
      distance: this.calculateDistance(neighbor.location),
      lastSeen: neighbor.lastSeen
    }));

    const hello = new HelloMessage(
      this.id,
      this.batteryLevel,
      this.location,
      neighborInfo
    );

    // Always send to central server (100% chance)
    if (Math.random() < 1) {
      this.deliverToCentralServer(hello);
    }

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
    this.neighbors.add(fromAgent.id);

    // Store detailed neighbor information
    this.neighborData.set(fromAgent.id, {
      id: fromAgent.id,
      location: fromAgent.location,
      batteryLevel: fromAgent.batteryLevel,
      lastSeen: Date.now()
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