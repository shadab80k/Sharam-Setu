-- ============================================================
-- SHRAMSETU — TRUST ENGINE (server-authoritative)
-- Exact port of lib/services/trustEngine.ts (100-point algorithm).
-- Score is computed in DB; clients can never write it.
-- Triggers keep trust scores in sync automatically on state changes.
-- ============================================================

-- ---------- helpers ----------
CREATE OR REPLACE FUNCTION public.trust_label(p_score INTEGER)
RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_score >= 90 THEN 'Excellent Trust'
    WHEN p_score >= 75 THEN 'High Trust'
    WHEN p_score >= 60 THEN 'Trusted'
    WHEN p_score >= 40 THEN 'Building Trust'
    ELSE 'Low Trust'
  END
$$;

-- Profile completion: deterministic 100-point measure of profile quality.
CREATE OR REPLACE FUNCTION public.compute_profile_completion(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT LEAST(100, GREATEST(0,
    (CASE WHEN COALESCE(u.avatar, wp.avatar_url) <> '' THEN 10 ELSE 0 END)
    + (CASE WHEN length(wp.bio) >= 20 THEN 10 ELSE 0 END)
    + LEAST(15, COALESCE(array_length(wp.skills, 1), 0) * 5)
    + (CASE WHEN COALESCE(array_length(wp.certifications, 1), 0) >= 1 THEN 10 ELSE 0 END)
    + (CASE WHEN COALESCE(array_length(wp.languages, 1), 0) >= 1 THEN 10 ELSE 0 END)
    + (CASE WHEN wp.experience_years > 0 THEN 5 ELSE 0 END)
    + (CASE WHEN wp.expected_daily_wage > 0 THEN 10 ELSE 0 END)
    + (CASE WHEN EXISTS (SELECT 1 FROM public.work_history wh WHERE wh.worker_id = p_user_id) THEN 10 ELSE 0 END)
    + (CASE WHEN EXISTS (SELECT 1 FROM public.verifications v
                          WHERE v.user_id = p_user_id AND v.type = 'phone' AND v.status = 'verified')
            THEN 10 ELSE 0 END)
    + (CASE WHEN EXISTS (SELECT 1 FROM public.verifications v
                          WHERE v.user_id = p_user_id AND v.type = 'email' AND v.status = 'verified')
            THEN 10 ELSE 0 END)
  ))
  FROM public.users u
  JOIN public.worker_profiles wp ON wp.user_id = u.id
  WHERE u.id = p_user_id
$$;

-- ---------- WORKER TRUST BREAKDOWN (readable by UI) ----------
CREATE OR REPLACE FUNCTION public.worker_trust_breakdown(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  breakdown JSONB := '[]'::jsonb;
  identity_points INTEGER := 0;
  work_points INTEGER := 0;
  skills_points INTEGER := 0;
  reputation_points INTEGER := 0;
  reliability_points INTEGER := 0;
  v_phone BOOLEAN; v_email BOOLEAN; completion INTEGER;
  verified_jobs INTEGER; completed_apps INTEGER; exp_years INTEGER;
  user_assessments INTEGER; avg_score NUMERIC; cert_count INTEGER; skill_count INTEGER;
  profile_rating NUMERIC; positive_reviews INTEGER; repeat_contractors INTEGER;
  total_apps INTEGER; completed_apps_r INTEGER; overdue_count INTEGER;
  report_count INTEGER; fraud_count INTEGER; completion_rate NUMERIC;
  raw INTEGER; u_role TEXT;
BEGIN
  SELECT u.role INTO u_role FROM public.users u WHERE u.id = p_user_id;
  IF u_role IS NULL OR u_role <> 'worker' THEN
    RETURN '[]'::jsonb;
  END IF;

  -- 1. Identity & account (20)
  SELECT
    EXISTS (SELECT 1 FROM public.verifications v WHERE v.user_id = p_user_id AND v.type = 'phone' AND v.status = 'verified'),
    EXISTS (SELECT 1 FROM public.verifications v WHERE v.user_id = p_user_id AND v.type = 'email' AND v.status = 'verified')
  INTO v_phone, v_email;
  completion := public.compute_profile_completion(p_user_id);
  IF v_phone THEN identity_points := identity_points + 10; END IF;
  IF v_email THEN identity_points := identity_points + 5; END IF;
  identity_points := identity_points + ROUND(completion / 100.0 * 5);
  identity_points := LEAST(20, identity_points);
  breakdown := breakdown || jsonb_build_object(
    'category', 'Identity & Account', 'points', identity_points, 'max', 20,
    'reason', CASE WHEN v_phone THEN 'Phone verified' ELSE 'Phone not verified' END || ' · ' ||
              CASE WHEN v_email THEN 'Email verified' ELSE 'Email not verified' END || ' · ' ||
              completion || '% complete');

  -- 2. Work history (20)
  SELECT
    (SELECT COUNT(*) FROM public.work_history w WHERE w.worker_id = p_user_id AND w.verified),
    (SELECT COUNT(*) FROM public.applications a WHERE a.worker_id = p_user_id AND a.status = 'completed'),
    COALESCE(wp.experience_years, 0)
  INTO verified_jobs, completed_apps, exp_years;
  work_points := LEAST(10, verified_jobs * 2) + LEAST(5, completed_apps) + LEAST(5, FLOOR(exp_years / 2.0));
  work_points := LEAST(20, work_points);
  breakdown := breakdown || jsonb_build_object(
    'category', 'Work History', 'points', work_points, 'max', 20,
    'reason', verified_jobs || ' verified jobs · ' || completed_apps || ' completed · ' || exp_years || ' yrs experience');

  -- 3. Skills (20)
  SELECT
    COUNT(*),
    COALESCE(AVG(a.score), 0),
    (SELECT COALESCE(array_length(wp.certifications, 1), 0) FROM public.worker_profiles wp WHERE wp.user_id = p_user_id),
    (SELECT COALESCE(array_length(wp.skills, 1), 0) FROM public.worker_profiles wp WHERE wp.user_id = p_user_id)
  INTO user_assessments, avg_score, cert_count, skill_count
  FROM public.assessments a WHERE a.worker_id = p_user_id;
  skills_points := LEAST(20,
    CASE WHEN user_assessments > 0 THEN ROUND(avg_score / 100.0 * 10) ELSE 0 END
    + LEAST(5, cert_count)
    + GREATEST(0, LEAST(5, skill_count - 1)));
  breakdown := breakdown || jsonb_build_object(
    'category', 'Skills', 'points', skills_points, 'max', 20,
    'reason', user_assessments || ' assessment(s) · ' || cert_count || ' certification(s) · ' || skill_count || ' skill(s)');

  -- 4. Reputation (20)
  SELECT COALESCE(wp.rating, 0) INTO profile_rating
    FROM public.worker_profiles wp WHERE wp.user_id = p_user_id;
  SELECT
    (SELECT COUNT(*) FROM public.work_history w WHERE w.worker_id = p_user_id AND w.rating >= 4),
    (SELECT COUNT(DISTINCT w.contractor_id) FROM public.work_history w WHERE w.worker_id = p_user_id)
  INTO positive_reviews, repeat_contractors;
  reputation_points := LEAST(20,
    ROUND(profile_rating / 5.0 * 10) + LEAST(5, positive_reviews) + LEAST(5, repeat_contractors));
  breakdown := breakdown || jsonb_build_object(
    'category', 'Reputation', 'points', reputation_points, 'max', 20,
    'reason', 'Rating ' || ROUND(profile_rating, 1) || '/5 · ' || positive_reviews || ' positive · ' || repeat_contractors || ' repeat contractor(s)');

  -- 5. Reliability & safety (20)
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE a.status = 'completed')
  INTO total_apps, completed_apps_r
  FROM public.applications a WHERE a.worker_id = p_user_id;
  completion_rate := CASE WHEN total_apps > 0 THEN completed_apps_r::numeric / total_apps ELSE 0.7 END;
  SELECT COUNT(*) INTO overdue_count FROM public.payments p
    WHERE p.worker_id = p_user_id AND p.status = 'overdue';
  SELECT
    (SELECT COUNT(*) FROM public.safety_reports r
      WHERE r.reporter_id = p_user_id AND r.status <> 'dismissed'),
    (SELECT COUNT(*) FROM public.fraud_signals f
      WHERE f.user_id = p_user_id AND f.resolved = false)
  INTO report_count, fraud_count;
  reliability_points := LEAST(20,
    ROUND(completion_rate * 8)
    + GREATEST(0, 5 - overdue_count)
    + GREATEST(0, 7 - report_count * 2 - fraud_count * 3));
  breakdown := breakdown || jsonb_build_object(
    'category', 'Reliability & Safety', 'points', reliability_points, 'max', 20,
    'reason', ROUND(completion_rate * 100) || '% completion · ' || overdue_count || ' overdue · ' ||
              (report_count + fraud_count) || ' safety/fraud signal(s)');

  raw := identity_points + work_points + skills_points + reputation_points + reliability_points;
  RETURN jsonb_build_object(
    'score', LEAST(100, GREATEST(0, raw)),
    'label', public.trust_label(LEAST(100, GREATEST(0, raw))),
    'breakdown', breakdown
  );
END $$;

-- ---------- CONTRACTOR TRUST BREAKDOWN ----------
CREATE OR REPLACE FUNCTION public.contractor_trust_breakdown(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  breakdown JSONB := '[]'::jsonb;
  verified_count INTEGER; completed_jobs INTEGER;
  total_pay INTEGER; paid_pay INTEGER; complaints INTEGER;
  reliability INTEGER; u_role TEXT;
  raw INTEGER;
BEGIN
  SELECT u.role INTO u_role FROM public.users u WHERE u.id = p_user_id;
  IF u_role IS NULL OR u_role <> 'contractor' THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COUNT(*) INTO verified_count FROM public.verifications v
    WHERE v.user_id = p_user_id AND v.status = 'verified';
  breakdown := breakdown || jsonb_build_object(
    'category', 'Profile Verification', 'points', LEAST(20, verified_count * 3), 'max', 20,
    'reason', verified_count || ' verifications');

  SELECT COUNT(*) INTO completed_jobs FROM public.jobs j
    WHERE j.contractor_id = p_user_id AND j.status = 'completed';
  breakdown := breakdown || jsonb_build_object(
    'category', 'Completed Jobs', 'points', LEAST(20, completed_jobs * 2), 'max', 20,
    'reason', completed_jobs || ' jobs completed');

  SELECT COUNT(*), COUNT(*) FILTER (WHERE p.status = 'paid') INTO total_pay, paid_pay
    FROM public.payments p WHERE p.contractor_id = p_user_id;
  reliability := CASE WHEN total_pay > 0 THEN ROUND(paid_pay::numeric / total_pay * 20) ELSE 12 END;
  breakdown := breakdown || jsonb_build_object(
    'category', 'Payment Reliability', 'points', reliability, 'max', 20,
    'reason', paid_pay || '/' || total_pay || ' paid on time');

  SELECT COUNT(*) INTO complaints FROM public.safety_reports r
    WHERE r.target_user_id = p_user_id;
  breakdown := breakdown || jsonb_build_object(
    'category', 'Safety Record', 'points', GREATEST(0, 20 - complaints * 4), 'max', 20,
    'reason', complaints || ' complaint(s)');

  breakdown := breakdown || jsonb_build_object(
    'category', 'Response Rate', 'points', 15, 'max', 20,
    'reason', '~85% response rate');

  raw := LEAST(20, verified_count * 3) + LEAST(20, completed_jobs * 2) + reliability
         + GREATEST(0, 20 - complaints * 4) + 15;
  RETURN jsonb_build_object(
    'score', LEAST(100, GREATEST(0, raw)),
    'label', public.trust_label(LEAST(100, GREATEST(0, raw))),
    'breakdown', breakdown
  );
END $$;

-- ---------- RECALC (writes profile + logs trust events) ----------
CREATE OR REPLACE FUNCTION public.recalc_user_trust(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  result JSONB; u_role TEXT; old_score INTEGER; new_score INTEGER;
  label TEXT;
BEGIN
  SELECT u.role INTO u_role FROM public.users u WHERE u.id = p_user_id;
  IF u_role IS NULL THEN RETURN NULL; END IF;

  IF u_role = 'worker' THEN
    result := public.worker_trust_breakdown(p_user_id);
    SELECT wp.trust_score INTO old_score FROM public.worker_profiles wp WHERE wp.user_id = p_user_id;
    new_score := (result->>'score')::INTEGER;
    label := result->>'label';
    UPDATE public.worker_profiles
      SET trust_score = new_score, trust_label = label,
          profile_completion = public.compute_profile_completion(p_user_id)
      WHERE user_id = p_user_id;
  ELSE
    result := public.contractor_trust_breakdown(p_user_id);
    SELECT cp.trust_score INTO old_score FROM public.contractor_profiles cp WHERE cp.user_id = p_user_id;
    new_score := (result->>'score')::INTEGER;
    label := result->>'label';
    UPDATE public.contractor_profiles
      SET trust_score = new_score, trust_label = label
      WHERE user_id = p_user_id;
  END IF;

  IF old_score IS NOT NULL AND COALESCE(new_score, 0) IS DISTINCT FROM old_score THEN
    INSERT INTO public.trust_events (user_id, category, points, reason)
    VALUES (p_user_id, 'Trust Recalculation', new_score,
            'Score updated from ' || COALESCE(old_score, 0) || ' to ' || new_score);
  END IF;

  RETURN result;
END $$;

-- ---------- RATING (derived from reviews) ----------
CREATE OR REPLACE FUNCTION public.recalc_user_rating(p_user_id UUID)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  UPDATE public.worker_profiles wp
    SET rating = COALESCE(sub.avg_rating, wp.rating)
    FROM (SELECT reviewee_id, ROUND(AVG(rating)::numeric, 2) AS avg_rating
          FROM public.reviews WHERE reviewee_id = p_user_id GROUP BY reviewee_id) sub
    WHERE wp.user_id = sub.reviewee_id AND wp.user_id = p_user_id;
  UPDATE public.contractor_profiles cp
    SET rating = COALESCE(sub.avg_rating, cp.rating)
    FROM (SELECT reviewee_id, ROUND(AVG(rating)::numeric, 2) AS avg_rating
          FROM public.reviews WHERE reviewee_id = p_user_id GROUP BY reviewee_id) sub
    WHERE cp.user_id = sub.reviewee_id AND cp.user_id = p_user_id;
$$;

-- ---------- ATOMIC BUSINESS OPERATIONS (called by BFF via rpc) ----------

-- HIRE: application → selected, increment workers_hired, notify worker.
CREATE OR REPLACE FUNCTION public.hire_applicant(p_application_id UUID, p_actor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  app RECORD; job RECORD; actor_role TEXT; job_title TEXT;
BEGIN
  SELECT a.* INTO app FROM public.applications a WHERE a.id = p_application_id
    FOR UPDATE OF a;
  IF app.id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;
  SELECT u.role INTO actor_role FROM public.users u WHERE u.id = p_actor_id;
  SELECT j.* INTO job FROM public.jobs j WHERE j.id = app.job_id FOR UPDATE OF j;
  IF actor_role <> 'admin' AND job.contractor_id <> p_actor_id THEN
    RAISE EXCEPTION 'Only the job owner can hire';
  END IF;
  IF app.status NOT IN ('applied', 'viewed', 'shortlisted', 'interview') THEN
    RAISE EXCEPTION 'Application is not hireable (status: %)', app.status;
  END IF;
  IF job.status <> 'active' THEN
    RAISE EXCEPTION 'Job is not active';
  END IF;
  IF job.workers_hired >= job.workers_needed THEN
    RAISE EXCEPTION 'Job is fully staffed';
  END IF;

  UPDATE public.applications SET status = 'selected', updated_at = NOW() WHERE id = app.id;
  UPDATE public.jobs SET workers_hired = workers_hired + 1 WHERE id = job.id;

  SELECT title INTO job_title FROM public.jobs WHERE id = job.id;
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (app.worker_id, 'application', 'You are hired!',
          'Congratulations! You were selected for ' || job_title || '.', '/worker/applications');

  PERFORM public.recalc_user_trust(app.worker_id);

  RETURN jsonb_build_object('ok', true, 'application_id', app.id, 'job_id', job.id);
END $$;

-- MARK PAID: contractor side.
CREATE OR REPLACE FUNCTION public.mark_payment_paid(p_payment_id UUID, p_actor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  pay RECORD; actor_role TEXT;
BEGIN
  SELECT p.* INTO pay FROM public.payments p WHERE p.id = p_payment_id FOR UPDATE OF p;
  IF pay.id IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
  SELECT u.role INTO actor_role FROM public.users u WHERE u.id = p_actor_id;
  IF actor_role <> 'admin' AND pay.contractor_id <> p_actor_id THEN
    RAISE EXCEPTION 'Only the paying contractor can mark paid';
  END IF;
  IF pay.status = 'paid' THEN RAISE EXCEPTION 'Payment already paid'; END IF;

  UPDATE public.payments
    SET status = 'paid', paid_date = NOW(), updated_at = NOW()
    WHERE id = pay.id;

  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (pay.worker_id, 'payment', 'Payment received',
          '₹' || pay.amount || ' received from contractor.', '/worker/income');

  PERFORM public.recalc_user_trust(pay.worker_id);
  PERFORM public.recalc_user_trust(pay.contractor_id);

  RETURN jsonb_build_object('ok', true, 'payment_id', pay.id);
END $$;

-- MARK RECEIVED: worker confirmation.
CREATE OR REPLACE FUNCTION public.mark_payment_received(p_payment_id UUID, p_actor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  pay RECORD;
BEGIN
  SELECT p.* INTO pay FROM public.payments p WHERE p.id = p_payment_id FOR UPDATE OF p;
  IF pay.id IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF pay.worker_id <> p_actor_id THEN
    RAISE EXCEPTION 'Only the receiving worker can confirm';
  END IF;
  IF pay.status = 'paid' THEN RAISE EXCEPTION 'Payment already confirmed'; END IF;

  UPDATE public.payments
    SET status = 'paid', paid_date = NOW(), updated_at = NOW()
    WHERE id = pay.id;

  PERFORM public.recalc_user_trust(pay.worker_id);
  PERFORM public.recalc_user_trust(pay.contractor_id);

  RETURN jsonb_build_object('ok', true, 'payment_id', pay.id);
END $$;

-- ESCROW SWEEP: pending → due → overdue (+notifications). Run daily by cron.
CREATE OR REPLACE FUNCTION public.sweep_due_payments()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  swept INTEGER := 0; r RECORD;
BEGIN
  FOR r IN SELECT * FROM public.payments
            WHERE status IN ('pending', 'due')
              AND ((status = 'pending' AND due_date <= NOW())
                OR (status = 'due' AND due_date < NOW() - INTERVAL '3 days'))
            FOR UPDATE SKIP LOCKED
  LOOP
    IF r.status = 'pending' THEN
      UPDATE public.payments SET status = 'due', updated_at = NOW() WHERE id = r.id;
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (r.worker_id, 'payment', 'Payment due',
              '₹' || r.amount || ' is now due from contractor.', '/worker/income');
    ELSE
      UPDATE public.payments SET status = 'overdue', updated_at = NOW() WHERE id = r.id;
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (r.worker_id, 'payment', 'Payment overdue',
              '₹' || r.amount || ' is OVERDUE. Escrow protection active.', '/worker/income');
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (r.contractor_id, 'payment', 'Escrow alert',
              'Payment of ₹' || r.amount || ' is overdue and flagged.', '/contractor/payments');
    END IF;
    swept := swept + 1;
  END LOOP;
  RETURN swept;
END $$;

-- ---------- APPLICATION STATUS TRANSITION GUARD ----------
CREATE OR REPLACE FUNCTION public.guard_application_status()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  legal BOOLEAN;
BEGIN
  legal := CASE
    WHEN OLD.status = 'applied'    AND NEW.status IN ('viewed','shortlisted','interview','selected','rejected') THEN true
    WHEN OLD.status = 'viewed'     AND NEW.status IN ('shortlisted','interview','selected','rejected') THEN true
    WHEN OLD.status = 'shortlisted' AND NEW.status IN ('interview','selected','rejected') THEN true
    WHEN OLD.status = 'interview'  AND NEW.status IN ('selected','rejected') THEN true
    WHEN OLD.status = 'selected'   AND NEW.status = 'completed' THEN true
    ELSE false
  END;
  IF NOT legal THEN
    RAISE EXCEPTION 'Illegal application transition: % -> %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER applications_status_guard
  BEFORE UPDATE OF status ON public.applications
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.guard_application_status();

-- ---------- JOB STATUS TRANSITION GUARD ----------
CREATE OR REPLACE FUNCTION public.guard_job_status()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  legal BOOLEAN;
BEGIN
  legal := CASE
    WHEN OLD.status = 'draft'     AND NEW.status IN ('active','closed') THEN true
    WHEN OLD.status = 'active'    AND NEW.status IN ('completed','closed') THEN true
    WHEN OLD.status = 'completed' AND NEW.status = 'closed' THEN true
    WHEN OLD.status IS NOT DISTINCT FROM NEW.status THEN true
    ELSE false
  END;
  IF NOT legal THEN
    RAISE EXCEPTION 'Illegal job transition: % -> %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER jobs_status_guard
  BEFORE UPDATE OF status ON public.jobs
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.guard_job_status();

-- ---------- AUTO TRUST RECALC TRIGGERS ----------
-- verifications affect identity/contractor verification
CREATE OR REPLACE FUNCTION public.trg_recalc_after_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  PERFORM public.recalc_user_trust(COALESCE(NEW.user_id, OLD.user_id));
  RETURN NULL;
END; $$;
CREATE TRIGGER verifications_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.verifications
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_after_verification();

-- assessments affect skills
CREATE OR REPLACE FUNCTION public.trg_recalc_after_assessment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  PERFORM public.recalc_user_trust(COALESCE(NEW.worker_id, OLD.worker_id));
  RETURN NULL;
END; $$;
CREATE TRIGGER assessments_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_after_assessment();

-- work history affects work points
CREATE OR REPLACE FUNCTION public.trg_recalc_after_work_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  PERFORM public.recalc_user_trust(COALESCE(NEW.worker_id, OLD.worker_id));
  RETURN NULL;
END; $$;
CREATE TRIGGER work_history_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.work_history
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_after_work_history();

-- application status affects completion rate
CREATE OR REPLACE FUNCTION public.trg_recalc_after_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NULL;
  END IF;
  PERFORM public.recalc_user_trust(COALESCE(NEW.worker_id, OLD.worker_id));
  RETURN NULL;
END; $$;
CREATE TRIGGER applications_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_after_application();

-- payment status affects reliability (worker + contractor)
CREATE OR REPLACE FUNCTION public.trg_recalc_after_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NULL;
  END IF;
  PERFORM public.recalc_user_trust(COALESCE(NEW.worker_id, OLD.worker_id));
  PERFORM public.recalc_user_trust(COALESCE(NEW.contractor_id, OLD.contractor_id));
  RETURN NULL;
END; $$;
CREATE TRIGGER payments_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_after_payment();

-- safety reports affect reliability (reporter) + contractor safety record (target)
CREATE OR REPLACE FUNCTION public.trg_recalc_after_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF COALESCE(NEW.reporter_id, OLD.reporter_id) IS NOT NULL THEN
    PERFORM public.recalc_user_trust(COALESCE(NEW.reporter_id, OLD.reporter_id));
  END IF;
  IF COALESCE(NEW.target_user_id, OLD.target_user_id) IS NOT NULL THEN
    PERFORM public.recalc_user_trust(COALESCE(NEW.target_user_id, OLD.target_user_id));
    UPDATE public.contractor_profiles cp
      SET complaint_count = (SELECT COUNT(*) FROM public.safety_reports r WHERE r.target_user_id = cp.user_id)
      WHERE cp.user_id = COALESCE(NEW.target_user_id, OLD.target_user_id);
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER safety_reports_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.safety_reports
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_after_report();

-- fraud signals affect reliability
CREATE OR REPLACE FUNCTION public.trg_recalc_after_fraud()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  PERFORM public.recalc_user_trust(COALESCE(NEW.user_id, OLD.user_id));
  RETURN NULL;
END; $$;
CREATE TRIGGER fraud_signals_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.fraud_signals
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_after_fraud();

-- reviews → rating + trust
CREATE OR REPLACE FUNCTION public.trg_after_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  PERFORM public.recalc_user_rating(COALESCE(NEW.reviewee_id, OLD.reviewee_id));
  PERFORM public.recalc_user_trust(COALESCE(NEW.reviewee_id, OLD.reviewee_id));
  RETURN NULL;
END; $$;
CREATE TRIGGER reviews_recalc
  AFTER INSERT OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.trg_after_review();
