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
    .version('1.0.0')
    .argument('<folder>', 'Path to the folder containing DDL files')
    .option('--exists <tables...>', 'Check if one or more table DDL files exist')
    .option('--fields_info <table_and_fields>', 'Return field metadata (format: table:field1,field2)')
    .option('--keys_info <table>', 'Return primary keys, indexes, and foreign keys for a table')
    .option('--ast <table>', 'Return the node-sql-parser AST for a table DDL')
    .action((folder, options) => {
        const targetFolder = path.resolve(folder);

        if (!fs.existsSync(targetFolder)) {
            fail(`Directory not found: ${targetFolder}`);
        }

        if (options.exists?.length) {
            handleExists(targetFolder, options.exists);
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

        if (options.ast) {
            handleAst(targetFolder, options.ast);
            return;
        }

        fail('No command specified. Use --exists, --fields_info, --keys_info, or --ast.');
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

function loadAndParseDDL(folder, table) {
    const resolved = resolveTableFile(folder, table);
    if (!resolved.exists) {
        fail(`File for table '${table}' not found.`);
    }

    try {
        const ddlText = fs.readFileSync(resolved.filePath, 'utf-8').trim();
        if (!ddlText) {
            fail(`Failed to parse SQL syntax for '${table}': empty file.`);
        }

        const ast = parser.astify(ddlText, { database: 'MySQL' });
        const node = Array.isArray(ast) ? ast[0] : ast;
        if (!node?.create_definitions) {
            fail(`Failed to parse SQL syntax for '${table}': no CREATE TABLE statement found.`);
        }
        return node;
    } catch (error) {
        fail(`Failed to parse SQL syntax for '${table}': ${error.message}`);
    }
}

function stripBackticks(value) {
    return value.replace(/`/g, '');
}

function extractLength(definition) {
    const length = definition?.length;
    if (length == null) return null;
    if (Array.isArray(length)) {
        const first = length[0];
        if (first == null) return null;
        return typeof first === 'object' && first.value != null ? first.value : first;
    }
    return length;
}

function extractUnsigned(definition) {
    return definition?.suffix?.includes('UNSIGNED') ?? false;
}

function extractGenerated(def) {
    const storageType = def.generated?.storage_type;
    if (!storageType) return null;
    return storageType.toLowerCase();
}

function extractOnUpdate(def) {
    const over = def.default_val?.value?.over;
    if (over?.type !== 'on update') return null;
    return over.keyword ?? null;
}

function extractNullable(def) {
    if (!def.nullable) return true;
    if (def.nullable.value === 'not null') return false;
    return true;
}

function extractDefault(def) {
    if (!def.default_val) return null;
    const value = def.default_val.value;
    if (value == null) return null;
    if (typeof value === 'object') {
        if (value.type === 'null') return null;
        if (value.type === 'function') return value.name;
        if (value.value != null) return value.value;
    }
    return value;
}

function extractColumnNames(definition) {
    if (!Array.isArray(definition)) return [];
    return definition.map((column) => {
        const name = stripBackticks(column.column);
        return column.suffix ? `${name}${column.suffix}` : name;
    });
}

function extractTypeValues(definition) {
    const exprList = definition?.expr?.value;
    if (!Array.isArray(exprList)) return [];
    return exprList.map((item) => item.value ?? item);
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

    if (dataType === 'ENUM' || dataType === 'SET') {
        field.values = extractTypeValues(definition);
    } else if (dataType === 'DECIMAL') {
        if (definition?.length != null) {
            field.precision = definition.length;
            field.scale = definition.scale ?? null;
        }
    } else {
        const length = extractLength(definition);
        if (length != null) {
            field.length = length;
        }
    }

    return field;
}

function extractReferencedTable(referenceDefinition) {
    const tableRef = referenceDefinition?.table;
    if (Array.isArray(tableRef)) {
        return stripBackticks(tableRef[0]?.table ?? '');
    }
    return stripBackticks(tableRef?.table ?? '');
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

function handleFieldsInfo(folder, tableAndFields) {
    const colonIndex = tableAndFields.indexOf(':');
    if (colonIndex === -1) {
        fail('Invalid format. Use table:field1,field2');
    }

    const table = tableAndFields.slice(0, colonIndex);
    const fieldsRaw = tableAndFields.slice(colonIndex + 1);
    if (!table || !fieldsRaw) {
        fail('Invalid format. Use table:field1,field2');
    }

    const targetFields = fieldsRaw.split(',').map((field) => field.trim().toLowerCase());
    const ast = loadAndParseDDL(folder, table);
    const fields = [];
    const definitions = ast.create_definitions || [];

    for (const def of definitions) {
        if (!def.column?.column) continue;

        const fieldName = stripBackticks(def.column.column);
        if (!targetFields.includes(fieldName.toLowerCase())) continue;

        fields.push(buildFieldInfo(def));
    }

    console.log(JSON.stringify(fields));
    process.exit(0);
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

        if (def.constraint_type === 'FOREIGN KEY') {
            keys.foreign_keys.push({
                name: stripBackticks(def.constraint),
                local_columns: extractColumnNames(def.definition),
                referenced_table: extractReferencedTable(def.reference_definition),
                referenced_columns: extractColumnNames(def.reference_definition?.definition),
            });
        }
    }

    console.log(JSON.stringify(keys));
    process.exit(0);
}

function handleAst(folder, table) {
    const ast = loadAndParseDDL(folder, table);
    console.log(JSON.stringify(ast));
    process.exit(0);
}

program.parse();
