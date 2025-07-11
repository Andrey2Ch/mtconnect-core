"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AdamCollectorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdamCollectorService = void 0;
const common_1 = require("@nestjs/common");
let AdamCollectorService = AdamCollectorService_1 = class AdamCollectorService {
    logger = new common_1.Logger(AdamCollectorService_1.name);
    async collectAllMachines() {
        this.logger.debug('Collecting ADAM data...');
        return [];
    }
};
exports.AdamCollectorService = AdamCollectorService;
exports.AdamCollectorService = AdamCollectorService = AdamCollectorService_1 = __decorate([
    (0, common_1.Injectable)()
], AdamCollectorService);
//# sourceMappingURL=adam-collector.service.js.map