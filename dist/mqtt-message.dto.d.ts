export declare class MqttMessageDto {
    topic: string;
    messageId: string;
    timestamp: string;
    payload: string;
    qos?: string;
    retain?: string;
    metadata?: {
        edgeGatewayId?: string;
        messageType?: string;
        version?: string;
    };
}
