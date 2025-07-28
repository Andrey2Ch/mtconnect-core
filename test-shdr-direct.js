// 🧪 ПРЯМОЙ ТЕСТ SHDR ПОДКЛЮЧЕНИЙ К FANUC АДАПТЕРАМ
const net = require('net');

const machines = [
    { id: 'M_1_XD-20', name: 'XD-20', port: 7701 },
    { id: 'M_2_SR_26', name: 'SR-26', port: 7702 }, 
    { id: 'M_3_XD_38', name: 'XD-38', port: 7703 },
    { id: 'M_4_SR_10', name: 'SR-10', port: 7704 },
    { id: 'M_5_DT_26', name: 'DT-26', port: 7705 },
    { id: 'M_6_SR_21', name: 'SR-21', port: 7706 },
    { id: 'M_7_SR_23', name: 'SR-23', port: 7707 },
    { id: 'M_8_SR_25', name: 'SR-25', port: 7708 }
];

function testSHDRConnection(machine) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(3000);
        
        let dataReceived = '';
        
        socket.on('connect', () => {
            console.log(`✅ ${machine.name}: ПОДКЛЮЧЕНО`);
        });
        
        socket.on('data', (chunk) => {
            dataReceived += chunk.toString();
            const lines = dataReceived.split('\n');
            
            // Ищем последнюю SHDR строку с данными
            for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i].trim();
                if (line.includes('|avail|') || line.includes('|part_count|')) {
                    const parts = line.split('|');
                    const data = {};
                    
                    for (let j = 1; j < parts.length; j += 2) {
                        if (j + 1 < parts.length) {
                            data[parts[j]] = parts[j + 1];
                        }
                    }
                    
                    console.log(`  📊 ${machine.name}:`);
                    console.log(`     Статус: ${data.avail || 'N/A'}`);
                    console.log(`     Детали: ${data.part_count || 'N/A'}`);
                    console.log(`     Программа: ${data.program || 'N/A'}`);
                    if (data.program_comment) {
                        console.log(`     Комментарий: ${data.program_comment}`);
                    }
                    
                    socket.destroy();
                    resolve({
                        machine: machine.name,
                        connected: true,
                        partCount: parseInt(data.part_count) || 0,
                        program: data.program || '',
                        availability: data.avail || 'UNAVAILABLE'
                    });
                    return;
                }
            }
        });
        
        socket.on('error', (error) => {
            console.log(`❌ ${machine.name}: ОШИБКА (${error.message})`);
            resolve({
                machine: machine.name,
                connected: false,
                error: error.message
            });
        });
        
        socket.on('timeout', () => {
            console.log(`⏰ ${machine.name}: ТАЙМАУТ`);
            socket.destroy();
            resolve({
                machine: machine.name,
                connected: false,
                error: 'timeout'
            });
        });
        
        socket.connect(machine.port, 'localhost');
    });
}

async function testAllMachines() {
    console.log('🚀 ПРЯМОЕ ТЕСТИРОВАНИЕ SHDR ПОДКЛЮЧЕНИЙ...\n');
    
    const results = [];
    
    for (const machine of machines) {
        const result = await testSHDRConnection(machine);
        results.push(result);
        console.log('');
    }
    
    // Сводка
    const connected = results.filter(r => r.connected);
    const totalParts = connected.reduce((sum, r) => sum + (r.partCount || 0), 0);
    
    console.log('📊 ИТОГО:');
    console.log(`   Машин всего: ${machines.length}`);
    console.log(`   Подключено: ${connected.length}`);
    console.log(`   Не подключено: ${machines.length - connected.length}`);
    if (totalParts > 0) {
        console.log(`   Общий объем: ${totalParts.toLocaleString()} деталей`);
    }
    
    console.log('\n✅ ПРОВЕРКА ЗАВЕРШЕНА!');
    return results;
}

if (require.main === module) {
    testAllMachines().catch(console.error);
} 