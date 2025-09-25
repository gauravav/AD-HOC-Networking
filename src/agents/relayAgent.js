const SensorAgent = require('./sensorAgent');
const { AckMessage } = require('../messages');

class RelayAgent extends SensorAgent {
  constructor(id, x, y, communicationRange = 8) {
    super(id, x, y, communicationRange);

    // Enhanced capabilities for relay nodes
    this.batteryLevel = Math.random() * 0.2 + 0.8; // 80-100%
    this.maxForwardingHops = 15;
    this.messageCache = new Map();
    this.forwardingQueue = [];
    this.maxQueueSize = 100;

    // Relay-specific settings
    this.isRelay = true;
    this.priority = 'HIGH'; // Higher priority for message forwarding
    this.hasStrongerRadio = true;

    this.startRelayTasks();
  }

  startRelayTasks() {
    // Process forwarding queue more frequently
    this.forwardingInterval = setInterval(() => {
      this.processForwardingQueue();
    }, 5000); // Every 5 seconds

    // Clean up old cached messages
    this.cleanupInterval = setInterval(() => {
      this.cleanupMessageCache();
    }, 60000); // Every minute
  }

  stop() {
    super.stop();
    if (this.forwardingInterval) {
      clearInterval(this.forwardingInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  processAlertMessage(message, fromAgent) {
    // Send ACK first
    const ack = new AckMessage(this.id, message.id, 'RECEIVED');
    this.sendMessage(ack, fromAgent);

    // Cache message to prevent duplicates
    this.messageCache.set(message.id, {
      message,
      timestamp: Date.now(),
      hopCount: message.hopCount
    });

    // If we have gateway connection, deliver immediately
    if (this.hasGatewayConnection) {
      this.deliverToGateway(message);
    } else {
      // Enhanced forwarding for relay nodes
      this.enhancedForwardAlert(message);
    }
  }

  enhancedForwardAlert(originalMessage) {
    // Don't forward if we've already processed this message
    if (this.sentMessages.has(originalMessage.id)) {
      return;
    }

    // Check if message is already in cache (duplicate)
    if (this.messageCache.has(originalMessage.id)) {
      const cached = this.messageCache.get(originalMessage.id);
      if (cached.hopCount <= originalMessage.hopCount) {
        return; // Don't forward if we've seen a better path
      }
    }

    // Add to forwarding queue for intelligent forwarding
    this.forwardingQueue.push({
      message: originalMessage,
      timestamp: Date.now(),
      priority: this.calculateMessagePriority(originalMessage)
    });

    // Limit queue size
    if (this.forwardingQueue.length > this.maxQueueSize) {
      this.forwardingQueue.sort((a, b) => b.priority - a.priority);
      this.forwardingQueue = this.forwardingQueue.slice(0, this.maxQueueSize);
    }
  }

  calculateMessagePriority(message) {
    let priority = 0;

    // Higher priority for flood alerts
    if (message.data.eventType === 'FLOOD_DETECTED') {
      priority += 100;
    }

    // Higher priority for high water levels
    if (message.data.waterLevel > 2.0) {
      priority += 50;
    }

    // Lower priority for messages that have traveled far
    priority -= message.hopCount * 5;

    // Higher priority for recent messages
    const age = Date.now() - message.timestamp;
    priority -= age / 1000; // Reduce priority by age in seconds

    return priority;
  }

  processForwardingQueue() {
    if (this.forwardingQueue.length === 0 || !this.isActive) {
      return;
    }

    // Sort by priority
    this.forwardingQueue.sort((a, b) => b.priority - a.priority);

    // Process top priority messages
    const messagesToForward = this.forwardingQueue.splice(0, 3);

    for (const item of messagesToForward) {
      this.intelligentForward(item.message);
    }
  }

  intelligentForward(message) {
    // Don't forward if hop count is too high
    if (message.hopCount >= this.maxForwardingHops) {
      return;
    }

    // Create forwarded message with relay signature
    const forwardedMessage = {
      ...message,
      hopCount: message.hopCount + 1,
      relayedBy: this.id,
      relayTimestamp: Date.now()
    };

    // Forward to best neighbors (those with good battery and connectivity)
    const bestNeighbors = this.selectBestForwardingNeighbors();

    if (bestNeighbors.length > 0) {
      this.broadcastMessage(forwardedMessage);
    }
  }

  selectBestForwardingNeighbors() {
    // In a real implementation, this would analyze neighbor quality
    // For simulation, return all active neighbors
    return Array.from(this.neighbors);
  }

  cleanupMessageCache() {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    for (const [messageId, cached] of this.messageCache.entries()) {
      if (now - cached.timestamp > maxAge) {
        this.messageCache.delete(messageId);
      }
    }
  }

  // Override to handle higher battery consumption
  broadcastMessage(message) {
    if (!this.isActive) return;

    this.sentMessages.add(message.id);
    this.messageBuffer.push({
      message,
      timestamp: Date.now(),
      action: 'relay_broadcast'
    });

    // Relay nodes consume more battery due to stronger radio
    this.batteryLevel -= 0.002;
    if (this.batteryLevel <= 0) {
      this.isActive = false;
    }
  }

  getStatus() {
    const baseStatus = super.getStatus();
    return {
      ...baseStatus,
      isRelay: true,
      cacheSize: this.messageCache.size,
      queueSize: this.forwardingQueue.length,
      maxForwardingHops: this.maxForwardingHops
    };
  }

  // Enhanced failure recovery for critical relay nodes
  restore() {
    super.restore();
    if (this.isActive) {
      this.startRelayTasks();
    }
  }
}

module.exports = RelayAgent;