interface CycleTimeChange {
  timestamp: Date;
  count: number;
  delta: number;
}

interface CycleTimeHistory {
  machineId: string;
  changes: CycleTimeChange[];
  lastCount?: number;
}

export class CycleTimeCalculator {
  private histories: Map<string, CycleTimeHistory> = new Map();

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

  getCycleTime(machineId: string): { cycleTimeMs?: number; partsInCycle: number; confidence: string } {
    const history = this.histories.get(machineId);
    
    if (!history || history.changes.length < 2) {
      return { 
        cycleTimeMs: undefined, 
        partsInCycle: history?.changes.length || 0,
        confidence: 'Недостаточно данных'
      };
    }

    const first = history.changes[0];
    const last = history.changes[history.changes.length - 1];
    
    const totalTimeMs = last.timestamp.getTime() - first.timestamp.getTime();
    const totalParts = last.count - first.count;
    
    if (totalParts <= 0 || totalTimeMs <= 0) {
      return { 
        cycleTimeMs: undefined, 
        partsInCycle: totalParts,
        confidence: 'Нет изменений счетчика'
      };
    }
    
    const avgCycleTimeMs = totalTimeMs / totalParts;
    
    let confidence = 'НИЗКАЯ';
    if (history.changes.length >= 5) {
      confidence = 'ВЫСОКАЯ';
    } else if (history.changes.length >= 3) {
      confidence = 'СРЕДНЯЯ';
    }
    
    console.log(`⏱️ ${machineId}: ${totalParts} дет. за ${(totalTimeMs/1000).toFixed(1)} сек = ${(avgCycleTimeMs/1000).toFixed(2)} сек/дет (${confidence})`);
    
    return {
      cycleTimeMs: avgCycleTimeMs,
      partsInCycle: totalParts,
      confidence: confidence
    };
  }
} 