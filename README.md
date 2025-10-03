# AD-HOC Flood Watch Simulation

A comprehensive real-time simulation of Ad-Hoc Wireless Sensor Networks for flood monitoring and emergency response. This system demonstrates two distinct network architectures: **Flat Organization** and **Federation Organization** with realistic flood-based connectivity degradation and intelligent message routing.

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation & Startup
1. **Clone and Navigate to Project**
   ```bash
   git clone <repository-url>
   cd "AD-HOC Flood Watch"
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start the Application**
   ```bash
   npm start
   ```

4. **Access the Application**
   - Open your web browser
   - Navigate to `http://localhost:3000`
   - The simulation interface will load automatically

## 🎯 How to Use the Interface

### Main Controls
1. **Start Simulation**: Click the "Start Simulation" button to begin the flood monitoring simulation
2. **Pause/Resume**: Use the "Pause" button to pause the simulation; click "Resume" to continue
3. **Reset**: Click "Reset" to clear all data and return to initial state

### Architecture Selection
- **Flat Organization**: Direct sensor-to-central-server communication with multi-hop routing
- **Federation Organization**: Hierarchical structure with gateways managing sensor clusters

### Interactive Features
- **Flood Creation**: Click anywhere on the simulation canvas to create flood zones
- **Node Inspection**: Hover over sensors or gateways to see detailed status information
- **Real-time Monitoring**: Watch messages flow through the network in real-time

### Console Panels
- **Simulation Log**: Shows general simulation events and status updates
- **Central Server Console**: Displays messages received by the central server
- **Incident Reports**: Lists all flood alerts and their severity levels

## 📊 What Happens During Simulation

### Initial Setup
1. **Sensor Deployment**: 20 sensors are randomly distributed across the simulation area
2. **Network Formation**: Sensors discover neighbors and establish communication links
3. **Gateway Placement** (Federation only): 4 gateways are strategically positioned

### Round-Robin Communication
- **Scheduled Data Transmission**: Each sensor takes turns sending data every second
- **Heartbeat Messages**: Regular HELLO messages maintain network topology
- **Battery Monitoring**: Continuous tracking of sensor power levels

### Flood Detection & Response
1. **Water Level Monitoring**: Sensors continuously measure water levels
2. **Threshold Detection**: Alerts triggered when water exceeds 1.0 meters
3. **Emergency Broadcasting**: Immediate alert transmission to central server
4. **Continuous Reporting**: 10-second interval updates during active flooding

### Network Degradation
As flood waters rise, the system realistically simulates connectivity degradation:

#### Sensor/Gateway Degradation Levels
- **0.2-0.5m (Light Exposure)**: 95% reliability, 95% communication range
- **0.5-1.0m (Early Flooding)**: 80% reliability, 80% range, 10% failure chance
- **1.0-1.5m (Moderate Flooding)**: 50% reliability, 60% range, 30% failure chance
- **1.5-2.5m (Major Flooding)**: 20% reliability, 40% range, 60% failure chance
- **2.5m+ (Catastrophic)**: Complete sensor failure

### Multi-Hop Routing (Flat Organization)
When direct connectivity fails:
1. **Intelligent Neighbor Selection**: Chooses best available neighbor based on:
   - Battery level
   - Central server connectivity
   - Communication reliability
2. **Loop Prevention**: Prevents infinite routing loops with hop count limits
3. **Route Optimization**: Finds shortest path to central server through available nodes

## 🏗️ Technical Architecture

### Core Components

#### Sensor Agents (`src/agents/sensorAgent.js`)
- **Location-based Communication**: 5-meter communication range
- **Battery Management**: Realistic power consumption and depletion
- **Flood Detection**: Water level monitoring with configurable thresholds
- **Message Routing**: Multi-hop routing with intelligent neighbor selection
- **Connectivity Simulation**: Flood-based degradation modeling

#### Gateway Agents (`src/agents/gatewayAgent.js`)
- **Cluster Management**: Manages groups of sensors in federation architecture
- **Message Aggregation**: Collects and forwards sensor data
- **Redundancy**: Multiple gateways provide network resilience
- **Load Balancing**: Distributes communication load across network

#### Central Server
- **Message Reception**: Receives all alerts and status updates
- **Data Aggregation**: Combines information from multiple sources
- **Incident Management**: Tracks and categorizes flood events
- **Real-time Display**: Live updates to web interface

### Network Architectures

#### Flat Organization
```
Sensors → Multi-hop Routing → Central Server
```
- **Direct Communication**: Sensors communicate directly with central server when possible
- **Multi-hop Fallback**: Automatic routing through neighbors when connectivity fails
- **Scalability**: Suitable for smaller networks with moderate complexity

#### Federation Organization
```
Sensors → Gateways → Central Server
```
- **Hierarchical Structure**: Sensors report to assigned gateways
- **Load Distribution**: Gateways manage communication load
- **Reliability**: Multiple gateways provide redundancy
- **Scalability**: Better suited for large-scale deployments

### Message Types

#### HELLO Messages
- **Purpose**: Neighbor discovery and network maintenance
- **Content**: Sensor ID, battery level, location, neighbor list
- **Frequency**: Round-robin scheduling (1 message per second across all sensors)

#### ALERT Messages
- **Purpose**: Flood detection and emergency reporting
- **Content**: Water level, location, severity (LOW/MEDIUM/HIGH/CRITICAL)
- **Priority**: Immediate transmission with multiple delivery attempts

#### ACK Messages
- **Purpose**: Acknowledge message receipt
- **Content**: Confirmation of successful delivery
- **Reliability**: Ensures critical messages are received

### Real-time Communication
- **WebSocket Protocol**: Socket.io for real-time client-server communication
- **Live Updates**: Instant visualization of network status and message flow
- **Responsive UI**: Real-time charts and status indicators

### Data Persistence
- **In-memory Storage**: Current simulation state maintained in server memory
- **Message Logging**: Complete audit trail of all network communications
- **Statistics Tracking**: Performance metrics and network health indicators

## 🔧 Advanced Features

### Intelligent Routing
- **Dynamic Path Selection**: Automatically finds best routes as network conditions change
- **Congestion Avoidance**: Balances load across available network paths
- **Failure Recovery**: Rapid adaptation to node failures and connectivity changes

### Realistic Simulation
- **Physics-based Flood Modeling**: Water propagation follows realistic patterns
- **Environmental Factors**: Battery drain, equipment failure, weather impact
- **Network Protocols**: Authentic wireless sensor network behavior

### Performance Optimization
- **Efficient Algorithms**: Optimized pathfinding and neighbor selection
- **Scalable Architecture**: Handles large networks with minimal performance impact
- **Resource Management**: Intelligent memory and CPU usage

## 📈 Monitoring & Analysis

### Real-time Metrics
- **Network Connectivity**: Live visualization of network topology
- **Message Throughput**: Real-time communication statistics
- **System Health**: Battery levels, active nodes, failed components

### Alert Management
- **Severity Classification**: Automatic categorization of flood alerts
- **Geographic Tracking**: Location-based incident mapping
- **Temporal Analysis**: Time-series flood progression monitoring

### Performance Analytics
- **Delivery Success Rate**: Message delivery statistics
- **Network Resilience**: Failure recovery performance
- **Resource Utilization**: Battery consumption and network efficiency

## 🛠️ Development & Customization

### Configuration Options
- **Network Parameters**: Sensor count, communication range, battery levels
- **Flood Thresholds**: Customizable water level triggers
- **Timing Settings**: Communication intervals and timeout values

### Extensibility
- **Modular Design**: Easy addition of new sensor types or communication protocols
- **Plugin Architecture**: Support for custom algorithms and visualizations
- **API Integration**: RESTful endpoints for external system integration

## 🎯 Use Cases

### Emergency Management
- **Early Warning Systems**: Rapid flood detection and alert distribution
- **Resource Allocation**: Optimal placement of emergency response resources
- **Evacuation Planning**: Data-driven evacuation route optimization

### Research & Education
- **Algorithm Testing**: Platform for testing new routing and communication algorithms
- **Network Analysis**: Study of wireless sensor network behavior under stress
- **Simulation Modeling**: Educational tool for understanding ad-hoc networks

### Infrastructure Planning
- **Sensor Deployment**: Optimal sensor placement strategies
- **Network Design**: Communication infrastructure planning
- **Resilience Testing**: Network failure scenario analysis

---

**Note**: This simulation provides a realistic model of Ad-Hoc Wireless Sensor Networks but is designed for educational and research purposes. For production deployment, additional security, reliability, and performance considerations would be required.