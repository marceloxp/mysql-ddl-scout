import { describe, expect, test } from 'vitest';
import { runCli, TABLES_DIR } from './helpers/run-cli.js';

describe('--fields_info', () => {
    test('should return metadata for a specific field', () => {
        const { status, json } = runCli([TABLES_DIR, '--fields_info', 'customers:name']);

        expect(status).toBe(0);
        expect(json).toHaveLength(1);
        expect(json[0]).toMatchObject({
            field: 'name',
            type: 'VARCHAR',
            nullable: false,
            length: 255,
        });
    });

    test('should return metadata for all fields in DDL order', () => {
        const { status, json } = runCli([TABLES_DIR, '--fields_info', 'customers']);

        expect(status).toBe(0);
        expect(json).toHaveLength(23);
        expect(json[0]).toMatchObject({
            field: 'id',
            type: 'CHAR',
            nullable: false,
            length: 36,
        });
        expect(json.at(-1)).toMatchObject({ field: 'order', type: 'INT' });
    });

    test('should preserve requested field order', () => {
        const { status, json } = runCli([TABLES_DIR, '--fields_info', 'customers:name,id']);

        expect(status).toBe(0);
        expect(json[0].field).toBe('name');
        expect(json[1].field).toBe('id');
    });

    test('should report missing fields with exit code 1', () => {
        const { status, json } = runCli([TABLES_DIR, '--fields_info', 'customers:id,ops']);

        expect(status).toBe(1);
        expect(json[0].field).toBe('id');
        expect(json[1]).toEqual({ field: 'ops', exists: false });
    });

    test('should include ENUM values', () => {
        const { json } = runCli([TABLES_DIR, '--fields_info', 'customers:status']);

        expect(json[0]).toMatchObject({
            field: 'status',
            type: 'ENUM',
            nullable: false,
            default: 'pending',
            values: ['pending', 'active', 'blocked', 'deleted'],
        });
    });

    test('should include SET values', () => {
        const { json } = runCli([TABLES_DIR, '--fields_info', 'customers:permissions']);

        expect(json[0]).toMatchObject({
            field: 'permissions',
            type: 'SET',
            nullable: true,
            default: null,
            values: ['read', 'write', 'delete', 'admin'],
        });
    });

    test('should include DECIMAL precision and scale', () => {
        const { json } = runCli([TABLES_DIR, '--fields_info', 'customers:balance']);

        expect(json[0]).toMatchObject({
            field: 'balance',
            type: 'DECIMAL',
            nullable: false,
            default: 0,
            precision: 15,
            scale: 2,
        });
        expect(json[0]).not.toHaveProperty('length');
    });

    test('should include unsigned flag', () => {
        const { json } = runCli([TABLES_DIR, '--fields_info', 'customers:age']);

        expect(json[0]).toMatchObject({
            field: 'age',
            type: 'TINYINT',
            unsigned: true,
        });
    });

    test('should include generated column storage type', () => {
        const { json } = runCli([TABLES_DIR, '--fields_info', 'customers:full_name']);

        expect(json[0]).toMatchObject({
            field: 'full_name',
            type: 'VARCHAR',
            length: 400,
            generated: 'stored',
        });
        expect(json[0]).not.toHaveProperty('generated_expression');
    });

    test('should include on_update for timestamps', () => {
        const { json } = runCli([TABLES_DIR, '--fields_info', 'customers:updated_at,created_at']);

        expect(json[0]).toMatchObject({
            field: 'updated_at',
            type: 'TIMESTAMP',
            default: 'CURRENT_TIMESTAMP',
            on_update: 'CURRENT_TIMESTAMP',
        });
        expect(json[1]).toMatchObject({
            field: 'created_at',
            default: 'CURRENT_TIMESTAMP',
        });
        expect(json[1]).not.toHaveProperty('on_update');
    });
});
