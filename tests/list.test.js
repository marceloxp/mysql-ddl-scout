import { describe, expect, test } from 'vitest';
import { runCli } from './helpers/run-cli.js';

describe('--list', () => {
  test('should return a sorted array of all table names in the folder', () => {
    const { status, json } = runCli(['--list']);

    expect(status).toBe(0);
    expect(Array.isArray(json)).toBe(true);
    expect(json).toContain('customers');
    expect(json).toContain('customer_addresses');
    // extensions are stripped — names only
    expect(json.every((name) => !name.endsWith('.sql'))).toBe(true);
    // output is sorted
    expect(json).toEqual([...json].sort());
  });

  test('should not include non-DDL files', () => {
    const { json } = runCli(['--list']);

    expect(json.some((name) => name.includes('.'))).toBe(false);
  });
});
