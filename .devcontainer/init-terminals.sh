#!/bin/bash

# Give the VS Code server a moment to fully initialize
sleep 5

# Open terminals using the specific profile names defined in devcontainer.json
code --terminal --profile "backend"
code --terminal --profile "frontend"
code --terminal --profile "database"