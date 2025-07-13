export interface CycleData {
    machineId: string;
    cycleNumber: number;
    startTime: Date;
    endTime?: Date;
    duration?: number;
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
    efficiency: number;
}
export declare class CycleTracker {
    private machineStates;
    private currentCycles;
    private completedCycles;
    private productionStats;
    updateMachineStatus(machineId: string, isRunning: boolean): void;
    private handleStateChange;
    private startNewCycle;
    private completeCycle;
    private updateAverageCycleTime;
    private updateEfficiency;
    getMachineStats(machineId: string): MachineProductionStats | undefined;
    getAllStats(): MachineProductionStats[];
    getLastCompletedCycle(machineId: string): CycleData | undefined;
    getCurrentCycle(machineId: string): CycleData | undefined;
    getTodaysCycles(machineId: string): CycleData[];
    getProductionSummary(): any;
    resetShiftCounters(): void;
}
export declare const cycleTracker: CycleTracker;
export default cycleTracker;
