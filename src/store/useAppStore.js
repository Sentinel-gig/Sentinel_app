import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../utils/supabase";

const useAppStore = create((set, get) => ({
  isLoggedIn: false,
  user: null,
  _hydrated: false,

  // ── Auth
  login: (user) => {
    set({ isLoggedIn: true, user });
    AsyncStorage.setItem("sentinel_user", JSON.stringify(user));
    get().loadActivityLog(user.id);
  },

  logout: () => {
    set({ isLoggedIn: false, user: null, activityLog: [] });
    AsyncStorage.removeItem("sentinel_user");
  },

  // ── Hydrate from storage on app start
  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem("sentinel_user");
      if (stored) {
        const user = JSON.parse(stored);
        set({ isLoggedIn: true, user });
        get().loadActivityLog(user.id);
      }
    } catch (e) {}
    set({ _hydrated: true });
  },

  // ── Shift
  shiftActive: false,
  shiftStartTime: null,
  startShift: () => set({ shiftActive: true, shiftStartTime: Date.now() }),
  endShift: () => set({ shiftActive: false, shiftStartTime: null }),

  // ── Location
  location: null,
  setLocation: (loc) => set({ location: loc }),

  // ── City zones (set by RouteMapScreen when map data loads)
  // Used by tracking.js to detect risk zone crossings during shift
  cityZones: [],
  setCityZones: (zones) => set({ cityZones: zones }),

  // ── Lang
  lang: "en",
  setLang: (l) => set({ lang: l }),

  // ── Activity
  activityLog: [],

  loadActivityLog: async (workerId) => {
    try {
      const cached = await AsyncStorage.getItem(`activity_${workerId}`);
      if (cached) set({ activityLog: JSON.parse(cached) });
    } catch (e) {}
  },

  addActivity: (event) => {
    const newEvent = {
      ...event,
      id: Date.now(),
      timestamp: new Date().toISOString(),
    };
    set((s) => {
      const updated = [newEvent, ...s.activityLog];
      const workerId = s.user?.id;
      if (workerId) {
        AsyncStorage.setItem(
          `activity_${workerId}`,
          JSON.stringify(updated.slice(0, 100)),
        );
        supabase
          .from("activity_logs")
          .insert([
            {
              worker_id: workerId,
              worker_name: s.user?.name,
              type: newEvent.type,
              title: newEvent.title,
              sub: newEvent.sub,
              timestamp: newEvent.timestamp,
            },
          ])
          .then(() => {})
          .catch(() => {});
      }
      return { activityLog: updated };
    });
  },
}));

export default useAppStore;
