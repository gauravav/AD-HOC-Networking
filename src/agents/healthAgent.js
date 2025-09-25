class HealthAgent {
  constructor(id) {
    this.id = id;
    this.monitoredNodes = new Map();
    this.failureHistory = new Map();
    this.networkHealth = {
      totalNodes: 0,
      activeNodes: 0,
      failedNodes: 0,
      batteryLow: 0,
      connectivityIssues: 0
    };

    // Health check configuration
    this.healthCheckInterval = 10000; // 10 seconds
    this.heartbeatTimeout = 30000; // 30 seconds
    this.batteryLowThreshold = 0.2; // 20%
    this.connectivityThreshold = 2; // Minimum neighbors

    this.startHealthMonitoring();
  }

  startHealthMonitoring() {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);

    this.reportTimer = setInterval(() => {
      this.generateHealthReport();
    }, 60000); // Every minute
  }

  stop() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
    }
  }

  registerNode(agent) {
    const nodeInfo = {
      id: agent.id,
      type: agent.isRelay ? 'relay' : 'sensor',
      location: agent.location,
      lastHeartbeat: Date.now(),
      status: 'ACTIVE',
      batteryLevel: agent.batteryLevel,
      neighborCount: agent.neighbors ? agent.neighbors.size : 0,
      isActive: agent.isActive,
      hasGatewayConnection: agent.hasGatewayConnection,
      messageCount: agent.messageBuffer ? agent.messageBuffer.length : 0,
      failureCount: 0
    };

    this.monitoredNodes.set(agent.id, nodeInfo);
    this.updateNetworkHealth();
  }

  updateNodeStatus(agent) {
    if (!this.monitoredNodes.has(agent.id)) {
      this.registerNode(agent);
      return;
    }

    const nodeInfo = this.monitoredNodes.get(agent.id);
    const previousStatus = nodeInfo.status;

    // Update node information
    nodeInfo.lastHeartbeat = Date.now();
    nodeInfo.batteryLevel = agent.batteryLevel;
    nodeInfo.neighborCount = agent.neighbors ? agent.neighbors.size : 0;
    nodeInfo.isActive = agent.isActive;
    nodeInfo.messageCount = agent.messageBuffer ? agent.messageBuffer.length : 0;

    // Determine current status
    nodeInfo.status = this.calculateNodeStatus(nodeInfo);

    // Track status changes
    if (previousStatus !== nodeInfo.status) {
      this.recordStatusChange(agent.id, previousStatus, nodeInfo.status);
    }

    this.updateNetworkHealth();
  }

  calculateNodeStatus(nodeInfo) {
    if (!nodeInfo.isActive) {
      return 'FAILED';
    }

    if (Date.now() - nodeInfo.lastHeartbeat > this.heartbeatTimeout) {
      return 'UNRESPONSIVE';
    }

    if (nodeInfo.batteryLevel < this.batteryLowThreshold) {
      return 'BATTERY_LOW';
    }

    if (nodeInfo.neighborCount < this.connectivityThreshold) {
      return 'ISOLATED';
    }

    return 'HEALTHY';
  }

  recordStatusChange(nodeId, previousStatus, newStatus) {
    if (!this.failureHistory.has(nodeId)) {
      this.failureHistory.set(nodeId, []);
    }

    const history = this.failureHistory.get(nodeId);
    history.push({
      timestamp: Date.now(),
      from: previousStatus,
      to: newStatus,
      duration: this.calculateStatusDuration(nodeId, previousStatus)
    });

    // Keep only last 10 status changes
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }

    // Update failure count for failed nodes
    const nodeInfo = this.monitoredNodes.get(nodeId);
    if (newStatus === 'FAILED' || newStatus === 'UNRESPONSIVE') {
      nodeInfo.failureCount++;
    }
  }

  calculateStatusDuration(nodeId, status) {
    const history = this.failureHistory.get(nodeId);
    if (!history || history.length === 0) return 0;

    const lastEntry = history[history.length - 1];
    return Date.now() - lastEntry.timestamp;
  }

  performHealthCheck() {
    const now = Date.now();

    for (const [nodeId, nodeInfo] of this.monitoredNodes.entries()) {
      // Check for unresponsive nodes
      if (nodeInfo.status !== 'FAILED' &&
          now - nodeInfo.lastHeartbeat > this.heartbeatTimeout) {
        const previousStatus = nodeInfo.status;
        nodeInfo.status = 'UNRESPONSIVE';
        this.recordStatusChange(nodeId, previousStatus, 'UNRESPONSIVE');
      }
    }

    this.updateNetworkHealth();
  }

  updateNetworkHealth() {
    this.networkHealth = {
      totalNodes: this.monitoredNodes.size,
      activeNodes: 0,
      failedNodes: 0,
      batteryLow: 0,
      connectivityIssues: 0,
      unresponsive: 0,
      isolated: 0
    };

    for (const nodeInfo of this.monitoredNodes.values()) {
      switch (nodeInfo.status) {
        case 'HEALTHY':
          this.networkHealth.activeNodes++;
          break;
        case 'FAILED':
          this.networkHealth.failedNodes++;
          break;
        case 'BATTERY_LOW':
          this.networkHealth.batteryLow++;
          break;
        case 'ISOLATED':
          this.networkHealth.isolated++;
          break;
        case 'UNRESPONSIVE':
          this.networkHealth.unresponsive++;
          break;
      }

      if (nodeInfo.neighborCount < this.connectivityThreshold) {
        this.networkHealth.connectivityIssues++;
      }
    }
  }

  generateHealthReport() {
    const report = {
      timestamp: Date.now(),
      networkHealth: { ...this.networkHealth },
      criticalNodes: this.getCriticalNodes(),
      recommendations: this.generateRecommendations(),
      networkResilience: this.calculateNetworkResilience()
    };

    return report;
  }

  getCriticalNodes() {
    const critical = [];

    for (const [nodeId, nodeInfo] of this.monitoredNodes.entries()) {
      if (nodeInfo.status === 'FAILED' ||
          nodeInfo.status === 'UNRESPONSIVE' ||
          nodeInfo.batteryLevel < this.batteryLowThreshold ||
          nodeInfo.failureCount > 3) {
        critical.push({
          id: nodeId,
          status: nodeInfo.status,
          batteryLevel: nodeInfo.batteryLevel,
          failureCount: nodeInfo.failureCount,
          location: nodeInfo.location,
          type: nodeInfo.type
        });
      }
    }

    return critical;
  }

  generateRecommendations() {
    const recommendations = [];

    // Check network coverage
    if (this.networkHealth.failedNodes / this.networkHealth.totalNodes > 0.3) {
      recommendations.push({
        priority: 'HIGH',
        type: 'COVERAGE',
        message: 'High node failure rate detected. Consider deploying backup sensors.'
      });
    }

    // Check battery levels
    if (this.networkHealth.batteryLow > this.networkHealth.totalNodes * 0.2) {
      recommendations.push({
        priority: 'MEDIUM',
        type: 'POWER',
        message: 'Multiple nodes have low battery. Schedule maintenance.'
      });
    }

    // Check connectivity
    if (this.networkHealth.isolated > 0) {
      recommendations.push({
        priority: 'HIGH',
        type: 'CONNECTIVITY',
        message: `${this.networkHealth.isolated} nodes are isolated. Check network topology.`
      });
    }

    return recommendations;
  }

  calculateNetworkResilience() {
    if (this.networkHealth.totalNodes === 0) return 0;

    const healthyRatio = this.networkHealth.activeNodes / this.networkHealth.totalNodes;
    const connectivityRatio = (this.networkHealth.totalNodes - this.networkHealth.isolated) / this.networkHealth.totalNodes;
    const powerRatio = (this.networkHealth.totalNodes - this.networkHealth.batteryLow) / this.networkHealth.totalNodes;

    // Weighted average of health factors
    const resilience = (healthyRatio * 0.4 + connectivityRatio * 0.4 + powerRatio * 0.2) * 100;

    return Math.round(resilience);
  }

  getNodeHealth(nodeId) {
    return this.monitoredNodes.get(nodeId);
  }

  getFailureHistory(nodeId) {
    return this.failureHistory.get(nodeId) || [];
  }

  getNetworkStatistics() {
    return {
      ...this.networkHealth,
      averageBatteryLevel: this.calculateAverageBatteryLevel(),
      averageConnectivity: this.calculateAverageConnectivity(),
      mostReliableNodes: this.getMostReliableNodes(),
      leastReliableNodes: this.getLeastReliableNodes()
    };
  }

  calculateAverageBatteryLevel() {
    if (this.monitoredNodes.size === 0) return 0;

    const totalBattery = Array.from(this.monitoredNodes.values())
      .reduce((sum, node) => sum + node.batteryLevel, 0);

    return totalBattery / this.monitoredNodes.size;
  }

  calculateAverageConnectivity() {
    if (this.monitoredNodes.size === 0) return 0;

    const totalConnections = Array.from(this.monitoredNodes.values())
      .reduce((sum, node) => sum + node.neighborCount, 0);

    return totalConnections / this.monitoredNodes.size;
  }

  getMostReliableNodes() {
    return Array.from(this.monitoredNodes.values())
      .filter(node => node.failureCount === 0 && node.status === 'HEALTHY')
      .sort((a, b) => b.batteryLevel - a.batteryLevel)
      .slice(0, 5);
  }

  getLeastReliableNodes() {
    return Array.from(this.monitoredNodes.values())
      .filter(node => node.failureCount > 0)
      .sort((a, b) => b.failureCount - a.failureCount)
      .slice(0, 5);
  }

  // Trigger specific health actions
  markNodeForMaintenance(nodeId) {
    const node = this.monitoredNodes.get(nodeId);
    if (node) {
      node.maintenanceRequired = true;
      node.maintenanceScheduled = Date.now();
    }
  }

  clearMaintenanceFlag(nodeId) {
    const node = this.monitoredNodes.get(nodeId);
    if (node) {
      node.maintenanceRequired = false;
      delete node.maintenanceScheduled;
    }
  }
}

module.exports = HealthAgent;