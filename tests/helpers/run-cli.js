import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const TABLES_DIR = '.resources/tables';

export function runCli(args, options = {}) {
  const result = runCliRaw(args, options);

  return {
    ...result,
    json: result.stdout ? JSON.parse(result.stdout) : null,
    error: result.stderr ? JSON.parse(result.stderr) : null,
  };
}

export function runCliRaw(args, options = {}) {
  const result = spawnSync('node', ['index.js', ...args], {
    cwd: rootDir,
    encoding: 'utf8',
    ...options,
  });

  return {
    status: result.status,
    stdout: result.stdout?.trim() ?? '',
    stderr: result.stderr?.trim() ?? '',
  };
}

export function resolveTablePath(tableName) {
  return path.join(rootDir, TABLES_DIR, `${tableName}.sql`);
}
