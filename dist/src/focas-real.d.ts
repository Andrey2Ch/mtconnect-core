export interface FocasConnectionResult {
    success: boolean;
    handle?: number;
    errorCode?: number;
}
export interface FocasMachineData {
    success: boolean;
    programNumber?: number;
    sequenceNumber?: number;
    feedrate?: number;
    spindleSpeed?: number;
    positions?: {
        x: number;
        y: number;
        z: number;
    };
    status?: {
        alarm: number;
        emergency: boolean;
        running: boolean;
    };
    error?: boolean;
    errorCode?: number;
}
export interface FocasData {
    machineId: string;
    status: {
        running: boolean;
        feedrate: number;
        spindleSpeed: number;
        toolNumber: number;
        programNumber: number;
        mode: string;
        alarms: string[];
        position: {
            x: number;
            y: number;
            z: number;
        };
    };
    timestamp: number;
}
export declare enum FocasStatus {
    STOP = 0,
    HOLD = 1,
    RUN = 2,
    MSTR = 3,
    EDIT = 4,
    MDI = 5,
    TEACH = 6,
    JOG = 7,
    TJOG = 8,
    HJOG = 9
}
export declare class RealFocasClient {
    private handles;
    private dllPath;
    private isInitialized;
    constructor();
    private initializeAddon;
    isAvailable(): boolean;
    connect(ip: string, port?: number): Promise<FocasConnectionResult>;
    disconnect(ip: string): Promise<boolean>;
    readMachineData(ip: string): Promise<FocasMachineData>;
    getMachineData(machineId: string, ip: string, port?: number): Promise<FocasData>;
    private getMachineDataViaAddon;
    private getMachineDataViaProcess;
    private executeLadder99Driver;
    private executeQuickFocasDriver;
    private parseProcessOutput;
    private parseLadder99Output;
    private getErrorResult;
    private determineRunningStatus;
    private getModeString;
    testConnection(ip: string, port?: number): Promise<boolean>;
    disconnectAll(): void;
}
export declare const realFocasClient: RealFocasClient;
export default realFocasClient;
