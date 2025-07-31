interface CycleTimeChange {
  timestamp: Date;
  count: number;
  delta: number;
}

interface CycleTimeHistory {
  machineId: string;
  changes: CycleTimeChange[];
  lastCount?: number;
  consecutiveNormalCycles?: number; // Счетчик подряд идущих нормальных циклов
  recoveryThreshold?: number; // Порог для восстановления (среднее время цикла)
}

export class CycleTimeCalculator {
  private histories: Map<string, CycleTimeHistory> = new Map();
  private restoredIdleTimes: Map<string, number> = new Map(); // 💾 Восстановленное время простоя из кэша

  /**
   * Устанавливает восстановленное время простоя из кэша для машины
   * @param machineId - ID машины
   * @param restoredIdleMinutes - восстановленное время простоя в минутах
   */
  setRestoredIdleTime(machineId: string, restoredIdleMinutes: number): void {
    this.restoredIdleTimes.set(machineId, restoredIdleMinutes);
    console.log(`💾 ${machineId}: установлено восстановленное время простоя ${restoredIdleMinutes} мин`);
  }

  updateCount(machineId: string, newCount: number): void {
    let history = this.histories.get(machineId);
    
    if (!history) {
      // Первый раз - просто запоминаем
      history = { machineId, changes: [], lastCount: newCount };
      this.histories.set(machineId, history);
      console.log(`📋 Инициализирована история для ${machineId}, начальное значение: ${newCount.toLocaleString()}`);
      return;
    }

    // Если счетчик увеличился - записываем изменение
    if (newCount > history.lastCount!) {
      const delta = newCount - history.lastCount!;
      history.changes.push({ 
        timestamp: new Date(), 
        count: newCount,
        delta 
      });
      
      console.log(`🔄 ${machineId}: счетчик изменился с ${history.lastCount!.toLocaleString()} на ${newCount.toLocaleString()} (+${delta}) в ${new Date().toLocaleTimeString()}`);
      
      // Ограничиваем историю (последние 50 изменений)
      if (history.changes.length > 50) {
        history.changes.shift();
      }
    }
    
    // Проверка на сброс счетчика
    if (newCount < history.lastCount!) {
      console.log(`🔄 ${machineId}: счетчик СБРОШЕН с ${history.lastCount!.toLocaleString()} на ${newCount.toLocaleString()}`);
      history.changes = []; // Сбрасываем историю
    }

    history.lastCount = newCount;
  }

  getCycleTime(machineId: string): { cycleTimeMs?: number; partsInCycle: number; confidence: string; isAnomalous?: boolean; machineStatus?: 'ACTIVE' | 'IDLE' | 'OFFLINE'; idleTimeMinutes?: number } {
    const history = this.histories.get(machineId);
    
    // 💾 Получаем восстановленное время простоя из кэша в начале
    const restoredIdleTime = this.restoredIdleTimes.get(machineId) || 0;
    
    // 🕒 СЛУЧАЙ 1: Нет истории вообще (новая машина)
    if (!history || history.changes.length === 0) {
      // Для машин без истории считаем что они стоят с момента запуска системы + восстановленное время
      const systemUptimeMinutes = Math.min(Math.round(process.uptime() / 60), 60); // максимум 60 минут
      const totalIdleMinutes = systemUptimeMinutes + restoredIdleTime;
      console.log(`🟡 ${machineId}: ПРОСТОЙ - нет данных о машине (новая)`);
      console.log(`🕒 ${machineId}: idleTimeMinutes = ${totalIdleMinutes} (система: ${systemUptimeMinutes} + восстановленный: ${restoredIdleTime})`);
      return { 
        cycleTimeMs: undefined, 
        partsInCycle: 0,
        confidence: 'Нет данных',
        isAnomalous: true,
        machineStatus: 'IDLE',
        idleTimeMinutes: totalIdleMinutes // 🕒 ВРЕМЯ С ЗАПУСКА СИСТЕМЫ + ВОССТАНОВЛЕННОЕ
      };
    }
    
    // 🕒 СЛУЧАЙ 2: Недостаточно данных для расчета (< 2 изменения)
    if (history.changes.length < 2) {
      const lastChange = history.changes[history.changes.length - 1];
      const timeSinceLastPart = Date.now() - lastChange.timestamp.getTime();
      const currentIdleMinutes = Math.round(timeSinceLastPart / 60000);
      const totalIdleMinutes = currentIdleMinutes + restoredIdleTime;
      
      console.log(`🟡 ${machineId}: ПРОСТОЙ - недостаточно данных для расчета времени цикла`);
      console.log(`🕒 ${machineId}: idleTimeMinutes = ${totalIdleMinutes} (текущий: ${currentIdleMinutes} + восстановленный: ${restoredIdleTime})`);
      
      return { 
        cycleTimeMs: undefined, 
        partsInCycle: 1,
        confidence: 'Недостаточно данных',
        isAnomalous: true,
        machineStatus: 'IDLE',
        idleTimeMinutes: totalIdleMinutes
      };
    }

    const first = history.changes[0];
    const last = history.changes[history.changes.length - 1];
    
    const totalTimeMs = last.timestamp.getTime() - first.timestamp.getTime();
    const totalParts = last.count - first.count;
    
    // 🕒 СЛУЧАЙ 3: Нет изменений счетчика (машина не работает)
    if (totalParts <= 0 || totalTimeMs <= 0) {
      const timeSinceLastPart = Date.now() - last.timestamp.getTime();
      const currentIdleMinutes = Math.round(timeSinceLastPart / 60000);
      const totalIdleMinutes = currentIdleMinutes + restoredIdleTime;
      
      console.log(`🟡 ${machineId}: ПРОСТОЙ - нет изменений счетчика`);
      console.log(`🕒 ${machineId}: idleTimeMinutes = ${totalIdleMinutes} (текущий: ${currentIdleMinutes} + восстановленный: ${restoredIdleTime})`);
      
      return { 
        cycleTimeMs: undefined, 
        partsInCycle: totalParts,
        confidence: 'Нет изменений счетчика',
        isAnomalous: true,
        machineStatus: 'IDLE',
        idleTimeMinutes: totalIdleMinutes
      };
    }
    
    const avgCycleTimeMs = totalTimeMs / totalParts;
    
    // 🧠 УМНАЯ ЛОГИКА ОПРЕДЕЛЕНИЯ АНОМАЛИЙ И ВОССТАНОВЛЕНИЯ
    const isAnomalous = this.isAnomalousCycleTime(machineId, avgCycleTimeMs, history);
    const isRecovered = this.checkRecoveryStatus(machineId, avgCycleTimeMs, history, isAnomalous);
    
    // Определяем статус станка и время простоя
    let machineStatus: 'ACTIVE' | 'IDLE' | 'OFFLINE' = 'ACTIVE';
    let idleTimeMinutes = 0; // 🕒 ВРЕМЯ ПРОСТОЯ
    
    if (isAnomalous && !isRecovered) {
      machineStatus = 'IDLE'; // Станок стоит (большое время цикла = простой)
      // 🕒 Вычисляем время простоя для аномального цикла + восстановленное из кэша
      const timeSinceLastPart = Date.now() - last.timestamp.getTime();
      const currentIdleMinutes = Math.round(timeSinceLastPart / 60000);
      idleTimeMinutes = currentIdleMinutes + restoredIdleTime;
      console.log(`🟡 ${machineId}: ПРОСТОЙ обнаружен! Время цикла ${(avgCycleTimeMs/1000).toFixed(2)} сек/дет слишком большое`);
      console.log(`🕒 ${machineId}: idleTimeMinutes = ${idleTimeMinutes} (текущий: ${currentIdleMinutes} + восстановленный: ${restoredIdleTime})`);
    } else if (isRecovered) {
      machineStatus = 'ACTIVE'; // Станок восстановился после простоя
      console.log(`🟢 ${machineId}: ВОССТАНОВЛЕНИЕ! Станок вернулся в работу после 3+ нормальных циклов`);
    } else {
      // Проверяем когда была последняя деталь
      const timeSinceLastPart = Date.now() - last.timestamp.getTime();
      const maxIdleTime = Math.max(avgCycleTimeMs * 3, 300000); // 3 цикла или 5 минут
      
      if (timeSinceLastPart > maxIdleTime) {
        machineStatus = 'IDLE'; // Слишком долго нет новых деталей
        // 🕒 Вычисляем время простоя для случая "нет движения" + восстановленное из кэша
        const currentIdleMinutes = Math.round(timeSinceLastPart / 60000);
        idleTimeMinutes = currentIdleMinutes + restoredIdleTime;
        console.log(`🟡 ${machineId}: ПРОСТОЙ - нет движения ${(timeSinceLastPart/60000).toFixed(1)} минут`);
        console.log(`🕒 ${machineId}: idleTimeMinutes = ${idleTimeMinutes} (текущий: ${currentIdleMinutes} + восстановленный: ${restoredIdleTime})`);
      }
    }
    
    let confidence = 'НИЗКАЯ';
    if (history.changes.length >= 5) {
      confidence = 'ВЫСОКАЯ';
    } else if (history.changes.length >= 3) {
      confidence = 'СРЕДНЯЯ';
    }
    
    // Логи для нормальной работы (не IDLE)
    if (machineStatus === 'ACTIVE') {
      console.log(`⏱️ ${machineId}: ${totalParts} дет. за ${(totalTimeMs/1000).toFixed(1)} сек = ${(avgCycleTimeMs/1000).toFixed(2)} сек/дет (${confidence})`);
    }

    return {
      cycleTimeMs: avgCycleTimeMs,
      partsInCycle: totalParts,
      confidence: confidence,
      isAnomalous: isAnomalous,
      machineStatus: machineStatus,
      idleTimeMinutes: idleTimeMinutes  // 🕒 ВРЕМЯ ПРОСТОЯ В МИНУТАХ
    };
  }

  private isAnomalousCycleTime(machineId: string, currentCycleTimeMs: number, history: CycleTimeHistory): boolean {
    // Нужна достаточная история для определения аномалий
    if (history.changes.length < 5) {
      return false; // Недостаточно данных для определения аномалии
    }
    
    const recentCycles = this.getRecentNormalCycles(history, 10);
    if (recentCycles.length < 3) {
      return false; // Недостаточно нормальных циклов для сравнения
    }
    
    const avgNormalCycle = recentCycles.reduce((sum, cycle) => sum + cycle, 0) / recentCycles.length;
    
    // 🎯 ДИНАМИЧЕСКИЙ ПОРОГ: если время цикла больше среднего на 20% - аномалия
    const anomalyThreshold = avgNormalCycle * 1.2; // +20% от среднего
    
    if (currentCycleTimeMs > anomalyThreshold) {
      console.log(`🔍 ${machineId}: Аномалия! Текущий цикл ${(currentCycleTimeMs/1000).toFixed(2)}с > порога ${(anomalyThreshold/1000).toFixed(2)}с (+20% от ${(avgNormalCycle/1000).toFixed(2)}с)`);
      return true;
    }
    
    return false;
  }

  private checkRecoveryStatus(machineId: string, currentCycleTimeMs: number, history: CycleTimeHistory, isCurrentAnomalous: boolean): boolean {
    // Инициализируем счетчик если его нет
    if (history.consecutiveNormalCycles === undefined) {
      history.consecutiveNormalCycles = 0;
    }
    
    // Устанавливаем порог восстановления (среднее нормальное время)
    if (!history.recoveryThreshold) {
      const recentCycles = this.getRecentNormalCycles(history, 10);
      if (recentCycles.length >= 3) {
        history.recoveryThreshold = recentCycles.reduce((sum, cycle) => sum + cycle, 0) / recentCycles.length;
      }
    }
    
    if (!history.recoveryThreshold) {
      return false; // Нет эталонного времени для сравнения
    }
    
    // 🎯 ЛОГИКА ВОССТАНОВЛЕНИЯ: в пределах 10% от нормального времени
    const recoveryTolerance = history.recoveryThreshold * 0.1; // ±10%
    const isWithinRecoveryRange = Math.abs(currentCycleTimeMs - history.recoveryThreshold) <= recoveryTolerance;
    
    if (isWithinRecoveryRange && !isCurrentAnomalous) {
      // Увеличиваем счетчик нормальных циклов
      history.consecutiveNormalCycles = (history.consecutiveNormalCycles || 0) + 1;
      console.log(`📈 ${machineId}: Нормальный цикл ${history.consecutiveNormalCycles}/3 для восстановления`);
      
      // Если прошло 3+ нормальных цикла - считаем восстановившимся
      if (history.consecutiveNormalCycles >= 3) {
        history.consecutiveNormalCycles = 0; // Сбрасываем счетчик
        return true;
      }
    } else {
      // Сбрасываем счетчик если цикл снова аномальный
      if (history.consecutiveNormalCycles > 0) {
        console.log(`🔄 ${machineId}: Сброс счетчика восстановления (аномальный цикл)`);
        history.consecutiveNormalCycles = 0;
      }
    }
    
    return false;
  }

  private getRecentNormalCycles(history: CycleTimeHistory, maxCount: number): number[] {
    const normalCycles: number[] = [];
    const changes = history.changes;
    
    // Проходим по последним изменениям и ищем нормальные циклы
    for (let i = 1; i < changes.length && normalCycles.length < maxCount; i++) {
      const prev = changes[i - 1];
      const curr = changes[i];
      
      const timeDiffMs = curr.timestamp.getTime() - prev.timestamp.getTime();
      const partsDiff = curr.count - prev.count;
      
      if (partsDiff > 0 && timeDiffMs > 0) {
        const cycleTime = timeDiffMs / partsDiff;
        
        // Считаем "нормальным" цикл до 5 минут (временный критерий)
        if (cycleTime < 5 * 60 * 1000) {
          normalCycles.push(cycleTime);
        }
      }
    }
    
    return normalCycles;
  }
} 