"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.L20Handler = void 0;
class L20Handler {
    constructor() {
        this.machineId = 'L-20';
        this.machineName = 'L-20';
    }
    getPartCount(xmlData) {
        try {
            const partCount = xmlData?.MTConnectStreams?.Streams?.[0]?.DeviceStream?.[0]?.ComponentStream?.find((comp) => comp.Component?.[0]?.$?.name === 'Controller')?.Samples?.find((sample) => sample.PartCount?.[0]?.$?.dataItemId === 'part_count')?.PartCount?.[0]?._;
            return partCount ? parseInt(partCount, 10) : null;
        }
        catch (error) {
            return null;
        }
    }
    getExecutionStatus(xmlData) {
        try {
            return xmlData?.MTConnectStreams?.Streams?.[0]?.DeviceStream?.[0]?.ComponentStream?.find((comp) => comp.Component?.[0]?.$?.name === 'Controller')?.Events?.find((event) => event.Execution?.[0]?.$?.dataItemId === 'execution')?.Execution?.[0]?._ || null;
        }
        catch (error) {
            return null;
        }
    }
    getProgramNumber(xmlData) {
        try {
            return xmlData?.MTConnectStreams?.Streams?.[0]?.DeviceStream?.[0]?.ComponentStream?.find((comp) => comp.Component?.[0]?.$?.name === 'Controller')?.Events?.find((event) => event.Program?.[0]?.$?.dataItemId === 'program')?.Program?.[0]?._ || null;
        }
        catch (error) {
            return null;
        }
    }
    // Для L-20: прямой подсчет импульсов от Adam-6050 (канал 5)
    calculateCycleTime(currentCount, previousCount, currentTime, previousTime) {
        if (currentCount <= previousCount || currentTime <= previousTime) {
            return null;
        }
        const timeDiff = (currentTime.getTime() - previousTime.getTime()) / 1000;
        const countDiff = currentCount - previousCount;
        // L-20 использует прямые импульсы, поэтому расчет время цикла = время / количество деталей
        return timeDiff / countDiff;
    }
    getDataItemId() {
        return 'cycle_time_avg';
    }
    getCycleTimeFormat() {
        return 'AVERAGE';
    }
    // Специальный метод для L-20: метод подсчета
    getCountingMethod() {
        return 'DIRECT_PULSE';
    }
    // Канал Adam-6050 для L-20
    getAdamChannel() {
        return 5;
    }
}
exports.L20Handler = L20Handler;
