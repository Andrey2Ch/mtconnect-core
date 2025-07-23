import { CounterService } from '../services/counter.service';
import { MachineCounterDto } from '../dto/machine-counter.dto';
export declare class CounterController {
    private readonly counterService;
    constructor(counterService: CounterService);
    create(dto: MachineCounterDto): Promise<any>;
    list(machineId?: string, from?: string, to?: string): Promise<any>;
}
