import { Injectable, Logger } from '@nestjs/common';
import { DataEventsGateway } from '../gateways/data-events.gateway';

interface AlertRule {
  id: string;
  machineId: string;
  parameter: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  enabled: boolean;
}

interface Alert {
  id: string;
  machineId: string;
  ruleId: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
}

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);
  private alertRules: Map<string, AlertRule[]> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();

  constructor(private dataEventsGateway: DataEventsGateway) {
    this.logger.log('AlertingService initialized');
    this.initializeDefaultRules();
  }

  // Инициализация правил по умолчанию
  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'temp-high',
        machineId: '*', // Применяется ко всем машинам
        parameter: 'temperature',
        condition: 'greater_than',
        threshold: 80,
        severity: 'warning',
        message: 'High temperature detected',
        enabled: true
      },
      {
        id: 'temp-critical',
        machineId: '*',
        parameter: 'temperature',
        condition: 'greater_than',
        threshold: 100,
        severity: 'critical',
        message: 'Critical temperature level',
        enabled: true
      },
      {
        id: 'spindle-stopped',
        machineId: '*',
        parameter: 'spindleSpeed',
        condition: 'equals',
        threshold: 0,
        severity: 'info',
        message: 'Spindle stopped',
        enabled: true
      },
      {
        id: 'parts-production-low',
        machineId: '*',
        parameter: 'partsProduced',
        condition: 'less_than',
        threshold: 1,
        severity: 'warning',
        message: 'Low parts production rate',
        enabled: true
      }
    ];

    // Добавляем правила для всех машин
    this.alertRules.set('*', defaultRules);
    this.logger.log(`Initialized ${defaultRules.length} default alert rules`);
  }

  // Добавить новое правило алертов
  addAlertRule(rule: AlertRule): void {
    const machineRules = this.alertRules.get(rule.machineId) || [];
    machineRules.push(rule);
    this.alertRules.set(rule.machineId, machineRules);
    this.logger.log(`Added alert rule '${rule.id}' for machine ${rule.machineId}`);
  }

  // Удалить правило алертов
  removeAlertRule(machineId: string, ruleId: string): void {
    const machineRules = this.alertRules.get(machineId) || [];
    const updatedRules = machineRules.filter(rule => rule.id !== ruleId);
    this.alertRules.set(machineId, updatedRules);
    this.logger.log(`Removed alert rule '${ruleId}' for machine ${machineId}`);
  }

  // Проверить данные на соответствие правилам алертов
  checkAlerts(machineId: string, data: any): void {
    const globalRules = this.alertRules.get('*') || [];
    const machineRules = this.alertRules.get(machineId) || [];
    const allRules = [...globalRules, ...machineRules];

    allRules.forEach(rule => {
      if (!rule.enabled) return;

      const value = this.extractValue(data, rule.parameter);
      if (value === null || value === undefined) return;

      const isTriggered = this.evaluateCondition(value, rule.condition, rule.threshold);
      
      if (isTriggered) {
        this.triggerAlert(machineId, rule, value);
      } else {
        // Если условие больше не выполняется, снимаем алерт
        this.resolveAlert(machineId, rule.id);
      }
    });
  }

  // Извлечь значение параметра из данных
  private extractValue(data: any, parameter: string): number | null {
    // Поддерживаем вложенные объекты (например, data.temperature)
    const keys = parameter.split('.');
    let value = data;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }

    return typeof value === 'number' ? value : null;
  }

  // Оценить условие
  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'greater_than':
        return value > threshold;
      case 'less_than':
        return value < threshold;
      case 'equals':
        return value === threshold;
      case 'not_equals':
        return value !== threshold;
      default:
        return false;
    }
  }

  // Запустить алерт
  private triggerAlert(machineId: string, rule: AlertRule, value: number): void {
    const alertKey = `${machineId}-${rule.id}`;
    
    // Проверяем, не активен ли уже этот алерт
    if (this.activeAlerts.has(alertKey)) {
      return; // Алерт уже активен, не дублируем
    }

    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      machineId,
      ruleId: rule.id,
      type: rule.parameter,
      severity: rule.severity,
      message: `${rule.message} (${value} ${rule.condition.replace('_', ' ')} ${rule.threshold})`,
      value,
      threshold: rule.threshold,
      timestamp: new Date().toISOString()
    };

    this.activeAlerts.set(alertKey, alert);
    
    // Отправляем алерт через WebSocket
    this.dataEventsGateway.sendAlert(machineId, alert);
    
    this.logger.warn(`ALERT TRIGGERED: ${alert.message} for machine ${machineId}`);
  }

  // Снять алерт
  private resolveAlert(machineId: string, ruleId: string): void {
    const alertKey = `${machineId}-${ruleId}`;
    
    if (this.activeAlerts.has(alertKey)) {
      const alert = this.activeAlerts.get(alertKey);
      this.activeAlerts.delete(alertKey);
      
      // Отправляем уведомление о снятии алерта
      this.dataEventsGateway.sendAlert(machineId, {
        ...alert,
        type: 'alert-resolved',
        message: `Alert resolved: ${alert?.message}`,
        timestamp: new Date().toISOString()
      });
      
      this.logger.log(`Alert resolved: ${ruleId} for machine ${machineId}`);
    }
  }

  // Получить активные алерты
  getActiveAlerts(machineId?: string): Alert[] {
    const alerts = Array.from(this.activeAlerts.values());
    return machineId ? alerts.filter(alert => alert.machineId === machineId) : alerts;
  }

  // Получить правила алертов
  getAlertRules(machineId?: string): AlertRule[] {
    if (machineId) {
      const globalRules = this.alertRules.get('*') || [];
      const machineRules = this.alertRules.get(machineId) || [];
      return [...globalRules, ...machineRules];
    }
    
    const allRules: AlertRule[] = [];
    this.alertRules.forEach(rules => allRules.push(...rules));
    return allRules;
  }

  // Включить/выключить правило
  toggleAlertRule(machineId: string, ruleId: string, enabled: boolean): void {
    const rules = this.alertRules.get(machineId) || [];
    const rule = rules.find(r => r.id === ruleId);
    
    if (rule) {
      rule.enabled = enabled;
      this.logger.log(`Alert rule '${ruleId}' ${enabled ? 'enabled' : 'disabled'} for machine ${machineId}`);
    }
  }
} 