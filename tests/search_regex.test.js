import { describe, expect, test } from 'vitest';
import { runCli } from './helpers/run-cli.js';

describe('--search-regex', () => {
  test('should return tables matching a regular expression', () => {
    const { status, json } = runCli(['--search-regex', 'customer_.*address']);

    expect(status).toBe(0);
    expect(json).toEqual(['customer_addresses']);
  });

  test('should match any of multiple regex patterns', () => {
    const { status, json } = runCli(['--search-regex', '^customers$', 'address']);

    expect(status).toBe(0);
    expect(json).toEqual(['customer_addresses', 'customers']);
  });

  test('should support alternation inside a single pattern', () => {
    const { status, json } = runCli(['--search-regex', 'customers|address']);

    expect(status).toBe(0);
    expect(json).toEqual(['customer_addresses', 'customers']);
  });

  test('should return an empty array when nothing matches', () => {
    const { status, json } = runCli(['--search-regex', '^zzz_no_match$']);

    expect(status).toBe(0);
    expect(json).toEqual([]);
  });

  test('should fail when a regex pattern is invalid', () => {
    const { status, error } = runCli(['--search-regex', '[invalid']);

    expect(status).toBe(1);
    expect(error.error).toMatch(/Invalid search regex pattern '\[invalid'/);
  });

  test('should fail when used together with --search', () => {
    const { status, error } = runCli(['--search', 'customer', '--search-regex', '.*']);

    expect(status).toBe(1);
    expect(error).toEqual({ error: 'Use either --search or --search-regex, not both.' });
  });
});
