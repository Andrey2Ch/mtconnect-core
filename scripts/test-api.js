const http = require('http');

// Тестовые данные в формате Edge Gateway
const testData = {
  edgeGatewayId: "MTConnect-Edge-1",
  timestamp: new Date().toISOString(),
  data: [
    {
      machineId: "XD-20",
      machineName: "XD-20",
      timestamp: new Date().toISOString(),
      data: {
        partCount: 100,
        executionStatus: "ACTIVE",
        cycleTime: 45.5
      }
    },
    {
      machineId: "SR-26", 
      machineName: "SR-26",
      timestamp: new Date().toISOString(),
      data: {
        partCount: 250,
        executionStatus: "ACTIVE", 
        cycleTime: 38.2
      }
    }
  ]
};

console.log('🚀 Отправляю тестовые данные в Cloud API...');
console.log('📊 Данные:', JSON.stringify(testData, null, 2));

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/ext/data',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`📡 Статус ответа: ${res.statusCode}`);
  console.log(`📋 Заголовки:`, res.headers);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('✅ Ответ от Cloud API:', responseData);
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('🎯 УСПЕХ! Cloud API принял данные');
    } else {
      console.log('❌ ОШИБКА! Cloud API отклонил данные');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Ошибка отправки:', e.message);
});

req.write(postData);
req.end(); 