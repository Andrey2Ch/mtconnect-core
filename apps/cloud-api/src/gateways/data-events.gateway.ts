import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // В production здесь должен быть ваш домен
  },
  namespace: '/data-events',
})
export class DataEventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DataEventsGateway.name);
  private connectedClients = new Map<string, Socket>();

  handleConnection(client: Socket) {
    this.connectedClients.set(client.id, client);
    this.logger.log(`Client connected: ${client.id}. Total clients: ${this.connectedClients.size}`);
    
    // Отправляем приветственное сообщение
    client.emit('connection-established', {
      message: 'Connected to MTConnect real-time data stream',
      timestamp: new Date().toISOString()
    });
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}. Total clients: ${this.connectedClients.size}`);
  }

  @SubscribeMessage('subscribe-machine')
  handleMachineSubscription(
    @MessageBody() data: { machineId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const room = `machine-${data.machineId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} subscribed to machine ${data.machineId}`);
    
    client.emit('subscription-confirmed', {
      machineId: data.machineId,
      room: room,
      timestamp: new Date().toISOString()
    });
  }

  @SubscribeMessage('unsubscribe-machine')
  handleMachineUnsubscription(
    @MessageBody() data: { machineId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const room = `machine-${data.machineId}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} unsubscribed from machine ${data.machineId}`);
  }

  // Методы для отправки данных клиентам
  
  // Отправить данные всем подключенным клиентам
  broadcastToAll(event: string, data: any): void {
    this.server.emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
    this.logger.log(`Broadcasted '${event}' to all clients (${this.connectedClients.size} clients)`);
  }

  // Отправить данные клиентам, подписанным на конкретную машину
  broadcastToMachine(machineId: string, event: string, data: any): void {
    const room = `machine-${machineId}`;
    this.server.to(room).emit(event, {
      ...data,
      machineId,
      timestamp: new Date().toISOString()
    });
    this.logger.log(`Broadcasted '${event}' to machine ${machineId} subscribers`);
  }

  // Отправить новые данные машины
  sendMachineData(machineId: string, data: any): void {
    this.broadcastToMachine(machineId, 'machine-data-update', data);
  }

  // Отправить агрегированные данные
  sendAggregatedData(machineId: string, aggregatedData: any): void {
    this.broadcastToMachine(machineId, 'aggregated-data-update', aggregatedData);
  }

  // Отправить алерт
  sendAlert(machineId: string, alert: any): void {
    this.broadcastToMachine(machineId, 'machine-alert', alert);
    // Также отправляем критические алерты всем
    if (alert.severity === 'critical') {
      this.broadcastToAll('critical-alert', { machineId, ...alert });
    }
  }

  // Отправить статус машины
  sendMachineStatus(machineId: string, status: any): void {
    this.broadcastToMachine(machineId, 'machine-status-update', status);
  }

  // Получить количество подключенных клиентов
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }
} 