"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SanitizationService = void 0;
const common_1 = require("@nestjs/common");
const sanitize_html_1 = __importDefault(require("sanitize-html"));
const validator_1 = require("validator");
let SanitizationService = class SanitizationService {
    sanitizeText(text, maxLength = 255) {
        if (!text || typeof text !== 'string')
            return '';
        const cleaned = (0, sanitize_html_1.default)(text, {
            allowedTags: [],
            allowedAttributes: {},
            disallowedTagsMode: 'discard'
        });
        const escaped = (0, validator_1.escape)(cleaned);
        return escaped.trim().substring(0, maxLength);
    }
    sanitizeCncCode(code, maxLength = 10000) {
        if (!code || typeof code !== 'string')
            return '';
        const cleaned = (0, sanitize_html_1.default)(code, {
            allowedTags: [],
            allowedAttributes: {},
            disallowedTagsMode: 'discard',
            textFilter: (text) => {
                return text
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+\s*=/gi, '');
            }
        });
        return cleaned.trim().substring(0, maxLength);
    }
    sanitizeNumber(value) {
        if (value === null || value === undefined)
            return undefined;
        const num = Number(value);
        if (isNaN(num) || !isFinite(num))
            return undefined;
        const MAX_SAFE_VALUE = 1e15;
        if (Math.abs(num) > MAX_SAFE_VALUE)
            return undefined;
        return num;
    }
    sanitizeAdamData(data, depth = 0) {
        if (depth > 5)
            return null;
        if (data === null || data === undefined)
            return null;
        if (typeof data === 'string') {
            return this.sanitizeText(data, 1000);
        }
        if (typeof data === 'number') {
            return this.sanitizeNumber(data);
        }
        if (typeof data === 'boolean') {
            return Boolean(data);
        }
        if (Array.isArray(data)) {
            if (data.length > 100)
                return data.slice(0, 100);
            return data.map(item => this.sanitizeAdamData(item, depth + 1));
        }
        if (typeof data === 'object') {
            const sanitized = {};
            let keyCount = 0;
            for (const [key, value] of Object.entries(data)) {
                if (keyCount >= 50)
                    break;
                const cleanKey = this.sanitizeText(key, 50);
                if (cleanKey) {
                    sanitized[cleanKey] = this.sanitizeAdamData(value, depth + 1);
                    keyCount++;
                }
            }
            return sanitized;
        }
        return null;
    }
    sanitizeEnum(value, allowedValues, defaultValue) {
        if (!value || typeof value !== 'string' || value.trim() === '') {
            return defaultValue;
        }
        const cleanValue = this.sanitizeText(value, 50).toUpperCase();
        if (allowedValues.includes(cleanValue)) {
            return cleanValue;
        }
        return defaultValue;
    }
    sanitizeMachineData(data) {
        return {
            partCount: this.sanitizeNumber(data.partCount),
            cycleTime: this.sanitizeNumber(data.cycleTime),
            executionStatus: this.sanitizeEnum(data.executionStatus, ['ACTIVE', 'READY', 'STOPPED', 'UNAVAILABLE', 'INTERRUPTED', 'FEED_HOLD'], 'UNAVAILABLE'),
            availability: this.sanitizeEnum(data.availability, ['AVAILABLE', 'UNAVAILABLE'], 'UNAVAILABLE'),
            program: this.sanitizeCncCode(data.program),
            block: this.sanitizeCncCode(data.block, 1000),
            line: this.sanitizeCncCode(data.line, 500),
            adamData: this.sanitizeAdamData(data.adamData)
        };
    }
};
exports.SanitizationService = SanitizationService;
exports.SanitizationService = SanitizationService = __decorate([
    (0, common_1.Injectable)()
], SanitizationService);
//# sourceMappingURL=sanitization.service.js.map