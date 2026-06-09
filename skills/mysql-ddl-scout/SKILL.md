---
name: mysql-ddl-scout
description: Inspects MySQL DDL files offline and returns strict JSON for table existence, columns, keys, and parser AST. Use when exploring database schemas from .sql/.ddl files, validating columns or foreign keys, or when the user mentions MySQL DDL, schema inspection, or table metadata without a live database.
---

# mysql-ddl-scout

Inspect MySQL DDL files (one table per file) offline and get structured JSON via the `mysql-ddl-scout` CLI.

## Prerequisites

The CLI must be available on the machine:

- Global: `mysql-ddl-scout` (after `npm install -g mysql-ddl-scout`)
- Ephemeral: `npx mysql-ddl-scout` (no install)

This skill tells the agent **when and how** to call the CLI. It does not replace the CLI.

## Resolve the DDL folder

Identify `<ddl_folder>` from the project context — common locations include `db/`, `schema/`, `migrations/`, `sql/`, or `database/`. Prefer an absolute path. Each table is stored as `tableName.sql`, `tableName.ddl`, or `tableName` (no extension).

## Recommended workflow

1. **`--list`** — list every table in the folder before doing anything else. Do NOT guess table names and probe them with `--exists`.
2. **`--search`** — when you already know part of a name, filter the table list by substring instead of listing everything.
3. **`--exists`** — confirm specific table files exist before deeper inspection
4. **`--fields`** — when you only need the column names of one or more tables, use this. Do NOT call `--fields_info` and post-process it with `grep`/`tr`/`jq` just to extract names.
5. **`--fields_info`** — column types, nullability, defaults, ENUM/SET values
6. **`--keys_info`** — primary keys, indexes, unique constraints, foreign keys of one table
7. **`--relations`** — declared foreign keys of one table in both directions; use to find what depends on a table (`referenced_by`) without reading every file yourself
8. **`--ast`** — parser AST only when debugging parser output or building custom tooling

## Commands

Replace `<ddl_folder>` and `<table>` with actual values. Prefix with `npx` when the CLI is not installed globally.

```bash
mysql-ddl-scout <ddl_folder> --list
mysql-ddl-scout <ddl_folder> --search <pattern> [pattern...]
mysql-ddl-scout <ddl_folder> --exists <table> [table...]
mysql-ddl-scout <ddl_folder> --fields <table> [table...]
mysql-ddl-scout <ddl_folder> --fields_info <table>
mysql-ddl-scout <ddl_folder> --fields_info <table>:<col1>,<col2>
mysql-ddl-scout <ddl_folder> --keys_info <table>
mysql-ddl-scout <ddl_folder> --relations <table>
mysql-ddl-scout <ddl_folder> --ast <table>
```

### `--list`

- Takes no arguments
- Returns a sorted JSON array of all table names in the folder (extensions stripped); non-DDL files and dotfiles are ignored
- Always exits `0`
- Use this to discover real table names instead of guessing and probing with `--exists`

### `--search`

- Takes one or more case-insensitive substrings; a table matches if its name contains any of them
- Returns a sorted JSON array of matching table names (extensions stripped); non-DDL files and dotfiles are ignored
- Always exits `0`; returns `[]` when nothing matches
- Use this to narrow a large schema when you already know part of a table name

### `--exists`

- Accepts one or more table names (space-separated)
- Always exits `0` on success
- Returns JSON array: `{ "table", "exists", "path" }` (`path` is absolute when found, `null` otherwise)

### `--fields`

- Accepts one or more table names (space-separated)
- Returns column names only — JSON array of `{ "name", "fields": [...] }`, names in DDL order
- A missing or unparseable table becomes `{ "name", "error" }` instead of aborting; exit code `1` if any table failed, `0` otherwise
- Use this instead of `--fields_info` whenever you just need the list of column names

### `--fields_info`

- Single table only
- Format: `table` (all columns, DDL order) or `table:col1,col2` (requested order)
- Unknown columns appear as `{ "field": "...", "exists": false }` with exit code `1`
- ENUM/SET include `values`; DECIMAL uses `precision` and `scale`; numeric types may include `unsigned: true`; generated columns include `generated` (`stored`|`virtual`); timestamps may include `on_update`

### `--keys_info`

- Single table only
- Returns `{ "primary_keys", "indexes", "foreign_keys" }`
- Unique indexes include `"unique": true`
- Foreign keys include `on_delete` and `on_update` when defined
- Prefix indexes preserve length suffix (e.g. `"name(20)"`)

### `--relations`

- Single table only
- Returns `{ "name", "references", "referenced_by" }` using only foreign keys declared in the DDL — no inference
- `references` are the table's own foreign keys (outgoing), same shape as `--keys_info`
- `referenced_by` are foreign keys other tables declare pointing to this table (incoming), found by scanning every DDL in the folder; each entry has `{ "table", "name", "columns", "referenced_columns" }` plus `on_delete`/`on_update` when defined
- Prefer this over reading every file to answer "what depends on this table?"; `referenced_by` is `[]` when nothing points to it. Exits `1` if the table file is not found

### `--ast`

- Single table only
- Returns the `node-sql-parser` CREATE TABLE AST node as JSON

## Output contract

- **Success**: minified JSON on `stdout` only — no banners, markdown, or extra text
- **Operational error**: `{"error":"message"}` on `stderr`, exit code `1`
- Parse `stdout` as JSON; on non-zero exit, read and parse `stderr` as JSON when present

## Examples

For concrete command/output samples, see [examples.md](examples.md).
