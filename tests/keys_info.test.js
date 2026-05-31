import { describe, expect, test } from 'vitest';
import { runCli, TABLES_DIR } from './helpers/run-cli.js';

describe('--keys_info', () => {
  test('should return primary keys, indexes, and foreign keys for customers', () => {
    const { status, json } = runCli([TABLES_DIR, '--keys_info', 'customers']);

    expect(status).toBe(0);
    expect(json.primary_keys).toEqual(['id']);

    const uniqueIndexes = json.indexes.filter((index) => index.unique);
    expect(uniqueIndexes).toEqual(
      expect.arrayContaining([
        {
          name: 'customers_external_unique',
          columns: ['company_id', 'external_id'],
          unique: true,
        },
        {
          name: 'customers_name_unique',
          columns: ['company_id', 'name'],
          unique: true,
        },
      ])
    );

    expect(json.indexes).toEqual(
      expect.arrayContaining([
        { name: 'idx_customers_status', columns: ['status'] },
        { name: 'idx_customers_created_status', columns: ['created_at', 'status'] },
        { name: 'idx_customers_name_prefix', columns: ['name(20)'] },
      ])
    );

    expect(json.foreign_keys).toEqual([
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

  test('should return composite keys for customer_addresses', () => {
    const { status, json } = runCli([TABLES_DIR, '--keys_info', 'customer_addresses']);

    expect(status).toBe(0);
    expect(json.primary_keys).toEqual(['customer_id', 'company_id', 'address_type']);
    expect(json.indexes).toEqual([]);
    expect(json.foreign_keys).toEqual([
      {
        name: 'fk_customer_addresses_customer',
        local_columns: ['customer_id', 'company_id'],
        referenced_table: 'customers',
        referenced_columns: ['id', 'company_id'],
        on_delete: 'CASCADE',
        on_update: 'CASCADE',
      },
    ]);
  });
});
