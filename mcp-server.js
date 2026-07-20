#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import path from 'path';
import { z } from 'zod';
import * as core from './lib/core.js';

const server = new McpServer({
  name: 'mysql-ddl-scout',
  version: '1.3.1',
});

function jsonResult(data, isError = false) {
  return {
    content: [{ type: 'text', text: JSON.stringify(data) }],
    isError,
  };
}

function handleError(error) {
  const message = error instanceof core.ScoutError ? error.message : 'Unexpected error';
  return jsonResult({ error: message }, true);
}

function resolveFolder(ddlFolder) {
  return path.resolve(ddlFolder);
}

server.tool(
  'ddl_list_tables',
  'List all table names in a DDL folder. Use this first to discover tables instead of guessing names.',
  {
    ddl_folder: z.string().describe('Path to the folder containing DDL files'),
  },
  async ({ ddl_folder }) => {
    try {
      return jsonResult(core.listTables(resolveFolder(ddl_folder)));
    } catch (error) {
      return handleError(error);
    }
  }
);

server.tool(
  'ddl_search_tables',
  'Search table names by one or more case-insensitive substrings. Use when the schema is large and you know part of a name.',
  {
    ddl_folder: z.string().describe('Path to the folder containing DDL files'),
    patterns: z.array(z.string()).describe('Case-insensitive substrings to match table names'),
  },
  async ({ ddl_folder, patterns }) => {
    try {
      return jsonResult(core.searchTables(resolveFolder(ddl_folder), patterns));
    } catch (error) {
      return handleError(error);
    }
  }
);

server.tool(
  'ddl_table_exists',
  'Check whether one or more table DDL files exist and return their absolute paths when found.',
  {
    ddl_folder: z.string().describe('Path to the folder containing DDL files'),
    tables: z.array(z.string()).describe('Table names to check'),
  },
  async ({ ddl_folder, tables }) => {
    try {
      return jsonResult(core.checkExists(resolveFolder(ddl_folder), tables));
    } catch (error) {
      return handleError(error);
    }
  }
);

server.tool(
  'ddl_get_fields',
  'Return column names only for one or more tables. Prefer this over ddl_get_fields_info when you do not need types or metadata.',
  {
    ddl_folder: z.string().describe('Path to the folder containing DDL files'),
    tables: z.array(z.string()).describe('Table names to list column names for'),
  },
  async ({ ddl_folder, tables }) => {
    try {
      const { data, exitCode } = core.getFields(resolveFolder(ddl_folder), tables);
      return jsonResult(data, exitCode === 1);
    } catch (error) {
      return handleError(error);
    }
  }
);

server.tool(
  'ddl_get_fields_info',
  'Return column metadata for a single table: types, nullability, defaults, ENUM/SET values, and generated columns.',
  {
    ddl_folder: z.string().describe('Path to the folder containing DDL files'),
    table: z.string().describe('Table name'),
    fields: z
      .array(z.string())
      .optional()
      .describe('Specific column names; omit to return all columns in DDL order'),
  },
  async ({ ddl_folder, table, fields }) => {
    try {
      const { data, exitCode } = core.getFieldsInfo(
        resolveFolder(ddl_folder),
        table,
        fields ?? null
      );
      return jsonResult(data, exitCode === 1);
    } catch (error) {
      return handleError(error);
    }
  }
);

server.tool(
  'ddl_get_keys_info',
  'Return primary keys, indexes, unique constraints, and foreign keys for a single table.',
  {
    ddl_folder: z.string().describe('Path to the folder containing DDL files'),
    table: z.string().describe('Table name'),
  },
  async ({ ddl_folder, table }) => {
    try {
      return jsonResult(core.getKeysInfo(resolveFolder(ddl_folder), table));
    } catch (error) {
      return handleError(error);
    }
  }
);

server.tool(
  'ddl_get_relations',
  'Return declared foreign keys for a table in both directions: outgoing references and incoming referenced_by.',
  {
    ddl_folder: z.string().describe('Path to the folder containing DDL files'),
    table: z.string().describe('Table name'),
  },
  async ({ ddl_folder, table }) => {
    try {
      return jsonResult(core.getRelations(resolveFolder(ddl_folder), table));
    } catch (error) {
      return handleError(error);
    }
  }
);

server.tool(
  'ddl_get_references',
  'Return outgoing foreign keys declared by a single table (same shape as references in ddl_get_relations).',
  {
    ddl_folder: z.string().describe('Path to the folder containing DDL files'),
    table: z.string().describe('Table name'),
  },
  async ({ ddl_folder, table }) => {
    try {
      return jsonResult(core.getReferences(resolveFolder(ddl_folder), table));
    } catch (error) {
      return handleError(error);
    }
  }
);

server.tool(
  'ddl_get_referenced_by',
  'Return incoming foreign keys from other tables that point to a single table (same shape as referenced_by in ddl_get_relations).',
  {
    ddl_folder: z.string().describe('Path to the folder containing DDL files'),
    table: z.string().describe('Table name'),
  },
  async ({ ddl_folder, table }) => {
    try {
      return jsonResult(core.getReferencedBy(resolveFolder(ddl_folder), table));
    } catch (error) {
      return handleError(error);
    }
  }
);

server.tool(
  'ddl_get_ast',
  'Return the node-sql-parser CREATE TABLE AST for a single table. Use only for parser debugging or custom tooling.',
  {
    ddl_folder: z.string().describe('Path to the folder containing DDL files'),
    table: z.string().describe('Table name'),
  },
  async ({ ddl_folder, table }) => {
    try {
      return jsonResult(core.getAst(resolveFolder(ddl_folder), table));
    } catch (error) {
      return handleError(error);
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
