"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AlertingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertingService = void 0;
const common_1 = require("@nestjs/common");
const data_events_gateway_1 = require("../gateways/data-events.gateway");
let AlertingService = AlertingService_1 = class AlertingService {
    constructor(dataEventsGateway) {
        this.dataEventsGateway = dataEventsGateway;
        this.logger = new common_1.Logger(AlertingService_1.name);
        this.alertRules = new Map();
        this.activeAlerts = new Map();
        this.logger.log('AlertingService initialized');
        this.initializeDefaultRules();
    }
    initializeDefaultRules() {
        const defaultRules = [
            {
                id: 'temp-high',
                machineId: '*',
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
        this.alertRules.set('*', defaultRules);
        this.logger.log(`Initialized ${defaultRules.length} default alert rules`);
    }
    addAlertRule(rule) {
        const machineRules = this.alertRules.get(rule.machineId) || [];
        machineRules.push(rule);
        this.alertRules.set(rule.machineId, machineRules);
        this.logger.log(`Added alert rule '${rule.id}' for machine ${rule.machineId}`);
    }
    removeAlertRule(machineId, ruleId) {
        const machineRules = this.alertRules.get(machineId) || [];
        const updatedRules = machineRules.filter(rule => rule.id !== ruleId);
        this.alertRules.set(machineId, updatedRules);
        this.logger.log(`Removed alert rule '${ruleId}' for machine ${machineId}`);
    }
    checkAlerts(machineId, data) {
        const globalRules = this.alertRules.get('*') || [];
        const machineRules = this.alertRules.get(machineId) || [];
        const allRules = [...globalRules, ...machineRules];
        allRules.forEach(rule => {
            if (!rule.enabled)
                return;
            const value = this.extractValue(data, rule.parameter);
            if (value === null || value === undefined)
                return;
            const isTriggered = this.evaluateCondition(value, rule.condition, rule.threshold);
            if (isTriggered) {
                this.triggerAlert(machineId, rule, value);
            }
            else {
                this.resolveAlert(machineId, rule.id);
            }
        });
    }
    extractValue(data, parameter) {
        const keys = parameter.split('.');
        let value = data;
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            }
            else {
                return null;
            }
        }
        return typeof value === 'number' ? value : null;
    }
    evaluateCondition(value, condition, threshold) {
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
    triggerAlert(machineId, rule, value) {
        const alertKey = `${machineId}-${rule.id}`;
        if (this.activeAlerts.has(alertKey)) {
            return;
        }
        const alert = {
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
        this.dataEventsGateway.sendAlert(machineId, alert);
        this.logger.warn(`ALERT TRIGGERED: ${alert.message} for machine ${machineId}`);
    }
    resolveAlert(machineId, ruleId) {
        const alertKey = `${machineId}-${ruleId}`;
        if (this.activeAlerts.has(alertKey)) {
            const alert = this.activeAlerts.get(alertKey);
            this.activeAlerts.delete(alertKey);
            this.dataEventsGateway.sendAlert(machineId, {
                ...alert,
                type: 'alert-resolved',
                message: `Alert resolved: ${alert?.message}`,
                timestamp: new Date().toISOString()
            });
            this.logger.log(`Alert resolved: ${ruleId} for machine ${machineId}`);
        }
    }
    getActiveAlerts(machineId) {
        const alerts = Array.from(this.activeAlerts.values());
        return machineId ? alerts.filter(alert => alert.machineId === machineId) : alerts;
    }
    getAlertRules(machineId) {
        if (machineId) {
            const globalRules = this.alertRules.get('*') || [];
            const machineRules = this.alertRules.get(machineId) || [];
            return [...globalRules, ...machineRules];
        }
        const allRules = [];
        this.alertRules.forEach(rules => allRules.push(...rules));
        return allRules;
    }
    toggleAlertRule(machineId, ruleId, enabled) {
        const rules = this.alertRules.get(machineId) || [];
        const rule = rules.find(r => r.id === ruleId);
        if (rule) {
            rule.enabled = enabled;
            this.logger.log(`Alert rule '${ruleId}' ${enabled ? 'enabled' : 'disabled'} for machine ${machineId}`);
        }
    }
};
exports.AlertingService = AlertingService;
exports.AlertingService = AlertingService = AlertingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [data_events_gateway_1.DataEventsGateway])
], AlertingService);
//# sourceMappingURL=alerting.service.js.map