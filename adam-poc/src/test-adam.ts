import { AdamClient } from './AdamClient';

/**
 * Тестирование ADAM-6050 клиента
 * Запуск: npm run dev
 */
async function testAdamClient() {
    console.log('🧪 Тестирование ADAM-6050 клиента');
    
    // Создаем клиент (по умолчанию localhost для тестов)
    const client = new AdamClient('192.168.1.100', 502);
    
    try {
        // Подключение
        console.log('\n📡 Попытка подключения...');
        await client.connect();
        
        // Тест чтения каждые 2 секунды
        console.log('\n🔄 Начинаем циклическое чтение (каждые 2 секунды)');
        console.log('Для остановки нажмите Ctrl+C\n');
        
        let counter = 0;
        const interval = setInterval(async () => {
            try {
                counter++;
                console.log(`\n--- Чтение #${counter} ---`);
                
                // Читаем Digital Inputs
                const inputs = await client.readDigitalInputs();
                console.log('📥 Digital Inputs:', inputs.map((val, idx) => `DI${idx}:${val ? '1' : '0'}`).join(' '));
                
                // Читаем Digital Outputs  
                const outputs = await client.readDigitalOutputs();
                console.log('📤 Digital Outputs:', outputs.map((val, idx) => `DO${idx}:${val ? '1' : '0'}`).join(' '));
                
                console.log(`🔗 Статус подключения: ${client.isConnected ? '✅ Онлайн' : '❌ Оффлайн'}`);
                
            } catch (error) {
                console.error('❌ Ошибка чтения:', error);
            }
        }, 2000);
        
        // Graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n🛑 Получен сигнал остановки...');
            clearInterval(interval);
            await client.disconnect();
            console.log('👋 Тест завершен');
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ Ошибка подключения:', error);
        console.log('\n💡 Убедитесь что:');
        console.log('   • ADAM-6050 подключен к сети');
        console.log('   • IP адрес 192.168.1.100 доступен');
        console.log('   • Порт 502 открыт');
        console.log('   • Modbus TCP включен на устройстве');
        process.exit(1);
    }
}

// Запуск теста
testAdamClient(); 