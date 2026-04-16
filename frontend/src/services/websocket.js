import { useAuthStore } from "../store/authStore";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000";

export class WorkspaceSocket {
  constructor(workspaceId, onMessage) {
    this.workspaceId = workspaceId;
    this.onMessage = onMessage;
    this.ws = null;
    this.reconnectTimer = null;
  }

  connect() {
    const token = useAuthStore.getState().token;
    if (!token) return;

    this.ws = new WebSocket(`${WS_URL}/ws/${this.workspaceId}?token=${token}`);

    this.ws.onopen = () => {
      console.log(`[WS] Connected to workspace ${this.workspaceId}`);
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.onMessage(data);
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      console.log(`[WS] Disconnected, reconnecting in 3s...`);
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = (err) => {
      console.error("[WS] Error", err);
      this.ws.close();
    };
  }

  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.ws?.close();
    this.ws = null;
  }
}
