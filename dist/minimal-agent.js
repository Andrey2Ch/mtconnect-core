"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path = __importStar(require("path"));
const app = (0, express_1.default)();
const port = 5000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.static('public'));
app.use(express_1.default.json());
// ПРОСТОЙ XML для тестирования
function generateSimpleXML() {
    const timestamp = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<MTConnectStreams xmlns="urn:mtconnect.org:MTConnectStreams:1.3">
    <Header creationTime="${timestamp}" sender="Minimal Agent" instanceId="1" version="1.3.0"/>
    <Streams>
        <ComponentStream component="TEST-01" name="Test Machine" componentId="TEST-01">
            <Events>
                <Availability dataItemId="avail_TEST-01" timestamp="${timestamp}">AVAILABLE</Availability>
            </Events>
            <Samples>
                <SpindleSpeed dataItemId="spindle_TEST-01" timestamp="${timestamp}">1500</SpindleSpeed>
            </Samples>
        </ComponentStream>
    </Streams>
</MTConnectStreams>`;
}
// API endpoints
app.get('/', (req, res) => {
    res.send(`
        <h1>🔧 МИНИМАЛЬНЫЙ АГЕНТ</h1>
        <p><strong>ТЕСТОВАЯ ВЕРСИЯ</strong></p>
        <ul>
            <li><a href="/current">📊 Current Data</a></li>
            <li><a href="/health">💚 Health</a></li>
            <li><a href="/real">🔥 Real Dashboard</a></li>
        </ul>
    `);
});
app.get('/current', (req, res) => {
    console.log('📊 /current запрошен');
    res.set('Content-Type', 'application/xml');
    const xml = generateSimpleXML();
    res.send(xml);
});
app.get('/health', (req, res) => {
    console.log('💚 /health запрошен');
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        agent: 'Minimal MTConnect Agent',
        machines: ['TEST-01']
    });
});
app.get('/real', (req, res) => {
    console.log('🔥 /real запрошен');
    res.sendFile(path.join(__dirname, '../public/real-dashboard.html'));
});
// Запуск
console.log('🚀 Запуск минимального агента...');
app.listen(port, () => {
    console.log('');
    console.log('✅ МИНИМАЛЬНЫЙ АГЕНТ РАБОТАЕТ!');
    console.log(`📡 Server: http://localhost:${port}`);
    console.log(`📊 Current: http://localhost:${port}/current`);
    console.log(`💚 Health: http://localhost:${port}/health`);
    console.log(`🔥 Real: http://localhost:${port}/real`);
    console.log('');
});
