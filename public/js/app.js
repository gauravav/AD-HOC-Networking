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

        this.dualGridVis = new DualGridVisualization('flat-grid-canvas', 'federation-grid-canvas');
        this.metricsChart = new MetricsChart('metrics-chart');

        // Time-based simulation state
        this.timedSimulation = {
            isRunning: false,
            duration: 0,
            startTime: 0,
            floodFrequency: 0,
            interval: null,
            floodsTriggered: 0,
            timer: null
        };

        // Metrics tracking for comparison
        this.metricsCollector = {
            flat: {
                deliveryRatio: [],
                latency: [],
                recoveryTime: [],
                dataLoss: [],
                resilience: [],
                cooperation: []
            },
            federated: {
                deliveryRatio: [],
                latency: [],
                recoveryTime: [],
                dataLoss: [],
                resilience: [],
                cooperation: []
            },
            startTime: null,
            lastCollectionTime: 0
        };

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

        // Dual Grid Controls
        this.setupDualGridControls();

        // Log controls
        document.getElementById('clear-log').addEventListener('click', () => {
            this.clearLog();
        });

        document.getElementById('export-log').addEventListener('click', () => {
            this.exportLog();
        });

        // Central server console controls
        document.getElementById('clear-flat-server-log').addEventListener('click', () => {
            this.clearFlatServerLog();
        });

        document.getElementById('clear-fed-server-log').addEventListener('click', () => {
            this.clearFedServerLog();
        });

        document.getElementById('clear-all-server-logs').addEventListener('click', () => {
            this.clearAllServerLogs();
        });

        document.getElementById('test-flat-message').addEventListener('click', () => {
            this.sendTestMessage('flat');
        });

        document.getElementById('test-fed-message').addEventListener('click', () => {
            this.sendTestMessage('federation');
        });

        // Time-based simulation controls
        document.getElementById('start-timed-simulation-btn').addEventListener('click', () => {
            this.startTimedSimulation();
        });

        document.getElementById('stop-timed-simulation-btn').addEventListener('click', () => {
            this.stopTimedSimulation();
        });

        // Metrics export controls
        document.getElementById('export-metrics-btn').addEventListener('click', () => {
            this.exportMetrics();
        });

        document.getElementById('reset-metrics-btn').addEventListener('click', () => {
            this.resetMetrics();
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

        this.socket.on('flood-receded', (data) => {
            this.handleFloodReceded(data);
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

    setupDualGridControls() {
        // Architecture toggle controls
        const archToggle = document.querySelectorAll('input[name="architecture"]');
        archToggle.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.toggleArchitectureView(e.target.value);
            });
        });

        // Flat architecture controls
        document.getElementById('flat-zoom-in')?.addEventListener('click', () => {
            this.dualGridVis.zoom(1.2);
        });

        document.getElementById('flat-zoom-out')?.addEventListener('click', () => {
            this.dualGridVis.zoom(0.8);
        });

        document.getElementById('flat-toggle-labels')?.addEventListener('click', () => {
            this.dualGridVis.toggleLabels();
        });

        document.getElementById('flat-view-mode')?.addEventListener('change', (e) => {
            this.dualGridVis.setViewMode(e.target.value, 'flat');
        });

        // Federation architecture controls
        document.getElementById('fed-zoom-in')?.addEventListener('click', () => {
            this.dualGridVis.zoom(1.2);
        });

        document.getElementById('fed-zoom-out')?.addEventListener('click', () => {
            this.dualGridVis.zoom(0.8);
        });

        document.getElementById('fed-toggle-labels')?.addEventListener('click', () => {
            this.dualGridVis.toggleLabels();
        });

        document.getElementById('fed-view-mode')?.addEventListener('change', (e) => {
            this.dualGridVis.setViewMode(e.target.value, 'federation');
        });
    }

    toggleArchitectureView(view) {
        const flatSection = document.getElementById('flat-section');
        const fedSection = document.getElementById('federation-section');

        switch (view) {
            case 'flat':
                flatSection.style.display = 'block';
                fedSection.style.display = 'none';
                break;
            case 'federation':
                flatSection.style.display = 'none';
                fedSection.style.display = 'block';
                break;
            case 'both':
            default:
                flatSection.style.display = 'block';
                fedSection.style.display = 'block';
                break;
        }
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
            this.clearAllServerLogs();
            this.clearIncidents();
            this.clearMetrics();
            this.dualGridVis.floodAreas = [];
            this.dualGridVis.draw();
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
        const radius = parseFloat(document.getElementById('flood-radius').value);
        const maxWaterLevel = parseFloat(document.getElementById('flood-level').value);
        const duration = parseInt(document.getElementById('flood-duration').value);

        if (x >= 0 && x < this.currentConfig.gridWidth &&
            y >= 0 && y < this.currentConfig.gridHeight &&
            radius > 0 && maxWaterLevel > 0 && duration > 0) {

            this.socket.emit('trigger-flood', { x, y, radius, maxWaterLevel, duration });
            this.hideFloodControls();
            this.logMessage(`Manually triggered gradual flood at (${x}, ${y}) - will spread to ${radius}m radius and reach ${maxWaterLevel}m over ${duration}s`, 'warning');
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

        // Update separate incident counts
        document.getElementById('flat-incidents').textContent = status.flatActiveIncidents || 0;
        document.getElementById('federation-incidents').textContent = status.federationActiveIncidents || 0;

        document.getElementById('messages-sent').textContent = status.metrics.messagesGenerated;

        // Update metrics
        this.updateMetrics(status.metrics);

        // Update dual grid visualization
        this.dualGridVis.updateGrids(gridState);

        // Update incidents (if new report available)
        if (incidentReport) {
            this.updateIncidents(incidentReport);
        }

        // Update individual incident lists
        this.updateIndividualIncidents(status);
    }

    updateMetrics(metrics) {
        // Update flat vs federation statistics
        if (metrics.flat && metrics.federation) {
            this.updateDualMetrics(metrics);
        } else {
            // Fallback to single architecture metrics
            document.getElementById('delivery-rate').textContent =
                Math.round(metrics.deliverySuccessRate || 0) + '%';
            document.getElementById('avg-delay').textContent =
                Math.round(metrics.averageDelay || 0) + 'ms';
            document.getElementById('network-overhead').textContent =
                Math.round(metrics.networkOverhead || 0) + '%';
        }

        document.getElementById('grid-dimensions').textContent =
            `${this.currentConfig.gridWidth || 25}m x ${this.currentConfig.gridHeight || 25}m`;

        // Update chart with comparison data
        this.metricsChart.addDataPoint({
            deliverySuccessRate: metrics.deliverySuccessRate || (metrics.flat?.reliability * 100) || 0,
            averageDelay: metrics.averageDelay || metrics.federation?.averageLatency || 0,
            networkOverhead: metrics.networkOverhead || 0,
            networkResilience: 100
        });

        // Collect metrics for comparison if timed simulation is running
        if (this.timedSimulation.isRunning) {
            this.collectMetrics(metrics);
        }
    }

    updateDualMetrics(metrics) {
        const { flat, federation, comparison } = metrics;

        // Update architecture-specific stats
        document.getElementById('flat-direct-routes').textContent = flat.directRoutes || 0;
        document.getElementById('flat-total-hops').textContent = flat.totalHops || 0;

        document.getElementById('fed-gateway-count').textContent = federation.gatewayCount || 0;
        document.getElementById('fed-avg-hops').textContent = federation.averageHops.toFixed(1) || '0.0';

        // Update main metrics with comparison
        document.getElementById('delivery-rate').textContent =
            `F: ${Math.round(flat.reliability * 100)}% | Fed: ${Math.round(federation.reliability * 100)}%`;
        document.getElementById('avg-delay').textContent =
            `F: ${flat.averageLatency}ms | Fed: ${Math.round(federation.averageLatency)}ms`;
        document.getElementById('network-overhead').textContent =
            `Hops: F:${flat.averageHops.toFixed(1)} | Fed:${federation.averageHops.toFixed(1)}`;
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

    updateIndividualIncidents(status) {
        // Update flat architecture incidents
        this.updateArchitectureIncidents(
            status.flatIncidentsList || [],
            'flat-incidents-list',
            '📡 Flat Organization'
        );

        // Update federation architecture incidents
        this.updateArchitectureIncidents(
            status.federationIncidentsList || [],
            'federation-incidents-list',
            '🏢 Federation Organization'
        );
    }

    updateArchitectureIncidents(incidents, containerId, architectureName) {
        const container = document.getElementById(containerId);

        if (!container) {
            console.warn(`Container ${containerId} not found`);
            return;
        }

        if (incidents.length === 0) {
            container.innerHTML = '<p class="no-data">No active incidents</p>';
            return;
        }

        container.innerHTML = incidents.map(incident => {
            const createdAt = new Date(incident.createdAt).toLocaleTimeString();
            const lastUpdate = new Date(incident.lastUpdate).toLocaleTimeString();
            const location = incident.getAverageLocation ? incident.getAverageLocation() : incident.location;

            return `
                <div class="incident-item fade-in" data-incident-id="${incident.id}">
                    <div class="incident-header">
                        <span><strong>🌊 ${incident.id}</strong></span>
                        <span class="incident-severity severity-${incident.severity.toLowerCase()}">
                            ${incident.severity}
                        </span>
                    </div>
                    <div class="incident-details">
                        <div class="incident-info">
                            <span class="incident-location">📍 (${Math.round(location.x)}, ${Math.round(location.y)})</span>
                            <span class="incident-sensors">👁️ ${incident.affectedSensors ? incident.affectedSensors.size : 0} sensors</span>
                        </div>
                        <div class="incident-timing">
                            <small>Created: ${createdAt} | Updated: ${lastUpdate}</small>
                        </div>
                        <div class="incident-water-levels">
                            ${incident.alerts ? incident.alerts.slice(-3).map(alert =>
                                `<span class="water-level">💧 ${alert.data.waterLevel.toFixed(1)}m</span>`
                            ).join(' ') : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    handleFloodEvent(data) {
        if (data.type === 'gradual') {
            const radius = data.maxRadius || 5;
            this.logMessage(`Gradual flood started at (${data.epicenter.x}, ${data.epicenter.y}) - will spread to ${radius}m and reach ${data.maxWaterLevel}m over ${data.duration}s`, 'warning');
            // Add initial flood visualization with specified duration and radius
            this.dualGridVis.addFloodArea(data.epicenter.x, data.epicenter.y, 0.1, 0, data.duration * 1000);
        } else {
            this.logMessage(`Flood detected at (${data.epicenter.x}, ${data.epicenter.y}) - ${data.affectedNodes.length} nodes affected`, 'warning');
            // Add flood visualization with default duration for instant floods
            this.dualGridVis.addFloodArea(data.epicenter.x, data.epicenter.y, 5, data.waterLevel / 5);
        }
    }

    handleFloodUpdate(data) {
        // Update flood visualization with current spreading radius and water level
        const intensity = data.currentWaterLevel / data.maxWaterLevel;
        const currentRadius = data.currentRadius || data.maxRadius || 5;
        this.dualGridVis.updateFloodArea(data.epicenter.x, data.epicenter.y, currentRadius, intensity);

        // Log progress updates occasionally
        const progress = Math.round(data.progress * 100);
        if (progress % 25 === 0 && progress > 0) { // Log at 25%, 50%, 75%, 100%
            this.logMessage(`Flood at (${data.epicenter.x}, ${data.epicenter.y}) - ${progress}% spread (radius: ${currentRadius.toFixed(1)}m, water: ${data.currentWaterLevel.toFixed(1)}m)`, 'info');
        }
    }

    handleFloodReceded(data) {
        // Remove flood visualization from map
        const floodId = `${data.epicenter.x}-${data.epicenter.y}`;
        this.dualGridVis.removeFloodArea(floodId);

        // Log flood completion
        this.logMessage(`Flood at (${data.epicenter.x}, ${data.epicenter.y}) has completely receded after ${data.duration}s`, 'info');
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
        // Determine if this is a flat or federation message based on data properties
        const isFederationMessage = data.isGateway || data.routedThrough || data.architecture === 'federation';

        if (isFederationMessage) {
            this.handleFederationServerMessage(data);
        } else {
            this.handleFlatServerMessage(data);
        }
    }

    handleFlatServerMessage(data) {
        // Update flat architecture stats
        const currentMessages = parseInt(document.getElementById('flat-server-msg-count').textContent) || 0;
        const currentAlerts = parseInt(document.getElementById('flat-server-alert-count').textContent) || 0;

        document.getElementById('flat-server-msg-count').textContent = currentMessages + 1;

        if (data.type === 'ALERT') {
            document.getElementById('flat-server-alert-count').textContent = currentAlerts + 1;
        }

        document.getElementById('flat-server-last-msg').textContent =
            `${data.type} from ${data.sender} at (${data.location.x}, ${data.location.y})`;

        // Add to flat server log
        this.logServerMessage(data, 'flat');
    }

    handleFederationServerMessage(data) {
        // Update federation architecture stats
        const currentMessages = parseInt(document.getElementById('fed-server-msg-count').textContent) || 0;
        const currentAlerts = parseInt(document.getElementById('fed-server-alert-count').textContent) || 0;

        document.getElementById('fed-server-msg-count').textContent = currentMessages + 1;

        if (data.type === 'ALERT') {
            document.getElementById('fed-server-alert-count').textContent = currentAlerts + 1;
        }

        document.getElementById('fed-server-last-msg').textContent =
            `${data.type} from ${data.sender} at (${data.location.x}, ${data.location.y})`;

        // Add to federation server log
        this.logServerMessage(data, 'federation');
    }

    logServerMessage(data, architecture = 'flat') {
        const logContentId = architecture === 'federation' ? 'fed-server-log-content' : 'flat-server-log-content';
        const serverLogContent = document.getElementById(logContentId);

        if (!serverLogContent) {
            console.error(`Server log content not found for architecture: ${architecture}`);
            return;
        }

        const timestamp = new Date().toLocaleTimeString();

        const logEntry = document.createElement('div');
        logEntry.className = `server-log-entry ${data.type.toLowerCase()}`;

        let messageDetails = '';
        let isRecoveryMessage = data.data && data.data.recoveryNotification;

        if (isRecoveryMessage) {
            const nodeType = data.data.gatewayRecovery ? 'Gateway' : 'Sensor';
            messageDetails = `🔄 ${nodeType} Recovery | Battery: ${data.data.batteryLevel ? data.data.batteryLevel.toFixed(2) : 'N/A'}`;
            logEntry.className += ' recovery-message';
        } else if (data.type === 'ALERT' && data.data) {
            messageDetails = `Water: ${data.data.waterLevel || 0}m`;
        } else if (data.type === 'HELLO' && data.data && data.data.neighbors) {
            const neighborCount = data.data.neighbors.length;
            const battery = data.data.batteryLevel ? data.data.batteryLevel.toFixed(2) : 'N/A';
            const neighborList = data.data.neighbors.length > 0
                ? data.data.neighbors.map(n => `${n.id}`).join(', ')
                : 'none';
            messageDetails = `Battery: ${battery} | Neighbors[${neighborCount}]: ${neighborList}`;
        }

        // Add architecture-specific details
        let architectureInfo = '';
        if (architecture === 'federation' && (data.isGateway || data.routedThrough)) {
            architectureInfo = data.isGateway ? ' [Gateway]' : ` [via ${data.routedThrough}]`;
        }

        // Add hop information for multi-hop messages
        let hopInfo = '';
        if (data.isMultiHop && data.hopCount > 0) {
            hopInfo = ` <span class="hop-info">[${data.hopCount} hops]</span>`;
        }

        logEntry.innerHTML = `
            <span class="server-timestamp">[${timestamp}]</span>
            <span class="server-msg-type">${data.type}</span>
            <span class="server-sender">from ${data.sender}${architectureInfo}${hopInfo}</span>
            <span class="server-location">@(${data.location.x}, ${data.location.y})</span>
            ${messageDetails ? `<span class="server-details">${messageDetails}</span>` : ''}
        `;

        serverLogContent.appendChild(logEntry);

        // Keep only last 100 log entries
        while (serverLogContent.children.length > 100) {
            serverLogContent.removeChild(serverLogContent.firstChild);
        }
    }

    clearFlatServerLog() {
        const flatLogContent = document.getElementById('flat-server-log-content');
        if (flatLogContent) {
            flatLogContent.innerHTML = '';
        }
        document.getElementById('flat-server-msg-count').textContent = '0';
        document.getElementById('flat-server-alert-count').textContent = '0';
        document.getElementById('flat-server-last-msg').textContent = 'None';
    }

    clearFedServerLog() {
        const fedLogContent = document.getElementById('fed-server-log-content');
        if (fedLogContent) {
            fedLogContent.innerHTML = '';
        }
        document.getElementById('fed-server-msg-count').textContent = '0';
        document.getElementById('fed-server-alert-count').textContent = '0';
        document.getElementById('fed-server-last-msg').textContent = 'None';
    }

    clearAllServerLogs() {
        this.clearFlatServerLog();
        this.clearFedServerLog();
    }

    sendTestMessage(architecture) {
        // Create a test message to verify the console is working
        const testMessage = {
            type: 'HELLO',
            sender: `TEST-SENSOR-${Math.floor(Math.random() * 100)}`,
            location: {
                x: Math.floor(Math.random() * 25),
                y: Math.floor(Math.random() * 25)
            },
            data: {
                batteryLevel: Math.random() * 100,
                neighbors: [
                    { id: `NEIGHBOR-${Math.floor(Math.random() * 10)}` },
                    { id: `NEIGHBOR-${Math.floor(Math.random() * 10)}` }
                ]
            },
            timestamp: Date.now()
        };

        if (architecture === 'federation') {
            testMessage.isGateway = Math.random() > 0.5;
            testMessage.routedThrough = testMessage.isGateway ? null : `GATEWAY-${Math.floor(Math.random() * 5)}`;
            testMessage.architecture = 'federation';
        }

        // Simulate receiving the message
        this.handleServerMessage(testMessage);
    }

    startTimedSimulation() {
        if (this.timedSimulation.isRunning || !this.isRunning) {
            alert('Please start the main simulation first');
            return;
        }

        const duration = parseInt(document.getElementById('sim-duration').value);
        const frequency = parseFloat(document.getElementById('flood-frequency').value);

        if (duration <= 0 || frequency <= 0) {
            alert('Please enter valid duration and frequency values');
            return;
        }

        // Validate that we'll actually see floods in the simulation time
        const floodInterval = (60 / frequency) * 1000; // Milliseconds between floods
        const simulationDuration = duration * 60 * 1000; // Simulation duration in milliseconds
        const expectedFloods = Math.floor(simulationDuration / floodInterval);

        if (expectedFloods === 0) {
            alert(`Warning: With ${frequency} floods/minute over ${duration} minutes, no floods will occur!\nIncrease frequency or duration. Current interval: ${(floodInterval/1000).toFixed(1)} seconds between floods.`);
            return;
        }

        this.timedSimulation.isRunning = true;
        this.timedSimulation.duration = duration * 60 * 1000; // Convert to milliseconds
        this.timedSimulation.startTime = Date.now();
        this.timedSimulation.floodFrequency = frequency;
        this.timedSimulation.floodsTriggered = 0;

        // Reset metrics collection
        this.resetMetrics();
        this.metricsCollector.startTime = Date.now();

        // Update UI
        document.getElementById('start-timed-simulation-btn').disabled = true;
        document.getElementById('stop-timed-simulation-btn').disabled = false;
        document.getElementById('timed-sim-status').style.display = 'block';

        // Start flood generation using the previously calculated floodInterval
        this.timedSimulation.interval = setInterval(() => {
            this.triggerRandomFlood();
        }, floodInterval);

        // Trigger first flood immediately for immediate feedback
        setTimeout(() => {
            if (this.timedSimulation.isRunning) {
                this.triggerRandomFlood();
            }
        }, 2000); // First flood after 2 seconds

        // Start countdown timer
        this.updateTimerDisplay();
        this.timedSimulation.timer = setInterval(() => {
            this.updateTimerDisplay();
        }, 1000);

        this.logMessage(`🎯 Timed simulation started - ${duration} minutes, ${frequency} floods/minute`, 'info');
        this.logMessage(`📊 Expected ${expectedFloods} floods over ${duration} minutes (${(floodInterval/1000).toFixed(1)}s intervals)`, 'info');
    }

    stopTimedSimulation() {
        if (!this.timedSimulation.isRunning) return;

        this.timedSimulation.isRunning = false;

        // Clear intervals
        if (this.timedSimulation.interval) {
            clearInterval(this.timedSimulation.interval);
            this.timedSimulation.interval = null;
        }

        if (this.timedSimulation.timer) {
            clearInterval(this.timedSimulation.timer);
            this.timedSimulation.timer = null;
        }

        // Update UI
        document.getElementById('start-timed-simulation-btn').disabled = false;
        document.getElementById('stop-timed-simulation-btn').disabled = true;
        document.getElementById('timed-sim-status').style.display = 'none';

        this.logMessage(`🛑 Timed simulation stopped - ${this.timedSimulation.floodsTriggered} floods triggered`, 'info');
    }

    updateTimerDisplay() {
        const elapsed = Date.now() - this.timedSimulation.startTime;
        const remaining = Math.max(0, this.timedSimulation.duration - elapsed);

        if (remaining <= 0) {
            this.stopTimedSimulation();
            return;
        }

        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);

        document.getElementById('time-remaining').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('floods-triggered').textContent = this.timedSimulation.floodsTriggered;
    }

    triggerRandomFlood() {
        if (!this.isRunning) {
            this.logMessage('❌ Cannot trigger flood - main simulation not running', 'error');
            return;
        }

        // Generate random flood parameters
        const x = Math.floor(Math.random() * this.currentConfig.gridWidth);
        const y = Math.floor(Math.random() * this.currentConfig.gridHeight);
        const radius = 3 + Math.random() * 7; // 3-10m radius
        const maxWaterLevel = 1.5 + Math.random() * 2.5; // 1.5-4.0m water level
        const duration = 30 + Math.random() * 90; // 30-120 seconds

        this.timedSimulation.floodsTriggered++;

        // Log before triggering
        this.logMessage(`🎯 Triggering auto-flood #${this.timedSimulation.floodsTriggered}...`, 'info');

        // Trigger the flood
        this.socket.emit('trigger-flood', { x, y, radius, maxWaterLevel, duration });

        // Log detailed flood info
        this.logMessage(`🌊 Auto-flood #${this.timedSimulation.floodsTriggered} at (${x}, ${y}) - ${radius.toFixed(1)}m radius, ${maxWaterLevel.toFixed(1)}m water, ${duration}s duration`, 'warning');

        // Update the status display immediately
        document.getElementById('floods-triggered').textContent = this.timedSimulation.floodsTriggered;
    }

    resetMetrics() {
        this.metricsCollector.flat = {
            deliveryRatio: [],
            latency: [],
            recoveryTime: [],
            dataLoss: [],
            resilience: [],
            cooperation: []
        };
        this.metricsCollector.federated = {
            deliveryRatio: [],
            latency: [],
            recoveryTime: [],
            dataLoss: [],
            resilience: [],
            cooperation: []
        };
        this.metricsCollector.startTime = Date.now();
        this.metricsCollector.lastCollectionTime = 0;

        // Clear UI
        this.updateComparisonMetrics();
    }

    collectMetrics(metrics) {
        if (!this.metricsCollector.startTime) return;

        const now = Date.now();
        if (now - this.metricsCollector.lastCollectionTime < 5000) return; // Collect every 5 seconds

        this.metricsCollector.lastCollectionTime = now;

        if (metrics.flat && metrics.federation) {
            // Flat architecture metrics
            this.metricsCollector.flat.deliveryRatio.push(metrics.flat.reliability * 100 || 0);
            this.metricsCollector.flat.latency.push(metrics.flat.averageLatency || 0);
            this.metricsCollector.flat.recoveryTime.push(this.calculateRecoveryTime('flat'));
            this.metricsCollector.flat.dataLoss.push(this.calculateDataLoss('flat'));
            this.metricsCollector.flat.resilience.push(this.calculateResilience('flat'));
            this.metricsCollector.flat.cooperation.push(this.calculateCooperation('flat'));

            // Federation architecture metrics
            this.metricsCollector.federated.deliveryRatio.push(metrics.federation.reliability * 100 || 0);
            this.metricsCollector.federated.latency.push(metrics.federation.averageLatency || 0);
            this.metricsCollector.federated.recoveryTime.push(this.calculateRecoveryTime('federation'));
            this.metricsCollector.federated.dataLoss.push(this.calculateDataLoss('federation'));
            this.metricsCollector.federated.resilience.push(this.calculateResilience('federation'));
            this.metricsCollector.federated.cooperation.push(this.calculateCooperation('federation'));

            this.updateComparisonMetrics();
        }
    }

    calculateRecoveryTime(architecture) {
        // Simulate recovery time based on architecture type
        if (architecture === 'flat') {
            return 5 + Math.random() * 10; // 5-15 seconds for flat
        } else {
            return 8 + Math.random() * 12; // 8-20 seconds for federation
        }
    }

    calculateDataLoss(architecture) {
        // Simulate data loss rate
        const baseLoss = architecture === 'flat' ? 2 : 1; // Flat has higher base loss
        return baseLoss + Math.random() * 3;
    }

    calculateResilience(architecture) {
        // Calculate system resilience as percentage
        const incidents = this.lastIncidentReport?.incidents || [];
        const totalSensors = this.currentConfig.sensorCount || 20;
        const affectedSensors = incidents.reduce((sum, incident) => sum + (incident.sensorCount || 0), 0);
        return Math.max(0, 100 - (affectedSensors / totalSensors) * 100);
    }

    calculateCooperation(architecture) {
        // Calculate agentic cooperation metric
        if (architecture === 'flat') {
            // Number of agents helping reroute
            return Math.floor(2 + Math.random() * 8);
        } else {
            // Gateway sync + sensor handoff
            return Math.floor(3 + Math.random() * 12);
        }
    }

    updateComparisonMetrics() {
        const flat = this.metricsCollector.flat;
        const fed = this.metricsCollector.federated;

        // Calculate averages
        const flatAvgs = {
            deliveryRatio: this.calculateAverage(flat.deliveryRatio),
            latency: this.calculateAverage(flat.latency),
            recoveryTime: this.calculateAverage(flat.recoveryTime),
            dataLoss: this.calculateAverage(flat.dataLoss),
            resilience: this.calculateAverage(flat.resilience),
            cooperation: this.calculateAverage(flat.cooperation)
        };

        const fedAvgs = {
            deliveryRatio: this.calculateAverage(fed.deliveryRatio),
            latency: this.calculateAverage(fed.latency),
            recoveryTime: this.calculateAverage(fed.recoveryTime),
            dataLoss: this.calculateAverage(fed.dataLoss),
            resilience: this.calculateAverage(fed.resilience),
            cooperation: this.calculateAverage(fed.cooperation)
        };

        // Update UI
        document.getElementById('flat-delivery-ratio').textContent = flatAvgs.deliveryRatio.toFixed(1) + '%';
        document.getElementById('fed-delivery-ratio').textContent = fedAvgs.deliveryRatio.toFixed(1) + '%';
        document.getElementById('delivery-ratio-diff').textContent = (fedAvgs.deliveryRatio - flatAvgs.deliveryRatio).toFixed(1) + '%';

        document.getElementById('flat-latency').textContent = flatAvgs.latency.toFixed(1) + 'ms';
        document.getElementById('fed-latency').textContent = fedAvgs.latency.toFixed(1) + 'ms';
        document.getElementById('latency-diff').textContent = (fedAvgs.latency - flatAvgs.latency).toFixed(1) + 'ms';

        document.getElementById('flat-recovery-time').textContent = flatAvgs.recoveryTime.toFixed(1) + 's';
        document.getElementById('fed-recovery-time').textContent = fedAvgs.recoveryTime.toFixed(1) + 's';
        document.getElementById('recovery-time-diff').textContent = (fedAvgs.recoveryTime - flatAvgs.recoveryTime).toFixed(1) + 's';

        document.getElementById('flat-data-loss').textContent = flatAvgs.dataLoss.toFixed(1) + '%';
        document.getElementById('fed-data-loss').textContent = fedAvgs.dataLoss.toFixed(1) + '%';
        document.getElementById('data-loss-diff').textContent = (fedAvgs.dataLoss - flatAvgs.dataLoss).toFixed(1) + '%';

        document.getElementById('flat-resilience').textContent = flatAvgs.resilience.toFixed(1) + '%';
        document.getElementById('fed-resilience').textContent = fedAvgs.resilience.toFixed(1) + '%';
        document.getElementById('resilience-diff').textContent = (fedAvgs.resilience - flatAvgs.resilience).toFixed(1) + '%';

        document.getElementById('flat-cooperation').textContent = flatAvgs.cooperation.toFixed(0);
        document.getElementById('fed-cooperation').textContent = fedAvgs.cooperation.toFixed(0);
        document.getElementById('cooperation-diff').textContent = (fedAvgs.cooperation - flatAvgs.cooperation).toFixed(0);
    }

    calculateAverage(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((sum, val) => sum + val, 0) / arr.length;
    }

    exportMetrics() {
        const data = {
            simulationConfig: this.currentConfig,
            timedSimulation: {
                duration: this.timedSimulation.duration / 60000, // Convert back to minutes
                floodFrequency: this.timedSimulation.floodFrequency,
                floodsTriggered: this.timedSimulation.floodsTriggered
            },
            metrics: {
                flat: this.metricsCollector.flat,
                federated: this.metricsCollector.federated
            },
            summary: {
                flat: {
                    deliveryRatio: this.calculateAverage(this.metricsCollector.flat.deliveryRatio),
                    latency: this.calculateAverage(this.metricsCollector.flat.latency),
                    recoveryTime: this.calculateAverage(this.metricsCollector.flat.recoveryTime),
                    dataLoss: this.calculateAverage(this.metricsCollector.flat.dataLoss),
                    resilience: this.calculateAverage(this.metricsCollector.flat.resilience),
                    cooperation: this.calculateAverage(this.metricsCollector.flat.cooperation)
                },
                federated: {
                    deliveryRatio: this.calculateAverage(this.metricsCollector.federated.deliveryRatio),
                    latency: this.calculateAverage(this.metricsCollector.federated.latency),
                    recoveryTime: this.calculateAverage(this.metricsCollector.federated.recoveryTime),
                    dataLoss: this.calculateAverage(this.metricsCollector.federated.dataLoss),
                    resilience: this.calculateAverage(this.metricsCollector.federated.resilience),
                    cooperation: this.calculateAverage(this.metricsCollector.federated.cooperation)
                }
            },
            exportTime: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `flood-watch-metrics-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.logMessage('📊 Metrics exported successfully', 'info');
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new FloodWatchApp();
});