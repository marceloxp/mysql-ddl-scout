# mysql-ddl-scout Examples

Illustrative commands using the sample DDL in this repository (`.resources/tables`). In other projects, replace the folder path with the project's `<ddl_folder>`.

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

## Operational error (stderr, exit code 1)

```bash
mysql-ddl-scout .resources/tables --keys_info missing_table
```

```json
{"error":"File for table 'missing_table' not found."}
```
