import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MachineState, MachineStateDocument } from '../schemas/machine-state.schema';

export interface MachineStateData {
  machineId: string;
  // Время простоя
  idleTimeMinutes: number;
  lastActiveTime: string;
  // Производственные счетчики деталей
  basePartCount: number;      // Базовый счетчик при старте системы
  productionPartCount: number; // Произведено деталей (текущий - базовый)
  lastPartCount: number;      // Последнее значение счетчика
  timestamp: string;
}

@Injectable()
export class MachineStatesCacheService implements OnModuleInit {
  private readonly logger = new Logger('MachineStatesCacheService');
  
  constructor(
    @InjectModel(MachineState.name) private machineStateModel: Model<MachineStateDocument>
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 Инициализация кэша состояний машин...');
    
    // 💾 Восстановление пропущенного времени простоя при старте
    await this.restoreMissedIdleTime();
    
    // 💾 Запуск периодического сохранения кэша (каждые 30 секунд)
    setInterval(async () => {
      // Периодическое сохранение не нужно, так как мы сохраняем сразу при получении данных
    }, 30000);
    
    this.logger.log('✅ Кэш состояний машин готов к работе!');
  }

  /**
   * 🕒 Восстанавливает пропущенное время простоя для всех машин при старте
   */
  private async restoreMissedIdleTime() {
    try {
      const allStates = await this.machineStateModel.find().exec();
      
      for (const state of allStates) {
        const missedIdleTime = this.calculateMissedIdleTime(state.lastActiveTime);
        if (missedIdleTime > 0) {
          const newIdleTime = (state.idleTimeMinutes || 0) + missedIdleTime;
          
          await this.machineStateModel.findByIdAndUpdate(state._id, {
            idleTimeMinutes: newIdleTime,
            timestamp: new Date().toISOString()
          }).exec();
          
          this.logger.log(`💾 ${state.machineId}: восстановлено ${missedIdleTime} мин пропущенного времени простоя (итого: ${newIdleTime} мин)`);
        }
      }
      
      this.logger.log(`💾 Обработано машин для восстановления времени простоя: ${allStates.length}`);
    } catch (error) {
      this.logger.error('❌ Ошибка восстановления времени простоя:', error);
    }
  }

  /**
   * 💾 Загружает все состояния машин из MongoDB при старте
   */
  async loadAllStates(): Promise<Map<string, MachineStateData>> {
    try {
      const states = await this.machineStateModel.find().exec();
      const statesMap = new Map<string, MachineStateData>();
      
      states.forEach(state => {
        statesMap.set(state.machineId, {
          machineId: state.machineId,
          idleTimeMinutes: state.idleTimeMinutes || 0,
          lastActiveTime: state.lastActiveTime || new Date().toISOString(),
          basePartCount: state.basePartCount || 0,
          productionPartCount: state.productionPartCount || 0,
          lastPartCount: state.lastPartCount || 0,
          timestamp: state.timestamp || new Date().toISOString()
        });
      });
      
      console.log(`💾 Cloud API: загружено состояний машин из MongoDB: ${statesMap.size}`);
      return statesMap;
    } catch (error) {
      console.error('❌ Ошибка загрузки состояний машин из MongoDB:', error);
      return new Map();
    }
  }

  /**
   * 💾 Сохраняет или обновляет состояние машины в MongoDB
   */
  async saveOrUpdateMachineState(machineId: string, data: Partial<MachineStateData>): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      await this.machineStateModel.findOneAndUpdate(
        { machineId },
        {
          machineId,
          idleTimeMinutes: data.idleTimeMinutes ?? 0,
          lastActiveTime: data.lastActiveTime ?? now,
          basePartCount: data.basePartCount ?? 0,
          productionPartCount: data.productionPartCount ?? 0,
          lastPartCount: data.lastPartCount ?? 0,
          timestamp: now
        },
        { 
          upsert: true,  // Создаем если не существует
          new: true      // Возвращаем обновленный документ
        }
      ).exec();
      
      console.log(`💾 ${machineId}: состояние сохранено в MongoDB`);
    } catch (error) {
      console.error(`❌ Ошибка сохранения состояния ${machineId}:`, error);
    }
  }

  /**
   * 🕒 Вычисляет пропущенное время простоя с последней активности
   */
  calculateMissedIdleTime(lastActiveTime: string): number {
    try {
      const lastActive = new Date(lastActiveTime);
      const now = new Date();
      const diffMs = now.getTime() - lastActive.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      // Считаем простоем только если прошло больше 5 минут
      return diffMinutes > 5 ? diffMinutes : 0;
    } catch (error) {
      console.error(`❌ Ошибка расчета времени простоя для ${lastActiveTime}:`, error);
      return 0;
    }
  }

  /**
   * 🔢 Вычисляет производственные счетчики деталей
   */
  calculateProductionCount(
    currentPartCount: number, 
    basePartCount: number, 
    lastPartCount: number
  ): { productionCount: number; newBaseCount: number } {
    
    // Если счетчик сбросился (currentPartCount < lastPartCount)
    if (currentPartCount < lastPartCount) {
      console.log(`🔄 Счетчик сброшен: было ${lastPartCount}, стало ${currentPartCount}`);
      // Новая базовая точка = текущий счетчик
      return {
        productionCount: 0, // Начинаем считать заново
        newBaseCount: currentPartCount
      };
    }
    
    // Обычный случай: счетчик увеличился
    const productionCount = currentPartCount - basePartCount;
    return {
      productionCount: Math.max(0, productionCount), // Не может быть отрицательным
      newBaseCount: basePartCount // Базовая точка остается
    };
  }

  /**
   * 💾 Сохраняет состояния всех машин массово (для периодического сохранения)
   */
  async saveAllStates(states: Map<string, MachineStateData>): Promise<void> {
    try {
      const bulkOps = Array.from(states.values()).map(state => ({
        updateOne: {
          filter: { machineId: state.machineId },
          update: {
            machineId: state.machineId,
            idleTimeMinutes: state.idleTimeMinutes,
            lastActiveTime: state.lastActiveTime,
            basePartCount: state.basePartCount,
            productionPartCount: state.productionPartCount,
            lastPartCount: state.lastPartCount,
            timestamp: new Date().toISOString()
          },
          upsert: true
        }
      }));

      if (bulkOps.length > 0) {
        await this.machineStateModel.bulkWrite(bulkOps);
        console.log(`💾 Cloud API: сохранено состояний машин в MongoDB: ${bulkOps.length}`);
      }
    } catch (error) {
      console.error('❌ Ошибка массового сохранения состояний:', error);
    }
  }

  /**
   * 🧹 Очистка старых состояний (для тестирования)
   */
  async clearAllStates(): Promise<void> {
    try {
      await this.machineStateModel.deleteMany({}).exec();
      console.log('💾 Все состояния машин очищены из MongoDB');
    } catch (error) {
      console.error('❌ Ошибка очистки состояний:', error);
    }
  }
}