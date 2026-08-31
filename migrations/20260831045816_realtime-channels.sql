-- ============================================================
-- SHRAMSETU — REALTIME CHANNELS
-- Per-user notification channel + live jobs feed.
-- RLS restricts subscription to the channel owner.
-- ============================================================

INSERT INTO realtime.channels (pattern, description, enabled)
VALUES
  ('user:%', 'Per-user events (notifications, application status, payments)', true),
  ('jobs:%', 'Public job feed (new jobs, status changes)', true)
ON CONFLICT (pattern) DO UPDATE
SET description = EXCLUDED.description, enabled = EXCLUDED.enabled;

-- ---------- user channel triggers ----------
-- notifications → user channel
CREATE OR REPLACE FUNCTION public.rtc_notify_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  PERFORM realtime.publish(
    'user:' || NEW.user_id::text,
    'notification',
    jsonb_build_object('id', NEW.id, 'type', NEW.type, 'title', NEW.title, 'message', NEW.message, 'link', NEW.link)
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER notifications_rtc
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.rtc_notify_notification();

-- application status → worker's channel
CREATE OR REPLACE FUNCTION public.rtc_application_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM realtime.publish(
      'user:' || NEW.worker_id::text,
      'application_status',
      jsonb_build_object('id', NEW.id, 'job_id', NEW.job_id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER applications_rtc
  AFTER UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.rtc_application_status();

-- payment status → worker's channel
CREATE OR REPLACE FUNCTION public.rtc_payment_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM realtime.publish(
      'user:' || NEW.worker_id::text,
      'payment_status',
      jsonb_build_object('id', NEW.id, 'status', NEW.status, 'amount', NEW.amount)
    );
    PERFORM realtime.publish(
      'user:' || NEW.contractor_id::text,
      'payment_status',
      jsonb_build_object('id', NEW.id, 'status', NEW.status, 'amount', NEW.amount)
    );
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER payments_rtc
  AFTER UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.rtc_payment_status();

-- trust score → user channel
CREATE OR REPLACE FUNCTION public.rtc_trust_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF OLD.trust_score IS DISTINCT FROM NEW.trust_score THEN
    PERFORM realtime.publish(
      'user:' || NEW.user_id::text,
      'trust_score',
      jsonb_build_object('score', NEW.trust_score, 'label', NEW.trust_label)
    );
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER worker_trust_rtc
  AFTER UPDATE ON public.worker_profiles
  FOR EACH ROW EXECUTE FUNCTION public.rtc_trust_change();

-- jobs feed (insert + status change), published to per-city jobs channel
CREATE OR REPLACE FUNCTION public.rtc_jobs_feed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM realtime.publish(
      'jobs:' || COALESCE(NEW.location, 'all'),
      'job_change',
      jsonb_build_object('id', NEW.id, 'title', NEW.title, 'status', NEW.status, 'location', NEW.location)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER jobs_rtc_insert
  AFTER INSERT ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.rtc_jobs_feed();

CREATE TRIGGER jobs_rtc_update
  AFTER UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.rtc_jobs_feed();

-- ---------- channel access control ----------
-- A user may only subscribe to their own user: channel + any jobs: channel.
-- Subscription authorization = SELECT policy on realtime.channels (doc pattern).
ALTER TABLE realtime.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_own_channel ON realtime.channels
  FOR SELECT TO authenticated
  USING (
    realtime.channel_name() LIKE 'user:' || (SELECT auth.uid())::text || '%'
    OR realtime.channel_name() LIKE 'jobs:%'
  );

-- App events are published ONLY by database triggers (SECURITY DEFINER, admin
-- role). Client SQL publish is denied — server-authoritative events.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY no_client_publish ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (false);
