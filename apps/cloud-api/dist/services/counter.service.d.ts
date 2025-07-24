import { Model } from 'mongoose';
import { MachineCounterDocument } from '../schemas/machine-counter.schema';
import { MachineCounterDto } from '../dto/machine-counter.dto';
export declare class CounterService {
    private counterModel;
    constructor(counterModel: Model<MachineCounterDocument>);
    create(dto: MachineCounterDto): Promise<any>;
    find(machineId?: string, from?: Date, to?: Date): Promise<any>;
}
