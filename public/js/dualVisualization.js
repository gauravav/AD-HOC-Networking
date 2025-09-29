class DualGridVisualization {
    constructor(flatCanvasId, federationCanvasId) {
        this.flatCanvas = document.getElementById(flatCanvasId);
        this.federationCanvas = document.getElementById(federationCanvasId);

        this.flatCtx = this.flatCanvas.getContext('2d');
        this.federationCtx = this.federationCanvas.getContext('2d');

        // Configuration
        this.gridWidth = 25;
        this.gridHeight = 25;
        this.canvasWidth = 500;
        this.canvasHeight = 500;
        this.padding = 40; // Padding to ensure edge sensors are visible
        this.scale = 1.0;
        this.showLabels = false;
        this.flatViewMode = 'status';
        this.federationViewMode = 'status';

        // Data storage
        this.flatData = { sensors: [] };
        this.federationData = { sensors: [], gateways: [] };
        this.floodAreas = [];

        this.setupCanvases();
        this.setupEventListeners();
    }

    setupCanvases() {
        // Set canvas dimensions
        [this.flatCanvas, this.federationCanvas].forEach(canvas => {
            canvas.width = this.canvasWidth;
            canvas.height = this.canvasHeight;
            canvas.style.border = '2px solid #ddd';
            canvas.style.borderRadius = '8px';
        });

        this.draw();
    }

    setupEventListeners() {
        // Add click handlers for both canvases
        this.flatCanvas.addEventListener('click', (e) => {
            const coords = this.getClickCoordinates(e, this.flatCanvas);
            if (window.onGridClick) {
                window.onGridClick(coords.x, coords.y);
            }
        });

        this.federationCanvas.addEventListener('click', (e) => {
            const coords = this.getClickCoordinates(e, this.federationCanvas);
            if (window.onGridClick) {
                window.onGridClick(coords.x, coords.y);
            }
        });
    }

    getClickCoordinates(event, canvas) {
        const rect = canvas.getBoundingClientRect();
        const drawableWidth = this.canvasWidth - (2 * this.padding);
        const drawableHeight = this.canvasHeight - (2 * this.padding);

        const x = ((event.clientX - rect.left - this.padding) / drawableWidth) * this.gridWidth;
        const y = ((event.clientY - rect.top - this.padding) / drawableHeight) * this.gridHeight;
        return { x: Math.floor(Math.max(0, Math.min(this.gridWidth - 1, x))),
                 y: Math.floor(Math.max(0, Math.min(this.gridHeight - 1, y))) };
    }

    updateGrids(gridState) {
        if (gridState.flat) {
            this.flatData = gridState.flat;
        }
        if (gridState.federation) {
            this.federationData = gridState.federation;
        }
        this.draw();
    }

    draw() {
        this.drawFlatArchitecture();
        this.drawFederationArchitecture();
    }

    drawFlatArchitecture() {
        const ctx = this.flatCtx;
        ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Draw grid background
        this.drawGridBackground(ctx);

        // Draw flood areas
        this.drawFloodAreas(ctx);

        // Draw sensors
        if (this.flatData.sensors) {
            this.flatData.sensors.forEach(sensor => {
                this.drawSensor(ctx, sensor, 'flat');
            });
        }

        // Draw communication lines for flat (direct to server)
        this.drawFlatCommunicationLines(ctx);

        // Draw title
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('FLAT ARCHITECTURE', this.canvasWidth / 2, 20);
    }

    drawFederationArchitecture() {
        const ctx = this.federationCtx;
        ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Draw grid background
        this.drawGridBackground(ctx);

        // Draw flood areas
        this.drawFloodAreas(ctx);

        // Draw gateways first (so they appear behind connections)
        if (this.federationData.gateways) {
            this.federationData.gateways.forEach(gateway => {
                this.drawGateway(ctx, gateway);
            });
        }

        // Draw federation communication lines
        this.drawFederationCommunicationLines(ctx);

        // Draw sensors
        if (this.federationData.sensors) {
            this.federationData.sensors.forEach(sensor => {
                this.drawSensor(ctx, sensor, 'federation');
            });
        }

        // Draw title
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('FEDERATION ARCHITECTURE', this.canvasWidth / 2, 20);
    }

    drawGridBackground(ctx) {
        const drawableWidth = this.canvasWidth - (2 * this.padding);
        const drawableHeight = this.canvasHeight - (2 * this.padding);
        const cellWidth = drawableWidth / this.gridWidth;
        const cellHeight = drawableHeight / this.gridHeight;

        // Grid lines
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;

        for (let i = 0; i <= this.gridWidth; i++) {
            const x = this.padding + (i * cellWidth);
            ctx.beginPath();
            ctx.moveTo(x, this.padding);
            ctx.lineTo(x, this.canvasHeight - this.padding);
            ctx.stroke();
        }

        for (let i = 0; i <= this.gridHeight; i++) {
            const y = this.padding + (i * cellHeight);
            ctx.beginPath();
            ctx.moveTo(this.padding, y);
            ctx.lineTo(this.canvasWidth - this.padding, y);
            ctx.stroke();
        }
    }

    drawFloodAreas(ctx) {
        const drawableWidth = this.canvasWidth - (2 * this.padding);
        const drawableHeight = this.canvasHeight - (2 * this.padding);

        this.floodAreas.forEach(flood => {
            const x = this.padding + (flood.x / this.gridWidth) * drawableWidth;
            const y = this.padding + (flood.y / this.gridHeight) * drawableHeight;
            const radius = (flood.radius / this.gridWidth) * drawableWidth;

            ctx.fillStyle = `rgba(52, 152, 219, ${flood.intensity * 0.4})`;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.fill();

            // Flood border
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }

    drawSensor(ctx, sensor, architecture) {
        const drawableWidth = this.canvasWidth - (2 * this.padding);
        const drawableHeight = this.canvasHeight - (2 * this.padding);

        const x = this.padding + (sensor.location.x / this.gridWidth) * drawableWidth;
        const y = this.padding + (sensor.location.y / this.gridHeight) * drawableHeight;
        const radius = 8;

        // Sensor color based on status and view mode
        let color = this.getSensorColor(sensor, architecture);

        // Draw sensor circle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();

        // Sensor border
        ctx.strokeStyle = sensor.isActive ? '#2c3e50' : '#e74c3c';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Show assignment for federation
        if (architecture === 'federation' && sensor.assignedGateway) {
            ctx.fillStyle = '#f39c12';
            ctx.beginPath();
            ctx.arc(x - 6, y - 6, 3, 0, 2 * Math.PI);
            ctx.fill();
        }

        // Label
        if (this.showLabels) {
            ctx.fillStyle = '#2c3e50';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(sensor.id, x, y + 20);
        }
    }

    drawGateway(ctx, gateway) {
        const drawableWidth = this.canvasWidth - (2 * this.padding);
        const drawableHeight = this.canvasHeight - (2 * this.padding);

        const x = this.padding + (gateway.location.x / this.gridWidth) * drawableWidth;
        const y = this.padding + (gateway.location.y / this.gridHeight) * drawableHeight;
        const size = 12;

        // Get cluster color based on clusterId
        const clusterColor = this.getClusterColor(gateway.clusterId);

        // Gateway shape (diamond)
        ctx.fillStyle = gateway.isActive ? clusterColor : '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size, y);
        ctx.closePath();
        ctx.fill();

        // Gateway border (darker version of cluster color)
        ctx.strokeStyle = this.getDarkerClusterColor(gateway.clusterId);
        ctx.lineWidth = 3;
        ctx.stroke();

        // Gateway communication range
        if (this.federationViewMode === 'connectivity') {
            ctx.strokeStyle = 'rgba(243, 156, 18, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            const range = (gateway.communicationRange || 15) / this.gridWidth * drawableWidth;
            ctx.beginPath();
            ctx.arc(x, y, range, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Label
        if (this.showLabels) {
            ctx.fillStyle = '#2c3e50';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(gateway.id, x, y + 25);
            ctx.fillText(`${gateway.connectedSensors}`, x, y + 35);
        }
    }

    drawFlatCommunicationLines(ctx) {
        if (this.flatViewMode === 'connectivity') {
            this.drawServerConnections(ctx);
        } else if (this.flatViewMode === 'interconnected') {
            this.drawInterconnectedMesh(ctx);
        }
    }

    drawServerConnections(ctx) {
        const drawableWidth = this.canvasWidth - (2 * this.padding);
        const drawableHeight = this.canvasHeight - (2 * this.padding);

        // Draw lines from sensors to central server (off-screen)
        const serverX = this.canvasWidth + 20;
        const serverY = this.canvasHeight / 2;

        ctx.strokeStyle = 'rgba(46, 204, 113, 0.6)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);

        this.flatData.sensors?.forEach(sensor => {
            if (sensor.isActive) {
                const x = this.padding + (sensor.location.x / this.gridWidth) * drawableWidth;
                const y = this.padding + (sensor.location.y / this.gridHeight) * drawableHeight;

                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(serverX, serverY);
                ctx.stroke();
            }
        });

        ctx.setLineDash([]);

        // Draw central server indicator
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        ctx.arc(serverX, serverY, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#2c3e50';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('CS', serverX, serverY + 15);
    }

    drawInterconnectedMesh(ctx) {
        if (!this.flatData.sensors) return;

        const drawableWidth = this.canvasWidth - (2 * this.padding);
        const drawableHeight = this.canvasHeight - (2 * this.padding);
        const communicationRange = 10; // Default communication range

        ctx.strokeStyle = 'rgba(52, 152, 219, 0.4)';
        ctx.lineWidth = 1;

        // Draw connections between sensors within communication range
        for (let i = 0; i < this.flatData.sensors.length; i++) {
            const sensor1 = this.flatData.sensors[i];
            if (!sensor1.isActive) continue;

            const x1 = this.padding + (sensor1.location.x / this.gridWidth) * drawableWidth;
            const y1 = this.padding + (sensor1.location.y / this.gridHeight) * drawableHeight;

            // Check neighbors array if available, otherwise calculate distance
            if (sensor1.neighbors && sensor1.neighbors.length > 0) {
                sensor1.neighbors.forEach(neighborId => {
                    const neighbor = this.flatData.sensors.find(s => s.id === neighborId);
                    if (neighbor && neighbor.isActive) {
                        const x2 = this.padding + (neighbor.location.x / this.gridWidth) * drawableWidth;
                        const y2 = this.padding + (neighbor.location.y / this.gridHeight) * drawableHeight;

                        ctx.beginPath();
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(x2, y2);
                        ctx.stroke();
                    }
                });
            } else {
                // Fallback: calculate connections based on distance
                for (let j = i + 1; j < this.flatData.sensors.length; j++) {
                    const sensor2 = this.flatData.sensors[j];
                    if (!sensor2.isActive) continue;

                    const distance = Math.sqrt(
                        Math.pow(sensor1.location.x - sensor2.location.x, 2) +
                        Math.pow(sensor1.location.y - sensor2.location.y, 2)
                    );

                    if (distance <= communicationRange) {
                        const x2 = this.padding + (sensor2.location.x / this.gridWidth) * drawableWidth;
                        const y2 = this.padding + (sensor2.location.y / this.gridHeight) * drawableHeight;

                        ctx.beginPath();
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(x2, y2);
                        ctx.stroke();
                    }
                }
            }
        }

        // Draw communication range circles for active sensors
        ctx.strokeStyle = 'rgba(52, 152, 219, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);

        this.flatData.sensors?.forEach(sensor => {
            if (sensor.isActive) {
                const x = this.padding + (sensor.location.x / this.gridWidth) * drawableWidth;
                const y = this.padding + (sensor.location.y / this.gridHeight) * drawableHeight;
                const range = (communicationRange / this.gridWidth) * drawableWidth;

                ctx.beginPath();
                ctx.arc(x, y, range, 0, 2 * Math.PI);
                ctx.stroke();
            }
        });

        ctx.setLineDash([]);
    }

    drawFederationCommunicationLines(ctx) {
        if (this.federationViewMode !== 'connectivity') return;

        const drawableWidth = this.canvasWidth - (2 * this.padding);
        const drawableHeight = this.canvasHeight - (2 * this.padding);

        // Draw gateway cluster connections (5m range clustering)
        this.drawGatewayClusterConnections(ctx, drawableWidth, drawableHeight);

        // Draw lines from sensors to assigned gateways
        ctx.strokeStyle = 'rgba(52, 152, 219, 0.6)';
        ctx.lineWidth = 1;

        this.federationData.sensors?.forEach(sensor => {
            if (sensor.isActive && sensor.assignedGateway) {
                const gateway = this.federationData.gateways?.find(gw => gw.id === sensor.assignedGateway);
                if (gateway) {
                    const sensorX = this.padding + (sensor.location.x / this.gridWidth) * drawableWidth;
                    const sensorY = this.padding + (sensor.location.y / this.gridHeight) * drawableHeight;
                    const gatewayX = this.padding + (gateway.location.x / this.gridWidth) * drawableWidth;
                    const gatewayY = this.padding + (gateway.location.y / this.gridHeight) * drawableHeight;

                    ctx.beginPath();
                    ctx.moveTo(sensorX, sensorY);
                    ctx.lineTo(gatewayX, gatewayY);
                    ctx.stroke();
                }
            }
        });

        // Draw lines from gateways to central server
        const serverX = this.canvasWidth + 20;
        const serverY = this.canvasHeight / 2;

        ctx.strokeStyle = 'rgba(243, 156, 18, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        this.federationData.gateways?.forEach(gateway => {
            if (gateway.isActive) {
                const gatewayX = this.padding + (gateway.location.x / this.gridWidth) * drawableWidth;
                const gatewayY = this.padding + (gateway.location.y / this.gridHeight) * drawableHeight;

                ctx.beginPath();
                ctx.moveTo(gatewayX, gatewayY);
                ctx.lineTo(serverX, serverY);
                ctx.stroke();
            }
        });

        ctx.setLineDash([]);

        // Draw central server indicator
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.arc(serverX, serverY, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#2c3e50';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('CS', serverX, serverY + 18);
    }

    drawGatewayClusterConnections(ctx, drawableWidth, drawableHeight) {
        if (!this.federationData.gateways) return;

        const clusterRange = 5; // 5m clustering range
        const clusterRangePixels = (clusterRange / this.gridWidth) * drawableWidth;

        // Group gateways by cluster
        const clusters = {};
        this.federationData.gateways.forEach(gateway => {
            const clusterId = gateway.clusterId || 1;
            if (!clusters[clusterId]) {
                clusters[clusterId] = [];
            }
            clusters[clusterId].push(gateway);
        });

        // Draw connections within each cluster
        Object.values(clusters).forEach(clusterGateways => {
            if (clusterGateways.length < 2) return;

            const clusterColor = this.getClusterColor(clusterGateways[0].clusterId);
            ctx.strokeStyle = clusterColor + '80'; // Add transparency
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);

            // Connect all gateways in the cluster
            for (let i = 0; i < clusterGateways.length; i++) {
                for (let j = i + 1; j < clusterGateways.length; j++) {
                    const gw1 = clusterGateways[i];
                    const gw2 = clusterGateways[j];

                    const x1 = this.padding + (gw1.location.x / this.gridWidth) * drawableWidth;
                    const y1 = this.padding + (gw1.location.y / this.gridHeight) * drawableHeight;
                    const x2 = this.padding + (gw2.location.x / this.gridWidth) * drawableWidth;
                    const y2 = this.padding + (gw2.location.y / this.gridHeight) * drawableHeight;

                    // Only draw if within cluster range
                    const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                    if (distance <= clusterRangePixels * 1.5) { // Allow some tolerance
                        ctx.beginPath();
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(x2, y2);
                        ctx.stroke();
                    }
                }
            }

            ctx.setLineDash([]);
        });
    }

    getSensorColor(sensor, architecture) {
        const viewMode = architecture === 'flat' ? this.flatViewMode : this.federationViewMode;

        switch (viewMode) {
            case 'battery':
                const batteryHue = sensor.batteryLevel * 120; // Green to red
                return `hsl(${batteryHue}, 70%, 50%)`;
            case 'water':
                if (sensor.waterLevel > 2) return '#e74c3c';
                if (sensor.waterLevel > 1) return '#f39c12';
                if (sensor.waterLevel > 0.5) return '#f1c40f';
                return '#2ecc71';
            case 'connectivity':
            case 'interconnected':
                return sensor.isActive ? '#3498db' : '#e74c3c';
            default: // status
                return sensor.isActive ? '#2ecc71' : '#e74c3c';
        }
    }

    // Flood area management
    addFloodArea(x, y, radius, intensity, duration = 30000) {
        const floodId = `${x}-${y}`;
        this.floodAreas.push({ x, y, radius, intensity, timestamp: Date.now(), id: floodId, duration });

        setTimeout(() => {
            this.removeFloodArea(floodId);
        }, duration * 1.2);

        this.draw();
    }

    removeFloodArea(floodId) {
        this.floodAreas = this.floodAreas.filter(flood => flood.id !== floodId);
        this.draw();
    }

    updateFloodArea(x, y, radius, intensity) {
        const floodId = `${x}-${y}`;
        const existingFlood = this.floodAreas.find(flood => flood.id === floodId);

        if (existingFlood) {
            existingFlood.intensity = intensity;
        } else {
            this.addFloodArea(x, y, radius, intensity);
            return;
        }

        this.draw();
    }

    // Control methods
    setViewMode(mode, architecture = 'both') {
        if (architecture === 'flat' || architecture === 'both') {
            this.flatViewMode = mode;
        }
        if (architecture === 'federation' || architecture === 'both') {
            this.federationViewMode = mode;
        }
        this.draw();
    }

    toggleLabels() {
        this.showLabels = !this.showLabels;
        this.draw();
    }

    zoom(factor) {
        this.scale *= factor;
        this.draw();
    }

    // Cluster color management
    getClusterColor(clusterId) {
        const colors = [
            '#f39c12', // Orange
            '#3498db', // Blue
            '#e74c3c', // Red
            '#2ecc71', // Green
            '#9b59b6', // Purple
            '#1abc9c', // Turquoise
            '#f1c40f', // Yellow
            '#e67e22', // Dark Orange
        ];
        return colors[(clusterId - 1) % colors.length] || '#f39c12';
    }

    getDarkerClusterColor(clusterId) {
        const colors = [
            '#e67e22', // Darker Orange
            '#2980b9', // Darker Blue
            '#c0392b', // Darker Red
            '#27ae60', // Darker Green
            '#8e44ad', // Darker Purple
            '#16a085', // Darker Turquoise
            '#d4a300', // Darker Yellow
            '#d35400', // Darker Orange
        ];
        return colors[(clusterId - 1) % colors.length] || '#e67e22';
    }
}

// Export for use in other files
window.DualGridVisualization = DualGridVisualization;