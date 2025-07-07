export interface MachineHandler {
    machineId: string;
    machineName: string;
    
    // Получение данных из XML
    getPartCount(xmlData: any): number | null;
    getExecutionStatus(xmlData: any): string | null;
    getProgramNumber(xmlData: any): string | null;
    
    // Логика расчёта времени цикла
    calculateCycleTime(currentCount: number, previousCount: number, currentTime: Date, previousTime: Date): number | null;
    
    // Специфичные для станка настройки
    getDataItemId(): string;
    getCycleTimeFormat(): 'AVERAGE' | 'ACTUAL';
}

// Экспорт всех обработчиков
export * from './sr-10-handler';
export * from './sr-21-handler';
export * from './sr-23-handler';
export * from './sr-25-handler';
export * from './sr-26-handler';
export * from './xd-20-handler';
export * from './xd-38-handler';
export * from './dt-26-handler'; 