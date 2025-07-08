export declare enum ExecutionStatus {
    ACTIVE = "ACTIVE",
    STOPPED = "STOPPED",
    INTERRUPTED = "INTERRUPTED",
    READY = "READY",
    UNAVAILABLE = "UNAVAILABLE"
}
export declare enum AvailabilityStatus {
    AVAILABLE = "AVAILABLE",
    UNAVAILABLE = "UNAVAILABLE"
}
export declare class AdamDataDto {
    digitalInputs?: Record<string, boolean>;
    digitalOutputs?: Record<string, boolean>;
    analogData?: Record<string, number>;
}
export declare class MachineDataValueDto {
    partCount?: number;
    cycleTime?: number;
    executionStatus?: ExecutionStatus;
    availability?: AvailabilityStatus;
    program?: string;
    block?: string;
    line?: string;
    adamData?: AdamDataDto;
}
export declare class MachineDataItemDto {
    machineId: string;
    machineName: string;
    timestamp: string;
    data: MachineDataValueDto;
}
export declare class EdgeGatewayDataDto {
    edgeGatewayId: string;
    timestamp: string;
    data: MachineDataItemDto[];
}
