from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, workspaces, destinations, itineraries, notifications, expenses, websocket

app = FastAPI(title="도란도란 API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(workspaces.router)
app.include_router(destinations.router)
app.include_router(itineraries.router)
app.include_router(notifications.router)
app.include_router(expenses.router)
app.include_router(websocket.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
