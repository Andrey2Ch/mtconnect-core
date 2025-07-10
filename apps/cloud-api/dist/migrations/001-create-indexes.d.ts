import { Db } from 'mongodb';
export declare function up(db: Db): Promise<void>;
export declare function down(db: Db): Promise<void>;
export declare function runMigration(): Promise<void>;
