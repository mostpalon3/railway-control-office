import { create } from "zustand";
import type { Entry } from "@/lib/supabase/types";

// Re-export so consumers can import from the store barrel
export type { Entry } from "@/lib/supabase/types";

interface EntryStore {
  entries: Entry[];
  setEntries: (entries: Entry[]) => void;
  addEntry: (entry: Entry) => void;
  updateEntry: (id: string, patch: Partial<Entry>) => void;
  removeEntry: (id: string) => void;
  getEntriesBySession: (sessionId: string) => Entry[];
  clearSession: (sessionId: string) => void;
}

export const useEntryStore = create<EntryStore>((set, get) => ({
  entries: [],
  setEntries: (entries) => set({ entries }),
  addEntry: (entry) => set((state) => ({ entries: [...state.entries, entry] })),
  updateEntry: (id, patch) =>
    set((state) => ({
      entries: state.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),
  removeEntry: (id) =>
    set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
  getEntriesBySession: (sessionId) =>
    get().entries.filter((e) => e.session_id === sessionId),
  clearSession: (sessionId) =>
    set((state) => ({
      entries: state.entries.filter((e) => e.session_id !== sessionId),
    })),
}));
