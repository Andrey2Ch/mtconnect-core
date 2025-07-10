export declare class AppController {
    getHealth(): {
        status: string;
        timestamp: string;
        service: string;
    };
    getStatus(): {
        service: string;
        version: string;
        uptime: number;
        environment: string;
    };
}
