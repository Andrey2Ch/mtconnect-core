import { 
  IsString, 
  IsArray, 
  IsDateString, 
  ValidateNested, 
  IsOptional, 
  IsNumber,
  IsEnum,
  Min,
  Max,
  IsObject,
  IsNotEmpty,
  Length,
  Matches
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Enums for machine statuses
export enum ExecutionStatus {
  ACTIVE = 'ACTIVE',
  STOPPED = 'STOPPED',
  INTERRUPTED = 'INTERRUPTED',
  READY = 'READY',
  UNAVAILABLE = 'UNAVAILABLE'
}

export enum AvailabilityStatus {
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE = 'UNAVAILABLE'
}

// ADAM Data validation
export class AdamDataDto {
  @IsOptional()
  @IsObject({ message: 'ADAM digital inputs must be an object' })
  digitalInputs?: Record<string, boolean>;

  @IsOptional()
  @IsObject({ message: 'ADAM digital outputs must be an object' })
  digitalOutputs?: Record<string, boolean>;

  @IsOptional()
  @IsObject({ message: 'ADAM analog data must be an object' })
  analogData?: Record<string, number>;
}

// Define MachineDataValueDto BEFORE MachineDataItemDto
export class MachineDataValueDto {
  @IsOptional()
  @IsNumber({}, { message: 'Part count must be a valid number' })
  @Min(0, { message: 'Part count cannot be negative' })
  @Max(999999, { message: 'Part count cannot exceed 999,999' })
  @Transform(({ value }) => Math.floor(Number(value)), { toClassOnly: true })
  partCount?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Cycle time must be a valid number' })
  @Min(0, { message: 'Cycle time cannot be negative' })
  @Max(86400, { message: 'Cycle time cannot exceed 24 hours (86400 seconds)' })
  @Transform(({ value }) => Math.round(Number(value) * 100) / 100, { toClassOnly: true })
  cycleTime?: number;

  @IsOptional()
  @IsEnum(ExecutionStatus, { 
    message: `Execution status must be one of: ${Object.values(ExecutionStatus).join(', ')}` 
  })
  @Transform(({ value }) => value?.toUpperCase(), { toClassOnly: true })
  executionStatus?: ExecutionStatus;

  @IsOptional()
  @IsEnum(AvailabilityStatus, { 
    message: `Availability must be one of: ${Object.values(AvailabilityStatus).join(', ')}` 
  })
  @Transform(({ value }) => value?.toUpperCase(), { toClassOnly: true })
  availability?: AvailabilityStatus;

  @IsOptional()
  @IsString({ message: 'Program must be a valid string' })
  @Length(0, 255, { message: 'Program name cannot exceed 255 characters' })
  @Transform(({ value }) => value?.trim(), { toClassOnly: true })
  program?: string;

  @IsOptional()
  @IsString({ message: 'Block must be a valid string' })
  @Length(0, 100, { message: 'Block cannot exceed 100 characters' })
  @Transform(({ value }) => value?.trim(), { toClassOnly: true })
  block?: string;

  @IsOptional()
  @IsString({ message: 'Line must be a valid string' })
  @Length(0, 100, { message: 'Line cannot exceed 100 characters' })
  @Transform(({ value }) => value?.trim(), { toClassOnly: true })
  line?: string;

  @IsOptional()
  @ValidateNested({ message: 'ADAM data must be a valid object structure' })
  @Type(() => AdamDataDto)
  adamData?: AdamDataDto;
}

// Now define MachineDataItemDto that uses MachineDataValueDto
export class MachineDataItemDto {
  @IsString({ message: 'Machine ID must be a valid string' })
  @IsNotEmpty({ message: 'Machine ID cannot be empty' })
  @Length(1, 50, { message: 'Machine ID must be between 1 and 50 characters' })
  machineId: string;

  @IsString({ message: 'Machine name must be a valid string' })
  @IsNotEmpty({ message: 'Machine name cannot be empty' })
  @Length(1, 100, { message: 'Machine name must be between 1 and 100 characters' })
  machineName: string;

  @IsDateString({}, { message: 'Timestamp must be a valid ISO date string' })
  @Transform(({ value }) => new Date(value).toISOString(), { toClassOnly: true })
  timestamp: string;

  @ValidateNested({ message: 'Machine data must be a valid object' })
  @Type(() => MachineDataValueDto)
  data: MachineDataValueDto;
}

export class EdgeGatewayDataDto {
  @IsString({ message: 'Edge Gateway ID must be a valid string' })
  @IsNotEmpty({ message: 'Edge Gateway ID cannot be empty' })
  @Length(1, 50, { message: 'Edge Gateway ID must be between 1 and 50 characters' })
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Edge Gateway ID can only contain letters, numbers, hyphens, and underscores' })
  edgeGatewayId: string;

  @IsDateString({}, { message: 'Timestamp must be a valid ISO date string' })
  @Transform(({ value }) => new Date(value).toISOString(), { toClassOnly: true })
  timestamp: string;

  @IsArray({ message: 'Data must be an array of machine data items' })
  @ValidateNested({ each: true, message: 'Each data item must be a valid machine data object' })
  @Type(() => MachineDataItemDto)
  @Transform(({ value }) => Array.isArray(value) ? value : [], { toClassOnly: true })
  data: MachineDataItemDto[];
} 