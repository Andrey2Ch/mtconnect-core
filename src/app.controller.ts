import { Controller, Get, Inject } from '@nestjs/common';
import { AppService } from './app.service';
import { SHDRManager, SHDRDataItem } from './shdr-client';

@Controller('/api')
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject(SHDRManager) private readonly shdrManager: SHDRManager,
    @Inject('FANUC_MACHINES') private readonly fanucMachines: any[],
    @Inject('ADAM_MACHINES') private readonly adamMachines: any[],
  ) {}

  @Get('machines')
  getMachineData() {
    const mtconnectMachines = this.fanucMachines.map(machine => {
      const isConnected = this.shdrManager.getMachineConnectionStatus(machine.id);
      const machineData = this.shdrManager.getMachineData(machine.id);
      
      const getVal = (key: string) => machineData?.get(key)?.value || 'UNAVAILABLE'; // ✅ ИСПРАВЛЕНО: было 'N/A'

      return {
        id: machine.id,
        name: machine.name,
        ip: machine.ip,
        port: machine.port,
        type: machine.type,
        connectionStatus: isConnected ? 'active' : 'inactive',
        status: getVal('availability'),
        execution: getVal('execution'),
        partCount: getVal('partCount'),
        program: getVal('program'),
      };
    });

    const summary = {
      total: this.fanucMachines.length + this.adamMachines.length,
      mtconnect: {
        total: this.fanucMachines.length,
        online: mtconnectMachines.filter(m => m.connectionStatus === 'active').length,
        offline: mtconnectMachines.filter(m => m.connectionStatus !== 'active').length,
      },
      adam: {
        total: this.adamMachines.length,
        online: 0, // ADAM logic not implemented yet
        offline: this.adamMachines.length,
      },
    };

    return {
      timestamp: new Date().toISOString(),
      summary,
      machines: {
        mtconnect: mtconnectMachines,
        adam: this.adamMachines, // Placeholder
      },
    };
  }
} 