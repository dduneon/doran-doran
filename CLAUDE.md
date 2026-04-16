# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**도란도란 (Dorandoran)** — a collaborative travel planning web application. Groups create shared workspaces and plan trips together in real-time.

Stack: React (Vite) frontend + FastAPI backend + MySQL database + WebSocket for real-time sync.

## Development Commands

### Docker (recommended)
```bash
docker-compose up        # start both services
docker-compose up --build  # rebuild after dependency changes
```
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`

### Backend (local)
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env     # fill in DATABASE_URL, SECRET_KEY, GOOGLE_MAPS_API_KEY
alembic upgrade head     # run migrations
uvicorn app.main:app --reload
```

### Frontend (local)
```bash
cd frontend
npm install
cp .env.example .env     # fill in VITE_API_URL, VITE_WS_URL, VITE_GOOGLE_MAPS_API_KEY
npm run dev
```

### Database Migrations (Alembic)
```bash
cd backend
alembic revision --autogenerate -m "description"  # create migration
alembic upgrade head                               # apply migrations
alembic downgrade -1                               # rollback one step
```

## Architecture

### Backend (`backend/app/`)
FastAPI app with async SQLAlchemy (MySQL/aiomysql).

- `main.py` — app init, CORS, router registration
- `config.py` — Pydantic Settings (reads from `.env`)
- `database.py` — async SQLAlchemy engine + session
- `core/security.py` — JWT (HS256) + bcrypt password hashing
- `core/dependencies.py` — `get_current_user` OAuth2 dependency
- `models/` — SQLAlchemy ORM models
- `schemas/` — Pydantic request/response schemas
- `routers/` — route handlers (auth, workspaces, destinations, itineraries, expenses, notifications, websocket)
- `services/` — business logic (auth, notifications)
- `alembic/` — database migration versions

### Frontend (`frontend/src/`)
React 18 + Vite + Zustand for state.

- `App.jsx` — router config + `PrivateRoute` wrapper
- `pages/` — Auth, Dashboard, Workspace
- `components/` — common (Navbar, NotificationBadge), map (MapView, PlaceSearch), itinerary (ItineraryBoard, DayColumn), expense
- `services/api.js` — Axios instance with JWT interceptor + all API endpoints
- `services/websocket.js` — `WorkspaceSocket` class with auto-reconnect
- `store/authStore.js` — user auth + token (Zustand, persisted to localStorage)
- `store/workspaceStore.js` — workspace data + WebSocket event handlers
- `store/notificationStore.js` — notification state

### Vite Proxy
`/api/*` requests in frontend are proxied to `http://localhost:8000` — backend routes do **not** use an `/api` prefix.

### Authentication
1. Register/login → backend returns JWT
2. Token stored in Zustand (localStorage persistence)
3. Axios interceptor attaches `Authorization: Bearer {token}` to every request
4. 401 response → auto logout + redirect to `/login`

### Password Hashing
SHA-256 pre-hash → bcrypt (works around bcrypt's 72-byte input limit). Both steps happen in `core/security.py`.

### Real-Time Collaboration (WebSocket)
- Single WS endpoint: `GET /ws/{workspace_id}?token={jwt_token}`
- `ConnectionManager` in `routers/websocket.py` maps workspace_id → list of active connections
- Event types: `destination_added`, `destination_updated`, `destination_removed`, `itinerary_updated`
- Frontend `WorkspaceSocket` auto-reconnects after 3s on disconnect
- `workspaceStore` deduplicates events from both API responses and WebSocket broadcasts

### Workspace Model
- Owner creates workspace with country + invite code
- Members join via invite code (admin/member roles via `MemberRole` enum)
- All mutations broadcast via WebSocket to all connected members

## Key Conventions

- Backend uses **async/await** throughout (async SQLAlchemy sessions, async route handlers)
- Frontend API calls go through `services/api.js` — add new endpoints there, not inline
- Zustand store actions handle both the API call and state update together
- Google Maps integration uses `GOOGLE_MAPS_API_KEY` on both frontend and backend (place search uses backend proxy to avoid exposing key)
