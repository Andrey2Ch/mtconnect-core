import { IsString, IsDateString, IsOptional } from 'class-validator';

export class MqttMessageDto {
  @IsString()
  topic: string;

  @IsString()
  messageId: string;

  @IsDateString()
  timestamp: string;

  @IsString()
  payload: string;

  @IsOptional()
  @IsString()
  qos?: string;

  @IsOptional()
  @IsString()
  retain?: string;

  @IsOptional()
  metadata?: {
    edgeGatewayId?: string;
    messageType?: string;
    version?: string;
  };
} 