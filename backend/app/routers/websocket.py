import json
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError

from app.core.security import decode_token

router = APIRouter(tags=["websocket"])


class ConnectionManager:
    def __init__(self):
        # workspace_id -> list of websockets
        self._connections: dict[str, list[WebSocket]] = {}

    async def connect(self, workspace_id: str, websocket: WebSocket):
        await websocket.accept()
        self._connections.setdefault(workspace_id, []).append(websocket)

    def disconnect(self, workspace_id: str, websocket: WebSocket):
        conns = self._connections.get(workspace_id, [])
        if websocket in conns:
            conns.remove(websocket)

    async def broadcast(self, workspace_id: str, message: Any):
        payload = json.dumps(message, default=str)
        for ws in list(self._connections.get(workspace_id, [])):
            try:
                await ws.send_text(payload)
            except Exception:
                self.disconnect(workspace_id, ws)


manager = ConnectionManager()


@router.websocket("/ws/{workspace_id}")
async def websocket_endpoint(
    workspace_id: str,
    websocket: WebSocket,
    token: str = Query(...),
):
    try:
        decode_token(token)
    except JWTError:
        await websocket.close(code=4001)
        return

    await manager.connect(workspace_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo back or handle client-initiated events
            await manager.broadcast(workspace_id, json.loads(data))
    except WebSocketDisconnect:
        manager.disconnect(workspace_id, websocket)
