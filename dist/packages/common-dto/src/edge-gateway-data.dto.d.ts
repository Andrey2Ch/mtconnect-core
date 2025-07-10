export declare class MachineDataValueDto {
    partCount?: number;
    cycleTime?: number;
    executionStatus?: string;
    availability?: string;
    program?: string;
    block?: string;
    line?: string;
    adamData?: any;
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
