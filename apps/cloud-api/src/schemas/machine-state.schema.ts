import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MachineStateDocument = MachineState & Document;

@Schema({
  collection: 'machine_states',
  timestamps: true,
})
export class MachineState {
  @Prop({ required: true, unique: true, index: true })
  machineId: string;

  @Prop({ required: true })
  machineName: string;

  @Prop({ required: true })
  edgeGatewayId: string;

  // Текущий статус выполнения
  @Prop({
    type: String,
    enum: ['ACTIVE', 'READY', 'STOPPED', 'UNAVAILABLE', 'INTERRUPTED', 'FEED_HOLD'],
    default: 'UNAVAILABLE',
    index: true,
  })
  executionStatus: string;

  @Prop({
    type: String,
    enum: ['AVAILABLE', 'UNAVAILABLE'],
    default: 'UNAVAILABLE',
    index: true,
  })
  availability: string;

  // Производственные данные
  @Prop({ type: Number, default: 0 })
  partCount: number;

  @Prop({ type: Number }) // в секундах
  lastCycleTime?: number;

  @Prop({ type: Number }) // в секундах
  averageCycleTime?: number;

  @Prop({ type: Number, default: 0 })
  totalCycleCount: number;

  // Программа и блок
  @Prop({ type: String })
  currentProgram?: string;

  @Prop({ type: String })
  currentBlock?: string;

  @Prop({ type: String })
  currentLine?: string;

  // ADAM данные (последние)
  @Prop({
    type: {
      digitalInputs: [Boolean],
      digitalOutputs: [Boolean],
      connectionStatus: String,
      lastAdamUpdate: Date,
    },
  })
  adamData?: {
    digitalInputs?: boolean[];
    digitalOutputs?: boolean[];
    connectionStatus?: string;
    lastAdamUpdate?: Date;
  };

  // Алармы и предупреждения
  @Prop({
    type: [{
      code: String,
      message: String,
      severity: { type: String, enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'] },
      timestamp: Date,
      acknowledged: { type: Boolean, default: false },
    }],
    default: [],
  })
  activeAlarms: Array<{
    code: string;
    message: string;
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    timestamp: Date;
    acknowledged: boolean;
  }>;

  // Статистика по производительности
  @Prop({
    type: {
      utilizationPercent: Number, // процент использования
      efficiencyPercent: Number,  // эффективность
      oeePercent: Number,         // Overall Equipment Effectiveness
      plannedProductionTime: Number, // запланированное время работы (мин)
      actualProductionTime: Number,  // фактическое время работы (мин)
      downtimeMinutes: Number,       // время простоя (мин)
    },
  })
  performance?: {
    utilizationPercent?: number;
    efficiencyPercent?: number;
    oeePercent?: number;
    plannedProductionTime?: number;
    actualProductionTime?: number;
    downtimeMinutes?: number;
  };

  // Метки времени
  @Prop({ required: true, index: true })
  lastDataUpdate: Date;

  @Prop({ default: Date.now })
  lastStatusChange: Date;

  @Prop()
  connectionLostAt?: Date;

  @Prop({ default: true, index: true })
  isOnline: boolean;
}

export const MachineStateSchema = SchemaFactory.createForClass(MachineState);

// Составные индексы для эффективных запросов
MachineStateSchema.index({ machineId: 1 });
MachineStateSchema.index({ executionStatus: 1, availability: 1 });
MachineStateSchema.index({ isOnline: 1, lastDataUpdate: -1 });
MachineStateSchema.index({ edgeGatewayId: 1, isOnline: 1 });
MachineStateSchema.index({ 'activeAlarms.severity': 1 }, { sparse: true });

// TTL индекс для автоматического удаления неактивных машин через 7 дней
MachineStateSchema.index(
  { lastDataUpdate: 1 },
  {
    expireAfterSeconds: 7 * 24 * 60 * 60, // 7 дней
    partialFilterExpression: { isOnline: false }
  }
); 