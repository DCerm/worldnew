CREATE TABLE IF NOT EXISTS login_throttle_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_type TEXT NOT NULL CHECK (identity_type IN ('account', 'device')),
  identity_key TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_failed_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (identity_type, identity_key)
);

CREATE INDEX IF NOT EXISTS login_throttle_states_locked_until_idx
  ON login_throttle_states (locked_until);

CREATE INDEX IF NOT EXISTS login_throttle_states_identity_type_key_idx
  ON login_throttle_states (identity_type, identity_key);
