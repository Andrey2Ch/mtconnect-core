"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const machines = [
    { name: 'DT-26', directUrl: 'http://192.168.1.90:8193', proxyUrl: 'http://127.0.0.1:5005' },
    { name: 'SR-10', directUrl: 'http://192.168.1.91:8193', proxyUrl: 'http://127.0.0.1:5004' },
    { name: 'SR-21', directUrl: 'http://192.168.1.199:8193', proxyUrl: 'http://127.0.0.1:5006' },
    { name: 'SR-23', directUrl: 'http://192.168.1.103:8193', proxyUrl: 'http://127.0.0.1:5007' },
    { name: 'SR-25', directUrl: 'http://192.168.1.104:8193', proxyUrl: 'http://127.0.0.1:5008' },
    { name: 'SR-26', directUrl: 'http://192.168.1.54:8193', proxyUrl: 'http://127.0.0.1:5002' },
    { name: 'XD-20', directUrl: 'http://192.168.1.105:8193', proxyUrl: 'http://127.0.0.1:5001' },
    { name: 'XD-38', directUrl: 'http://192.168.1.101:8193', proxyUrl: 'http://127.0.0.1:5003' },
];
async function checkEndpoint(url, endpoint) {
    const fullUrl = `${url}${endpoint}`;
    const startTime = Date.now();
    try {
        const response = await axios_1.default.get(fullUrl, {
            timeout: 5000,
            headers: { 'Accept': 'application/xml' }
        });
        const responseTime = Date.now() - startTime;
        return { success: true, responseTime };
    }
    catch (error) {
        const responseTime = Date.now() - startTime;
        return {
            success: false,
            error: error.code || error.message,
            responseTime
        };
    }
}
async function checkMachine(machine) {
    console.log(`\n=== ${machine.name} ===`);
    // Проверяем прямое подключение
    console.log(`Direct (${machine.directUrl}):`);
    const directProbe = await checkEndpoint(machine.directUrl, '/probe');
    const directCurrent = await checkEndpoint(machine.directUrl, '/current');
    console.log(`  /probe:   ${directProbe.success ? '✓' : '✗'} ${directProbe.responseTime}ms ${directProbe.error || ''}`);
    console.log(`  /current: ${directCurrent.success ? '✓' : '✗'} ${directCurrent.responseTime}ms ${directCurrent.error || ''}`);
    // Проверяем через прокси
    console.log(`Proxy (${machine.proxyUrl}):`);
    const proxyProbe = await checkEndpoint(machine.proxyUrl, '/probe');
    const proxyCurrent = await checkEndpoint(machine.proxyUrl, '/current');
    console.log(`  /probe:   ${proxyProbe.success ? '✓' : '✗'} ${proxyProbe.responseTime}ms ${proxyProbe.error || ''}`);
    console.log(`  /current: ${proxyCurrent.success ? '✓' : '✗'} ${proxyCurrent.responseTime}ms ${proxyCurrent.error || ''}`);
}
async function main() {
    console.log('MTConnect Connectivity Checker');
    console.log('==============================');
    for (const machine of machines) {
        await checkMachine(machine);
    }
    console.log('\nТест завершен!');
}
main().catch(console.error);
