import MachineMonitor from './machine-monitor';

async function main() {
    try {
        console.log('🚀 Запускаю систему мониторинга производства FANUC...\n');
        
        const monitor = new MachineMonitor();
        
        // Запускаем мониторинг на порту 5000 с интервалом 2 секунды
        await monitor.startMonitoring(5000, 2);
        
        // Обработка сигналов для корректного завершения
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
        
    } catch (error) {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    }
}

// Запускаем систему
main().catch((error) => {
    console.error('❌ Ошибка запуска:', error);
    process.exit(1);
}); 