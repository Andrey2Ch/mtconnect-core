"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DataCollectionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataCollectionService = void 0;
const common_1 = require("@nestjs/common");
let DataCollectionService = DataCollectionService_1 = class DataCollectionService {
    logger = new common_1.Logger(DataCollectionService_1.name);
    async collectData() {
        this.logger.debug('Collecting data from machines...');
        return {
            timestamp: new Date().toISOString(),
            status: 'collected',
        };
    }
};
exports.DataCollectionService = DataCollectionService;
exports.DataCollectionService = DataCollectionService = DataCollectionService_1 = __decorate([
    (0, common_1.Injectable)()
], DataCollectionService);
//# sourceMappingURL=data-collection.service.js.map