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
exports.FocasNative = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let focasAddon = null;
try {
    // Пытаемся загрузить скомпилированный addon
    focasAddon = require('../build/Release/focas_addon.node');
    console.log('✅ РЕАЛЬНЫЙ FOCAS addon загружен!');
}
catch (error) {
    console.log('⚠️ FOCAS addon не найден, используем симуляцию:', error.message);
}
class FocasNative {
    constructor() {
        this.isLibraryLoaded = false;
        this.isRealFocas = false;
        // Путь к DLL в корне проекта
        this.dllPath = path.join(process.cwd(), 'Fwlib32.dll');
        this.checkLibrary();
    }
    checkLibrary() {
        try {
            if (fs.existsSync(this.dllPath)) {
                console.log(`✅ FOCAS DLL найдена: ${this.dllPath}`);
                this.isLibraryLoaded = true;
                if (focasAddon) {
                    this.isRealFocas = true;
                    console.log('🔥 Используем РЕАЛЬНЫЙ FOCAS через C++ addon!');
                }
                else {
                    console.log('⚠️ DLL найдена, но addon не скомпилирован. Используем симуляцию.');
                }
            }
            else {
                console.error(`❌ FOCAS DLL не найдена: ${this.dllPath}`);
                this.isLibraryLoaded = false;
            }
        }
        catch (error) {
            console.error('❌ Ошибка проверки FOCAS DLL:', error);
            this.isLibraryLoaded = false;
        }
    }
    isAvailable() {
        return this.isLibraryLoaded;
    }
    isReal() {
        return this.isRealFocas;
    }
    // Подключение к станку
    connect(ip, port = 8193, timeout = 10) {
        if (!this.isLibraryLoaded) {
            throw new Error('FOCAS библиотека не загружена');
        }
        if (this.isRealFocas) {
            // РЕАЛЬНОЕ подключение через addon
            try {
                const handle = focasAddon.connect(ip, port);
                if (handle > 0) {
                    console.log(`🔥 РЕАЛЬНОЕ FOCAS подключение к ${ip}:${port} успешно! Handle: ${handle}`);
                    return handle;
                }
                else {
                    console.error(`❌ Не удалось подключиться к ${ip}:${port} через РЕАЛЬНЫЙ FOCAS`);
                    return -1;
                }
            }
            catch (error) {
                console.error(`❌ Ошибка РЕАЛЬНОГО FOCAS подключения к ${ip}:`, error);
                return -1;
            }
        }
        else {
            // Симуляция (как раньше)
            console.log(`🎲 Симуляция подключения к ${ip}:${port}`);
            const fakeHandle = Math.floor(Math.random() * 1000) + 1;
            console.log(`✅ Симуляция подключения успешна. Handle: ${fakeHandle}`);
            return fakeHandle;
        }
    }
    // Отключение от станка
    disconnect(handle) {
        if (!this.isLibraryLoaded || handle <= 0) {
            return false;
        }
        if (this.isRealFocas) {
            // РЕАЛЬНОЕ отключение
            try {
                const result = focasAddon.disconnect(handle);
                if (result) {
                    console.log(`✅ РЕАЛЬНОЕ FOCAS отключение успешно. Handle: ${handle}`);
                    return true;
                }
                else {
                    console.error(`❌ Ошибка РЕАЛЬНОГО FOCAS отключения. Handle: ${handle}`);
                    return false;
                }
            }
            catch (error) {
                console.error('❌ Исключение при РЕАЛЬНОМ отключении:', error);
                return false;
            }
        }
        else {
            // Симуляция
            console.log(`✅ Симуляция отключения. Handle: ${handle}`);
            return true;
        }
    }
    // Чтение статуса станка
    readStatus(handle) {
        if (!this.isLibraryLoaded || handle <= 0) {
            return null;
        }
        if (this.isRealFocas) {
            // РЕАЛЬНОЕ чтение статуса
            try {
                const status = focasAddon.readStatus(handle);
                if (status) {
                    console.log(`🔥 РЕАЛЬНЫЙ статус получен от handle ${handle}:`, status);
                    return status;
                }
                else {
                    console.error(`❌ Не удалось получить РЕАЛЬНЫЙ статус от handle ${handle}`);
                    return null;
                }
            }
            catch (error) {
                console.error('❌ Ошибка чтения РЕАЛЬНОГО статуса:', error);
                return null;
            }
        }
        else {
            // Симуляция (как раньше)
            const hour = new Date().getHours();
            const isWorkingHours = hour >= 7 && hour <= 19;
            const isRunning = isWorkingHours && Math.random() < 0.8;
            return {
                mode: isRunning ? 1 : 0,
                running: isRunning ? 1 : 0,
                motion: isRunning ? (Math.random() < 0.7 ? 1 : 0) : 0,
                emergency: 0,
                alarm: Math.random() < 0.05 ? 1 : 0,
                edit: 0
            };
        }
    }
    // Чтение позиций осей
    readPositions(handle) {
        if (!this.isLibraryLoaded || handle <= 0) {
            return null;
        }
        if (this.isRealFocas) {
            // РЕАЛЬНОЕ чтение позиций
            try {
                const positions = focasAddon.readPositions(handle);
                if (positions) {
                    console.log(`🔥 РЕАЛЬНЫЕ позиции получены от handle ${handle}:`, positions);
                    return positions;
                }
                else {
                    console.error(`❌ Не удалось получить РЕАЛЬНЫЕ позиции от handle ${handle}`);
                    return null;
                }
            }
            catch (error) {
                console.error('❌ Ошибка чтения РЕАЛЬНЫХ позиций:', error);
                return null;
            }
        }
        else {
            // Симуляция (как раньше)
            return {
                X: {
                    absolute: Math.round((Math.random() - 0.5) * 500 * 100) / 100,
                    machine: Math.round((Math.random() - 0.5) * 500 * 100) / 100,
                    relative: Math.round((Math.random() - 0.5) * 100 * 100) / 100,
                    remaining: Math.round(Math.random() * 50 * 100) / 100
                },
                Y: {
                    absolute: Math.round((Math.random() - 0.5) * 400 * 100) / 100,
                    machine: Math.round((Math.random() - 0.5) * 400 * 100) / 100,
                    relative: Math.round((Math.random() - 0.5) * 100 * 100) / 100,
                    remaining: Math.round(Math.random() * 50 * 100) / 100
                },
                Z: {
                    absolute: Math.round(Math.random() * 300 * 100) / 100,
                    machine: Math.round(Math.random() * 300 * 100) / 100,
                    relative: Math.round((Math.random() - 0.5) * 50 * 100) / 100,
                    remaining: Math.round(Math.random() * 25 * 100) / 100
                }
            };
        }
    }
    // Чтение скорости шпинделя и подачи
    readActualValues(handle) {
        if (!this.isLibraryLoaded || handle <= 0) {
            return null;
        }
        if (this.isRealFocas) {
            // РЕАЛЬНОЕ чтение скоростей
            try {
                const actuals = focasAddon.readActuals(handle);
                if (actuals) {
                    console.log(`🔥 РЕАЛЬНЫЕ скорости получены от handle ${handle}:`, actuals);
                    return actuals;
                }
                else {
                    console.error(`❌ Не удалось получить РЕАЛЬНЫЕ скорости от handle ${handle}`);
                    return null;
                }
            }
            catch (error) {
                console.error('❌ Ошибка чтения РЕАЛЬНЫХ скоростей:', error);
                return null;
            }
        }
        else {
            // Симуляция (как раньше)
            const hour = new Date().getHours();
            const isWorkingHours = hour >= 7 && hour <= 19;
            const isRunning = isWorkingHours && Math.random() < 0.8;
            return {
                spindleSpeed: isRunning ? Math.round(800 + Math.random() * 3200) : 0,
                feedRate: isRunning ? Math.round(100 + Math.random() * 1200) : 0
            };
        }
    }
    // Чтение номера программы
    readProgramNumber(handle) {
        if (!this.isLibraryLoaded || handle <= 0) {
            return 0;
        }
        if (this.isRealFocas) {
            // РЕАЛЬНОЕ чтение номера программы
            try {
                const progNum = focasAddon.readProgramNumber(handle);
                console.log(`🔥 РЕАЛЬНЫЙ номер программы получен от handle ${handle}: ${progNum}`);
                return progNum || 0;
            }
            catch (error) {
                console.error('❌ Ошибка чтения РЕАЛЬНОГО номера программы:', error);
                return 0;
            }
        }
        else {
            // Симуляция (как раньше)
            const hour = new Date().getHours();
            const isWorkingHours = hour >= 7 && hour <= 19;
            const isRunning = isWorkingHours && Math.random() < 0.8;
            return isRunning ? Math.floor(Math.random() * 999) + 1000 : 0;
        }
    }
    // Чтение номера последовательности
    readSequenceNumber(handle) {
        if (!this.isLibraryLoaded || handle <= 0) {
            return 0;
        }
        if (this.isRealFocas) {
            // РЕАЛЬНОЕ чтение номера последовательности
            try {
                const seqNum = focasAddon.readSequenceNumber(handle);
                console.log(`🔥 РЕАЛЬНЫЙ номер последовательности получен от handle ${handle}: ${seqNum}`);
                return seqNum || 0;
            }
            catch (error) {
                console.error('❌ Ошибка чтения РЕАЛЬНОГО номера последовательности:', error);
                return 0;
            }
        }
        else {
            // Симуляция (как раньше)
            const hour = new Date().getHours();
            const isWorkingHours = hour >= 7 && hour <= 19;
            const isRunning = isWorkingHours && Math.random() < 0.8;
            return isRunning ? Math.floor(Math.random() * 9999) + 1 : 0;
        }
    }
    // Проверка доступности библиотеки
    static checkAvailability() {
        try {
            const dllPath = path.join(process.cwd(), 'Fwlib32.dll');
            return fs.existsSync(dllPath);
        }
        catch {
            return false;
        }
    }
}
exports.FocasNative = FocasNative;
exports.default = FocasNative;
