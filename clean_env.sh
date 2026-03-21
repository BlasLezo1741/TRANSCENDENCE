#!/usr/bin/bash
echo "Removing data from persistent volumes"
rm -rf ~/data
echo "Cleaning docker system"
yes | docker system prune -a > /dev/null 2>&1
echo "Cleaning npm environment's packages"
npm ls -g --depth=0 | awk -F ' ' '{print $2}' | awk -F '@' '{print $1}' | xargs
npm rm -g > /dev/null 2>&1

