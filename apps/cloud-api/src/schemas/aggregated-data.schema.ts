import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AggregatedDataDocument = AggregatedData & Document;

@Schema({
  collection: 'aggregated_data',
  timeseries: {
    timeField: 'timestamp',
    metaField: 'metadata',
    granularity: 'hours', // часовые агрегации
    expireAfterSeconds: 365 * 24 * 60 * 60, // TTL: 1 год для аналитики
  }
})
export class AggregatedData {
  @Prop({ required: true, index: true })
  timestamp: Date;

  @Prop({
    type: {
      machineId: { type: String, required: true, index: true },
      machineName: { type: String, required: true },
      edgeGatewayId: { type: String, required: true },
      aggregationPeriod: {
        type: String,
        enum: ['hour', 'day', 'week', 'month'],
        required: true,
        index: true
      },
      periodStart: { type: Date, required: true },
      periodEnd: { type: Date, required: true },
    },
    required: true
  })
  metadata: {
    machineId: string;
    machineName: string;
    edgeGatewayId: string;
    aggregationPeriod: 'hour' | 'day' | 'week' | 'month';
    periodStart: Date;
    periodEnd: Date;
  };

  @Prop({
    type: {
      // Производственные метрики
      production: {
        totalParts: { type: Number, default: 0 },
        goodParts: { type: Number, default: 0 },
        rejectedParts: { type: Number, default: 0 },
        avgCycleTime: Number,
        minCycleTime: Number,
        maxCycleTime: Number,
        totalCycles: { type: Number, default: 0 },
        qualityRate: Number, // процент качественных деталей
      },

      // Время работы и эффективность
      time: {
        totalTimeMinutes: { type: Number, default: 0 },
        activeTimeMinutes: { type: Number, default: 0 },
        idleTimeMinutes: { type: Number, default: 0 },
        downtimeMinutes: { type: Number, default: 0 },
        utilizationPercent: Number,
        efficiencyPercent: Number,
        oeePercent: Number, // Overall Equipment Effectiveness
      },

      // Статусы выполнения (сколько времени в каждом)
      executionStats: {
        activeMinutes: { type: Number, default: 0 },
        readyMinutes: { type: Number, default: 0 },
        stoppedMinutes: { type: Number, default: 0 },
        unavailableMinutes: { type: Number, default: 0 },
        interruptedMinutes: { type: Number, default: 0 },
        feedHoldMinutes: { type: Number, default: 0 },
      },

      // Аларм статистика
      alarms: {
        totalAlarms: { type: Number, default: 0 },
        criticalAlarms: { type: Number, default: 0 },
        errorAlarms: { type: Number, default: 0 },
        warningAlarms: { type: Number, default: 0 },
        infoAlarms: { type: Number, default: 0 },
        avgResolutionTimeMinutes: Number,
        mostFrequentAlarmCode: String,
        mostFrequentAlarmCount: Number,
      },

      // ADAM данные статистика
      adam: {
        totalReadings: { type: Number, default: 0 },
        connectionUptime: Number, // процент времени онлайн
        avgDigitalInputsActive: [Number], // среднее по каждому входу
        avgDigitalOutputsActive: [Number], // среднее по каждому выходу
        inputChangeCount: [Number], // количество изменений по входу
        outputChangeCount: [Number], // количество изменений по выходу
      },

      // Обслуживание
      maintenance: {
        preventiveMaintenanceMinutes: { type: Number, default: 0 },
        correctiveMaintenanceMinutes: { type: Number, default: 0 },
        predictiveMaintenanceMinutes: { type: Number, default: 0 },
        totalMaintenanceEvents: { type: Number, default: 0 },
        mtbf: Number, // Mean Time Between Failures (часы)
        mttr: Number, // Mean Time To Repair (часы)
      },

      // Энергопотребление и условия работы
      conditions: {
        avgPowerConsumption: Number, // кВт
        maxPowerConsumption: Number,
        minPowerConsumption: Number,
        totalEnergyConsumed: Number, // кВт⋅ч
        avgTemperature: Number, // °C
        maxTemperature: Number,
        minTemperature: Number,
        avgVibration: Number, // мм/с
        maxVibration: Number,
        toolWearProgression: Number, // изменение износа за период
      },

      // Программы и операции
      programs: {
        uniquePrograms: [String], // список уникальных программ
        mostUsedProgram: String,
        mostUsedProgramRuntime: Number, // минуты
        programSwitches: Number, // количество смен программ
        avgProgramRuntime: Number, // средняя длительность программы
      },

      // Качество и дефекты
      quality: {
        gradeACount: { type: Number, default: 0 },
        gradeBCount: { type: Number, default: 0 },
        gradeCCount: { type: Number, default: 0 },
        rejectCount: { type: Number, default: 0 },
        reworkCount: { type: Number, default: 0 },
        defectTypes: [{
          type: String,
          count: Number
        }],
        firstPassYield: Number, // процент деталей без переделки
      }
    },
    required: true
  })
  aggregatedData: {
    production: {
      totalParts: number;
      goodParts: number;
      rejectedParts: number;
      avgCycleTime?: number;
      minCycleTime?: number;
      maxCycleTime?: number;
      totalCycles: number;
      qualityRate?: number;
    };

    time: {
      totalTimeMinutes: number;
      activeTimeMinutes: number;
      idleTimeMinutes: number;
      downtimeMinutes: number;
      utilizationPercent?: number;
      efficiencyPercent?: number;
      oeePercent?: number;
    };

    executionStats: {
      activeMinutes: number;
      readyMinutes: number;
      stoppedMinutes: number;
      unavailableMinutes: number;
      interruptedMinutes: number;
      feedHoldMinutes: number;
    };

    alarms: {
      totalAlarms: number;
      criticalAlarms: number;
      errorAlarms: number;
      warningAlarms: number;
      infoAlarms: number;
      avgResolutionTimeMinutes?: number;
      mostFrequentAlarmCode?: string;
      mostFrequentAlarmCount?: number;
    };

    adam: {
      totalReadings: number;
      connectionUptime?: number;
      avgDigitalInputsActive?: number[];
      avgDigitalOutputsActive?: number[];
      inputChangeCount?: number[];
      outputChangeCount?: number[];
    };

    maintenance: {
      preventiveMaintenanceMinutes: number;
      correctiveMaintenanceMinutes: number;
      predictiveMaintenanceMinutes: number;
      totalMaintenanceEvents: number;
      mtbf?: number;
      mttr?: number;
    };

    conditions: {
      avgPowerConsumption?: number;
      maxPowerConsumption?: number;
      minPowerConsumption?: number;
      totalEnergyConsumed?: number;
      avgTemperature?: number;
      maxTemperature?: number;
      minTemperature?: number;
      avgVibration?: number;
      maxVibration?: number;
      toolWearProgression?: number;
    };

    programs: {
      uniquePrograms?: string[];
      mostUsedProgram?: string;
      mostUsedProgramRuntime?: number;
      programSwitches?: number;
      avgProgramRuntime?: number;
    };

    quality: {
      gradeACount: number;
      gradeBCount: number;
      gradeCCount: number;
      rejectCount: number;
      reworkCount: number;
      defectTypes?: Array<{
        type: string;
        count: number;
      }>;
      firstPassYield?: number;
    };
  };

  @Prop({ default: Date.now, index: true })
  createdAt: Date;

  @Prop()
  lastUpdated?: Date;
}

export const AggregatedDataSchema = SchemaFactory.createForClass(AggregatedData);

// Составные индексы для эффективных запросов агрегаций
AggregatedDataSchema.index({
  'metadata.machineId': 1,
  'metadata.aggregationPeriod': 1,
  timestamp: -1
});

AggregatedDataSchema.index({
  'metadata.edgeGatewayId': 1,
  'metadata.aggregationPeriod': 1,
  timestamp: -1
});

AggregatedDataSchema.index({
  'metadata.aggregationPeriod': 1,
  'metadata.periodStart': 1,
  'metadata.periodEnd': 1
});

// Уникальный индекс предотвращает дублирование агрегаций
AggregatedDataSchema.index({
  'metadata.machineId': 1,
  'metadata.aggregationPeriod': 1,
  'metadata.periodStart': 1
}, { unique: true });

// Индексы для поиска по производственным метрикам
AggregatedDataSchema.index({
  'aggregatedData.production.totalParts': -1,
  'metadata.aggregationPeriod': 1
});

AggregatedDataSchema.index({
  'aggregatedData.time.oeePercent': -1,
  'metadata.aggregationPeriod': 1
});

// Индекс для поиска машин с алармами
AggregatedDataSchema.index({
  'aggregatedData.alarms.totalAlarms': -1,
  timestamp: -1
}, {
  partialFilterExpression: { 'aggregatedData.alarms.totalAlarms': { $gt: 0 } }
}); 