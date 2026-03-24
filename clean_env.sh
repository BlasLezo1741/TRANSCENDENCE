#!/usr/bin/bash
echo "stoping containers"
docker stop $(docker ps -q)
docker rm $(docker ps -aq)
echo "Removing data from persistent volumes"
docker run --rm -v /home/$USER/data/grafana:/target alpine sh -c 'rm -rf /target/* /target/.[!.]* 2>/dev/null; echo done'
docker run --rm -v /home/$USER/data/dbserver:/target alpine sh -c 'rm -rf /target/* /target/.[!.]* 2>/dev/null; echo done'
rmdir /home/$USER/data/grafana
rmdir /home/$USER/data/dbserver
echo "Cleaning docker system"
yes | docker system prune -a --volumes > /dev/null 2>&1
echo "Cleaning npm environment's packages"
npm ls -g --depth=0 | awk -F ' ' '{print $2}' | awk -F '@' '{print $1}' | xargs
npm rm -g > /dev/null 2>&1

