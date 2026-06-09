# mysql-ddl-scout Examples

Illustrative commands using the sample DDL in this repository (`.resources/tables`). In other projects, replace the folder path with the project's `<ddl_folder>`.

## Discover tables (list / search)

```bash
mysql-ddl-scout .resources/tables --list
```

```json
["customer_addresses","customers"]
```

```bash
mysql-ddl-scout .resources/tables --search customer
```

```json
["customer_addresses","customers"]
```

## Check table existence

```bash
mysql-ddl-scout .resources/tables --exists customers customer_addresses missing_table
```

```json
[
  {"table":"customers","exists":true,"path":"/path/to/.resources/tables/customers.sql"},
  {"table":"customer_addresses","exists":true,"path":"/path/to/.resources/tables/customer_addresses.sql"},
  {"table":"missing_table","exists":false,"path":null}
]
```

## Column names only, one or more tables (use this when you just need field names)

```bash
mysql-ddl-scout .resources/tables --fields customers customer_addresses
```

```json
[
  {"name":"customers","fields":["id","company_id","external_id","name","status","created_at"]},
  {"name":"customer_addresses","fields":["customer_id","company_id","address_type","zipcode"]}
]
```

A missing/unparseable table reports a per-table `error` and the command exits `1`:

```bash
mysql-ddl-scout .resources/tables --fields customers missing_table
```

```json
[
  {"name":"customers","fields":["id","company_id","external_id","name","status","created_at"]},
  {"name":"missing_table","error":"File for table 'missing_table' not found."}
]
```

## All columns (DDL order)

```bash
mysql-ddl-scout .resources/tables --fields_info customers
```

```json
[
  {"field":"id","type":"CHAR","nullable":false,"default":null,"length":36},
  {"field":"company_id","type":"CHAR","nullable":false,"default":null,"length":36},
  {"field":"status","type":"ENUM","nullable":false,"default":"pending","values":["pending","active","blocked","deleted"]}
]
```

## Specific columns with a missing field (exit code 1)

```bash
mysql-ddl-scout .resources/tables --fields_info customers:id,name,opa
```

```json
[
  {"field":"id","type":"CHAR","nullable":false,"default":null,"length":36},
  {"field":"name","type":"VARCHAR","nullable":false,"default":null,"length":255},
  {"field":"opa","exists":false}
]
```

## Keys and foreign keys

```bash
mysql-ddl-scout .resources/tables --keys_info customers
```

```json
{
  "primary_keys":["id"],
  "indexes":[
    {"name":"customers_external_unique","columns":["company_id","external_id"],"unique":true},
    {"name":"idx_customers_status","columns":["status"]}
  ],
  "foreign_keys":[
    {
      "name":"customers_company_id_foreign",
      "local_columns":["company_id"],
      "referenced_table":"companies",
      "referenced_columns":["id"],
      "on_delete":"CASCADE",
      "on_update":"CASCADE"
    }
  ]
}
```

## Composite primary key and foreign key

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
      "referenced_columns":["id","company_id"],
      "on_delete":"CASCADE",
      "on_update":"CASCADE"
    }
  ]
}
```

## Relationships in both directions

```bash
mysql-ddl-scout .resources/tables --relations customers
```

```json
{
  "name":"customers",
  "references":[
    {"name":"customers_company_id_foreign","local_columns":["company_id"],"referenced_table":"companies","referenced_columns":["id"],"on_delete":"CASCADE","on_update":"CASCADE"}
  ],
  "referenced_by":[
    {"table":"customer_addresses","name":"fk_customer_addresses_customer","columns":["customer_id","company_id"],"referenced_columns":["id","company_id"],"on_delete":"CASCADE","on_update":"CASCADE"}
  ]
}
```

## Operational error (stderr, exit code 1)

```bash
mysql-ddl-scout .resources/tables --keys_info missing_table
```

```json
{"error":"File for table 'missing_table' not found."}
```
