import { IsString, IsDateString, IsOptional, IsNumber } from 'class-validator';

export class MachineDataDto {
  @IsString()
  machineId: string;

  @IsString()
  machineName: string;

  @IsDateString()
  timestamp: string;

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
} 