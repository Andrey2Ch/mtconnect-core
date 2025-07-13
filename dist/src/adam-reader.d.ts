export interface AdamCounterData {
    channel: number;
    machineId: string;
    count: number;
    timestamp: string;
    cycleTimeMs?: number;
    partsInCycle?: number;
    confidence?: string;
}
interface CounterChangeEvent {
    timestamp: Date;
    count: number;
}
interface AdamCounterHistory {
    machineId: string;
    changes: CounterChangeEvent[];
    lastKnownCount: number;
    lastUpdateTime: Date;
}
export declare class AdamReader {
    private host;
    private port;
    private channelMapping;
    private counterHistories;
    private readonly MIN_PARTS_FOR_CALCULATION;
    private readonly MAX_HISTORY_SIZE;
    constructor(host?: string, port?: number);
    readCounters(): Promise<AdamCounterData[]>;
    private calculateCycleTime;
    testConnection(): Promise<boolean>;
    resetHistory(): void;
    getHistory(): Map<string, AdamCounterHistory>;
}
export {};
