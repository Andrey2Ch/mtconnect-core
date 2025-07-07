"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sr26Handler = void 0;
class Sr26Handler {
    constructor() {
        this.machineId = 'SR-26';
        this.machineName = 'SR-26';
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
    calculateCycleTime(currentCount, previousCount, currentTime, previousTime) {
        if (currentCount <= previousCount || currentTime <= previousTime) {
            return null;
        }
        const timeDiff = (currentTime.getTime() - previousTime.getTime()) / 1000;
        const countDiff = currentCount - previousCount;
        return timeDiff / countDiff;
    }
    getDataItemId() {
        return 'cycle_time_avg';
    }
    getCycleTimeFormat() {
        return 'AVERAGE';
    }
}
exports.Sr26Handler = Sr26Handler;
