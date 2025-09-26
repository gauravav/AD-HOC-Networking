# 🎨 User Interface Guide

[![Overview](https://img.shields.io/badge/📖_Overview-Project_Summary-blue)](./OVERVIEW.md)
[![Documentation](https://img.shields.io/badge/📚_Documentation-Technical_Details-green)](./README.md)
[![UI Guide](https://img.shields.io/badge/🎨_UI_Guide-Interface_Tour-purple)](./UI-GUIDE.md)
[![Quick Start](https://img.shields.io/badge/🚀_Quick_Start-Get_Running-orange)](./README.md#-quick-start)

---

## 📑 Interface Navigation

| Section | Description | Quick Jump |
|---------|-------------|------------|
| [**🎮 Control Panel**](#-simulation-control-panel) | Start, stop, and configure simulations | [View ↓](#-simulation-control-panel) |
| [**📊 Status Dashboard**](#-system-status-dashboard) | Real-time system metrics and indicators | [View ↓](#-system-status-dashboard) |
| [**🗺️ Network Grid**](#️-interactive-network-grid) | Visual sensor network with live updates | [View ↓](#️-interactive-network-grid) |
| [**📈 Metrics Panel**](#-performance-metrics-panel) | Charts and performance indicators | [View ↓](#-performance-metrics-panel) |
| [**🚨 Incidents**](#-incident-management-panel) | Active flood events and alerts | [View ↓](#-incident-management-panel) |
| [**🏥 Health Monitor**](#-network-health-panel) | Node status and network diagnostics | [View ↓](#-network-health-panel) |
| [**📝 Activity Log**](#-simulation-log-panel) | Real-time event logging and debugging | [View ↓](#-simulation-log-panel) |

---

## 🎮 Simulation Control Panel

The primary control interface for managing your flood watch simulation.

### **Simulation Controls**

<img src="https://via.placeholder.com/800x200/667eea/ffffff?text=Simulation+Controls+Panel" alt="Simulation Controls" />

```
┌─────────────────────────────────────────────────────────────────┐
│ 🎮 Simulation Controls                                          │
├─────────────────────────────────────────────────────────────────┤
│ ▶️ Start Simulation    ⏹️ Stop Simulation    🔄 Reset          │
└─────────────────────────────────────────────────────────────────┘
```

| Button | Function | State | Description |
|--------|----------|-------|-------------|
| **▶️ Start** | Launch simulation | Disabled when running | Initializes network and begins tick-based simulation |
| **⏹️ Stop** | Halt simulation | Disabled when stopped | Pauses all agents and message processing |
| **🔄 Reset** | Clear all data | Always enabled | Resets metrics, logs, and network state |

### **Configuration Parameters**

<img src="https://via.placeholder.com/800x300/2ecc71/ffffff?text=Parameter+Configuration+Panel" alt="Configuration Panel" />

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚙️ Parameters                                                   │
├─────────────────────────────────────────────────────────────────┤
│ Grid Size:     [50] (10-100)                                   │
│ Sensor Count:  [100] (10-500)                                  │
│ Relay Ratio:   [0.2] (10%-50%)                                 │
│ Speed (ms):    [1000] (100-5000)                               │
└─────────────────────────────────────────────────────────────────┘
```

| Parameter | Range | Default | Impact |
|-----------|-------|---------|--------|
| **Grid Size** | 10-100 | 50 | Larger grids = more realistic spacing, longer paths |
| **Sensor Count** | 10-500 | 100 | More sensors = higher redundancy, more messages |
| **Relay Ratio** | 0.1-0.5 | 0.2 | Higher ratio = better routing, higher power consumption |
| **Speed (ms)** | 100-5000 | 1000 | Lower values = faster simulation, higher CPU usage |

> 🔧 **Configuration Tips**:
> - Start with defaults for initial testing
> - Increase sensor count to test scalability
> - Adjust speed based on your hardware performance

### **Event Triggers**

<img src="https://via.placeholder.com/800x200/e74c3c/ffffff?text=Event+Trigger+Panel" alt="Event Triggers" />

```
┌─────────────────────────────────────────────────────────────────┐
│ 🌊 Events                                                       │
├─────────────────────────────────────────────────────────────────┤
│ 🌊 Trigger Flood    ⚠️ Fail Random Node    📡 Fail Gateway    │
└─────────────────────────────────────────────────────────────────┘
```

| Event | Purpose | Usage | Effect |
|-------|---------|-------|--------|
| **🌊 Trigger Flood** | Simulate water detection | Click grid or use coordinates | Creates flood alerts and message propagation |
| **⚠️ Fail Node** | Test network resilience | Instant random failure | Removes node from network, tests routing |
| **📡 Fail Gateway** | Simulate infrastructure damage | Random gateway disconnection | Forces message rerouting |

---

## 📊 System Status Dashboard

Real-time overview of simulation health and performance.

### **Status Indicators**

<img src="https://via.placeholder.com/800x250/3498db/ffffff?text=System+Status+Dashboard" alt="Status Dashboard" />

```
┌─────────────────────────────────────────────────────────────────┐
│ 📊 System Status                                                │
├─────────────┬─────────────┬─────────────┬─────────────────────────┤
│ Simulation  │ Current     │ Active      │ Failed    │ Active      │
│ Running     │ Tick: 1247  │ Nodes: 95   │ Nodes: 5  │ Incidents:2 │
└─────────────┴─────────────┴─────────────┴───────────┴─────────────┘
```

| Indicator | Meaning | Color Coding | Interpretation |
|-----------|---------|--------------|----------------|
| **Simulation Status** | Current state | 🟢 Running / 🔴 Stopped | Overall system activity |
| **Current Tick** | Time progression | Blue counter | Simulation time advancement |
| **Active Nodes** | Healthy sensors | 🟢 Green when >80% | Network coverage quality |
| **Failed Nodes** | Broken sensors | 🔴 Red when >20% | Infrastructure damage level |
| **Active Incidents** | Ongoing floods | 🟡 Yellow alerts | Emergency response needed |
| **Messages Sent** | Communication volume | Blue counter | Network activity level |

### **Status Interpretation Guide**

```
🟢 HEALTHY:    >80% nodes active, <5% failures
🟡 DEGRADED:   60-80% nodes active, 5-20% failures
🔴 CRITICAL:   <60% nodes active, >20% failures
```

---

## 🗺️ Interactive Network Grid

The main visualization showing your sensor network in real-time.

### **Grid Overview**

<img src="https://via.placeholder.com/800x500/f8f9fa/333333?text=50x50+Network+Grid+Visualization" alt="Network Grid" />

```
Grid Layout (50x50):
┌─────────────────────────────────────────────────────────────────┐
│ 🗺️ Network Grid                                     [🔍+][🔍-] │
├─────────────────────────────────────────────────────────────────┤
│  ●●○  ●○●○  ●●   Legend: ● Active  ○ Failed  ◉ Gateway  ★ Relay │
│ ●○●●● ○●●○● ●○●                                                 │
│  ●●○● ●●●○  ●●   Click on grid to trigger flood events         │
│ ○●●●  ●○●●● ●●○                                                 │
│  ●●●○ ●●○●● ○●●  Zoom: Mouse wheel or +/- buttons              │
└─────────────────────────────────────────────────────────────────┘
```

### **Node Types & Visual Indicators**

| Symbol | Type | Description | Visual Properties |
|--------|------|-------------|-------------------|
| **●** | Active Sensor | Standard flood sensor | Green circle, 5-unit communication range |
| **◉** | Gateway Node | Internet connection | Green with orange border (3px) |
| **★** | Relay Node | Enhanced forwarding | Blue star, 8-unit communication range |
| **○** | Failed Node | Non-functional sensor | Red circle, no communication |
| **~** | Flood Area | Water detection zone | Purple gradient overlay |

### **Interactive Features**

#### **Click Actions**
```
Single Click:    Trigger flood at location
Double Click:    Show node details tooltip
Right Click:     Context menu (if enabled)
```

#### **View Modes**
<img src="https://via.placeholder.com/600x100/34495e/ffffff?text=View+Mode+Selector" alt="View Modes" />

| Mode | Purpose | Color Scheme | Use Case |
|------|---------|--------------|----------|
| **Status** | Node health | 🟢 Active, 🔴 Failed | Default monitoring |
| **Battery** | Power levels | 🟢 Full → 🔴 Empty | Power management |
| **Water** | Flood detection | 🔵 Dry → 🔴 Flooded | Emergency response |
| **Connectivity** | Network links | 🟢 Well-connected → 🔴 Isolated | Network topology |

#### **Zoom Controls**
```
┌─────────────────────────────────────────┐
│ 🔍+ Zoom In   🔍- Zoom Out   🏷️ Labels │
└─────────────────────────────────────────┘
```

| Control | Action | Keyboard | Effect |
|---------|--------|----------|--------|
| **🔍+** | Zoom In | `+` or mouse wheel up | Shows more detail, connection lines |
| **🔍-** | Zoom Out | `-` or mouse wheel down | Shows broader overview |
| **🏷️** | Toggle Labels | `L` key | Show/hide node IDs and values |

### **Grid Legend & Information**

<img src="https://via.placeholder.com/800x150/ecf0f1/2c3e50?text=Interactive+Grid+Legend" alt="Grid Legend" />

```
┌─────────────────────────────────────────────────────────────────┐
│ Legend:                                                         │
│ ● Active Sensor  ★ Active Relay  ○ Failed Node  ◉ Gateway     │
│ ~ Flood Area (Purple gradient shows water intensity)           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📈 Performance Metrics Panel

Real-time charts and key performance indicators.

### **Metrics Cards**

<img src="https://via.placeholder.com/800x200/667eea/ffffff?text=Performance+Metrics+Cards" alt="Metrics Cards" />

```
┌─────────────────────────────────────────────────────────────────┐
│ 📈 Performance Metrics                                          │
├─────────────┬─────────────┬─────────────┬─────────────────────────┤
│ Message     │ Network     │ Network     │ Network                 │
│ Delivery    │ Delay       │ Overhead    │ Resilience              │
│             │             │             │                         │
│    94%      │    3.2s     │    18%      │    87%                  │
│ Success Rate│ Avg Delay   │ Control Msg │ Health Score            │
└─────────────┴─────────────┴─────────────┴─────────────────────────┘
```

#### **Metric Definitions**

| Metric | Formula | Good Range | Warning Signs |
|--------|---------|------------|---------------|
| **Delivery Rate** | `(Delivered/Generated) × 100` | >90% | <80% indicates network issues |
| **Average Delay** | `Sum(HopCount × 100ms) / Messages` | <5 seconds | >10s suggests poor routing |
| **Network Overhead** | `(Control/Total Messages) × 100` | <20% | >30% indicates inefficiency |
| **Resilience Score** | `(Healthy×0.4 + Connected×0.4 + Power×0.2) × 100` | >80% | <60% needs attention |

### **Real-Time Charts**

<img src="https://via.placeholder.com/800x300/ffffff/333333?text=Real-Time+Performance+Charts" alt="Performance Charts" />

```
Performance Over Time:
┌─────────────────────────────────────────────────────────────────┐
│ 100% ┤                                                          │
│  90% ┤ ●●●●●●●●●●●●●●●●●●●●●●●●●●● Delivery Rate              │
│  80% ┤ ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ Resilience               │
│  70% ┤                                                          │
│  60% ┤                                                          │
│  50% ┤                                                          │
│  40% ┤ ■■■■■■■■■■■■■■■■■■■■■■■■■■■ Overhead                   │
│  30% ┤                                                          │
│  20% ┤                                                          │
│  10% ┤                                                          │
│   0% └──────────────────────────────────────────────────────────│
│      0    10   20   30   40   50   60   70   80   90   100     │
│                        Time (simulation ticks)                  │
└─────────────────────────────────────────────────────────────────┘
```

#### **Chart Legend**
- **● Green Line**: Message delivery success rate
- **▲ Blue Line**: Network resilience score
- **■ Red Line**: Network overhead percentage

---

## 🚨 Incident Management Panel

Track and manage active flood events in real-time.

### **Active Incidents Display**

<img src="https://via.placeholder.com/800x300/e74c3c/ffffff?text=Active+Flood+Incidents+Panel" alt="Incidents Panel" />

```
┌─────────────────────────────────────────────────────────────────┐
│ 🚨 Active Incidents                                             │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Incident INC-001                              [CRITICAL]    │ │
│ │ Location: (23, 34) | Sensors: 8 | Max Water: 3.2m         │ │
│ │ Duration: 47s                                               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Incident INC-002                              [HIGH]        │ │
│ │ Location: (12, 8) | Sensors: 3 | Max Water: 2.1m          │ │
│ │ Duration: 23s                                               │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### **Incident Details**

| Field | Description | Values | Color Coding |
|-------|-------------|--------|--------------|
| **Incident ID** | Unique identifier | INC-{timestamp}-{random} | Standard blue text |
| **Severity** | Threat level | CRITICAL, HIGH, MEDIUM, LOW | 🔴 Critical, 🟠 High, 🟡 Medium, 🟢 Low |
| **Location** | Flood epicenter | Grid coordinates (x, y) | Black coordinates |
| **Sensors** | Affected node count | Number of reporting sensors | Higher = wider impact |
| **Max Water** | Peak water level | Meters above normal | >3m critical, 2-3m high |
| **Duration** | Time since detection | Seconds/minutes active | Longer = sustained event |

### **Severity Classification Logic**

```javascript
// Automatic severity calculation
if (maxWaterLevel > 3.0 || sensorCount > 10) → CRITICAL
if (maxWaterLevel > 2.0 || sensorCount > 5)  → HIGH
if (maxWaterLevel > 1.5 || sensorCount > 2)  → MEDIUM
else                                          → LOW
```

---

## 🏥 Network Health Panel

Comprehensive monitoring of system health and diagnostics.

### **Health Summary**

<img src="https://via.placeholder.com/800x250/2ecc71/ffffff?text=Network+Health+Dashboard" alt="Health Panel" />

```
┌─────────────────────────────────────────────────────────────────┐
│ 🏥 Network Health                                               │
├─────────────────────────────────────────────────────────────────┤
│ Network Resilience: 87%                                         │
│ Total Nodes: 100        Active Nodes: 87                       │
│ Failed Nodes: 13        Low Battery: 5                         │
│ Connectivity Issues: 3                                          │
└─────────────────────────────────────────────────────────────────┘
```

### **Health Metrics Breakdown**

| Metric | Current | Threshold | Status | Action Needed |
|--------|---------|-----------|---------|---------------|
| **Network Resilience** | 87% | >80% Good | 🟢 Healthy | None |
| **Node Failures** | 13% | <20% OK | 🟡 Warning | Monitor trends |
| **Low Battery** | 5% | <10% OK | 🟢 Good | Routine maintenance |
| **Connectivity** | 3% isolated | <5% OK | 🟢 Good | Check isolated nodes |

### **Health Recommendations**

<img src="https://via.placeholder.com/800x200/f39c12/ffffff?text=System+Recommendations+Panel" alt="Recommendations" />

```
┌─────────────────────────────────────────────────────────────────┐
│ 💡 Recommendations                                              │
├─────────────────────────────────────────────────────────────────┤
│ 🔴 HIGH: 3 nodes are isolated. Check network topology.         │
│ 🟡 MED:  5 nodes have low battery. Schedule maintenance.       │
│ 🔵 INFO: System performance is within normal parameters.       │
└─────────────────────────────────────────────────────────────────┘
```

#### **Recommendation Types**

| Priority | Icon | When Triggered | Typical Actions |
|----------|------|----------------|-----------------|
| **🔴 HIGH** | Critical | >30% failures, major network partition | Immediate attention, deploy backup sensors |
| **🟡 MEDIUM** | Warning | 10-30% issues, degraded performance | Schedule maintenance, monitor closely |
| **🔵 INFO** | Informational | Normal operation, optimization opportunities | Continue monitoring, consider improvements |

---

## 📝 Simulation Log Panel

Real-time event logging and system debugging information.

### **Log Interface**

<img src="https://via.placeholder.com/800x300/2c3e50/ffffff?text=Real-Time+Simulation+Log+Panel" alt="Log Panel" />

```
┌─────────────────────────────────────────────────────────────────┐
│ 📝 Simulation Log                     [🗑️ Clear] [💾 Export]   │
│                                        ☑️ Auto-scroll           │
├─────────────────────────────────────────────────────────────────┤
│ [14:32:15] 🌊 Flood triggered at (25, 30) - 4 nodes affected   │
│ [14:32:16] 📡 Gateway connection lost at node RELAY-5          │
│ [14:32:17] ⚠️  Node SENSOR-23 failed at location (12, 8)       │
│ [14:32:18] 🔄 Messages rerouted through alternate path         │
│ [14:32:19] ✅ Alert delivered to gateway SENSOR-67             │
│ [14:32:20] 📊 Coordination agent removed 3 duplicate alerts   │
└─────────────────────────────────────────────────────────────────┘
```

### **Log Entry Types**

| Icon | Type | Color | Description | Example |
|------|------|-------|-------------|---------|
| **🌊** | Flood Event | Blue | Water level changes, flood detection | "Flood triggered at (25,30)" |
| **📡** | Gateway Event | Orange | Connection changes, failures | "Gateway connection lost" |
| **⚠️** | Node Failure | Red | Hardware failures, disconnections | "Node SENSOR-23 failed" |
| **🔄** | Network Event | Yellow | Routing changes, path updates | "Messages rerouted" |
| **✅** | Success | Green | Successful operations | "Alert delivered" |
| **📊** | Coordination | Purple | Agent actions, optimizations | "Duplicate alerts removed" |
| **🔧** | System | Gray | Internal operations, diagnostics | "Health check completed" |

### **Log Controls**

```
┌─────────────────────────────────────────────────────────────────┐
│ Log Controls:                                                   │
│ [🗑️ Clear] - Remove all log entries                            │
│ [💾 Export] - Save log to .txt file                            │
│ [☑️ Auto-scroll] - Follow latest entries                       │
└─────────────────────────────────────────────────────────────────┘
```

### **Log Filtering (Advanced)**

While not visible in the basic UI, logs can be filtered by:
- **Severity Level**: Info, Warning, Error, Critical
- **Event Type**: Network, Flood, System, Agent
- **Time Range**: Last minute, hour, or custom range
- **Node ID**: Specific sensor or relay events

---

## 🎯 Quick Actions & Shortcuts

### **Keyboard Shortcuts**

| Key | Action | Context | Description |
|-----|--------|---------|-------------|
| **Space** | Start/Stop | Global | Toggle simulation state |
| **R** | Reset | Global | Reset simulation data |
| **F** | Trigger Flood | Grid focused | Random flood event |
| **+/-** | Zoom In/Out | Grid focused | Adjust zoom level |
| **L** | Toggle Labels | Grid focused | Show/hide node labels |
| **C** | Clear Log | Log focused | Clear all log entries |
| **E** | Export | Any panel | Export current data |

### **Mouse Interactions**

#### **Grid Panel**
- **Click**: Trigger flood at location
- **Hover**: Show node tooltip
- **Wheel**: Zoom in/out
- **Drag**: Pan view (when zoomed)

#### **Charts & Metrics**
- **Hover**: Show precise values
- **Click**: Pause/resume updates (advanced)

### **Touch Support (Mobile/Tablet)**

| Gesture | Action | Panel | Description |
|---------|--------|-------|-------------|
| **Tap** | Trigger flood | Grid | Single finger tap |
| **Pinch** | Zoom | Grid | Two-finger pinch/spread |
| **Pan** | Move view | Grid | Drag with one finger |
| **Long Press** | Node details | Grid | Hold for tooltip |

---

## 🔧 Advanced UI Features

### **Customizable Views**

The interface supports several advanced customization options:

#### **Panel Layout**
- Drag panels to reorder (when enabled)
- Collapse panels to save screen space
- Full-screen mode for detailed analysis

#### **Data Export Options**
- **CSV**: Metrics data for spreadsheet analysis
- **JSON**: Complete simulation state
- **PNG**: Screenshots of visualizations
- **TXT**: Log files for debugging

### **Performance Optimization**

The UI automatically adjusts based on system performance:

| System Performance | UI Adjustments |
|-------------------|----------------|
| **High-end** | Full animations, 60fps updates, all features enabled |
| **Medium** | Reduced animations, 30fps updates, some effects disabled |
| **Low-end** | Minimal animations, 15fps updates, essential features only |

### **Accessibility Features**

- **High Contrast Mode**: Enhanced visibility for better readability
- **Keyboard Navigation**: Full interface control without mouse
- **Screen Reader Support**: ARIA labels and descriptions
- **Color Blind Friendly**: Alternative color schemes available

---

## 🎨 UI Color Scheme & Branding

### **Primary Color Palette**

| Color | Hex | Usage | Meaning |
|-------|-----|-------|---------|
| **Primary Blue** | `#3498db` | Headers, links, primary actions | Trust, reliability |
| **Success Green** | `#2ecc71` | Active nodes, success states | Health, functionality |
| **Warning Orange** | `#f39c12` | Alerts, gateways, attention | Caution, important |
| **Danger Red** | `#e74c3c` | Failures, critical alerts | Problems, urgency |
| **Info Purple** | `#9b59b6` | Flood areas, special events | Water, coordination |

### **Typography**

- **Headers**: `Segoe UI, sans-serif` - Clear, professional
- **Body Text**: `Segoe UI, Tahoma, Geneva` - Readable, cross-platform
- **Code/Logs**: `Consolas, Monaco, monospace` - Fixed-width, technical
- **Metrics**: `Impact, Arial Black` - Bold, attention-grabbing

### **Design Philosophy**

The UI follows modern design principles:
- **Glassmorphism**: Translucent panels with backdrop blur
- **Flat Design**: Minimal shadows and gradients
- **Responsive Layout**: Adapts to different screen sizes
- **Information Hierarchy**: Clear visual structure

---

## 📱 Responsive Design

The interface adapts to different screen sizes and devices:

### **Desktop (>1200px)**
- Full panel layout with all features visible
- Side-by-side metrics and controls
- Large grid with detailed visualization

### **Tablet (768px - 1200px)**
- Stacked panel layout
- Simplified controls
- Touch-optimized interactions

### **Mobile (<768px)**
- Single column layout
- Essential features only
- Touch-first navigation

---

**This comprehensive UI guide ensures users can effectively navigate and utilize all features of the Ad Hoc Flood Watch simulation platform.**

> 🎯 **Next Steps**: Ready to start using the interface? [Launch the simulation →](./README.md#-quick-start) or explore the [technical documentation →](./README.md#-core-implementation-details).