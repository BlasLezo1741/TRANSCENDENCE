#!/usr/bin/bash
echo "stoping containers"
docker stop $(docker ps -q)
docker rm $(docker ps -aq)
echo "Removing data from persistent volumes"
<<<<<<< Updated upstream
docker run --rm -v /home/luicasad/data/grafana:/target alpine sh -c 'rm -rf /target/* /target/.[!.]* 2>/dev/null; echo done'
docker run --rm -v /home/luicasad/data/dbserver:/target alpine sh -c 'rm -rf /target/* /target/.[!.]* 2>/dev/null; echo done'
rmdir /home/luicasad/data/grafana
rmdir /home/luicasad/data/dbserver
echo "Removing named volumes"
docker volume rm $(docker volume ls -q)

=======
docker run --rm -v /home/maria-nm/data/grafana:/target alpine sh -c 'rm -rf /target/* /target/.[!.]* 2>/dev/null; echo done'
docker run --rm -v /home/maria-nm/data/dbserver:/target alpine sh -c 'rm -rf /target/* /target/.[!.]* 2>/dev/null; echo done'
rmdir /home/maria-nm/data/grafana
rmdir /home/maria-nm/data/dbserver
>>>>>>> Stashed changes
echo "Cleaning docker system"
yes | docker system prune -a --volumes > /dev/null 2>&1
echo "Cleaning npm environment's packages"
npm ls -g --depth=0 | awk -F ' ' '{print $2}' | awk -F '@' '{print $1}' | xargs
npm rm -g > /dev/null 2>&1

