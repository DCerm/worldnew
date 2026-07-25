CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE role_code AS ENUM (
  'super_admin',
  'artist_admin',
  'moderator',
  'member'
);

CREATE TYPE auth_provider AS ENUM (
  'wordpress',
  'google',
  'facebook'
);

CREATE TYPE account_status AS ENUM (
  'active',
  'pending',
  'suspended',
  'deleted'
);

CREATE TYPE membership_plan_code AS ENUM (
  'day_pass',
  'monthly',
  'annual'
);

CREATE TYPE subscription_status AS ENUM (
  'pending',
  'trialing',
  'active',
  'past_due',
  'cancelled',
  'expired',
  'refunded'
);

CREATE TYPE visibility_scope AS ENUM (
  'public',
  'community',
  'paid',
  'plan_specific',
  'custom_allowlist'
);

CREATE TYPE media_kind AS ENUM (
  'audio',
  'video'
);

CREATE TYPE media_status AS ENUM (
  'draft',
  'processing',
  'published',
  'archived'
);

CREATE TYPE feed_post_type AS ENUM (
  'text',
  'media_announcement',
  'system'
);

CREATE TYPE reaction_target_type AS ENUM (
  'feed_post',
  'comment',
  'message'
);

CREATE TYPE friendship_status AS ENUM (
  'pending',
  'accepted',
  'blocked',
  'declined'
);

CREATE TYPE group_visibility AS ENUM (
  'public',
  'private',
  'secret'
);

CREATE TYPE conversation_type AS ENUM (
  'direct',
  'group'
);

CREATE TYPE message_type AS ENUM (
  'text',
  'image',
  'audio',
  'video',
  'system'
);

CREATE TYPE notification_type AS ENUM (
  'new_follower',
  'friend_request',
  'friend_accepted',
  'post_reaction',
  'comment_reaction',
  'new_comment',
  'comment_mention',
  'post_mention',
  'new_message',
  'media_published',
  'subscription_updated',
  'group_invite'
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  username TEXT UNIQUE,
  password_hash TEXT,
  status account_status NOT NULL DEFAULT 'pending',
  wordpress_user_id BIGINT UNIQUE,
  wordpress_customer_id BIGINT,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  cover_image_url TEXT,
  bio TEXT,
  phone TEXT,
  billing_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  shipping_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  email_verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_auth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider auth_provider NOT NULL,
  provider_user_id TEXT NOT NULL,
  provider_email TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_user_id)
);

CREATE TABLE app_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE app_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code role_code NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code membership_plan_code NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_amount NUMERIC(10, 2) NOT NULL,
  currency_code CHAR(3) NOT NULL DEFAULT 'USD',
  duration_days INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  wordpress_product_id BIGINT,
  wordpress_variation_id BIGINT,
  feature_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  membership_plan_id UUID NOT NULL REFERENCES membership_plans(id) ON DELETE RESTRICT,
  status subscription_status NOT NULL DEFAULT 'pending',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  auto_renews BOOLEAN NOT NULL DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  external_source TEXT NOT NULL DEFAULT 'woocommerce',
  external_order_id TEXT,
  external_subscription_id TEXT,
  purchase_amount NUMERIC(10, 2),
  currency_code CHAR(3) DEFAULT 'USD',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  media_type media_kind NOT NULL,
  status media_status NOT NULL DEFAULT 'draft',
  visibility visibility_scope NOT NULL DEFAULT 'community',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  poster_image_url TEXT,
  thumbnail_url TEXT,
  playback_url TEXT,
  download_url TEXT,
  storage_provider TEXT,
  storage_key TEXT,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  published_at TIMESTAMPTZ,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE media_plan_access (
  media_item_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  membership_plan_id UUID NOT NULL REFERENCES membership_plans(id) ON DELETE CASCADE,
  PRIMARY KEY (media_item_id, membership_plan_id)
);

CREATE TABLE media_user_access (
  media_item_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (media_item_id, user_id)
);

CREATE TABLE feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  post_type feed_post_type NOT NULL DEFAULT 'text',
  body TEXT,
  media_item_id UUID REFERENCES media_items(id) ON DELETE SET NULL,
  group_id UUID,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES feed_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type reaction_target_type NOT NULL,
  target_id UUID NOT NULL,
  reaction_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, target_type, target_id, reaction_code)
);

CREATE TABLE mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_table TEXT NOT NULL,
  target_id UUID NOT NULL,
  mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentioned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status friendship_status NOT NULL DEFAULT 'pending',
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  visibility group_visibility NOT NULL DEFAULT 'public',
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  cover_image_url TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE feed_posts
ADD CONSTRAINT feed_posts_group_id_fkey
FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL;

CREATE TABLE group_members (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_type conversation_type NOT NULL DEFAULT 'direct',
  title TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE conversation_members (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message_type message_type NOT NULL DEFAULT 'text',
  body TEXT,
  media_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notification_type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link_url TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  event_name TEXT NOT NULL,
  external_id TEXT,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_wordpress_user_id ON users(wordpress_user_id);
CREATE INDEX idx_user_auth_accounts_user_id ON user_auth_accounts(user_id);
CREATE INDEX idx_app_sessions_user_id ON app_sessions(user_id);
CREATE INDEX idx_app_sessions_token_hash ON app_sessions(token_hash);
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_media_items_category_id ON media_items(category_id);
CREATE INDEX idx_media_items_visibility ON media_items(visibility);
CREATE INDEX idx_media_items_status ON media_items(status);
CREATE INDEX idx_feed_posts_author_id ON feed_posts(author_id);
CREATE INDEX idx_feed_posts_media_item_id ON feed_posts(media_item_id);
CREATE INDEX idx_feed_comments_post_id ON feed_comments(post_id);
CREATE INDEX idx_reactions_target ON reactions(target_type, target_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);
CREATE INDEX idx_friendships_requester_id ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee_id ON friendships(addressee_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_conversation_members_user_id ON conversation_members(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_webhook_events_source_event ON webhook_events(source, event_name);

INSERT INTO roles (code, name, description) VALUES
  ('super_admin', 'Super Admin', 'Full platform access'),
  ('artist_admin', 'Artist Admin', 'Can upload and manage media'),
  ('moderator', 'Moderator', 'Can moderate community content'),
  ('member', 'Member', 'Standard community member')
ON CONFLICT (code) DO NOTHING;

INSERT INTO membership_plans (
  code,
  name,
  description,
  price_amount,
  duration_days,
  sort_order,
  feature_list
) VALUES
  (
    'day_pass',
    'Day Pass',
    'Short access window for sampling the community and media library',
    0.00,
    1,
    1,
    '["exclusive songs","demo archive","exclusive videos","chat forums","community access"]'::jsonb
  ),
  (
    'monthly',
    'Pro Monthly',
    'Recurring monthly membership for premium access',
    0.00,
    30,
    2,
    '["all day pass features","premium media","community access","member discussions"]'::jsonb
  ),
  (
    'annual',
    'Pro Annual',
    'Recurring annual membership with discount pricing',
    0.00,
    365,
    3,
    '["all monthly features","discounted annual billing","priority access"]'::jsonb
  )
ON CONFLICT (code) DO NOTHING;
