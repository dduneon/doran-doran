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
    // destinations는 fetchDestinations가 항상 덮어쓰므로 여기서 clear하지 않음
    // (clear하면 fetchDestinations와 race condition 발생 → 핀 사라짐 버그)
    const prevId = get().current?.id;
    if (prevId && String(prevId) !== String(id)) {
      // 다른 워크스페이스로 전환할 때만 워크스페이스 관련 데이터 초기화 (destinations 제외)
      set({ current: null, itinerary: [], flights: [], accommodations: [], expenses: [], expenseSummary: null });
    }
    const { data } = await workspaceApi.get(id);
    set({ current: data });
  },

  createWorkspace: async (payload) => {
    const { data } = await workspaceApi.create(payload);
    set((s) => ({ workspaces: [...s.workspaces, data] }));
    return data;
  },

  joinWorkspace: async (inviteCode) => {
    const { data } = await workspaceApi.joinByCode(inviteCode);
    set((s) => ({ workspaces: [...s.workspaces, data] }));
    return data;
  },

  updateWorkspace: async (id, payload) => {
    const { data } = await workspaceApi.update(id, payload);
    set((s) => ({
      current: s.current?.id === id ? data : s.current,
      workspaces: s.workspaces.map((w) => (w.id === id ? data : w)),
    }));
    return data;
  },

  // Destinations
  fetchDestinations: async (wsId) => {
    const { data } = await destinationApi.list(wsId);
    // API 응답이 곧 정답 — 이전에 무엇이 있든 덮어씀
    set({ destinations: data });
  },

  addDestination: async (wsId, payload) => {
    await destinationApi.create(wsId, payload);
    // 상태 업데이트는 WS broadcast(destination_added)가 단일 경로로 처리
  },

  updateDestination: (updated) => {
    set((s) => ({
      destinations: s.destinations.map((d) => (d.id === updated.id ? updated : d)),
    }));
  },

  removeDestination: async (wsId, id) => {
    await destinationApi.delete(wsId, id);
    // 상태 업데이트는 WS broadcast(destination_removed)가 처리
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

  addFlight: async (wsId, payload) => {
    const { data } = await flightApi.create(wsId, payload);
    set((s) => ({ flights: [...s.flights, data] }));
  },

  deleteFlight: async (wsId, id) => {
    await flightApi.delete(wsId, id);
    set((s) => ({ flights: s.flights.filter((f) => f.id !== id) }));
  },

  fetchAccommodations: async (wsId) => {
    const { data } = await accommodationApi.list(wsId);
    set({ accommodations: data });
  },

  addAccommodation: async (wsId, payload) => {
    const { data } = await accommodationApi.create(wsId, payload);
    set((s) => ({ accommodations: [...s.accommodations, data] }));
  },

  deleteAccommodation: async (wsId, id) => {
    await accommodationApi.delete(wsId, id);
    set((s) => ({ accommodations: s.accommodations.filter((a) => a.id !== id) }));
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
        // API 응답으로 이미 추가된 경우 WS 브로드캐스트는 무시
        set((s) =>
          s.destinations.find((d) => d.id === data.id)
            ? s
            : { destinations: [...s.destinations, data] }
        );
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
