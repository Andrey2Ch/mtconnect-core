export declare class AdamDataDto {
    machineId: string;
    machineName: string;
    counter?: number;
    cycleTime?: number;
    confidence?: number;
    discreteInputs?: boolean[];
    analogInputs?: number[];
    metadata?: {
        lastCounterValue?: number;
        lastCounterTime?: string;
        calculationMethod?: string;
    };
}
