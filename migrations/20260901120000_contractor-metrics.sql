-- Contractor metrics derived from real data instead of seeded random numbers.
--
--   completed_jobs      -> COUNT of the contractor's jobs with status 'completed'
--   payment_reliability -> % of the contractor's PAID payments that were paid
--                          on or before their due date (NULL when none paid yet,
--                          so the UI hides it instead of showing a made-up number)
--   response_rate       -> NOT derivable from any recorded data (we don't track
--                          when an application was first seen), so it is left
--                          untouched and the UI must not display it.
--
-- recalc_contractor_metrics(p_contractor_id) refreshes one contractor;
-- recalc_contractor_metrics_all() sweeps every contractor (used by seed + cron).

CREATE OR REPLACE FUNCTION public.recalc_contractor_metrics(p_contractor_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  completed_count INTEGER;
  paid_total INTEGER;
  on_time INTEGER;
  reliability INTEGER;
BEGIN
  -- Real completed-job count from the jobs table
  SELECT COUNT(*) INTO completed_count
  FROM public.jobs
  WHERE contractor_id = p_contractor_id AND status = 'completed';

  -- On-time % from the payments ledger: paid payments only, paid_date <= due_date
  SELECT
    COUNT(*) FILTER (WHERE status = 'paid'),
    COUNT(*) FILTER (WHERE status = 'paid' AND paid_date IS NOT NULL AND paid_date <= due_date)
  INTO paid_total, on_time
  FROM public.payments
  WHERE contractor_id = p_contractor_id;

  reliability := CASE WHEN paid_total > 0 THEN ROUND(on_time * 100.0 / paid_total) ELSE NULL END;

  UPDATE public.contractor_profiles
  SET completed_jobs = completed_count,
      payment_reliability = COALESCE(reliability, 0)
  WHERE user_id = p_contractor_id;
END $$;

CREATE OR REPLACE FUNCTION public.recalc_contractor_metrics_all()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN SELECT user_id FROM public.contractor_profiles LOOP
    PERFORM public.recalc_contractor_metrics(c.user_id);
  END LOOP;
END $$;

-- Worker completed_jobs derived from real completed applications (was a random
-- seed number before). Display-only; the trust engine computes its own count.
CREATE OR REPLACE FUNCTION public.recalc_worker_completed_jobs_all()
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  UPDATE public.worker_profiles wp
  SET completed_jobs = COALESCE(sub.done, 0)
  FROM (
    SELECT worker_id, COUNT(*) AS done
    FROM public.applications
    WHERE status = 'completed'
    GROUP BY worker_id
  ) sub
  WHERE wp.user_id = sub.worker_id;
  UPDATE public.worker_profiles wp
  SET completed_jobs = 0
  WHERE NOT EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.worker_id = wp.user_id AND a.status = 'completed'
  );
$$;
