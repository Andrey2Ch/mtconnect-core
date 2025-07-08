import { MachineHandler } from './index';

export class Xd38Handler implements MachineHandler {
    machineId = 'XD-38';
    machineName = 'XD-38';

    getPartCount(xmlData: any): number | null {
        try {
            // XD-38: ищем PartCount в path компоненте Events
            const pathComponent = this.findPathComponent(xmlData);
            if (!pathComponent?.Events?.PartCount) return null;
            
            const partCount = pathComponent.Events.PartCount;
            const countValue = Array.isArray(partCount) ? partCount[0]._ : partCount._;
            const parsedCount = parseInt(countValue, 10);
            
            if (isNaN(parsedCount)) {
                console.warn(`⚠️ XD-38: Некорректное значение PartCount: ${countValue}`);
                return null;
            }
            
            console.log(`✅ XD-38: Найден PartCount: ${parsedCount}`);
            return parsedCount;
        } catch (error) {
            console.error(`❌ XD-38: Ошибка получения счётчика деталей:`, error);
            return null;
        }
    }

    getExecutionStatus(xmlData: any): string | null {
        try {
            const pathComponent = this.findPathComponent(xmlData);
            if (!pathComponent?.Events?.Execution) return null;
            
            const execution = pathComponent.Events.Execution;
            const status = Array.isArray(execution) ? execution[0]._ : execution._;
            console.log(`✅ XD-38: Найден Execution: ${status}`);
            return status;
        } catch (error) {
            console.error(`❌ XD-38: Ошибка получения статуса выполнения:`, error);
            return null;
        }
    }

    getProgramNumber(xmlData: any): string | null {
        try {
            const pathComponent = this.findPathComponent(xmlData);
            if (!pathComponent?.Events?.Program) return null;
            
            const program = pathComponent.Events.Program;
            const programValue = Array.isArray(program) ? program[0]._ : program._;
            console.log(`✅ XD-38: Найден Program: ${programValue}`);
            return programValue;
        } catch (error) {
            console.error(`❌ XD-38: Ошибка получения номера программы:`, error);
            return null;
        }
    }

    calculateCycleTime(currentCount: number, previousCount: number, currentTime: Date, previousTime: Date): number | null {
        if (currentCount <= previousCount || currentTime <= previousTime) {
            console.warn(`⚠️ XD-38: Некорректные данные для расчета времени цикла: current=${currentCount}, prev=${previousCount}`);
            return null;
        }

        const timeDiffMs = currentTime.getTime() - previousTime.getTime();
        const countDiff = currentCount - previousCount;
        
        if (countDiff <= 0 || timeDiffMs <= 0) return null;
        
        // Возвращаем время цикла в миллисекундах на одну деталь
        const cycleTimeMs = timeDiffMs / countDiff;
        console.log(`✅ XD-38: Вычислено время цикла: ${cycleTimeMs}мс для ${countDiff} деталей`);
        return cycleTimeMs;
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
            
        const pathComponent = components.find((cs: any) => 
            cs.$?.name === 'path' || cs.$?.componentId === 'pth'
        );
        
        if (pathComponent) {
            console.log(`✅ XD-38: Найден path компонент`);
        } else {
            console.warn(`⚠️ XD-38: Path компонент не найден`);
        }
        
        return pathComponent;
    }
} 