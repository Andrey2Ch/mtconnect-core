interface MachineData {
    timestamp: string;
    programNumber: number;
    currentProgram: number;
    sequenceNumber: number;
    feedrate: number;
    spindleSpeed: number;
    positions: {
        X: {
            value: number;
            unit: string;
        };
        Y: {
            value: number;
            unit: string;
        };
        Z: {
            value: number;
            unit: string;
        };
    };
    status: {
        mode: number;
        automatic: number;
        running: number;
        motion: number;
        emergency: number;
        alarm: number;
    };
}
interface MTConnectAgent {
    name: string;
    port: number;
    url: string;
}
export declare class VisualFactoriesClient {
    private agents;
    constructor(remoteIP?: string);
    checkAgentStatus(agent: MTConnectAgent): Promise<boolean>;
    getRealTimeData(machineName: string): Promise<MachineData | null>;
    private fetchMTConnectData;
    private parseMTConnectXML;
    getAllMachineData(): Promise<{
        [machineName: string]: MachineData | null;
    }>;
    getWorkingAgents(): Promise<MTConnectAgent[]>;
    findWorkingAgentsInNetwork(): Promise<MTConnectAgent[]>;
}
export {};
