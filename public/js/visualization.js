class GridVisualization {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 50;
        this.cellSize = 10;
        this.zoom = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.viewMode = 'status';
        this.showLabels = false;
        this.gridData = null;
        this.floodAreas = [];

        this.initializeCanvas();
        this.setupEventListeners();
    }

    initializeCanvas() {
        this.resizeCanvas();
        this.draw();
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.centerView();
    }

    centerView() {
        const totalGridWidth = this.gridSize * this.cellSize * this.zoom;
        const totalGridHeight = this.gridSize * this.cellSize * this.zoom;

        this.offsetX = (this.canvas.width - totalGridWidth) / 2;
        this.offsetY = (this.canvas.height - totalGridHeight) / 2;
    }

    setupEventListeners() {
        // Canvas click for flood triggering
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const gridPos = this.screenToGrid(x, y);
            if (gridPos.x >= 0 && gridPos.x < this.gridSize &&
                gridPos.y >= 0 && gridPos.y < this.gridSize) {
                this.onGridClick(gridPos.x, gridPos.y);
            }
        });

        // Mouse move for tooltips
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const gridPos = this.screenToGrid(x, y);
            this.showTooltip(gridPos, e);
        });

        // Zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => {
            this.zoom = Math.min(this.zoom * 1.2, 5);
            this.centerView();
            this.draw();
        });

        document.getElementById('zoom-out').addEventListener('click', () => {
            this.zoom = Math.max(this.zoom / 1.2, 0.5);
            this.centerView();
            this.draw();
        });

        // View mode selection
        document.getElementById('view-mode').addEventListener('change', (e) => {
            this.viewMode = e.target.value;
            this.draw();
        });

        // Labels toggle
        document.getElementById('toggle-labels').addEventListener('click', () => {
            this.showLabels = !this.showLabels;
            this.draw();
        });

        // Resize handler
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.draw();
        });
    }

    screenToGrid(screenX, screenY) {
        const gridX = Math.floor((screenX - this.offsetX) / (this.cellSize * this.zoom));
        const gridY = Math.floor((screenY - this.offsetY) / (this.cellSize * this.zoom));
        return { x: gridX, y: gridY };
    }

    gridToScreen(gridX, gridY) {
        const screenX = this.offsetX + (gridX * this.cellSize * this.zoom);
        const screenY = this.offsetY + (gridY * this.cellSize * this.zoom);
        return { x: screenX, y: screenY };
    }

    updateGrid(gridData) {
        this.gridData = gridData;
        this.draw();
    }

    addFloodArea(x, y, radius, intensity) {
        this.floodAreas.push({ x, y, radius, intensity, timestamp: Date.now() });

        // Remove old flood areas after 30 seconds
        setTimeout(() => {
            this.floodAreas = this.floodAreas.filter(flood =>
                Date.now() - flood.timestamp < 30000
            );
            this.draw();
        }, 30000);
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background grid
        this.drawBackgroundGrid();

        // Draw flood areas
        this.drawFloodAreas();

        // Draw nodes
        if (this.gridData) {
            this.drawNodes();
        }

        // Draw connections if zoomed in enough
        if (this.zoom > 2 && this.gridData) {
            this.drawConnections();
        }
    }

    drawBackgroundGrid() {
        this.ctx.strokeStyle = '#e9ecef';
        this.ctx.lineWidth = 0.5;

        const cellSize = this.cellSize * this.zoom;

        // Vertical lines
        for (let x = 0; x <= this.gridSize; x++) {
            const screenX = this.offsetX + (x * cellSize);
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, this.offsetY);
            this.ctx.lineTo(screenX, this.offsetY + (this.gridSize * cellSize));
            this.ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= this.gridSize; y++) {
            const screenY = this.offsetY + (y * cellSize);
            this.ctx.beginPath();
            this.ctx.moveTo(this.offsetX, screenY);
            this.ctx.lineTo(this.offsetX + (this.gridSize * cellSize), screenY);
            this.ctx.stroke();
        }
    }

    drawFloodAreas() {
        for (const flood of this.floodAreas) {
            const pos = this.gridToScreen(flood.x, flood.y);
            const radius = flood.radius * this.cellSize * this.zoom;

            // Create gradient for flood area
            const gradient = this.ctx.createRadialGradient(
                pos.x, pos.y, 0,
                pos.x, pos.y, radius
            );

            const alpha = Math.max(0.1, flood.intensity * 0.3);
            gradient.addColorStop(0, `rgba(155, 89, 182, ${alpha})`);
            gradient.addColorStop(1, 'rgba(155, 89, 182, 0.05)');

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
            this.ctx.fill();
        }
    }

    drawNodes() {
        const cellSize = this.cellSize * this.zoom;
        const nodeSize = Math.max(3, cellSize * 0.6);

        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                const node = this.gridData[x][y];
                if (!node) continue;

                const pos = this.gridToScreen(x, y);
                const centerX = pos.x + cellSize / 2;
                const centerY = pos.y + cellSize / 2;

                // Get node color based on view mode
                const color = this.getNodeColor(node);

                // Draw node
                this.ctx.fillStyle = color;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, nodeSize / 2, 0, 2 * Math.PI);
                this.ctx.fill();

                // Draw border for special nodes
                if (node.hasGateway) {
                    this.ctx.strokeStyle = '#f39c12';
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, nodeSize / 2 + 2, 0, 2 * Math.PI);
                    this.ctx.stroke();
                }

                if (node.type === 'relay') {
                    this.ctx.strokeStyle = '#2c3e50';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, nodeSize / 2 + 1, 0, 2 * Math.PI);
                    this.ctx.stroke();
                }

                // Draw labels if enabled and zoomed in
                if (this.showLabels && this.zoom > 1.5) {
                    this.drawNodeLabel(node, centerX, centerY + nodeSize / 2 + 10);
                }
            }
        }
    }

    drawConnections() {
        if (!this.gridData) return;

        this.ctx.strokeStyle = 'rgba(52, 152, 219, 0.3)';
        this.ctx.lineWidth = 1;

        const cellSize = this.cellSize * this.zoom;

        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                const node = this.gridData[x][y];
                if (!node || node.status !== 'active') continue;

                const pos1 = this.gridToScreen(x, y);
                const center1X = pos1.x + cellSize / 2;
                const center1Y = pos1.y + cellSize / 2;

                // Draw connections to nearby nodes (simplified)
                const range = node.type === 'relay' ? 8 : 5;

                for (let dx = -range; dx <= range; dx++) {
                    for (let dy = -range; dy <= range; dy++) {
                        if (dx === 0 && dy === 0) continue;

                        const nx = x + dx;
                        const ny = y + dy;

                        if (nx >= 0 && nx < this.gridSize &&
                            ny >= 0 && ny < this.gridSize) {

                            const neighbor = this.gridData[nx][ny];
                            if (neighbor && neighbor.status === 'active') {
                                const distance = Math.sqrt(dx * dx + dy * dy);
                                if (distance <= range) {
                                    const pos2 = this.gridToScreen(nx, ny);
                                    const center2X = pos2.x + cellSize / 2;
                                    const center2Y = pos2.y + cellSize / 2;

                                    this.ctx.beginPath();
                                    this.ctx.moveTo(center1X, center1Y);
                                    this.ctx.lineTo(center2X, center2Y);
                                    this.ctx.stroke();
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    getNodeColor(node) {
        switch (this.viewMode) {
            case 'status':
                if (node.status === 'failed') return '#e74c3c';
                return node.type === 'relay' ? '#3498db' : '#2ecc71';

            case 'battery':
                const batteryLevel = node.batteryLevel || 0;
                if (batteryLevel > 0.7) return '#2ecc71';
                if (batteryLevel > 0.4) return '#f39c12';
                if (batteryLevel > 0.2) return '#e67e22';
                return '#e74c3c';

            case 'water':
                const waterLevel = node.waterLevel || 0;
                if (waterLevel === 0) return '#ecf0f1';
                if (waterLevel < 1.0) return '#3498db';
                if (waterLevel < 2.0) return '#f39c12';
                if (waterLevel < 3.0) return '#e67e22';
                return '#e74c3c';

            case 'connectivity':
                const neighbors = node.neighbors || 0;
                if (neighbors >= 6) return '#2ecc71';
                if (neighbors >= 4) return '#f1c40f';
                if (neighbors >= 2) return '#e67e22';
                return '#e74c3c';

            default:
                return '#95a5a6';
        }
    }

    drawNodeLabel(node, x, y) {
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = `${Math.max(8, this.zoom * 6)}px Arial`;
        this.ctx.textAlign = 'center';

        let labelText = '';
        switch (this.viewMode) {
            case 'battery':
                labelText = `${Math.round((node.batteryLevel || 0) * 100)}%`;
                break;
            case 'water':
                labelText = `${(node.waterLevel || 0).toFixed(1)}m`;
                break;
            case 'connectivity':
                labelText = `${node.neighbors || 0}`;
                break;
            default:
                labelText = node.id.split('-')[1];
        }

        this.ctx.fillText(labelText, x, y);
    }

    showTooltip(gridPos, mouseEvent) {
        if (!this.gridData || gridPos.x < 0 || gridPos.x >= this.gridSize ||
            gridPos.y < 0 || gridPos.y >= this.gridSize) {
            this.hideTooltip();
            return;
        }

        const node = this.gridData[gridPos.x][gridPos.y];
        if (!node) {
            this.hideTooltip();
            return;
        }

        // Create or update tooltip
        let tooltip = document.getElementById('grid-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'grid-tooltip';
            tooltip.style.cssText = `
                position: absolute;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                pointer-events: none;
                z-index: 1000;
                max-width: 200px;
                white-space: nowrap;
            `;
            document.body.appendChild(tooltip);
        }

        tooltip.innerHTML = `
            <strong>${node.id}</strong><br>
            Type: ${node.type}<br>
            Status: ${node.status}<br>
            Battery: ${Math.round((node.batteryLevel || 0) * 100)}%<br>
            Water: ${(node.waterLevel || 0).toFixed(1)}m<br>
            Neighbors: ${node.neighbors || 0}<br>
            ${node.hasGateway ? 'Gateway: Yes' : ''}
        `;

        tooltip.style.left = mouseEvent.pageX + 10 + 'px';
        tooltip.style.top = mouseEvent.pageY + 10 + 'px';
        tooltip.style.display = 'block';
    }

    hideTooltip() {
        const tooltip = document.getElementById('grid-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    onGridClick(x, y) {
        // This will be set by the main app
        if (window.onGridClick) {
            window.onGridClick(x, y);
        }
    }
}

// Chart visualization for metrics
class MetricsChart {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.data = {
            deliveryRate: [],
            delay: [],
            overhead: [],
            resilience: []
        };
        this.maxDataPoints = 100;

        this.initializeChart();
    }

    initializeChart() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        this.draw();
    }

    addDataPoint(metrics) {
        this.data.deliveryRate.push(metrics.deliverySuccessRate || 0);
        this.data.delay.push(metrics.averageDelay || 0);
        this.data.overhead.push(metrics.networkOverhead || 0);
        this.data.resilience.push(metrics.networkResilience || 100);

        // Keep only last N data points
        Object.keys(this.data).forEach(key => {
            if (this.data[key].length > this.maxDataPoints) {
                this.data[key].shift();
            }
        });

        this.draw();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.data.deliveryRate.length === 0) return;

        const margin = 40;
        const chartWidth = this.canvas.width - 2 * margin;
        const chartHeight = this.canvas.height - 2 * margin;

        // Draw grid
        this.drawGrid(margin, chartWidth, chartHeight);

        // Draw lines
        this.drawLine(this.data.deliveryRate, '#2ecc71', margin, chartWidth, chartHeight, 100);
        this.drawLine(this.data.resilience, '#3498db', margin, chartWidth, chartHeight, 100);
        this.drawLine(this.data.overhead, '#e74c3c', margin, chartWidth, chartHeight, 100);

        // Draw legend
        this.drawLegend();
    }

    drawGrid(margin, width, height) {
        this.ctx.strokeStyle = '#e9ecef';
        this.ctx.lineWidth = 1;

        // Horizontal lines
        for (let i = 0; i <= 10; i++) {
            const y = margin + (height * i / 10);
            this.ctx.beginPath();
            this.ctx.moveTo(margin, y);
            this.ctx.lineTo(margin + width, y);
            this.ctx.stroke();
        }

        // Vertical lines
        for (let i = 0; i <= 10; i++) {
            const x = margin + (width * i / 10);
            this.ctx.beginPath();
            this.ctx.moveTo(x, margin);
            this.ctx.lineTo(x, margin + height);
            this.ctx.stroke();
        }

        // Y-axis labels
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'right';
        for (let i = 0; i <= 10; i++) {
            const y = margin + (height * i / 10);
            const value = 100 - (i * 10);
            this.ctx.fillText(value + '%', margin - 5, y + 4);
        }
    }

    drawLine(data, color, margin, width, height, maxValue) {
        if (data.length < 2) return;

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        for (let i = 0; i < data.length; i++) {
            const x = margin + (width * i / Math.max(data.length - 1, 1));
            const y = margin + height - (height * data[i] / maxValue);

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.stroke();
    }

    drawLegend() {
        const legends = [
            { label: 'Delivery Rate', color: '#2ecc71' },
            { label: 'Resilience', color: '#3498db' },
            { label: 'Overhead', color: '#e74c3c' }
        ];

        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';

        legends.forEach((legend, index) => {
            const x = 10;
            const y = 20 + (index * 20);

            this.ctx.fillStyle = legend.color;
            this.ctx.fillRect(x, y - 8, 12, 8);

            this.ctx.fillStyle = '#2c3e50';
            this.ctx.fillText(legend.label, x + 18, y);
        });
    }
}