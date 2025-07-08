import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MachineDataDocument = MachineData & Document;

@Schema({ 
  collection: 'machine_data',
  timeseries: {
    timeField: 'timestamp',
    metaField: 'metadata',
    granularity: 'seconds', // seconds, minutes, hours для разных типов данных
    expireAfterSeconds: 90 * 24 * 60 * 60, // TTL: 90 дней
  }
})
export class MachineData {
  @Prop({ required: true, index: true })
  timestamp: Date;

  @Prop({ 
    type: {
      edgeGatewayId: { type: String, required: true, index: true },
      machineId: { type: String, required: true, index: true },
      machineName: { type: String, required: true },
      dataType: { 
        type: String, 
        enum: ['production', 'alarm', 'maintenance', 'performance', 'adam'],
        default: 'production',
        index: true
      },
      source: {
        type: String,
        enum: ['mtconnect', 'adam', 'manual', 'calculated'],
        default: 'mtconnect'
      },
    },
    required: true 
  })
  metadata: {
    edgeGatewayId: string;
    machineId: string;
    machineName: string;
    dataType: 'production' | 'alarm' | 'maintenance' | 'performance' | 'adam';
    source: 'mtconnect' | 'adam' | 'manual' | 'calculated';
  };

  @Prop({
    type: {
      // Производственные данные MTConnect
      partCount: Number,
      cycleTime: Number,
      executionStatus: {
        type: String,
        enum: ['ACTIVE', 'READY', 'STOPPED', 'UNAVAILABLE', 'INTERRUPTED', 'FEED_HOLD']
      },
      availability: {
        type: String,
        enum: ['AVAILABLE', 'UNAVAILABLE']
      },
      
      // Программные данные
      program: String,
      block: String,
      line: String,
      
      // ADAM-6050 данные  
      adamData: {
        digitalInputs: [Boolean],
        digitalOutputs: [Boolean],
        connectionStatus: String,
      },
      
      // Аларм данные
      alarmCode: String,
      alarmMessage: String,
      alarmSeverity: {
        type: String,
        enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL']
      },
      
      // Данные производительности
      oeePercent: Number,
      utilizationPercent: Number,
      efficiencyPercent: Number,
      
      // Данные обслуживания
      maintenanceType: {
        type: String,
        enum: ['preventive', 'corrective', 'predictive']
      },
      maintenanceDescription: String,
      downtime: Number, // в минутах
      
      // Дополнительные вычисленные метрики
      powerConsumption: Number, // кВт
      temperature: Number,      // °C
      vibration: Number,        // мм/с
      toolWearPercent: Number,  // %
      
      // Качество продукции
      qualityGrade: {
        type: String,
        enum: ['A', 'B', 'C', 'REJECT']
      },
      defectType: String,
      reworkRequired: Boolean,
      
      // Расширяемые пользовательские данные
      customData: Object,
    },
    required: true
  })
  data: {
    // Производственные данные
    partCount?: number;
    cycleTime?: number;
    executionStatus?: string;
    availability?: string;
    
    // Программные данные
    program?: string;
    block?: string;
    line?: string;
    
    // ADAM данные
    adamData?: {
      digitalInputs?: boolean[];
      digitalOutputs?: boolean[];
      connectionStatus?: string;
    };
    
    // Аларм данные
    alarmCode?: string;
    alarmMessage?: string;
    alarmSeverity?: string;
    
    // Производительность
    oeePercent?: number;
    utilizationPercent?: number;
    efficiencyPercent?: number;
    
    // Обслуживание
    maintenanceType?: string;
    maintenanceDescription?: string;
    downtime?: number;
    
    // Метрики
    powerConsumption?: number;
    temperature?: number;
    vibration?: number;
    toolWearPercent?: number;
    
    // Качество
    qualityGrade?: string;
    defectType?: string;
    reworkRequired?: boolean;
    
    // Расширяемые данные
    customData?: any;
  };

  @Prop({ default: Date.now, index: true })
  createdAt: Date;
}

export const MachineDataSchema = SchemaFactory.createForClass(MachineData);

// Составные индексы для эффективных TimeSeries запросов
MachineDataSchema.index({ 
  'metadata.machineId': 1, 
  timestamp: -1 
});

MachineDataSchema.index({ 
  'metadata.edgeGatewayId': 1, 
  timestamp: -1 
});

MachineDataSchema.index({ 
  'metadata.dataType': 1, 
  timestamp: -1 
});

MachineDataSchema.index({
  'metadata.machineId': 1,
  'metadata.dataType': 1,
  timestamp: -1
});

// Специальные индексы для алармов
MachineDataSchema.index({
  'data.alarmSeverity': 1,
  timestamp: -1
}, { 
  sparse: true,
  partialFilterExpression: { 'metadata.dataType': 'alarm' }
});

// Индексы для производственных данных  
MachineDataSchema.index({
  'data.executionStatus': 1,
  'metadata.machineId': 1,
  timestamp: -1
}, {
  sparse: true,
  partialFilterExpression: { 'metadata.dataType': 'production' }
});

// Индекс для качества продукции
MachineDataSchema.index({
  'data.qualityGrade': 1,
  'metadata.machineId': 1,
  timestamp: -1
}, {
  sparse: true,
  partialFilterExpression: { 'data.qualityGrade': { $exists: true } }
}); 