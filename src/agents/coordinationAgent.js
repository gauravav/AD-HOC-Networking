const { MessageTypes } = require('../messages');

class FloodIncident {
  constructor(id, location, severity, initialAlert) {
    this.id = id;
    this.location = location;
    this.severity = severity;
    this.status = 'ACTIVE';
    this.alerts = [initialAlert];
    this.affectedSensors = new Set([initialAlert.senderId]);
    this.createdAt = Date.now();
    this.lastUpdate = Date.now();
  }

  addAlert(alert) {
    // Update existing sensor data or add new sensor
    const existingAlertIndex = this.alerts.findIndex(a => a.senderId === alert.senderId);
    if (existingAlertIndex !== -1) {
      // Update existing sensor's latest reading
      this.alerts[existingAlertIndex] = alert;
    } else {
      // Add new sensor to incident
      this.alerts.push(alert);
    }

    this.affectedSensors.add(alert.senderId);
    this.lastUpdate = Date.now();
    this.updateSeverity();
  }

  updateSeverity() {
    const maxWaterLevel = Math.max(...this.alerts.map(a => a.data.waterLevel));
    const sensorCount = this.affectedSensors.size;

    if (maxWaterLevel > 3.0 || sensorCount > 10) {
      this.severity = 'CRITICAL';
    } else if (maxWaterLevel > 2.0 || sensorCount > 5) {
      this.severity = 'HIGH';
    } else if (maxWaterLevel > 1.0 || sensorCount > 2) {
      this.severity = 'MEDIUM';
    } else {
      this.severity = 'LOW';
    }
  }

  getAverageLocation() {
    const locations = this.alerts.map(a => a.data.location);
    const avgX = locations.reduce((sum, loc) => sum + loc.x, 0) / locations.length;
    const avgY = locations.reduce((sum, loc) => sum + loc.y, 0) / locations.length;
    return { x: avgX, y: avgY };
  }

  getCurrentMaxWaterLevel() {
    return Math.max(...this.alerts.map(a => a.data.waterLevel));
  }

  hasActiveFlooding(threshold = 1.0) {
    // Check if any sensor still detects water above threshold
    return this.alerts.some(alert => alert.data.waterLevel > threshold);
  }
}

class CoordinationAgent {
  constructor(id) {
    this.id = id;
    this.incidents = new Map();
    this.processedAlerts = new Set();
    this.duplicateAlerts = new Set();
    this.nodeFailures = new Map(); // Track node failures and their detection evidence
    this.nodeLastSeen = new Map(); // Track when nodes were last seen

    // Configuration
    this.proximityThreshold = 10; // Distance threshold for grouping alerts
    this.duplicateTimeWindow = 60000; // 1 minute window for duplicate detection
    this.incidentTimeoutMs = 300000; // 5 minutes before incident auto-resolves
    this.nodeTimeoutMs = 45000; // 45 seconds before considering a node potentially failed

    this.startPeriodicTasks();
  }

  startPeriodicTasks() {
    // Clean up old incidents and duplicates
    this.cleanupInterval = setInterval(() => {
      this.cleanupIncidents();
      this.cleanupDuplicates();
    }, 10000); // Every 10 seconds for faster incident cleanup

    // Generate incident reports
    this.reportInterval = setInterval(() => {
      this.generateIncidentReports();
    }, 60000); // Every minute
  }

  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
    }
  }

  processAlert(alert) {
    // Check if alert is duplicate
    if (this.isDuplicateAlert(alert)) {
      this.duplicateAlerts.add(alert.id);
      return {
        action: 'DUPLICATE_REMOVED',
        alertId: alert.id,
        reason: 'Duplicate alert detected'
      };
    }

    // Mark alert as processed
    this.processedAlerts.add(alert.id);

    // Find existing incident or create new one
    const existingIncident = this.findNearbyIncident(alert);

    if (existingIncident) {
      existingIncident.addAlert(alert);
      return {
        action: 'ALERT_MERGED',
        alertId: alert.id,
        incidentId: existingIncident.id,
        incident: existingIncident
      };
    } else {
      const newIncident = this.createIncident(alert);
      return {
        action: 'INCIDENT_CREATED',
        alertId: alert.id,
        incidentId: newIncident.id,
        incident: newIncident
      };
    }
  }

  isDuplicateAlert(alert) {
    // Check for exact duplicates
    if (this.processedAlerts.has(alert.id)) {
      return true;
    }

    // Allow water level updates from same sensor - don't treat as duplicates
    // Only treat as duplicate if it's the exact same water level within short time window
    const recentAlerts = Array.from(this.processedAlerts)
      .map(id => this.findAlertById(id))
      .filter(a => a && a.senderId === alert.senderId)
      .filter(a => Date.now() - a.timestamp < 5000) // 5 second window for exact duplicates
      .filter(a => Math.abs(a.data.waterLevel - alert.data.waterLevel) < 0.1); // Same water level

    return recentAlerts.length > 0;
  }

  findNearbyIncident(alert) {
    const alertLocation = alert.data.location;

    for (const incident of this.incidents.values()) {
      if (incident.status !== 'ACTIVE') continue;

      const incidentLocation = incident.getAverageLocation();
      const distance = this.calculateDistance(alertLocation, incidentLocation);

      if (distance <= this.proximityThreshold) {
        return incident;
      }
    }

    return null;
  }

  createIncident(alert) {
    const incidentId = `INC-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const severity = this.calculateInitialSeverity(alert);

    const incident = new FloodIncident(
      incidentId,
      alert.data.location,
      severity,
      alert
    );

    this.incidents.set(incidentId, incident);
    return incident;
  }

  calculateInitialSeverity(alert) {
    const waterLevel = alert.data.waterLevel;

    if (waterLevel > 3.0) return 'CRITICAL';
    if (waterLevel > 2.0) return 'HIGH';
    if (waterLevel > 1.0) return 'MEDIUM';
    return 'LOW';
  }

  calculateDistance(loc1, loc2) {
    const dx = loc1.x - loc2.x;
    const dy = loc1.y - loc2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  findAlertById(alertId) {
    for (const incident of this.incidents.values()) {
      const alert = incident.alerts.find(a => a.id === alertId);
      if (alert) return alert;
    }
    return null;
  }

  cleanupIncidents() {
    const now = Date.now();

    for (const [incidentId, incident] of this.incidents.entries()) {
      if (incident.status === 'ACTIVE') {
        // Check if incident should be resolved due to water levels dropping
        if (!incident.hasActiveFlooding(1.0)) {
          incident.status = 'RESOLVED';
          console.log(`Incident ${incidentId} resolved - no active flooding detected`);
        }
        // Auto-resolve old incidents that haven't been updated
        else if (now - incident.lastUpdate > this.incidentTimeoutMs) {
          incident.status = 'RESOLVED';
          console.log(`Incident ${incidentId} resolved - timeout`);
        }
      }

      // Remove very old resolved incidents
      if (incident.status === 'RESOLVED' &&
          now - incident.lastUpdate > 30000) { // Remove after 30 seconds instead of 10 minutes
        this.incidents.delete(incidentId);
      }
    }
  }

  cleanupDuplicates() {
    const now = Date.now();
    const oldDuplicates = Array.from(this.duplicateAlerts)
      .filter(alertId => {
        // Remove duplicates older than time window
        return now - alertId.timestamp > this.duplicateTimeWindow * 2;
      });

    oldDuplicates.forEach(id => this.duplicateAlerts.delete(id));
  }

  generateIncidentReports() {
    const activeIncidents = Array.from(this.incidents.values())
      .filter(incident => incident.status === 'ACTIVE');

    if (activeIncidents.length === 0) return;

    const report = {
      timestamp: Date.now(),
      activeIncidentCount: activeIncidents.length,
      incidents: activeIncidents.map(incident => ({
        id: incident.id,
        severity: incident.severity,
        location: incident.getAverageLocation(),
        sensorCount: incident.affectedSensors.size,
        duration: Date.now() - incident.createdAt,
        maxWaterLevel: Math.max(...incident.alerts.map(a => a.data.waterLevel)),
        affectedSensors: Array.from(incident.affectedSensors),
        sensorDetails: incident.alerts.map(alert => ({
          sensorId: alert.senderId,
          waterLevel: alert.data.waterLevel,
          location: alert.data.location,
          lastUpdate: alert.timestamp
        }))
      })),
      duplicatesRemoved: this.duplicateAlerts.size,
      totalAlertsProcessed: this.processedAlerts.size
    };

    return report;
  }

  getIncidentById(incidentId) {
    return this.incidents.get(incidentId);
  }

  getAllActiveIncidents() {
    return Array.from(this.incidents.values())
      .filter(incident => incident.status === 'ACTIVE');
  }

  getStatistics() {
    return {
      totalIncidents: this.incidents.size,
      activeIncidents: this.getAllActiveIncidents().length,
      duplicatesRemoved: this.duplicateAlerts.size,
      alertsProcessed: this.processedAlerts.size,
      incidentsByseverity: this.getIncidentsBySeverity()
    };
  }

  getIncidentsBySeverity() {
    const severityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };

    for (const incident of this.incidents.values()) {
      if (incident.status === 'ACTIVE') {
        severityCounts[incident.severity]++;
      }
    }

    return severityCounts;
  }

  // Manually resolve an incident
  resolveIncident(incidentId) {
    const incident = this.incidents.get(incidentId);
    if (incident) {
      incident.status = 'RESOLVED';
      return true;
    }
    return false;
  }

  // Track when a node is seen (from hello messages)
  recordNodeActivity(nodeId) {
    this.nodeLastSeen.set(nodeId, Date.now());
  }

  // Report a known node failure
  reportNodeFailure(nodeId, location) {
    const failureData = {
      nodeId: nodeId,
      location: location,
      detectedAt: Date.now(),
      confirmationMethod: 'DIRECT_FAILURE',
      evidenceSources: ['Node stopped responding directly'],
      neighbors: []
    };

    this.nodeFailures.set(nodeId, failureData);
    return failureData;
  }

  // Detect node failures based on neighbor reports and timeouts
  detectNodeFailures(allNodes) {
    const now = Date.now();
    const suspectedFailures = new Map();

    // Step 1: Check for nodes that haven't been seen recently (timeout detection)
    for (const [nodeId, lastSeen] of this.nodeLastSeen.entries()) {
      if (now - lastSeen > this.nodeTimeoutMs && !this.nodeFailures.has(nodeId)) {
        suspectedFailures.set(nodeId, {
          reason: 'NO_RECENT_ACTIVITY',
          lastSeen: lastSeen,
          evidenceSources: [`No hello messages for ${Math.round((now - lastSeen) / 1000)}s`],
          reportingNeighbors: []
        });
      }
    }

    // Step 2: Build expected neighbor relationships including inactive nodes
    const expectedNeighbors = new Map();
    const activeNodes = allNodes.filter(node => node.isActive);

    // For each active node, find which nodes should be its neighbors based on distance
    // Include ALL nodes (active and inactive) to detect missing neighbors
    for (const activeNode of activeNodes) {
      const expectedNeighborIds = [];

      for (const otherNode of allNodes) {
        if (activeNode.id !== otherNode.id) {
          const distance = this.calculateDistance(activeNode.location, otherNode.location);
          if (distance <= activeNode.communicationRange) {
            expectedNeighborIds.push(otherNode.id);
          }
        }
      }

      expectedNeighbors.set(activeNode.id, expectedNeighborIds);
    }

    // Step 3: Check each active node to see which expected neighbors are missing
    for (const activeNode of activeNodes) {
      const reportedNeighbors = Array.from(activeNode.neighbors);
      const expectedForThisNode = expectedNeighbors.get(activeNode.id) || [];

      // Find nodes that should be neighbors but aren't being reported
      for (const expectedNeighborId of expectedForThisNode) {
        if (!reportedNeighbors.includes(expectedNeighborId) &&
            !this.nodeFailures.has(expectedNeighborId)) {

          if (!suspectedFailures.has(expectedNeighborId)) {
            // This expected neighbor is missing - add to suspicion
            suspectedFailures.set(expectedNeighborId, {
              reason: 'MISSING_FROM_NEIGHBOR_REPORTS',
              lastSeen: this.nodeLastSeen.get(expectedNeighborId) || 0,
              evidenceSources: [`Missing from ${activeNode.id}'s neighbor list (should be within ${activeNode.communicationRange}m range)`],
              reportingNeighbors: [activeNode.id]
            });
          } else {
            // Add additional evidence
            const existing = suspectedFailures.get(expectedNeighborId);
            existing.evidenceSources.push(`Missing from ${activeNode.id}'s neighbor list (should be within ${activeNode.communicationRange}m range)`);
            existing.reportingNeighbors.push(activeNode.id);
          }
        }
      }
    }

    // Step 4: Convert high-confidence suspicions to confirmed failures
    for (const [nodeId, suspicionData] of suspectedFailures.entries()) {
      let confirmationMethod = 'TIMEOUT_ONLY';

      // Determine confirmation method based on evidence
      if (suspicionData.evidenceSources.length > 1) {
        confirmationMethod = 'TIMEOUT_AND_NEIGHBOR_ANALYSIS';
      } else if (suspicionData.reason === 'MISSING_FROM_NEIGHBOR_REPORTS') {
        confirmationMethod = 'NEIGHBOR_ANALYSIS_ONLY';
      }

      const failureData = {
        nodeId: nodeId,
        location: this.findNodeLocation(nodeId, allNodes),
        detectedAt: now,
        confirmationMethod: confirmationMethod,
        evidenceSources: suspicionData.evidenceSources,
        reportingNeighbors: suspicionData.reportingNeighbors,
        lastSeen: suspicionData.lastSeen
      };

      this.nodeFailures.set(nodeId, failureData);
    }

    return Array.from(this.nodeFailures.values());
  }

  findNodeLocation(nodeId, allNodes) {
    const node = allNodes.find(n => n.id === nodeId);
    return node ? node.location : { x: 0, y: 0 };
  }

  getNodeFailures() {
    return Array.from(this.nodeFailures.values());
  }

  clearOldFailures() {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes

    for (const [nodeId, failure] of this.nodeFailures.entries()) {
      if (now - failure.detectedAt > maxAge) {
        this.nodeFailures.delete(nodeId);
      }
    }
  }
}

module.exports = CoordinationAgent;