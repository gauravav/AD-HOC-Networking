class FloodWatchApp {
    constructor() {
        this.socket = io();
        this.isRunning = false;
        this.currentConfig = {
            gridWidth: 25,
            gridHeight: 25,
            sensorCount: 20,
            communicationRange: 10,
            maxNeighbors: 5,
            simulationSpeed: 1000
        };

        this.serverStats = {
            totalMessages: 0,
            alertMessages: 0,
            lastMessage: null
        };

        // Node failure tracking disabled

        this.gridVis = new GridVisualization('grid-canvas');
        this.metricsChart = new MetricsChart('metrics-chart');

        this.initializeEventListeners();
        this.initializeSocketListeners();
        this.updateUI();
    }

    initializeEventListeners() {
        // Simulation controls
        document.getElementById('start-btn').addEventListener('click', () => {
            this.startSimulation();
        });

        document.getElementById('stop-btn').addEventListener('click', () => {
            this.stopSimulation();
        });

        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetSimulation();
        });

        // Event triggers
        document.getElementById('trigger-flood-btn').addEventListener('click', () => {
            this.showFloodControls();
        });

        // Node failure functionality disabled

        document.getElementById('confirm-flood-btn').addEventListener('click', () => {
            this.triggerFlood();
        });

        document.getElementById('cancel-flood-btn').addEventListener('click', () => {
            this.hideFloodControls();
        });

        // Node and gateway failure buttons removed

        // Configuration changes
        ['grid-width', 'grid-height', 'sensor-count', 'comm-range', 'max-neighbors', 'speed'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                this.updateConfiguration(id, e.target.value);
            });
        });

        // Random flood toggle removed

        // Log controls
        document.getElementById('clear-log').addEventListener('click', () => {
            this.clearLog();
        });

        document.getElementById('export-log').addEventListener('click', () => {
            this.exportLog();
        });

        // Central server console controls
        document.getElementById('clear-server-log').addEventListener('click', () => {
            this.clearServerLog();
        });

        // Grid click handler
        window.onGridClick = (x, y) => {
            if (document.getElementById('flood-controls').classList.contains('hidden')) {
                this.showFloodControls();
            }
            document.getElementById('flood-x').value = x;
            document.getElementById('flood-y').value = y;
        };
    }

    initializeSocketListeners() {
        this.socket.on('simulation-started', () => {
            this.isRunning = true;
            this.updateUI();
            this.logMessage('Simulation started', 'info');
        });

        this.socket.on('simulation-stopped', () => {
            this.isRunning = false;
            this.updateUI();
            this.logMessage('Simulation stopped', 'info');
        });

        this.socket.on('status-update', (data) => {
            this.updateStatus(data);
        });

        this.socket.on('flood-event', (data) => {
            this.handleFloodEvent(data);
        });

        this.socket.on('flood-update', (data) => {
            this.handleFloodUpdate(data);
        });

        // Node and gateway events removed

        this.socket.on('incident-report', (data) => {
            this.lastIncidentReport = data;
            this.updateIncidents(data);
        });

        this.socket.on('central-server-message', (data) => {
            this.handleServerMessage(data);
        });

        // Node failure event handlers disabled
    }

    startSimulation() {
        const config = {
            gridWidth: parseInt(document.getElementById('grid-width').value) || 25,
            gridHeight: parseInt(document.getElementById('grid-height').value) || 25,
            sensorCount: parseInt(document.getElementById('sensor-count').value) || 20,
            communicationRange: parseFloat(document.getElementById('comm-range').value) || 10,
            maxNeighbors: parseInt(document.getElementById('max-neighbors').value) || 5,
            simulationSpeed: parseInt(document.getElementById('speed').value)
        };

        this.currentConfig = config;
        this.socket.emit('start-simulation', config);
    }

    stopSimulation() {
        this.socket.emit('stop-simulation');
    }

    resetSimulation() {
        this.stopSimulation();
        setTimeout(() => {
            this.clearLog();
            this.clearServerLog();
            this.clearIncidents();
            this.clearMetrics();
            this.gridVis.floodAreas = [];
            this.gridVis.draw();
        }, 500);
    }

    showFloodControls() {
        document.getElementById('flood-controls').classList.remove('hidden');
    }

    hideFloodControls() {
        document.getElementById('flood-controls').classList.add('hidden');
    }

    triggerFlood() {
        const x = parseInt(document.getElementById('flood-x').value);
        const y = parseInt(document.getElementById('flood-y').value);
        const maxWaterLevel = parseFloat(document.getElementById('flood-level').value);
        const duration = parseInt(document.getElementById('flood-duration').value);

        if (x >= 0 && x < this.currentConfig.gridWidth &&
            y >= 0 && y < this.currentConfig.gridHeight &&
            maxWaterLevel > 0 && duration > 0) {

            this.socket.emit('trigger-flood', { x, y, maxWaterLevel, duration });
            this.hideFloodControls();
            this.logMessage(`Manually triggered gradual flood at (${x}, ${y}) - will reach ${maxWaterLevel}m over ${duration}s`, 'warning');
        } else {
            alert('Invalid flood parameters');
        }
    }

    // Node failure methods disabled


    updateConfiguration(parameter, value) {
        let processedValue;
        if (parameter === 'comm-range') {
            processedValue = parseFloat(value);
            this.currentConfig.communicationRange = processedValue;
        } else if (parameter === 'max-neighbors') {
            processedValue = parseInt(value);
            this.currentConfig.maxNeighbors = processedValue;
        } else {
            processedValue = parseInt(value);
            this.currentConfig[parameter.replace('-', '')] = processedValue;
        }
    }

    updateStatus(data) {
        const { status, gridState, incidentReport, centralServerStatus } = data;

        // Update status indicators
        document.getElementById('sim-status').textContent = status.isRunning ? 'Running' : 'Stopped';
        document.getElementById('current-tick').textContent = status.currentTick;
        document.getElementById('active-nodes').textContent = status.config.sensorCount;
        document.getElementById('central-messages').textContent = status.centralServerMessages || 0;
        document.getElementById('active-incidents').textContent = status.activeIncidents;
        document.getElementById('messages-sent').textContent = status.metrics.messagesGenerated;

        // Update metrics
        this.updateMetrics(status.metrics);

        // Update grid visualization
        this.gridVis.updateGrid(gridState);

        // Update incidents (if new report available)
        if (incidentReport) {
            this.updateIncidents(incidentReport);
        }
    }

    updateMetrics(metrics) {
        // Update metric cards
        document.getElementById('delivery-rate').textContent =
            Math.round(metrics.deliverySuccessRate || 0) + '%';
        document.getElementById('avg-delay').textContent =
            Math.round(metrics.averageDelay || 0) + 'ms';
        document.getElementById('network-overhead').textContent =
            Math.round(metrics.networkOverhead || 0) + '%';
        document.getElementById('grid-dimensions').textContent =
            `${this.currentConfig.gridWidth || 25}m x ${this.currentConfig.gridHeight || 25}m`;

        // Update chart
        this.metricsChart.addDataPoint({
            deliverySuccessRate: metrics.deliverySuccessRate || 0,
            averageDelay: metrics.averageDelay || 0,
            networkOverhead: metrics.networkOverhead || 0,
            networkResilience: 100
        });
    }


    updateIncidents(incidentReport) {
        if (!incidentReport || !incidentReport.incidents) return;

        const incidentsDiv = document.getElementById('incidents-list');

        // Show only flood incidents
        if (incidentReport.incidents.length === 0) {
            incidentsDiv.innerHTML = '<p class="no-data">No active flood incidents</p>';
            return;
        }

        incidentsDiv.innerHTML = incidentReport.incidents.map(incident => {
            const lastUpdate = new Date(Date.now() - (Date.now() - incident.duration)).toLocaleTimeString();
            const sensorList = incident.sensorDetails ? incident.sensorDetails
                .sort((a, b) => b.waterLevel - a.waterLevel)
                .map(sensor => `
                    <div class="sensor-detail">
                        <span class="sensor-id">${sensor.sensorId}</span>
                        <span class="sensor-location">(${Math.round(sensor.location.x)}, ${Math.round(sensor.location.y)})</span>
                        <span class="sensor-water-level">${sensor.waterLevel.toFixed(1)}m</span>
                    </div>
                `).join('') : '';

            return `
            <div class="incident-item fade-in flood-incident" data-incident-id="${incident.id}">
                <div class="incident-header">
                    <span><strong>🌊 Consolidated Flood Alert</strong></span>
                    <span class="incident-severity severity-${incident.severity.toLowerCase()}">
                        ${incident.severity}
                    </span>
                </div>
                <div><strong>Epicenter:</strong> (${Math.round(incident.location.x)}, ${Math.round(incident.location.y)})</div>
                <div><strong>Affected Sensors:</strong> ${incident.sensorCount} nodes</div>
                <div><strong>Current Max Water Level:</strong> <span class="water-level-live">${incident.maxWaterLevel.toFixed(1)}m</span></div>
                <div><strong>Duration:</strong> ${Math.round(incident.duration / 1000)}s</div>
                <div><strong>Last Update:</strong> <span class="last-update">${lastUpdate}</span></div>
                <div class="sensor-readings">
                    <strong>Sensor Readings:</strong>
                    <div class="sensor-list">
                        ${sensorList}
                    </div>
                </div>
                <div class="incident-details">
                    <small>Real-time water levels from ${incident.sensorCount} sensor${incident.sensorCount > 1 ? 's' : ''}</small>
                </div>
            </div>
        `;
        }).join('');
    }

    handleFloodEvent(data) {
        if (data.type === 'gradual') {
            this.logMessage(`Gradual flood started at (${data.epicenter.x}, ${data.epicenter.y}) - will reach ${data.maxWaterLevel}m over ${data.duration}s`, 'warning');
        } else {
            this.logMessage(`Flood detected at (${data.epicenter.x}, ${data.epicenter.y}) - ${data.affectedNodes.length} nodes affected`, 'warning');
        }

        // Add initial flood visualization
        this.gridVis.addFloodArea(data.epicenter.x, data.epicenter.y, 5, data.waterLevel / 5);
    }

    handleFloodUpdate(data) {
        // Update flood visualization with current progress
        const intensity = data.currentWaterLevel / data.maxWaterLevel;
        this.gridVis.updateFloodArea(data.epicenter.x, data.epicenter.y, 5, intensity);

        // Log progress updates occasionally
        const progress = Math.round(data.progress * 100);
        if (progress % 25 === 0 && progress > 0) { // Log at 25%, 50%, 75%, 100%
            this.logMessage(`Flood at (${data.epicenter.x}, ${data.epicenter.y}) - ${progress}% complete (${data.currentWaterLevel.toFixed(1)}m)`, 'info');
        }
    }


    updateUI() {
        const startBtn = document.getElementById('start-btn');
        const stopBtn = document.getElementById('stop-btn');
        const configInputs = ['grid-width', 'grid-height', 'sensor-count', 'comm-range', 'max-neighbors', 'speed'];

        if (this.isRunning) {
            startBtn.disabled = true;
            stopBtn.disabled = false;
            configInputs.forEach(id => {
                document.getElementById(id).disabled = true;
            });
        } else {
            startBtn.disabled = false;
            stopBtn.disabled = true;
            configInputs.forEach(id => {
                document.getElementById(id).disabled = false;
            });
        }
    }

    logMessage(message, level = 'info') {
        const logContent = document.getElementById('log-content');
        const timestamp = new Date().toLocaleTimeString();

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${level}`;
        logEntry.innerHTML = `
            <span class="log-timestamp">[${timestamp}]</span>
            ${message}
        `;

        logContent.appendChild(logEntry);

        // Auto-scroll if enabled
        if (document.getElementById('auto-scroll').checked) {
            logContent.scrollTop = logContent.scrollHeight;
        }

        // Keep only last 100 log entries
        while (logContent.children.length > 100) {
            logContent.removeChild(logContent.firstChild);
        }
    }

    clearLog() {
        document.getElementById('log-content').innerHTML = '';
    }

    exportLog() {
        const logContent = document.getElementById('log-content').innerText;
        const blob = new Blob([logContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `flood-watch-log-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    clearIncidents() {
        document.getElementById('incidents-list').innerHTML = '<p class="no-data">No active incidents</p>';
    }

    clearMetrics() {
        // Reset metric displays
        ['delivery-rate', 'avg-delay', 'network-overhead', 'resilience'].forEach(id => {
            document.getElementById(id).textContent = '0%';
        });

        // Clear chart data
        this.metricsChart.data = {
            deliveryRate: [],
            delay: [],
            overhead: [],
            resilience: []
        };
        this.metricsChart.draw();
    }

    handleServerMessage(data) {
        this.serverStats.totalMessages++;

        if (data.type === 'ALERT') {
            this.serverStats.alertMessages++;
        }

        this.serverStats.lastMessage = data;

        // Update server stats display
        document.getElementById('server-msg-count').textContent = this.serverStats.totalMessages;
        document.getElementById('server-alert-count').textContent = this.serverStats.alertMessages;
        document.getElementById('server-last-msg').textContent =
            `${data.type} from ${data.sender} at (${data.location.x}, ${data.location.y})`;

        // Add to server log
        this.logServerMessage(data);
    }

    logServerMessage(data) {
        const serverLogContent = document.getElementById('server-log-content');
        const timestamp = new Date().toLocaleTimeString();

        const logEntry = document.createElement('div');
        logEntry.className = `server-log-entry ${data.type.toLowerCase()}`;

        let messageDetails = '';
        if (data.type === 'ALERT' && data.data) {
            messageDetails = `Water: ${data.data.waterLevel || 0}m`;
        } else if (data.type === 'HELLO' && data.data && data.data.neighbors) {
            const neighborCount = data.data.neighbors.length;
            const battery = data.data.batteryLevel ? data.data.batteryLevel.toFixed(2) : 'N/A';
            const neighborList = data.data.neighbors.length > 0
                ? data.data.neighbors.map(n => `${n.id}`).join(', ')
                : 'none';
            messageDetails = `Battery: ${battery} | Neighbors[${neighborCount}]: ${neighborList}`;
        }

        logEntry.innerHTML = `
            <span class="server-timestamp">[${timestamp}]</span>
            <span class="server-msg-type">${data.type}</span>
            <span class="server-sender">from ${data.sender}</span>
            <span class="server-location">@(${data.location.x}, ${data.location.y})</span>
            ${messageDetails ? `<span class="server-details">${messageDetails}</span>` : ''}
        `;

        serverLogContent.appendChild(logEntry);

        // Auto-scroll if enabled
        if (document.getElementById('server-auto-scroll').checked) {
            serverLogContent.scrollTop = serverLogContent.scrollHeight;
        }

        // Keep only last 100 log entries
        while (serverLogContent.children.length > 100) {
            serverLogContent.removeChild(serverLogContent.firstChild);
        }
    }

    clearServerLog() {
        document.getElementById('server-log-content').innerHTML = '';
        this.serverStats = {
            totalMessages: 0,
            alertMessages: 0,
            lastMessage: null
        };
        document.getElementById('server-msg-count').textContent = '0';
        document.getElementById('server-alert-count').textContent = '0';
        document.getElementById('server-last-msg').textContent = 'None';
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new FloodWatchApp();
});