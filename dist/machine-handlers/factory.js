"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MachineHandlerFactory = void 0;
const sr_10_handler_1 = require("./sr-10-handler");
const sr_21_handler_1 = require("./sr-21-handler");
const sr_23_handler_1 = require("./sr-23-handler");
const sr_25_handler_1 = require("./sr-25-handler");
const sr_26_handler_1 = require("./sr-26-handler");
const xd_20_handler_1 = require("./xd-20-handler");
const xd_38_handler_1 = require("./xd-38-handler");
const dt_26_handler_1 = require("./dt-26-handler");
class MachineHandlerFactory {
    static getHandler(machineId) {
        return this.handlers.get(machineId) || null;
    }
    static getAllHandlers() {
        return new Map(this.handlers);
    }
}
exports.MachineHandlerFactory = MachineHandlerFactory;
MachineHandlerFactory.handlers = new Map([
    ['SR-10', new sr_10_handler_1.SR10Handler()],
    ['SR-21', new sr_21_handler_1.SR21Handler()],
    ['SR-23', new sr_23_handler_1.SR23Handler()],
    ['SR-25', new sr_25_handler_1.Sr25Handler()],
    ['SR-26', new sr_26_handler_1.Sr26Handler()],
    ['XD-20', new xd_20_handler_1.Xd20Handler()],
    ['XD-38', new xd_38_handler_1.Xd38Handler()],
    ['DT-26', new dt_26_handler_1.Dt26Handler()]
]);
