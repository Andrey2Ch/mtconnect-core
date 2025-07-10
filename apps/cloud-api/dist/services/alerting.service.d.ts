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
export declare class AlertingService {
    private dataEventsGateway;
    private readonly logger;
    private alertRules;
    private activeAlerts;
    constructor(dataEventsGateway: DataEventsGateway);
    private initializeDefaultRules;
    addAlertRule(rule: AlertRule): void;
    removeAlertRule(machineId: string, ruleId: string): void;
    checkAlerts(machineId: string, data: any): void;
    private extractValue;
    private evaluateCondition;
    private triggerAlert;
    private resolveAlert;
    getActiveAlerts(machineId?: string): Alert[];
    getAlertRules(machineId?: string): AlertRule[];
    toggleAlertRule(machineId: string, ruleId: string, enabled: boolean): void;
}
export {};
