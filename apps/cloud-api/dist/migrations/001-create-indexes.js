"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
exports.runMigration = runMigration;
const mongodb_1 = require("mongodb");
async function up(db) {
    console.log('🔄 Running migration 001: Create indexes and TimeSeries collections...');
    try {
        console.log('📊 Setting up TimeSeries collection: machine_data');
        const machineDataExists = await db.listCollections({ name: 'machine_data' }).hasNext();
        if (!machineDataExists) {
            await db.createCollection('machine_data', {
                timeseries: {
                    timeField: 'timestamp',
                    metaField: 'metadata',
                    granularity: 'seconds',
                },
                expireAfterSeconds: 90 * 24 * 60 * 60,
            });
            console.log('✅ Created TimeSeries collection: machine_data');
        }
        console.log('📊 Setting up TimeSeries collection: aggregated_data');
        const aggregatedDataExists = await db.listCollections({ name: 'aggregated_data' }).hasNext();
        if (!aggregatedDataExists) {
            await db.createCollection('aggregated_data', {
                timeseries: {
                    timeField: 'timestamp',
                    metaField: 'metadata',
                    granularity: 'hours',
                },
                expireAfterSeconds: 365 * 24 * 60 * 60,
            });
            console.log('✅ Created TimeSeries collection: aggregated_data');
        }
        console.log('🔍 Creating indexes for machine_configurations...');
        await db.collection('machine_configurations').createIndexes([
            { key: { machineId: 1 }, unique: true, name: 'machineId_unique' },
            { key: { isActive: 1 }, name: 'isActive_index' },
            { key: { 'location.building': 1, 'location.line': 1 }, name: 'location_compound' },
            { key: { manufacturer: 1, model: 1 }, name: 'manufacturer_model' },
            { key: { createdAt: 1 }, name: 'createdAt_index' },
            { key: { updatedAt: 1 }, name: 'updatedAt_index' }
        ]);
        console.log('🔍 Creating indexes for machine_states...');
        await db.collection('machine_states').createIndexes([
            { key: { machineId: 1 }, unique: true, name: 'machineId_unique' },
            { key: { executionStatus: 1, availability: 1 }, name: 'status_compound' },
            { key: { isOnline: 1, lastDataUpdate: -1 }, name: 'online_lastupdate' },
            { key: { edgeGatewayId: 1, isOnline: 1 }, name: 'gateway_online' },
            {
                key: { 'activeAlarms.severity': 1 },
                name: 'active_alarms_severity',
                partialFilterExpression: { 'activeAlarms.0': { $exists: true } }
            },
            {
                key: { lastDataUpdate: 1 },
                expireAfterSeconds: 7 * 24 * 60 * 60,
                name: 'inactive_machines_ttl',
                partialFilterExpression: { isOnline: false }
            }
        ]);
        console.log('🔍 Creating indexes for machine_data TimeSeries...');
        await db.collection('machine_data').createIndexes([
            { key: { 'metadata.machineId': 1, timestamp: -1 }, name: 'machine_time' },
            { key: { 'metadata.edgeGatewayId': 1, timestamp: -1 }, name: 'gateway_time' },
            { key: { 'metadata.dataType': 1, timestamp: -1 }, name: 'datatype_time' },
            { key: { 'metadata.machineId': 1, 'metadata.dataType': 1, timestamp: -1 }, name: 'machine_datatype_time' },
            {
                key: { 'data.alarmSeverity': 1, timestamp: -1 },
                name: 'alarm_severity_time',
                partialFilterExpression: { 'metadata.dataType': 'alarm' }
            },
            {
                key: { 'data.executionStatus': 1, 'metadata.machineId': 1, timestamp: -1 },
                name: 'execution_machine_time',
                partialFilterExpression: { 'metadata.dataType': 'production' }
            },
            {
                key: { 'data.qualityGrade': 1, 'metadata.machineId': 1, timestamp: -1 },
                name: 'quality_machine_time',
                partialFilterExpression: { 'data.qualityGrade': { $exists: true } }
            }
        ]);
        console.log('🔍 Creating indexes for aggregated_data TimeSeries...');
        await db.collection('aggregated_data').createIndexes([
            {
                key: { 'metadata.machineId': 1, 'metadata.aggregationPeriod': 1, timestamp: -1 },
                name: 'machine_period_time'
            },
            {
                key: { 'metadata.edgeGatewayId': 1, 'metadata.aggregationPeriod': 1, timestamp: -1 },
                name: 'gateway_period_time'
            },
            {
                key: { 'metadata.aggregationPeriod': 1, 'metadata.periodStart': 1, 'metadata.periodEnd': 1 },
                name: 'period_range'
            },
            {
                key: { 'metadata.machineId': 1, 'metadata.aggregationPeriod': 1, 'metadata.periodStart': 1 },
                name: 'unique_aggregation'
            },
            {
                key: { 'aggregatedData.production.totalParts': -1, 'metadata.aggregationPeriod': 1 },
                name: 'production_parts'
            },
            {
                key: { 'aggregatedData.time.oeePercent': -1, 'metadata.aggregationPeriod': 1 },
                name: 'oee_percent'
            },
            {
                key: { 'aggregatedData.alarms.totalAlarms': -1, timestamp: -1 },
                name: 'total_alarms',
                partialFilterExpression: { 'aggregatedData.alarms.totalAlarms': { $gt: 0 } }
            }
        ]);
        console.log('✅ Migration 001 completed successfully!');
    }
    catch (error) {
        console.error('❌ Migration 001 failed:', error);
        throw error;
    }
}
async function down(db) {
    console.log('🔄 Rolling back migration 001...');
    try {
        await db.collection('machine_configurations').dropIndexes();
        await db.collection('machine_states').dropIndexes();
        await db.collection('machine_data').dropIndexes();
        await db.collection('aggregated_data').dropIndexes();
        console.log('✅ Migration 001 rollback completed!');
    }
    catch (error) {
        console.error('❌ Migration 001 rollback failed:', error);
        throw error;
    }
}
async function runMigration() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mtconnect';
    const client = new mongodb_1.MongoClient(mongoUri);
    try {
        await client.connect();
        const db = client.db();
        await up(db);
    }
    finally {
        await client.close();
    }
}
if (require.main === module) {
    runMigration()
        .then(() => {
        console.log('🎉 Migration completed successfully!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('💥 Migration failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=001-create-indexes.js.map