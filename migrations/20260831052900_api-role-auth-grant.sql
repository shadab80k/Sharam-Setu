-- ============================================================
-- SHRAMSETU — API-key role FK support
-- The PostgREST API-key role needs SELECT on auth.users so that RI
-- trigger checks (FOR KEY SHARE) can run when inserting rows that
-- reference auth.users(id). project_admin already has these grants;
-- the anon/authenticated runtime roles get read-only access here.
-- ============================================================

GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT SELECT ON auth.users TO anon, authenticated;
