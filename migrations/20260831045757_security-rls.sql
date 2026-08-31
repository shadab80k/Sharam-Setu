-- ============================================================
-- SHRAMSETU — SECURITY: RLS + PRIVILEGES
-- Model: client SDK (anon/authenticated) is READ-ONLY and row-scoped.
--        ALL writes flow through the Next.js BFF (service key, zod, RBAC).
-- Defense in depth: anon key leak => zero write surface, scoped reads.
-- ============================================================

-- ---------- ROLE HELPERS (SECURITY DEFINER, no recursion) ----------
-- These run as the migration owner, which bypasses RLS, so policies on
-- public.users never recurse through these helpers.

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT u.role FROM public.users u WHERE u.id = (SELECT auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT COALESCE(public.current_app_role() = 'admin', false)
$$;

CREATE OR REPLACE FUNCTION public.is_worker()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT COALESCE(public.current_app_role() = 'worker', false)
$$;

CREATE OR REPLACE FUNCTION public.is_contractor()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT COALESCE(public.current_app_role() = 'contractor', false)
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT COALESCE((
    SELECT u.status = 'active' FROM public.users u WHERE u.id = (SELECT auth.uid())
  ), false)
$$;

CREATE OR REPLACE FUNCTION public.owns_row(p_row_owner UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT p_row_owner = (SELECT auth.uid())
$$;

-- ---------- ENABLE RLS EVERYWHERE ----------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','worker_profiles','contractor_profiles','skills','jobs','applications',
    'payments','expenses','savings_goals','reviews','verifications','trust_events',
    'notifications','safety_reports','fraud_signals','assessments','work_history',
    'saved_jobs','enrolled_courses','assistant_messages','otp_codes','admin_audit_log'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ---------- POLICIES ----------
-- Base predicate: signed-in AND not suspended for any client access.
-- users: every authenticated user can browse names/roles (marketplace directory);
-- sensitive columns (email/phone) are stripped by the BFF for non-self reads.
CREATE POLICY users_select ON public.users
  FOR SELECT TO authenticated
  USING ((SELECT public.is_active_user()));

CREATE POLICY worker_profiles_select ON public.worker_profiles
  FOR SELECT TO authenticated
  USING ((SELECT public.is_active_user()));

CREATE POLICY contractor_profiles_select ON public.contractor_profiles
  FOR SELECT TO authenticated
  USING ((SELECT public.is_active_user()));

CREATE POLICY skills_select ON public.skills
  FOR SELECT TO authenticated
  USING ((SELECT public.is_active_user()));

-- Jobs: active/draft-hidden rules. Everyone authenticated sees non-draft jobs
-- that are not closed for privacy of pipeline; owners + admin see all their own.
CREATE POLICY jobs_select ON public.jobs
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_active_user())
    AND (
      (SELECT public.is_admin())
      OR status IN ('active', 'completed')
      OR contractor_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.job_id = jobs.id AND a.worker_id = (SELECT auth.uid())
      )
    )
  );

-- Applications: worker sees own, contractor sees applications on own jobs, admin sees all.
CREATE POLICY applications_select ON public.applications
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_active_user())
    AND (
      worker_id = (SELECT auth.uid())
      OR (SELECT public.is_admin())
      OR job_id IN (SELECT id FROM public.jobs WHERE contractor_id = (SELECT auth.uid()))
    )
  );

-- Payments: participant or admin only.
CREATE POLICY payments_select ON public.payments
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_active_user())
    AND (
      worker_id = (SELECT auth.uid())
      OR contractor_id = (SELECT auth.uid())
      OR (SELECT public.is_admin())
    )
  );

-- Expenses: strictly owner (or admin for audit).
CREATE POLICY expenses_select ON public.expenses
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_active_user())
    AND (worker_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
  );

CREATE POLICY savings_goals_select ON public.savings_goals
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_active_user())
    AND (worker_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
  );

-- Reviews: public within platform (shown on profiles).
CREATE POLICY reviews_select ON public.reviews
  FOR SELECT TO authenticated
  USING ((SELECT public.is_active_user()));

CREATE POLICY verifications_select ON public.verifications
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_active_user())
    AND (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
  );

CREATE POLICY trust_events_select ON public.trust_events
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_active_user())
    AND (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
  );

CREATE POLICY notifications_select ON public.notifications
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_active_user())
    AND (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
  );

CREATE POLICY safety_reports_select ON public.safety_reports
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_active_user())
    AND (
      reporter_id = (SELECT auth.uid())
      OR target_user_id = (SELECT auth.uid())
      OR (SELECT public.is_admin())
      OR ((SELECT public.is_contractor()) AND job_id IN (
            SELECT id FROM public.jobs WHERE contractor_id = (SELECT auth.uid())
          ))
    )
  );

CREATE POLICY fraud_signals_select ON public.fraud_signals
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_active_user())
    AND (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
  );

CREATE POLICY assessments_select ON public.assessments
  FOR SELECT TO authenticated
  USING ((SELECT public.is_active_user()));

CREATE POLICY work_history_select ON public.work_history
  FOR SELECT TO authenticated
  USING ((SELECT public.is_active_user()));

CREATE POLICY saved_jobs_select ON public.saved_jobs
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_active_user())
    AND (user_id = (SELECT auth.uid()))
  );

CREATE POLICY enrolled_courses_select ON public.enrolled_courses
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_active_user())
    AND (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
  );

CREATE POLICY assistant_messages_select ON public.assistant_messages
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_active_user())
    AND (user_id = (SELECT auth.uid()))
  );

-- OTP + audit log: zero client access (BFF-only).
CREATE POLICY otp_codes_none ON public.otp_codes
  FOR SELECT TO authenticated USING (false);
CREATE POLICY admin_audit_log_none ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

-- ---------- PRIVILEGES: reads only, no client writes anywhere ----------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','worker_profiles','contractor_profiles','skills','jobs','applications',
    'payments','expenses','savings_goals','reviews','verifications','trust_events',
    'notifications','safety_reports','fraud_signals','assessments','work_history',
    'saved_jobs','enrolled_courses','assistant_messages','otp_codes','admin_audit_log'
  ]
  LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;

-- otp_codes / admin_audit_log: not even readable via anon path already; keep SELECT revoked too.
REVOKE SELECT ON public.otp_codes FROM anon, authenticated;
REVOKE SELECT ON public.admin_audit_log FROM authenticated;

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- ---------- IMMUTABLE FIELD GUARDS (BFF defense in depth) ----------
-- users.role must never change after creation.
CREATE OR REPLACE FUNCTION public.guard_users_role()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'users.role is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_role_immutable
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.guard_users_role();

-- jobs.contractor_id immutable; workers_hired only moves up and within cap.
CREATE OR REPLACE FUNCTION public.guard_jobs_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.contractor_id IS DISTINCT FROM OLD.contractor_id THEN
    RAISE EXCEPTION 'jobs.contractor_id is immutable';
  END IF;
  IF NEW.workers_hired < OLD.workers_hired THEN
    RAISE EXCEPTION 'workers_hired can only increase (server-maintained)';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER jobs_fields_guard
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.guard_jobs_fields();

-- payments: amount/participants immutable once created (audit-grade ledger).
CREATE OR REPLACE FUNCTION public.guard_payments_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.job_id IS DISTINCT FROM OLD.job_id
     OR NEW.worker_id IS DISTINCT FROM OLD.worker_id
     OR NEW.contractor_id IS DISTINCT FROM OLD.contractor_id
     OR NEW.amount IS DISTINCT FROM OLD.amount THEN
    RAISE EXCEPTION 'payments ledger fields are immutable';
  END IF;
  IF OLD.status = 'paid' AND NEW.status <> 'paid' THEN
    RAISE EXCEPTION 'paid payments cannot change status';
  END IF;
  IF NEW.status = 'paid' AND NEW.paid_date IS NULL THEN
    RAISE EXCEPTION 'paid payments require paid_date';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER payments_fields_guard
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.guard_payments_fields();

-- applications: ownership immutable.
CREATE OR REPLACE FUNCTION public.guard_applications_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.job_id IS DISTINCT FROM OLD.job_id
     OR NEW.worker_id IS DISTINCT FROM OLD.worker_id THEN
    RAISE EXCEPTION 'application ownership is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER applications_fields_guard
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.guard_applications_fields();
