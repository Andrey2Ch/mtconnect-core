// Отправка данных от всех 8 MTConnect машин
const fetch = require('node-fetch');

const machines8 = [
  { id: "XD-20", name: "XD-20", partCount: Math.floor(Math.random() * 500), cycleTime: 45.5 },
  { id: "SR-26", name: "SR-26", partCount: Math.floor(Math.random() * 300), cycleTime: 38.2 },
  { id: "XD-38", name: "XD-38", partCount: Math.floor(Math.random() * 250), cycleTime: 42.1 },
  { id: "SR-10", name: "SR-10", partCount: Math.floor(Math.random() * 400), cycleTime: 35.8 },
  { id: "DT-26", name: "STUDER DT-26", partCount: Math.floor(Math.random() * 180), cycleTime: 55.3 },
  { id: "SR-21", name: "SR-21", partCount: Math.floor(Math.random() * 320), cycleTime: 41.7 },
  { id: "SR-23", name: "SR-23", partCount: Math.floor(Math.random() * 280), cycleTime: 39.4 },
  { id: "SR-25", name: "SR-25", partCount: Math.floor(Math.random() * 350), cycleTime: 43.2 }
];

async function sendData() {
  const data = {
    edgeGatewayId: "MTConnect-Edge-1",
    timestamp: new Date().toISOString(),
    data: machines8.map(machine => ({
      machineId: machine.id,
      machineName: machine.name,
      timestamp: new Date().toISOString(),
      data: {
        partCount: machine.partCount,
        executionStatus: "ACTIVE", 
        cycleTime: machine.cycleTime
      }
    }))
  };

  console.log(`🚀 Отправляю данные от ${machines8.length} машин...`);
  
  try {
    const response = await fetch('http://localhost:3000/api/ext/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    console.log(`📡 Статус: ${response.status}`);
    const result = await response.text();
    console.log(`✅ Ответ:`, result);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

sendData(); 