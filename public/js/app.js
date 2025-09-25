class FloodWatchApp {
    constructor() {
        this.socket = io();
        this.isRunning = false;
        this.currentConfig = {
            gridSize: 50,
            sensorCount: 100,
            relayRatio: 0.2,
            simulationSpeed: 1000
        };

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

        document.getElementById('confirm-flood-btn').addEventListener('click', () => {
            this.triggerFlood();
        });

        document.getElementById('cancel-flood-btn').addEventListener('click', () => {
            this.hideFloodControls();
        });

        document.getElementById('fail-node-btn').addEventListener('click', () => {
            this.triggerNodeFailure();
        });

        document.getElementById('fail-gateway-btn').addEventListener('click', () => {
            this.triggerGatewayFailure();
        });

        // Configuration changes
        ['grid-size', 'sensor-count', 'relay-ratio', 'speed'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                this.updateConfiguration(id, e.target.value);
            });
        });

        // Log controls
        document.getElementById('clear-log').addEventListener('click', () => {
            this.clearLog();
        });

        document.getElementById('export-log').addEventListener('click', () => {
            this.exportLog();
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

        this.socket.on('node-event', (data) => {
            this.handleNodeEvent(data);
        });

        this.socket.on('gateway-event', (data) => {
            this.handleGatewayEvent(data);
        });

        this.socket.on('incident-report', (data) => {
            this.updateIncidents(data);
        });
    }

    startSimulation() {
        const config = {
            gridSize: parseInt(document.getElementById('grid-size').value),
            sensorCount: parseInt(document.getElementById('sensor-count').value),
            relayRatio: parseFloat(document.getElementById('relay-ratio').value),
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
        const waterLevel = parseFloat(document.getElementById('flood-level').value);

        if (x >= 0 && x < this.currentConfig.gridSize &&
            y >= 0 && y < this.currentConfig.gridSize &&
            waterLevel > 0) {

            this.socket.emit('trigger-flood', { x, y, waterLevel });
            this.hideFloodControls();
            this.logMessage(`Manually triggered flood at (${x}, ${y}) with water level ${waterLevel}m`, 'warning');
        } else {
            alert('Invalid flood parameters');
        }
    }

    triggerNodeFailure() {
        // This would be handled by the server randomly
        this.logMessage('Random node failure triggered', 'warning');
    }

    triggerGatewayFailure() {
        // This would be handled by the server randomly
        this.logMessage('Random gateway failure triggered', 'warning');
    }

    updateConfiguration(parameter, value) {
        const numValue = parameter === 'relay-ratio' ? parseFloat(value) : parseInt(value);
        this.currentConfig[parameter.replace('-', '')] = numValue;
    }

    updateStatus(data) {
        const { status, gridState, healthReport, incidentReport } = data;

        // Update status indicators
        document.getElementById('sim-status').textContent = status.isRunning ? 'Running' : 'Stopped';
        document.getElementById('current-tick').textContent = status.currentTick;
        document.getElementById('active-nodes').textContent = status.networkHealth.activeNodes;
        document.getElementById('failed-nodes').textContent = status.networkHealth.failedNodes;
        document.getElementById('active-incidents').textContent = status.activeIncidents;
        document.getElementById('messages-sent').textContent = status.metrics.messagesGenerated;

        // Update metrics
        this.updateMetrics(status.metrics, status.networkHealth);

        // Update grid visualization
        this.gridVis.updateGrid(gridState);

        // Update health panel
        this.updateHealthPanel(healthReport);

        // Update incidents (if new report available)
        if (incidentReport) {
            this.updateIncidents(incidentReport);
        }
    }

    updateMetrics(metrics, networkHealth) {
        // Update metric cards
        document.getElementById('delivery-rate').textContent =
            Math.round(metrics.deliverySuccessRate || 0) + '%';
        document.getElementById('avg-delay').textContent =
            Math.round(metrics.averageDelay || 0) + 'ms';
        document.getElementById('network-overhead').textContent =
            Math.round(metrics.networkOverhead || 0) + '%';
        document.getElementById('resilience').textContent =
            Math.round(networkHealth.networkResilience || 100) + '%';

        // Update chart
        this.metricsChart.addDataPoint({
            deliverySuccessRate: metrics.deliverySuccessRate || 0,
            averageDelay: metrics.averageDelay || 0,
            networkOverhead: metrics.networkOverhead || 0,
            networkResilience: networkHealth.networkResilience || 100
        });
    }

    updateHealthPanel(healthReport) {
        if (!healthReport) return;

        const summaryDiv = document.getElementById('health-summary');
        summaryDiv.innerHTML = `
            <div class="health-stat">
                <span>Network Resilience:</span>
                <span>${healthReport.networkResilience}%</span>
            </div>
            <div class="health-stat">
                <span>Total Nodes:</span>
                <span>${healthReport.networkHealth.totalNodes}</span>
            </div>
            <div class="health-stat">
                <span>Active Nodes:</span>
                <span>${healthReport.networkHealth.activeNodes}</span>
            </div>
            <div class="health-stat">
                <span>Failed Nodes:</span>
                <span>${healthReport.networkHealth.failedNodes}</span>
            </div>
            <div class="health-stat">
                <span>Low Battery:</span>
                <span>${healthReport.networkHealth.batteryLow}</span>
            </div>
        `;

        const recommendationsDiv = document.getElementById('health-recommendations');
        if (healthReport.recommendations && healthReport.recommendations.length > 0) {
            recommendationsDiv.innerHTML = healthReport.recommendations.map(rec => `
                <div class="recommendation priority-${rec.priority.toLowerCase()}">
                    <strong>${rec.type}:</strong> ${rec.message}
                </div>
            `).join('');
        } else {
            recommendationsDiv.innerHTML = '<p class="no-data">No recommendations at this time</p>';
        }
    }

    updateIncidents(incidentReport) {
        if (!incidentReport || !incidentReport.incidents) return;

        const incidentsDiv = document.getElementById('incidents-list');

        if (incidentReport.incidents.length === 0) {
            incidentsDiv.innerHTML = '<p class="no-data">No active incidents</p>';
            return;
        }

        incidentsDiv.innerHTML = incidentReport.incidents.map(incident => `
            <div class="incident-item fade-in">
                <div class="incident-header">
                    <span><strong>Incident ${incident.id.split('-')[1]}</strong></span>
                    <span class="incident-severity severity-${incident.severity.toLowerCase()}">
                        ${incident.severity}
                    </span>
                </div>
                <div>Location: (${Math.round(incident.location.x)}, ${Math.round(incident.location.y)})</div>
                <div>Sensors: ${incident.sensorCount} | Max Water: ${incident.maxWaterLevel.toFixed(1)}m</div>
                <div>Duration: ${Math.round(incident.duration / 1000)}s</div>
            </div>
        `).join('');
    }

    handleFloodEvent(data) {
        this.logMessage(`Flood detected at (${data.epicenter.x}, ${data.epicenter.y}) - ${data.affectedNodes.length} nodes affected`, 'warning');

        // Add flood visualization
        this.gridVis.addFloodArea(data.epicenter.x, data.epicenter.y, 5, data.waterLevel / 5);
    }

    handleNodeEvent(data) {
        this.logMessage(`Node ${data.nodeId} failed at location (${data.location.x}, ${data.location.y})`, 'error');
    }

    handleGatewayEvent(data) {
        this.logMessage(`Gateway connection lost at node ${data.nodeId}`, 'error');
    }

    updateUI() {
        const startBtn = document.getElementById('start-btn');
        const stopBtn = document.getElementById('stop-btn');
        const configInputs = ['grid-size', 'sensor-count', 'relay-ratio', 'speed'];

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
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new FloodWatchApp();
});