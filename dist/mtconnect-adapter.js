"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MTConnectAdapter = void 0;
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const focas_client_1 = require("./focas-client");
class MTConnectAdapter {
    constructor(port = 5000) {
        this.machines = new Map();
        this.app = (0, express_1.default)();
        this.focasClient = new focas_client_1.FocasClient();
        this.port = port;
        this.instanceId = Date.now();
        this.setupRoutes();
    }
    addMachine(config) {
        this.machines.set(config.id, config);
        console.log(`Added machine: ${config.name} (${config.ip}:${config.port})`);
    }
    setupRoutes() {
        // CORS middleware
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            next();
        });
        // Serve static files
        this.app.use(express_1.default.static('public'));
        // MTConnect probe endpoint
        this.app.get('/probe', (req, res) => {
            const probeResponse = this.generateProbeResponse();
            res.set('Content-Type', 'application/xml');
            res.send(probeResponse);
        });
        // MTConnect current endpoint  
        this.app.get('/current', async (req, res) => {
            const currentResponse = await this.generateCurrentResponse();
            res.set('Content-Type', 'application/xml');
            res.send(currentResponse);
        });
        // MTConnect sample endpoint
        this.app.get('/sample', async (req, res) => {
            const count = req.query.count ? parseInt(req.query.count) : 100;
            const from = req.query.from;
            const sampleResponse = await this.generateSampleResponse(count, from);
            res.set('Content-Type', 'application/xml');
            res.send(sampleResponse);
        });
        // Dashboard redirect (simulation)
        this.app.get('/dashboard', (req, res) => {
            console.log('📊 Dashboard requested');
            res.sendFile(path_1.default.join(__dirname, '../public/dashboard.html'));
        });
        // Real dashboard (actual MTConnect data)
        this.app.get('/real', (req, res) => {
            console.log('🎯 Real dashboard requested');
            res.sendFile(path_1.default.join(__dirname, '../public/real-dashboard.html'));
        });
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                machines: Array.from(this.machines.keys()),
                timestamp: new Date().toISOString()
            });
        });
    }
    generateProbeResponse() {
        const devices = Array.from(this.machines.values()).map(machine => this.createDeviceXml(machine));
        const probeXml = `<?xml version="1.0" encoding="UTF-8"?>
<MTConnectDevices xmlns="urn:mtconnect.org:MTConnectDevices:1.3">
  <Header creationTime="${new Date().toISOString()}" 
          sender="MTConnect-Local-Agent" 
          instanceId="${this.instanceId}" 
          version="1.3.0" />
  <Devices>
${devices.join('\n')}
  </Devices>
</MTConnectDevices>`;
        return probeXml;
    }
    async generateCurrentResponse() {
        const sequence = Date.now();
        const timestamp = new Date().toISOString();
        const deviceStreams = [];
        for (const [machineId, machine] of this.machines) {
            try {
                const deviceStream = await this.getMachineCurrentData(machine, sequence);
                deviceStreams.push(deviceStream);
            }
            catch (error) {
                console.error(`Failed to get data from ${machine.name}:`, error);
                deviceStreams.push(this.getUnavailableDeviceStream(machine, sequence));
            }
        }
        const currentXml = `<?xml version="1.0" encoding="UTF-8"?>
<MTConnectStreams xmlns="urn:mtconnect.org:MTConnectStreams:1.3">
  <Header creationTime="${timestamp}" 
          sender="MTConnect-Local-Agent" 
          instanceId="${this.instanceId}" 
          version="1.3.0" 
          nextSequence="${sequence + 1000}"
          firstSequence="${sequence}"
          lastSequence="${sequence + deviceStreams.length}" />
  <Streams>
${deviceStreams.join('\n')}
  </Streams>
</MTConnectStreams>`;
        return currentXml;
    }
    async generateSampleResponse(count, from) {
        // For now, return same as current - would implement historical data later
        return await this.generateCurrentResponse();
    }
    createDeviceXml(machine) {
        return `    <Device id="${machine.id}" name="${machine.name}" uuid="${machine.uuid}">
      <Description manufacturer="${machine.manufacturer}" model="${machine.model}" serialNumber="${machine.serial}" />
      <DataItems>
        <DataItem category="EVENT" id="${machine.id}_avail" name="avail" type="AVAILABILITY" />
        <DataItem category="EVENT" id="${machine.id}_estop" name="estop" type="EMERGENCY_STOP" />
        <DataItem category="EVENT" id="${machine.id}_mode" name="mode" type="CONTROLLER_MODE" />
      </DataItems>
      <Components>
        <Axes>
          <Linear id="${machine.id}_x" name="X">
            <DataItems>
              <DataItem category="SAMPLE" id="${machine.id}_xpos" type="POSITION" units="MILLIMETER" />
              <DataItem category="SAMPLE" id="${machine.id}_xload" type="LOAD" units="PERCENT" />
            </DataItems>
          </Linear>
          <Linear id="${machine.id}_y" name="Y">
            <DataItems>
              <DataItem category="SAMPLE" id="${machine.id}_ypos" type="POSITION" units="MILLIMETER" />
            </DataItems>
          </Linear>
          <Linear id="${machine.id}_z" name="Z">
            <DataItems>
              <DataItem category="SAMPLE" id="${machine.id}_zpos" type="POSITION" units="MILLIMETER" />
            </DataItems>
          </Linear>
        </Axes>
        <Spindle id="${machine.id}_spindle" name="Spindle">
          <DataItems>
            <DataItem category="SAMPLE" id="${machine.id}_sspeed" type="ROTARY_VELOCITY" units="REVOLUTION/MINUTE" />
            <DataItem category="SAMPLE" id="${machine.id}_sload" type="LOAD" units="PERCENT" />
          </DataItems>
        </Spindle>
      </Components>
    </Device>`;
    }
    async getMachineCurrentData(machine, sequence) {
        const timestamp = new Date().toISOString();
        try {
            const testResult = await this.focasClient.testConnection(machine.ip, machine.port);
            if (testResult.success) {
                // Machine is available - return sample data (would be real FOCAS data in production)
                return `    <DeviceStream name="${machine.name}" uuid="${machine.uuid}">
      <ComponentStream component="Device" name="${machine.name}" componentId="${machine.id}">
        <Samples>
          <Availability dataItemId="${machine.id}_avail" timestamp="${timestamp}" sequence="${sequence}">AVAILABLE</Availability>
        </Samples>
        <Events>
          <ControllerMode dataItemId="${machine.id}_mode" timestamp="${timestamp}" sequence="${sequence + 1}">AUTOMATIC</ControllerMode>
          <EmergencyStop dataItemId="${machine.id}_estop" timestamp="${timestamp}" sequence="${sequence + 2}">ARMED</EmergencyStop>
        </Events>
      </ComponentStream>
      <ComponentStream component="Linear" name="X" componentId="${machine.id}_x">
        <Samples>
          <Position dataItemId="${machine.id}_xpos" timestamp="${timestamp}" sequence="${sequence + 3}" units="MILLIMETER">${(Math.random() * 200 - 100).toFixed(3)}</Position>
          <Load dataItemId="${machine.id}_xload" timestamp="${timestamp}" sequence="${sequence + 4}" units="PERCENT">${(Math.random() * 100).toFixed(1)}</Load>
        </Samples>
      </ComponentStream>
      <ComponentStream component="Linear" name="Y" componentId="${machine.id}_y">
        <Samples>
          <Position dataItemId="${machine.id}_ypos" timestamp="${timestamp}" sequence="${sequence + 5}" units="MILLIMETER">${(Math.random() * 200 - 100).toFixed(3)}</Position>
        </Samples>
      </ComponentStream>
      <ComponentStream component="Linear" name="Z" componentId="${machine.id}_z">
        <Samples>
          <Position dataItemId="${machine.id}_zpos" timestamp="${timestamp}" sequence="${sequence + 6}" units="MILLIMETER">${(Math.random() * 100 - 50).toFixed(3)}</Position>
        </Samples>
      </ComponentStream>
      <ComponentStream component="Spindle" name="Spindle" componentId="${machine.id}_spindle">
        <Samples>
          <RotaryVelocity dataItemId="${machine.id}_sspeed" timestamp="${timestamp}" sequence="${sequence + 7}" units="REVOLUTION/MINUTE">${Math.floor(Math.random() * 3000 + 500)}</RotaryVelocity>
          <Load dataItemId="${machine.id}_sload" timestamp="${timestamp}" sequence="${sequence + 8}" units="PERCENT">${(Math.random() * 100).toFixed(1)}</Load>
        </Samples>
      </ComponentStream>
    </DeviceStream>`;
            }
            else {
                return this.getUnavailableDeviceStream(machine, sequence);
            }
        }
        catch (error) {
            return this.getUnavailableDeviceStream(machine, sequence);
        }
    }
    getUnavailableDeviceStream(machine, sequence) {
        const timestamp = new Date().toISOString();
        return `    <DeviceStream name="${machine.name}" uuid="${machine.uuid}">
      <ComponentStream component="Device" name="${machine.name}" componentId="${machine.id}">
        <Samples>
          <Availability dataItemId="${machine.id}_avail" timestamp="${timestamp}" sequence="${sequence}">UNAVAILABLE</Availability>
        </Samples>
      </ComponentStream>
    </DeviceStream>`;
    }
    start() {
        this.app.listen(this.port, () => {
            console.log(`🚀 MTConnect Local Agent running on port ${this.port}`);
            console.log(`📡 Probe: http://localhost:${this.port}/probe`);
            console.log(`📊 Current: http://localhost:${this.port}/current`);
            console.log(`❤️ Health: http://localhost:${this.port}/health`);
        });
    }
    stop() {
        console.log('Stopping MTConnect Local Agent...');
    }
}
exports.MTConnectAdapter = MTConnectAdapter;
