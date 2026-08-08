import { describe, expect, test } from 'vitest';
import { resolveTablePath, runCli } from './helpers/run-cli.js';

describe('--exists', () => {
  test('should find a single table with absolute path', () => {
    const { status, json } = runCli(['--exists', 'customers']);

    expect(status).toBe(0);
    expect(json).toHaveLength(1);
    expect(json[0]).toMatchObject({
      table: 'customers',
      exists: true,
      path: resolveTablePath('customers'),
    });
  });

  test('should return false for missing table', () => {
    const { status, json } = runCli(['--exists', 'non_existent_table']);

    expect(status).toBe(0);
    expect(json[0]).toMatchObject({
      table: 'non_existent_table',
      exists: false,
      path: null,
    });
  });

  test('should handle multiple tables in one call', () => {
    const { status, json } = runCli([
      '--exists',
      'customers',
      'customer_addresses',
      'missing_table',
    ]);

    expect(status).toBe(0);
    expect(json).toHaveLength(3);
    expect(json[0]).toMatchObject({
      table: 'customers',
      exists: true,
      path: resolveTablePath('customers'),
    });
    expect(json[1]).toMatchObject({
      table: 'customer_addresses',
      exists: true,
      path: resolveTablePath('customer_addresses'),
    });
    expect(json[2]).toMatchObject({
      table: 'missing_table',
      exists: false,
      path: null,
    });
  });
});
