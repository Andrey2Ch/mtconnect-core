# ПОДРОБНЫЙ ПЛАН МОДЕРНИЗАЦИИ СИСТЕМЫ

## 🎯 ЦЕЛИ МОДЕРНИЗАЦИИ

### Основные цели:
- ✅ **Убрать избыточность:** Удалить MTConnect агенты и XML обработку
- ✅ **Сохранить функциональность:** Все данные остаются доступными
- ✅ **Повысить производительность:** Прямое SHDR чтение вместо HTTP+XML
- ✅ **Упростить мониторинг:** Меньше компонентов и портов
- ✅ **Сохранить точность ADAM:** Оставить алгоритмы вычисления времени цикла

## 📋 ЭТАПЫ МОДЕРНИЗАЦИИ

### **ЭТАП 1: ПОДГОТОВКА И БЭКАП**
**Цель:** Сохранить рабочую систему и подготовить инфраструктуру

#### 1.1. Создание резервной копии
```powershell
# Команды для выполнения:
git add .
git commit -m "backup: working system before modernization"
git push origin main

# Переключиться на ветку разработки:
git checkout local_dev
```

#### 1.2. Документирование текущих портов
```powershell
# Проверить какие порты используются:
netstat -ano | findstr "LISTENING" | findstr -E "(5001|5002|5003|5004|5005|5006|5007|5008|7701|7702|7703|7704|7705|7706|7707|7708|3000|3001)"
```

**Результат:** Полная карта текущих соединений

### **ЭТАП 2: МОДЕРНИЗАЦИЯ FANUC ОБРАБОТКИ**
**Цель:** Прямое чтение SHDR данных, обход MTConnect агентов

#### 2.1. Создать новый SHDR клиент (универсальный)
```typescript
// Файл: src/fanuc-shdr-client.ts
interface FanucSHDRData {
    machineId: string;
    machineName: string;
    program: string;
    partCount: number;
    availability: string;
    execution: string;
    timestamp: string;
}

class FanucSHDRClient {
    private connections: Map<string, SHDRConnection>;
    
    constructor(machines: MachineConfig[]) {
        this.connections = new Map();
        machines.forEach(machine => {
            // Подключение к адаптеру напрямую (порт 77XX)
            const shdrPort = this.getFanucAdapterPort(machine.id);
            this.connections.set(machine.id, new SHDRConnection({
                host: 'localhost',
                port: shdrPort,
                machineId: machine.id,
                machineName: machine.name
            }));
        });
    }
    
    private getFanucAdapterPort(machineId: string): number {
        // M_1_XD-20 -> 7701, M_2_SR_26 -> 7702, etc.
        const index = parseInt(machineId.split('_')[1]) - 1;
        return 7701 + index;
    }
    
    async getAllMachinesData(): Promise<FanucSHDRData[]> {
        const results: FanucSHDRData[] = [];
        
        for (const [machineId, connection] of this.connections) {
            try {
                const shdrData = await connection.readCurrentData();
                const parsed = this.parseSHDRData(machineId, shdrData);
                results.push(parsed);
            } catch (error) {
                console.error(`❌ Ошибка чтения SHDR для ${machineId}:`, error);
                // Добавляем запись с ошибкой
                results.push(this.createErrorRecord(machineId));
            }
        }
        
        return results;
    }
    
    private parseSHDRData(machineId: string, shdrLines: string[]): FanucSHDRData {
        const data: any = {};
        
        // Парсим SHDR строки: "timestamp|field|value"
        shdrLines.forEach(line => {
            const parts = line.split('|');
            if (parts.length >= 3) {
                data[parts[1]] = parts[2];
            }
        });
        
        return {
            machineId,
            machineName: this.getMachineName(machineId),
            program: this.extractProgram(data.program_comment, data.program),
            partCount: parseInt(data.part_count) || 0,
            availability: data.avail || 'UNAVAILABLE',
            execution: data.execution || 'UNAVAILABLE',
            timestamp: new Date().toISOString()
        };
    }
}
```

#### 2.2. Обновить main.ts для использования нового клиента
```typescript
// Заменить в src/main.ts:

// ❌ СТАРЫЙ КОД:
// for (const machine of FANUC_MACHINES) {
//     const response = await axios.get(`${machine.mtconnectAgentUrl}/current`);
//     const parsedXml = await xmlParse(response.data);
// }

// ✅ НОВЫЙ КОД:
import { FanucSHDRClient } from './fanuc-shdr-client';

const fanucClient = new FanucSHDRClient(FANUC_MACHINES);

// В функции мониторинга:
async function updateFanucData() {
    try {
        const allMachinesData = await fanucClient.getAllMachinesData();
        
        allMachinesData.forEach(machineData => {
            // Прямая обработка без XML парсинга
            processPartCount(machineData);
            processExecutionStatus(machineData);
            sendToRailway(machineData);
        });
    } catch (error) {
        console.error('❌ Ошибка обновления FANUC данных:', error);
    }
}
```

#### 2.3. Обновить конфигурацию
```json
// В config.json убрать MTConnect URL и добавить SHDR порты:
{
  "machines": [
    {
      "id": "M_1_XD-20",
      "name": "XD-20", 
      "ip": "192.168.1.105",
      "fanucAdapterPort": 7701,  // ← НОВОЕ ПОЛЕ
      "type": "FANUC"
      // ❌ УБРАТЬ: "mtconnectAgentUrl": "http://127.0.0.1:5001"
    }
  ]
}
```

**Результат:** Прямое чтение SHDR, минус 8 HTTP запросов и XML парсинг

### **ЭТАП 3: ОПТИМИЗАЦИЯ ADAM ОБРАБОТКИ**  
**Цель:** Убрать избыточное форматирование, сохранить умные вычисления

#### 3.1. Упростить форматирование данных
```typescript
// В src/main.ts упростить getAdamCounters():

// ❌ УБРАТЬ ДУБЛИРОВАНИЕ:
// const railwayData = {
//     data: {
//         partCount: counter.count,
//         adamData: {
//             analogData: {
//                 "count": counter.count,  // ДУБЛИКАТ!
//             }
//         }
//     }
// };

// ✅ ПРОСТОЙ ФОРМАТ:
const railwayData = {
    machineId: counter.machineId,
    machineName: counter.machineId,
    timestamp: counter.timestamp,
    data: {
        partCount: counter.count,
        cycleTime: counter.cycleTimeMs ? counter.cycleTimeMs / 1000 : undefined,
        confidence: counter.confidence,
        partsInCycle: counter.partsInCycle
    }
};
```

#### 3.2. Сохранить алгоритмы AdamReader
```typescript
// ✅ НЕ ТРОГАТЬ AdamReader.ts - он работает правильно!
// Только убрать избыточное форматирование в main.ts
```

**Результат:** Чистый код без дублирования, сохранена точность вычислений

### **ЭТАП 4: ОБНОВЛЕНИЕ API ENDPOINTS**
**Цель:** Обеспечить совместимость с существующими интеграциями

#### 4.1. Сохранить REST API интерфейс
```typescript
// В Cloud API сохранить все существующие endpoints:
// GET /api/machines - ✅ остается
// GET /api/counters - ✅ остается  
// GET /dashboard-new.html - ✅ остается

// Только изменится источник данных (SHDR вместо XML)
```

#### 4.2. Добавить новые эндпоинты для диагностики
```typescript
// Новые полезные endpoints:
app.get('/api/system/health', (req, res) => {
    res.json({
        fanucAdapters: fanucClient.getConnectionStatuses(),
        adamConnection: adamReader.testConnection(),
        activePorts: [7701, 7702, 7703, 7704, 7705, 7706, 7707, 7708, 502],
        removedPorts: [5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008] // Документируем что убрали
    });
});

app.get('/api/system/performance', (req, res) => {
    res.json({
        directSHDR: true,
        xmlParsing: false,
        httpRequests: 0,
        tcpConnections: 8
    });
});
```

**Результат:** Все существующие интеграции продолжают работать

### **ЭТАП 5: ОБНОВЛЕНИЕ СКРИПТОВ МОНИТОРИНГА**
**Цель:** Адаптировать PowerShell скрипты под новую архитектуру

#### 5.1. Обновить smart-fanuc-monitor.ps1
```powershell
# Изменить проверку портов:
# ❌ СТАРОЕ: Проверять порты 5001-5008 (MTConnect агенты)
# ✅ НОВОЕ: Проверять только порты 7701-7708 (FANUC адаптеры)

$machines = @(
    @{ Name = "M_1_XD-20"; AdapterPort = 7701; AdapterPath = "From Anat\Fanuc\M_1_XD-20\Adapter" }
    # ... остальные машины
)

# Убрать секцию запуска MTConnect агентов:
# ❌ УБРАТЬ: STEP 5: Starting MTConnect Agents...
```

#### 5.2. Создать новый start-modernized-system.ps1
```powershell
# Упростить запуск:
# ✅ ЭТАП 1: FANUC Adapters (порты 7701-7708)
# ✅ ЭТАП 2: Edge Gateway (порт 3000) 
# ❌ УБРАТЬ: MTConnect Agents (порты 5001-5008)
# ✅ ЭТАП 3: Cloud API (порт 3001)
```

**Результат:** Простые скрипты мониторинга, меньше проверок

### **ЭТАП 6: ТЕСТИРОВАНИЕ И ПРОВЕРКА**
**Цель:** Убедиться что все работает как раньше

#### 6.1. Функциональное тестирование
```typescript
// Создать тестовый скрипт: scripts/test-modernized-system.js
const testCases = [
    'Чтение FANUC данных через SHDR',
    'Чтение ADAM счетчиков', 
    'Отправка в Railway',
    'Dashboard отображение',
    'REST API ответы'
];

// Запуск: node scripts/test-modernized-system.js
```

#### 6.2. Нагрузочное тестирование
```typescript
// Проверить производительность:
console.time('SHDR читает 8 машин');
const fanucData = await fanucClient.getAllMachinesData();
console.timeEnd('SHDR читает 8 машин');

console.time('ADAM читет 10 счетчиков');
const adamData = await adamReader.readCounters();
console.timeEnd('ADAM читет 10 счетчиков');
```

**Результат:** Доказательство что система работает быстрее

## 🗂️ ФАЙЛОВАЯ СТРУКТУРА ПОСЛЕ МОДЕРНИЗАЦИИ

### **НОВЫЕ ФАЙЛЫ:**
```
src/
├── fanuc-shdr-client.ts          # ✅ НОВЫЙ: Прямое SHDR чтение
├── shdr-connection.ts             # ✅ НОВЫЙ: TCP соединение с адаптерами
└── types/
    └── fanuc-data.types.ts        # ✅ НОВЫЙ: Типы для FANUC данных

scripts/
├── test-modernized-system.js      # ✅ НОВЫЙ: Тестирование
└── start-modernized-system.ps1    # ✅ НОВЫЙ: Запуск без агентов

docs/
├── MODERNIZATION-PROBLEM-ANALYSIS.md  # ✅ НОВЫЙ: Анализ проблем
└── MODERNIZATION-PLAN.md              # ✅ НОВЫЙ: План модернизации
```

### **ИЗМЕНЕННЫЕ ФАЙЛЫ:**
```
src/main.ts                        # 🔄 ИЗМЕНЕН: Убрать XML, добавить SHDR клиент
config.json                        # 🔄 ИЗМЕНЕН: Убрать mtconnectAgentUrl
smart-fanuc-monitor.ps1            # 🔄 ИЗМЕНЕН: Убрать проверку агентов
```

### **УДАЛЯЕМЫЕ КОМПОНЕНТЫ:**
```powershell
# MTConnect агенты больше не нужны:
# Но НЕ удаляем файлы - они могут понадобиться для внешних интеграций
# Просто не запускаем процессы на портах 5001-5008
```

## 📊 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

### **Производительность:**
- ⚡ **HTTP запросы:** 8 → 0 (-100%)
- ⚡ **XML парсинг:** 8 операций → 0 (-100%)  
- ⚡ **TCP соединения:** Прямые к адаптерам (+30% скорость)
- ⚡ **Память:** -50MB (без XML буферов)

### **Надежность:**
- 🔧 **Компоненты:** 24 → 16 (-33%)
- 🔧 **Порты мониторинга:** 16 → 8 (-50%)
- 🔧 **Точки отказа:** -8 процессов

### **Функциональность:**
- ✅ **Все данные доступны** (program, part_count, execution, availability)
- ✅ **Dashboard работает** без изменений
- ✅ **REST API совместим** со всеми интеграциями
- ✅ **Время цикла ADAM** сохраняет точность ±1%

### **Простота:**
- 📖 **Один протокол** для FANUC (SHDR текст)
- 📖 **Меньше логирования** и отладки
- 📖 **Простые скрипты** мониторинга

## 🚀 ПЛАН РЕАЛИЗАЦИИ ПО ВРЕМЕНИ

| Этап | Время | Описание |
|------|-------|----------|
| 1 | 1 час | Подготовка и бэкап |
| 2 | 4-6 часов | Создание SHDR клиента |
| 3 | 2 часа | Оптимизация ADAM |
| 4 | 1 час | Обновление API |
| 5 | 2 часа | Обновление скриптов |
| 6 | 3 часа | Тестирование |
| **ИТОГО** | **13-15 часов** | **Полная модернизация** |

## 🎯 КРИТЕРИИ УСПЕХА

### **Технические:**
- ✅ FANUC данные читаются через SHDR (порты 7701-7708)
- ✅ MTConnect агенты не используются (порты 5001-5008 свободны)
- ✅ Cloud API получает те же данные что и раньше
- ✅ Dashboard отображает корректную информацию
- ✅ ADAM время цикла сохраняет точность ±1%

### **Производительности:**
- ✅ Время ответа системы < 2 сек (вместо 5+ сек)
- ✅ Использование памяти < 200MB (вместо 250MB)
- ✅ Количество сетевых соединений = 8 TCP (вместо 8 HTTP)

### **Надежности:**
- ✅ Система работает 24/7 без перезапусков
- ✅ Мониторинг показывает статус всех 8 FANUC адаптеров
- ✅ Логи не содержат ошибок соединения

---

**Дата создания:** 2024-12-18  
**Автор:** Андрей  
**Статус:** План готов к реализации  
**Версия:** 1.0