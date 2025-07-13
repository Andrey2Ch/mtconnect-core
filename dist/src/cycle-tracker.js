"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cycleTracker = exports.CycleTracker = void 0;
class CycleTracker {
    constructor() {
        this.machineStates = new Map();
        this.currentCycles = new Map();
        this.completedCycles = [];
        this.productionStats = new Map();
    }
    updateMachineStatus(machineId, isRunning) {
        const previousState = this.machineStates.get(machineId);
        const now = new Date();
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
        const stats = this.productionStats.get(machineId);
        if (previousState !== undefined && previousState !== isRunning) {
            this.handleStateChange(machineId, previousState, isRunning, now);
        }
        this.machineStates.set(machineId, isRunning);
        stats.isCurrentlyRunning = isRunning;
        stats.lastStatusChange = now;
        this.updateEfficiency(machineId);
    }
    handleStateChange(machineId, wasRunning, isRunning, timestamp) {
        const stats = this.productionStats.get(machineId);
        if (!wasRunning && isRunning) {
            this.startNewCycle(machineId, timestamp);
            console.log(`🚀 ЦИКЛ НАЧАТ: ${machineId} в ${timestamp.toLocaleTimeString()}`);
        }
        else if (wasRunning && !isRunning) {
            this.completeCycle(machineId, timestamp);
            const lastCycle = this.getLastCompletedCycle(machineId);
            if (lastCycle) {
                console.log(`✅ ЦИКЛ ЗАВЕРШЕН: ${machineId} за ${lastCycle.duration}сек (цикл #${lastCycle.cycleNumber})`);
            }
        }
    }
    startNewCycle(machineId, startTime) {
        const stats = this.productionStats.get(machineId);
        const newCycle = {
            machineId,
            cycleNumber: stats.totalCycles + 1,
            startTime,
            status: 'RUNNING'
        };
        this.currentCycles.set(machineId, newCycle);
        stats.currentCycleStartTime = startTime;
    }
    completeCycle(machineId, endTime) {
        const currentCycle = this.currentCycles.get(machineId);
        if (!currentCycle)
            return;
        const stats = this.productionStats.get(machineId);
        const duration = Math.round((endTime.getTime() - currentCycle.startTime.getTime()) / 1000);
        currentCycle.endTime = endTime;
        currentCycle.duration = duration;
        currentCycle.status = 'COMPLETED';
        this.completedCycles.push({ ...currentCycle });
        this.currentCycles.delete(machineId);
        stats.totalCycles++;
        stats.cyclesThisShift++;
        stats.lastCycleTime = duration;
        stats.currentCycleStartTime = undefined;
        this.updateAverageCycleTime(machineId);
    }
    updateAverageCycleTime(machineId) {
        const stats = this.productionStats.get(machineId);
        const machineCycles = this.completedCycles.filter(c => c.machineId === machineId && c.duration);
        if (machineCycles.length > 0) {
            const totalTime = machineCycles.reduce((sum, cycle) => sum + (cycle.duration || 0), 0);
            stats.averageCycleTime = Math.round(totalTime / machineCycles.length);
        }
    }
    updateEfficiency(machineId) {
        const stats = this.productionStats.get(machineId);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentCycles = this.completedCycles.filter(c => c.machineId === machineId &&
            c.startTime > oneHourAgo &&
            c.duration);
        if (recentCycles.length > 0) {
            const totalProductionTime = recentCycles.reduce((sum, cycle) => sum + (cycle.duration || 0), 0);
            const totalTime = 60 * 60;
            stats.efficiency = Math.round((totalProductionTime / totalTime) * 100);
        }
    }
    getMachineStats(machineId) {
        return this.productionStats.get(machineId);
    }
    getAllStats() {
        return Array.from(this.productionStats.values());
    }
    getLastCompletedCycle(machineId) {
        return this.completedCycles
            .filter(c => c.machineId === machineId)
            .sort((a, b) => b.cycleNumber - a.cycleNumber)[0];
    }
    getCurrentCycle(machineId) {
        return this.currentCycles.get(machineId);
    }
    getTodaysCycles(machineId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return this.completedCycles.filter(c => c.machineId === machineId &&
            c.startTime >= today);
    }
    getProductionSummary() {
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
    resetShiftCounters() {
        for (const stats of this.productionStats.values()) {
            stats.cyclesThisShift = 0;
        }
        console.log('🔄 Счетчики смены сброшены');
    }
}
exports.CycleTracker = CycleTracker;
exports.cycleTracker = new CycleTracker();
exports.default = exports.cycleTracker;
//# sourceMappingURL=cycle-tracker.js.map