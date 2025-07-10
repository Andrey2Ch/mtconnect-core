"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DataEventsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataEventsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
let DataEventsGateway = DataEventsGateway_1 = class DataEventsGateway {
    server;
    logger = new common_1.Logger(DataEventsGateway_1.name);
    connectedClients = new Map();
    handleConnection(client) {
        this.connectedClients.set(client.id, client);
        this.logger.log(`Client connected: ${client.id}. Total clients: ${this.connectedClients.size}`);
        client.emit('connection-established', {
            message: 'Connected to MTConnect real-time data stream',
            timestamp: new Date().toISOString()
        });
    }
    handleDisconnect(client) {
        this.connectedClients.delete(client.id);
        this.logger.log(`Client disconnected: ${client.id}. Total clients: ${this.connectedClients.size}`);
    }
    handleMachineSubscription(data, client) {
        const room = `machine-${data.machineId}`;
        client.join(room);
        this.logger.log(`Client ${client.id} subscribed to machine ${data.machineId}`);
        client.emit('subscription-confirmed', {
            machineId: data.machineId,
            room: room,
            timestamp: new Date().toISOString()
        });
    }
    handleMachineUnsubscription(data, client) {
        const room = `machine-${data.machineId}`;
        client.leave(room);
        this.logger.log(`Client ${client.id} unsubscribed from machine ${data.machineId}`);
    }
    broadcastToAll(event, data) {
        this.server.emit(event, {
            ...data,
            timestamp: new Date().toISOString()
        });
        this.logger.log(`Broadcasted '${event}' to all clients (${this.connectedClients.size} clients)`);
    }
    broadcastToMachine(machineId, event, data) {
        const room = `machine-${machineId}`;
        this.server.to(room).emit(event, {
            ...data,
            machineId,
            timestamp: new Date().toISOString()
        });
        this.logger.log(`Broadcasted '${event}' to machine ${machineId} subscribers`);
    }
    sendMachineData(machineId, data) {
        this.broadcastToMachine(machineId, 'machine-data-update', data);
    }
    sendAggregatedData(machineId, aggregatedData) {
        this.broadcastToMachine(machineId, 'aggregated-data-update', aggregatedData);
    }
    sendAlert(machineId, alert) {
        this.broadcastToMachine(machineId, 'machine-alert', alert);
        if (alert.severity === 'critical') {
            this.broadcastToAll('critical-alert', { machineId, ...alert });
        }
    }
    sendMachineStatus(machineId, status) {
        this.broadcastToMachine(machineId, 'machine-status-update', status);
    }
    getConnectedClientsCount() {
        return this.connectedClients.size;
    }
};
exports.DataEventsGateway = DataEventsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], DataEventsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe-machine'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], DataEventsGateway.prototype, "handleMachineSubscription", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('unsubscribe-machine'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], DataEventsGateway.prototype, "handleMachineUnsubscription", null);
exports.DataEventsGateway = DataEventsGateway = DataEventsGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
        namespace: '/data-events',
    })
], DataEventsGateway);
//# sourceMappingURL=data-events.gateway.js.map