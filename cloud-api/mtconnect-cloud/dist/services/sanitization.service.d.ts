export declare class SanitizationService {
    sanitizeText(text: string, maxLength?: number): string;
    sanitizeCncCode(code: string, maxLength?: number): string;
    sanitizeNumber(value: any): number | undefined;
    sanitizeAdamData(data: any, depth?: number): any;
    sanitizeMachineData(data: any): any;
}
