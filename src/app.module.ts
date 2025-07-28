import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SHDRManager } from './shdr-client';
import * as fs from 'fs';
import * as path from 'path';

// Загружаем конфигурацию из корня проекта
const configPath = path.resolve(__dirname, '../../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const { FANUC_MACHINES, ADAM_MACHINES } = config;

// Создаем SHDR менеджер (адаптеры работают по SHDR, не HTTP)
const shdrManager = new SHDRManager();

// Добавляем машины в SHDR менеджер
FANUC_MACHINES.forEach(machine => {
  console.log(`🔧 Настройка SHDR подключения для ${machine.name} (localhost:${machine.port})`);
  shdrManager.addMachine({
    ip: 'localhost', // Адаптеры на localhost
    port: machine.port,
    machineId: machine.id,
    machineName: machine.name,
  });
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
      useValue: FANUC_MACHINES,
    },
    {
      provide: 'ADAM_MACHINES', 
      useValue: ADAM_MACHINES,
    },
  ],
})
export class AppModule {} 