#!/bin/bash

# Esperar a que VS Code esté listo
sleep 2

# Crear terminal Backend
code --new-window --command workbench.action.terminal.newWithProfile --args backend

# Crear terminal Frontend
code --command workbench.action.terminal.newWithProfile --args frontend

# Crear terminal Database
code --command workbench.action.terminal.newWithProfile --args database
