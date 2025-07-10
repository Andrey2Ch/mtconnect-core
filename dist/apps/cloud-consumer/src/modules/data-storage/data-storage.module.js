"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStorageModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const data_storage_service_1 = require("./data-storage.service");
const machine_data_schema_1 = require("./schemas/machine-data.schema");
const adam_data_schema_1 = require("./schemas/adam-data.schema");
let DataStorageModule = class DataStorageModule {
};
exports.DataStorageModule = DataStorageModule;
exports.DataStorageModule = DataStorageModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: machine_data_schema_1.MachineData.name, schema: machine_data_schema_1.MachineDataSchema },
                { name: adam_data_schema_1.AdamData.name, schema: adam_data_schema_1.AdamDataSchema },
            ]),
        ],
        providers: [data_storage_service_1.DataStorageService],
        exports: [data_storage_service_1.DataStorageService],
    })
], DataStorageModule);
//# sourceMappingURL=data-storage.module.js.map