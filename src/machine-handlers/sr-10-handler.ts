import { MachineHandler } from './index';

export class SR10Handler implements MachineHandler {
    machineId = 'SR-10';
    machineName = 'SR-10';

    getPartCount(xmlData: any): number | null {
        try {
            // SR-10: счётчик деталей в path.events.part_count
            const pathComponent = this.findPathComponent(xmlData);
            if (!pathComponent?.Events?.PartCount) return null;
            
            const partCount = pathComponent.Events.PartCount;
            const countValue = Array.isArray(partCount) ? partCount[0]._ : partCount._;
            const parsedCount = parseInt(countValue, 10);
            
            if (isNaN(parsedCount)) {
                console.warn(`⚠️ SR-10: Некорректное значение PartCount: ${countValue}`);
                return null;
            }
            
            return parsedCount;
        } catch (error) {
            console.error(`❌ SR-10: Ошибка получения счётчика деталей:`, error);
            return null;
        }
    }

    getExecutionStatus(xmlData: any): string | null {
        try {
            const pathComponent = this.findPathComponent(xmlData);
            if (!pathComponent?.Events?.Execution) return null;
            
            const execution = pathComponent.Events.Execution;
            return Array.isArray(execution) ? execution[0]._ : execution._;
        } catch (error) {
            console.error(`❌ SR-10: Ошибка получения статуса выполнения:`, error);
            return null;
        }
    }

    getProgramNumber(xmlData: any): string | null {
        try {
            const pathComponent = this.findPathComponent(xmlData);
            if (!pathComponent?.Events?.Block) return null;
            
            const block = pathComponent.Events.Block;
            return Array.isArray(block) ? block[0]._ : block._;
        } catch (error) {
            console.error(`❌ SR-10: Ошибка получения номера программы:`, error);
            return null;
        }
    }

    calculateCycleTime(currentCount: number, previousCount: number, currentTime: Date, previousTime: Date): number | null {
        // SR-10: расчёт времени цикла для конкретной детали
        if (currentCount <= previousCount) return null;
        
        const timeDiffMs = currentTime.getTime() - previousTime.getTime();
        const partsDiff = currentCount - previousCount;
        
        if (partsDiff <= 0 || timeDiffMs <= 0) return null;
        
        return timeDiffMs / partsDiff; // мс на деталь
    }

    getDataItemId(): string {
        return 'cycle_time_avg';
    }

    getCycleTimeFormat(): 'AVERAGE' | 'ACTUAL' {
        return 'AVERAGE';
    }

    private findPathComponent(xmlData: any): any {
        if (!xmlData?.ComponentStream) return null;
        
        const components = Array.isArray(xmlData.ComponentStream) 
            ? xmlData.ComponentStream 
            : [xmlData.ComponentStream];
            
        return components.find((cs: any) => 
            cs.$?.name === 'path' || cs.$?.componentId === 'pth'
        );
    }
} 