# AD-HOC Flood Watch Simulation

A comprehensive real-time simulation of Ad-Hoc Wireless Sensor Networks for flood monitoring and emergency response. This system demonstrates two distinct network architectures: **Flat Organization** and **Federation Organization** with realistic flood-based connectivity degradation and intelligent message routing.

## 🚀 NEW: Fast-Forward Research Capabilities
- **⚡ 12x Speed Simulation**: Experience 2+ hours of network behavior in 10 real-world minutes
- **📊 Comprehensive Metrics**: Objective comparison of flat vs federated architectures
- **🔬 Research-Ready Data**: Export detailed performance metrics for academic analysis
- **📈 Statistical Analysis**: Collect thousands of data points for robust research conclusions

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

### ⚡ Fast-Forward Simulation (NEW!)
Experience 2+ hours of simulation data in just 10 real-world minutes:

#### Quick Setup
1. **Start main simulation** first
2. **Configure Fast-Forward**:
   - **Real-World Duration**: 10 minutes (actual time you'll wait)
   - **Flood Frequency**: 10 floods/hour (simulated frequency)
3. **Preview shows**: 2.0 hours simulated time, 20 expected floods
4. **Click "Start Fast-Forward Simulation"**

#### Live Monitoring
- **Real Time Remaining**: Countdown of actual time (e.g., "8:45")
- **Simulated Time Elapsed**: Accelerated progress (e.g., "1h 35m")
- **Flood Counter**: Live count vs expected total
- **Speed**: 12x faster than real-time

#### Perfect For
- **Comprehensive Testing**: Collect extensive data quickly
- **Architecture Comparison**: Generate enough data for statistical analysis
- **Research**: Rapid simulation of long-term scenarios

### Manual Flood Creation
- **Flood Creation**: Click anywhere on the simulation canvas to create flood zones
- **Custom Parameters**: Set water level, radius, and spread duration
- **Gradual Spreading**: Realistic flood propagation from epicenter

### Interactive Features
- **Node Inspection**: Hover over sensors or gateways to see detailed status information
- **Real-time Monitoring**: Watch messages flow through the network in real-time
- **Architecture Comparison**: Side-by-side visualization of both network types

### Console Panels
- **Simulation Log**: Shows general simulation events and status updates
- **Central Server Console**: Displays messages received by the central server (separate for each architecture)
- **Incident Reports**: Lists all flood alerts and their severity levels (organized by architecture)
- **Metrics Comparison**: Real-time comparison table of key performance indicators

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
1. **Water Level Monitoring**: Sensors continuously measure water levels as flood spreads
2. **Detection Threshold**: Alerts triggered when water exceeds 1.0 meters
3. **Initial Alert**: First detection sends HIGH severity alert immediately to central server
4. **Continuous Reporting**: 10-second interval updates during active flooding with updated severity levels:
   - **LOW**: 1.0-1.5m water level
   - **MEDIUM**: 1.5-2.0m water level
   - **HIGH**: 2.0-3.0m water level
   - **CRITICAL**: 3.0m+ water level

### Gradual Flood Spreading Simulation
Floods spread realistically from epicenter to user-defined boundary:

#### Spreading Phases
- **Phase 1 - Spreading (60% of duration)**: Water expands from epicenter outward to boundary radius
  - Radius gradually increases from 0 to maximum boundary
  - Water level rises progressively as flood spreads
  - Sensors detect water only when spreading wave reaches their location

- **Phase 2 - Sustain (20% of duration)**: Full coverage at maximum water level
  - Flood covers entire boundary radius
  - Water level at maximum across all affected area

- **Phase 3 - Receding (20% of duration)**: Water level decreases
  - Coverage area remains constant at boundary radius
  - Water level gradually decreases to zero

#### Water Distribution
- **Epicenter**: Full water level intensity (100%)
- **Mid-radius**: Reduced intensity based on distance
- **Boundary Edge**: 60% of maximum water level
- **Minimum Detection**: 0.1m threshold for sensor activation

### Network Degradation & Sensor Failure
As flood waters rise, sensors experience progressive degradation and eventual failure:

#### Connectivity Degradation Levels
- **< 0.2m (Normal Operation)**:
  - 100% connectivity reliability
  - 100% communication range
  - Full sensor functionality
  - **Sensors operate normally and send data reliably**

- **0.2-0.5m (Light Water Exposure)**:
  - 95% connectivity reliability
  - 95% communication range
  - Minimal impact on operations
  - **Sensors continue sending data with slight reliability reduction**

- **0.5-1.0m (Early Flooding)**:
  - 80% connectivity reliability
  - 80% communication range
  - 10% chance of sensor failure
  - **Sensors may fail to send some messages, but mostly operational**

- **1.0-1.5m (Moderate Flooding)**:
  - 50% connectivity reliability
  - 60% communication range
  - 30% chance of sensor failure
  - **Significant data loss - only ~50% of messages reach central server**

- **1.5-2.5m (Major Flooding)**:
  - 20% connectivity reliability
  - 40% communication range
  - 60% chance of sensor failure
  - **Critical degradation - sensor likely fails, minimal data transmission**

- **≥ 2.5m (Catastrophic Flooding)**:
  - **Complete sensor failure**
  - **All communication ceases**
  - **Sensor cannot send any data**
  - **Physical hardware failure assumed**

#### When Sensors Fail
Sensors fail at different water levels based on probability:
- **First failures appear**: Around 0.5-1.0m (10% probability)
- **Most failures occur**: At 1.5-2.5m range (60% probability)
- **Guaranteed failure**: At or above 2.5m water level
- **Failed sensors**: Stop all communication, appear inactive in visualization

#### Automatic Recovery
When flood waters recede below critical levels:
- **Failed nodes automatically recover**: 80% chance of successful recovery when water drops below 0.2m
- **Recovery notifications**: System broadcasts recovery messages to network and central server
- **Full restoration**: Communication range and reliability return to normal levels
- **Network reformation**: Recovered nodes rejoin the network and reestablish neighbor connections

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

## 📈 Architecture Comparison & Metrics (NEW!)

### Comprehensive Metrics Collection
Real-time comparison between Flat and Federated architectures:

| Metric | Description | Flat Architecture | Federated Architecture |
|--------|-------------|-------------------|----------------------|
| **Delivery Ratio** | Message delivery success rate | Direct routing % | Via gateways % |
| **Latency (avg)** | Average message delivery time | Message routing time | Gateway forwarding time |
| **Failure Recovery Time** | Time to recover from failures | Message rerouting time | Gateway reconnection time |
| **Data Loss Rate** | Percentage of lost messages | Message drop rate | Lost during failover |
| **System Resilience** | Network recovery capability | Reroute success % | Sensor reconnect % |
| **Agentic Cooperation** | Inter-agent coordination | # agents helping reroute | Gateway sync + handoff |

### Automated Data Export
- **JSON Format**: Complete dataset with timestamps and configurations
- **Statistical Summary**: Averages and comparisons for research analysis
- **Real-time Collection**: Data gathered every 5 seconds during simulation
- **Export Button**: One-click download of comprehensive metrics

### Research-Ready Data
Perfect for academic research and performance analysis:
- **Objective Comparisons**: Quantitative data for both architectures
- **Statistical Significance**: Sufficient data points for meaningful analysis
- **Configurable Parameters**: Test different scenarios and conditions
- **Reproducible Results**: Complete configuration export for study replication

## 📈 Traditional Monitoring & Analysis

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

### 🔬 Research Applications (NEW!)
**Perfect for Academic Research and Publications:**

#### Architecture Performance Studies
- **Quantitative Comparison**: Generate statistically significant data comparing flat vs federated architectures
- **Scalability Analysis**: Test performance under different network sizes and conditions
- **Failure Recovery Research**: Study how different architectures handle node failures and network partitioning

#### Fast-Forward Simulation Benefits
- **Long-term Studies**: Simulate days/weeks of network operation in minutes
- **Data Collection**: Gather thousands of data points for robust statistical analysis
- **Reproducible Experiments**: Export complete configurations for peer review and replication

#### Sample Research Questions
- "How does network architecture affect flood detection latency in ad-hoc sensor networks?"
- "What is the optimal sensor density for reliable flood monitoring under different failure scenarios?"
- "How do gateway placement strategies impact overall network resilience?"

#### Exportable Research Data
- **Delivery ratios** for different flood intensities
- **Recovery time analysis** across architecture types
- **Network resilience metrics** under various failure scenarios
- **Cooperation patterns** between network agents

### Emergency Management
- **Early Warning Systems**: Rapid flood detection and alert distribution
- **Resource Allocation**: Optimal placement of emergency response resources
- **Evacuation Planning**: Data-driven evacuation route optimization

### Research & Education
- **Algorithm Testing**: Platform for testing new routing and communication algorithms
- **Network Analysis**: Study of wireless sensor network behavior under stress
- **Simulation Modeling**: Educational tool for understanding ad-hoc networks
- **Thesis Research**: Generate publication-ready data for graduate research

### Infrastructure Planning
- **Sensor Deployment**: Optimal sensor placement strategies
- **Network Design**: Communication infrastructure planning
- **Resilience Testing**: Network failure scenario analysis
- **Cost-Benefit Analysis**: Compare infrastructure costs vs performance benefits

---

**Note**: This simulation provides a realistic model of Ad-Hoc Wireless Sensor Networks but is designed for educational and research purposes. For production deployment, additional security, reliability, and performance considerations would be required.