-- ============================================================
-- SHRAMSETU — CORE SCHEMA
-- All tables in `public`. User identity via auth.users(id).
-- Write access is BFF-only (service key); client SDK is read-only.
-- ============================================================

-- ---------- APP USERS (mirror of auth.users) ----------
CREATE TABLE public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('worker', 'contractor', 'admin')),
  name        TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL,
  phone       TEXT,
  avatar      TEXT,
  location    TEXT NOT NULL DEFAULT 'lucknow', -- city id from lib/utils/cities.ts
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX users_email_key ON public.users (lower(email));
CREATE INDEX users_role_idx ON public.users (role) WHERE status = 'active';
CREATE INDEX users_location_idx ON public.users (location);

-- ---------- WORKER PROFILES ----------
CREATE TABLE public.worker_profiles (
  user_id              UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  profession           TEXT NOT NULL DEFAULT 'Helper',
  experience_years     INTEGER NOT NULL DEFAULT 0 CHECK (experience_years BETWEEN 0 AND 60),
  expected_daily_wage  INTEGER NOT NULL DEFAULT 0 CHECK (expected_daily_wage >= 0),
  availability         TEXT NOT NULL DEFAULT 'available'
                       CHECK (availability IN ('available', 'working', 'unavailable')),
  bio                  TEXT NOT NULL DEFAULT '',
  profile_completion   INTEGER NOT NULL DEFAULT 0 CHECK (profile_completion BETWEEN 0 AND 100),
  preferred_radius_km  INTEGER NOT NULL DEFAULT 10 CHECK (preferred_radius_km > 0),
  languages            TEXT[] NOT NULL DEFAULT '{}',
  skills               TEXT[] NOT NULL DEFAULT '{}',
  trust_score          INTEGER NOT NULL DEFAULT 0 CHECK (trust_score BETWEEN 0 AND 100),
  trust_label          TEXT NOT NULL DEFAULT 'Low Trust',
  rating               NUMERIC(3,2) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  completed_jobs       INTEGER NOT NULL DEFAULT 0 CHECK (completed_jobs >= 0),
  certifications       TEXT[] NOT NULL DEFAULT '{}',
  avatar_url           TEXT,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX worker_profiles_profession_idx ON public.worker_profiles (profession);
CREATE INDEX worker_profiles_availability_idx ON public.worker_profiles (availability);
CREATE INDEX worker_profiles_trust_idx ON public.worker_profiles (trust_score DESC);
CREATE INDEX worker_profiles_wage_idx ON public.worker_profiles (expected_daily_wage);

-- ---------- CONTRACTOR PROFILES ----------
CREATE TABLE public.contractor_profiles (
  user_id             UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  company_name        TEXT NOT NULL DEFAULT '',
  business_type       TEXT NOT NULL DEFAULT 'Residential',
  location            TEXT NOT NULL DEFAULT 'lucknow',
  trust_score         INTEGER NOT NULL DEFAULT 0 CHECK (trust_score BETWEEN 0 AND 100),
  trust_label         TEXT NOT NULL DEFAULT 'Low Trust',
  rating              NUMERIC(3,2) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  payment_reliability INTEGER NOT NULL DEFAULT 0 CHECK (payment_reliability BETWEEN 0 AND 100),
  completed_jobs      INTEGER NOT NULL DEFAULT 0 CHECK (completed_jobs >= 0),
  response_rate       INTEGER NOT NULL DEFAULT 0 CHECK (response_rate BETWEEN 0 AND 100),
  complaint_count     INTEGER NOT NULL DEFAULT 0 CHECK (complaint_count >= 0),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX contractor_profiles_trust_idx ON public.contractor_profiles (trust_score DESC);

-- ---------- SKILLS LIBRARY ----------
CREATE TABLE public.skills (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'General'
);

-- ---------- JOBS ----------
CREATE TABLE public.jobs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  category           TEXT NOT NULL,
  description        TEXT NOT NULL DEFAULT '',
  location           TEXT NOT NULL, -- city id
  latitude           NUMERIC(9,6) NOT NULL DEFAULT 0,
  longitude          NUMERIC(9,6) NOT NULL DEFAULT 0,
  wage_per_day       INTEGER NOT NULL CHECK (wage_per_day > 0),
  start_date         TIMESTAMPTZ NOT NULL,
  end_date           TIMESTAMPTZ NOT NULL,
  workers_needed     INTEGER NOT NULL CHECK (workers_needed > 0),
  workers_hired      INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'draft', 'completed', 'closed')),
  required_skills    TEXT[] NOT NULL DEFAULT '{}',
  payment_frequency  TEXT NOT NULL DEFAULT 'daily'
                     CHECK (payment_frequency IN ('daily', 'weekly', 'on-completion')),
  safety_notes       TEXT NOT NULL DEFAULT '',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT jobs_hired_lte_needed CHECK (workers_hired <= workers_needed)
);

CREATE INDEX jobs_status_idx ON public.jobs (status);
CREATE INDEX jobs_location_idx ON public.jobs (location, status);
CREATE INDEX jobs_contractor_idx ON public.jobs (contractor_id);
CREATE INDEX jobs_wage_idx ON public.jobs (wage_per_day);
CREATE INDEX jobs_category_idx ON public.jobs (category);
CREATE INDEX jobs_created_idx ON public.jobs (created_at DESC);

-- ---------- APPLICATIONS ----------
CREATE TABLE public.applications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id         UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  worker_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  match_score    INTEGER NOT NULL DEFAULT 0 CHECK (match_score BETWEEN 0 AND 100),
  status         TEXT NOT NULL DEFAULT 'applied'
                 CHECK (status IN ('applied', 'viewed', 'shortlisted', 'interview', 'selected', 'rejected', 'completed')),
  applied_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  match_reasons  TEXT[] NOT NULL DEFAULT '{}',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT applications_unique_job_worker UNIQUE (job_id, worker_id)
);

CREATE INDEX applications_job_idx ON public.applications (job_id);
CREATE INDEX applications_worker_idx ON public.applications (worker_id, status);
CREATE INDEX applications_status_idx ON public.applications (status);

-- ---------- PAYMENTS (wage ledger + escrow states) ----------
CREATE TABLE public.payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id         UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  worker_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  contractor_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount         INTEGER NOT NULL CHECK (amount > 0),
  due_date       TIMESTAMPTZ NOT NULL,
  paid_date      TIMESTAMPTZ,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'due', 'paid', 'overdue')),
  method         TEXT NOT NULL DEFAULT 'UPI',
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX payments_worker_idx ON public.payments (worker_id, status);
CREATE INDEX payments_contractor_idx ON public.payments (contractor_id, status);
CREATE INDEX payments_job_idx ON public.payments (job_id);
CREATE INDEX payments_status_due_idx ON public.payments (status, due_date);
CREATE INDEX payments_created_idx ON public.payments (created_at DESC);

-- ---------- EXPENSES (worker micro-ledger) ----------
CREATE TABLE public.expenses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category   TEXT NOT NULL CHECK (category IN ('food', 'transport', 'rent', 'family', 'tools', 'medical', 'other')),
  amount     INTEGER NOT NULL CHECK (amount > 0),
  date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX expenses_worker_idx ON public.expenses (worker_id, date DESC);

-- ---------- SAVINGS GOALS ----------
CREATE TABLE public.savings_goals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  target_amount  INTEGER NOT NULL CHECK (target_amount > 0),
  current_amount INTEGER NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  target_date    TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX savings_goals_worker_idx ON public.savings_goals (worker_id);

-- ---------- REVIEWS ----------
CREATE TABLE public.reviews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reviewee_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id       UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT NOT NULL DEFAULT '',
  reliability  INTEGER NOT NULL DEFAULT 3 CHECK (reliability BETWEEN 1 AND 5),
  skill        INTEGER NOT NULL DEFAULT 3 CHECK (skill BETWEEN 1 AND 5),
  safety       INTEGER NOT NULL DEFAULT 3 CHECK (safety BETWEEN 1 AND 5),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reviews_no_self CHECK (reviewer_id <> reviewee_id)
);

CREATE INDEX reviews_reviewee_idx ON public.reviews (reviewee_id, created_at DESC);
CREATE INDEX reviews_reviewer_idx ON public.reviews (reviewer_id);

-- ---------- VERIFICATIONS (KYC) ----------
CREATE TABLE public.verifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('phone', 'email', 'identity', 'skill', 'work-history', 'address')),
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('verified', 'pending', 'rejected', 'not-started')),
  score       INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT verifications_unique_user_type UNIQUE (user_id, type)
);

CREATE INDEX verifications_user_idx ON public.verifications (user_id, status);

-- ---------- TRUST SCORE EVENTS (append-only audit) ----------
CREATE TABLE public.trust_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category   TEXT NOT NULL,
  points     INTEGER NOT NULL,
  reason     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX trust_events_user_idx ON public.trust_events (user_id, created_at DESC);

-- ---------- NOTIFICATIONS ----------
CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('job', 'payment', 'trust', 'verification', 'application', 'safety', 'ai', 'system')),
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  read       BOOLEAN NOT NULL DEFAULT false,
  link       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_unread_idx ON public.notifications (user_id) WHERE read = false;

-- ---------- SAFETY REPORTS (disputes/grievances) ----------
CREATE TABLE public.safety_reports (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  job_id         UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  category       TEXT NOT NULL CHECK (category IN ('unsafe-workplace', 'payment-dispute', 'fake-job', 'fake-worker', 'harassment', 'fraud', 'other')),
  severity       TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description    TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  resolution     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX safety_reports_status_idx ON public.safety_reports (status, created_at DESC);
CREATE INDEX safety_reports_target_idx ON public.safety_reports (target_user_id);

-- ---------- FRAUD SIGNALS ----------
CREATE TABLE public.fraud_signals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  severity     TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description  TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX fraud_signals_user_idx ON public.fraud_signals (user_id, resolved);

-- ---------- SKILL ASSESSMENTS ----------
CREATE TABLE public.assessments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  skill_name   TEXT NOT NULL,
  score        INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  level        TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX assessments_worker_idx ON public.assessments (worker_id, completed_at DESC);

-- ---------- WORK HISTORY ----------
CREATE TABLE public.work_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id        UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  role          TEXT NOT NULL,
  start_date    TIMESTAMPTZ NOT NULL,
  end_date      TIMESTAMPTZ,
  verified      BOOLEAN NOT NULL DEFAULT false,
  rating        INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX work_history_worker_idx ON public.work_history (worker_id, start_date DESC);
CREATE INDEX work_history_contractor_idx ON public.work_history (contractor_id);

-- ---------- SAVED JOBS ----------
CREATE TABLE public.saved_jobs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id     UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT saved_jobs_unique UNIQUE (user_id, job_id)
);

CREATE INDEX saved_jobs_user_idx ON public.saved_jobs (user_id);

-- ---------- COURSE ENROLLMENTS ----------
CREATE TABLE public.enrolled_courses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_title TEXT NOT NULL,
  enrolled_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT enrolled_courses_unique UNIQUE (user_id, course_title)
);

-- ---------- ASSISTANT CHAT HISTORY ----------
CREATE TABLE public.assistant_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  intent     TEXT,
  cta_label  TEXT,
  cta_link   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX assistant_messages_user_idx ON public.assistant_messages (user_id, created_at DESC);

-- ---------- PHONE OTP (hashed, rate-limited, swap-ready SMS layer) ----------
CREATE TABLE public.otp_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  attempts    INTEGER NOT NULL DEFAULT 0,
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX otp_codes_phone_idx ON public.otp_codes (phone, created_at DESC);

-- ---------- ADMIN AUDIT LOG (append-only) ----------
CREATE TABLE public.admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX admin_audit_log_actor_idx ON public.admin_audit_log (actor_id, created_at DESC);

-- ---------- updated_at maintenance ----------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_touch BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER worker_profiles_touch BEFORE UPDATE ON public.worker_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER contractor_profiles_touch BEFORE UPDATE ON public.contractor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER jobs_touch BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER applications_touch BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER payments_touch BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER safety_reports_touch BEFORE UPDATE ON public.safety_reports
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
