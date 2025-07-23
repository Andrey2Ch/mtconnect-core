import { Model } from 'mongoose';
import { MachineCounter, MachineCounterDocument } from '../schemas/machine-counter.schema';
import { MachineCounterDto } from '../dto/machine-counter.dto';
export declare class CounterService {
    private counterModel;
    constructor(counterModel: Model<MachineCounterDocument>);
    create(dto: MachineCounterDto): Promise<import("mongoose").Document<unknown, {}, MachineCounterDocument, {}> & MachineCounter & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    find(machineId?: string, from?: Date, to?: Date): Promise<(import("mongoose").FlattenMaps<MachineCounterDocument> & Required<{
        _id: import("mongoose").FlattenMaps<unknown>;
    }> & {
        __v: number;
    })[]>;
}
