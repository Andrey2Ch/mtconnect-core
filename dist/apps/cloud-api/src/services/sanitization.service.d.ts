export declare class SanitizationService {
    sanitizeText(text: string, maxLength?: number): string;
    sanitizeCncCode(code: string, maxLength?: number): string;
    sanitizeNumber(value: any): number | undefined;
    sanitizeAdamData(data: any, depth?: number): any;
    sanitizeEnum(value: any, allowedValues: string[], defaultValue: string): string;
    sanitizeMachineData(data: any): any;
}
