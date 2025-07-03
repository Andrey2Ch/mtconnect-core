"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
async function debugCheck(url) {
    console.log(`\nПроверка: ${url}`);
    try {
        // Простой ping
        const response = await axios_1.default.get(url, {
            timeout: 3000,
            validateStatus: () => true // принимаем любой статус
        });
        console.log(`✓ Ответ получен: ${response.status} ${response.statusText}`);
        console.log(`  Content-Type: ${response.headers['content-type']}`);
        console.log(`  Размер: ${response.data?.length || 0} символов`);
        if (response.data && typeof response.data === 'string') {
            const preview = response.data.substring(0, 200).replace(/\n/g, ' ');
            console.log(`  Превью: ${preview}...`);
        }
    }
    catch (error) {
        console.log(`✗ Ошибка: ${error.code || error.message}`);
        if (error.response) {
            console.log(`  HTTP статус: ${error.response.status}`);
            console.log(`  Headers: ${JSON.stringify(error.response.headers)}`);
        }
    }
}
async function main() {
    console.log('MTConnect Debug Checker');
    console.log('======================');
    // Тестируем один прямой станок
    await debugCheck('http://192.168.1.90:8193');
    await debugCheck('http://192.168.1.90:8193/');
    await debugCheck('http://192.168.1.90:8193/probe');
    // Тестируем один proxy
    await debugCheck('http://127.0.0.1:5005');
    await debugCheck('http://127.0.0.1:5005/');
    await debugCheck('http://127.0.0.1:5005/probe');
}
main().catch(console.error);
