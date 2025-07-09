import { Injectable } from '@nestjs/common';
import * as sanitizeHtml from 'sanitize-html';
import { escape } from 'validator';

@Injectable()
export class SanitizationService {
  
  /**
   * Sanitize general text content (machine names, descriptions)
   */
  sanitizeText(text: string, maxLength: number = 255): string {
    if (!text || typeof text !== 'string') return '';
    
    // Remove HTML tags and dangerous characters
    const cleaned = sanitizeHtml(text, {
      allowedTags: [], // No HTML tags allowed
      allowedAttributes: {},
      disallowedTagsMode: 'discard'
    });
    
    // Escape special characters for MongoDB
    const escaped = escape(cleaned);
    
    // Trim whitespace and limit length
    return escaped.trim().substring(0, maxLength);
  }

  /**
   * Sanitize CNC program code (more permissive for technical content)
   */
  sanitizeCncCode(code: string, maxLength: number = 10000): string {
    if (!code || typeof code !== 'string') return '';
    
    // Allow CNC-specific characters but remove HTML/script tags
    const cleaned = sanitizeHtml(code, {
      allowedTags: [], 
      allowedAttributes: {},
      disallowedTagsMode: 'discard',
      // Keep CNC-specific characters: G, M, N, X, Y, Z, F, S, T, etc.
      textFilter: (text) => {
        // Remove potentially dangerous patterns
        return text
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      }
    });
    
    return cleaned.trim().substring(0, maxLength);
  }

  /**
   * Sanitize numeric values
   */
  sanitizeNumber(value: any): number | undefined {
    if (value === null || value === undefined) return undefined;
    
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) return undefined;
    
    // Protect against extremely large numbers
    const MAX_SAFE_VALUE = 1e15;
    if (Math.abs(num) > MAX_SAFE_VALUE) return undefined;
    
    return num;
  }

  /**
   * Sanitize ADAM data object (recursive)
   */
  sanitizeAdamData(data: any, depth: number = 0): any {
    if (depth > 5) return null; // Prevent deep nesting attacks
    
    if (data === null || data === undefined) return null;
    
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
      // Limit array size to prevent DoS
      if (data.length > 100) return data.slice(0, 100);
      return data.map(item => this.sanitizeAdamData(item, depth + 1));
    }
    
    if (typeof data === 'object') {
      const sanitized: any = {};
      let keyCount = 0;
      
      for (const [key, value] of Object.entries(data)) {
        // Limit object properties to prevent DoS
        if (keyCount >= 50) break;
        
        // Sanitize key names
        const cleanKey = this.sanitizeText(key, 50);
        if (cleanKey) {
          sanitized[cleanKey] = this.sanitizeAdamData(value, depth + 1);
          keyCount++;
        }
      }
      
      return sanitized;
    }
    
    return null; // Unknown types
  }

  /**
   * Sanitize enum values with fallback defaults
   */
  sanitizeEnum(value: any, allowedValues: string[], defaultValue: string): string {
    if (!value || typeof value !== 'string' || value.trim() === '') {
      return defaultValue;
    }
    
    const cleanValue = this.sanitizeText(value, 50).toUpperCase();
    
    // Check if cleaned value is in allowed values
    if (allowedValues.includes(cleanValue)) {
      return cleanValue;
    }
    
    // Return default if not found
    return defaultValue;
  }

  /**
   * Sanitize machine data payload
   */
  sanitizeMachineData(data: any): any {
    return {
      partCount: this.sanitizeNumber(data.partCount),
      cycleTime: this.sanitizeNumber(data.cycleTime),
      executionStatus: this.sanitizeEnum(
        data.executionStatus, 
        ['ACTIVE', 'READY', 'STOPPED', 'UNAVAILABLE', 'INTERRUPTED', 'FEED_HOLD'],
        'UNAVAILABLE'  // Default для неизвестных значений
      ),
      availability: this.sanitizeEnum(
        data.availability,
        ['AVAILABLE', 'UNAVAILABLE'], 
        'UNAVAILABLE'  // Default для неизвестных значений
      ),
      program: this.sanitizeCncCode(data.program),
      block: this.sanitizeCncCode(data.block, 1000),
      line: this.sanitizeCncCode(data.line, 500),
      adamData: this.sanitizeAdamData(data.adamData)
    };
  }
} 