# sql syntasis analysis

``` bash
docker exec -i dbserver psql -U postgres -d transcendence << EOF
BEGIN;
\i /docker-entrypoint-initdb.d/init.sql
ROLLBACK;
EOF
```