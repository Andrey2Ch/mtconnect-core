import { ClientProxy } from '@nestjs/microservices';
import { EdgeGatewayDataDto } from '@mtconnect/common-dto';
export declare class MqttService {
    private readonly mqttClient;
    private readonly logger;
    constructor(mqttClient: ClientProxy);
    publishMachineData(data: EdgeGatewayDataDto): Promise<void>;
    publishHeartbeat(edgeGatewayId: string): Promise<void>;
}
