import { readFileSync } from 'node:fs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, test } from 'vitest';
import { runCli, runCliRaw, runCliWithFolder } from './helpers/run-cli.js';

const packageVersion = JSON.parse(
  readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json'),
    'utf8'
  )
).version;

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

describe('errors', () => {
  test('should fail when no command is specified', () => {
    const { status, error } = runCli([]);

    expect(status).toBe(1);
    expect(error).toEqual({
      error:
        'No command specified. Use --list, --search, --search-regex, --exists, --fields, --fields_info, --keys_info, --relations, --references, --referenced_by, or --ast.',
    });
  });

  test('should fail when --folder is missing', () => {
    const { status, stderr } = runCliRaw(['--list']);

    expect(status).toBe(1);
    expect(JSON.parse(stderr).error).toMatch(/required option '-f, --folder <path>' not specified/);
  });

  test('should fail when folder is passed as a positional argument', () => {
    const { status, stderr } = runCliRaw(['.resources/tables', '--list']);

    expect(status).toBe(1);
    expect(JSON.parse(stderr).error).toBe(
      'Positional folder arguments are no longer supported. Use --folder <path> instead.'
    );
  });

  test('should fail when folder does not exist', () => {
    const { status, error } = runCliWithFolder('/non/existent/folder', ['--exists', 'customers']);

    expect(status).toBe(1);
    expect(error.error).toMatch(/Directory not found/);
  });

  test('should fail when table file is missing for --keys_info', () => {
    const { status, error } = runCli(['--keys_info', 'missing_table']);

    expect(status).toBe(1);
    expect(error).toEqual({ error: "File for table 'missing_table' not found." });
  });

  test('should fail when table file is missing for --fields_info', () => {
    const { status, error } = runCli(['--fields_info', 'missing_table:id']);

    expect(status).toBe(1);
    expect(error).toEqual({ error: "File for table 'missing_table' not found." });
  });

  test('should fail when table file is missing for --ast', () => {
    const { status, error } = runCli(['--ast', 'missing_table']);

    expect(status).toBe(1);
    expect(error).toEqual({ error: "File for table 'missing_table' not found." });
  });

  test('should fail when fields_info format is invalid', () => {
    const { status, error } = runCli(['--fields_info', 'customers:']);

    expect(status).toBe(1);
    expect(error).toEqual({ error: 'Invalid format. Use table or table:field1,field2' });
  });

  test('should fail when DDL file is empty', () => {
    const dir = createTempTablesDir();
    fs.writeFileSync(path.join(dir, 'empty.sql'), '');

    const { status, error } = runCliWithFolder(dir, ['--keys_info', 'empty']);

    expect(status).toBe(1);
    expect(error).toEqual({ error: "Failed to parse SQL syntax for 'empty': empty file." });
  });
});

describe('excess CLI arguments', () => {
  test('should fail when --relations receives extra table arguments', () => {
    const { status, error, stdout } = runCli(['--relations', 'customers', 'customer_addresses']);

    expect(status).toBe(1);
    expect(stdout).toBe('');
    expect(error).toEqual({
      error: '--relations accepts a single table name; remove extra arguments.',
    });
  });

  test('should still accept multiple tables for --fields', () => {
    const { status, json } = runCli(['--fields', 'customers', 'customer_addresses']);

    expect(status).toBe(0);
    expect(json).toHaveLength(2);
    expect(json.map((entry) => entry.name)).toEqual(['customers', 'customer_addresses']);
  });

  test('should accept options in any order when --folder is named', () => {
    const { status, stdout } = runCliRaw([
      '--fields',
      'customers',
      '--folder',
      '.resources/tables',
    ]);

    expect(status).toBe(0);
    expect(JSON.parse(stdout)).toEqual([{ name: 'customers', fields: expect.any(Array) }]);
  });
});

describe('cli metadata', () => {
  test('should print version and exit 0', () => {
    const { status, stdout, stderr } = runCliRaw(['--version']);

    expect(status).toBe(0);
    expect(stdout).toBe(packageVersion);
    expect(stderr).toBe('');
  });

  test('should print help and exit 0', () => {
    const { status, stdout, stderr } = runCliRaw(['--help']);

    expect(status).toBe(0);
    expect(stdout).toContain('Usage: mysql-ddl-scout');
    expect(stdout).toContain('--folder');
    expect(stderr).toBe('');
  });
});
