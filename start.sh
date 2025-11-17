#!/bin/bash

GIT_BASH="/c/Program Files/Git/git-bash.exe"


# Start Backend
"$GIT_BASH" -c "cd ~/BattleShipV2/Ship && source venv/Scripts/activate && uvicorn app.main:app --reload" &

# Start Frontend
"$GIT_BASH" -c "cd ~/BattleShipV2/my-react-app && npm start; exec bash" &
