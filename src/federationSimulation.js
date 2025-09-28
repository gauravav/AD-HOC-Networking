const SensorAgent = require('./agents/sensorAgent');
const GatewayAgent = require('./agents/gatewayAgent');
const CoordinationAgent = require('./agents/coordinationAgent');
const FloodWatchSimulation = require('./simulation');
const { MessageTypes } = require('./messages');

class FederationSimulation extends FloodWatchSimulation {
  constructor(config, io) {
    super(config, io);

    // Federation-specific components
    this.gateways = [];
    this.federationMetrics = {
      totalHops: 0,
      messagesForwarded: 0,
      gatewayFailures: 0,
      averageLatency: 0
    };

    // Architecture type tracking
    this.architectureType = 'dual'; // 'flat', 'federation', or 'dual'

    this.setupFederationArchitecture();
  }

  setupFederationArchitecture() {
    // Create gateway nodes strategically placed
    const gatewayCount = Math.ceil(this.config.sensorCount / 8); // 1 gateway per ~8 sensors
    const gatewayPositions = this.calculateGatewayPositions(gatewayCount);

    // Create gateways - only create as many as we have valid positions
    for (let i = 0; i < gatewayPositions.length; i++) {
      const pos = gatewayPositions[i];
      if (pos && pos.x !== undefined && pos.y !== undefined) {
        const gateway = new GatewayAgent(
          `GW${i + 1}`,
          pos.x,
          pos.y,
          this.config.communicationRange * 1.5, // Gateways have larger range
          10 // Max sensors per gateway
        );
        this.gateways.push(gateway);
      }
    }

    // Assign sensors to nearest gateways
    this.assignSensorsToGateways();
  }

  calculateGatewayPositions(count) {
    // Use k-means clustering to find optimal gateway positions based on sensor locations
    return this.calculateOptimalGatewayPositions();
  }

  calculateOptimalGatewayPositions() {
    const positions = [];
    const gatewayRange = this.config.communicationRange * 1.5;

    // Check if sensors are available
    if (!this.sensors || this.sensors.length === 0) {
      console.log('No sensors available, using default gateway positions');
      // Return default positions if no sensors
      const defaultPositions = [
        { x: this.config.gridWidth / 4, y: this.config.gridHeight / 4 },
        { x: (3 * this.config.gridWidth) / 4, y: this.config.gridHeight / 4 },
        { x: this.config.gridWidth / 4, y: (3 * this.config.gridHeight) / 4 },
        { x: (3 * this.config.gridWidth) / 4, y: (3 * this.config.gridHeight) / 4 }
      ];
      return defaultPositions;
    }

    const uncoveredSensors = [...this.sensors];

    // Place gateways iteratively to maximize coverage
    while (uncoveredSensors.length > 0 && positions.length < 10) {
      const bestPosition = this.findBestGatewayPosition(uncoveredSensors, positions, gatewayRange);

      if (!bestPosition) {
        console.log('Could not find valid position, breaking');
        break;
      }

      positions.push(bestPosition);

      // Remove sensors that are now covered by this gateway
      for (let i = uncoveredSensors.length - 1; i >= 0; i--) {
        const sensor = uncoveredSensors[i];
        const distance = Math.sqrt(
          Math.pow(sensor.location.x - bestPosition.x, 2) +
          Math.pow(sensor.location.y - bestPosition.y, 2)
        );

        if (distance <= gatewayRange) {
          uncoveredSensors.splice(i, 1);
        }
      }
    }

    console.log(`Placed ${positions.length} gateways to cover ${this.sensors.length} sensors`);
    return positions;
  }

  findBestGatewayPosition(uncoveredSensors, existingGateways, gatewayRange) {
    let bestPosition = null;
    let maxCoverage = 0;

    // Try different positions in the grid to find the one that covers the most uncovered sensors
    const step = 2; // Grid step size for position testing
    const { gridWidth, gridHeight } = this.config;

    for (let x = step; x < gridWidth; x += step) {
      for (let y = step; y < gridHeight; y += step) {
        const coverage = this.calculateCoverageAtPosition(x, y, uncoveredSensors, gatewayRange);

        if (coverage > maxCoverage) {
          maxCoverage = coverage;
          bestPosition = { x, y };
        }
      }
    }

    // If no good position found, place at centroid of uncovered sensors
    if (!bestPosition && uncoveredSensors.length > 0) {
      const centroid = this.calculateCentroid(uncoveredSensors);
      bestPosition = {
        x: Math.max(2, Math.min(this.config.gridWidth - 2, centroid.x)),
        y: Math.max(2, Math.min(this.config.gridHeight - 2, centroid.y))
      };
    }

    return bestPosition || { x: this.config.gridWidth / 2, y: this.config.gridHeight / 2 };
  }

  calculateCoverageAtPosition(x, y, sensors, range) {
    let coverage = 0;
    for (const sensor of sensors) {
      const distance = Math.sqrt(
        Math.pow(sensor.location.x - x, 2) +
        Math.pow(sensor.location.y - y, 2)
      );
      if (distance <= range) {
        coverage++;
      }
    }
    return coverage;
  }

  calculateCentroid(sensors) {
    const totalX = sensors.reduce((sum, sensor) => sum + sensor.location.x, 0);
    const totalY = sensors.reduce((sum, sensor) => sum + sensor.location.y, 0);
    return {
      x: totalX / sensors.length,
      y: totalY / sensors.length
    };
  }

  assignSensorsToGateways() {
    const unassignedSensors = [];

    for (const sensor of this.sensors) {
      // Find nearest gateway within communication range
      let nearestGateway = null;
      let minDistance = Infinity;

      for (const gateway of this.gateways) {
        const distance = gateway.calculateDistance(sensor.location);
        if (distance <= gateway.communicationRange && distance < minDistance && gateway.isActive) {
          minDistance = distance;
          nearestGateway = gateway;
        }
      }

      // Assign sensor to gateway
      if (nearestGateway && nearestGateway.registerSensor(sensor)) {
        sensor.assignedGateway = nearestGateway.id;
        console.log(`Sensor ${sensor.id} assigned to Gateway ${nearestGateway.id} (distance: ${minDistance.toFixed(1)}m)`);
      } else {
        unassignedSensors.push(sensor);
        console.log(`Warning: Sensor ${sensor.id} at (${sensor.location.x}, ${sensor.location.y}) has no gateway within range`);
      }
    }

    // If there are unassigned sensors, add additional gateways
    if (unassignedSensors.length > 0) {
      console.log(`Adding additional gateways for ${unassignedSensors.length} unassigned sensors`);
      this.addAdditionalGateways(unassignedSensors);
    }

    // Final assignment attempt
    this.finalAssignmentAttempt();
  }

  addAdditionalGateways(unassignedSensors) {
    for (const sensor of unassignedSensors) {
      // Place a gateway near the unassigned sensor
      const gatewayPosition = {
        x: Math.max(2, Math.min(this.config.gridWidth - 2, sensor.location.x)),
        y: Math.max(2, Math.min(this.config.gridHeight - 2, sensor.location.y))
      };

      const gateway = new GatewayAgent(
        `GW${this.gateways.length + 1}`,
        gatewayPosition.x,
        gatewayPosition.y,
        this.config.communicationRange * 1.5,
        10
      );

      this.gateways.push(gateway);
      console.log(`Added additional gateway ${gateway.id} at (${gatewayPosition.x}, ${gatewayPosition.y}) for sensor ${sensor.id}`);
    }
  }

  finalAssignmentAttempt() {
    let totalAssigned = 0;
    let totalUnassigned = 0;

    for (const sensor of this.sensors) {
      if (!sensor.assignedGateway) {
        // Try to assign to any available gateway, even if it's the closest one
        let nearestGateway = null;
        let minDistance = Infinity;

        for (const gateway of this.gateways) {
          const distance = gateway.calculateDistance(sensor.location);
          if (distance < minDistance && gateway.isActive) {
            minDistance = distance;
            nearestGateway = gateway;
          }
        }

        if (nearestGateway && nearestGateway.registerSensor(sensor)) {
          sensor.assignedGateway = nearestGateway.id;
          console.log(`Final assignment: Sensor ${sensor.id} assigned to Gateway ${nearestGateway.id} (distance: ${minDistance.toFixed(1)}m)`);
          totalAssigned++;
        } else {
          console.log(`ERROR: Sensor ${sensor.id} remains unassigned!`);
          totalUnassigned++;
        }
      } else {
        totalAssigned++;
      }
    }

    console.log(`Gateway assignment complete: ${totalAssigned} assigned, ${totalUnassigned} unassigned sensors`);
  }

  // Override the tick method to handle both architectures
  tick() {
    if (!this.isRunning) return;

    this.currentTick++;

    // Process both flat and federation architectures
    this.processFlatArchitecture();
    this.processFederationArchitecture();

    // Process active floods (shared between both)
    const affectedNodes = this.processActiveFloods();

    // Process coordination through message delivery (handled in deliverToCentralServer methods)

    // Calculate metrics for both architectures
    this.calculateDualMetrics();

    // Send status update to client
    this.sendStatusUpdate();

    // Schedule next tick
    setTimeout(() => this.tick(), this.config.simulationSpeed);
  }

  processFlatArchitecture() {
    // This is the existing flat architecture processing
    // (same as original simulation)
    const pendingMessages = [];
    const centralServerMessages = [];

    // Process sensor messages (flat - direct to server)
    for (const node of this.sensors) {
      if (!node.isActive) continue;

      // Process message buffer
      const messages = [...node.messageBuffer];
      node.messageBuffer = [];

      for (const msgData of messages) {
        if (msgData.action === 'broadcast') {
          pendingMessages.push({
            sender: node,
            message: msgData.message
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

    // Store flat architecture messages separately
    this.flatMessages = centralServerMessages;

    // Process flat messages through coordination agent
    for (const msgData of centralServerMessages) {
      this.deliverToCentralServer(msgData.message, msgData.sender);
    }
  }

  processFederationArchitecture() {
    // Process gateway message forwarding
    for (const gateway of this.gateways) {
      if (!gateway.isActive) continue;

      // Process gateway message buffer
      const messages = [...gateway.messageBuffer];
      gateway.messageBuffer = [];

      for (const msgData of messages) {
        if (msgData.action === 'central_server_delivery') {
          // Deliver federated message to central server
          this.deliverFederatedToCentralServer(msgData.message, msgData.sender);
        }
      }
    }

    // Process sensor messages through federation
    for (const sensor of this.sensors) {
      if (!sensor.isActive || !sensor.assignedGateway) continue;

      // Find assigned gateway
      const gateway = this.gateways.find(gw => gw.id === sensor.assignedGateway);
      if (!gateway || !gateway.isActive) {
        // Gateway is down, try to reassign or use direct communication
        this.handleGatewayFailure(sensor);
        continue;
      }

      // Process sensor messages and send to gateway instead of directly to server
      const messages = [...sensor.messageBuffer];
      sensor.messageBuffer = [];

      for (const msgData of messages) {
        if (msgData.action === 'central_server_delivery') {
          // Send to gateway instead of central server
          gateway.receiveMessage(msgData.message, sensor);
        }
      }
    }
  }

  handleGatewayFailure(sensor) {
    console.log(`Gateway failure detected for sensor ${sensor.id}, attempting reassignment`);

    // Try to find another gateway
    let newGateway = null;
    let minDistance = Infinity;

    for (const gateway of this.gateways) {
      if (gateway.isActive) {
        const distance = gateway.calculateDistance(sensor.location);
        if (distance < minDistance && gateway.canCommunicateWith(sensor)) {
          minDistance = distance;
          newGateway = gateway;
        }
      }
    }

    if (newGateway && newGateway.registerSensor(sensor)) {
      sensor.assignedGateway = newGateway.id;
      console.log(`Sensor ${sensor.id} reassigned to Gateway ${newGateway.id}`);
    } else {
      // No gateway available, sensor becomes isolated
      sensor.assignedGateway = null;
      console.log(`Sensor ${sensor.id} is now isolated (no available gateways)`);
    }
  }

  deliverFederatedToCentralServer(message, originalSender) {
    // Process federated message through coordination agent
    if (message.type === MessageTypes.ALERT) {
      const result = this.coordinationAgent.processAlert(message);

      // Track federation metrics
      this.federationMetrics.totalHops += message.hops || 1;
      this.federationMetrics.messagesForwarded++;
      if (message.forwardingLatency) {
        this.federationMetrics.averageLatency =
          (this.federationMetrics.averageLatency + message.forwardingLatency) / 2;
      }

      // Send to client if new incident or major update
      if (result.action === 'INCIDENT_CREATED' || result.action === 'ALERT_MERGED') {
        this.sendFederationUpdate(result);
      }
    }

    // Send message to central server console (for federation)
    this.emit('central-server-message', {
      type: message.type,
      sender: message.gatewayId || originalSender.id,
      location: originalSender.location,
      data: message.data,
      hops: message.hops || 1,
      architecture: 'federation'
    });
  }

  calculateDualMetrics() {
    // Calculate metrics for both architectures
    const flatMetrics = this.calculateFlatMetrics();
    const federationMetrics = this.calculateFederationMetrics();

    // Combine metrics
    this.dualMetrics = {
      flat: flatMetrics,
      federation: federationMetrics,
      comparison: {
        hopDifference: federationMetrics.averageHops - flatMetrics.averageHops,
        latencyDifference: federationMetrics.averageLatency - flatMetrics.averageLatency,
        reliabilityDifference: federationMetrics.reliability - flatMetrics.reliability
      }
    };
  }

  calculateFlatMetrics() {
    return {
      averageHops: 1, // Always 1 hop in flat architecture
      directRoutes: this.sensors.filter(s => s.isActive).length,
      totalMessages: this.flatMessages ? this.flatMessages.length : 0,
      averageLatency: 10, // Simulated flat latency
      reliability: this.sensors.filter(s => s.isActive).length / this.sensors.length
    };
  }

  calculateFederationMetrics() {
    const activeGateways = this.gateways.filter(gw => gw.isActive);
    const totalSensors = this.sensors.length;
    const connectedSensors = this.sensors.filter(s => s.assignedGateway).length;

    return {
      averageHops: this.federationMetrics.totalHops / Math.max(this.federationMetrics.messagesForwarded, 1),
      gatewayCount: activeGateways.length,
      connectedSensors: connectedSensors,
      totalMessages: this.federationMetrics.messagesForwarded,
      averageLatency: this.federationMetrics.averageLatency || 0,
      reliability: connectedSensors / totalSensors,
      gatewayUtilization: activeGateways.map(gw => ({
        id: gw.id,
        connectedSensors: gw.connectedSensors.size,
        messagesForwarded: gw.messagesForwarded,
        batteryLevel: gw.batteryLevel
      }))
    };
  }

  sendFederationUpdate(result) {
    this.emit('federation-update', {
      type: 'incident-update',
      result: result,
      metrics: this.dualMetrics
    });
  }

  // Override sendStatusUpdate to include dual architecture data
  sendStatusUpdate() {
    const flatIncidentReport = this.coordinationAgent.generateIncidentReports();

    const status = {
      isRunning: this.isRunning,
      currentTick: this.currentTick,
      config: this.config,
      centralServerMessages: this.centralServer.messagesReceived.length,
      activeIncidents: flatIncidentReport ? flatIncidentReport.activeIncidentCount : 0,
      metrics: this.dualMetrics || {}
    };

    // Send grid state for both architectures
    const gridState = {
      flat: {
        sensors: this.sensors.map(sensor => ({
          id: sensor.id,
          location: sensor.location,
          isActive: sensor.isActive,
          batteryLevel: sensor.batteryLevel,
          waterLevel: sensor.waterLevel,
          neighbors: Array.from(sensor.neighbors)
        }))
      },
      federation: {
        sensors: this.sensors.map(sensor => ({
          id: sensor.id,
          location: sensor.location,
          isActive: sensor.isActive,
          batteryLevel: sensor.batteryLevel,
          waterLevel: sensor.waterLevel,
          assignedGateway: sensor.assignedGateway
        })),
        gateways: this.gateways.map(gateway => gateway.getStats())
      }
    };

    this.emit('status-update', {
      status,
      gridState,
      incidentReport: flatIncidentReport,
      architectureType: this.architectureType
    });
  }

  // Override stop method
  stop() {
    super.stop();

    // Stop all gateways
    for (const gateway of this.gateways) {
      gateway.stop();
    }
  }
}

module.exports = FederationSimulation;