# mysql-ddl-scout — Agent Guide

> Offline MySQL DDL inspector. Reads one-table-per-file DDL scripts, parses them with `node-sql-parser`, and returns **strict minified JSON**. No running MySQL instance required.

Primary consumers: LLM agents (via MCP), shell scripts, and humans (via CLI).

## Architecture (3 layers)

```
┌───────────────────┐     ┌─────────────────┐
│  index.js         │     │  mcp-server.js  │
│  CLI (Commander)  │     │  MCP (11 tools) │
└────────┬──────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
              ┌─────────────┐
              │ lib/core.js │  ← all business logic lives here
              └─────────────┘
                     │
                     ▼
           node-sql-parser (MySQL AST)
```

**Rule of thumb:** change behavior in `lib/core.js`; wire it in `index.js` (flags) and/or `mcp-server.js` (tools). Do not duplicate parsing logic in the entry points.

## File map

| Path                                | Role                                                                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| `README.md`                         | User-facing CLI docs and examples.                                                              |
| `lib/core.js`                       | Folder resolution, DDL loading, AST walking, JSON shaping. Exports one function per capability. |
| `index.js`                          | CLI: Commander flags → `core.*` → stdout/stderr JSON.                                           |
| `mcp-server.js`                     | MCP server: Zod-validated tools → `core.*` → tool text content.                                 |
| `tests/`                            | Vitest integration tests via `tests/helpers/run-cli.js`.                                        |
| `.resources/tables/`                | Sample DDL fixtures (`customers.sql`, `customer_addresses.sql`).                                |
| `docs/mcp.md`                       | MCP tool reference and CLI ↔ MCP mapping.                                                       |
| `.cursor/rules/mysql-ddl-scout.mdc` | Detailed behavioral constraints (exit codes, JSON shapes, flag semantics).                      |

## Input model

- **DDL folder** — directory of table files. CLI: `--folder` / `-f`. MCP: `ddl_folder`.
- **File naming** — `tableName.sql`, `tableName.ddl`, or extensionless `tableName`. Non-DDL files and dotfiles are ignored.
- **One table per file** — each file must contain a parseable `CREATE TABLE`.

## Capabilities (where to look in `core.js`)

| Concern            | `core` export                     | CLI flag          | MCP tool                  |
| ------------------ | --------------------------------- | ----------------- | ------------------------- |
| List tables        | `listTables`                      | `--list`          | `ddl_list_tables`         |
| Substring search   | `searchTables`                    | `--search`        | `ddl_search_tables`       |
| Regex search       | `searchTablesRegex`               | `--search-regex`  | `ddl_search_tables_regex` |
| Table exists       | `checkExists`                     | `--exists`        | `ddl_table_exists`        |
| Column names only  | `getFields`                       | `--fields`        | `ddl_get_fields`          |
| Column metadata    | `getFieldsInfo`                   | `--fields_info`   | `ddl_get_fields_info`     |
| Keys & indexes     | `getKeysInfo` / `resolveKeysInfo` | `--keys_info`     | `ddl_get_keys_info`       |
| Outgoing FKs       | `getReferences`                   | `--references`    | `ddl_get_references`      |
| Incoming FKs       | `getReferencedBy`                 | `--referenced_by` | `ddl_get_referenced_by`   |
| Both FK directions | `getRelations`                    | `--relations`     | `ddl_get_relations`       |
| Raw parser AST     | `getAst`                          | `--ast`           | `ddl_get_ast`             |

Low-level helpers inside `core.js`: `resolveTableFile`, `tryLoadAndParseDDL`, `assertFolder`. Errors throw `ScoutError`.

## Output contract (non-negotiable)

- **Success** → valid JSON string on stdout (CLI) or tool text content (MCP). No extra text, markdown, or emojis.
- **Failure** → `{"error":"..."}` on stderr (CLI) or tool content with `isError: true` (MCP). Exit code `1`.
- Some commands use exit `1` for partial success (e.g. unknown field in `--fields_info`, missing table in multi-table `--fields`). See `.cursor/rules/mysql-ddl-scout.mdc` for per-command rules.

## CLI specifics (v2.0.0+)

All arguments are named flags. Folder is **required**:

```bash
mysql-ddl-scout --folder .resources/tables --list
```

Positional folder paths are rejected. Flag order does not matter.

## When modifying the project

1. **New capability** → function in `core.js` → flag in `index.js` → tool in `mcp-server.js` → tests in `tests/`.
2. **Parser / AST edge cases** → `lib/core.js` (column/key extraction from `create_definitions`).
3. **CLI parsing quirks** → `index.js` only (Commander `exitOverride`, variadic flags).
4. **Run before finishing:**

```bash
npm test
npm run lint
npm run format:check
```

## Tests

- `tests/helpers/run-cli.js` — spawns `index.js`; `runCli(args)` auto-injects `--folder .resources/tables`.
- One test file per CLI feature (`list.test.js`, `fields_info.test.js`, etc.).
- `tests/errors.test.js` — error paths, CLI metadata, v2 positional rejection.

## What this project is *not*

- Not a live database connector.
- Not a migration runner or schema diff engine.
- Not an ORM or query builder.
- Relationship discovery uses **declared foreign keys in DDL only** — no inference beyond what is written in files.
