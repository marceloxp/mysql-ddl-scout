import { describe, expect, test } from 'vitest';
import { runCli, TABLES_DIR } from './helpers/run-cli.js';

describe('--fields', () => {
  test('should return only column names for a single table', () => {
    const { status, json } = runCli([TABLES_DIR, '--fields', 'customers']);

    expect(status).toBe(0);
    expect(json).toHaveLength(1);
    expect(json[0].name).toBe('customers');
    expect(Array.isArray(json[0].fields)).toBe(true);
    expect(json[0].fields).toContain('id');
    // names only: each entry is a plain string, not a metadata object
    expect(json[0].fields.every((field) => typeof field === 'string')).toBe(true);
  });

  test('should handle multiple tables in one call', () => {
    const { status, json } = runCli([TABLES_DIR, '--fields', 'customers', 'customer_addresses']);

    expect(status).toBe(0);
    expect(json).toHaveLength(2);
    expect(json[0].name).toBe('customers');
    expect(json[1].name).toBe('customer_addresses');
    expect(json[1].fields.length).toBeGreaterThan(0);
  });

  test('should report a per-table error and exit 1 when a table is missing', () => {
    const { status, json } = runCli([TABLES_DIR, '--fields', 'customers', 'missing_table']);

    expect(status).toBe(1);
    expect(json).toHaveLength(2);
    expect(json[0]).toHaveProperty('fields');
    expect(json[1]).toMatchObject({ name: 'missing_table' });
    expect(json[1].error).toMatch(/not found/);
    expect(json[1]).not.toHaveProperty('fields');
  });
});
