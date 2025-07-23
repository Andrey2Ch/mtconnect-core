import { MachineHandler } from './index';
export declare class MachineHandlerFactory {
    private static handlers;
    static getHandler(machineId: string): MachineHandler | null;
    static getAllHandlers(): Map<string, MachineHandler>;
}
