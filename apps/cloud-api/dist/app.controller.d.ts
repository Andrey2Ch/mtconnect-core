import { AppService } from './app.service';
interface AdamMachine {
    id: string;
    name: string;
    channel: number;
    ip: string;
    port: number;
    type: string;
    status: string;
    count?: number;
    lastUpdate?: string;
    confidence?: string;
}
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getHello(): string;
    getHealth(): {
        status: string;
        timestamp: string;
        service: string;
        version: string;
    };
    getDashboard(): {
        message: string;
        endpoints: {
            '/machines': string;
            '/health': string;
            '/dashboard/index.html': string;
        };
    };
    getMachines(): Promise<{
        timestamp: string;
        summary: {
            total: number;
            mtconnect: {
                total: number;
                online: number;
                offline: number;
            };
            adam: {
                total: number;
                online: number;
                offline: number;
            };
        };
        machines: {
            mtconnect: any[];
            adam: AdamMachine[];
        };
    } | {
        timestamp: string;
        error: any;
        summary: {
            total: number;
            mtconnect: {
                total: number;
                online: number;
                offline: number;
            };
            adam: {
                total: number;
                online: number;
                offline: number;
            };
        };
        machines: {
            mtconnect: any[];
            adam: any[];
        };
    }>;
    private getAdamMachines;
    private testAdamConnection;
}
export {};
