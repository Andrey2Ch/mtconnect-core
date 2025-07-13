interface MachineConfig {
    id: string;
    name: string;
    ip: string;
    port: number;
    type: string;
    mtconnectAgentUrl: string;
    uuid: string;
    spindles: string[];
    axes: string[];
}
interface Config {
    machines: MachineConfig[];
    settings: {
        serverPort: number;
        dataUpdateInterval: number;
        connectionTimeout: number;
        maxRetries: number;
        debugDetails: boolean;
    };
}
export declare class MachineManager {
    private configPath;
    constructor(configPath?: string);
    loadConfig(): Config;
    saveConfig(config: Config): void;
    testMachineConnection(ip: string, port?: number, timeout?: number): Promise<boolean>;
    scanNetwork(baseIp?: string, startRange?: number, endRange?: number): Promise<string[]>;
    addMachine(machineData: Partial<MachineConfig>): void;
    removeMachine(machineId: string): void;
    updateMachine(machineId: string, updates: Partial<MachineConfig>): void;
    validateAllMachines(): Promise<{
        online: string[];
        offline: string[];
    }>;
    private generateAgentUrl;
    listMachines(): MachineConfig[];
    exportConfig(outputPath: string): void;
    importConfig(inputPath: string): void;
}
export declare function runMachineManagerCLI(): Promise<void>;
export {};
