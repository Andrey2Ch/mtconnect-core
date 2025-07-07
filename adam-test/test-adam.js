const Modbus = require('jsmodbus')
const net = require('net')

const options = {
  host: '192.168.1.120', // IP твоего Adam-6050
  port: 502
}

const socket = new net.Socket()
const client = new Modbus.client.TCP(socket)

console.log('🔄 Подключаюсь к Adam-6050 (192.168.1.120:502)...')

socket.on('connect', function () {
  console.log('✅ Подключён к Adam-6050!')
  
  // Adam-6050: дискретные входы (DI) — адреса 0-11
  console.log('📊 Читаю дискретные входы (DI0-DI11)...')
  
  client.readDiscreteInputs(0, 12)
    .then(function (resp) {
      console.log('\n=== РЕЗУЛЬТАТ ===')
      console.log('DI (дискретные входы):', resp.response.body.valuesAsArray)
      
      // Выводим каждый канал отдельно для наглядности
      const values = resp.response.body.valuesAsArray
      for (let i = 0; i < values.length; i++) {
        console.log(`DI${i}: ${values[i] ? 'HIGH (1)' : 'LOW (0)'}`)
      }
      
      console.log('\n✅ Тест завершён успешно!')
      socket.end()
    })
    .catch(function (err) {
      console.error('❌ Ошибка Modbus:', err)
      socket.end()
    })
})

socket.on('error', function (err) {
  console.error('❌ Ошибка соединения:', err)
})

socket.connect(options) 