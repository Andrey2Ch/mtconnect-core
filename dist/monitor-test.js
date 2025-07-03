"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const machine_monitor_1 = require("./machine-monitor");
async function runMonitorDemo() {
    console.log('🚀 Starting FANUC Machine Monitor Demo\n');
    const monitor = new machine_monitor_1.MachineMonitor();
    // Add all 8 FANUC machines
    const machines = [
        { name: 'DT-26', ip: '192.168.1.90' },
        { name: 'SR-10', ip: '192.168.1.91' },
        { name: 'SR-21', ip: '192.168.1.199' },
        { name: 'SR-23', ip: '192.168.1.103' },
        { name: 'SR-25', ip: '192.168.1.104' },
        { name: 'SR-26', ip: '192.168.1.54' },
        { name: 'XD-20', ip: '192.168.1.105' },
        { name: 'XD-38', ip: '192.168.1.101' }
    ];
    machines.forEach(machine => {
        monitor.addMachine(machine.name, machine.ip, 8193);
    });
    console.log('\n🔍 Running initial network scan...\n');
    // Quick scan first
    await monitor.quickScan();
    console.log('\n🔄 Starting continuous monitoring...\n');
    // Add listener for status changes
    monitor.addListener((statuses) => {
        const online = statuses.filter(s => s.isOnline).length;
        const total = statuses.length;
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] Network Status: ${online}/${total} machines online`);
        // Show any status changes
        statuses.forEach(status => {
            if (status.isOnline && status.uptime === 1) {
                console.log(`  ✅ ${status.name} connected (${status.responseTime}ms)`);
            }
            else if (!status.isOnline && status.errorCount === 1) {
                console.log(`  ❌ ${status.name} disconnected`);
            }
        });
    });
    // Start monitoring every 5 seconds
    monitor.startMonitoring(5);
    // Generate detailed report every 30 seconds
    setInterval(() => {
        console.log('\n' + '='.repeat(50));
        console.log(monitor.generateReport());
        console.log('='.repeat(50) + '\n');
    }, 30000);
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down monitor...');
        monitor.stopMonitoring();
        process.exit(0);
    });
    console.log('📊 Monitor running! Press Ctrl+C to stop\n');
}
// Run demo
runMonitorDemo().catch(error => {
    console.error('❌ Monitor demo failed:', error);
    process.exit(1);
});
