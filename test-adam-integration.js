const { AdamReader } = require('./dist/adam-reader');

async function testAdamIntegration() {
  console.log('🚀 Тестирую интеграцию Adam-6050...');
  
  const adamReader = new AdamReader();
  
  try {
    // Проверяем подключение
    console.log('🔄 Проверяю подключение...');
    const isConnected = await adamReader.testConnection();
    
    if (!isConnected) {
      console.error('❌ Не удалось подключиться к Adam-6050');
      return;
    }
    
    console.log('✅ Подключение успешно!');
    
    // Читаем счётчики
    console.log('📊 Читаю счётчики станков...');
    const counters = await adamReader.readCounters();
    
    console.log('\n=== СЧЁТЧИКИ СТАНКОВ ===');
    counters.forEach(counter => {
      console.log(`${counter.machineId}: ${counter.count} деталей (канал DI${counter.channel})`);
    });
    
    console.log('\n✅ Тест завершён успешно!');
    console.log(`📊 Всего станков с Adam-6050: ${counters.length}`);
    
  } catch (err) {
    console.error('❌ Ошибка тестирования:', err.message);
  }
}

testAdamIntegration(); 