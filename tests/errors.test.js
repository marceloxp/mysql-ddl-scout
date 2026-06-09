import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { runCli, TABLES_DIR } from './helpers/run-cli.js';

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
    const { status, error } = runCli([TABLES_DIR]);

    expect(status).toBe(1);
    expect(error).toEqual({
      error:
        'No command specified. Use --list, --search, --exists, --fields, --fields_info, --keys_info, or --ast.',
    });
  });

  test('should fail when folder does not exist', () => {
    const { status, error } = runCli(['/non/existent/folder', '--exists', 'customers']);

    expect(status).toBe(1);
    expect(error.error).toMatch(/Directory not found/);
  });

  test('should fail when table file is missing for --keys_info', () => {
    const { status, error } = runCli([TABLES_DIR, '--keys_info', 'missing_table']);

    expect(status).toBe(1);
    expect(error).toEqual({ error: "File for table 'missing_table' not found." });
  });

  test('should fail when table file is missing for --fields_info', () => {
    const { status, error } = runCli([TABLES_DIR, '--fields_info', 'missing_table:id']);

    expect(status).toBe(1);
    expect(error).toEqual({ error: "File for table 'missing_table' not found." });
  });

  test('should fail when table file is missing for --ast', () => {
    const { status, error } = runCli([TABLES_DIR, '--ast', 'missing_table']);

    expect(status).toBe(1);
    expect(error).toEqual({ error: "File for table 'missing_table' not found." });
  });

  test('should fail when fields_info format is invalid', () => {
    const { status, error } = runCli([TABLES_DIR, '--fields_info', 'customers:']);

    expect(status).toBe(1);
    expect(error).toEqual({ error: 'Invalid format. Use table or table:field1,field2' });
  });

  test('should fail when DDL file is empty', () => {
    const dir = createTempTablesDir();
    fs.writeFileSync(path.join(dir, 'empty.sql'), '');

    const { status, error } = runCli([dir, '--keys_info', 'empty']);

    expect(status).toBe(1);
    expect(error).toEqual({ error: "Failed to parse SQL syntax for 'empty': empty file." });
  });
});
