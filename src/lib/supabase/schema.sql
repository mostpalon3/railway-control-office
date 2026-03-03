-- ============================================================
-- Railway Control Office — Supabase SQL Schema
-- Paste this entire file into the Supabase SQL Editor and run.
-- ============================================================

-- ─────────────────────────────────────────
-- 1. SESSIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sessions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  started_at  timestamptz NOT NULL DEFAULT now(),
  ended_at    timestamptz,                              -- nullable: null = still running
  created_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE  public.sessions               IS 'Control-office sessions (a working period / train chart run)';
COMMENT ON COLUMN public.sessions.ended_at      IS 'NULL while session is active';
COMMENT ON COLUMN public.sessions.created_by    IS 'auth.users.id of the user who opened this session';


-- ─────────────────────────────────────────
-- 2. ENTRIES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.entries (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid        NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,

  loco1       text        NOT NULL,
  loco2       text,                                     -- nullable; logically paired with loco1 when set

  train_no    text        NOT NULL,
  station     text        NOT NULL,

  -- chart_no: 1-12 or composite value '3A'
  chart_no    text        NOT NULL
              CHECK (chart_no IN ('1','2','3','4','5','6','7','8','9','10','11','12','3A')),

  -- sno: serial number within chart, 1-21
  sno         integer     NOT NULL
              CHECK (sno BETWEEN 1 AND 21),

  date        date        NOT NULL DEFAULT CURRENT_DATE,
  created_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),

  -- No duplicate loco1 within a session
  CONSTRAINT entries_session_loco1_unique UNIQUE (session_id, loco1)
);

COMMENT ON TABLE  public.entries             IS 'Individual loco/train entries within a session chart';
COMMENT ON COLUMN public.entries.loco2       IS 'Second loco (banked / double-headed); NULL when single traction';
COMMENT ON COLUMN public.entries.chart_no    IS 'Chart position: 1–12 or the composite value 3A';
COMMENT ON COLUMN public.entries.sno         IS 'Serial number within the chart, 1–21';


-- ─────────────────────────────────────────
-- 3. INDEXES
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS entries_session_id_idx  ON public.entries (session_id);
CREATE INDEX IF NOT EXISTS entries_created_by_idx  ON public.entries (created_by);
CREATE INDEX IF NOT EXISTS entries_date_idx        ON public.entries (date);
CREATE INDEX IF NOT EXISTS sessions_created_by_idx ON public.sessions (created_by);


-- ─────────────────────────────────────────
-- 4. ROW LEVEL SECURITY
-- ─────────────────────────────────────────
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries  ENABLE ROW LEVEL SECURITY;


-- ── sessions policies ──────────────────────

-- Any authenticated user can view all sessions (collaborative)
CREATE POLICY "sessions: authenticated read"
  ON public.sessions
  FOR SELECT
  TO authenticated
  USING (true);

-- Any authenticated user can create a session
CREATE POLICY "sessions: authenticated insert"
  ON public.sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Any authenticated user can update any session (collaborative edits)
CREATE POLICY "sessions: authenticated update"
  ON public.sessions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ONLY the creator can delete their own session
CREATE POLICY "sessions: creator delete only"
  ON public.sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);


-- ── entries policies ────────────────────────

-- Any authenticated user can read all entries (collaborative)
CREATE POLICY "entries: authenticated read"
  ON public.entries
  FOR SELECT
  TO authenticated
  USING (true);

-- Any authenticated user can insert entries into any session
CREATE POLICY "entries: authenticated insert"
  ON public.entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Any authenticated user can update any entry (collaborative)
CREATE POLICY "entries: authenticated update"
  ON public.entries
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Any authenticated user can delete any entry (collaborative)
CREATE POLICY "entries: authenticated delete"
  ON public.entries
  FOR DELETE
  TO authenticated
  USING (true);


-- ─────────────────────────────────────────
-- 5. AUTH CONFIG NOTES (Dashboard steps)
-- ─────────────────────────────────────────
-- The following CANNOT be done via SQL — apply in the Supabase Dashboard:
--
--  Authentication → Providers
--    ✓ Email  → Enable  (already on by default)
--    ✗ Disable all OAuth providers (Google, GitHub, etc.) for email-only
--
--  Authentication → Email Templates
--    • Customise confirm / recovery emails as needed
--
--  Authentication → URL Configuration
--    • Set Site URL to your deployed domain (or http://localhost:3000 for dev)
--    • Add redirect URL: <your-domain>/auth/confirm
--
-- To enforce email confirmation before login, go to:
--   Authentication → Settings → Enable email confirmations  ✓
-- ─────────────────────────────────────────
