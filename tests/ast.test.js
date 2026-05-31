import { describe, expect, test } from 'vitest';
import { runCli, TABLES_DIR } from './helpers/run-cli.js';

describe('--ast', () => {
  test('should return the CREATE TABLE AST node', () => {
    const { status, json } = runCli([TABLES_DIR, '--ast', 'customer_addresses']);

    expect(status).toBe(0);
    expect(json.type).toBe('create');
    expect(json.table[0].table).toBe('customer_addresses');
    expect(Array.isArray(json.create_definitions)).toBe(true);
    expect(json.create_definitions.length).toBeGreaterThan(0);
  });
});
