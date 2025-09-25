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
    this.alerts.push(alert);
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
    } else if (maxWaterLevel > 1.5 || sensorCount > 2) {
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
}

class CoordinationAgent {
  constructor(id) {
    this.id = id;
    this.incidents = new Map();
    this.processedAlerts = new Set();
    this.duplicateAlerts = new Set();

    // Configuration
    this.proximityThreshold = 10; // Distance threshold for grouping alerts
    this.duplicateTimeWindow = 60000; // 1 minute window for duplicate detection
    this.incidentTimeoutMs = 300000; // 5 minutes before incident auto-resolves

    this.startPeriodicTasks();
  }

  startPeriodicTasks() {
    // Clean up old incidents and duplicates
    this.cleanupInterval = setInterval(() => {
      this.cleanupIncidents();
      this.cleanupDuplicates();
    }, 30000); // Every 30 seconds

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

    // Check for near-duplicate alerts (same sensor, similar time)
    const recentAlerts = Array.from(this.processedAlerts)
      .map(id => this.findAlertById(id))
      .filter(a => a && a.senderId === alert.senderId)
      .filter(a => Date.now() - a.timestamp < this.duplicateTimeWindow);

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
    if (waterLevel > 1.5) return 'MEDIUM';
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
      // Auto-resolve old incidents
      if (now - incident.lastUpdate > this.incidentTimeoutMs) {
        incident.status = 'RESOLVED';
      }

      // Remove very old resolved incidents
      if (incident.status === 'RESOLVED' &&
          now - incident.lastUpdate > this.incidentTimeoutMs * 2) {
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
        maxWaterLevel: Math.max(...incident.alerts.map(a => a.data.waterLevel))
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
}

module.exports = CoordinationAgent;