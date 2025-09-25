const { v4: uuidv4 } = require('uuid');

class MessageTypes {
  static HELLO = 'HELLO';
  static ALERT = 'ALERT';
  static ACK = 'ACK';
}

class Message {
  constructor(type, senderId, data = {}) {
    this.id = uuidv4();
    this.type = type;
    this.senderId = senderId;
    this.timestamp = Date.now();
    this.data = data;
    this.hopCount = 0;
    this.signature = this.generateSignature();
  }

  generateSignature() {
    return `${this.senderId}-${this.timestamp}-${Math.random().toString(36).substr(2, 9)}`;
  }

  incrementHop() {
    this.hopCount++;
  }
}

class HelloMessage extends Message {
  constructor(senderId, batteryLevel, location) {
    super(MessageTypes.HELLO, senderId, {
      batteryLevel,
      location,
      nodeType: 'sensor'
    });
  }
}

class AlertMessage extends Message {
  constructor(senderId, location, waterLevel, priority = 'HIGH') {
    super(MessageTypes.ALERT, senderId, {
      location,
      waterLevel,
      priority,
      eventType: 'FLOOD_DETECTED'
    });
  }
}

class AckMessage extends Message {
  constructor(senderId, originalMessageId, status = 'RECEIVED') {
    super(MessageTypes.ACK, senderId, {
      originalMessageId,
      status
    });
  }
}

module.exports = {
  MessageTypes,
  Message,
  HelloMessage,
  AlertMessage,
  AckMessage
};