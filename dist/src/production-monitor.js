"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const machine_monitor_1 = __importDefault(require("./machine-monitor"));
async function main() {
    try {
        console.log('🚀 Запускаю систему мониторинга производства FANUC...\n');
        const monitor = new machine_monitor_1.default();
        await monitor.startMonitoring(5000, 2);
        process.on('SIGINT', () => {
            console.log('\n🛑 Получен сигнал завершения...');
            monitor.stopMonitoring();
            console.log('✅ Система мониторинга остановлена');
            process.exit(0);
        });
        process.on('SIGTERM', () => {
            console.log('\n🛑 Получен сигнал SIGTERM...');
            monitor.stopMonitoring();
            console.log('✅ Система мониторинга остановлена');
            process.exit(0);
        });
    }
    catch (error) {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    }
}
main().catch((error) => {
    console.error('❌ Ошибка запуска:', error);
    process.exit(1);
});
//# sourceMappingURL=production-monitor.js.map