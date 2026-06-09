#!/usr/bin/env node

import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import pkg from 'node-sql-parser';

const { Parser } = pkg;
const parser = new Parser();

const TABLE_FILE_EXTENSIONS = ['.sql', '.ddl', ''];

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
    const targetFolder = path.resolve(folder);

    if (!fs.existsSync(targetFolder)) {
      fail(`Directory not found: ${targetFolder}`);
    }

    if (options.list) {
      handleList(targetFolder);
      return;
    }

    if (options.search?.length) {
      handleSearch(targetFolder, options.search);
      return;
    }

    if (options.exists?.length) {
      handleExists(targetFolder, options.exists);
      return;
    }

    if (options.fields?.length) {
      handleFields(targetFolder, options.fields);
      return;
    }

    if (options.fields_info) {
      handleFieldsInfo(targetFolder, options.fields_info);
      return;
    }

    if (options.keys_info) {
      handleKeysInfo(targetFolder, options.keys_info);
      return;
    }

    if (options.relations) {
      handleRelations(targetFolder, options.relations);
      return;
    }

    if (options.ast) {
      handleAst(targetFolder, options.ast);
      return;
    }

    fail(
      'No command specified. Use --list, --search, --exists, --fields, --fields_info, --keys_info, --relations, or --ast.'
    );
  });

function fail(message) {
  console.error(JSON.stringify({ error: message }));
  process.exit(1);
}

function resolveTableFile(folder, table) {
  for (const extension of TABLE_FILE_EXTENSIONS) {
    const filename = `${table}${extension}`;
    const filePath = path.resolve(folder, filename);
    if (fs.existsSync(filePath)) {
      return { exists: true, filePath };
    }
  }
  return { exists: false, filePath: null };
}

function listTableFiles(folder) {
  const entries = fs.readdirSync(folder, { withFileTypes: true });
  const names = new Set();

  for (const entry of entries) {
    if (!entry.isFile() || entry.name.startsWith('.')) {
      continue;
    }

    const extension = path.extname(entry.name);
    if (extension === '.sql' || extension === '.ddl') {
      names.add(entry.name.slice(0, -extension.length));
    } else if (extension === '') {
      names.add(entry.name);
    }
  }

  return [...names].sort();
}

function tryLoadAndParseDDL(folder, table) {
  const resolved = resolveTableFile(folder, table);
  if (!resolved.exists) {
    return { error: `File for table '${table}' not found.` };
  }

  try {
    const ddlText = fs.readFileSync(resolved.filePath, 'utf-8').trim();
    if (!ddlText) {
      return { error: `Failed to parse SQL syntax for '${table}': empty file.` };
    }

    const ast = parser.astify(ddlText, { database: 'MySQL' });
    const node = Array.isArray(ast) ? ast[0] : ast;
    if (!node?.create_definitions) {
      return {
        error: `Failed to parse SQL syntax for '${table}': no CREATE TABLE statement found.`,
      };
    }
    return { node };
  } catch (error) {
    return { error: `Failed to parse SQL syntax for '${table}': ${error.message}` };
  }
}

function loadAndParseDDL(folder, table) {
  const { node, error } = tryLoadAndParseDDL(folder, table);
  if (error) {
    fail(error);
  }
  return node;
}

function stripBackticks(value) {
  return value.replace(/`/g, '');
}

function extractLength(definition) {
  const length = definition?.length;
  if (length === null || length === undefined) {
    return null;
  }
  if (Array.isArray(length)) {
    const first = length[0];
    if (first === null || first === undefined) {
      return null;
    }
    return typeof first === 'object' && first.value !== null && first.value !== undefined
      ? first.value
      : first;
  }
  return length;
}

function extractUnsigned(definition) {
  return definition?.suffix?.includes('UNSIGNED') ?? false;
}

function extractGenerated(def) {
  const storageType = def.generated?.storage_type;
  if (!storageType) {
    return null;
  }
  return storageType.toLowerCase();
}

function extractOnUpdate(def) {
  const over = def.default_val?.value?.over;
  if (over?.type !== 'on update') {
    return null;
  }
  return over.keyword ?? null;
}

function extractNullable(def) {
  if (!def.nullable) {
    return true;
  }
  if (def.nullable.value === 'not null') {
    return false;
  }
  return true;
}

function extractDefault(def) {
  if (!def.default_val) {
    return null;
  }
  const value = def.default_val.value;
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'object') {
    if (value.type === 'null') {
      return null;
    }
    if (value.type === 'function') {
      return value.name;
    }
    if (value.value !== null && value.value !== undefined) {
      return value.value;
    }
  }
  return value;
}

function extractColumnNames(definition) {
  if (!Array.isArray(definition)) {
    return [];
  }
  return definition.map((column) => {
    const name = stripBackticks(column.column);
    return column.suffix ? `${name}${column.suffix}` : name;
  });
}

function extractTypeValues(definition) {
  const exprList = definition?.expr?.value;
  if (!Array.isArray(exprList)) {
    return [];
  }
  return exprList.map((item) => item.value ?? item);
}

function applyDecimalProps(field, definition) {
  const decimalLength = definition?.length;
  if (decimalLength === null || decimalLength === undefined) {
    return;
  }
  field.precision = definition.length;
  field.scale = definition.scale ?? null;
}

function applyLengthProps(field, definition) {
  const length = extractLength(definition);
  if (length !== null && length !== undefined) {
    field.length = length;
  }
}

function applyDataTypeProps(field, dataType, definition) {
  if (dataType === 'ENUM' || dataType === 'SET') {
    field.values = extractTypeValues(definition);
    return;
  }
  if (dataType === 'DECIMAL') {
    applyDecimalProps(field, definition);
    return;
  }
  applyLengthProps(field, definition);
}

function buildFieldInfo(def) {
  const fieldName = stripBackticks(def.column.column);
  const definition = def.definition;
  const dataType = definition?.dataType?.toUpperCase?.() ?? definition?.dataType ?? null;

  const field = {
    field: fieldName,
    type: dataType,
    nullable: extractNullable(def),
    default: extractDefault(def),
  };

  if (extractUnsigned(definition)) {
    field.unsigned = true;
  }

  const generated = extractGenerated(def);
  if (generated) {
    field.generated = generated;
  }

  const onUpdate = extractOnUpdate(def);
  if (onUpdate) {
    field.on_update = onUpdate;
  }

  applyDataTypeProps(field, dataType, definition);

  return field;
}

function extractReferencedTable(referenceDefinition) {
  const tableRef = referenceDefinition?.table;
  if (Array.isArray(tableRef)) {
    return stripBackticks(tableRef[0]?.table ?? '');
  }
  return stripBackticks(tableRef?.table ?? '');
}

function extractForeignKeyActions(referenceDefinition) {
  const onAction = referenceDefinition?.on_action;
  if (!Array.isArray(onAction)) {
    return {};
  }

  const actions = {};
  for (const item of onAction) {
    const actionValue = item.value?.value?.toUpperCase?.() ?? item.value?.value;
    if (!actionValue) {
      continue;
    }
    if (item.type === 'on delete') {
      actions.on_delete = actionValue;
    }
    if (item.type === 'on update') {
      actions.on_update = actionValue;
    }
  }
  return actions;
}

function handleList(folder) {
  console.log(JSON.stringify(listTableFiles(folder)));
  process.exit(0);
}

function handleSearch(folder, patterns) {
  const needles = patterns.map((pattern) => pattern.toLowerCase());
  const matches = listTableFiles(folder).filter((name) => {
    const lowered = name.toLowerCase();
    return needles.some((needle) => lowered.includes(needle));
  });

  console.log(JSON.stringify(matches));
  process.exit(0);
}

function handleExists(folder, tables) {
  const results = tables.map((table) => {
    const resolved = resolveTableFile(folder, table);
    return {
      table,
      exists: resolved.exists,
      path: resolved.filePath,
    };
  });

  console.log(JSON.stringify(results));
  process.exit(0);
}

function handleFields(folder, tables) {
  let hasError = false;

  const results = tables.map((table) => {
    const { node, error } = tryLoadAndParseDDL(folder, table);
    if (error) {
      hasError = true;
      return { name: table, error };
    }

    const fields = (node.create_definitions || [])
      .filter((def) => def.column?.column)
      .map((def) => stripBackticks(def.column.column));

    return { name: table, fields };
  });

  console.log(JSON.stringify(results));
  process.exit(hasError ? 1 : 0);
}

function handleFieldsInfo(folder, tableAndFields) {
  const colonIndex = tableAndFields.indexOf(':');
  let table;
  let targetFieldNames = null;

  if (colonIndex === -1) {
    table = tableAndFields.trim();
    if (!table) {
      fail('Invalid format. Use table or table:field1,field2');
    }
  } else {
    table = tableAndFields.slice(0, colonIndex);
    const fieldsRaw = tableAndFields.slice(colonIndex + 1);
    if (!table || !fieldsRaw) {
      fail('Invalid format. Use table or table:field1,field2');
    }

    targetFieldNames = fieldsRaw
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean);
    if (targetFieldNames.length === 0) {
      fail('Invalid format. Use table or table:field1,field2');
    }
  }

  const ast = loadAndParseDDL(folder, table);
  const columnDefinitions = (ast.create_definitions || []).filter((def) => def.column?.column);

  if (targetFieldNames === null) {
    const fields = columnDefinitions.map((def) => buildFieldInfo(def));
    console.log(JSON.stringify(fields));
    process.exit(0);
  }

  const foundByName = new Map();
  for (const def of columnDefinitions) {
    const fieldName = stripBackticks(def.column.column);
    foundByName.set(fieldName.toLowerCase(), buildFieldInfo(def));
  }

  const fields = [];
  let hasMissing = false;

  for (const requestedField of targetFieldNames) {
    const found = foundByName.get(requestedField.toLowerCase());
    if (found) {
      fields.push(found);
    } else {
      hasMissing = true;
      fields.push({ field: requestedField, exists: false });
    }
  }

  console.log(JSON.stringify(fields));
  process.exit(hasMissing ? 1 : 0);
}

function extractForeignKeys(definitions) {
  const foreignKeys = [];
  for (const def of definitions) {
    if (def.constraint_type === 'FOREIGN KEY') {
      foreignKeys.push({
        name: stripBackticks(def.constraint),
        local_columns: extractColumnNames(def.definition),
        referenced_table: extractReferencedTable(def.reference_definition),
        referenced_columns: extractColumnNames(def.reference_definition?.definition),
        ...extractForeignKeyActions(def.reference_definition),
      });
    }
  }
  return foreignKeys;
}

function handleKeysInfo(folder, table) {
  const ast = loadAndParseDDL(folder, table);
  const keys = { primary_keys: [], indexes: [], foreign_keys: [] };
  const definitions = ast.create_definitions || [];

  for (const def of definitions) {
    if (def.constraint_type === 'primary key') {
      keys.primary_keys.push(...extractColumnNames(def.definition));
    }

    if (def.index && def.resource === 'index') {
      keys.indexes.push({
        name: stripBackticks(def.index),
        columns: extractColumnNames(def.definition),
      });
    }

    if (def.constraint_type === 'unique key' && def.index) {
      keys.indexes.push({
        name: stripBackticks(def.index),
        columns: extractColumnNames(def.definition),
        unique: true,
      });
    }
  }

  keys.foreign_keys = extractForeignKeys(definitions);

  console.log(JSON.stringify(keys));
  process.exit(0);
}

function handleRelations(folder, table) {
  const ast = loadAndParseDDL(folder, table);
  const references = extractForeignKeys(ast.create_definitions || []);

  const target = table.toLowerCase();
  const referencedBy = [];

  for (const other of listTableFiles(folder)) {
    const { node, error } = tryLoadAndParseDDL(folder, other);
    if (error) {
      continue;
    }

    for (const fk of extractForeignKeys(node.create_definitions || [])) {
      if (fk.referenced_table.toLowerCase() !== target) {
        continue;
      }

      // re-label from the dependent's perspective; omit referenced_table (it is the target itself)
      const entry = {
        table: other,
        name: fk.name,
        columns: fk.local_columns,
        referenced_columns: fk.referenced_columns,
      };
      if (fk.on_delete) {
        entry.on_delete = fk.on_delete;
      }
      if (fk.on_update) {
        entry.on_update = fk.on_update;
      }
      referencedBy.push(entry);
    }
  }

  console.log(JSON.stringify({ name: table, references, referenced_by: referencedBy }));
  process.exit(0);
}

function handleAst(folder, table) {
  const ast = loadAndParseDDL(folder, table);
  console.log(JSON.stringify(ast));
  process.exit(0);
}

program.parse();
