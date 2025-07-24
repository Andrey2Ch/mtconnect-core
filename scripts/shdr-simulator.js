const net = require('net');

// Конфигурация FANUC машин
const MACHINES = [
    { id: 'M_1_XD-20', name: 'XD-20', port: 7701 },
    { id: 'M_2_SR_26', name: 'SR-26', port: 7702 },
    { id: 'M_3_XD_38', name: 'XD-38', port: 7703 },
    { id: 'M_4_SR_10', name: 'SR-10', port: 7704 },
    { id: 'M_5_DT_26', name: 'DT-26', port: 7705 },
    { id: 'M_6_SR_21', name: 'SR-21', port: 7706 },
    { id: 'M_7_SR_23', name: 'SR-23', port: 7707 },
    { id: 'M_8_SR_25', name: 'SR-25', port: 7708 }
];

// Состояние машин (симулированное)
const machineStates = new Map();

// Инициализация состояний
MACHINES.forEach(machine => {
    machineStates.set(machine.id, {
        partCount: Math.floor(Math.random() * 100) + 50,
        program: `O${Math.floor(Math.random() * 9999) + 1000}`,
        execution: Math.random() > 0.3 ? 'ACTIVE' : 'READY',
        availability: 'AVAILABLE'
    });
});

// Генерация SHDR данных
function generateSHDRData(machineId) {
    const state = machineStates.get(machineId);
    const timestamp = new Date().toISOString();
    
    // Обновляем состояние
    if (Math.random() > 0.8 && state.execution === 'ACTIVE') {
        state.partCount++;
    }
    if (Math.random() > 0.9) {
        state.execution = state.execution === 'ACTIVE' ? 'READY' : 'ACTIVE';
    }
    
    // Формируем SHDR строки
    const lines = [
        `${timestamp}|${machineId}|avail|${state.availability}`,
        `${timestamp}|${machineId}|execution|${state.execution}`,
        `${timestamp}|${machineId}|program|${state.program}`,
        `${timestamp}|${machineId}|partCount|${state.partCount}`
    ];
    
    return lines.join('\n') + '\n';
}

// Создание SHDR серверов
const servers = [];

MACHINES.forEach(machine => {
    const server = net.createServer((socket) => {
        console.log(`✅ SHDR подключение к ${machine.name} (порт ${machine.port})`);
        
        // Отправляем начальные данные
        socket.write(generateSHDRData(machine.id));
        
        // Периодически отправляем обновления
        const interval = setInterval(() => {
            if (!socket.destroyed) {
                socket.write(generateSHDRData(machine.id));
            }
        }, 2000); // каждые 2 секунды
        
        socket.on('close', () => {
            console.log(`🔌 SHDR отключение от ${machine.name}`);
            clearInterval(interval);
        });
        
        socket.on('error', (err) => {
            console.log(`❌ SHDR ошибка ${machine.name}: ${err.message}`);
            clearInterval(interval);
        });
    });
    
    server.listen(machine.port, 'localhost', () => {
        console.log(`🚀 SHDR симулятор ${machine.name} запущен на порту ${machine.port}`);
    });
    
    servers.push(server);
});

console.log('\n🎯 FANUC SHDR Симулятор запущен!');
console.log('📊 Генерирую данные для 8 машин на портах 7701-7708');
console.log('🔄 Данные обновляются каждые 2 секунды');
console.log('\n💡 Для остановки нажмите Ctrl+C\n');

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n⏹️ Останавливаю симулятор...');
    servers.forEach(server => server.close());
    process.exit(0);
}); 