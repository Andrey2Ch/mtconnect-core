import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class DataEventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private readonly logger;
    private connectedClients;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleMachineSubscription(data: {
        machineId: string;
    }, client: Socket): void;
    handleMachineUnsubscription(data: {
        machineId: string;
    }, client: Socket): void;
    broadcastToAll(event: string, data: any): void;
    broadcastToMachine(machineId: string, event: string, data: any): void;
    sendMachineData(machineId: string, data: any): void;
    sendAggregatedData(machineId: string, aggregatedData: any): void;
    sendAlert(machineId: string, alert: any): void;
    sendMachineStatus(machineId: string, status: any): void;
    getConnectedClientsCount(): number;
}
