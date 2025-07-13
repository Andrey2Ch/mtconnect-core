import { MachineHandler } from './index';
export declare class SR10Handler implements MachineHandler {
    machineId: string;
    machineName: string;
    getPartCount(xmlData: any): number | null;
    getExecutionStatus(xmlData: any): string | null;
    getProgramNumber(xmlData: any): string | null;
    calculateCycleTime(currentCount: number, previousCount: number, currentTime: Date, previousTime: Date): number | null;
    getDataItemId(): string;
    getCycleTimeFormat(): 'AVERAGE' | 'ACTUAL';
    private findPathComponent;
}
