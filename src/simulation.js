const SensorAgent = require('./agents/sensorAgent');
const RelayAgent = require('./agents/relayAgent');
const CoordinationAgent = require('./agents/coordinationAgent');
const HealthAgent = require('./agents/healthAgent');
const { MessageTypes } = require('./messages');

class FloodWatchSimulation {
  constructor(config = {}, io = null) {
    this.config = {
      gridSize: config.gridSize || 50,
      sensorCount: config.sensorCount || 100,
      relayRatio: config.relayRatio || 0.2, // 20% relay nodes
      gatewayCount: config.gatewayCount || 5,
      simulationSpeed: config.simulationSpeed || 1000, // ms per tick
      ...config
    };

    this.io = io;
    this.isRunning = false;
    this.currentTick = 0;

    // Simulation components
    this.sensors = [];
    this.relays = [];
    this.gateways = new Set();
    this.coordinationAgent = new CoordinationAgent('COORD-1');
    this.healthAgent = new HealthAgent('HEALTH-1');

    // Grid and positioning
    this.grid = Array(this.config.gridSize).fill(null).map(() =>
      Array(this.config.gridSize).fill(null)
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
    // Create sensors and relays
    const totalNodes = this.config.sensorCount;
    const relayCount = Math.floor(totalNodes * this.config.relayRatio);
    const sensorCount = totalNodes - relayCount;

    // Generate positions for all nodes
    const positions = this.generateNodePositions(totalNodes);

    // Create sensor agents
    for (let i = 0; i < sensorCount; i++) {
      const pos = positions[i];
      const sensor = new SensorAgent(`SENSOR-${i}`, pos.x, pos.y);
      this.sensors.push(sensor);
      this.grid[pos.x][pos.y] = sensor;
      this.healthAgent.registerNode(sensor);
    }

    // Create relay agents
    for (let i = 0; i < relayCount; i++) {
      const pos = positions[sensorCount + i];
      const relay = new RelayAgent(`RELAY-${i}`, pos.x, pos.y);
      this.relays.push(relay);
      this.grid[pos.x][pos.y] = relay;
      this.healthAgent.registerNode(relay);
    }

    // Assign gateway connections
    this.assignGatewayConnections();

    // Initialize neighbor discovery
    this.discoverNeighbors();

    this.log('Network initialized', {
      sensors: sensorCount,
      relays: relayCount,
      gateways: this.gateways.size
    });
  }

  generateNodePositions(count) {
    const positions = [];
    const occupied = new Set();

    while (positions.length < count) {
      const x = Math.floor(Math.random() * this.config.gridSize);
      const y = Math.floor(Math.random() * this.config.gridSize);
      const key = `${x},${y}`;

      if (!occupied.has(key)) {
        positions.push({ x, y });
        occupied.add(key);
      }
    }

    return positions;
  }

  assignGatewayConnections() {
    const allNodes = [...this.sensors, ...this.relays];
    const gatewayNodeCount = Math.min(this.config.gatewayCount, allNodes.length);

    // Randomly select nodes to have gateway connections
    const shuffled = [...allNodes].sort(() => Math.random() - 0.5);
    for (let i = 0; i < gatewayNodeCount; i++) {
      shuffled[i].hasGatewayConnection = true;
      this.gateways.add(shuffled[i].id);
    }
  }

  discoverNeighbors() {
    const allNodes = [...this.sensors, ...this.relays];

    for (const node of allNodes) {
      for (const otherNode of allNodes) {
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
    [...this.sensors, ...this.relays].forEach(agent => agent.stop());
    this.coordinationAgent.stop();
    this.healthAgent.stop();

    this.log('Simulation stopped');
    this.emit('simulation-status', { running: false, tick: this.currentTick });
  }

  tick() {
    this.currentTick++;

    // Process messages between agents
    this.processMessagePropagation();

    // Update health monitoring
    this.updateHealthStatus();

    // Process coordination (incident management)
    this.processIncidentCoordination();

    // Update metrics
    this.updateMetrics();

    // Random events
    if (Math.random() < 0.02) { // 2% chance per tick
      this.triggerRandomEvent();
    }

    // Emit status update
    if (this.currentTick % 10 === 0) { // Every 10 ticks
      this.emitStatusUpdate();
    }
  }

  processMessagePropagation() {
    const allNodes = [...this.sensors, ...this.relays];

    // Collect all pending messages
    const pendingMessages = [];

    for (const node of allNodes) {
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
        }
      }
    }

    // Propagate messages
    for (const msgData of pendingMessages) {
      this.propagateMessage(msgData.sender, msgData.message);
    }
  }

  propagateMessage(sender, message) {
    const allNodes = [...this.sensors, ...this.relays];
    let deliveredCount = 0;

    for (const receiver of allNodes) {
      if (receiver.id === sender.id || !receiver.isActive) continue;

      const distance = sender.calculateDistance(receiver.location);
      if (distance <= sender.communicationRange) {
        // Simulate message loss due to interference/distance
        const deliveryProbability = Math.max(0.7, 1 - (distance / sender.communicationRange) * 0.3);

        if (Math.random() < deliveryProbability) {
          receiver.receiveMessage(message, sender);
          deliveredCount++;

          // Process alert messages through coordination agent
          if (message.type === MessageTypes.ALERT) {
            const result = this.coordinationAgent.processAlert(message);
            if (result.action === 'INCIDENT_CREATED') {
              this.metrics.incidentsCreated++;
            } else if (result.action === 'DUPLICATE_REMOVED') {
              this.metrics.duplicatesRemoved++;
            }
          }
        } else {
          this.metrics.messagesLost++;
        }
      }
    }

    this.metrics.messagesGenerated++;
    this.metrics.messagesDelivered += deliveredCount;
  }

  updateHealthStatus() {
    const allNodes = [...this.sensors, ...this.relays];

    for (const node of allNodes) {
      this.healthAgent.updateNodeStatus(node);
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
    const healthStats = this.healthAgent.getNetworkStatistics();

    this.metrics.networkOverhead = this.calculateNetworkOverhead();
    this.metrics.averageDelay = this.calculateAverageDelay();
    this.metrics.duplicatesRemoved = this.coordinationAgent.duplicateAlerts.size;
    this.metrics.nodeFailures = healthStats.failedNodes + healthStats.unresponsive;

    // Calculate delivery success rate
    if (this.metrics.messagesGenerated > 0) {
      this.metrics.deliverySuccessRate =
        (this.metrics.messagesDelivered / this.metrics.messagesGenerated) * 100;
    }
  }

  calculateNetworkOverhead() {
    // Simplified calculation: ratio of control messages to data messages
    const allNodes = [...this.sensors, ...this.relays];
    let controlMessages = 0;
    let dataMessages = 0;

    for (const node of allNodes) {
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

  triggerRandomEvent() {
    const eventType = Math.random();

    if (eventType < 0.4) {
      // Node failure
      this.triggerNodeFailure();
    } else if (eventType < 0.7) {
      // Gateway failure
      this.triggerGatewayFailure();
    } else {
      // Random flood detection
      this.triggerRandomFlood();
    }
  }

  triggerNodeFailure() {
    const allNodes = [...this.sensors, ...this.relays].filter(n => n.isActive);
    if (allNodes.length === 0) return;

    const randomNode = allNodes[Math.floor(Math.random() * allNodes.length)];
    randomNode.fail();

    this.log('Node failure', { nodeId: randomNode.id });
    this.emit('node-event', {
      type: 'FAILURE',
      nodeId: randomNode.id,
      location: randomNode.location
    });
  }

  triggerGatewayFailure() {
    const gatewayNodes = [...this.sensors, ...this.relays]
      .filter(n => n.hasGatewayConnection && n.isActive);

    if (gatewayNodes.length === 0) return;

    const randomGateway = gatewayNodes[Math.floor(Math.random() * gatewayNodes.length)];
    randomGateway.hasGatewayConnection = false;
    this.gateways.delete(randomGateway.id);

    this.log('Gateway failure', { nodeId: randomGateway.id });
    this.emit('gateway-event', {
      type: 'FAILURE',
      nodeId: randomGateway.id,
      location: randomGateway.location
    });
  }

  triggerRandomFlood() {
    const x = Math.floor(Math.random() * this.config.gridSize);
    const y = Math.floor(Math.random() * this.config.gridSize);
    const waterLevel = 1.5 + Math.random() * 2; // 1.5 to 3.5 meters

    this.triggerFlood(x, y, waterLevel);
  }

  triggerFlood(x, y, waterLevel) {
    // Affect multiple nodes in the area
    const affectedNodes = [];

    for (const node of [...this.sensors, ...this.relays]) {
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

    this.log('Flood triggered', {
      epicenter: { x, y },
      waterLevel,
      affectedNodes: affectedNodes.length
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
      networkHealth: this.healthAgent.getNetworkStatistics(),
      activeIncidents: this.coordinationAgent.getAllActiveIncidents().length,
      config: this.config
    };
  }

  getGridState() {
    const gridState = Array(this.config.gridSize).fill(null).map(() =>
      Array(this.config.gridSize).fill(null)
    );

    for (const node of [...this.sensors, ...this.relays]) {
      gridState[node.location.x][node.location.y] = {
        id: node.id,
        type: node.isRelay ? 'relay' : 'sensor',
        status: node.isActive ? 'active' : 'failed',
        batteryLevel: node.batteryLevel,
        waterLevel: node.waterLevel,
        hasGateway: node.hasGatewayConnection,
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
      healthReport: this.healthAgent.generateHealthReport(),
      incidentReport: this.coordinationAgent.generateIncidentReports()
    });
  }
}

module.exports = FloodWatchSimulation;