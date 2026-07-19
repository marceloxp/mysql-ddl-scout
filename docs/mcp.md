# MCP Server

The `mysql-ddl-scout-mcp` binary exposes MySQL DDL inspection as [Model Context Protocol](https://modelcontextprotocol.io/) tools for AI agents in **Cursor**, **Claude Desktop**, **VS Code**, and other MCP clients.

It shares the same parsing logic as the CLI (`lib/core.js`). Every tool requires a `ddl_folder` parameter pointing to the directory that contains your DDL files (one table per file).

## Important: stdio servers are silent in the terminal

The MCP server uses **stdio transport**: it communicates over stdin/stdout via JSON-RPC. It does **not** print banners, prompts, or status messages.

When you run:

```bash
mysql-ddl-scout-mcp
```

the terminal appears **frozen** with no output. That is **expected**. The process is waiting for an MCP client to connect. Use `Ctrl+C` to stop it.

**Do not use the bare terminal command to test the server.** Use the [MCP Inspector](#testing-with-mcp-inspector) or configure a client (Cursor, Claude Desktop).

stdout is reserved for the MCP protocol. Never pipe debug output to stdout in production.

## Installation

`mysql-ddl-scout-mcp` is a **binary inside** the `mysql-ddl-scout` npm package — not a separate package.

### Global install

```bash
npm install -g mysql-ddl-scout
mysql-ddl-scout-mcp   # starts stdio server (silent until a client connects)
```

### Without install (npx)

```bash
npx -y -p mysql-ddl-scout mysql-ddl-scout-mcp
```

The `-p mysql-ddl-scout` flag installs the package; `mysql-ddl-scout-mcp` is the binary name to run.

**Common mistake:** `npx -y mysql-ddl-scout-mcp` fails with 404 because npm looks for a package with that name.

## Client configuration

### Cursor

Add to `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global):

**Published package (npx):**

```json
{
  "mcpServers": {
    "mysql-ddl-scout": {
      "command": "npx",
      "args": ["-y", "-p", "mysql-ddl-scout", "mysql-ddl-scout-mcp"]
    }
  }
}
```

**Global install:**

```json
{
  "mcpServers": {
    "mysql-ddl-scout": {
      "command": "mysql-ddl-scout-mcp",
      "args": []
    }
  }
}
```

**Local development (this repo):**

```json
{
  "mcpServers": {
    "mysql-ddl-scout": {
      "command": "node",
      "args": ["/absolute/path/to/mysql-ddl-scout/mcp-server.js"]
    }
  }
}
```

After saving, reload Cursor. Confirm the server is enabled under **Settings → Tools & MCP**. Debug connection issues in **Output → MCP Logs**.

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mysql-ddl-scout": {
      "command": "npx",
      "args": ["-y", "-p", "mysql-ddl-scout", "mysql-ddl-scout-mcp"]
    }
  }
}
```

Restart Claude Desktop after editing the config.

### VS Code

Add to `.vscode/mcp.json` or user MCP settings:

```json
{
  "servers": {
    "mysql-ddl-scout": {
      "command": "npx",
      "args": ["-y", "-p", "mysql-ddl-scout", "mysql-ddl-scout-mcp"]
    }
  }
}
```

## Available tools

Every tool takes `ddl_folder` (absolute or relative path to the DDL directory). Table files are resolved as `tableName.sql`, `tableName.ddl`, or `tableName` (no extension).

| Tool | CLI equivalent | Description |
|------|----------------|-------------|
| `ddl_list_tables` | `--list` | List all table names. Use first instead of guessing names. |
| `ddl_search_tables` | `--search` | Filter table names by case-insensitive substring(s). |
| `ddl_table_exists` | `--exists` | Check if table files exist; returns absolute paths. |
| `ddl_get_fields` | `--fields` | Column names only. Prefer over `ddl_get_fields_info` when types are not needed. |
| `ddl_get_fields_info` | `--fields_info` | Column types, nullability, defaults, ENUM/SET values, generated columns. |
| `ddl_get_keys_info` | `--keys_info` | Primary keys, indexes, unique constraints, foreign keys. |
| `ddl_get_relations` | `--relations` | Foreign keys in both directions (`references` + `referenced_by`). |
| `ddl_get_references` | `--references` | Outgoing foreign keys only (reads one table file). |
| `ddl_get_referenced_by` | `--referenced_by` | Incoming foreign keys only (scans the folder). |
| `ddl_get_ast` | `--ast` | Parser AST. For debugging or custom tooling only. |

### Parameters

| Tool | Parameters |
|------|------------|
| `ddl_list_tables` | `ddl_folder` |
| `ddl_search_tables` | `ddl_folder`, `patterns` (string array) |
| `ddl_table_exists` | `ddl_folder`, `tables` (string array) |
| `ddl_get_fields` | `ddl_folder`, `tables` (string array) |
| `ddl_get_fields_info` | `ddl_folder`, `table`, `fields` (optional string array) |
| `ddl_get_keys_info` | `ddl_folder`, `table` |
| `ddl_get_relations` | `ddl_folder`, `table` |
| `ddl_get_references` | `ddl_folder`, `table` |
| `ddl_get_referenced_by` | `ddl_folder`, `table` |
| `ddl_get_ast` | `ddl_folder`, `table` |

### Output contract

- **Success:** minified JSON in the tool text content
- **Operational error:** `{"error":"message"}` with `isError: true`
- **Partial failure** (`ddl_get_fields`, `ddl_get_fields_info`): returns data plus `isError: true` when some tables/columns are missing (same semantics as the CLI exit code `1`)

## Recommended workflow for agents

1. `ddl_list_tables` — discover table names before guessing
2. `ddl_search_tables` — filter when the schema is large
3. `ddl_table_exists` — confirm specific tables
4. `ddl_get_fields` — column names only
5. `ddl_get_fields_info` — types and metadata
6. `ddl_get_keys_info` — indexes and foreign keys
7. `ddl_get_references` or `ddl_get_referenced_by` — one FK direction at a time (prefer over `ddl_get_relations` for hub tables)
8. `ddl_get_relations` — bidirectional FK map when both directions are needed
9. `ddl_get_ast` — parser debugging only

## Testing with MCP Inspector

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) is the recommended way to test tools interactively:

```bash
npx @modelcontextprotocol/inspector mysql-ddl-scout-mcp
```

With npx (no global install):

```bash
npx @modelcontextprotocol/inspector npx -y -p mysql-ddl-scout mysql-ddl-scout-mcp
```

Local development:

```bash
npx @modelcontextprotocol/inspector node /absolute/path/to/mysql-ddl-scout/mcp-server.js
```

The Inspector opens a browser UI where you can list tools and call `ddl_list_tables` with your `ddl_folder`.

### Example call

Tool: `ddl_list_tables`

```json
{
  "ddl_folder": "/path/to/project/.resources/tables"
}
```

Expected response text:

```json
["customer_addresses","customers"]
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Terminal hangs with no output | Normal stdio behavior | Use Inspector or a client; do not expect terminal UI |
| `404` on `npx mysql-ddl-scout-mcp` | Wrong package name | Use `npx -y -p mysql-ddl-scout mysql-ddl-scout-mcp` |
| Tools not visible in Cursor | Server not configured or disabled | Check `.cursor/mcp.json`, reload, enable in Tools & MCP |
| `Directory not found` | Wrong `ddl_folder` | Use an absolute path or verify the folder exists |
| Old version without MCP bin | npm cache / old publish | Ensure `mysql-ddl-scout@1.3.0` or later: `npm view mysql-ddl-scout bin` |

## Architecture

```
MCP client (Cursor, Claude, Inspector)
        │  JSON-RPC over stdio
        ▼
  mcp-server.js  ──►  lib/core.js  ◄──  index.js (CLI)
```

Both the MCP server and the CLI call the same core functions. Prefer MCP for agents; use the CLI for scripts, CI, and human terminal use.
