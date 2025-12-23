#!/bin/sh
#set -ex
set -e

# Function to read secret from file
read_secret() {
    local file="$1"
    if [ -f "$file" ]; then
        cat "$file"
    fi
}

# Function to read and set a MariaDB user password from secret file or env variable
set_mysql_password() {
    local username="$1"
    local file_var="$2"
    local env_var="$3"
    local ip="$4"


    local password=$(read_secret "$file_var")
    #echo "from secret file =$file_var the user =$username has this pass =$password from ip=$ip"
    #echo "envi =>$env_var<"
   

    if [ -n "$password" ]; then
        echo "Setting password for user '$username' from secret file..."
    elif [ -n "$env_var" ]; then
        echo "Warning: Using $env_var environment variable (less secure)."
        password="$env_var"
        echo "Setting password for user '$username' from environment variable..."
    else
        echo "No password provided for user '$username'. Skipping."
        return
    fi

    if [ "$username" = "root" ]; then
        mariadb -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '$password'; FLUSH PRIVILEGES; " -S /run/mysqld/mysqld.sock
	    #echo "/////// root password setup ////$(whoami)///"
    else
        mariadb -u root -e "CREATE USER IF NOT EXISTS '$username'@'$ip' IDENTIFIED BY '$password';" -S /run/mysqld/mysqld.sock
        mariadb -u root -e "GRANT ALL PRIVILEGES ON \`$DATABASE_NAME\`.* TO '$username'@'$ip' WITH GRANT OPTION; FLUSH PRIVILEGES; " -S /run/mysqld/mysqld.sock
	    #echo "//////  user $username creation and password set ///////"
    fi

    #mariadb -u root -e "FLUSH PRIVILEGES;" -S /run/mysqld/mysqld.sock
    echo "Password set for user '$username' from '$ip'."
}

mkdir -p /run/mysqld
chown -R mysql:mysql /run/mysqld
mkdir -p /var/lib/mysql
chown -R mysql:mysql /var/lib/mysql

# Set root password if MYSQL_ROOT_PASSWORD_FILE is set
#echo "root file:>$DBSERVER_ROOT_PASSWORD_FILE<"
#echo "msql file:>$DBSERVER_MSQL_PASSWORD_FILE<"
DBSERVER_ROOT_PASSWORD=$(read_secret "$DBSERVER_ROOT_PASSWORD_FILE")
DBSERVER_MSQL_PASSWORD=$(read_secret "$DBSERVER_MSQL_PASSWORD_FILE")
#echo "root pass:>$DBSERVER_ROOT_PASSWORD<"
#echo "msql pass:>$DBSERVER_MSQL_PASSWORD<"
# Si mariadb-install-db debe existir el directorio
if [ ! -d /var/lib/mysql/mysql ]; then
    echo "0.-Initializing MariaDB data directory..."
    # Explicitly run as root
    mariadb-install-db --user=mysql --datadir=/var/lib/mysql
    if [ $? -ne 0 ]; then
        echo "Error initializing MariaDB data directory."
        exit 1
    fi

    echo "1.-MariaDB data directory initialized."
    #echo "2.-exec /usr/bin/mariadbd --datadir=/var/lib/mysql &"
    /usr/bin/mariadbd -u root --datadir=/var/lib/mysql --socket=/run/mysqld/mysqld.sock > /tmp/mariadb.log 2>&1 &
    mariadb_pid=$!

    for i in $(seq 1 30); do
	    # The readiness check for the *temporary* server, before root password is set
        mariadb -u root -S /run/mysqld/mysqld.sock -e "SELECT 1" &>/dev/null && break
	    echo "MariaDB not ready yet, waiting ....($i/30)"
	    sleep 1
    done

    echo "3.-MariaDB server up and running temporally as user=root with PID=$mariadb_pid"
    mariadb -u root -e "CREATE DATABASE IF NOT EXISTS \`$DATABASE_NAME\`;" -S /run/mysqld/mysqld.sock

    # Set passwords using the function
    set_mysql_password "$DBSERVER_MSQL_USER" "$DBSERVER_MSQL_PASSWORD_FILE" "$MYSQL_PASSWORD" "contentserver.thenet"
    echo "4.-MariaDB mysql user password settled"

    set_mysql_password "root" "$DBSERVER_ROOT_PASSWORD_FILE" "$MYSQL_ROOT_PASSWORD"
    echo "5.-MariaDB root user password settled"
    /usr/bin/mariadb-admin -u root -p"$DBSERVER_ROOT_PASSWORD" -S /run/mysqld/mysqld.sock shutdown
    wait "$mariadb_pid" || true

    #echo "MariaDB exited with $?"
    echo "6.-MariaDB server launch ..."
    chown -R mysql:mysql /var/lib/mysql
    exec su - mysql -s /bin/sh -c "/usr/bin/mariadbd --datadir=/var/lib/mysql --socket=/run/mysqld/mysqld.sock"
else
    echo "7.-MariaDB server launch ..."
    exec su - mysql -s /bin/sh -c "/usr/bin/mariadbd --datadir=/var/lib/mysql --socket=/run/mysqld/mysqld.sock"
fi