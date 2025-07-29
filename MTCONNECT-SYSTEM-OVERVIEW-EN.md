# 🏭 MTConnect Industrial Data Collection System

## 📋 System Overview

The MTConnect system is a comprehensive solution for collecting, processing, and monitoring industrial equipment data in real-time. The system operates on an Edge-to-Cloud architecture, ensuring reliable local data collection and centralized cloud storage.

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLOUD PART (Railway)                     │
├─────────────────────────────────────────────────────────────┤
│  ☁️ Cloud API (NestJS)          📊 Dashboard               │
│  - Receive data from Edge       - Web monitoring interface │
│  - REST API endpoints           - Real-time updates        │
│  - Validation and logging       - Machine statistics       │
│                                                             │
│  🗄️ MongoDB Atlas                                          │
│  - Time series storage          - Indexes for fast         │
│  - Machine metadata             search                     │
│  - Operation history            - Auto scaling             │
└─────────────────────────────────────────────────────────────┘
                                │
                          HTTPS/Internet
                                │
┌─────────────────────────────────────────────────────────────┐
│                    LOCAL PART (Edge)                        │
├─────────────────────────────────────────────────────────────┤
│  🚀 Edge Gateway (Node.js/TypeScript)                      │
│  - Collect data from all sources                           │
│  - Aggregation and preprocessing                           │
│  - Send to cloud every 10 seconds                          │
│  - Local REST API (port 3555)                              │
│  - Local web dashboard                                      │
└─────────────────────────────────────────────────────────────┘
                    │                      │
              ┌─────────────┐        ┌─────────────┐
              │   FANUC     │        │    ADAM     │
              │  Machines   │        │  Counters   │
              └─────────────┘        └─────────────┘
```

## 🔧 System Components

### 1. 🏭 Industrial Equipment

#### FANUC CNC Machines (8 units)
- **M_1_XD-20** - Lathe XD-20
- **M_2_SR_26** - Milling machine SR-26  
- **M_3_XD_38** - Lathe XD-38
- **M_4_SR_10** - Milling machine SR-10
- **M_5_DT_26** - Drilling machine DT-26
- **M_6_SR_21** - Milling machine SR-21
- **M_7_SR_23** - Milling machine SR-23
- **M_8_SR_25** - Milling machine SR-25

**Collected Data:**
- Number of manufactured parts
- Currently running program number
- Execution status (ACTIVE/STOPPED/READY)
- Cycle time
- Connection status

#### ADAM-6050 Part Counters (10 units)
- **SR-22** - Line SR-22 counter
- **SB-16** - Line SB-16 counter
- **BT-38** - Line BT-38 counter
- **K-162** - Line K-162 counter
- **K-163** - Line K-163 counter
- **L-20** - Line L-20 counter
- **K-16** - Line K-16 counter
- **SR-20** - Line SR-20 counter
- **SR-32** - Line SR-32 counter
- **SR-24** - Line SR-24 counter

**Protocol:** Modbus TCP (192.168.1.120:502)
**Collected Data:**
- Part production counters
- Cycle time (for some lines)
- Connection status

### 2. 🖥️ Edge Gateway (Local Server)

**Technologies:** Node.js, TypeScript, Express.js
**Port:** 3555
**File:** `src/main.ts`

**Main Functions:**
- Collect data from FANUC adapters via SHDR protocol
- Read ADAM-6050 data via Modbus TCP
- Data aggregation and validation
- Send to cloud every 10 seconds
- Local REST API for monitoring
- Web dashboard for local viewing

**API Endpoints:**
- `GET /api/machines` - List of all machines with data
- `GET /dashboard-new.html` - Web interface

### 3. ☁️ Cloud API (Railway)

**Technologies:** NestJS, TypeScript, MongoDB
**URL:** https://mtconnect-core-production.up.railway.app
**Files:** `apps/cloud-api/`

**Main Functions:**
- Receive data from Edge Gateway
- Save to MongoDB Atlas
- REST API for client applications
- Data validation and logging
- Error handling and recovery

**API Endpoints:**
- `POST /api/ext/data` - Receive data from Edge Gateway
- `GET /api/dashboard/machines` - Get data for dashboard
- `GET /dashboard-new.html` - Web dashboard

### 4. 🗄️ Database (MongoDB Atlas)

**Collection:** `machinedatas`
**Document Structure:**
```json
{
  "timestamp": "2025-01-29T13:10:42.115Z",
  "metadata": {
    "edgeGatewayId": "ANDREY-PC-edge-gateway",
    "machineId": "M_2_SR_26",
    "machineName": "SR-26", 
    "machineType": "FANUC"
  },
  "data": {
    "partCount": 1999667,
    "program": "1244-01-1",
    "executionStatus": "ACTIVE",
    "cycleTime": 20.19,
    "cycleTimeConfidence": "HIGH"
  }
}
```

**Indexes:**
- `metadata.machineId` + `timestamp` (for fast latest data search)
- `metadata.edgeGatewayId` + `timestamp` (for Edge Gateway grouping)

### 5. 📊 Dashboard (Web Interface)

**Technologies:** HTML5, CSS3, JavaScript (Vanilla)
**File:** `apps/cloud-api/public/dashboard-new.html`

**Features:**
- Display all 18 machines in real-time
- Statistics: online/offline, total count
- Detailed information for each machine
- Auto-refresh every 5 seconds
- Responsive design for mobile devices

**Displayed Data:**
- Connection status (online/offline)
- Number of produced parts
- Currently running program number (FANUC)
- Execution status (ACTIVE/STOPPED/READY)
- Cycle time
- Last update timestamp

## 🚀 Launch System

### MTConnect-HTTPS-SILENT-Launcher.exe

**Created from:** `MTConnect-Launcher-Silent.ps1`
**Technology:** PowerShell → EXE (ps2exe)

**Automatic actions on startup:**
1. **Stop old processes**
   - Terminate FANUC adapters (fanuc_0id.exe, fanuc_18i.exe)
   - Terminate Edge Gateway (node.exe)
   - Free ports 7701-7708, 3555

2. **Start FANUC adapters in hidden mode**
   - M_1_XD-20: fanuc_0id.exe on port 7701
   - M_2_SR_26: fanuc_0id.exe on port 7702
   - M_3_XD_38: fanuc_0id.exe on port 7703
   - M_4_SR_10: fanuc_0id.exe on port 7704
   - M_5_DT_26: fanuc_0id.exe on port 7705
   - M_6_SR_21: fanuc_0id.exe on port 7706
   - M_7_SR_23: fanuc_18i.exe on port 7707
   - M_8_SR_25: fanuc_18i.exe on port 7708

3. **Start Edge Gateway**
   - Set environment variables:
     - `CLOUD_API_URL=https://mtconnect-core-production.up.railway.app`
     - `EDGE_GATEWAY_ID=COMPUTERNAME-edge-gateway`
   - Launch via `npx ts-node src/main.ts`
   - Completely hidden process (via VBScript)

4. **System verification**
   - Check ports 7701-7708 (FANUC adapters)
   - Check port 3555 (Edge Gateway)
   - Startup status report

5. **Automatic dashboard opening**
   - Launch browser with http://localhost:3555/dashboard-new.html
   - Auto-close launcher window after 8 seconds

## 📈 Data Flow

```
FANUC Machines → SHDR → FANUC Adapters → Edge Gateway
      ↓                                      ↓
ADAM Counters → Modbus TCP → Edge Gateway    │
                                           ↓
                          HTTPS POST /api/ext/data
                                           ↓
                          Railway Cloud API
                                           ↓
                          MongoDB Atlas
                                           ↓
                       Dashboard (GET /api/dashboard/machines)
```

**Update Frequencies:**
- Edge Gateway → Cloud API: every 10 seconds
- Dashboard updates: every 5 seconds
- FANUC adapters: real-time mode
- ADAM counters: every 2 seconds

## 🌐 Available Interfaces

### Local (on Edge Gateway computer)
- **Dashboard:** http://localhost:3555/dashboard-new.html
- **API:** http://localhost:3555/api/machines

### Cloud (available everywhere)
- **Dashboard:** https://mtconnect-core-production.up.railway.app/dashboard-new.html
- **API:** https://mtconnect-core-production.up.railway.app/api/dashboard/machines

## 🔒 Security

- **HTTPS** for all cloud connections
- **Data validation** at all levels
- **Input sanitization**
- **Rate limiting** (Throttling)
- **Operation logging**
- **Process isolation** (each adapter separately)

## 📊 Performance

### Current Metrics
- **18 machines online** simultaneously
- **Processing ~180 data points** every 10 seconds
- **API response time:** < 200ms
- **Dashboard load time:** < 2 seconds
- **Data volume:** ~15KB every 10 seconds

### Scalability
- **Edge Gateway:** up to 50 machines per Gateway
- **Cloud API:** Railway auto-scaling
- **MongoDB Atlas:** up to terabytes of data
- **Dashboard:** supports up to 100 machines in interface

## 🛠️ Technical Requirements

### Local Computer (Edge Gateway)
- **OS:** Windows 10/11
- **Node.js:** version 18.x or higher
- **RAM:** minimum 4GB
- **Network:** access to machines and internet
- **Ports:** 3555, 7701-7708 must be free

### Network Requirements
- **FANUC machines:** TCP/IP connections on ports 8193
- **ADAM devices:** Modbus TCP 192.168.1.120:502
- **Internet:** HTTPS access to Railway and MongoDB Atlas

## 🔧 Installation and Setup

### 1. Quick Start
```cmd
# Simply run the EXE file
MTConnect-HTTPS-SILENT-Launcher.exe
```

### 2. Manual Start (for development)
```powershell
# Install dependencies
pnpm install

# Set environment variables
$env:CLOUD_API_URL = "https://mtconnect-core-production.up.railway.app"
$env:EDGE_GATEWAY_ID = "my-edge-gateway"

# Start Edge Gateway
npx ts-node src/main.ts
```

### 3. Railway Setup (for administrators)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Connect to project
railway login
railway link

# Deploy changes
git push origin main
```

## 📋 Monitoring and Diagnostics

### System Check
```powershell
# Check running processes
Get-Process -Name "node","fanuc_0id","fanuc_18i"

# Check occupied ports
Get-NetTCPConnection -LocalPort 3555,7701,7702,7703,7704,7705,7706,7707,7708 -State Listen

# Test API
Invoke-WebRequest -Uri "http://localhost:3555/api/machines"
```

### Logs and Debugging
- **Edge Gateway:** console logs during manual start
- **Cloud API:** logs available in Railway Dashboard
- **FANUC adapters:** hidden processes, logs in adapter files
- **MongoDB:** logs available in Atlas Dashboard

## 🎯 Key System Metrics

### Current Indicators (at startup)
- **Total machines:** 18
- **FANUC machines online:** 8/8 (100%)
- **ADAM counters online:** 10/10 (100%)
- **Total part count:** > 6 million
- **Most active machine:** M_2_SR_26 (1,999,667 parts)
- **Best cycle time machine:** M_4_SR_10 (20.19 sec/part)

### Typical Programs in Operation
- **1244-01-1** (SR-26) - Active program
- **1327-01** (SR-10) - Active program  
- **634-04** (DT-26) - Active program
- **1374-03** (XD-20) - Stopped program

## 🚀 System Development

### Implemented Features ✅
- Real-time data collection
- Cloud data storage
- Web monitoring interface
- Automatic system startup
- HTTPS security
- Scalable architecture

### Development Plans 🔮
- Alerts and failure notifications
- Historical reports and analytics
- Mobile application
- ERP system integration
- Predictive analytics
- Additional equipment types

## 📞 Support

The system is designed and configured for stable 24/7 operation.

**In case of problems:**
1. Check dashboard status
2. Restart MTConnect-HTTPS-SILENT-Launcher.exe
3. Check network connections
4. Contact technical administrator

---

*Documentation created: January 29, 2025*  
*System version: 1.3*  
*Status: Production, fully functional* 