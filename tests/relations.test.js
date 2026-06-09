import { describe, expect, test } from 'vitest';
import { runCli, TABLES_DIR } from './helpers/run-cli.js';

describe('--relations', () => {
  test('should return declared outgoing foreign keys under references', () => {
    const { status, json } = runCli([TABLES_DIR, '--relations', 'customers']);

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
    const { status, json } = runCli([TABLES_DIR, '--relations', 'customers']);

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
    const { status, json } = runCli([TABLES_DIR, '--relations', 'customer_addresses']);

    expect(status).toBe(0);
    expect(json.name).toBe('customer_addresses');
    expect(json.references).toHaveLength(1);
    expect(json.referenced_by).toEqual([]);
  });

  test('should fail with exit code 1 when the table does not exist', () => {
    const { status, error } = runCli([TABLES_DIR, '--relations', 'missing_table']);

    expect(status).toBe(1);
    expect(error.error).toMatch(/not found/);
  });
});
