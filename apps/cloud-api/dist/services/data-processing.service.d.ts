import { Model } from 'mongoose';
import { MachineData } from '../schemas/machine-data.schema';
import { AggregatedData } from '../schemas/aggregated-data.schema';
import { DataEventsGateway } from '../gateways/data-events.gateway';
import { AlertingService } from './alerting.service';
export declare class DataProcessingService {
    private machineDataModel;
    private aggregatedDataModel;
    private dataEventsGateway;
    private alertingService;
    private readonly logger;
    constructor(machineDataModel: Model<MachineData>, aggregatedDataModel: Model<AggregatedData>, dataEventsGateway: DataEventsGateway, alertingService: AlertingService);
    processIncomingData(data: any): Promise<any>;
    aggregateHourlyData(machineId: string): Promise<void>;
    aggregateDailyData(machineId: string): Promise<void>;
    private triggerAggregation;
}
