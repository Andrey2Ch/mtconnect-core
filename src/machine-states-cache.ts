import * as fs from 'fs';
import * as path from 'path';

export interface MachineState {
  machineId: string;
  idleTimeMinutes: number;
  lastActiveTime: string;
  timestamp: string;
}

export class MachineStatesCache {
  private cacheFile: string;
  private states: Map<string, MachineState> = new Map();

  constructor(cacheFileName: string = 'machine-states.cache.json') {
    this.cacheFile = path.resolve(cacheFileName);
    console.log(`💾 Machine States Cache: файл ${this.cacheFile}`);
  }

  /**
   * Загружает состояния машин из кэша при старте системы
   * @returns Map с состояниями машин
   */
  public loadStates(): Map<string, MachineState> {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const data = fs.readFileSync(this.cacheFile, 'utf8');
        const statesArray: MachineState[] = JSON.parse(data);
        
        // Преобразуем массив в Map для быстрого доступа
        this.states.clear();
        statesArray.forEach(state => {
          this.states.set(state.machineId, state);
        });
        
        console.log(`💾 Загружено состояний машин из кэша: ${this.states.size}`);
        
        // Показываем восстановленные данные
        this.states.forEach((state, machineId) => {
          const missedTime = this.calculateMissedIdleTime(state.lastActiveTime);
          if (missedTime > 0) {
            console.log(`🕒 ${machineId}: восстанавливаем ${missedTime} мин простоя (было ${state.idleTimeMinutes} мин)`);
          }
        });
        
        return this.states;
      } else {
        console.log(`💾 Файл кэша не найден, создаем новый: ${this.cacheFile}`);
        return this.states;
      }
    } catch (error) {
      console.error(`❌ Ошибка загрузки кэша состояний:`, error);
      return this.states;
    }
  }

  /**
   * Сохраняет текущие состояния машин в кэш
   * @param currentStates - текущие состояния машин
   */
  public saveStates(currentStates: Map<string, MachineState>): void {
    try {
      // Преобразуем Map в массив для JSON
      const statesArray = Array.from(currentStates.values());
      
      // Обновляем timestamp для всех состояний
      const now = new Date().toISOString();
      statesArray.forEach(state => {
        state.timestamp = now;
      });
      
      // Записываем в файл
      const jsonData = JSON.stringify(statesArray, null, 2);
      fs.writeFileSync(this.cacheFile, jsonData, 'utf8');
      
      console.log(`💾 Сохранено состояний машин в кэш: ${statesArray.length}`);
      
      // Обновляем внутреннее состояние
      this.states = new Map(currentStates);
      
    } catch (error) {
      console.error(`❌ Ошибка сохранения кэша состояний:`, error);
    }
  }

  /**
   * Вычисляет пропущенное время простоя с момента последней активности
   * @param lastActiveTime - время последней активности машины
   * @returns количество пропущенных минут простоя
   */
  public calculateMissedIdleTime(lastActiveTime: string): number {
    try {
      const lastActive = new Date(lastActiveTime);
      const now = new Date();
      const diffMs = now.getTime() - lastActive.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      // Считаем простоем только если прошло больше 5 минут
      return diffMinutes > 5 ? diffMinutes : 0;
    } catch (error) {
      console.error(`❌ Ошибка расчета пропущенного времени для ${lastActiveTime}:`, error);
      return 0;
    }
  }

  /**
   * Получает восстановленное состояние машины (с учетом пропущенного времени)
   * @param machineId - ID машины
   * @returns состояние машины с восстановленным временем простоя
   */
  public getRestoredState(machineId: string): MachineState | null {
    const cachedState = this.states.get(machineId);
    if (!cachedState) {
      return null;
    }

    // Вычисляем пропущенное время и добавляем к сохраненному
    const missedTime = this.calculateMissedIdleTime(cachedState.lastActiveTime);
    const restoredIdleTime = cachedState.idleTimeMinutes + missedTime;

    return {
      ...cachedState,
      idleTimeMinutes: restoredIdleTime
    };
  }

  /**
   * Создает новое состояние машины
   * @param machineId - ID машины
   * @param idleTimeMinutes - текущее время простоя
   * @param lastActiveTime - время последней активности
   * @returns новое состояние машины
   */
  public createMachineState(
    machineId: string, 
    idleTimeMinutes: number = 0, 
    lastActiveTime: string = new Date().toISOString()
  ): MachineState {
    return {
      machineId,
      idleTimeMinutes,
      lastActiveTime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Обновляет состояние машины в кэше
   * @param machineId - ID машины
   * @param updates - обновления для состояния
   */
  public updateMachineState(machineId: string, updates: Partial<Omit<MachineState, 'machineId'>>): void {
    const existing = this.states.get(machineId);
    if (existing) {
      this.states.set(machineId, {
        ...existing,
        ...updates,
        timestamp: new Date().toISOString()
      });
    } else {
      // Создаем новое состояние
      this.states.set(machineId, this.createMachineState(
        machineId,
        updates.idleTimeMinutes,
        updates.lastActiveTime
      ));
    }
  }

  /**
   * Получает все состояния машин
   * @returns Map со всеми состояниями
   */
  public getAllStates(): Map<string, MachineState> {
    return new Map(this.states);
  }

  /**
   * Очищает кэш (для тестирования)
   */
  public clearCache(): void {
    this.states.clear();
    if (fs.existsSync(this.cacheFile)) {
      fs.unlinkSync(this.cacheFile);
      console.log(`💾 Кэш очищен: ${this.cacheFile}`);
    }
  }
}