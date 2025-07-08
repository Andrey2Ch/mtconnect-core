import { AdamClient } from './AdamClient';
import { MockAdamServer } from './mock-adam-server';

/**
 * Интегрированный тест ADAM-6050 с Mock сервером
 * Запуск: npm run dev
 */
async function testWithMockServer() {
    console.log('🧪 Интегрированный тест ADAM-6050 с Mock сервером');
    
    // Создаем Mock сервер
    const mockServer = new MockAdamServer(502);
    let client: AdamClient | null = null;
    
    try {
        // Запускаем Mock сервер
        console.log('\n🔧 Запуск Mock сервера...');
        await mockServer.start();
        
        // Небольшая пауза для инициализации сервера
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Создаем клиент (подключаемся к localhost, где запущен Mock)
        console.log('\n📡 Создание ADAM клиента...');
        client = new AdamClient('127.0.0.1', 502);
        
        // Подключение
        console.log('\n📡 Попытка подключения к Mock серверу...');
        await client.connect();
        
        console.log('✅ Подключение успешно!');
        
        // Тест чтения каждые 3 секунды
        console.log('\n🔄 Начинаем циклическое чтение (каждые 3 секунды)');
        console.log('Для остановки нажмите Ctrl+C\n');
        
        let counter = 0;
        const interval = setInterval(async () => {
            try {
                counter++;
                console.log(`\n--- Чтение #${counter} ---`);
                
                                 if (!client) return;
                 
                 // Читаем Digital Inputs
                 const digitalInputs = await client.readDigitalInputs();
                 console.log('📥 Digital Inputs:', digitalInputs.map((val, idx) => `DI${idx}:${val ? '1' : '0'}`).join(' '));
                 
                 // Читаем Digital Outputs
                 const digitalOutputs = await client.readDigitalOutputs();
                 console.log('📤 Digital Outputs:', digitalOutputs.map((val, idx) => `DO${idx}:${val ? '1' : '0'}`).join(' '));
                 
                 // Показываем статистику Mock сервера
                 const mockState = mockServer.getState();
                 const activeInputs = mockState.digitalInputs.filter(Boolean).length;
                 const activeOutputs = mockState.digitalOutputs.filter(Boolean).length;
                 console.log(`📊 Mock статистика: ${activeInputs}/16 входов активны, ${activeOutputs}/16 выходов активны`);
                 
                 // Тест записи (каждые 5 чтений)
                 if (counter % 5 === 0) {
                     const testOutput = Math.floor(Math.random() * 16);
                     const testValue = Math.random() > 0.5;
                     console.log(`✏️ Тест записи: DO${testOutput} = ${testValue}`);
                     await client.writeDigitalOutput(testOutput, testValue);
                 }
                
                         } catch (error) {
                 console.error('❌ Ошибка при чтении:', error instanceof Error ? error.message : String(error));
             }
        }, 3000);
        
        // Graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n\n🛑 Получен сигнал остановки...');
            clearInterval(interval);
            
            if (client) {
                console.log('🔌 Отключение клиента...');
                await client.disconnect();
            }
            
            console.log('🔧 Остановка Mock сервера...');
            await mockServer.stop();
            
            console.log('✅ Тест завершен!');
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ Критическая ошибка:', error);
        
        // Cleanup
        if (client) {
            try {
                await client.disconnect();
            } catch (e) {
                console.error('Ошибка при отключении клиента:', e);
            }
        }
        
        try {
            await mockServer.stop();
        } catch (e) {
            console.error('Ошибка при остановке Mock сервера:', e);
        }
        
        process.exit(1);
    }
}

// Запуск если файл вызван напрямую
if (require.main === module) {
    testWithMockServer();
}

export { testWithMockServer }; 