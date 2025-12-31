# internal sql syntasis analysis

``` bash
docker exec -i dbserver psql -U postgres -d transcendence << EOF
BEGIN;
\i /docker-entrypoint-initdb.d/init.sql
ROLLBACK;
EOF
```

# Insert a specific primary key

When a primary key was defined as `GENERATED ALWAYS AS IDENTITY` postgres does not allow to manually enter a specific value.

During the syntetic data creation i required to doit at execution of INSERT INTO
```sql
INSERT INTO METRIC (metric_pk, metric_cat_fk, metric_i18n_name, metric_i18n_description)
OVERRIDING SYSTEM VALUE
VALUES 
```

# external sql syntax check

I used the healthy running container to check sql syntax faster.
cat ./srcs/dbserver/ER-postgres.sql | docker exec -i dbserver psql -U postgres -d postgres --set ON_ERROR_STOP=on -v ON_ERROR_STOP=1

```bash
docker exec -i dbserver bash -c "psql -U postgres -d transcendence <<'EOSQL'
BEGIN;
$(cat ./srcs/dbserver/ER-postgres.sql)
ROLLBACK;
EOSQL"
```