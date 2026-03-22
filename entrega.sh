#!/usr/bin/bash
cp Makefile ~/Desktop/entrega
cp README.md ~/Desktop/entrega
cp .gitignore ~/Desktop/entrega
rm -rf ~/Desktop/entrega/srcs 
rm -rf ~/Desktop/entrega/docs
cp -r srcs ~/Desktop/entrega
cp -r docs ~/Desktop/entrega
rm ~/Desktop/entrega/srcs/.env
