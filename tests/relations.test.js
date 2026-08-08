import { afterEach, describe, expect, test } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCli, runCliWithFolder } from './helpers/run-cli.js';

const tempDirs = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function createTempTablesDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mysql-ddl-scout-'));
  tempDirs.push(dir);
  return dir;
}

describe('--relations', () => {
  test('should return declared outgoing foreign keys under references', () => {
    const { status, json } = runCli(['--relations', 'customers']);

    expect(status).toBe(0);
    expect(json.name).toBe('customers');
    expect(json.references).toEqual([
      {
        name: 'customers_company_id_foreign',
        local_columns: ['company_id'],
        referenced_table: 'companies',
        referenced_columns: ['id'],
        on_delete: 'CASCADE',
        on_update: 'CASCADE',
      },
    ]);
  });

  test('should find incoming foreign keys by scanning the folder', () => {
    const { status, json } = runCli(['--relations', 'customers']);

    expect(status).toBe(0);
    expect(json.referenced_by).toEqual([
      {
        table: 'customer_addresses',
        name: 'fk_customer_addresses_customer',
        columns: ['customer_id', 'company_id'],
        referenced_columns: ['id', 'company_id'],
        on_delete: 'CASCADE',
        on_update: 'CASCADE',
      },
    ]);
  });

  test('should return an empty referenced_by when no table points to it', () => {
    const { status, json } = runCli(['--relations', 'customer_addresses']);

    expect(status).toBe(0);
    expect(json.name).toBe('customer_addresses');
    expect(json.references).toHaveLength(1);
    expect(json.referenced_by).toEqual([]);
  });

  test('should fail with exit code 1 when the table does not exist', () => {
    const { status, error } = runCli(['--relations', 'missing_table']);

    expect(status).toBe(1);
    expect(error.error).toMatch(/not found/);
  });
});

describe('--references', () => {
  test('should return only outgoing foreign keys', () => {
    const { status, json } = runCli(['--references', 'customers']);

    expect(status).toBe(0);
    expect(json).toEqual({
      name: 'customers',
      references: [
        {
          name: 'customers_company_id_foreign',
          local_columns: ['company_id'],
          referenced_table: 'companies',
          referenced_columns: ['id'],
          on_delete: 'CASCADE',
          on_update: 'CASCADE',
        },
      ],
    });
  });

  test('should return an empty references array when the table has no foreign keys', () => {
    const dir = createTempTablesDir();
    fs.writeFileSync(
      path.join(dir, 'standalone.sql'),
      'CREATE TABLE standalone (id INT PRIMARY KEY);'
    );

    const { status, json } = runCliWithFolder(dir, ['--references', 'standalone']);

    expect(status).toBe(0);
    expect(json).toEqual({ name: 'standalone', references: [] });
  });

  test('should fail with exit code 1 when the table does not exist', () => {
    const { status, error } = runCli(['--references', 'missing_table']);

    expect(status).toBe(1);
    expect(error.error).toMatch(/not found/);
  });
});

describe('--referenced_by', () => {
  test('should return only incoming foreign keys', () => {
    const { status, json } = runCli(['--referenced_by', 'customers']);

    expect(status).toBe(0);
    expect(json).toEqual({
      name: 'customers',
      referenced_by: [
        {
          table: 'customer_addresses',
          name: 'fk_customer_addresses_customer',
          columns: ['customer_id', 'company_id'],
          referenced_columns: ['id', 'company_id'],
          on_delete: 'CASCADE',
          on_update: 'CASCADE',
        },
      ],
    });
  });

  test('should return an empty referenced_by when no table points to it', () => {
    const { status, json } = runCli(['--referenced_by', 'customer_addresses']);

    expect(status).toBe(0);
    expect(json).toEqual({ name: 'customer_addresses', referenced_by: [] });
  });

  test('should fail with exit code 1 when the table does not exist', () => {
    const { status, error } = runCli(['--referenced_by', 'missing_table']);

    expect(status).toBe(1);
    expect(error.error).toMatch(/not found/);
  });
});
