const SensorAgent = require('./agents/sensorAgent');
const CoordinationAgent = require('./agents/coordinationAgent');
const { MessageTypes } = require('./messages');

class FloodWatchSimulation {
  constructor(config = {}, io = null) {
    this.config = {
      gridWidth: config.gridWidth || 25, // 25 meters
      gridHeight: config.gridHeight || 25, // 25 meters
      sensorCount: config.sensorCount || 20,
      communicationRange: config.communicationRange || 10, // meters
      maxNeighbors: config.maxNeighbors || 5, // max neighbors per node
      enableRandomFloods: config.enableRandomFloods !== undefined ? config.enableRandomFloods : true, // enable random floods
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
      totalHops: 0,
      multiHopMessages: 0,
      duplicatesRemoved: 0,
      incidentsCreated: 0,
      nodeFailures: 0
    };

    // Active floods tracking
    this.activeFloods = new Map();

    // Round-robin communication scheduling
    this.roundRobinScheduler = {
      flatArchitecture: {
        currentSensorIndex: 0,
        sensorOrder: []
      },
      federationArchitecture: {
        currentSectorIndex: 0,
        sectorOrder: [],
        sectors: new Map() // sectorId -> [sensors]
      }
    };

    this.simulationLog = [];
    this.initializeNetwork();
  }

  initializeNetwork() {
    // Create only sensor nodes
    const totalNodes = this.config.sensorCount;

    // Generate positions for all nodes
    const positions = this.generateNodePositions(totalNodes);

    // Create sensor agents with configurable communication range and max neighbors
    for (let i = 0; i < totalNodes; i++) {
      const pos = positions[i];
      const sensor = new SensorAgent(`SENSOR-${i}`, pos.x, pos.y, this.config.communicationRange, this.config.maxNeighbors);
      sensor.simulation = this; // Provide simulation reference for multi-hop routing
      this.sensors.push(sensor);
      this.grid[pos.x][pos.y] = sensor;
    }

    // Initialize neighbor discovery
    this.discoverNeighbors();

    // Initialize round-robin scheduling
    this.initializeRoundRobinScheduling();

    // Initialize central server connectivity
    this.updateCentralServerConnectivity();

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
      // Find all potential neighbors within communication range
      const potentialNeighbors = [];

      for (const otherNode of this.sensors) {
        if (node.id !== otherNode.id) {
          const distance = node.calculateDistance(otherNode.location);
          if (distance <= node.communicationRange) {
            potentialNeighbors.push({
              node: otherNode,
              distance: distance
            });
          }
        }
      }

      // Sort by distance and take only the nearest maxNeighbors
      const nearestNeighbors = potentialNeighbors
        .sort((a, b) => a.distance - b.distance)
        .slice(0, node.maxNeighbors);

      // Add nearest neighbors to the node's neighbor data
      for (const neighborInfo of nearestNeighbors) {
        const otherNode = neighborInfo.node;
        node.neighbors.add(otherNode.id);
        node.neighborData.set(otherNode.id, {
          id: otherNode.id,
          location: otherNode.location,
          batteryLevel: otherNode.batteryLevel,
          lastSeen: Date.now(),
          distance: neighborInfo.distance
        });
      }
    }
  }

  initializeRoundRobinScheduling() {
    // Set up flat architecture round-robin
    this.roundRobinScheduler.flatArchitecture.sensorOrder = [...this.sensors];

    // Set up federation architecture sectors (divide grid into 4 sectors)
    const sectorsPerRow = 2;
    const sectorsPerCol = 2;
    const sectorWidth = Math.ceil(this.config.gridWidth / sectorsPerRow);
    const sectorHeight = Math.ceil(this.config.gridHeight / sectorsPerCol);

    // Initialize sectors
    for (let sectorRow = 0; sectorRow < sectorsPerCol; sectorRow++) {
      for (let sectorCol = 0; sectorCol < sectorsPerRow; sectorCol++) {
        const sectorId = `SECTOR-${sectorRow}-${sectorCol}`;
        this.roundRobinScheduler.federationArchitecture.sectors.set(sectorId, []);
        this.roundRobinScheduler.federationArchitecture.sectorOrder.push(sectorId);
      }
    }

    // Assign sensors to sectors
    for (const sensor of this.sensors) {
      const sectorRow = Math.floor(sensor.location.y / sectorHeight);
      const sectorCol = Math.floor(sensor.location.x / sectorWidth);
      const sectorId = `SECTOR-${sectorRow}-${sectorCol}`;

      if (this.roundRobinScheduler.federationArchitecture.sectors.has(sectorId)) {
        this.roundRobinScheduler.federationArchitecture.sectors.get(sectorId).push(sensor);
        sensor.federationSector = sectorId;
      }
    }

    this.log('Round-robin scheduling initialized', {
      flatSensors: this.roundRobinScheduler.flatArchitecture.sensorOrder.length,
      federationSectors: this.roundRobinScheduler.federationArchitecture.sectorOrder.length
    });
  }

  // Get agent by ID for multi-hop routing
  getAgentById(agentId) {
    return this.sensors.find(sensor => sensor.id === agentId);
  }

  // Update central server connectivity based on network conditions
  updateCentralServerConnectivity() {
    for (const sensor of this.sensors) {
      // Simulate central server connectivity based on various factors
      sensor.centralServerConnectivity = this.calculateCentralServerConnectivity(sensor);
    }
  }

  calculateCentralServerConnectivity(sensor) {
    if (!sensor.isActive) return false;

    // Factors affecting central server connectivity:
    // 1. Flood level (higher flood = less connectivity)
    // 2. Battery level (low battery = less connectivity)
    // 3. Random network conditions

    let connectivityProbability = 1.0;

    // Flood impact on central server connectivity
    if (sensor.waterLevel > 1.5) {
      connectivityProbability *= 0.1; // 10% chance with major flooding
    } else if (sensor.waterLevel > 1.0) {
      connectivityProbability *= 0.4; // 40% chance with moderate flooding
    } else if (sensor.waterLevel > 0.5) {
      connectivityProbability *= 0.7; // 70% chance with early flooding
    }

    // Battery level impact
    if (sensor.batteryLevel < 0.2) {
      connectivityProbability *= 0.3; // 30% chance with very low battery
    } else if (sensor.batteryLevel < 0.5) {
      connectivityProbability *= 0.8; // 80% chance with low battery
    }

    // Apply general connectivity reliability
    connectivityProbability *= sensor.connectivityReliability;

    // Random network conditions (simulate infrastructure issues)
    connectivityProbability *= (0.6 + Math.random() * 0.4); // 60-100% base reliability

    // Introduce some nodes that randomly lose connectivity for testing
    if (Math.random() < 0.3) { // 30% chance of additional connectivity loss
      connectivityProbability *= 0.3;
    }

    return Math.random() < connectivityProbability;
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

    // Process round-robin communication first
    this.processRoundRobinCommunication();

    // Process messages between agents
    this.processMessagePropagation();

    // Process coordination (incident management)
    this.processIncidentCoordination();

    // Process active floods
    this.processActiveFloods();

    // Update central server connectivity periodically
    if (this.currentTick % 5 === 0) { // Every 5 ticks
      this.updateCentralServerConnectivity();
    }

    // Update metrics
    this.updateMetrics();

    // Random flood events removed - only manual floods allowed

    // Emit status update
    if (this.currentTick % 10 === 0) { // Every 10 ticks
      this.emitStatusUpdate();
    }
  }

  processRoundRobinCommunication() {
    // Each tick (second), one sensor sends data in round-robin fashion

    // Flat Architecture: Each sensor sends data to central server in turn
    this.processRoundRobinFlat();

    // Federation Architecture: Each sector's sensors send data to their gateway in turn
    this.processRoundRobinFederation();
  }

  processRoundRobinFlat() {
    const scheduler = this.roundRobinScheduler.flatArchitecture;

    if (scheduler.sensorOrder.length === 0) return;

    // Get the current sensor in the round-robin sequence
    const currentSensor = scheduler.sensorOrder[scheduler.currentSensorIndex];

    // Only send if sensor is active
    if (currentSensor && currentSensor.isActive) {
      // Create a scheduled data message (HELLO with current status)
      const dataMessage = currentSensor.createScheduledDataMessage();

      // Let the sensor handle delivery (will use multi-hop routing if needed)
      currentSensor.deliverToCentralServer(dataMessage);

      this.log(`🔄 [FLAT] Sensor ${currentSensor.id} sent scheduled data (round-robin)`, {
        sensor: currentSensor.id,
        position: scheduler.currentSensorIndex + 1,
        total: scheduler.sensorOrder.length,
        architecture: 'flat'
      });
    }

    // Move to next sensor in the sequence
    scheduler.currentSensorIndex = (scheduler.currentSensorIndex + 1) % scheduler.sensorOrder.length;
  }

  processRoundRobinFederation() {
    const scheduler = this.roundRobinScheduler.federationArchitecture;

    if (scheduler.sectorOrder.length === 0) return;

    // Get the current sector in the round-robin sequence
    const currentSectorId = scheduler.sectorOrder[scheduler.currentSectorIndex];
    const sectorSensors = scheduler.sectors.get(currentSectorId) || [];

    // Find an active sensor in this sector to send data
    const activeSensors = sectorSensors.filter(sensor => sensor.isActive);

    if (activeSensors.length > 0) {
      // Rotate through sensors in this sector
      const sensorIndex = this.currentTick % activeSensors.length;
      const currentSensor = activeSensors[sensorIndex];

      // Create a scheduled data message
      const dataMessage = currentSensor.createScheduledDataMessage();

      // Send to gateway (simulated as central server with federation flag)
      this.deliverToCentralServer(dataMessage, currentSensor, 'federation');

      this.log(`🔄 [FED] Sensor ${currentSensor.id} from ${currentSectorId} sent scheduled data (round-robin)`, {
        sensor: currentSensor.id,
        sector: currentSectorId,
        sectorPosition: scheduler.currentSectorIndex + 1,
        totalSectors: scheduler.sectorOrder.length,
        architecture: 'federation'
      });
    }

    // Move to next sector in the sequence
    scheduler.currentSectorIndex = (scheduler.currentSectorIndex + 1) % scheduler.sectorOrder.length;
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
            timestamp: msgData.timestamp,
            hopCount: msgData.hopCount || 0,
            route: msgData.route || [node.id]
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
      this.deliverToCentralServer(msgData.message, msgData.sender, 'flat', msgData.hopCount, msgData.route);
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

  deliverToCentralServer(message, sender, architecture = 'flat', hopCount = 0, route = null) {
    // Central server receives all messages (100% delivery)
    const serverMessage = {
      message,
      sender: sender.id,
      timestamp: Date.now(),
      location: sender.location,
      architecture: architecture,
      hopCount: hopCount,
      route: route || [sender.id],
      isMultiHop: hopCount > 0
    };

    this.centralServer.messagesReceived.push(serverMessage);

    // Update hop count metrics
    this.metrics.totalHops += hopCount;
    if (hopCount > 0) {
      this.metrics.multiHopMessages++;
    }

    // Process alert messages through coordination agent
    if (message.type === MessageTypes.ALERT) {
      const result = this.coordinationAgent.processAlert(message, architecture);
      if (result.action === 'INCIDENT_CREATED') {
        this.metrics.incidentsCreated++;
      } else if (result.action === 'DUPLICATE_REMOVED') {
        this.metrics.duplicatesRemoved++;
      }
    }

    // Add architecture-specific metadata for UI
    const uiMessage = {
      type: message.type,
      sender: sender.id,
      location: sender.location,
      data: message.data || message,
      timestamp: Date.now(),
      architecture: architecture,
      hopCount: message.hopCount || 0,
      route: message.route || [sender.id],
      isMultiHop: (message.hopCount || 0) > 0
    };

    // Add federation-specific information
    if (architecture === 'federation' && sender.federationSector) {
      uiMessage.isGateway = false;
      uiMessage.routedThrough = `GATEWAY-${sender.federationSector}`;
      uiMessage.sector = sender.federationSector;
    }

    // Emit central server message for UI
    this.emit('central-server-message', uiMessage);

    // Node activity tracking disabled

    // Enhanced logging for HELLO messages with neighbor data
    if (message.type === MessageTypes.HELLO && message.data && message.data.neighbors) {
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
    // Node failure detection disabled - focus on flood alerts only

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




  triggerGradualFlood(x, y, maxWaterLevel, durationSeconds) {
    const floodId = `FLOOD-${Date.now()}`;
    const flood = {
      id: floodId,
      epicenter: { x, y },
      maxWaterLevel: maxWaterLevel,
      currentWaterLevel: 0,
      duration: durationSeconds * 1000, // Convert to milliseconds
      startTime: Date.now(),
      ticksPerSecond: 1000 / this.config.simulationSpeed,
      radius: 5 // 5-unit radius
    };

    this.activeFloods.set(floodId, flood);

    this.log(`🌊 GRADUAL FLOOD STARTED at (${x}, ${y}) - will reach ${maxWaterLevel.toFixed(1)}m over ${durationSeconds}s`, {
      epicenter: { x, y },
      maxWaterLevel,
      duration: durationSeconds,
      type: 'GRADUAL_FLOOD_START'
    });

    this.emit('flood-event', {
      epicenter: { x, y },
      waterLevel: 0,
      maxWaterLevel: maxWaterLevel,
      duration: durationSeconds,
      type: 'gradual',
      affectedNodes: []
    });
  }

  processActiveFloods() {
    const now = Date.now();
    const affectedNodes = [];

    for (const [floodId, flood] of this.activeFloods.entries()) {
      const elapsedTime = now - flood.startTime;
      const buildupTime = flood.duration * 0.3; // 30% of time to reach max level

      let progress, currentWaterLevel;

      if (elapsedTime <= buildupTime) {
        // Rising phase - water level increases to maximum
        progress = elapsedTime / buildupTime;
        currentWaterLevel = flood.maxWaterLevel * progress;
      } else if (elapsedTime <= flood.duration) {
        // Sustain phase - water level stays at maximum
        progress = 1.0;
        currentWaterLevel = flood.maxWaterLevel;
      } else {
        // Flood duration exceeded - start cleanup
        progress = 1.0;
        currentWaterLevel = flood.maxWaterLevel * Math.max(0, 1 - ((elapsedTime - flood.duration) / (flood.duration * 0.2)));
      }

      flood.currentWaterLevel = currentWaterLevel;

      // Apply flood to affected nodes
      const floodAffectedNodes = [];
      for (const node of this.sensors) {
        const distance = Math.sqrt(
          Math.pow(node.location.x - flood.epicenter.x, 2) +
          Math.pow(node.location.y - flood.epicenter.y, 2)
        );

        if (distance <= flood.radius) {
          // Give full water level at epicenter, reducing to 50% at edge of radius
          const distanceRatio = distance / flood.radius;
          const adjustedWaterLevel = flood.currentWaterLevel * (1 - (distanceRatio * 0.5));
          if (adjustedWaterLevel > 0) {
            node.updateWaterLevel(adjustedWaterLevel);
            floodAffectedNodes.push({
              nodeId: node.id,
              waterLevel: adjustedWaterLevel,
              location: node.location
            });
          }
        }
      }

      // Update flood visualization
      if (this.currentTick % 5 === 0) { // Update every 5 ticks to reduce spam
        this.emit('flood-update', {
          floodId: floodId,
          epicenter: flood.epicenter,
          currentWaterLevel: flood.currentWaterLevel,
          maxWaterLevel: flood.maxWaterLevel,
          progress: progress,
          affectedNodes: floodAffectedNodes
        });
      }

      affectedNodes.push(...floodAffectedNodes);

      // Remove floods that have completely receded
      if (elapsedTime > flood.duration * 1.2 && currentWaterLevel <= 0) {
        this.log(`🌊 GRADUAL FLOOD RECEDED at (${flood.epicenter.x}, ${flood.epicenter.y}) - lasted ${Math.round(elapsedTime / 1000)}s`, {
          epicenter: flood.epicenter,
          finalWaterLevel: 0,
          type: 'GRADUAL_FLOOD_RECEDED'
        });

        // Emit flood-receded event for frontend
        this.emit('flood-receded', {
          floodId: floodId,
          epicenter: flood.epicenter,
          duration: Math.round(elapsedTime / 1000)
        });

        // Set all affected nodes back to 0 water level
        for (const node of this.sensors) {
          const distance = Math.sqrt(
            Math.pow(node.location.x - flood.epicenter.x, 2) +
            Math.pow(node.location.y - flood.epicenter.y, 2)
          );
          if (distance <= flood.radius) {
            node.updateWaterLevel(0);
          }
        }

        this.activeFloods.delete(floodId);
      }
    }

    return affectedNodes;
  }

  triggerFlood(x, y, waterLevel) {
    // Affect multiple nodes in the area
    const affectedNodes = [];

    for (const node of this.sensors) {
      const distance = Math.sqrt(
        Math.pow(node.location.x - x, 2) + Math.pow(node.location.y - y, 2)
      );

      if (distance <= 5) { // 5-unit radius
        // Give full water level at epicenter, reducing to 50% at edge of radius
        const distanceRatio = distance / 5;
        const adjustedWaterLevel = waterLevel * (1 - (distanceRatio * 0.5));
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

  failRandomNode() {
    // Find active nodes
    const activeNodes = this.sensors.filter(node => node.isActive);

    if (activeNodes.length === 0) {
      this.log('💥 No active nodes to fail');
      return;
    }

    // Select a random active node
    const randomIndex = Math.floor(Math.random() * activeNodes.length);
    const nodeToFail = activeNodes[randomIndex];

    // Fail the node
    nodeToFail.fail();
    this.metrics.nodeFailures++;

    this.log(`💥 Node ${nodeToFail.id} failed at location (${nodeToFail.location.x}, ${nodeToFail.location.y})`, {
      nodeId: nodeToFail.id,
      location: nodeToFail.location,
      type: 'NODE_FAILURE'
    });

    // Emit node failure event
    this.emit('node-failure', {
      nodeId: nodeToFail.id,
      location: nodeToFail.location,
      timestamp: Date.now()
    });

    // Start failure detection process
    this.coordinationAgent.reportNodeFailure(nodeToFail.id, nodeToFail.location);
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      currentTick: this.currentTick,
      metrics: this.metrics,
      activeIncidents: this.coordinationAgent.getAllActiveIncidents().length,
      flatActiveIncidents: this.coordinationAgent.getFlatActiveIncidents().length,
      federationActiveIncidents: this.coordinationAgent.getFederationActiveIncidents().length,
      flatIncidentsList: this.coordinationAgent.getFlatActiveIncidents(),
      federationIncidentsList: this.coordinationAgent.getFederationActiveIncidents(),
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