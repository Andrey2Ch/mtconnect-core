"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataCollectionModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const data_collection_service_1 = require("./data-collection.service");
const mtconnect_collector_service_1 = require("./mtconnect-collector.service");
const adam_collector_service_1 = require("./adam-collector.service");
let DataCollectionModule = class DataCollectionModule {
};
exports.DataCollectionModule = DataCollectionModule;
exports.DataCollectionModule = DataCollectionModule = __decorate([
    (0, common_1.Module)({
        imports: [axios_1.HttpModule],
        providers: [
            data_collection_service_1.DataCollectionService,
            mtconnect_collector_service_1.MtconnectCollectorService,
            adam_collector_service_1.AdamCollectorService,
        ],
        exports: [data_collection_service_1.DataCollectionService],
    })
], DataCollectionModule);
//# sourceMappingURL=data-collection.module.js.map