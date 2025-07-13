"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SR23Handler = void 0;
class SR23Handler {
    constructor() {
        this.machineId = 'SR-23';
        this.machineName = 'SR-23';
    }
    getPartCount(xmlData) {
        try {
            const pathComponent = this.findPathComponent(xmlData);
            if (!pathComponent?.Events?.PartCount)
                return null;
            const partCount = pathComponent.Events.PartCount;
            const countValue = Array.isArray(partCount) ? partCount[0]._ : partCount._;
            const parsedCount = parseInt(countValue, 10);
            if (isNaN(parsedCount)) {
                console.warn(`⚠️ SR-23: Некорректное значение PartCount: ${countValue}`);
                return null;
            }
            return parsedCount;
        }
        catch (error) {
            console.error(`❌ SR-23: Ошибка получения счётчика деталей:`, error);
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
            console.error(`❌ SR-23: Ошибка получения статуса выполнения:`, error);
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
            console.error(`❌ SR-23: Ошибка получения номера программы:`, error);
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
exports.SR23Handler = SR23Handler;
//# sourceMappingURL=sr-23-handler.js.map