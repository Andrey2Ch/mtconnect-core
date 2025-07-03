"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.machines = void 0;
exports.testMachine = testMachine;
const focas_client_1 = require("./focas-client");
const machines = [
    { name: 'DT-26', ip: '192.168.1.90', port: 8193 },
    { name: 'SR-10', ip: '192.168.1.91', port: 8193 },
    { name: 'SR-21', ip: '192.168.1.199', port: 8193 },
    { name: 'SR-23', ip: '192.168.1.103', port: 8193 },
    { name: 'SR-25', ip: '192.168.1.104', port: 8193 },
    { name: 'SR-26', ip: '192.168.1.54', port: 8193 },
    { name: 'XD-20', ip: '192.168.1.105', port: 8193 },
    { name: 'XD-38', ip: '192.168.1.101', port: 8193 }
];
exports.machines = machines;
async function testMachine(machine) {
    console.log(`\n=== Testing ${machine.name} (${machine.ip}:${machine.port}) ===`);
    const client = new focas_client_1.FocasClient();
    try {
        // Test basic TCP connection
        console.log('Testing TCP connection...');
        const tcpResult = await client.testConnection(machine.ip, machine.port);
        if (tcpResult.success) {
            console.log(`✓ TCP Connection successful (${tcpResult.time}ms)`);
            // Test FOCAS-style connection
            console.log('Testing FOCAS connection...');
            const focasResult = await focas_client_1.FocasApi.cnc_allclibhndl3(machine.ip, machine.port, 5000);
            if (focasResult.result === 0) {
                console.log(`✓ FOCAS Connection successful (handle: ${focasResult.handle})`);
                await focas_client_1.FocasApi.cnc_freelibhndl(focasResult.handle);
            }
            else {
                console.log(`✗ FOCAS Error: ${focasResult.result}`);
                console.log(`  Error codes: -15=PROTOCOL, -16=SOCKET, -8=TIMEOUT`);
            }
        }
        else {
            console.log(`✗ TCP Connection failed: ${tcpResult.error} (${tcpResult.time}ms)`);
        }
    }
    catch (error) {
        console.log(`✗ Exception: ${error.message}`);
    }
}
async function main() {
    console.log('🔧 Network Diagnostic Tool for Fanuc MTConnect/FOCAS');
    console.log('='.repeat(60));
    for (const machine of machines) {
        await testMachine(machine);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between tests
    }
    console.log('\n' + '='.repeat(60));
    console.log('📋 Summary:');
    console.log('- TCP success means the port is open');
    console.log('- FOCAS errors indicate protocol-level issues');
    console.log('- This test does NOT require Visual Factories to be running');
}
if (require.main === module) {
    main().catch(console.error);
}
