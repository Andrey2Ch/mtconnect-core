import * as Modbus from 'jsmodbus';
import * as net from 'net';
import { CycleTimeCalculator } from './cycle-time-calculator';

export interface AdamCounterData {
  channel: number;
  machineId: string;
  count: number;
  timestamp: string;
  // Новые поля для точного расчета времени цикла
  cycleTimeMs?: number;      // Время цикла в миллисекундах (точно рассчитанное)
  partsInCycle?: number;     // Количество деталей использованных для расчета
  confidence?: string;       // Уровень уверенности в расчете
  isAnomalous?: boolean;     // Флаг аномального времени цикла (простой)
  machineStatus?: 'ACTIVE' | 'IDLE' | 'OFFLINE';  // Умный статус станка
}

// Удален - теперь используем CycleTimeCalculator

export class AdamReader {
  private host: string;
  private port: number;
  private channelMapping: Map<number, string>;
  private cycleTimeCalculator: CycleTimeCalculator;

  constructor(host: string = '192.168.1.120', port: number = 502) {
    this.host = host;
    this.port = port;
    this.cycleTimeCalculator = new CycleTimeCalculator();
    
    // Маппинг каналов на станки (из Adam-6050 веб-интерфейса)
    this.channelMapping = new Map([
      [0, 'SR-22'],   // DI0 -> SR-22 (SR22)
      [1, 'SB-16'],   // DI1 -> SB-16 (SB16)
      [2, 'BT-38'],   // DI2 -> BT-38 (BT38)
      [3, 'K-162'],   // DI3 -> K-162 (K-162)
      [4, 'K-163'],   // DI4 -> K-163 (K-163)
      [5, 'L-20'],    // DI5 -> L-20 (L20)
      [6, 'K-16'],    // DI6 -> K-16 (K16)
      [7, ''],        // DI7 -> (пустой)
      [8, 'SR-20'],   // DI8 -> SR-20 (SR20)
      [9, 'SR-32'],   // DI9 -> SR-32 (SR32)
      [10, ''],       // DI10 -> (пустой)
      [11, 'SR-24']   // DI11 -> SR-24 (SR24) ✅ ИСПРАВЛЕНО!
    ]);
  }

  async readCounters(): Promise<AdamCounterData[]> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const client = new Modbus.client.TCP(socket);
      const results: AdamCounterData[] = [];

      socket.on('connect', async () => {
        try {
          console.log('✅ Подключён к Adam-6050 для чтения счётчиков');
          
          // Читаем Input Registers (Function Code 04) - для Counter режима (32-битные счетчики)
          const irResult = await client.readInputRegisters(0, 24); // Читаем 24 регистра для 12 32-битных счетчиков
          const irValues = irResult.response.body.valuesAsArray;
          
          // Читаем Discrete Inputs (Function Code 02) - для Digital Input режима
          const diResult = await client.readDiscreteInputs(0, 12);
          const diValues = diResult.response.body.valuesAsArray;
          
          // Преобразуем 16-битные регистры в 32-битные счетчики
          const counters32bit: number[] = [];
          for (let i = 0; i < 12; i++) {
            const lowWord = irValues[i * 2];     // Младшие 16 бит
            const highWord = irValues[i * 2 + 1]; // Старшие 16 бит
            const counter32 = lowWord + (highWord * 65536); // Объединяем в 32-битное число
            counters32bit.push(counter32);
          }
          
          console.log('📊 Input Registers (16-bit):', irValues);
          console.log('📊 32-bit Counters:', counters32bit);
          console.log('📊 Discrete Inputs (Digital):', diValues);
          
          const currentTime = new Date();
          const timestamp = currentTime.toISOString();
          
          // Определяем какие каналы в каком режиме работают (из Adam-6050 веб-интерфейса)
          const digitalInputChannels = new Set<string>(); // Нет станков в Digital Input режиме
          const counterChannels = new Set<string>([
            'SR-22', 'SB-16', 'BT-38', 'K-162', 'K-163', 
            'L-20', 'K-16', 'SR-20', 'SR-32', 'SR-24'
          ]); // ВСЕ активные станки в Counter режиме
          
          // Обрабатываем каждый канал
          for (let i = 0; i < 12; i++) {
            const machineId = this.channelMapping.get(i);
            if (machineId && machineId !== '') {
              
              // Выбираем правильный тип данных в зависимости от режима машины
              let currentCount: number;
              let dataType: string;
              
              if (digitalInputChannels.has(machineId)) {
                // Digital Input режим - читаем Discrete Inputs
                currentCount = diValues[i] ? 1 : 0; // Discrete Input возвращает boolean
                dataType = 'Digital Input';
              } else if (counterChannels.has(machineId)) {
                // Counter режим - читаем 32-битные счетчики ✅
                currentCount = counters32bit[i];
                dataType = 'Counter (32-bit)';
              } else {
                // Для неизвестных машин пробуем Counter режим
                currentCount = counters32bit[i];
                dataType = 'Unknown (32-bit Counter)';
              }
              
              // Форматируем большие числа для читаемости
              const formattedCount = currentCount.toLocaleString();
              console.log(`📊 ${machineId}: ${dataType} = ${formattedCount}`);
              
              // Обновляем счетчик в калькуляторе
              this.cycleTimeCalculator.updateCount(machineId, currentCount);
              
              // Вычисляем время цикла и определяем статус
              let cycleTimeMs: number | undefined;
              let partsInCycle: number | undefined;
              let confidence: string | undefined;
              let isAnomalous: boolean | undefined;
              let machineStatus: 'ACTIVE' | 'IDLE' | 'OFFLINE' | undefined;
              
              if (digitalInputChannels.has(machineId)) {
                // Для Digital Input режима не вычисляем cycle time
                cycleTimeMs = undefined;
                partsInCycle = 0;
                confidence = `Digital Input (${currentCount === 1 ? 'АКТИВЕН' : 'НЕАКТИВЕН'})`;
                isAnomalous = false;
                machineStatus = currentCount === 1 ? 'ACTIVE' : 'IDLE';
              } else {
                // Для Counter режима вычисляем cycle time и анализируем
                const cycleData = this.cycleTimeCalculator.getCycleTime(machineId);
                cycleTimeMs = cycleData.cycleTimeMs;
                partsInCycle = cycleData.partsInCycle;
                confidence = cycleData.confidence;
                isAnomalous = cycleData.isAnomalous;
                machineStatus = cycleData.machineStatus;
                
                // ✅ ДОПОЛНИТЕЛЬНАЯ ЛОГИКА: если нет времени цикла вообще = ПРОСТОЙ
                if (!cycleTimeMs || cycleData.confidence === 'Недостаточно данных') {
                  machineStatus = 'IDLE'; // Нет движения = простой
                  console.log(`🟡 ${machineId}: ПРОСТОЙ - недостаточно данных для расчета времени цикла`);
                }
              }
              
              results.push({
                channel: i,
                machineId: machineId,
                count: currentCount,
                timestamp: timestamp,
                cycleTimeMs: cycleTimeMs,
                partsInCycle: partsInCycle,
                confidence: confidence,
                isAnomalous: isAnomalous,
                machineStatus: machineStatus
              });
            }
          }
          
          console.log(`📊 Прочитано ${results.length} счётчиков с Adam-6050`);
          socket.end();
          resolve(results);
          
        } catch (err) {
          console.error('❌ Ошибка чтения счётчиков:', err);
          socket.end();
          reject(err);
        }
      });

      socket.on('error', (err) => {
        console.error('❌ Ошибка соединения с Adam-6050:', err);
        reject(err);
      });

      socket.connect({ host: this.host, port: this.port });
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      const data = await this.readCounters();
      return data.length > 0;
    } catch (err) {
      return false;
    }
  }
} 