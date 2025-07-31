import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { MachineStatesCacheService } from './services/machine-states-cache.service';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger('AppService');
  private machineStatesCache = new Map<string, any>();

  constructor(private machineStatesCacheService: MachineStatesCacheService) {}

  async onModuleInit() {
    this.logger.log('🚀 Cloud API инициализируется...');
    
    // 💾 Загружаем кэш состояний машин при старте
    await this.loadMachineStatesCache();
    
    // 💾 Запуск периодического сохранения кэша (каждые 30 секунд)
    setInterval(async () => {
      await this.saveMachineStatesCache();
    }, 30000);
    
    this.logger.log('✅ Cloud API готов к работе!');
  }

  private async loadMachineStatesCache() {
    try {
      this.machineStatesCache = await this.machineStatesCacheService.loadAllStates();
      
      // 💾 Восстанавливаем пропущенное время простоя и инициализируем производственные счетчики
      this.machineStatesCache.forEach((state, machineId) => {
        // Расчет пропущенного времени простоя
        const missedIdleTime = this.machineStatesCacheService.calculateMissedIdleTime(state.lastActiveTime);
        if (missedIdleTime > 0) {
          state.idleTimeMinutes += missedIdleTime;
          this.logger.log(`💾 ${machineId}: восстановлено ${missedIdleTime} мин пропущенного времени простоя`);
        }
        
        // Инициализация производственного счетчика если нужно
        if (state.basePartCount === 0 && state.lastPartCount > 0) {
          state.basePartCount = state.lastPartCount;
          state.productionPartCount = 0;
          this.logger.log(`🔢 ${machineId}: установлена базовая точка счетчика: ${state.basePartCount}`);
        }
      });
      
      this.logger.log(`💾 Загружен кэш состояний машин: ${this.machineStatesCache.size} машин`);
    } catch (error) {
      this.logger.error('❌ Ошибка загрузки кэша состояний машин:', error);
    }
  }

  private async saveMachineStatesCache() {
    try {
      if (this.machineStatesCache.size > 0) {
        await this.machineStatesCacheService.saveAllStates(this.machineStatesCache);
      }
    } catch (error) {
      this.logger.error('❌ Ошибка сохранения кэша состояний машин:', error);
    }
  }

  getHello(): string {
    return 'MTConnect Cloud API is running!';
  }

  /**
   * 💾 Получает кэшированное состояние машины
   */
  getMachineState(machineId: string) {
    return this.machineStatesCache.get(machineId);
  }

  /**
   * 💾 Обновляет состояние машины в кэше
   */
  updateMachineState(machineId: string, updates: any) {
    const existing = this.machineStatesCache.get(machineId) || {
      machineId,
      idleTimeMinutes: 0,
      lastActiveTime: new Date().toISOString(),
      basePartCount: 0,
      productionPartCount: 0,
      lastPartCount: 0,
      timestamp: new Date().toISOString()
    };

    this.machineStatesCache.set(machineId, {
      ...existing,
      ...updates,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 🔢 Получает производственный счетчик деталей для машины
   */
  getProductionPartCount(machineId: string, currentPartCount: number): number {
    const state = this.getMachineState(machineId);
    if (!state) {
      // Новая машина - создаем базовую точку
      this.updateMachineState(machineId, {
        basePartCount: currentPartCount,
        productionPartCount: 0,
        lastPartCount: currentPartCount
      });
      return 0;
    }

    // Вычисляем производственный счетчик
    const result = this.machineStatesCacheService.calculateProductionCount(
      currentPartCount,
      state.basePartCount,
      state.lastPartCount
    );

    // Обновляем состояние
    this.updateMachineState(machineId, {
      basePartCount: result.newBaseCount,
      productionPartCount: result.productionCount,
      lastPartCount: currentPartCount
    });

    return result.productionCount;
  }
}