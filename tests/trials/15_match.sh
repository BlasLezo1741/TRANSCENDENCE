#!/bin/bash

# Loop from 1 to 15
for i in {1..15}
do
   echo "Execution #$i"
   ./testone_remote_game.py &
done

echo "Done!"