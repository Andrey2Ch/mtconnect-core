"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Xd38Handler = void 0;
class Xd38Handler {
    constructor() {
        this.machineId = 'XD-38';
        this.machineName = 'XD-38';
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
                console.warn(`⚠️ XD-38: Некорректное значение PartCount: ${countValue}`);
                return null;
            }
            console.log(`✅ XD-38: Найден PartCount: ${parsedCount}`);
            return parsedCount;
        }
        catch (error) {
            console.error(`❌ XD-38: Ошибка получения счётчика деталей:`, error);
            return null;
        }
    }
    getExecutionStatus(xmlData) {
        try {
            const pathComponent = this.findPathComponent(xmlData);
            if (!pathComponent?.Events?.Execution)
                return null;
            const execution = pathComponent.Events.Execution;
            const status = Array.isArray(execution) ? execution[0]._ : execution._;
            console.log(`✅ XD-38: Найден Execution: ${status}`);
            return status;
        }
        catch (error) {
            console.error(`❌ XD-38: Ошибка получения статуса выполнения:`, error);
            return null;
        }
    }
    getProgramNumber(xmlData) {
        try {
            const pathComponent = this.findPathComponent(xmlData);
            if (!pathComponent?.Events?.Program)
                return null;
            const program = pathComponent.Events.Program;
            const programValue = Array.isArray(program) ? program[0]._ : program._;
            console.log(`✅ XD-38: Найден Program: ${programValue}`);
            return programValue;
        }
        catch (error) {
            console.error(`❌ XD-38: Ошибка получения номера программы:`, error);
            return null;
        }
    }
    calculateCycleTime(currentCount, previousCount, currentTime, previousTime) {
        if (currentCount <= previousCount || currentTime <= previousTime) {
            console.warn(`⚠️ XD-38: Некорректные данные для расчета времени цикла: current=${currentCount}, prev=${previousCount}`);
            return null;
        }
        const timeDiffMs = currentTime.getTime() - previousTime.getTime();
        const countDiff = currentCount - previousCount;
        if (countDiff <= 0 || timeDiffMs <= 0)
            return null;
        const cycleTimeMs = timeDiffMs / countDiff;
        console.log(`✅ XD-38: Вычислено время цикла: ${cycleTimeMs}мс для ${countDiff} деталей`);
        return cycleTimeMs;
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
        const pathComponent = components.find((cs) => cs.$?.name === 'path' || cs.$?.componentId === 'pth');
        if (pathComponent) {
            console.log(`✅ XD-38: Найден path компонент`);
        }
        else {
            console.warn(`⚠️ XD-38: Path компонент не найден`);
        }
        return pathComponent;
    }
}
exports.Xd38Handler = Xd38Handler;
//# sourceMappingURL=xd-38-handler.js.map