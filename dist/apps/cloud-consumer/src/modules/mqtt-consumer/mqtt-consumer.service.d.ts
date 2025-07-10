import { OnModuleInit } from '@nestjs/common';
import { DataStorageService } from '../data-storage/data-storage.service';
import { EdgeGatewayDataDto, AdamDataDto } from '@mtconnect/common-dto';
export declare class MqttConsumerService implements OnModuleInit {
    private readonly dataStorageService;
    private readonly logger;
    constructor(dataStorageService: DataStorageService);
    onModuleInit(): void;
    handleMachineData(data: EdgeGatewayDataDto): Promise<void>;
    handleAdamData(data: AdamDataDto): Promise<void>;
    handleStatusMessage(data: any): Promise<void>;
}
