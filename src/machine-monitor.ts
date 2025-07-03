import * as net from 'net';
import express from 'express';
import * as path from 'path';

interface MachineStatus {
    name: string;
    ip: string;
    isOnline: boolean;
    lastSeen: Date | null;
    uptime: number; // в секундах
    totalChecks: number;
    successfulChecks: number;
    availability: number; // процент доступности
    responseTime: number; // время ответа в мс
}

class MachineMonitor {
    private machines: MachineStatus[] = [
        { name: 'DT-26', ip: '192.168.1.90', isOnline: false, lastSeen: null, uptime: 0, totalChecks: 0, successfulChecks: 0, availability: 0, responseTime: 0 },
        { name: 'SR-10', ip: '192.168.1.91', isOnline: false, lastSeen: null, uptime: 0, totalChecks: 0, successfulChecks: 0, availability: 0, responseTime: 0 },
        { name: 'SR-21', ip: '192.168.1.199', isOnline: false, lastSeen: null, uptime: 0, totalChecks: 0, successfulChecks: 0, availability: 0, responseTime: 0 },
        { name: 'SR-23', ip: '192.168.1.103', isOnline: false, lastSeen: null, uptime: 0, totalChecks: 0, successfulChecks: 0, availability: 0, responseTime: 0 },
        { name: 'SR-25', ip: '192.168.1.104', isOnline: false, lastSeen: null, uptime: 0, totalChecks: 0, successfulChecks: 0, availability: 0, responseTime: 0 },
        { name: 'SR-26', ip: '192.168.1.54', isOnline: false, lastSeen: null, uptime: 0, totalChecks: 0, successfulChecks: 0, availability: 0, responseTime: 0 },
        { name: 'XD-20', ip: '192.168.1.105', isOnline: false, lastSeen: null, uptime: 0, totalChecks: 0, successfulChecks: 0, availability: 0, responseTime: 0 },
        { name: 'XD-38', ip: '192.168.1.101', isOnline: false, lastSeen: null, uptime: 0, totalChecks: 0, successfulChecks: 0, availability: 0, responseTime: 0 }
    ];

    private app: express.Application;
    private monitoringInterval: NodeJS.Timeout | null = null;
    private startTime: Date = new Date();

    constructor() {
        this.app = express();
        this.setupServer();
    }

    private setupServer() {
        this.app.use(express.static('public'));
        
        // API эндпоинты
        this.app.get('/api/machines', (req, res) => {
            res.json({
                timestamp: new Date().toISOString(),
                systemUptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
                machines: this.machines.map(machine => ({
                    ...machine,
                    uptimeFormatted: this.formatUptime(machine.uptime),
                    lastSeenFormatted: machine.lastSeen ? this.formatRelativeTime(machine.lastSeen) : 'Никогда'
                }))
            });
        });

        this.app.get('/api/summary', (req, res) => {
            const onlineMachines = this.machines.filter(m => m.isOnline).length;
            const totalMachines = this.machines.length;
            const averageAvailability = this.machines.reduce((sum, m) => sum + m.availability, 0) / totalMachines;

            res.json({
                onlineMachines,
                totalMachines,
                offlineMachines: totalMachines - onlineMachines,
                productionEfficiency: ((onlineMachines / totalMachines) * 100).toFixed(1),
                averageAvailability: averageAvailability.toFixed(1),
                systemUptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000)
            });
        });

        // Главная страница
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/machine-dashboard.html'));
        });
    }

    private async checkMachineStatus(machine: MachineStatus): Promise<void> {
        const startTime = Date.now();
        
        return new Promise((resolve) => {
            machine.totalChecks++;
            
            const socket = new net.Socket();
            const timeout = setTimeout(() => {
                socket.destroy();
                this.updateMachineStatus(machine, false, Date.now() - startTime);
                resolve();
            }, 3000);

            socket.on('connect', () => {
                clearTimeout(timeout);
                socket.end();
                this.updateMachineStatus(machine, true, Date.now() - startTime);
                resolve();
            });

            socket.on('error', () => {
                clearTimeout(timeout);
                this.updateMachineStatus(machine, false, Date.now() - startTime);
                resolve();
            });

            socket.connect(8193, machine.ip);
        });
    }

    private updateMachineStatus(machine: MachineStatus, isOnline: boolean, responseTime: number) {
        const now = new Date();
        const wasOnline = machine.isOnline;
        
        machine.isOnline = isOnline;
        machine.responseTime = responseTime;
        
        if (isOnline) {
            machine.successfulChecks++;
            machine.lastSeen = now;
            
            if (!wasOnline) {
                console.log(`🟢 ${machine.name} (${machine.ip}) - ОНЛАЙН (${responseTime}ms)`);
            }
        } else {
            if (wasOnline) {
                console.log(`🔴 ${machine.name} (${machine.ip}) - ОФЛАЙН`);
            }
        }

        // Обновляем статистику доступности
        machine.availability = (machine.successfulChecks / machine.totalChecks) * 100;
        
        // Обновляем uptime (время с момента последнего успешного подключения)
        if (machine.lastSeen) {
            machine.uptime = Math.floor((now.getTime() - machine.lastSeen.getTime()) / 1000);
        }
    }

    private async monitorAllMachines() {
        console.log(`🔍 Проверяю статус всех станков... (${new Date().toLocaleTimeString()})`);
        
        const promises = this.machines.map(machine => this.checkMachineStatus(machine));
        await Promise.all(promises);
        
        const onlineCount = this.machines.filter(m => m.isOnline).length;
        const efficiency = ((onlineCount / this.machines.length) * 100).toFixed(1);
        
        console.log(`📊 Результат: ${onlineCount}/${this.machines.length} онлайн (${efficiency}% эффективность)`);
    }

    private formatUptime(seconds: number): string {
        if (seconds < 60) return `${seconds}с`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}м ${seconds % 60}с`;
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}ч ${minutes}м`;
    }

    private formatRelativeTime(date: Date): string {
        const secondsAgo = Math.floor((Date.now() - date.getTime()) / 1000);
        if (secondsAgo < 60) return `${secondsAgo} сек назад`;
        if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)} мин назад`;
        return `${Math.floor(secondsAgo / 3600)} час назад`;
    }

    async startMonitoring(port: number = 5000, intervalSeconds: number = 2) {
        console.log('🚀 Запускаю систему мониторинга станков...');
        
        // Первичная проверка
        await this.monitorAllMachines();
        
        // Запускаем веб-сервер
        this.app.listen(port, () => {
            console.log(`🌐 Дашборд доступен на http://localhost:${port}`);
            console.log(`📊 API: http://localhost:${port}/api/machines`);
        });
        
        // Запускаем периодический мониторинг
        this.monitoringInterval = setInterval(() => {
            this.monitorAllMachines().catch(console.error);
        }, intervalSeconds * 1000);
        
        console.log(`⏰ Мониторинг каждые ${intervalSeconds} секунд`);
        console.log('✅ Система мониторинга запущена!');
    }

    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        console.log('🛑 Мониторинг остановлен');
    }
}

export default MachineMonitor; 