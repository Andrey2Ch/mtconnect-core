import { Model } from 'mongoose';
import { MachineConfiguration } from '../schemas/machine-configuration.schema';
import { MachineState } from '../schemas/machine-state.schema';
import { MachineData } from '../schemas/machine-data.schema';
import { AggregatedData } from '../schemas/aggregated-data.schema';
export declare class TestDatabaseController {
    private machineConfigModel;
    private machineStateModel;
    private machineDataModel;
    private aggregatedDataModel;
    constructor(machineConfigModel: Model<MachineConfiguration>, machineStateModel: Model<MachineState>, machineDataModel: Model<MachineData>, aggregatedDataModel: Model<AggregatedData>);
    createMachineConfig(configData: any): Promise<{
        success: boolean;
        message: string;
        data: import("mongoose").Document<unknown, {}, MachineConfiguration, {}> & MachineConfiguration & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        };
    }>;
    getMachineConfig(machineId: string): Promise<{
        success: boolean;
        data: import("mongoose").Document<unknown, {}, MachineConfiguration, {}> & MachineConfiguration & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        };
    }>;
    createMachineState(stateData: any): Promise<{
        success: boolean;
        message: string;
        data: import("mongoose").Document<unknown, {}, MachineState, {}> & MachineState & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        };
    }>;
    getMachineState(machineId: string): Promise<{
        success: boolean;
        data: import("mongoose").Document<unknown, {}, MachineState, {}> & MachineState & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        };
    }>;
    createMachineData(machineDataBody: any): Promise<{
        success: boolean;
        message: string;
        data: import("mongoose").Document<unknown, {}, MachineData, {}> & MachineData & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        };
    }>;
    getMachineData(machineId: string): Promise<{
        success: boolean;
        data: (import("mongoose").Document<unknown, {}, MachineData, {}> & MachineData & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        })[];
    }>;
    createAggregatedData(aggregatedDataBody: any): Promise<{
        success: boolean;
        message: string;
        data: import("mongoose").Document<unknown, {}, AggregatedData, {}> & AggregatedData & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        };
    }>;
    getAggregatedData(machineId: string): Promise<{
        success: boolean;
        data: (import("mongoose").Document<unknown, {}, AggregatedData, {}> & AggregatedData & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        })[];
    }>;
    getDatabaseStatus(): Promise<{
        success: boolean;
        message: string;
        data: {
            machine_configurations: number;
            machine_states: number;
            machine_data: number;
            aggregated_data: number;
            total_documents: number;
        };
    }>;
}
