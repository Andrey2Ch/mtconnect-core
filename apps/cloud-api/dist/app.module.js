"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const shdr_client_1 = require("./shdr-client");
const fs = require("fs");
const path = require("path");
const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../config.json'), 'utf-8'));
const shdrManager = new shdr_client_1.SHDRManager();
config.machines.forEach(machine => {
    if (machine.type === 'FANUC') {
        console.log(`🔧 Настройка SHDR подключения для ${machine.name} (localhost:${machine.port})`);
        shdrManager.addMachine({
            ip: 'localhost',
            port: machine.port,
            machineId: machine.id,
            machineName: machine.name,
        });
    }
});
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            {
                provide: shdr_client_1.SHDRManager,
                useValue: shdrManager,
            },
            {
                provide: 'FANUC_MACHINES',
                useValue: config.machines.filter(m => m.type === 'FANUC'),
            },
            {
                provide: 'ADAM_MACHINES',
                useValue: [],
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map