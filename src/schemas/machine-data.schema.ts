import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MachineDataDocument = MachineData & Document;

@Schema({ 
  collection: 'machine_data',
  timeseries: {
    timeField: 'timestamp',
    metaField: 'metadata',
    granularity: 'seconds'
  }
})
export class MachineData {
  @Prop({ required: true })
  timestamp: Date;

  @Prop({ 
    type: {
      edgeGatewayId: String,
      machineId: String,
      machineName: String,
    },
    required: true 
  })
  metadata: {
    edgeGatewayId: string;
    machineId: string;
    machineName: string;
  };

  @Prop({
    type: {
      partCount: Number,
      cycleTime: Number,
      executionStatus: String,
      availability: String,
      program: String,
      block: String,
      line: String,
      adamData: Object,
    },
    required: true
  })
  data: {
    partCount?: number;
    cycleTime?: number;
    executionStatus?: string;
    availability?: string;
    program?: string;
    block?: string;
    line?: string;
    adamData?: any;
  };

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const MachineDataSchema = SchemaFactory.createForClass(MachineData); 