import { create } from "zustand";
import { workspaceApi, destinationApi, itineraryApi, flightApi, accommodationApi, expenseApi } from "../services/api";

export const useWorkspaceStore = create((set, get) => ({
  workspaces: [],
  current: null,
  destinations: [],
  itinerary: [],
  flights: [],
  accommodations: [],
  expenses: [],
  expenseSummary: null,

  fetchWorkspaces: async () => {
    const { data } = await workspaceApi.list();
    set({ workspaces: data });
  },

  fetchWorkspace: async (id) => {
    const { data } = await workspaceApi.get(id);
    set({ current: data });
  },

  createWorkspace: async (payload) => {
    const { data } = await workspaceApi.create(payload);
    set((s) => ({ workspaces: [...s.workspaces, data] }));
    return data;
  },

  // Destinations
  fetchDestinations: async (wsId) => {
    const { data } = await destinationApi.list(wsId);
    set({ destinations: data });
  },

  addDestination: async (wsId, payload) => {
    const { data } = await destinationApi.create(wsId, payload);
    set((s) => ({ destinations: [...s.destinations, data] }));
    return data;
  },

  updateDestination: (updated) => {
    set((s) => ({
      destinations: s.destinations.map((d) => (d.id === updated.id ? updated : d)),
    }));
  },

  removeDestination: (id) => {
    set((s) => ({ destinations: s.destinations.filter((d) => d.id !== id) }));
  },

  // Itinerary
  fetchItinerary: async (wsId) => {
    const { data } = await itineraryApi.get(wsId);
    set({ itinerary: data });
  },

  reloadItinerary: async () => {
    const wsId = get().current?.id;
    if (wsId) await get().fetchItinerary(wsId);
  },

  // Flights & Accommodations
  fetchFlights: async (wsId) => {
    const { data } = await flightApi.list(wsId);
    set({ flights: data });
  },

  fetchAccommodations: async (wsId) => {
    const { data } = await accommodationApi.list(wsId);
    set({ accommodations: data });
  },

  // Expenses
  fetchExpenses: async (wsId) => {
    const { data } = await expenseApi.list(wsId);
    set({ expenses: data });
  },

  fetchExpenseSummary: async (wsId) => {
    const { data } = await expenseApi.summary(wsId);
    set({ expenseSummary: data });
  },

  // WebSocket handlers
  handleWsEvent: (event) => {
    const { event: type, data } = event;
    switch (type) {
      case "destination_added":
        set((s) => ({ destinations: [...s.destinations, data] }));
        break;
      case "destination_updated":
        set((s) => ({
          destinations: s.destinations.map((d) => (d.id === data.id ? data : d)),
        }));
        break;
      case "destination_removed":
        set((s) => ({ destinations: s.destinations.filter((d) => d.id !== data.id) }));
        break;
      case "itinerary_updated":
        get().reloadItinerary();
        break;
      default:
        break;
    }
  },
}));
