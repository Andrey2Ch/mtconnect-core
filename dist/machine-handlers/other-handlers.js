"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DT26Handler = exports.XD38Handler = exports.XD20Handler = exports.SR26Handler = exports.SR25Handler = void 0;
// Базовый класс для общих методов
class BaseHandler {
    getPartCount(xmlData) {
        try {
            const pathComponent = this.findPathComponent(xmlData);
            if (!pathComponent?.Events?.PartCount)
                return null;
            const partCount = pathComponent.Events.PartCount;
            const countValue = Array.isArray(partCount) ? partCount[0]._ : partCount._;
            const parsedCount = parseInt(countValue, 10);
            if (isNaN(parsedCount)) {
                console.warn(`⚠️ ${this.machineId}: Некорректное значение PartCount: ${countValue}`);
                return null;
            }
            return parsedCount;
        }
        catch (error) {
            console.error(`❌ ${this.machineId}: Ошибка получения счётчика деталей:`, error);
            return null;
        }
    }
    getExecutionStatus(xmlData) {
        try {
            const pathComponent = this.findPathComponent(xmlData);
            if (!pathComponent?.Events?.Execution)
                return null;
            const execution = pathComponent.Events.Execution;
            return Array.isArray(execution) ? execution[0]._ : execution._;
        }
        catch (error) {
            console.error(`❌ ${this.machineId}: Ошибка получения статуса выполнения:`, error);
            return null;
        }
    }
    getProgramNumber(xmlData) {
        try {
            const pathComponent = this.findPathComponent(xmlData);
            if (!pathComponent?.Events?.Block)
                return null;
            const block = pathComponent.Events.Block;
            return Array.isArray(block) ? block[0]._ : block._;
        }
        catch (error) {
            console.error(`❌ ${this.machineId}: Ошибка получения номера программы:`, error);
            return null;
        }
    }
    calculateCycleTime(currentCount, previousCount, currentTime, previousTime) {
        if (currentCount <= previousCount)
            return null;
        const timeDiffMs = currentTime.getTime() - previousTime.getTime();
        const partsDiff = currentCount - previousCount;
        if (partsDiff <= 0 || timeDiffMs <= 0)
            return null;
        return timeDiffMs / partsDiff;
    }
    getDataItemId() {
        return 'cycle_time_avg';
    }
    getCycleTimeFormat() {
        return 'AVERAGE';
    }
    findPathComponent(xmlData) {
        if (!xmlData?.ComponentStream)
            return null;
        const components = Array.isArray(xmlData.ComponentStream)
            ? xmlData.ComponentStream
            : [xmlData.ComponentStream];
        return components.find((cs) => cs.$?.name === 'path' || cs.$?.componentId === 'pth');
    }
}
class SR25Handler extends BaseHandler {
    constructor() {
        super(...arguments);
        this.machineId = 'SR-25';
        this.machineName = 'SR-25';
    }
}
exports.SR25Handler = SR25Handler;
class SR26Handler extends BaseHandler {
    constructor() {
        super(...arguments);
        this.machineId = 'SR-26';
        this.machineName = 'SR-26';
    }
}
exports.SR26Handler = SR26Handler;
class XD20Handler extends BaseHandler {
    constructor() {
        super(...arguments);
        this.machineId = 'XD-20';
        this.machineName = 'XD-20';
    }
}
exports.XD20Handler = XD20Handler;
class XD38Handler extends BaseHandler {
    constructor() {
        super(...arguments);
        this.machineId = 'XD-38';
        this.machineName = 'XD-38';
    }
}
exports.XD38Handler = XD38Handler;
class DT26Handler extends BaseHandler {
    constructor() {
        super(...arguments);
        this.machineId = 'DT-26';
        this.machineName = 'STUDER DT-26';
    }
}
exports.DT26Handler = DT26Handler;
