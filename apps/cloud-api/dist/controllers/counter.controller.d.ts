import { CounterService } from '../services/counter.service';
import { MachineCounterDto } from '../dto/machine-counter.dto';
export declare class CounterController {
    private readonly counterService;
    constructor(counterService: CounterService);
    create(dto: MachineCounterDto): Promise<import("mongoose").Document<unknown, {}, import("../schemas/machine-counter.schema").MachineCounterDocument, {}> & import("../schemas/machine-counter.schema").MachineCounter & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    list(machineId?: string, from?: string, to?: string): Promise<(import("mongoose").FlattenMaps<import("../schemas/machine-counter.schema").MachineCounterDocument> & Required<{
        _id: import("mongoose").FlattenMaps<unknown>;
    }> & {
        __v: number;
    })[]>;
}
