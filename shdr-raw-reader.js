const net = require('net');

const client = new net.Socket();

client.connect(7702, 'localhost', () => {
    console.log('Подключен к SHDR адаптеру SR-26 на порту 7702');
    console.log('=====================================');
});

client.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
        if (line.trim()) {
            console.log('RAW SHDR:', line.trim());
        }
    });
});

client.on('error', (err) => {
    console.log('Ошибка:', err.message);
});

client.on('close', () => {
    console.log('Соединение закрыто');
}); 