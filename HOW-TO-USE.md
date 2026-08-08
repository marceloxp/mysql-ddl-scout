# How to use mysql-ddl-scout

> **Purpose of this file:** self-contained usage guide for humans and agents. Copy or adapt into another project and replace `<DDL_FOLDER>` with your schema path. MCP client setup: [docs/mcp.md](docs/mcp.md).

## What it does

Inspects **offline MySQL DDL files** (one table per file) and returns **strict minified JSON**. No database connection.

| Interface | Command               | Folder parameter             |
| --------- | --------------------- | ---------------------------- |
| CLI       | `mysql-ddl-scout`     | `--folder` / `-f` (required) |
| MCP       | `mysql-ddl-scout-mcp` | `ddl_folder` on every tool   |

Install: `npm install -g mysql-ddl-scout`

## DDL folder

| Context        | Path                                      |
| -------------- | ----------------------------------------- |
| This repo      | `.resources/tables`                       |
| Your project   | `<DDL_FOLDER>` — e.g. `database/schema`   |

Table files: `tableName.sql`, `tableName.ddl`, or extensionless `tableName`. Dotfiles and non-DDL files are ignored.

---

## CLI ↔ MCP mapping

| CLI flag          | MCP tool                  | Args                                       |
| ----------------- | ------------------------- | ------------------------------------------ |
| `--list`          | `ddl_list_tables`         | folder only                                |
| `--search`        | `ddl_search_tables`       | folder + patterns (one or more substrings) |
| `--search-regex`  | `ddl_search_tables_regex` | folder + patterns (one or more regexes)    |
| `--exists`        | `ddl_table_exists`        | folder + tables                            |
| `--fields`        | `ddl_get_fields`          | folder + tables                            |
| `--fields_info`   | `ddl_get_fields_info`     | folder + table + optional fields array     |
| `--keys_info`     | `ddl_get_keys_info`       | folder + tables                            |
| `--references`    | `ddl_get_references`      | folder + table                             |
| `--referenced_by` | `ddl_get_referenced_by`   | folder + table                             |
| `--relations`     | `ddl_get_relations`       | folder + table                             |
| `--ast`           | `ddl_get_ast`             | folder + table                             |

CLI: every call requires `--folder <DDL_FOLDER>`. Flag order does not matter. Positional folder paths are rejected (v2+).

---

## Commands

### Discover tables

```bash
mysql-ddl-scout --folder <DDL_FOLDER> --list
mysql-ddl-scout --folder <DDL_FOLDER> --search customer address
mysql-ddl-scout --folder <DDL_FOLDER> --search-regex "customer_.*"
```

- `--search`: case-insensitive substring; any pattern match counts.
- `--search-regex`: case-insensitive regex; any pattern match counts.
- Mutually exclusive. Invalid regex → `{"error":"..."}`, exit `1`.
- Returns sorted JSON array of table names. Exit `0`.

### Check existence (`--exists`)

```bash
mysql-ddl-scout --folder <DDL_FOLDER> --exists customers missing_table
```

Returns JSON array: `{ "table", "exists", "path" }` (`path` is absolute or `null`). Exit `0` always on success.

### Column names (`--fields`)

```bash
mysql-ddl-scout --folder <DDL_FOLDER> --fields customers customer_addresses
```

Returns `[{ "name", "fields": [...] }, ...]` in DDL order. Missing table → `{ "name", "error" }` in array; exit `1`.

### Column metadata (`--fields_info`)

```bash
mysql-ddl-scout --folder <DDL_FOLDER> --fields_info customers
mysql-ddl-scout --folder <DDL_FOLDER> --fields_info customers:id,name
```

Single table only. CLI format: `table` or `table:field1,field2`. MCP: `table` + optional `fields` array.

- All columns → DDL order, exit `0`.
- Specific fields → request order. Unknown → `{ "field", "exists": false }`, exit `1`.
- ENUM/SET include `values`. DECIMAL: `precision`, `scale`. Numeric may include `unsigned`. Generated columns: `generated` (`stored`|`virtual`). Timestamps may include `on_update`.

### Keys (`--keys_info`)

```bash
mysql-ddl-scout --folder <DDL_FOLDER> --keys_info customers
mysql-ddl-scout --folder <DDL_FOLDER> --keys_info customers customer_addresses
```

One table → `{ "primary_keys", "indexes", "foreign_keys" }`. Two or more → array with `name` on each item. UNIQUE indexes have `"unique": true`. FKs include `on_delete` / `on_update` when defined. Missing table in multi mode → `{ "name", "error" }`, exit `1`.

### Relationships (single table each)

```bash
mysql-ddl-scout --folder <DDL_FOLDER> --references customers
mysql-ddl-scout --folder <DDL_FOLDER> --referenced_by customers
mysql-ddl-scout --folder <DDL_FOLDER> --relations customers
```

- `--references`: outgoing FKs (same shape as `foreign_keys` in keys_info).
- `--referenced_by`: incoming FKs from other tables (folder scan). Each entry: `table`, `columns`, `referenced_columns`, etc.
- `--relations`: both directions. Prefer split commands on large hub tables.
- Declared FKs in DDL only — no inference. Missing table → exit `1`.

### AST (`--ast`)

```bash
mysql-ddl-scout --folder <DDL_FOLDER> --ast customer_addresses
```

Returns `node-sql-parser` CREATE TABLE AST node. Single table only.

---

## Output contract

- **Success:** valid JSON on stdout (CLI) or tool text content (MCP). No markdown, banners, or emojis.
- **Failure:** `{"error":"message"}` on stderr (CLI) or tool content with `isError: true` (MCP). Exit `1`.
- **Partial failure:** some multi-table / multi-field calls return data plus exit `1` or `isError: true` (see commands above).

---

## Suggested workflow (agents)

1. **Discover** — `--list` or `--search` / `--search-regex`
2. **Confirm** — `--exists` before assuming a table exists
3. **Columns** — `--fields` for names; `--fields_info` for types and constraints
4. **Structure** — `--keys_info` for PKs, indexes, FKs
5. **Relationships** — `--references` + `--referenced_by` (or `--relations` when payload is small)
6. **Debug** — `--ast` only when raw parser output is needed

Never guess table names. Never read raw DDL files when this tool can answer the question.

---

## MCP setup

Register `mysql-ddl-scout-mcp` in your client and pass `ddl_folder` on every tool call. Configuration for Claude Code, Cursor, Claude Desktop, VS Code, and local development: **[docs/mcp.md](docs/mcp.md)**.

---

## Adapting to your project

1. Copy this file into your repo.
2. Replace `<DDL_FOLDER>` with your schema directory.
3. Add MCP config per [docs/mcp.md](docs/mcp.md).
4. Optionally reference this file from a Cursor rule so agents load it automatically.

**Hacking on mysql-ddl-scout itself** (codebase layout, where to change logic): [AGENT.md](AGENT.md).
