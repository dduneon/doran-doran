import { create } from "zustand";
import { notificationApi } from "../services/api";

export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async () => {
    const { data } = await notificationApi.list();
    set({ notifications: data, unreadCount: data.filter((n) => !n.is_read).length });
  },

  fetchUnreadCount: async () => {
    const { data } = await notificationApi.unreadCount();
    set({ unreadCount: data.count });
  },

  markRead: async (id) => {
    await notificationApi.markRead(id);
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));
  },

  markAllRead: async () => {
    await notificationApi.markAllRead();
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));
  },
}));
