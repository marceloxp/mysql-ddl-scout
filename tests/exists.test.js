import { describe, expect, test } from 'vitest';
import { spawnSync } from 'node:child_process';

describe('--exists', () => {
    test('should find customers table', () => {
        const result = spawnSync(
            'node',
            [
                'index.js',
                '.resources/tables',
                '--exists',
                'customers'
            ],
            {
                encoding: 'utf8'
            }
        );

        expect(result.status).toBe(0);

        const json = JSON.parse(result.stdout);

        expect(json).toHaveLength(1);

        expect(json[0]).toMatchObject({
            table: 'customers',
            exists: true
        });
    });

    test('should return false for missing table', () => {
        const result = spawnSync(
            'node',
            [
                'index.js',
                '.resources/tables',
                '--exists',
                'non_existent_table'
            ],
            {
                encoding: 'utf8'
            }
        );

        expect(result.status).toBe(0);

        const json = JSON.parse(result.stdout);

        expect(json[0]).toMatchObject({
            table: 'non_existent_table',
            exists: false,
            path: null
        });
    });
});

describe('--fields_info', () => {
    test('should return metadata for a specific field', () => {
        const result = spawnSync(
            'node',
            [
                'index.js',
                '.resources/tables',
                '--fields_info',
                'customers:name'
            ],
            {
                encoding: 'utf8'
            }
        );

        expect(result.status).toBe(0);

        const json = JSON.parse(result.stdout);

        expect(json).toHaveLength(1);

        expect(json[0]).toMatchObject({
            field: 'name',
            type: 'VARCHAR',
            nullable: false,
            length: 255
        });
    });

    test('should return metadata for all fields', () => {
        const result = spawnSync(
            'node',
            [
                'index.js',
                '.resources/tables',
                '--fields_info',
                'customers'
            ],
            {
                encoding: 'utf8'
            }
        );

        expect(result.status).toBe(0);

        const json = JSON.parse(result.stdout);

        expect(json).toHaveLength(23);

        expect(json[0]).toMatchObject({
            field: 'id',
            type: 'CHAR',
            nullable: false,
            length: 36
        });
    });

    test('should preserve requested field order', () => {
        const result = spawnSync(
            'node',
            [
                'index.js',
                '.resources/tables',
                '--fields_info',
                'customers:name,id'
            ],
            {
                encoding: 'utf8'
            }
        );

        expect(result.status).toBe(0);

        const json = JSON.parse(result.stdout);

        expect(json[0].field).toBe('name');
        expect(json[1].field).toBe('id');
    });

    test('should report missing fields', () => {
        const result = spawnSync(
            'node',
            [
                'index.js',
                '.resources/tables',
                '--fields_info',
                'customers:id,ops'
            ],
            {
                encoding: 'utf8'
            }
        );

        expect(result.status).toBe(1);

        const json = JSON.parse(result.stdout);

        expect(json[0].field).toBe('id');

        expect(json[1]).toEqual({
            field: 'ops',
            exists: false
        });
    });
});