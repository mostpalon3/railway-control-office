import { create } from "zustand";

export interface Station {
  id: string;
  code: string;
  name: string;
  zone: string;
  division?: string;
  sessionId: string;
}

interface StationStore {
  stations: Station[];
  setStations: (stations: Station[]) => void;
  addStation: (station: Station) => void;
  updateStation: (id: string, patch: Partial<Station>) => void;
  removeStation: (id: string) => void;
  getStationsBySession: (sessionId: string) => Station[];
}

export const useStationStore = create<StationStore>((set, get) => ({
  stations: [],
  setStations: (stations) => set({ stations }),
  addStation: (station) =>
    set((state) => ({ stations: [...state.stations, station] })),
  updateStation: (id, patch) =>
    set((state) => ({
      stations: state.stations.map((s) =>
        s.id === id ? { ...s, ...patch } : s
      ),
    })),
  removeStation: (id) =>
    set((state) => ({ stations: state.stations.filter((s) => s.id !== id) })),
  getStationsBySession: (sessionId) =>
    get().stations.filter((s) => s.sessionId === sessionId),
}));
