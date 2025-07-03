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
exports.realFocasClient = exports.RealFocasClient = exports.FocasStatus = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let focasAddon = null;
try {
    // Попытка загрузить скомпилированный addon
    focasAddon = require(path.join(__dirname, '../build/Release/focas_addon.node'));
    console.log('✅ Настоящий FOCAS addon загружен успешно!');
}
catch (error) {
    console.log('⚠️ FOCAS addon не найден, будет использоваться эмуляция:', error.message);
}
var FocasStatus;
(function (FocasStatus) {
    FocasStatus[FocasStatus["STOP"] = 0] = "STOP";
    FocasStatus[FocasStatus["HOLD"] = 1] = "HOLD";
    FocasStatus[FocasStatus["RUN"] = 2] = "RUN";
    FocasStatus[FocasStatus["MSTR"] = 3] = "MSTR";
    FocasStatus[FocasStatus["EDIT"] = 4] = "EDIT";
    FocasStatus[FocasStatus["MDI"] = 5] = "MDI";
    FocasStatus[FocasStatus["TEACH"] = 6] = "TEACH";
    FocasStatus[FocasStatus["JOG"] = 7] = "JOG";
    FocasStatus[FocasStatus["TJOG"] = 8] = "TJOG";
    FocasStatus[FocasStatus["HJOG"] = 9] = "HJOG";
})(FocasStatus || (exports.FocasStatus = FocasStatus = {}));
class RealFocasClient {
    constructor() {
        this.handles = new Map();
        this.isInitialized = false;
        this.dllPath = path.join(process.cwd(), 'Fwlib32.dll');
        // this.initializeAddon(); // Пока не будем инициализировать, чтобы избежать ошибок загрузки
        this.isInitialized = false; // Принудительно ставим в false
        console.log('ℹ️ FOCAS C++ addon принудительно отключен в конструкторе RealFocasClient (восстановлено для стабильности).');
    }
    initializeAddon() {
        // Эту функцию можно пока закомментировать или оставить, т.к. isInitialized уже false
        try {
            // Попытка загрузить наш C++ addon
            // focasAddon = require(path.join(__dirname, '../build/Release/focas_addon.node'));
            // this.isInitialized = true; // Не устанавливаем в true
            // console.log('✅ FOCAS addon загружен успешно');
        }
        catch (error) {
            // const exePath = path.join(process.cwd(), 'quick_focas.exe');
            // if (fs.existsSync(exePath)) {
            //     // this.isInitialized = true;
            //     console.log('✅ FOCAS executable найден, используем внешний процесс');
            // } else {
            //     console.log(`⚠️ FOCAS addon и executable не найдены: ${error.message}`);
            // }
        }
        // Вне зависимости от результатов выше, мы хотим, чтобы isInitialized оставалось false
        this.isInitialized = false;
    }
    isAvailable() {
        // return this.isInitialized && fs.existsSync(this.dllPath); // Старая логика
        console.log('ℹ️ FOCAS C++ addon временно отключен: RealFocasClient.isAvailable() принудительно возвращает false (восстановлено для стабильности).');
        return false; // Временно отключаем аддон
    }
    async connect(ip, port = 8193) {
        if (!this.isAvailable()) { // Проверка останется, но isAvailable() теперь всегда false
            return { success: false, errorCode: -999 };
        }
        try {
            const result = focasAddon.connectToFanuc(ip, port);
            if (result.success) {
                this.handles.set(ip, result.handle);
                console.log(`🔥 РЕАЛЬНОЕ FOCAS подключение к ${ip}:${port} успешно! Handle: ${result.handle}`);
            }
            else {
                console.log(`❌ Ошибка FOCAS подключения к ${ip}:${port}, код: ${result.errorCode}`);
            }
            return result;
        }
        catch (error) {
            console.error('❌ Исключение при подключении FOCAS:', error);
            return { success: false, errorCode: -998 };
        }
    }
    async disconnect(ip) {
        if (!focasAddon) {
            return false;
        }
        const handle = this.handles.get(ip);
        if (!handle) {
            return false;
        }
        try {
            const result = focasAddon.disconnectFromFanuc(handle);
            if (result) {
                this.handles.delete(ip);
                console.log(`✅ FOCAS отключение от ${ip} успешно`);
            }
            return result;
        }
        catch (error) {
            console.error('❌ Ошибка отключения FOCAS:', error);
            return false;
        }
    }
    async readMachineData(ip) {
        if (!focasAddon) {
            return { success: false, error: true, errorCode: -999 };
        }
        const handle = this.handles.get(ip);
        if (!handle) {
            return { success: false, error: true, errorCode: -997 };
        }
        try {
            const result = focasAddon.readMachineData(handle);
            if (result.success) {
                console.log(`🔥 РЕАЛЬНЫЕ данные FOCAS от ${ip}:`, JSON.stringify(result, null, 2));
            }
            else {
                console.log(`❌ Ошибка чтения FOCAS данных от ${ip}, код: ${result.errorCode}`);
            }
            return result;
        }
        catch (error) {
            console.error('❌ Исключение при чтении FOCAS данных:', error);
            return { success: false, error: true, errorCode: -996 };
        }
    }
    async getMachineData(machineId, ip, port = 8193) {
        if (!this.isAvailable()) {
            // Возвращаем значения по умолчанию без эмуляции
            console.log(`ℹ️ FOCAS для ${machineId} (${ip}) недоступен (isAvailable() = false), возвращаем дефолтные данные (восстановлено для стабильности).`);
            return {
                machineId,
                status: {
                    running: false,
                    feedrate: 0,
                    spindleSpeed: 0,
                    toolNumber: 0,
                    programNumber: 0,
                    mode: 'UNKNOWN',
                    alarms: [],
                    position: { x: 0, y: 0, z: 0 }
                },
                timestamp: Date.now()
            };
        }
        // Проверяем, есть ли addon или используем внешний процесс
        if (focasAddon) {
            return this.getMachineDataViaAddon(machineId, ip, port);
        }
        else {
            return this.getMachineDataViaProcess(machineId, ip, port);
        }
    }
    async getMachineDataViaAddon(machineId, ip, port) {
        try {
            // Подключаемся к машине
            const connectionResult = await this.connect(ip, port);
            if (!connectionResult.success) {
                throw new Error(`Connection failed: ${connectionResult.errorCode}`);
            }
            const handle = connectionResult.handle;
            // Получаем статус машины
            const statusResult = focasAddon.getStatus(handle);
            const positionResult = focasAddon.getPosition(handle);
            const spindleResult = focasAddon.getSpindleData(handle);
            const alarmResult = focasAddon.getAlarms(handle);
            // Отключаемся
            await this.disconnect(ip);
            // Обрабатываем данные
            const status = statusResult.success ? statusResult.data : {};
            const position = positionResult.success ? positionResult.data : { x: 0, y: 0, z: 0 };
            const spindle = spindleResult.success ? spindleResult.data : {};
            const alarms = alarmResult.success ? alarmResult.data : [];
            const isRunning = this.determineRunningStatus(status);
            return {
                machineId,
                status: {
                    running: isRunning,
                    feedrate: status.feedrate || 0,
                    spindleSpeed: spindle.speed || 0,
                    toolNumber: status.toolNumber || 0,
                    programNumber: status.programNumber || 0,
                    mode: this.getModeString(status.mode || 0),
                    alarms: Array.isArray(alarms) ? alarms.map(a => a.message || 'Unknown alarm') : [],
                    position: {
                        x: position.x || 0,
                        y: position.y || 0,
                        z: position.z || 0
                    }
                },
                timestamp: Date.now()
            };
        }
        catch (error) {
            console.error(`❌ Ошибка получения данных FOCAS для ${machineId} (${ip}): ${error.message}`);
            // Возвращаем данные по умолчанию при ошибке
            return {
                machineId,
                status: {
                    running: false,
                    feedrate: 0,
                    spindleSpeed: 0,
                    toolNumber: 0,
                    programNumber: 0,
                    mode: 'ERROR',
                    alarms: [error.message],
                    position: { x: 0, y: 0, z: 0 }
                },
                timestamp: Date.now()
            };
        }
    }
    async getMachineDataViaProcess(machineId, ip, port) {
        const { spawn } = require('child_process');
        // Пробуем использовать профессиональный Ladder99 драйвер
        const ladder99Path = path.join(process.cwd(), 'fanuc-ladder99', 'fanuc.exe');
        const quickFocasPath = path.join(process.cwd(), 'quick_focas.exe');
        // Проверяем какой драйвер доступен
        if (fs.existsSync(ladder99Path)) {
            console.log(`🚀 Используем профессиональный Ladder99 FOCAS драйвер для ${ip}`);
            return this.executeLadder99Driver(machineId, ip, port, ladder99Path);
        }
        else if (fs.existsSync(quickFocasPath)) {
            console.log(`⚡ Используем quick_focas для ${ip}`);
            return this.executeQuickFocasDriver(machineId, ip, port, quickFocasPath);
        }
        else {
            return this.getErrorResult(machineId, 'Нет доступных FOCAS драйверов');
        }
    }
    async executeLadder99Driver(machineId, ip, port, exePath) {
        const { spawn } = require('child_process');
        return new Promise((resolve) => {
            // Создаем временный конфиг для одной машины
            const tempConfig = `
machines:
  ${machineId}:
    address: ${ip}
    port: ${port}
    enabled: true
    type: fanuc
    alias: ${machineId}

output:
  type: json
  single_read: true
`;
            const tempConfigPath = path.join(process.cwd(), 'fanuc-ladder99', `temp-${machineId}.yml`);
            fs.writeFileSync(tempConfigPath, tempConfig);
            const child = spawn(exePath, ['--config', `temp-${machineId}.yml`, '--single-read'], {
                timeout: 10000,
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: path.dirname(exePath)
            });
            let output = '';
            let errorOutput = '';
            child.stdout.on('data', (data) => {
                output += data.toString();
            });
            child.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            child.on('close', (code) => {
                // Очищаем временный файл
                try {
                    fs.unlinkSync(tempConfigPath);
                }
                catch (e) { /* игнорируем ошибки */ }
                if (code === 0 && output.trim()) {
                    try {
                        const data = this.parseLadder99Output(output);
                        resolve({
                            machineId,
                            status: {
                                running: data.running || false,
                                feedrate: data.feedrate || 0,
                                spindleSpeed: data.spindleSpeed || 0,
                                toolNumber: data.toolNumber || 0,
                                programNumber: data.programNumber || 0,
                                mode: data.running ? 'RUN' : 'STOP',
                                alarms: data.alarms || [],
                                position: data.position || { x: 0, y: 0, z: 0 }
                            },
                            timestamp: Date.now()
                        });
                    }
                    catch (error) {
                        console.log(`⚠️ Ошибка парсинга Ladder99 для ${ip}, пробуем quick_focas: ${error.message}`);
                        // Fallback на quick_focas при ошибке парсинга
                        resolve(this.executeQuickFocasDriver(machineId, ip, port, path.join(process.cwd(), 'quick_focas.exe')));
                    }
                }
                else {
                    console.log(`⚠️ Ladder99 вернул код ${code} для ${ip}, пробуем quick_focas`);
                    // Fallback на quick_focas при ошибке
                    resolve(this.executeQuickFocasDriver(machineId, ip, port, path.join(process.cwd(), 'quick_focas.exe')));
                }
            });
            child.on('error', (error) => {
                console.log(`⚠️ Ошибка запуска Ladder99 для ${ip}: ${error.message}, пробуем quick_focas`);
                // Fallback на quick_focas при ошибке запуска
                resolve(this.executeQuickFocasDriver(machineId, ip, port, path.join(process.cwd(), 'quick_focas.exe')));
            });
        });
    }
    async executeQuickFocasDriver(machineId, ip, port, exePath) {
        const { spawn } = require('child_process');
        return new Promise((resolve) => {
            const child = spawn(exePath, [ip, port.toString()], {
                timeout: 5000,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            let output = '';
            let errorOutput = '';
            child.stdout.on('data', (data) => {
                output += data.toString();
            });
            child.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            child.on('close', (code) => {
                if (code === 0 && output.trim()) {
                    try {
                        const data = this.parseProcessOutput(output);
                        resolve({
                            machineId,
                            status: {
                                running: data.running || false,
                                feedrate: data.feedrate || 0,
                                spindleSpeed: data.spindleSpeed || 0,
                                toolNumber: data.toolNumber || 0,
                                programNumber: data.programNumber || 0,
                                mode: data.running ? 'RUN' : 'STOP',
                                alarms: data.alarms || [],
                                position: data.position || { x: 0, y: 0, z: 0 }
                            },
                            timestamp: Date.now()
                        });
                    }
                    catch (error) {
                        resolve(this.getErrorResult(machineId, `Parse error: ${error.message}`));
                    }
                }
                else {
                    const errorMsg = errorOutput || `Process exited with code ${code}`;
                    resolve(this.getErrorResult(machineId, errorMsg));
                }
            });
            child.on('error', (error) => {
                resolve(this.getErrorResult(machineId, `Spawn error: ${error.message}`));
            });
        });
    }
    parseProcessOutput(output) {
        const data = {
            running: false,
            feedrate: 0,
            spindleSpeed: 0,
            toolNumber: 0,
            programNumber: 0,
            alarms: [],
            position: { x: 0, y: 0, z: 0 }
        };
        const lines = output.trim().split('\n');
        for (const line of lines) {
            if (line.includes('Running: 1')) {
                data.running = true;
            }
            else if (line.includes('Position:')) {
                const match = line.match(/Position: X=([\d.-]+), Y=([\d.-]+), Z=([\d.-]+)/);
                if (match) {
                    data.position = {
                        x: parseFloat(match[1]) || 0,
                        y: parseFloat(match[2]) || 0,
                        z: parseFloat(match[3]) || 0
                    };
                }
            }
            else if (line.includes('Spindle:')) {
                const match = line.match(/Spindle: ([\d.-]+)/);
                if (match) {
                    data.spindleSpeed = parseFloat(match[1]) || 0;
                }
            }
            else if (line.includes('Feed:')) {
                const match = line.match(/Feed: ([\d.-]+)/);
                if (match) {
                    data.feedrate = parseFloat(match[1]) || 0;
                }
            }
            else if (line.includes('Program:')) {
                const match = line.match(/Program: ([\d]+)/);
                if (match) {
                    data.programNumber = parseInt(match[1]) || 0;
                }
            }
            else if (line.includes('Tool:')) {
                const match = line.match(/Tool: ([\d]+)/);
                if (match) {
                    data.toolNumber = parseInt(match[1]) || 0;
                }
            }
            else if (line.includes('ALARM:')) {
                data.alarms.push(line.replace('ALARM:', '').trim());
            }
        }
        return data;
    }
    parseLadder99Output(output) {
        const data = {
            running: false,
            feedrate: 0,
            spindleSpeed: 0,
            toolNumber: 0,
            programNumber: 0,
            alarms: [],
            position: { x: 0, y: 0, z: 0 }
        };
        try {
            // Ladder99 может выводить JSON или текстовый формат
            if (output.trim().startsWith('{')) {
                // Пробуем парсить как JSON
                const jsonData = JSON.parse(output.trim());
                // Ladder99 структура данных
                if (jsonData.machines && typeof jsonData.machines === 'object') {
                    const machineKey = Object.keys(jsonData.machines)[0];
                    const machine = jsonData.machines[machineKey];
                    if (machine) {
                        data.running = machine.status === 'RUN' || machine.running === true || machine.execution === 'ACTIVE';
                        data.feedrate = machine.feedrate || machine.feed_rate || 0;
                        data.spindleSpeed = machine.spindle_speed || machine.spindleSpeed || 0;
                        data.toolNumber = machine.tool_number || machine.toolNumber || 0;
                        data.programNumber = machine.program_number || machine.programNumber || 0;
                        if (machine.position) {
                            data.position = {
                                x: parseFloat(machine.position.x) || 0,
                                y: parseFloat(machine.position.y) || 0,
                                z: parseFloat(machine.position.z) || 0
                            };
                        }
                        if (machine.alarms && Array.isArray(machine.alarms)) {
                            data.alarms = machine.alarms.map((alarm) => typeof alarm === 'string' ? alarm : alarm.message || 'Unknown alarm');
                        }
                    }
                }
            }
            else {
                // Fallback на текстовый парсинг если не JSON
                return this.parseProcessOutput(output);
            }
        }
        catch (error) {
            console.log(`⚠️ Ошибка парсинга JSON от Ladder99: ${error.message}, пробуем текстовый парсинг`);
            return this.parseProcessOutput(output);
        }
        return data;
    }
    getErrorResult(machineId, error) {
        return {
            machineId,
            status: {
                running: false,
                feedrate: 0,
                spindleSpeed: 0,
                toolNumber: 0,
                programNumber: 0,
                mode: 'ERROR',
                alarms: [error],
                position: { x: 0, y: 0, z: 0 }
            },
            timestamp: Date.now()
        };
    }
    determineRunningStatus(status) {
        if (!status || typeof status.run === 'undefined') {
            return false;
        }
        // Машина работает если run = 1 и нет аварий
        return status.run === 1 && (status.emergency === 0) && (status.alarm === 0);
    }
    getModeString(mode) {
        switch (mode) {
            case FocasStatus.RUN: return 'RUN';
            case FocasStatus.STOP: return 'STOP';
            case FocasStatus.HOLD: return 'HOLD';
            case FocasStatus.EDIT: return 'EDIT';
            case FocasStatus.MDI: return 'MDI';
            case FocasStatus.JOG: return 'JOG';
            default: return 'UNKNOWN';
        }
    }
    async testConnection(ip, port = 8193) {
        if (!this.isAvailable()) {
            return false;
        }
        try {
            const result = await this.connect(ip, port);
            if (result.success) {
                await this.disconnect(ip);
                return true;
            }
            return false;
        }
        catch (error) {
            return false;
        }
    }
    disconnectAll() {
        for (const [ip, handle] of this.handles) {
            try {
                focasAddon.disconnectFromFanuc(handle);
                console.log(`✅ Отключен от ${ip}`);
            }
            catch (error) {
                console.error(`❌ Ошибка отключения от ${ip}:`, error);
            }
        }
        this.handles.clear();
    }
}
exports.RealFocasClient = RealFocasClient;
// Экспорт единственного экземпляра
exports.realFocasClient = new RealFocasClient();
exports.default = exports.realFocasClient;
