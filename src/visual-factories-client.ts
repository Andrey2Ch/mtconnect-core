import * as http from 'http';
import { parseString } from 'xml2js';

interface MachineData {
    timestamp: string;
    programNumber: number;
    currentProgram: number;
    sequenceNumber: number;
    feedrate: number;
    spindleSpeed: number;
    positions: {
        X: { value: number; unit: string };
        Y: { value: number; unit: string };
        Z: { value: number; unit: string };
    };
    status: {
        mode: number;
        automatic: number;
        running: number;
        motion: number;
        emergency: number;
        alarm: number;
    };
}

interface MTConnectAgent {
    name: string;
    port: number;
    url: string;
}

export class VisualFactoriesClient {
    private agents: MTConnectAgent[] = [
        { name: 'DT-26', port: 5005, url: 'http://127.0.0.1:5005' },
        { name: 'SR-10', port: 5004, url: 'http://127.0.0.1:5004' },
        { name: 'SR-21', port: 5006, url: 'http://127.0.0.1:5006' },
        { name: 'SR-23', port: 5007, url: 'http://127.0.0.1:5007' },
        { name: 'SR-25', port: 5008, url: 'http://127.0.0.1:5008' },
        { name: 'SR-26', port: 5002, url: 'http://127.0.0.1:5002' },
        { name: 'XD-20', port: 5001, url: 'http://127.0.0.1:5001' },
        { name: 'XD-38', port: 5003, url: 'http://127.0.0.1:5003' }
    ];

    constructor(remoteIP?: string) {
        if (remoteIP) {
            console.log(`🌐 Подключаюсь к удаленным агентам на ${remoteIP}`);
            this.agents = [
                { name: 'DT-26', port: 5005, url: `http://${remoteIP}:5005` },
                { name: 'SR-10', port: 5004, url: `http://${remoteIP}:5004` },
                { name: 'SR-21', port: 5006, url: `http://${remoteIP}:5006` },
                { name: 'SR-23', port: 5007, url: `http://${remoteIP}:5007` },
                { name: 'SR-25', port: 5008, url: `http://${remoteIP}:5008` },
                { name: 'SR-26', port: 5002, url: `http://${remoteIP}:5002` },
                { name: 'XD-20', port: 5001, url: `http://${remoteIP}:5001` },
                { name: 'XD-38', port: 5003, url: `http://${remoteIP}:5003` }
            ];
        }
    }

    async checkAgentStatus(agent: MTConnectAgent): Promise<boolean> {
        return new Promise((resolve) => {
            const req = http.get(`${agent.url}/current`, { timeout: 3000 }, (res) => {
                resolve(res.statusCode === 200);
            });
            
            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
        });
    }

    async getRealTimeData(machineName: string): Promise<MachineData | null> {
        const agent = this.agents.find(a => a.name === machineName);
        if (!agent) {
            console.log(`❌ Агент для машины ${machineName} не найден`);
            return null;
        }

        // Проверяем доступность агента
        const isOnline = await this.checkAgentStatus(agent);
        if (!isOnline) {
            console.log(`❌ MTConnect агент ${agent.name} недоступен на ${agent.url}`);
            return null;
        }

        try {
            console.log(`📡 Получаю РЕАЛЬНЫЕ данные от ${agent.name} (${agent.url})`);
            
            const xmlData = await this.fetchMTConnectData(agent.url);
            const machineData = await this.parseMTConnectXML(xmlData);
            
            console.log(`✅ РЕАЛЬНЫЕ данные от ${agent.name}:`, JSON.stringify(machineData, null, 2));
            return machineData;
            
        } catch (error) {
            console.error(`❌ Ошибка получения данных от ${agent.name}:`, error);
            return null;
        }
    }

    private async fetchMTConnectData(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const req = http.get(`${url}/current`, { timeout: 5000 }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            });
            
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Timeout'));
            });
        });
    }

    private async parseMTConnectXML(xmlData: string): Promise<MachineData> {
        return new Promise((resolve, reject) => {
            parseString(xmlData, (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }

                try {
                    // Парсим MTConnect XML структуру
                    const deviceStream = result.MTConnectStreams?.Streams?.[0]?.DeviceStream?.[0];
                    if (!deviceStream) {
                        throw new Error('DeviceStream не найден в XML');
                    }

                    const componentStreams = deviceStream.ComponentStream || [];
                    
                    // Извлекаем данные из различных ComponentStream
                    let spindleSpeed = 0;
                    let feedrate = 0;
                    let xPos = 0, yPos = 0, zPos = 0;
                    let programNumber = 0;
                    let sequenceNumber = 0;
                    let mode = 0, automatic = 0, running = 0;

                    componentStreams.forEach((stream: any) => {
                        const samples = stream.Samples?.[0] || {};
                        const events = stream.Events?.[0] || {};

                        // Извлекаем скорость шпинделя
                        if (samples.SpindleSpeed) {
                            spindleSpeed = parseFloat(samples.SpindleSpeed[0]._) || 0;
                        }

                        // Извлекаем подачу
                        if (samples.Feedrate) {
                            feedrate = parseFloat(samples.Feedrate[0]._) || 0;
                        }

                        // Извлекаем позиции
                        if (samples.Position) {
                            samples.Position.forEach((pos: any) => {
                                const axis = pos.$.subType;
                                const value = parseFloat(pos._) || 0;
                                if (axis === 'X') xPos = value;
                                else if (axis === 'Y') yPos = value;
                                else if (axis === 'Z') zPos = value;
                            });
                        }

                        // Извлекаем программу и номер строки
                        if (events.Program) {
                            programNumber = parseInt(events.Program[0]._) || 0;
                        }
                        if (events.Line) {
                            sequenceNumber = parseInt(events.Line[0]._) || 0;
                        }

                        // Извлекаем статусы
                        if (events.Execution) {
                            const exec = events.Execution[0]._;
                            running = exec === 'ACTIVE' ? 1 : 0;
                        }
                        if (events.ControllerMode) {
                            const controllerMode = events.ControllerMode[0]._;
                            automatic = controllerMode === 'AUTOMATIC' ? 1 : 0;
                        }
                    });

                    const now = new Date();
                    const machineData: MachineData = {
                        timestamp: now.toISOString(),
                        programNumber,
                        currentProgram: programNumber,
                        sequenceNumber,
                        feedrate,
                        spindleSpeed,
                        positions: {
                            X: { value: xPos, unit: 'mm' },
                            Y: { value: yPos, unit: 'mm' },
                            Z: { value: zPos, unit: 'mm' }
                        },
                        status: {
                            mode,
                            automatic,
                            running,
                            motion: running,
                            emergency: 0,
                            alarm: 0
                        }
                    };

                    resolve(machineData);

                } catch (parseError) {
                    reject(parseError);
                }
            });
        });
    }

    async getAllMachineData(): Promise<{ [machineName: string]: MachineData | null }> {
        const results: { [machineName: string]: MachineData | null } = {};

        for (const agent of this.agents) {
            results[agent.name] = await this.getRealTimeData(agent.name);
        }

        return results;
    }

    async getWorkingAgents(): Promise<MTConnectAgent[]> {
        const workingAgents: MTConnectAgent[] = [];

        for (const agent of this.agents) {
            const isOnline = await this.checkAgentStatus(agent);
            if (isOnline) {
                workingAgents.push(agent);
                console.log(`✅ MTConnect агент ${agent.name} работает на ${agent.url}`);
            } else {
                console.log(`❌ MTConnect агент ${agent.name} недоступен на ${agent.url}`);
            }
        }

        return workingAgents;
    }

    // Автоматически найти рабочие агенты в сети
    async findWorkingAgentsInNetwork(): Promise<MTConnectAgent[]> {
        console.log('🔍 Ищу MTConnect агенты в сети...');
        
        // Проверяем локальные агенты
        console.log('📡 Проверяю локальные агенты...');
        let workingAgents = await this.getWorkingAgents();
        
        if (workingAgents.length > 0) {
            console.log(`✅ Найдено ${workingAgents.length} локальных агентов`);
            return workingAgents;
        }
        
        // Если локальных нет, ищем в подсети станков
        const stationIPs = [
            '192.168.1.90', '192.168.1.91', '192.168.1.199', 
            '192.168.1.103', '192.168.1.104', '192.168.1.54',
            '192.168.1.105', '192.168.1.101'
        ];
        
        for (const ip of stationIPs) {
            console.log(`🔍 Проверяю ${ip} на наличие MTConnect агентов...`);
            
            // Обновляем URL'ы для этого IP
            this.agents = [
                { name: 'DT-26', port: 5005, url: `http://${ip}:5005` },
                { name: 'SR-10', port: 5004, url: `http://${ip}:5004` },
                { name: 'SR-21', port: 5006, url: `http://${ip}:5006` },
                { name: 'SR-23', port: 5007, url: `http://${ip}:5007` },
                { name: 'SR-25', port: 5008, url: `http://${ip}:5008` },
                { name: 'SR-26', port: 5002, url: `http://${ip}:5002` },
                { name: 'XD-20', port: 5001, url: `http://${ip}:5001` },
                { name: 'XD-38', port: 5003, url: `http://${ip}:5003` }
            ];
            
            workingAgents = await this.getWorkingAgents();
            if (workingAgents.length > 0) {
                console.log(`🎯 НАШЕЛ агенты на ${ip}! Найдено: ${workingAgents.length}`);
                return workingAgents;
            }
        }
        
        // Проверяем другие возможные IP в подсети
        const commonIPs = [
            '192.168.1.100', '192.168.1.200', '192.168.1.50', 
            '192.168.1.10', '192.168.1.20', '192.168.1.110'
        ];
        
        for (const ip of commonIPs) {
            console.log(`🔍 Проверяю ${ip}...`);
            
            this.agents = [
                { name: 'DT-26', port: 5005, url: `http://${ip}:5005` },
                { name: 'SR-10', port: 5004, url: `http://${ip}:5004` },
                { name: 'SR-21', port: 5006, url: `http://${ip}:5006` },
                { name: 'SR-23', port: 5007, url: `http://${ip}:5007` },
                { name: 'SR-25', port: 5008, url: `http://${ip}:5008` },
                { name: 'SR-26', port: 5002, url: `http://${ip}:5002` },
                { name: 'XD-20', port: 5001, url: `http://${ip}:5001` },
                { name: 'XD-38', port: 5003, url: `http://${ip}:5003` }
            ];
            
            workingAgents = await this.getWorkingAgents();
            if (workingAgents.length > 0) {
                console.log(`🎯 НАШЕЛ агенты на ${ip}! Найдено: ${workingAgents.length}`);
                return workingAgents;
            }
        }
        
        console.log('❌ MTConnect агенты не найдены в сети');
        return [];
    }
} 