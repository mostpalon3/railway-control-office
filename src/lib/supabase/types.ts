// Auto-maintained — keep in sync with schema.sql

export type ChartNo =
  | "1" | "2" | "3" | "4" | "5" | "6"
  | "7" | "8" | "9" | "10" | "11" | "12"
  | "3A";

export type Sno = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
                 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21;

// ─── sessions ───────────────────────────────────────
export interface Session {
  id: string;                  // uuid
  name: string;
  started_at: string;          // timestamptz ISO string
  ended_at: string | null;     // null = still active
  created_by: string | null;   // auth.users.id
}

export type SessionInsert = {
  name: string;
  started_at?: string;
  ended_at?: string | null;
  created_by?: string | null;
};

export type SessionUpdate = Partial<
  Pick<Session, "name" | "ended_at">
>;

// ─── entries ────────────────────────────────────────
export interface Entry {
  id: string;                  // uuid
  session_id: string;          // → sessions.id
  loco1: string;
  loco2: string | null;        // null = single traction
  train_no: string;
  station: string;
  chart_no: ChartNo;
  sno: Sno;
  date: string;                // date ISO string YYYY-MM-DD
  created_by: string | null;   // auth.users.id
  created_at: string;          // timestamptz ISO string
}

export type EntryInsert = {
  session_id: string;
  loco1: string;
  loco2?: string | null;
  train_no: string;
  station: string;
  chart_no: ChartNo;
  sno: Sno;
  date?: string;
  created_by?: string | null;
  created_at?: string;
};

export type EntryUpdate = Partial<
  Pick<Entry, "loco1" | "loco2" | "train_no" | "station" | "chart_no" | "sno" | "date">
>;

// ─── Supabase Database type ───────────────
// NOTE: The Supabase JS client requires a very specific generated-type shape
// (including Relationships, Views, Functions, Enums, etc.) to fully type the
// client. Until you run `supabase gen types typescript`, use the types below
// for manual casting:  `data as Session[]`  etc.
//
// To generate proper types once your Supabase project is connected, run:
//   npx supabase gen types typescript --project-id <your-project-ref> > src/lib/supabase/database.types.ts
// Then import that file in client.ts / server.ts as:
//   createBrowserClient<Database>(...)
export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: Session;
        Insert: SessionInsert;
        Update: SessionUpdate;
      };
      entries: {
        Row: Entry;
        Insert: EntryInsert;
        Update: EntryUpdate;
      };
    };
  };
}
