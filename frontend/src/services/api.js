import axios from "axios";
import { useAuthStore } from "../store/authStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
};

// Workspaces
export const workspaceApi = {
  list: () => api.get("/workspaces/"),
  get: (id) => api.get(`/workspaces/${id}`),
  create: (data) => api.post("/workspaces/", data),
  update: (id, data) => api.patch(`/workspaces/${id}`, data),
  delete: (id) => api.delete(`/workspaces/${id}`),
  join: (id, inviteCode) => api.post(`/workspaces/${id}/join?invite_code=${inviteCode}`),
};

// Destinations
export const destinationApi = {
  list: (wsId) => api.get(`/workspaces/${wsId}/destinations/`),
  create: (wsId, data) => api.post(`/workspaces/${wsId}/destinations/`, data),
  update: (wsId, destId, data) => api.patch(`/workspaces/${wsId}/destinations/${destId}`, data),
  delete: (wsId, destId) => api.delete(`/workspaces/${wsId}/destinations/${destId}`),
};

// Itinerary
export const itineraryApi = {
  get: (wsId) => api.get(`/workspaces/${wsId}/itinerary`),
  addDay: (wsId, data) => api.post(`/workspaces/${wsId}/itinerary/days`, data),
  addItem: (wsId, dayId, data) => api.post(`/workspaces/${wsId}/itinerary/days/${dayId}/items`, data),
  updateItem: (wsId, itemId, data) => api.patch(`/workspaces/${wsId}/itinerary/items/${itemId}`, data),
  reorder: (wsId, data) => api.post(`/workspaces/${wsId}/itinerary/reorder`, data),
};

// Flights
export const flightApi = {
  list: (wsId) => api.get(`/workspaces/${wsId}/flights`),
  create: (wsId, data) => api.post(`/workspaces/${wsId}/flights`, data),
  delete: (wsId, id) => api.delete(`/workspaces/${wsId}/flights/${id}`),
};

// Accommodations
export const accommodationApi = {
  list: (wsId) => api.get(`/workspaces/${wsId}/accommodations`),
  create: (wsId, data) => api.post(`/workspaces/${wsId}/accommodations`, data),
  delete: (wsId, id) => api.delete(`/workspaces/${wsId}/accommodations/${id}`),
};

// Notifications
export const notificationApi = {
  list: () => api.get("/notifications/"),
  unreadCount: () => api.get("/notifications/unread-count"),
  markRead: (id) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post("/notifications/read-all"),
};

// Expenses
export const expenseApi = {
  list: (wsId) => api.get(`/workspaces/${wsId}/expenses/`),
  create: (wsId, data) => api.post(`/workspaces/${wsId}/expenses/`, data),
  update: (wsId, id, data) => api.patch(`/workspaces/${wsId}/expenses/${id}`, data),
  delete: (wsId, id) => api.delete(`/workspaces/${wsId}/expenses/${id}`),
  summary: (wsId) => api.get(`/workspaces/${wsId}/expenses/summary`),
};

export default api;
