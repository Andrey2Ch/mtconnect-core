import * as fs from 'fs';
import * as path from 'path';

export interface EnhancedMachineState {
  machineId: string;
  idleTimeMinutes: number;
  cycleTimeMinutes?: number;
  lastActiveTime: string;
  timestamp: string;
  // Новые поля для улучшенной системы
  cycleTimeHistory: number[]; // История времени цикла для валидации
  confidence: 'high' | 'medium' | 'low';
  dataVersion: number;
  checksum: string;
}

export class EnhancedMachineCache {
  private cacheFile: string;
  private backupFile: string;
  private states: Map<string, EnhancedMachineState> = new Map();
  private readonly MAX_HISTORY_SIZE = 10;
  private readonly DATA_VERSION = 2;

  constructor(cacheFileName: string = 'enhanced-machine-states.cache.json') {
    this.cacheFile = path.resolve(cacheFileName);
    this.backupFile = this.cacheFile.replace('.json', '.backup.json');
    console.log(`💾 Enhanced Machine Cache: файл ${this.cacheFile}`);
  }

  /**
   * Валидация данных состояния машины
   */
  private validateMachineState(state: any): state is EnhancedMachineState {
    if (!state.machineId || typeof state.machineId !== 'string') return false;
    if (typeof state.idleTimeMinutes !== 'number' || state.idleTimeMinutes < 0) return false;
    if (state.cycleTimeMinutes !== undefined && (typeof state.cycleTimeMinutes !== 'number' || state.cycleTimeMinutes < 0)) return false;
    if (!state.lastActiveTime || !Date.parse(state.lastActiveTime)) return false;
    if (!state.timestamp || !Date.parse(state.timestamp)) return false;
    
    return true;
  }

  /**
   * Вычисление контрольной суммы для валидации данных
   */
  private calculateChecksum(state: EnhancedMachineState): string {
    const data = `${state.machineId}-${state.idleTimeMinutes}-${state.cycleTimeMinutes}-${state.lastActiveTime}`;
    return Buffer.from(data).toString('base64').substring(0, 8);
  }

  /**
   * Валидация времени цикла на основе истории
   */
  private validateCycleTime(newCycleTime: number, history: number[]): boolean {
    if (history.length === 0) return true;
    
    const avgCycleTime = history.reduce((sum, time) => sum + time, 0) / history.length;
    const deviation = Math.abs(newCycleTime - avgCycleTime) / avgCycleTime;
    
    // Если отклонение больше 50%, считаем подозрительным
    return deviation <= 0.5;
  }

  /**
   * Загрузка состояний с валидацией и восстановлением из резервной копии
   */
  public loadStates(): Map<string, EnhancedMachineState> {
    try {
      // Пытаемся загрузить основной файл
      if (fs.existsSync(this.cacheFile)) {
        const data = fs.readFileSync(this.cacheFile, 'utf8');
        const statesArray: any[] = JSON.parse(data);
        
        let validStates = 0;
        this.states.clear();
        
        statesArray.forEach(state => {
          if (this.validateMachineState(state)) {
            // Проверяем контрольную сумму
            const expectedChecksum = this.calculateChecksum(state);
            if (state.checksum === expectedChecksum) {
              this.states.set(state.machineId, state);
              validStates++;
            } else {
              console.warn(`⚠️ Некорректная контрольная сумма для ${state.machineId}`);
            }
          } else {
            console.warn(`⚠️ Некорректные данные для ${state.machineId}`);
          }
        });
        
        console.log(`💾 Загружено валидных состояний: ${validStates}/${statesArray.length}`);
        
        // Если много невалидных данных, пробуем резервную копию
        if (validStates < statesArray.length * 0.5 && fs.existsSync(this.backupFile)) {
          console.log(`🔄 Восстанавливаем из резервной копии...`);
          return this.loadFromBackup();
        }
        
        return this.states;
      } else {
        console.log(`💾 Файл кэша не найден, создаем новый: ${this.cacheFile}`);
        return this.states;
      }
    } catch (error) {
      console.error(`❌ Ошибка загрузки кэша:`, error);
      return this.loadFromBackup();
    }
  }

  /**
   * Загрузка из резервной копии
   */
  private loadFromBackup(): Map<string, EnhancedMachineState> {
    try {
      if (fs.existsSync(this.backupFile)) {
        const data = fs.readFileSync(this.backupFile, 'utf8');
        const statesArray: any[] = JSON.parse(data);
        
        this.states.clear();
        let validStates = 0;
        
        statesArray.forEach(state => {
          if (this.validateMachineState(state)) {
            this.states.set(state.machineId, state);
            validStates++;
          }
        });
        
        console.log(`💾 Восстановлено из резервной копии: ${validStates} состояний`);
        return this.states;
      }
    } catch (error) {
      console.error(`❌ Ошибка загрузки резервной копии:`, error);
    }
    
    return this.states;
  }

  /**
   * Сохранение с созданием резервной копии
   */
  public saveStates(currentStates: Map<string, EnhancedMachineState>): void {
    try {
      // Создаем резервную копию текущего файла
      if (fs.existsSync(this.cacheFile)) {
        fs.copyFileSync(this.cacheFile, this.backupFile);
      }
      
      // Обновляем состояния с валидацией
      const statesArray = Array.from(currentStates.values()).map(state => {
        const enhancedState: EnhancedMachineState = {
          ...state,
          checksum: this.calculateChecksum(state),
          dataVersion: this.DATA_VERSION,
          timestamp: new Date().toISOString()
        };
        return enhancedState;
      });
      
      // Записываем в файл
      const jsonData = JSON.stringify(statesArray, null, 2);
      fs.writeFileSync(this.cacheFile, jsonData, 'utf8');
      
      console.log(`💾 Сохранено состояний с валидацией: ${statesArray.length}`);
      
      // Обновляем внутреннее состояние
      this.states = new Map(currentStates);
      
    } catch (error) {
      console.error(`❌ Ошибка сохранения кэша:`, error);
    }
  }

  /**
   * Обновление состояния машины с валидацией времени цикла
   */
  public updateMachineState(
    machineId: string, 
    updates: Partial<Omit<EnhancedMachineState, 'machineId' | 'checksum' | 'dataVersion'>>
  ): void {
    const existing = this.states.get(machineId);
    
    if (existing) {
      // Валидация времени цикла
      if (updates.cycleTimeMinutes !== undefined) {
        const isValid = this.validateCycleTime(updates.cycleTimeMinutes, existing.cycleTimeHistory);
        if (!isValid) {
          console.warn(`⚠️ Подозрительное время цикла для ${machineId}: ${updates.cycleTimeMinutes} мин`);
        }
        
        // Обновляем историю времени цикла
        const newHistory = [...existing.cycleTimeHistory, updates.cycleTimeMinutes];
        if (newHistory.length > this.MAX_HISTORY_SIZE) {
          newHistory.shift();
        }
        updates.cycleTimeHistory = newHistory;
      }
      
      this.states.set(machineId, {
        ...existing,
        ...updates,
        confidence: this.calculateConfidence(existing, updates),
        timestamp: new Date().toISOString()
      });
    } else {
      // Создаем новое состояние
      this.states.set(machineId, {
        machineId,
        idleTimeMinutes: updates.idleTimeMinutes || 0,
        cycleTimeMinutes: updates.cycleTimeMinutes,
        cycleTimeHistory: updates.cycleTimeMinutes ? [updates.cycleTimeMinutes] : [],
        lastActiveTime: updates.lastActiveTime || new Date().toISOString(),
        timestamp: new Date().toISOString(),
        confidence: 'high',
        dataVersion: this.DATA_VERSION,
        checksum: ''
      });
    }
  }

  /**
   * Вычисление уровня доверия к данным
   */
  private calculateConfidence(
    existing: EnhancedMachineState, 
    updates: Partial<EnhancedMachineState>
  ): 'high' | 'medium' | 'low' {
    if (updates.cycleTimeMinutes !== undefined) {
      const isValid = this.validateCycleTime(updates.cycleTimeMinutes, existing.cycleTimeHistory);
      return isValid ? 'high' : 'medium';
    }
    return existing.confidence;
  }

  /**
   * Получение восстановленного состояния с улучшенной логикой
   */
  public getRestoredState(machineId: string): EnhancedMachineState | null {
    const cachedState = this.states.get(machineId);
    if (!cachedState) return null;

    const missedTime = this.calculateMissedIdleTime(cachedState.lastActiveTime);
    const restoredIdleTime = cachedState.idleTimeMinutes + missedTime;

    return {
      ...cachedState,
      idleTimeMinutes: restoredIdleTime
    };
  }

  /**
   * Вычисление пропущенного времени простоя
   */
  public calculateMissedIdleTime(lastActiveTime: string): number {
    try {
      const lastActive = new Date(lastActiveTime);
      const now = new Date();
      const diffMs = now.getTime() - lastActive.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      return diffMinutes > 5 ? diffMinutes : 0;
    } catch (error) {
      console.error(`❌ Ошибка расчета пропущенного времени:`, error);
      return 0;
    }
  }

  /**
   * Получение всех состояний
   */
  public getAllStates(): Map<string, EnhancedMachineState> {
    return new Map(this.states);
  }

  /**
   * Очистка кэша
   */
  public clearCache(): void {
    this.states.clear();
    if (fs.existsSync(this.cacheFile)) {
      fs.unlinkSync(this.cacheFile);
    }
    if (fs.existsSync(this.backupFile)) {
      fs.unlinkSync(this.backupFile);
    }
    console.log(`💾 Кэш очищен`);
  }
} 