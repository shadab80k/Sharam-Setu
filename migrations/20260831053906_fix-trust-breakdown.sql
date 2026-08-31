-- ============================================================
-- SHRAMSETU — FIX worker_trust_breakdown section 2
-- The experience_years lookup referenced an undefined `wp` alias.
-- ============================================================

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
    (SELECT COALESCE(wp.experience_years, 0) FROM public.worker_profiles wp WHERE wp.user_id = p_user_id)
  INTO verified_jobs, completed_apps, exp_years;
  work_points := LEAST(10, verified_jobs * 2) + LEAST(5, completed_apps) + LEAST(5, FLOOR(exp_years / 2.0));
  work_points := LEAST(20, work_points);
  breakdown := breakdown || jsonb_build_object(
    'category', 'Work History', 'points', work_points, 'max', 20,
    'reason', verified_jobs || ' verified jobs · ' || completed_apps || ' completed · ' || exp_years || ' yrs experience');

  -- 3. Skills (20)
  SELECT
    COUNT(*),
    COALESCE(AVG(a.score), 0)
  INTO user_assessments, avg_score
  FROM public.assessments a WHERE a.worker_id = p_user_id;
  SELECT
    COALESCE(array_length(wp.certifications, 1), 0),
    COALESCE(array_length(wp.skills, 1), 0)
  INTO cert_count, skill_count
  FROM public.worker_profiles wp WHERE wp.user_id = p_user_id;
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
