declare class MachineMonitor {
    private machines;
    private app;
    private monitoringInterval;
    private startTime;
    constructor();
    private setupServer;
    private checkMachineStatus;
    private updateMachineStatus;
    private monitorAllMachines;
    private formatUptime;
    private formatRelativeTime;
    startMonitoring(port?: number, intervalSeconds?: number): Promise<void>;
    stopMonitoring(): void;
}
export default MachineMonitor;
