"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdamReader = void 0;
const Modbus = __importStar(require("jsmodbus"));
const net = __importStar(require("net"));
class AdamReader {
    constructor(host = '192.168.1.120', port = 502) {
        this.MIN_PARTS_FOR_CALCULATION = 3; // Минимум деталей для расчета времени цикла
        this.MAX_HISTORY_SIZE = 10; // Максимум записей в истории
        this.host = host;
        this.port = port;
        this.counterHistories = new Map();
        // Маппинг каналов на станки (из Adam-6050 веб-интерфейса)
        this.channelMapping = new Map([
            [0, 'SR-22'], // DI0 -> SR-22 (SR22)
            [1, 'SB-16'], // DI1 -> SB-16 (SB16)
            [2, 'BT-38'], // DI2 -> BT-38 (BT38)
            [3, 'K-162'], // DI3 -> K-162 (K-162)
            [4, 'K-163'], // DI4 -> K-163 (K-163)
            [5, 'L-20'], // DI5 -> L-20 (L20)
            [6, 'K-16'], // DI6 -> K-16 (K16)
            [7, ''], // DI7 -> (пустой)
            [8, 'SR-20'], // DI8 -> SR-20 (SR20)
            [9, 'SR-32'], // DI9 -> SR-32 (SR32)
            [10, ''], // DI10 -> (пустой)
            [11, 'SR-24'] // DI11 -> SR-24 (SR24) ✅ ИСПРАВЛЕНО!
        ]);
    }
    async readCounters() {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            const client = new Modbus.client.TCP(socket);
            const results = [];
            socket.on('connect', async () => {
                try {
                    console.log('✅ Подключён к Adam-6050 для чтения счётчиков');
                    // Читаем Input Registers (Function Code 04) - для Counter режима (32-битные счетчики)
                    const irResult = await client.readInputRegisters(0, 24); // Читаем 24 регистра для 12 32-битных счетчиков
                    const irValues = irResult.response.body.valuesAsArray;
                    // Читаем Discrete Inputs (Function Code 02) - для Digital Input режима
                    const diResult = await client.readDiscreteInputs(0, 12);
                    const diValues = diResult.response.body.valuesAsArray;
                    // Преобразуем 16-битные регистры в 32-битные счетчики
                    const counters32bit = [];
                    for (let i = 0; i < 12; i++) {
                        const lowWord = irValues[i * 2]; // Младшие 16 бит
                        const highWord = irValues[i * 2 + 1]; // Старшие 16 бит
                        const counter32 = lowWord + (highWord * 65536); // Объединяем в 32-битное число
                        counters32bit.push(counter32);
                    }
                    console.log('📊 Input Registers (16-bit):', irValues);
                    console.log('📊 32-bit Counters:', counters32bit);
                    console.log('📊 Discrete Inputs (Digital):', diValues);
                    const currentTime = new Date();
                    const timestamp = currentTime.toISOString();
                    // Определяем какие каналы в каком режиме работают (из Adam-6050 веб-интерфейса)
                    const digitalInputChannels = new Set(); // Нет станков в Digital Input режиме
                    const counterChannels = new Set([
                        'SR-22', 'SB-16', 'BT-38', 'K-162', 'K-163',
                        'L-20', 'K-16', 'SR-20', 'SR-32', 'SR-24'
                    ]); // ВСЕ активные станки в Counter режиме
                    // Обрабатываем каждый канал
                    for (let i = 0; i < 12; i++) {
                        const machineId = this.channelMapping.get(i);
                        if (machineId && machineId !== '') {
                            // Выбираем правильный тип данных в зависимости от режима машины
                            let currentCount;
                            let dataType;
                            if (digitalInputChannels.has(machineId)) {
                                // Digital Input режим - читаем Discrete Inputs
                                currentCount = diValues[i] ? 1 : 0; // Discrete Input возвращает boolean
                                dataType = 'Digital Input';
                            }
                            else if (counterChannels.has(machineId)) {
                                // Counter режим - читаем 32-битные счетчики ✅
                                currentCount = counters32bit[i];
                                dataType = 'Counter (32-bit)';
                            }
                            else {
                                // Для неизвестных машин пробуем Counter режим
                                currentCount = counters32bit[i];
                                dataType = 'Unknown (32-bit Counter)';
                            }
                            // Форматируем большие числа для читаемости
                            const formattedCount = currentCount.toLocaleString();
                            console.log(`📊 ${machineId}: ${dataType} = ${formattedCount}`);
                            // Получаем или создаем историю для этого станка
                            let history = this.counterHistories.get(machineId);
                            if (!history) {
                                history = {
                                    machineId: machineId,
                                    changes: [],
                                    lastKnownCount: currentCount,
                                    lastUpdateTime: currentTime
                                };
                                this.counterHistories.set(machineId, history);
                                console.log(`📋 Инициализирована история для ${machineId} (${dataType}), начальное значение: ${currentCount.toLocaleString()}`);
                                continue;
                            }
                            // Проверяем, изменился ли счетчик
                            if (currentCount > history.lastKnownCount) {
                                const newParts = currentCount - history.lastKnownCount;
                                // Записываем изменение в историю
                                history.changes.push({
                                    timestamp: currentTime,
                                    count: currentCount
                                });
                                console.log(`🔄 ${machineId}: ${dataType} изменился с ${history.lastKnownCount.toLocaleString()} на ${currentCount.toLocaleString()} (+${newParts}) в ${currentTime.toLocaleTimeString()}`);
                                // Ограничиваем размер истории
                                if (history.changes.length > this.MAX_HISTORY_SIZE) {
                                    history.changes.shift(); // Удаляем самую старую запись
                                }
                                history.lastKnownCount = currentCount;
                                history.lastUpdateTime = currentTime;
                            }
                            else {
                                // Специальное логирование для Digital Input режима
                                if (digitalInputChannels.has(machineId)) {
                                    const timeSinceLastUpdate = Math.round((currentTime.getTime() - history.lastUpdateTime.getTime()) / 1000);
                                    console.log(`📍 ${machineId}: Digital Input = ${currentCount} (${timeSinceLastUpdate}с без изменений)`);
                                    // Digital Input должен быть только 0 или 1
                                    if (currentCount !== 0 && currentCount !== 1) {
                                        console.log(`⚠️ ${machineId}: Неожиданное значение для Digital Input: ${currentCount} (должно быть 0 или 1)`);
                                    }
                                }
                                else {
                                    // Для обычных счетчиков (Counter режим)
                                    history.lastUpdateTime = currentTime;
                                }
                            }
                            // Дополнительная проверка: счетчик мог сброситься (уменьшиться)
                            if (currentCount < history.lastKnownCount) {
                                console.log(`🔄 ${machineId}: ${dataType} СБРОШЕН с ${history.lastKnownCount.toLocaleString()} на ${currentCount.toLocaleString()} (возможна перезагрузка или сброс)`);
                                history.lastKnownCount = currentCount;
                                // Сбрасываем историю при сбросе счетчика
                                history.changes = [];
                            }
                            // Вычисляем время цикла на основе истории
                            let cycleTimeMs;
                            let partsInCycle;
                            let confidence;
                            if (digitalInputChannels.has(machineId)) {
                                // Для Digital Input режима не вычисляем cycle time
                                cycleTimeMs = undefined;
                                partsInCycle = 0;
                                confidence = `Digital Input (${currentCount === 1 ? 'АКТИВЕН' : 'НЕАКТИВЕН'})`;
                            }
                            else {
                                // Для Counter режима вычисляем cycle time
                                const cycleData = this.calculateCycleTime(history);
                                cycleTimeMs = cycleData.cycleTimeMs;
                                partsInCycle = cycleData.partsInCycle;
                                confidence = cycleData.confidence;
                            }
                            results.push({
                                channel: i,
                                machineId: machineId,
                                count: currentCount,
                                timestamp: timestamp,
                                cycleTimeMs: cycleTimeMs,
                                partsInCycle: partsInCycle,
                                confidence: confidence
                            });
                        }
                    }
                    console.log(`📊 Прочитано ${results.length} счётчиков с Adam-6050`);
                    socket.end();
                    resolve(results);
                }
                catch (err) {
                    console.error('❌ Ошибка чтения счётчиков:', err);
                    socket.end();
                    reject(err);
                }
            });
            socket.on('error', (err) => {
                console.error('❌ Ошибка соединения с Adam-6050:', err);
                reject(err);
            });
            socket.connect({ host: this.host, port: this.port });
        });
    }
    calculateCycleTime(history) {
        // Нужно минимум записей для расчета
        if (history.changes.length < this.MIN_PARTS_FOR_CALCULATION) {
            return {
                cycleTimeMs: undefined,
                partsInCycle: history.changes.length,
                confidence: `Недостаточно данных (${history.changes.length}/${this.MIN_PARTS_FOR_CALCULATION})`
            };
        }
        // Берем первую и последнюю запись из истории
        const firstChange = history.changes[0];
        const lastChange = history.changes[history.changes.length - 1];
        // Вычисляем общее время и количество произведенных деталей
        const totalTimeMs = lastChange.timestamp.getTime() - firstChange.timestamp.getTime();
        const totalParts = lastChange.count - firstChange.count;
        if (totalParts <= 0) {
            return {
                cycleTimeMs: undefined,
                partsInCycle: totalParts,
                confidence: 'Нет изменений счетчика'
            };
        }
        // Рассчитываем среднее время на одну деталь
        const avgCycleTimeMs = totalTimeMs / totalParts;
        // Определяем уровень уверенности
        let confidence = 'НИЗКАЯ';
        if (history.changes.length >= 5) {
            confidence = 'ВЫСОКАЯ';
        }
        else if (history.changes.length >= 3) {
            confidence = 'СРЕДНЯЯ';
        }
        console.log(`⏱️ ${history.machineId}: ${totalParts} дет. за ${(totalTimeMs / 1000).toFixed(1)} сек = ${(avgCycleTimeMs / 1000).toFixed(2)} сек/дет (${confidence})`);
        return {
            cycleTimeMs: avgCycleTimeMs,
            partsInCycle: totalParts,
            confidence: confidence
        };
    }
    async testConnection() {
        try {
            const data = await this.readCounters();
            return data.length > 0;
        }
        catch (err) {
            return false;
        }
    }
    // Метод для сброса истории (для отладки)
    resetHistory() {
        this.counterHistories.clear();
        console.log('🔄 История счетчиков Adam-6050 сброшена');
    }
    // Метод для получения истории (для отладки)
    getHistory() {
        return new Map(this.counterHistories);
    }
}
exports.AdamReader = AdamReader;
