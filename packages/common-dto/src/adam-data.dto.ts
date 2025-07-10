import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';

export class AdamDataDto {
  @IsString()
  machineId: string;

  @IsString()
  machineName: string;

  @IsOptional()
  @IsNumber()
  counter?: number;

  @IsOptional()
  @IsNumber()
  cycleTime?: number;

  @IsOptional()
  @IsNumber()
  confidence?: number;

  @IsOptional()
  @IsArray()
  discreteInputs?: boolean[];

  @IsOptional()
  @IsArray()
  analogInputs?: number[];

  @IsOptional()
  metadata?: {
    lastCounterValue?: number;
    lastCounterTime?: string;
    calculationMethod?: string;
  };
} 