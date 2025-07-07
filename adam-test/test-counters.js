const Modbus = require('jsmodbus')
const net = require('net')

const options = {
  host: '192.168.1.120',
  port: 502
}

const socket = new net.Socket()
const client = new Modbus.client.TCP(socket)

console.log('🔄 Подключаюсь к Adam-6050 для чтения счётчиков...')

socket.on('connect', async function () {
  console.log('✅ Подключён к Adam-6050!')
  
  try {
    // Читаем дискретные входы (DI0-DI11)
    console.log('\n📊 Читаю дискретные входы (DI0-DI11)...')
    const diResult = await client.readDiscreteInputs(0, 12)
    const diValues = diResult.response.body.valuesAsArray
    
    console.log('=== ДИСКРЕТНЫЕ ВХОДЫ ===')
    for (let i = 0; i < 12; i++) {
      console.log(`DI${i}: ${diValues[i] ? 'HIGH (1)' : 'LOW (0)'}`)
    }
    
    // Читаем регистры хранения (Holding Registers) - тут могут быть счётчики
    console.log('\n📊 Читаю регистры хранения (счётчики)...')
    const hrResult = await client.readHoldingRegisters(0, 12)
    const hrValues = hrResult.response.body.valuesAsArray
    
    console.log('\n=== СЧЁТЧИКИ (Holding Registers) ===')
    for (let i = 0; i < 12; i++) {
      console.log(`HR${i}: ${hrValues[i]} (канал DI${i})`)
    }
    
    // Читаем входные регистры (Input Registers)
    console.log('\n📊 Читаю входные регистры...')
    const irResult = await client.readInputRegisters(0, 12)
    const irValues = irResult.response.body.valuesAsArray
    
    console.log('\n=== ВХОДНЫЕ РЕГИСТРЫ ===')
    for (let i = 0; i < 12; i++) {
      console.log(`IR${i}: ${irValues[i]}`)
    }
    
    console.log('\n✅ Все данные прочитаны успешно!')
    
  } catch (err) {
    console.error('❌ Ошибка чтения:', err.message)
  }
  
  socket.end()
})

socket.on('error', function (err) {
  console.error('❌ Ошибка соединения:', err)
})

socket.connect(options) 