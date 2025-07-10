import { Document } from 'mongoose';
export type AggregatedDataDocument = AggregatedData & Document;
export declare class AggregatedData {
    timestamp: Date;
    metadata: {
        machineId: string;
        machineName: string;
        edgeGatewayId: string;
        aggregationPeriod: 'hour' | 'day' | 'week' | 'month';
        periodStart: Date;
        periodEnd: Date;
    };
    aggregatedData: {
        production: {
            totalParts: number;
            goodParts: number;
            rejectedParts: number;
            avgCycleTime?: number;
            minCycleTime?: number;
            maxCycleTime?: number;
            totalCycles: number;
            qualityRate?: number;
        };
        time: {
            totalTimeMinutes: number;
            activeTimeMinutes: number;
            idleTimeMinutes: number;
            downtimeMinutes: number;
            utilizationPercent?: number;
            efficiencyPercent?: number;
            oeePercent?: number;
        };
        executionStats: {
            activeMinutes: number;
            readyMinutes: number;
            stoppedMinutes: number;
            unavailableMinutes: number;
            interruptedMinutes: number;
            feedHoldMinutes: number;
        };
        alarms: {
            totalAlarms: number;
            criticalAlarms: number;
            errorAlarms: number;
            warningAlarms: number;
            infoAlarms: number;
            avgResolutionTimeMinutes?: number;
            mostFrequentAlarmCode?: string;
            mostFrequentAlarmCount?: number;
        };
        adam: {
            totalReadings: number;
            connectionUptime?: number;
            avgDigitalInputsActive?: number[];
            avgDigitalOutputsActive?: number[];
            inputChangeCount?: number[];
            outputChangeCount?: number[];
        };
        maintenance: {
            preventiveMaintenanceMinutes: number;
            correctiveMaintenanceMinutes: number;
            predictiveMaintenanceMinutes: number;
            totalMaintenanceEvents: number;
            mtbf?: number;
            mttr?: number;
        };
        conditions: {
            avgPowerConsumption?: number;
            maxPowerConsumption?: number;
            minPowerConsumption?: number;
            totalEnergyConsumed?: number;
            avgTemperature?: number;
            maxTemperature?: number;
            minTemperature?: number;
            avgVibration?: number;
            maxVibration?: number;
            toolWearProgression?: number;
        };
        programs: {
            uniquePrograms?: string[];
            mostUsedProgram?: string;
            mostUsedProgramRuntime?: number;
            programSwitches?: number;
            avgProgramRuntime?: number;
        };
        quality: {
            gradeACount: number;
            gradeBCount: number;
            gradeCCount: number;
            rejectCount: number;
            reworkCount: number;
            defectTypes?: Array<{
                type: string;
                count: number;
            }>;
            firstPassYield?: number;
        };
    };
    createdAt: Date;
    lastUpdated?: Date;
}
export declare const AggregatedDataSchema: import("mongoose").Schema<AggregatedData, import("mongoose").Model<AggregatedData, any, any, any, Document<unknown, any, AggregatedData, any> & AggregatedData & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AggregatedData, Document<unknown, {}, import("mongoose").FlatRecord<AggregatedData>, {}> & import("mongoose").FlatRecord<AggregatedData> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
