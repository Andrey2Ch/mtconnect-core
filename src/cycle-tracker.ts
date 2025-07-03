export interface CycleData {
    machineId: string;
    cycleNumber: number;
    startTime: Date;
    endTime?: Date;
    duration?: number; // в секундах
    status: 'RUNNING' | 'COMPLETED' | 'INTERRUPTED';
}

export interface MachineProductionStats {
    machineId: string;
    totalCycles: number;
    cyclesThisShift: number;
    averageCycleTime: number;
    lastCycleTime?: number;
    currentCycleStartTime?: Date;
    isCurrentlyRunning: boolean;
    lastStatusChange: Date;
    efficiency: number; // % времени в работе
}

export class CycleTracker {
    private machineStates: Map<string, boolean> = new Map(); // предыдущие состояния
    private currentCycles: Map<string, CycleData> = new Map(); // текущие циклы
    private completedCycles: CycleData[] = []; // завершенные циклы
    private productionStats: Map<string, MachineProductionStats> = new Map();

    public updateMachineStatus(machineId: string, isRunning: boolean): void {
        const previousState = this.machineStates.get(machineId);
        const now = new Date();
        
        // Инициализация статистики если нет
        if (!this.productionStats.has(machineId)) {
            this.productionStats.set(machineId, {
                machineId,
                totalCycles: 0,
                cyclesThisShift: 0,
                averageCycleTime: 0,
                isCurrentlyRunning: false,
                lastStatusChange: now,
                efficiency: 0
            });
        }

        const stats = this.productionStats.get(machineId)!;
        
        // Обнаружение изменения состояния
        if (previousState !== undefined && previousState !== isRunning) {
            this.handleStateChange(machineId, previousState, isRunning, now);
        }
        
        // Обновляем состояние
        this.machineStates.set(machineId, isRunning);
        stats.isCurrentlyRunning = isRunning;
        stats.lastStatusChange = now;
        
        this.updateEfficiency(machineId);
    }

    private handleStateChange(machineId: string, wasRunning: boolean, isRunning: boolean, timestamp: Date): void {
        const stats = this.productionStats.get(machineId)!;
        
        if (!wasRunning && isRunning) {
            // Станок ЗАПУСТИЛСЯ - начинаем новый цикл
            this.startNewCycle(machineId, timestamp);
            console.log(`🚀 ЦИКЛ НАЧАТ: ${machineId} в ${timestamp.toLocaleTimeString()}`);
            
        } else if (wasRunning && !isRunning) {
            // Станок ОСТАНОВИЛСЯ - завершаем цикл
            this.completeCycle(machineId, timestamp);
            const lastCycle = this.getLastCompletedCycle(machineId);
            if (lastCycle) {
                console.log(`✅ ЦИКЛ ЗАВЕРШЕН: ${machineId} за ${lastCycle.duration}сек (цикл #${lastCycle.cycleNumber})`);
            }
        }
    }

    private startNewCycle(machineId: string, startTime: Date): void {
        const stats = this.productionStats.get(machineId)!;
        
        const newCycle: CycleData = {
            machineId,
            cycleNumber: stats.totalCycles + 1,
            startTime,
            status: 'RUNNING'
        };
        
        this.currentCycles.set(machineId, newCycle);
        stats.currentCycleStartTime = startTime;
    }

    private completeCycle(machineId: string, endTime: Date): void {
        const currentCycle = this.currentCycles.get(machineId);
        if (!currentCycle) return;
        
        const stats = this.productionStats.get(machineId)!;
        const duration = Math.round((endTime.getTime() - currentCycle.startTime.getTime()) / 1000);
        
        // Обновляем цикл
        currentCycle.endTime = endTime;
        currentCycle.duration = duration;
        currentCycle.status = 'COMPLETED';
        
        // Сохраняем завершенный цикл
        this.completedCycles.push({ ...currentCycle });
        this.currentCycles.delete(machineId);
        
        // Обновляем статистику
        stats.totalCycles++;
        stats.cyclesThisShift++;
        stats.lastCycleTime = duration;
        stats.currentCycleStartTime = undefined;
        
        // Пересчитываем среднее время цикла
        this.updateAverageCycleTime(machineId);
    }

    private updateAverageCycleTime(machineId: string): void {
        const stats = this.productionStats.get(machineId)!;
        const machineCycles = this.completedCycles.filter(c => c.machineId === machineId && c.duration);
        
        if (machineCycles.length > 0) {
            const totalTime = machineCycles.reduce((sum, cycle) => sum + (cycle.duration || 0), 0);
            stats.averageCycleTime = Math.round(totalTime / machineCycles.length);
        }
    }

    private updateEfficiency(machineId: string): void {
        const stats = this.productionStats.get(machineId)!;
        // Простой расчет эффективности за последний час
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentCycles = this.completedCycles.filter(c => 
            c.machineId === machineId && 
            c.startTime > oneHourAgo && 
            c.duration
        );
        
        if (recentCycles.length > 0) {
            const totalProductionTime = recentCycles.reduce((sum, cycle) => sum + (cycle.duration || 0), 0);
            const totalTime = 60 * 60; // 1 час в секундах
            stats.efficiency = Math.round((totalProductionTime / totalTime) * 100);
        }
    }

    // Публичные методы для получения данных
    public getMachineStats(machineId: string): MachineProductionStats | undefined {
        return this.productionStats.get(machineId);
    }

    public getAllStats(): MachineProductionStats[] {
        return Array.from(this.productionStats.values());
    }

    public getLastCompletedCycle(machineId: string): CycleData | undefined {
        return this.completedCycles
            .filter(c => c.machineId === machineId)
            .sort((a, b) => b.cycleNumber - a.cycleNumber)[0];
    }

    public getCurrentCycle(machineId: string): CycleData | undefined {
        return this.currentCycles.get(machineId);
    }

    public getTodaysCycles(machineId: string): CycleData[] {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return this.completedCycles.filter(c => 
            c.machineId === machineId && 
            c.startTime >= today
        );
    }

    public getProductionSummary(): any {
        const stats = this.getAllStats();
        const totalCycles = stats.reduce((sum, s) => sum + s.totalCycles, 0);
        const averageEfficiency = stats.length > 0 
            ? Math.round(stats.reduce((sum, s) => sum + s.efficiency, 0) / stats.length)
            : 0;
        
        return {
            totalMachines: stats.length,
            totalCycles: totalCycles,
            machinesRunning: stats.filter(s => s.isCurrentlyRunning).length,
            averageEfficiency,
            machines: stats.map(s => ({
                id: s.machineId,
                cycles: s.totalCycles,
                running: s.isCurrentlyRunning,
                efficiency: s.efficiency,
                avgCycleTime: s.averageCycleTime
            }))
        };
    }

    // Метод для сброса счетчиков смены
    public resetShiftCounters(): void {
        for (const stats of this.productionStats.values()) {
            stats.cyclesThisShift = 0;
        }
        console.log('🔄 Счетчики смены сброшены');
    }
}

export const cycleTracker = new CycleTracker();
export default cycleTracker; 