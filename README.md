# mysql-ddl-scout

A blazing fast, lightweight Node.js CLI tool designed to parse MySQL DDL scripts and instantly extract structured metadata as clean JSON.

Built specifically for developers, automation scripts, and LLM Agents (such as **Claude Code** and **Cursor IDE**) to inspect, validate, and understand complex database schemas entirely offline, without requiring a running MySQL instance.

## Features

- **100% Pure JSON Output**: No text clutter, banners, or emojis in `stdout`. Perfectly parseable for backend scripts and AI agents.
- **Table Existence Checking**: Scan one or more tables and get absolute file paths when found.
- **Granular Field Inspection**: Extract column data types, lengths, ENUM/SET values, nullability, and defaults.
- **Relational Map Engine**: Primary keys, indexes (including UNIQUE), prefix indexes, and foreign keys with composite column mapping.
- **Agnostic File Matching**: Resolves filenames natively whether they are stored as `table.sql`, `table.ddl`, or extensionless files.

## Installation

To install `mysql-ddl-scout` locally and expose it globally in your terminal environment:

```bash
# Clone the repository
git clone git@github.com:marceloxp/mysql-ddl-scout.git
cd mysql-ddl-scout

# Install dependencies and link the binary globally
npm install
npm link
```

## Usage Syntax

The CLI exposes three specialized analytical flags:

```bash
mysql-ddl-scout <folder_path> [options]
```

### 1. Locate Table Schema Files (`--exists`)

Verifies whether one or more table DDL files exist in the target folder. Accepts multiple table names separated by spaces. Always exits with code `0`; each result includes `exists` and `path` (`null` when not found).

```bash
mysql-ddl-scout .resources/tables --exists customers customer_addresses missing_table
```

**Stdout Response (JSON):**

```json
[
  {"table":"customers","exists":true,"path":"/path/to/project/.resources/tables/customers.sql"},
  {"table":"customer_addresses","exists":true,"path":"/path/to/project/.resources/tables/customer_addresses.sql"},
  {"table":"missing_table","exists":false,"path":null}
]
```

### 2. Inspect Column Metadata (`--fields_info`)

Extracts attributes for specified columns of a single table. Format: `table_name:column1,column2,column3`.

ENUM and SET columns include a `values` array. DECIMAL columns use `[precision, scale]` for `length`. Function defaults (e.g. `CURRENT_TIMESTAMP`) are returned as strings.

```bash
mysql-ddl-scout .resources/tables --fields_info customers:balance,status,permissions,created_at
```

**Stdout Response (JSON):**

```json
[
  {"field":"balance","type":"DECIMAL","nullable":false,"default":0,"length":[15,2]},
  {"field":"status","type":"ENUM","nullable":false,"default":"pending","values":["pending","active","blocked","deleted"]},
  {"field":"permissions","type":"SET","nullable":true,"default":null,"values":["read","write","delete","admin"]},
  {"field":"created_at","type":"TIMESTAMP","nullable":true,"default":"CURRENT_TIMESTAMP","length":null}
]
```

### 3. Extract Relational Key Footprints (`--keys_info`)

Maps primary keys, indexes, unique constraints, and foreign keys for a single table. Unique indexes include `"unique": true`. Prefix indexes preserve the length suffix (e.g. `"name(20)"`).

```bash
mysql-ddl-scout .resources/tables --keys_info customers
```

**Stdout Response (JSON):**

```json
{
  "primary_keys":["id"],
  "indexes":[
    {"name":"customers_external_unique","columns":["company_id","external_id"],"unique":true},
    {"name":"customers_name_unique","columns":["company_id","name"],"unique":true},
    {"name":"idx_customers_status","columns":["status"]},
    {"name":"idx_customers_created_status","columns":["created_at","status"]},
    {"name":"idx_customers_name_prefix","columns":["name(20)"]}
  ],
  "foreign_keys":[
    {
      "name":"customers_company_id_foreign",
      "local_columns":["company_id"],
      "referenced_table":"companies",
      "referenced_columns":["id"]
    }
  ]
}
```

Composite keys example:

```bash
mysql-ddl-scout .resources/tables --keys_info customer_addresses
```

```json
{
  "primary_keys":["customer_id","company_id","address_type"],
  "indexes":[],
  "foreign_keys":[
    {
      "name":"fk_customer_addresses_customer",
      "local_columns":["customer_id","company_id"],
      "referenced_table":"customers",
      "referenced_columns":["id","company_id"]
    }
  ]
}
```

## Error Pipeline

If an operational error occurs (e.g., folder not found, empty DDL file, table file missing for `--fields_info`/`--keys_info`, or invalid MySQL syntax), `mysql-ddl-scout` writes a structured JSON diagnostic to `stderr` and exits with code `1`.

```bash
mysql-ddl-scout .resources/tables --keys_info missing_table
```

**Stderr Response (JSON) [Exit Code: 1]:**

```json
{"error":"File for table 'missing_table' not found."}
```

## Contributing

Contributions, bug tracking, and architectural enhancements are welcome! Feel free to open an Issue or submit a Pull Request to help improve the tool's parser compliance.

## License

Distributed under the MIT License. See `LICENSE` for more information.
