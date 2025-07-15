# CREATIVE PHASE: Мониторинг производства

## 1.  ДИЗАЙН ДАШБОРДА

### Концепция интерфейса (референс FourJaw)

`mermaid
graph TD
    Header["ЗАГОЛОВОК: Логотип | Дата | Время | Навигация"]
    Summary["СВОДКА: Всего станков | Активные | Простой | Выработка"]
    Machines["КАРТОЧКИ СТАНКОВ: Статус | Время цикла | Счетчики"]
    Charts["ГРАФИКИ: Производительность | Тренды | Простои"]
    
    Header --> Summary
    Summary --> Machines
    Machines --> Charts
    
    style Header fill:#4da6ff,stroke:#0066cc,color:white
    style Summary fill:#4dbb5f,stroke:#36873f,color:white
    style Machines fill:#ffa64d,stroke:#cc7a30,color:white
    style Charts fill:#d971ff,stroke:#a33bc2,color:white
`

### Карточка станка (современный дизайн)

`

 M_1_XD-20                                     

                                                    
  ● АКТИВЕН                                     
                                                    
             
     26:14           1,423            87%     
    ТЕКУЩИЙ         ДЕТАЛЕЙ           OEE     
     ЦИКЛ           СЕГОДНЯ                   
             
                                                    
  
      ВРЕМЯ ЦИКЛА (МИН)                           
         
   40                                          
   30                                        
   20                                  
   10    
         
         1h      45m      30m      15m       now      
  

`

## 2.  АРХИТЕКТУРА РЕШЕНИЯ

### Сервис-ориентированный подход

`mermaid
graph TD
    subgraph "Cloud API (apps/cloud-api)"
        A[API Controller] -->|/api/edge-gateway/data| B(Data Processing Service)
        B --> C{MachineData Schema}
        C --> D[MongoDB TimeSeries]

        A --> E(Cycle Analysis Service)
        A --> F(Machine State Service)

        E --> C
        F --> C

        G[WebSocket Gateway] -->|Real-time Data| H[Frontend Dashboard]
        E --> G
        F --> G
    end

    subgraph "Edge Gateway"
        I[Data Collector] -->|HTTP POST| A
    end

    style A fill:#4da6ff,stroke:#0066cc,color:white
    style B fill:#ffa64d,stroke:#cc7a30,color:white
    style G fill:#d94dbb,stroke:#a3378a,color:white
    style H fill:#4dbb5f,stroke:#36873f,color:white
    style E fill:#ffa64d,stroke:#cc7a30,color:white
    style F fill:#ffa64d,stroke:#cc7a30,color:white
`

-   **DataProcessingService:** Принимает "сырые" данные, валидирует и сохраняет в MongoDB.
-   **CycleAnalysisService:** Анализирует TimeSeries данные для расчета циклов.
-   **MachineStateService:** Определяет операционный статус (Работа, Простой) и считает OEE.
-   **WebSocket Gateway:** Отправляет обработанные данные на дашборд.

## 3.  ДИЗАЙН АЛГОРИТМОВ

### Машина состояний для определения циклов

`mermaid
stateDiagram-v2
    [*] --> READY: Инициализация

    state "Рабочий цикл" as Cycle {
        ACTIVE --> PART_COUNT_INCREASED: Конец цикла
        PART_COUNT_INCREASED --> ACTIVE: Новый цикл
    }

    READY --> ACTIVE: Старт (executionStatus -> ACTIVE)
    ACTIVE --> READY: Остановка (executionStatus -> READY)

    ACTIVE --> INTERRUPTED: Пауза / Прерывание
    INTERRUPTED --> ACTIVE: Возобновление

    state "Простои" as Downtime {
        STOPPED: Плановая остановка
        UNAVAILABLE: Ошибка / Авария
    }

    READY --> STOPPED
    STOPPED --> READY

    ACTIVE --> UNAVAILABLE
    INTERRUPTED --> UNAVAILABLE
    UNAVAILABLE --> READY: Ошибка устранена
`

-   **Логика:** Храним previous_state для каждой машины. При поступлении новых данных, сравниваем состояния и вычисляем метрики.
-   **Время цикла:** 	imestamp(PART_COUNT_INCREASED) - timestamp(старт состояния ACTIVE).
-   **Время простоя:** 	imestamp(вход в состояние простоя) - timestamp(выход из рабочего состояния).

### Расчет OEE (Overall Equipment Effectiveness)

**OEE = Доступность  Производительность  Качество**

1.  **Доступность:** (Рабочее время) / (Плановое время)
2.  **Производительность:** (Идеальное время цикла  Кол-во деталей) / (Рабочее время)
3.  **Качество:** (Качественные детали) / (Всего деталей) (пока принимаем за 100%)
