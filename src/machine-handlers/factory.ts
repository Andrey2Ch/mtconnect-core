import { MachineHandler } from './index';
import { SR10Handler } from './sr-10-handler';
import { SR21Handler } from './sr-21-handler';
import { SR23Handler } from './sr-23-handler';
import { Sr25Handler } from './sr-25-handler';
import { Sr26Handler } from './sr-26-handler';
import { Xd20Handler } from './xd-20-handler';
import { Xd38Handler } from './xd-38-handler';
import { Dt26Handler } from './dt-26-handler';
import { K16Handler } from './k-16-handler';
import { L20Handler } from './l-20-handler';

export class MachineHandlerFactory {
    private static handlers = new Map<string, MachineHandler>([
        ['SR-10', new SR10Handler()],
        ['SR-21', new SR21Handler()],
        ['SR-23', new SR23Handler()],
        ['SR-25', new Sr25Handler()],
        ['SR-26', new Sr26Handler()],
        ['XD-20', new Xd20Handler()],
        ['XD-38', new Xd38Handler()],
        ['DT-26', new Dt26Handler()],
        ['K-16', new K16Handler()],
        ['L-20', new L20Handler()]
    ]);

    static getHandler(machineId: string): MachineHandler | null {
        return this.handlers.get(machineId) || null;
    }

    static getAllHandlers(): Map<string, MachineHandler> {
        return new Map(this.handlers);
    }
} 