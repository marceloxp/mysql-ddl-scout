import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const TABLES_DIR = '.resources/tables';

export function runCli(args, options = {}) {
  const result = spawnSync('node', ['index.js', ...args], {
    cwd: rootDir,
    encoding: 'utf8',
    ...options,
  });

  const stdout = result.stdout?.trim() ?? '';
  const stderr = result.stderr?.trim() ?? '';

  return {
    status: result.status,
    stdout,
    stderr,
    json: stdout ? JSON.parse(stdout) : null,
    error: stderr ? JSON.parse(stderr) : null,
  };
}

export function resolveTablePath(tableName) {
  return path.join(rootDir, TABLES_DIR, `${tableName}.sql`);
}
