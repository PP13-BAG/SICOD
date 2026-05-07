CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  code TEXT,
  label TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,
  replaced_by_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS category_aliases (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  legacy_label TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_templates (
  id TEXT PRIMARY KEY,
  document_type TEXT NOT NULL,
  name TEXT NOT NULL,
  version INTEGER NOT NULL,
  variant TEXT NOT NULL DEFAULT 'default',
  schema_json TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  event_type_id TEXT,
  event_type_label_snapshot TEXT,
  synergi_id TEXT,
  commune TEXT,
  severity TEXT,
  status TEXT NOT NULL DEFAULT 'Actif',
  description TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS points_situation (
  id TEXT PRIMARY KEY,
  event_id TEXT,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Brouillon',
  classification TEXT,
  format TEXT NOT NULL DEFAULT 'detail',
  template_id TEXT,
  template_version INTEGER,
  author TEXT,
  content_json TEXT NOT NULL,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS command_messages (
  id TEXT PRIMARY KEY,
  event_id TEXT,
  status TEXT NOT NULL DEFAULT 'Ouvert',
  type_id TEXT,
  type_label_snapshot TEXT,
  template_id TEXT,
  template_version INTEGER,
  payload_json TEXT NOT NULL,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  group_id TEXT,
  group_label_snapshot TEXT,
  entity_id TEXT,
  entity_label_snapshot TEXT,
  payload_json TEXT NOT NULL,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT,
  payload_json TEXT NOT NULL,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plan_items (
  id TEXT PRIMARY KEY,
  type_id TEXT,
  type_label_snapshot TEXT,
  risk_type_id TEXT,
  risk_label_snapshot TEXT,
  priority_id TEXT,
  priority_label_snapshot TEXT,
  status_id TEXT,
  status_label_snapshot TEXT,
  payload_json TEXT NOT NULL,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS duty_availabilities (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  agent_label_snapshot TEXT,
  role_id TEXT,
  role_label_snapshot TEXT,
  payload_json TEXT NOT NULL,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload_json TEXT,
  actor TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
