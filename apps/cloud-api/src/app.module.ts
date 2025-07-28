import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SHDRManager } from './shdr-client';
import * as fs from 'fs';
import * as path from 'path';

// Загружаем конфигурацию из корня проекта
const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../config.json'), 'utf-8'));

// Создаем SHDR менеджер (адаптеры работают по SHDR, не HTTP)
const shdrManager = new SHDRManager();

// Добавляем машины в SHDR менеджер
config.machines.forEach(machine => {
  if (machine.type === 'FANUC') {
    console.log(`🔧 Настройка SHDR подключения для ${machine.name} (localhost:${machine.port})`);
    shdrManager.addMachine({
      ip: 'localhost',
      port: machine.port,
      machineId: machine.id,
      machineName: machine.name,
    });
  }
});

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: SHDRManager,
      useValue: shdrManager,
    },
    {
      provide: 'FANUC_MACHINES',
      useValue: config.machines.filter(m => m.type === 'FANUC'),
    },
    {
      provide: 'ADAM_MACHINES', 
      useValue: [],
    },
  ],
})
export class AppModule {}
