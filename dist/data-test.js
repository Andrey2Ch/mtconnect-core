"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const data_collector_1 = require("./data-collector");
async function main() {
    console.log('🎯 FANUC Data Collection Test\n');
    const collector = new data_collector_1.DataCollector();
    try {
        await collector.testAllMachines();
        console.log('\n✅ Testing completed!');
    }
    catch (error) {
        console.error('❌ Testing failed:', error);
    }
}
main();
