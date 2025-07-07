import { MachineHandler } from './index';

export class L20Handler implements MachineHandler {
    machineId = 'L-20';
    machineName = 'L-20';

    getPartCount(xmlData: any): number | null {
        try {
            const partCount = xmlData?.MTConnectStreams?.Streams?.[0]?.DeviceStream?.[0]?.ComponentStream?.find(
                (comp: any) => comp.Component?.[0]?.$?.name === 'Controller'
            )?.Samples?.find(
                (sample: any) => sample.PartCount?.[0]?.$?.dataItemId === 'part_count'
            )?.PartCount?.[0]?._;

            return partCount ? parseInt(partCount, 10) : null;
        } catch (error) {
            return null;
        }
    }

    getExecutionStatus(xmlData: any): string | null {
        try {
            return xmlData?.MTConnectStreams?.Streams?.[0]?.DeviceStream?.[0]?.ComponentStream?.find(
                (comp: any) => comp.Component?.[0]?.$?.name === 'Controller'
            )?.Events?.find(
                (event: any) => event.Execution?.[0]?.$?.dataItemId === 'execution'
            )?.Execution?.[0]?._ || null;
        } catch (error) {
            return null;
        }
    }

    getProgramNumber(xmlData: any): string | null {
        try {
            return xmlData?.MTConnectStreams?.Streams?.[0]?.DeviceStream?.[0]?.ComponentStream?.find(
                (comp: any) => comp.Component?.[0]?.$?.name === 'Controller'
            )?.Events?.find(
                (event: any) => event.Program?.[0]?.$?.dataItemId === 'program'
            )?.Program?.[0]?._ || null;
        } catch (error) {
            return null;
        }
    }

    // Для L-20: прямой подсчет импульсов от Adam-6050 (канал 5)
    calculateCycleTime(currentCount: number, previousCount: number, currentTime: Date, previousTime: Date): number | null {
        if (currentCount <= previousCount || currentTime <= previousTime) {
            return null;
        }

        const timeDiff = (currentTime.getTime() - previousTime.getTime()) / 1000;
        const countDiff = currentCount - previousCount;
        
        // L-20 использует прямые импульсы, поэтому расчет время цикла = время / количество деталей
        return timeDiff / countDiff;
    }

    getDataItemId(): string {
        return 'cycle_time_avg';
    }

    getCycleTimeFormat(): 'AVERAGE' | 'ACTUAL' {
        return 'AVERAGE';
    }

    // Специальный метод для L-20: метод подсчета
    getCountingMethod(): string {
        return 'DIRECT_PULSE';
    }

    // Канал Adam-6050 для L-20
    getAdamChannel(): number {
        return 5;
    }
} 