import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MachineStateDocument = MachineState & Document;

@Schema({ collection: 'machine_states' })
export class MachineState {
  @Prop({ required: true, unique: true, index: true })
  machineId: string;

  // Время простоя
  @Prop({ default: 0 })
  idleTimeMinutes: number;

  @Prop({ default: () => new Date().toISOString() })
  lastActiveTime: string;

  // Производственные счетчики деталей
  @Prop({ default: 0 })
  basePartCount: number;

  @Prop({ default: 0 })
  productionPartCount: number;

  @Prop({ default: 0 })
  lastPartCount: number;

  @Prop({ default: () => new Date().toISOString() })
  timestamp: string;
}

export const MachineStateSchema = SchemaFactory.createForClass(MachineState);