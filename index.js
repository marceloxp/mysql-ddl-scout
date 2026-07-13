#!/usr/bin/env node

import { program } from 'commander';
import path from 'path';
import * as core from './lib/core.js';

program
  .name('mysql-ddl-scout')
  .description('Parse MySQL DDL files and output strict JSON to stdout')
  .version('1.1.0')
  .argument('<folder>', 'Path to the folder containing DDL files')
  .option('--list', 'List all table names found in the folder')
  .option('--search <patterns...>', 'List table names matching one or more substrings')
  .option('--exists <tables...>', 'Check if one or more table DDL files exist')
  .option('--fields <tables...>', 'Return only the column names for one or more tables')
  .option(
    '--fields_info <table_and_fields>',
    'Return field metadata (format: table or table:field1,field2)'
  )
  .option('--keys_info <table>', 'Return primary keys, indexes, and foreign keys for a table')
  .option(
    '--relations <table>',
    'Return declared foreign keys of a table in both directions (references and referenced_by)'
  )
  .option('--ast <table>', 'Return the node-sql-parser AST for a table DDL')
  .action((folder, options) => {
    try {
      const targetFolder = path.resolve(folder);

      if (options.list) {
        succeed(core.listTables(targetFolder));
        return;
      }

      if (options.search?.length) {
        succeed(core.searchTables(targetFolder, options.search));
        return;
      }

      if (options.exists?.length) {
        succeed(core.checkExists(targetFolder, options.exists));
        return;
      }

      if (options.fields?.length) {
        const { data, exitCode } = core.getFields(targetFolder, options.fields);
        succeed(data, exitCode);
        return;
      }

      if (options.fields_info) {
        const { table, targetFieldNames } = core.parseFieldsInfoSpec(options.fields_info);
        const { data, exitCode } = core.getFieldsInfo(targetFolder, table, targetFieldNames);
        succeed(data, exitCode);
        return;
      }

      if (options.keys_info) {
        succeed(core.getKeysInfo(targetFolder, options.keys_info));
        return;
      }

      if (options.relations) {
        succeed(core.getRelations(targetFolder, options.relations));
        return;
      }

      if (options.ast) {
        succeed(core.getAst(targetFolder, options.ast));
        return;
      }

      fail(
        'No command specified. Use --list, --search, --exists, --fields, --fields_info, --keys_info, --relations, or --ast.'
      );
    } catch (error) {
      if (error instanceof core.ScoutError) {
        fail(error.message);
      }
      throw error;
    }
  });

function fail(message) {
  console.error(JSON.stringify({ error: message }));
  process.exit(1);
}

function succeed(data, exitCode = 0) {
  console.log(JSON.stringify(data));
  process.exit(exitCode);
}

program.parse();
