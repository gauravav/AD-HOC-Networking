const SensorAgent = require('./agents/sensorAgent');
const CoordinationAgent = require('./agents/coordinationAgent');
const { MessageTypes } = require('./messages');

class FloodWatchSimulation {
  constructor(config = {}, io = null) {
    this.config = {
      gridWidth: config.gridWidth || 100, // 100 meters
      gridHeight: config.gridHeight || 50, // 50 meters
      sensorCount: config.sensorCount || 100,
      communicationRange: config.communicationRange || 5, // meters
      simulationSpeed: config.simulationSpeed || 1000, // ms per tick
      ...config
    };

    this.io = io;
    this.isRunning = false;
    this.currentTick = 0;

    // Simulation components
    this.sensors = [];
    this.coordinationAgent = new CoordinationAgent('COORD-1');
    this.centralServer = { id: 'CENTRAL-SERVER', messagesReceived: [] };

    // Grid and positioning (100m x 50m)
    this.grid = Array(this.config.gridWidth).fill(null).map(() =>
      Array(this.config.gridHeight).fill(null)
    );

    // Simulation metrics
    this.metrics = {
      messagesGenerated: 0,
      messagesDelivered: 0,
      messagesLost: 0,
      averageDelay: 0,
      networkOverhead: 0,
      duplicatesRemoved: 0,
      incidentsCreated: 0,
      nodeFailures: 0
    };

    this.simulationLog = [];
    this.initializeNetwork();
  }

  initializeNetwork() {
    // Create only sensor nodes
    const totalNodes = this.config.sensorCount;

    // Generate positions for all nodes
    const positions = this.generateNodePositions(totalNodes);

    // Create sensor agents with configurable communication range
    for (let i = 0; i < totalNodes; i++) {
      const pos = positions[i];
      const sensor = new SensorAgent(`SENSOR-${i}`, pos.x, pos.y, this.config.communicationRange);
      this.sensors.push(sensor);
      this.grid[pos.x][pos.y] = sensor;
    }

    // Initialize neighbor discovery
    this.discoverNeighbors();

    this.log('Network initialized', {
      sensors: totalNodes,
      gridSize: `${this.config.gridWidth}m x ${this.config.gridHeight}m`
    });
  }

  generateNodePositions(count) {
    const positions = [];
    const occupied = new Set();

    while (positions.length < count) {
      const x = Math.floor(Math.random() * this.config.gridWidth);
      const y = Math.floor(Math.random() * this.config.gridHeight);
      const key = `${x},${y}`;

      if (!occupied.has(key)) {
        positions.push({ x, y });
        occupied.add(key);
      }
    }

    return positions;
  }


  discoverNeighbors() {
    for (const node of this.sensors) {
      for (const otherNode of this.sensors) {
        if (node.id !== otherNode.id) {
          const distance = node.calculateDistance(otherNode.location);
          if (distance <= node.communicationRange) {
            node.neighbors.add(otherNode.id);
          }
        }
      }
    }
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.simulationTimer = setInterval(() => {
      this.tick();
    }, this.config.simulationSpeed);

    this.log('Simulation started');
    this.emit('simulation-status', { running: true, tick: this.currentTick });
  }

  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
    }

    // Stop all agents
    this.sensors.forEach(agent => agent.stop());
    this.coordinationAgent.stop();

    this.log('Simulation stopped');
    this.emit('simulation-status', { running: false, tick: this.currentTick });
  }

  tick() {
    this.currentTick++;

    // Process messages between agents
    this.processMessagePropagation();

    // Process coordination (incident management)
    this.processIncidentCoordination();

    // Update metrics
    this.updateMetrics();

    // Random flood events
    if (Math.random() < 0.02) { // 2% chance per tick
      this.log('🌊 Auto flood event triggered randomly', { type: 'AUTO_FLOOD' });
      this.triggerRandomFlood();
    }

    // Emit status update
    if (this.currentTick % 10 === 0) { // Every 10 ticks
      this.emitStatusUpdate();
    }
  }

  processMessagePropagation() {
    // Collect all pending messages
    const pendingMessages = [];
    const centralServerMessages = [];

    for (const node of this.sensors) {
      if (!node.isActive || node.messageBuffer.length === 0) continue;

      const messages = [...node.messageBuffer];
      node.messageBuffer = []; // Clear buffer

      for (const msgData of messages) {
        if (msgData.action === 'broadcast') {
          pendingMessages.push({
            sender: node,
            message: msgData.message,
            timestamp: msgData.timestamp
          });
        } else if (msgData.action === 'central_server_delivery') {
          centralServerMessages.push({
            sender: node,
            message: msgData.message,
            timestamp: msgData.timestamp
          });
        }
      }
    }

    // Propagate messages between nodes
    for (const msgData of pendingMessages) {
      this.propagateMessage(msgData.sender, msgData.message);
    }

    // Send messages to central server
    for (const msgData of centralServerMessages) {
      this.deliverToCentralServer(msgData.message, msgData.sender);
    }
  }

  propagateMessage(sender, message) {
    let deliveredCount = 0;

    for (const receiver of this.sensors) {
      if (receiver.id === sender.id || !receiver.isActive) continue;

      const distance = sender.calculateDistance(receiver.location);
      if (distance <= sender.communicationRange) {
        // Simulate message loss due to interference/distance
        const deliveryProbability = Math.max(0.7, 1 - (distance / sender.communicationRange) * 0.3);

        if (Math.random() < deliveryProbability) {
          receiver.receiveMessage(message, sender);
          deliveredCount++;
        } else {
          this.metrics.messagesLost++;
        }
      }
    }

    this.metrics.messagesGenerated++;
    this.metrics.messagesDelivered += deliveredCount;
  }

  deliverToCentralServer(message, sender) {
    // Central server receives all messages (100% delivery)
    const serverMessage = {
      message,
      sender: sender.id,
      timestamp: Date.now(),
      location: sender.location
    };

    this.centralServer.messagesReceived.push(serverMessage);

    // Process alert messages through coordination agent
    if (message.type === MessageTypes.ALERT) {
      const result = this.coordinationAgent.processAlert(message);
      if (result.action === 'INCIDENT_CREATED') {
        this.metrics.incidentsCreated++;
      } else if (result.action === 'DUPLICATE_REMOVED') {
        this.metrics.duplicatesRemoved++;
      }
    }

    // Emit central server message for UI
    this.emit('central-server-message', {
      type: message.type,
      sender: sender.id,
      location: sender.location,
      data: message.data || message,
      timestamp: Date.now()
    });

    // Enhanced logging for HELLO messages with neighbor data
    if (message.type === MessageTypes.HELLO && message.data.neighbors) {
      const neighborCount = message.data.neighbors.length;
      const neighborList = message.data.neighbors.map(n =>
        `${n.id}@(${n.location.x},${n.location.y})`
      ).join(', ');

      this.log(`💻 Central Server received ${message.type} from ${sender.id} | Battery: ${message.data.batteryLevel.toFixed(2)} | Neighbors[${neighborCount}]: ${neighborList || 'none'}`, {
        messageType: message.type,
        sender: sender.id,
        location: sender.location,
        batteryLevel: message.data.batteryLevel,
        neighborCount: neighborCount,
        neighbors: message.data.neighbors
      });
    } else {
      this.log(`💻 Central Server received ${message.type} from ${sender.id}`, {
        messageType: message.type,
        sender: sender.id,
        location: sender.location
      });
    }
  }


  processIncidentCoordination() {
    // Let coordination agent generate reports
    const report = this.coordinationAgent.generateIncidentReports();
    if (report) {
      this.emit('incident-report', report);
    }
  }

  updateMetrics() {
    this.metrics.networkOverhead = this.calculateNetworkOverhead();
    this.metrics.averageDelay = this.calculateAverageDelay();
    this.metrics.duplicatesRemoved = this.coordinationAgent.duplicateAlerts.size;

    // Calculate delivery success rate
    if (this.metrics.messagesGenerated > 0) {
      this.metrics.deliverySuccessRate =
        (this.metrics.messagesDelivered / this.metrics.messagesGenerated) * 100;
    }
  }

  calculateNetworkOverhead() {
    // Simplified calculation: ratio of control messages to data messages
    let controlMessages = 0;
    let dataMessages = 0;

    for (const node of this.sensors) {
      controlMessages += node.sentMessages.size; // Approximate
      // Data messages would be actual sensor readings
    }

    return controlMessages > 0 ? (controlMessages / (controlMessages + dataMessages)) * 100 : 0;
  }

  calculateAverageDelay() {
    // Simplified: average based on hop counts
    const incidents = this.coordinationAgent.getAllActiveIncidents();
    if (incidents.length === 0) return 0;

    let totalDelay = 0;
    let messageCount = 0;

    for (const incident of incidents) {
      for (const alert of incident.alerts) {
        totalDelay += (alert.hopCount || 0) * 100; // 100ms per hop
        messageCount++;
      }
    }

    return messageCount > 0 ? totalDelay / messageCount : 0;
  }




  triggerRandomFlood() {
    const x = Math.floor(Math.random() * this.config.gridWidth);
    const y = Math.floor(Math.random() * this.config.gridHeight);
    const waterLevel = 1.5 + Math.random() * 2; // 1.5 to 3.5 meters

    this.triggerFlood(x, y, waterLevel);
  }

  triggerFlood(x, y, waterLevel) {
    // Affect multiple nodes in the area
    const affectedNodes = [];

    for (const node of this.sensors) {
      const distance = Math.sqrt(
        Math.pow(node.location.x - x, 2) + Math.pow(node.location.y - y, 2)
      );

      if (distance <= 5) { // 5-unit radius
        const adjustedWaterLevel = waterLevel * (1 - distance / 10);
        if (adjustedWaterLevel > 0) {
          node.updateWaterLevel(adjustedWaterLevel);
          affectedNodes.push({
            nodeId: node.id,
            waterLevel: adjustedWaterLevel,
            location: node.location
          });
        }
      }
    }

    const logMessage = affectedNodes.length > 0 ?
      `🌊 FLOOD DETECTED at (${x}, ${y}) - Water: ${waterLevel.toFixed(1)}m - ${affectedNodes.length} sensors affected` :
      `🌊 Flood at (${x}, ${y}) - Water: ${waterLevel.toFixed(1)}m - No sensors in range`;

    this.log(logMessage, {
      epicenter: { x, y },
      waterLevel,
      affectedNodes: affectedNodes.length,
      type: 'FLOOD_EVENT'
    });

    this.emit('flood-event', {
      epicenter: { x, y },
      waterLevel,
      affectedNodes
    });
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      currentTick: this.currentTick,
      metrics: this.metrics,
      activeIncidents: this.coordinationAgent.getAllActiveIncidents().length,
      centralServerMessages: this.centralServer.messagesReceived.length,
      config: this.config
    };
  }

  getGridState() {
    const gridState = Array(this.config.gridWidth).fill(null).map(() =>
      Array(this.config.gridHeight).fill(null)
    );

    for (const node of this.sensors) {
      gridState[node.location.x][node.location.y] = {
        id: node.id,
        type: 'sensor',
        status: node.isActive ? 'active' : 'inactive',
        batteryLevel: node.batteryLevel,
        waterLevel: node.waterLevel,
        neighbors: node.neighbors.size
      };
    }

    return gridState;
  }

  log(message, data = {}) {
    const logEntry = {
      tick: this.currentTick,
      timestamp: Date.now(),
      message,
      data
    };

    this.simulationLog.push(logEntry);

    // Keep only last 1000 log entries
    if (this.simulationLog.length > 1000) {
      this.simulationLog = this.simulationLog.slice(-1000);
    }

    console.log(`[Tick ${this.currentTick}] ${message}`, data);
  }

  emit(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  emitStatusUpdate() {
    this.emit('status-update', {
      status: this.getStatus(),
      gridState: this.getGridState(),
      incidentReport: this.coordinationAgent.generateIncidentReports(),
      centralServerStatus: {
        messagesReceived: this.centralServer.messagesReceived.length,
        recentMessages: this.centralServer.messagesReceived.slice(-10)
      }
    });
  }
}

module.exports = FloodWatchSimulation;