-- ============================================================
-- مخطط PostgreSQL المقابل لطبقة البيانات الحالية (server/lib/db.js)
-- عند الانتقال للإنتاج: نفّذ هذا الملف ثم استبدل db.js بتنفيذ يستخدم pg
-- بنفس الواجهة (insert / get / find / list / update / remove).
-- ============================================================
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL DEFAULT '',   -- فارغ لمستخدمي Google
  language      TEXT CHECK (language IN ('en','fr','ar')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE websites (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,                -- website_name
  website_type  TEXT NOT NULL,                -- store, portfolio, ...
  data          JSONB NOT NULL,               -- Website Schema: theme, pages, components, settings
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','unpublished')),
  published     JSONB,                        -- نسخة منشورة ثابتة
  subdomain     TEXT UNIQUE NOT NULL,
  custom_domain TEXT UNIQUE,
  paid          BOOLEAN NOT NULL DEFAULT FALSE,   -- يُحدَّث فقط عبر Webhook الدفع
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at  TIMESTAMPTZ
);
CREATE INDEX websites_user_idx ON websites(user_id, updated_at DESC);

CREATE TABLE versions (
  id          TEXT PRIMARY KEY,
  website_id  TEXT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  data        JSONB NOT NULL,
  label       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX versions_site_idx ON versions(website_id, created_at DESC);
