import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MachineConfigurationDocument = MachineConfiguration & Document;

@Schema({
  collection: 'machine_configurations',
  timestamps: true, // автоматически добавляет createdAt и updatedAt
})
export class MachineConfiguration {
  @Prop({ required: true, unique: true, index: true })
  machineId: string;

  @Prop({ required: true })
  machineName: string;

  @Prop({ required: true })
  manufacturer: string;

  @Prop({ required: true })
  model: string;

  @Prop({ required: true })
  serialNumber: string;

  @Prop({
    type: {
      ip: String,
      port: Number,
      mtconnectAgentUrl: String,
      adamIp: String,
      adamPort: Number,
    },
    required: true,
  })
  networkConfig: {
    ip: string;
    port: number;
    mtconnectAgentUrl: string;
    adamIp?: string;
    adamPort?: number;
  };

  @Prop({
    type: {
      dataRetentionDays: { type: Number, default: 30 },
      pollingIntervalMs: { type: Number, default: 5000 },
      enabledDataItems: [String],
      customAttributes: Object,
    },
    default: {},
  })
  settings: {
    dataRetentionDays?: number;
    pollingIntervalMs?: number;
    enabledDataItems?: string[];
    customAttributes?: Record<string, any>;
  };

  @Prop({
    type: {
      latitude: Number,
      longitude: Number,
      building: String,
      floor: String,
      line: String,
      cell: String,
    },
  })
  location?: {
    latitude?: number;
    longitude?: number;
    building?: string;
    floor?: string;
    line?: string;
    cell?: string;
  };

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: Date.now })
  lastConfigUpdate: Date;
}

export const MachineConfigurationSchema = SchemaFactory.createForClass(MachineConfiguration);

// Индексы для быстрого поиска
MachineConfigurationSchema.index({ machineId: 1 });
MachineConfigurationSchema.index({ isActive: 1 });
MachineConfigurationSchema.index({ 'location.building': 1, 'location.line': 1 });
MachineConfigurationSchema.index({ manufacturer: 1, model: 1 }); 