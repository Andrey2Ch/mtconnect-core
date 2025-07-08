/**
 * ADAM-6050 PoC Entry Point
 * Proof of Concept: замена Advantech.Adam.DLL на Node.js + jsmodbus
 */

import { testWithMockServer } from './test-with-mock';

console.log('🚀 ADAM-6050 PoC запущен');
console.log('📋 Задача: Проверить возможность замены .NET DLL на Node.js решение');

// Запускаем интегрированный тест с Mock сервером
testWithMockServer(); 