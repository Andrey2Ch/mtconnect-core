import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MachineDataDocument = MachineData & Document;

@Schema({ timestamps: true })
export class MachineData {
  @Prop({ required: true })
  timestamp: string;

  @Prop({
    type: {
      edgeGatewayId: { type: String, required: true },
      machineId: { type: String, required: true },
      machineName: { type: String, required: true },
      machineType: { type: String, required: true }
    },
    required: true
  })
  metadata: {
    edgeGatewayId: string;
    machineId: string;
    machineName: string;
    machineType: string;
  };

  @Prop({
    type: {
      partCount: { type: Number },
      program: { type: String },
      cycleTime: { type: Number },
      cycleTimeConfidence: { type: String },
      executionStatus: { type: String },
      idleTimeMinutes: { type: Number }  // 🕒 ВРЕМЯ ПРОСТОЯ!
    },
    required: true
  })
  data: {
    partCount?: number;
    program?: string;
    cycleTime?: number;
    cycleTimeConfidence?: string;
    executionStatus?: string;
    idleTimeMinutes?: number;  // 🕒 ВРЕМЯ ПРОСТОЯ!
    [key: string]: any;
  };
}

export const MachineDataSchema = SchemaFactory.createForClass(MachineData);

// Добавляем индексы для быстрого поиска
MachineDataSchema.index({ 'metadata.machineId': 1, timestamp: -1 });
MachineDataSchema.index({ 'metadata.edgeGatewayId': 1, timestamp: -1 }); 