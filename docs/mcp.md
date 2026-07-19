# MCP Server

`mysql-ddl-scout-mcp` exposes MySQL DDL inspection as MCP tools. It shares parsing logic with the CLI (`lib/core.js`).

Every tool requires `ddl_folder`: path to the directory containing DDL files (one table per file, resolved as `tableName.sql`, `tableName.ddl`, or `tableName`).

## Install

```bash
npm install -g mysql-ddl-scout
```

This installs `mysql-ddl-scout-mcp` on your `PATH`.

## Client configuration

Use `mysql-ddl-scout-mcp` as the server command in all clients below.

### Claude Code

**Project scope** — `.mcp.json` in the project root (shareable via version control):

```json
{
  "mcpServers": {
    "mysql-ddl-scout": {
      "type": "stdio",
      "command": "mysql-ddl-scout-mcp",
      "args": []
    }
  }
}
```

**User scope** — `~/.claude.json`, top-level `mcpServers` key (all projects):

```json
{
  "mcpServers": {
    "mysql-ddl-scout": {
      "type": "stdio",
      "command": "mysql-ddl-scout-mcp",
      "args": []
    }
  }
}
```

Or via CLI (outside a `claude` session):

```bash
claude mcp add --scope user mysql-ddl-scout -- mysql-ddl-scout-mcp
```

Restart the session after editing config files.

### Cursor

`.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global):

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

### Claude Desktop

`claude_desktop_config.json`:

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

### VS Code

`.vscode/mcp.json` or user MCP settings:

```json
{
  "servers": {
    "mysql-ddl-scout": {
      "command": "mysql-ddl-scout-mcp",
      "args": []
    }
  }
}
```

### Local development

When working from a clone of this repository:

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

## Tools

| Tool | CLI equivalent | Parameters |
|------|----------------|------------|
| `ddl_list_tables` | `--list` | `ddl_folder` |
| `ddl_search_tables` | `--search` | `ddl_folder`, `patterns` (string array) |
| `ddl_table_exists` | `--exists` | `ddl_folder`, `tables` (string array) |
| `ddl_get_fields` | `--fields` | `ddl_folder`, `tables` (string array) |
| `ddl_get_fields_info` | `--fields_info` | `ddl_folder`, `table`, `fields` (optional string array) |
| `ddl_get_keys_info` | `--keys_info` | `ddl_folder`, `table` |
| `ddl_get_relations` | `--relations` | `ddl_folder`, `table` |
| `ddl_get_references` | `--references` | `ddl_folder`, `table` |
| `ddl_get_referenced_by` | `--referenced_by` | `ddl_folder`, `table` |
| `ddl_get_ast` | `--ast` | `ddl_folder`, `table` |

### Response semantics

- **Success:** minified JSON in tool text content.
- **Operational error:** `{"error":"message"}` with `isError: true`.
- **Partial failure** (`ddl_get_fields`, `ddl_get_fields_info`): returns available data with `isError: true` when some tables or columns are missing (same semantics as CLI exit code `1`).
