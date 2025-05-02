from fastapi import WebSocket, WebSocketDisconnect, APIRouter, HTTPException
from typing import Dict, List
from app.crud.auth_service import decode_access_token
import logging

router = APIRouter()
logger = logging.getLogger("uvicorn")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}  # game_id -> list of WebSocket connections

    async def connect(self, game_id: int, websocket: WebSocket):
        await websocket.accept()
        if game_id not in self.active_connections:
            self.active_connections[game_id] = []
        self.active_connections[game_id].append(websocket)

    def disconnect(self, game_id: int, websocket: WebSocket):
        if game_id in self.active_connections:
            self.active_connections[game_id].remove(websocket)
            if not self.active_connections[game_id]:
                del self.active_connections[game_id]

    async def broadcast(self, game_id: int, message: dict):
        if game_id in self.active_connections:
            for connection in self.active_connections[game_id]:
                await connection.send_json(message)


manager = ConnectionManager()

@router.websocket("/{game_id}/")
async def websocket_endpoint(game_id: int, websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        logger.error("WebSocket connection rejected: Missing token")
        await websocket.close(code=403)
        return

    try:
        user_data = decode_access_token(token)
        user_id = user_data.get("user_id")
        if not user_id:
            logger.error("WebSocket connection rejected: Invalid token payload")
            raise ValueError("Invalid token payload")
        logger.info(f"WebSocket connection established for game_id={game_id}, user_id={user_id}")
    except Exception as e:
        logger.error(f"WebSocket connection rejected: {e}")
        await websocket.close(code=403)
        return

    await manager.connect(game_id, websocket)
    try:
        # Send an initial message to confirm the connection
        await websocket.send_json({"message": "WebSocket connection established", "game_id": game_id})

        # Keep the connection alive
        while True:
            message = await websocket.receive_text()
            logger.info(f"Received message: {message}")
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for game_id={game_id}, user_id={user_id}")
        manager.disconnect(game_id, websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")