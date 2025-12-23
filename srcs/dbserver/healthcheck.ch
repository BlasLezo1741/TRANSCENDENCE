#!/bin/sh
#set -ex
set -e

if [ ! -f /run/secrets/dbserver_root_password ]; then
  echo "Secret not found — skipping healthcheck for now"
  exit 1
fi

# Read the root password from the mounted secret file
ROOT_PASSWORD=$(cat /run/secrets/dbserver_root_password)
#echo "ROOT_PASSWORD=$ROOT_PASSWORD"

# Ping MariaDB using the retrieved password
mariadb-admin ping -u root --password="$ROOT_PASSWORD" -h localhost

# Check the exit status of the mariadb-admin ping command
if [ $? -eq 0 ]; then
  echo "MariaDB ping successful. Healthcheck passed."
  exit 0 # MariaDB is healthy
else
  echo "MariaDB ping failed. Healthcheck failed."
  exit 1 # MariaDB is unhealthy
fi