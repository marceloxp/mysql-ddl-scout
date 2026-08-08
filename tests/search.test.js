import { describe, expect, test } from 'vitest';
import { runCli } from './helpers/run-cli.js';

describe('--search', () => {
  test('should return tables matching a substring (case-insensitive)', () => {
    const { status, json } = runCli(['--search', 'CUSTOMER']);

    expect(status).toBe(0);
    expect(json).toContain('customers');
    expect(json).toContain('customer_addresses');
    expect(json.every((name) => name.toLowerCase().includes('customer'))).toBe(true);
  });

  test('should match any of multiple patterns', () => {
    const { status, json } = runCli(['--search', 'addresses', 'customers']);

    expect(status).toBe(0);
    expect(json).toContain('customers');
    expect(json).toContain('customer_addresses');
  });

  test('should return an empty array when nothing matches', () => {
    const { status, json } = runCli(['--search', 'zzz_no_match']);

    expect(status).toBe(0);
    expect(json).toEqual([]);
  });
});
