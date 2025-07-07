import { IsString, IsArray, IsDateString, ValidateNested, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class MachineDataValueDto {
  @IsOptional()
  @IsNumber()
  partCount?: number;

  @IsOptional()
  @IsNumber()
  cycleTime?: number;

  @IsOptional()
  @IsString()
  executionStatus?: string;

  @IsOptional()
  @IsString()
  availability?: string;

  @IsOptional()
  @IsString()
  program?: string;

  @IsOptional()
  @IsString()
  block?: string;

  @IsOptional()
  @IsString()
  line?: string;

  @IsOptional()
  adamData?: any;
}

export class MachineDataItemDto {
  @IsString()
  machineId: string;

  @IsString()
  machineName: string;

  @IsDateString()
  timestamp: string;

  @ValidateNested()
  @Type(() => MachineDataValueDto)
  data: MachineDataValueDto;
}

export class EdgeGatewayDataDto {
  @IsString()
  edgeGatewayId: string;

  @IsDateString()
  timestamp: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MachineDataItemDto)
  data: MachineDataItemDto[];
} 