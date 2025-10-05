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
    // Create 4 gateway nodes in 4 grid sections
    const gatewayPositions = this.createFourSectionGateways();

    // Create gateways - exactly 4 gateways, one per section
    for (let i = 0; i < gatewayPositions.length; i++) {
      const pos = gatewayPositions[i];
      const gateway = new GatewayAgent(
        `GW${i + 1}`,
        pos.x,
        pos.y,
        this.config.communicationRange * 2, // Larger range to cover section
        10 // Max 10 sensors per gateway
      );

      // Add section information
      gateway.sectionId = pos.sectionId;
      gateway.clusterId = pos.sectionId; // Use section as cluster for visualization

      this.gateways.push(gateway);
      console.log(`Created gateway ${gateway.id} in section ${gateway.sectionId} at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`);
    }

    // Assign sensors to their section's gateway
    this.assignSensorsToSectionGateways();
    
    // Setup gateway-to-gateway communication
    this.setupGatewayToGatewayCommunication();
  }

  createFourSectionGateways() {
    // Divide grid into 4 equal sections (quadrants)
    const midX = this.config.gridWidth / 2;
    const midY = this.config.gridHeight / 2;
    
    const sections = [
      { // Top-left quadrant
        minX: 0, maxX: midX,
        minY: 0, maxY: midY,
        sectionId: 1
      },
      { // Top-right quadrant
        minX: midX, maxX: this.config.gridWidth,
        minY: 0, maxY: midY,
        sectionId: 2
      },
      { // Bottom-left quadrant
        minX: 0, maxX: midX,
        minY: midY, maxY: this.config.gridHeight,
        sectionId: 3
      },
      { // Bottom-right quadrant
        minX: midX, maxX: this.config.gridWidth,
        minY: midY, maxY: this.config.gridHeight,
        sectionId: 4
      }
    ];

    const gatewayPositions = [];
    
    sections.forEach(section => {
      // Place gateway randomly within section bounds (with some margin from edges)
      const margin = 2;
      const x = section.minX + margin + Math.random() * (section.maxX - section.minX - 2 * margin);
      const y = section.minY + margin + Math.random() * (section.maxY - section.minY - 2 * margin);
      
      gatewayPositions.push({
        x: x,
        y: y,
        sectionId: section.sectionId
      });
    });

    return gatewayPositions;
  }

  calculateGatewayPositions(count) {
    // Use k-means clustering to find optimal gateway positions based on sensor locations
    return this.calculateOptimalGatewayPositions();
  }

  calculateOptimalGatewayPositions() {
    const gatewayRange = this.config.communicationRange * 1.5;
    const clusterRange = 5; // Gateways within 5m range for clustering
    const maxNodesPerCluster = 5; // Maximum 5 nodes per cluster

    // Check if sensors are available
    if (!this.sensors || this.sensors.length === 0) {
      console.log('No sensors available, using default gateway positions');
      return this.createDefaultClusters();
    }

    // Create clusters of sensors first
    const sensorClusters = this.createSensorClusters(maxNodesPerCluster);

    // Create gateway clusters for each sensor cluster
    const gatewayPositions = this.createGatewayClusters(sensorClusters, clusterRange, gatewayRange);

    console.log(`Created ${gatewayPositions.length} gateways in clusters to cover ${this.sensors.length} sensors`);
    return gatewayPositions;
  }

  createDefaultClusters() {
    // Create 2 gateway clusters as default
    return [
      // Cluster 1
      { x: this.config.gridWidth / 3, y: this.config.gridHeight / 3, clusterId: 1 },
      { x: this.config.gridWidth / 3 + 3, y: this.config.gridHeight / 3 + 2, clusterId: 1 },

      // Cluster 2
      { x: (2 * this.config.gridWidth) / 3, y: (2 * this.config.gridHeight) / 3, clusterId: 2 },
      { x: (2 * this.config.gridWidth) / 3 + 3, y: (2 * this.config.gridHeight) / 3 + 2, clusterId: 2 }
    ];
  }

  createSensorClusters(maxNodesPerCluster) {
    const clusters = [];
    const unassignedSensors = [...this.sensors];
    let clusterId = 1;

    while (unassignedSensors.length > 0) {
      const cluster = {
        id: clusterId++,
        sensors: [],
        centroid: null
      };

      // Start with the first unassigned sensor
      const seedSensor = unassignedSensors.shift();
      cluster.sensors.push(seedSensor);

      // Add nearby sensors to the cluster (up to maxNodesPerCluster)
      while (cluster.sensors.length < maxNodesPerCluster && unassignedSensors.length > 0) {
        let nearestSensor = null;
        let minDistance = Infinity;
        let nearestIndex = -1;

        // Find the nearest unassigned sensor to the cluster centroid
        const currentCentroid = this.calculateSensorClusterCentroid(cluster.sensors);

        for (let i = 0; i < unassignedSensors.length; i++) {
          const sensor = unassignedSensors[i];
          const distance = Math.sqrt(
            Math.pow(sensor.location.x - currentCentroid.x, 2) +
            Math.pow(sensor.location.y - currentCentroid.y, 2)
          );

          if (distance < minDistance) {
            minDistance = distance;
            nearestSensor = sensor;
            nearestIndex = i;
          }
        }

        if (nearestSensor) {
          cluster.sensors.push(nearestSensor);
          unassignedSensors.splice(nearestIndex, 1);
        } else {
          break;
        }
      }

      cluster.centroid = this.calculateSensorClusterCentroid(cluster.sensors);
      clusters.push(cluster);
    }

    console.log(`Created ${clusters.length} sensor clusters with max ${maxNodesPerCluster} sensors each`);
    return clusters;
  }

  calculateSensorClusterCentroid(sensors) {
    const totalX = sensors.reduce((sum, sensor) => sum + sensor.location.x, 0);
    const totalY = sensors.reduce((sum, sensor) => sum + sensor.location.y, 0);
    return {
      x: totalX / sensors.length,
      y: totalY / sensors.length
    };
  }

  createGatewayClusters(sensorClusters, clusterRange, gatewayRange) {
    const allGatewayPositions = [];

    sensorClusters.forEach((sensorCluster, index) => {
      // Determine number of gateways needed for this sensor cluster
      const gatewaysNeeded = Math.max(1, Math.ceil(sensorCluster.sensors.length / 3)); // 1-2 gateways per sensor cluster

      // Create gateway positions within clusterRange of each other
      const gatewayCluster = this.createSingleGatewayCluster(
        sensorCluster.centroid,
        gatewaysNeeded,
        clusterRange,
        gatewayRange,
        index + 1
      );

      allGatewayPositions.push(...gatewayCluster);
    });

    return allGatewayPositions;
  }

  createSingleGatewayCluster(centerPoint, gatewayCount, clusterRange, gatewayRange, clusterId) {
    const gatewayPositions = [];

    // First gateway at the center point (adjusted to be within grid bounds)
    const firstGateway = {
      x: Math.max(2, Math.min(this.config.gridWidth - 2, centerPoint.x)),
      y: Math.max(2, Math.min(this.config.gridHeight - 2, centerPoint.y)),
      clusterId: clusterId
    };
    gatewayPositions.push(firstGateway);

    // Add additional gateways within clusterRange
    for (let i = 1; i < gatewayCount; i++) {
      let attempts = 0;
      let validPosition = null;

      while (attempts < 20 && !validPosition) {
        // Random position within clusterRange of the first gateway
        const angle = (Math.PI * 2 * i) / gatewayCount; // Distribute evenly around circle
        const distance = Math.random() * clusterRange;

        const x = firstGateway.x + distance * Math.cos(angle);
        const y = firstGateway.y + distance * Math.sin(angle);

        // Check if position is within grid bounds
        if (x >= 2 && x <= this.config.gridWidth - 2 &&
            y >= 2 && y <= this.config.gridHeight - 2) {

          // Check if within clusterRange of other gateways in this cluster
          const withinCluster = gatewayPositions.every(existingGW => {
            const dist = Math.sqrt(
              Math.pow(x - existingGW.x, 2) + Math.pow(y - existingGW.y, 2)
            );
            return dist <= clusterRange;
          });

          if (withinCluster) {
            validPosition = { x, y, clusterId: clusterId };
          }
        }
        attempts++;
      }

      if (validPosition) {
        gatewayPositions.push(validPosition);
      } else {
        // Fallback: place near the first gateway
        gatewayPositions.push({
          x: Math.max(2, Math.min(this.config.gridWidth - 2, firstGateway.x + (i * 2))),
          y: Math.max(2, Math.min(this.config.gridHeight - 2, firstGateway.y + 1)),
          clusterId: clusterId
        });
      }
    }

    console.log(`Created gateway cluster ${clusterId} with ${gatewayPositions.length} gateways`);
    return gatewayPositions;
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

  assignSensorsToSectionGateways() {
    const midX = this.config.gridWidth / 2;
    const midY = this.config.gridHeight / 2;
    
    let totalAssigned = 0;
    let totalUnassigned = 0;
    
    for (const sensor of this.sensors) {
      // Determine which section the sensor belongs to
      let sectionId;
      if (sensor.location.x < midX && sensor.location.y < midY) {
        sectionId = 1; // Top-left
      } else if (sensor.location.x >= midX && sensor.location.y < midY) {
        sectionId = 2; // Top-right
      } else if (sensor.location.x < midX && sensor.location.y >= midY) {
        sectionId = 3; // Bottom-left
      } else {
        sectionId = 4; // Bottom-right
      }
      
      // Find the gateway for this section
      const sectionGateway = this.gateways.find(gw => gw.sectionId === sectionId);
      
      if (sectionGateway && sectionGateway.isActive) {
        // Try to assign sensor to its section's gateway
        if (sectionGateway.registerSensor(sensor)) {
          sensor.assignedGateway = sectionGateway.id;
          sensor.sectionId = sectionId;
          console.log(`Sensor ${sensor.id} assigned to Gateway ${sectionGateway.id} in section ${sectionId}`);
          totalAssigned++;
        } else {
          // Gateway is full (10 node limit reached)
          console.log(`Warning: Gateway ${sectionGateway.id} in section ${sectionId} is full. Sensor ${sensor.id} unassigned.`);
          totalUnassigned++;
        }
      } else {
        console.log(`Error: No active gateway found for section ${sectionId}`);
        totalUnassigned++;
      }
    }
    
    console.log(`Section-based assignment complete: ${totalAssigned} assigned, ${totalUnassigned} unassigned sensors`);
  }

  setupGatewayToGatewayCommunication() {
    // Enable all gateways to communicate with each other
    for (const gateway of this.gateways) {
      gateway.connectedGateways = new Set();
      
      // Connect to all other gateways
      for (const otherGateway of this.gateways) {
        if (gateway.id !== otherGateway.id) {
          gateway.connectedGateways.add(otherGateway.id);
        }
      }
      
      console.log(`Gateway ${gateway.id} connected to ${gateway.connectedGateways.size} other gateways`);
    }
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

    // Process round-robin communication first (from parent class)
    this.processRoundRobinCommunication();

    // Process both flat and federation architectures
    this.processFlatArchitecture();
    this.processFederationArchitecture();

    // Process active floods (shared between both)
    const affectedNodes = this.processActiveFloods();

    // Process coordination (incident management)
    this.processIncidentCoordination();

    // Calculate metrics for both architectures
    this.calculateDualMetrics();

    // Update metrics
    this.updateMetrics();

    // Send status update to client
    if (this.currentTick % 10 === 0) { // Every 10 ticks
      this.sendStatusUpdate();
    }
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
      this.deliverToCentralServer(msgData.message, msgData.sender, 'flat');
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
      const result = this.coordinationAgent.processAlert(message, 'federation');

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
      architecture: 'federation',
      isGateway: false,
      routedThrough: `GATEWAY-${message.gatewayId || 'UNKNOWN'}`
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
    // Calculate actual average hops from metrics
    const totalMessages = this.metrics.messagesDelivered || 1;
    const averageHops = totalMessages > 0 ? this.metrics.totalHops / totalMessages : 0;

    return {
      averageHops: averageHops,
      totalHops: this.metrics.totalHops,
      multiHopMessages: this.metrics.multiHopMessages,
      directRoutes: this.sensors.filter(s => s.isActive && s.centralServerConnectivity).length,
      totalMessages: totalMessages,
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

  // Override processActiveFloods to include gateways
  processActiveFloods() {
    // Call parent method to handle sensors
    const affectedNodes = super.processActiveFloods();

    // Additionally process floods for gateways
    const now = Date.now();

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

      // Apply flood to affected gateways
      for (const gateway of this.gateways) {
        const distance = Math.sqrt(
          Math.pow(gateway.location.x - flood.epicenter.x, 2) +
          Math.pow(gateway.location.y - flood.epicenter.y, 2)
        );

        if (distance <= flood.radius) {
          // Give full water level at epicenter, reducing to 50% at edge of radius
          const distanceRatio = distance / flood.radius;
          const adjustedWaterLevel = flood.currentWaterLevel * (1 - (distanceRatio * 0.5));
          if (adjustedWaterLevel > 0) {
            gateway.updateWaterLevel(adjustedWaterLevel);
          }
        } else {
          // Gateway outside flood radius - reset to normal
          gateway.updateWaterLevel(0);
        }
      }

      // If flood has receded, reset all gateway water levels
      if (elapsedTime > flood.duration * 1.2 && currentWaterLevel <= 0) {
        for (const gateway of this.gateways) {
          const distance = Math.sqrt(
            Math.pow(gateway.location.x - flood.epicenter.x, 2) +
            Math.pow(gateway.location.y - flood.epicenter.y, 2)
          );
          if (distance <= flood.radius) {
            gateway.updateWaterLevel(0);
          }
        }
      }
    }

    return affectedNodes;
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