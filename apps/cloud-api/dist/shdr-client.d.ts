import { EventEmitter } from 'events';
export interface SHDRDataItem {
    timestamp: string;
    device: string;
    dataItem: string;
    value: string;
}
export interface SHDRConnectionConfig {
    ip: string;
    port: number;
    machineId: string;
    machineName: string;
    reconnectInterval?: number;
    timeout?: number;
}
export declare class SHDRClient extends EventEmitter {
    private socket;
    private config;
    private reconnectTimer;
    private isConnected;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private buffer;
    private partCountHistory;
    constructor(config: SHDRConnectionConfig);
    connect(): void;
    private handleData;
    private parseSHDRLine;
    private handleDisconnect;
    disconnect(): void;
    getConnectionStatus(): boolean;
    getReconnectAttempts(): number;
    getCycleTimeData(): {
        cycleTimeMs?: number;
        partsInCycle: number;
        confidence: string;
    };
    private calculateCycleTime;
    private updatePartCountHistory;
}
export declare class SHDRManager extends EventEmitter {
    private clients;
    private dataStore;
    addMachine(config: SHDRConnectionConfig): void;
    private updateDataStore;
    getMachineData(machineId: string): Map<string, SHDRDataItem> | undefined;
    getMachineCycleTime(machineId: string): {
        cycleTimeMs?: number;
        partsInCycle: number;
        confidence: string;
    } | undefined;
    getAllMachinesData(): Map<string, Map<string, SHDRDataItem>>;
    getMachineConnectionStatus(machineId: string): boolean;
    getAllConnectionStatuses(): Map<string, boolean>;
    disconnectAll(): void;
    getConnectedMachinesCount(): number;
    convertToMTConnectFormat(machineId: string): any;
    private capitalizeFirst;
}
