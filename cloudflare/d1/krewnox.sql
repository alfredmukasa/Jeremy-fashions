-- Schema-only SQLite translation of the Jeremy-fashions public tables for Cloudflare D1.
-- No customer rows. Postgres RLS policies, triggers, and functions are not included;
-- D1 does not run them. Supabase Auth (auth.users, sessions, password hashes) is not migrated.
-- Foreign keys that referenced auth.users are omitted:
--   admin_ownership_transfers.from_user_id / to_user_id ON DELETE CASCADE
--   admin_purchase_notification_reads.admin_id ON DELETE CASCADE
--   audit_logs.actor_id ON DELETE SET NULL
--   contact_messages.user_id ON DELETE SET NULL
--   orders.user_id ON DELETE SET NULL
--   profiles.id ON DELETE CASCADE
--   user_shipping_addresses.user_id ON DELETE CASCADE
-- uuid, timestamptz, and numeric values are TEXT. numeric stays TEXT so decimal strings
-- such as 199.00 are preserved. jsonb and arrays are JSON text. booleans are INTEGER 0/1.
-- The Postgres GIN index on products.attributes is omitted (D1 has no GIN).
-- The phone format check on user_shipping_addresses is omitted (it uses Postgres regex).
-- gen_random_uuid() defaults are omitted; D1 has no equivalent, and copied rows supply ids.

PRAGMA foreign_keys = ON;

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  product_kind TEXT NOT NULL DEFAULT 'apparel',
  CONSTRAINT categories_slug_key UNIQUE (slug),
  CONSTRAINT categories_product_kind_check CHECK (product_kind IN ('apparel', 'footwear', 'accessories'))
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price TEXT NOT NULL,
  compare_price TEXT,
  category TEXT NOT NULL,
  brand TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  rating TEXT NOT NULL DEFAULT '0',
  image_url TEXT NOT NULL,
  gallery_images TEXT NOT NULL DEFAULT '[]',
  tags TEXT NOT NULL DEFAULT '[]',
  sku TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  gender TEXT NOT NULL DEFAULT 'unisex',
  sizes TEXT NOT NULL DEFAULT '[]',
  colors TEXT NOT NULL DEFAULT '[]',
  attributes TEXT NOT NULL DEFAULT '{}',
  CONSTRAINT products_slug_key UNIQUE (slug),
  CONSTRAINT products_sku_key UNIQUE (sku),
  CONSTRAINT products_category_fkey FOREIGN KEY (category) REFERENCES categories (slug) ON UPDATE CASCADE,
  CONSTRAINT products_featured_check CHECK (featured IN (0, 1)),
  CONSTRAINT products_price_check CHECK (CAST(price AS REAL) >= 0),
  CONSTRAINT products_compare_price_check CHECK (compare_price IS NULL OR CAST(compare_price AS REAL) >= 0),
  CONSTRAINT products_rating_check CHECK (CAST(rating AS REAL) >= 0 AND CAST(rating AS REAL) <= 5),
  CONSTRAINT products_stock_quantity_check CHECK (stock_quantity >= 0),
  CONSTRAINT products_status_check CHECK (status IN ('active', 'draft', 'archived')),
  CONSTRAINT products_gender_check CHECK (gender IN ('men', 'women', 'unisex'))
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id TEXT,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  total_amount TEXT NOT NULL DEFAULT '0',
  currency TEXT NOT NULL DEFAULT 'USD',
  shipping_address TEXT,
  notes TEXT,
  stripe_payment_intent_id TEXT,
  billing_address TEXT,
  payment_metadata TEXT NOT NULL DEFAULT '{}',
  idempotency_key TEXT,
  order_number TEXT,
  subtotal_amount TEXT,
  shipping_amount TEXT,
  tax_amount TEXT,
  discount_amount TEXT NOT NULL DEFAULT '0',
  refund_amount TEXT NOT NULL DEFAULT '0',
  confirmation_email_sent_at TEXT,
  stripe_checkout_session_id TEXT,
  CONSTRAINT orders_status_check CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
  CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('unpaid', 'processing', 'paid', 'refunded', 'partial_refund', 'failed')),
  CONSTRAINT orders_total_amount_check CHECK (CAST(total_amount AS REAL) >= 0)
);

CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT,
  title TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price TEXT NOT NULL,
  sku TEXT,
  size TEXT,
  color_name TEXT,
  line_total TEXT,
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL,
  CONSTRAINT order_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT order_items_unit_price_check CHECK (CAST(unit_price AS REAL) >= 0)
);

CREATE TABLE waitlist (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  interested_product TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  discount_code_sent INTEGER NOT NULL DEFAULT 0,
  instagram TEXT,
  CONSTRAINT waitlist_email_unique UNIQUE (email),
  CONSTRAINT waitlist_interested_product_fkey FOREIGN KEY (interested_product) REFERENCES products (id) ON DELETE SET NULL,
  CONSTRAINT waitlist_status_check CHECK (status IN ('pending', 'notified', 'converted', 'archived')),
  CONSTRAINT waitlist_discount_code_sent_check CHECK (discount_code_sent IN (0, 1))
);

CREATE TABLE stripe_webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  order_id TEXT,
  processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT stripe_webhook_events_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE SET NULL
);

CREATE TABLE admin_purchase_notifications (
  order_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  email_payload TEXT,
  email_sent_at TEXT,
  email_claimed_at TEXT,
  email_last_error TEXT,
  CONSTRAINT admin_purchase_notifications_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
);

CREATE TABLE admin_purchase_notification_reads (
  order_id TEXT NOT NULL,
  admin_id TEXT NOT NULL,
  read_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id, admin_id),
  CONSTRAINT admin_purchase_notification_reads_order_id_fkey FOREIGN KEY (order_id) REFERENCES admin_purchase_notifications (order_id) ON DELETE CASCADE
);

CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  email TEXT,
  full_name TEXT,
  suspended INTEGER NOT NULL DEFAULT 0,
  account_status TEXT NOT NULL DEFAULT 'active',
  is_admin INTEGER NOT NULL DEFAULT 0,
  admin_role TEXT,
  is_owner INTEGER NOT NULL DEFAULT 0,
  theme_preference TEXT NOT NULL DEFAULT 'light',
  appearance_mode TEXT NOT NULL DEFAULT 'light',
  theme_updated_at TEXT,
  CONSTRAINT profiles_suspended_check CHECK (suspended IN (0, 1)),
  CONSTRAINT profiles_is_admin_check CHECK (is_admin IN (0, 1)),
  CONSTRAINT profiles_is_owner_check CHECK (is_owner IN (0, 1)),
  CONSTRAINT profiles_account_status_check CHECK (account_status IN ('active', 'suspended', 'banned')),
  CONSTRAINT profiles_theme_preference_check CHECK (theme_preference IN ('light', 'dark')),
  CONSTRAINT profiles_appearance_mode_check CHECK (appearance_mode IN ('light', 'dark'))
);

CREATE TABLE discount_codes (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  code TEXT NOT NULL,
  percentage INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT,
  allowed_emails TEXT NOT NULL DEFAULT '[]',
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  amount TEXT,
  min_subtotal TEXT NOT NULL DEFAULT '0',
  usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  product_ids TEXT NOT NULL DEFAULT '[]',
  CONSTRAINT discount_codes_code_key UNIQUE (code),
  CONSTRAINT discount_codes_active_check CHECK (active IN (0, 1)),
  CONSTRAINT discount_codes_discount_type_check CHECK (discount_type IN ('percentage', 'fixed')),
  CONSTRAINT discount_codes_allowed_emails_size CHECK (json_valid(allowed_emails) AND json_array_length(allowed_emails) <= 200),
  CONSTRAINT discount_codes_min_subtotal_check CHECK (CAST(min_subtotal AS REAL) >= 0),
  CONSTRAINT discount_codes_usage_count_check CHECK (usage_count >= 0),
  CONSTRAINT discount_codes_usage_limit_check CHECK (usage_limit IS NULL OR usage_limit > 0),
  CONSTRAINT discount_codes_value_check CHECK (
    (discount_type = 'percentage' AND percentage IS NOT NULL AND percentage > 0 AND percentage <= 100)
    OR (discount_type = 'fixed' AND amount IS NOT NULL AND CAST(amount AS REAL) > 0)
  )
);

CREATE TABLE global_settings (
  id TEXT PRIMARY KEY,
  waitlist_mode INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT global_settings_waitlist_mode_check CHECK (waitlist_mode IN (0, 1))
);

CREATE TABLE site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_shipping_addresses (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id TEXT NOT NULL,
  label TEXT,
  full_name TEXT NOT NULL,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  phone TEXT,
  CONSTRAINT user_shipping_addresses_is_default_check CHECK (is_default IN (0, 1))
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actor_id TEXT,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE contact_messages (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  user_id TEXT,
  CONSTRAINT contact_messages_first_name_len CHECK (length(trim(first_name)) >= 1 AND length(trim(first_name)) <= 80),
  CONSTRAINT contact_messages_last_name_len CHECK (length(trim(last_name)) >= 1 AND length(trim(last_name)) <= 80),
  CONSTRAINT contact_messages_email_len CHECK (length(trim(email)) >= 3 AND length(trim(email)) <= 254),
  CONSTRAINT contact_messages_message_len CHECK (length(trim(message)) >= 10 AND length(trim(message)) <= 4000),
  CONSTRAINT contact_messages_status_check CHECK (status IN ('new', 'read', 'replied', 'archived'))
);

CREATE TABLE admin_login_limits (
  bucket_key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE admin_ownership_transfers (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at TEXT,
  from_user_id TEXT NOT NULL,
  from_email TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  to_email TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  CONSTRAINT admin_ownership_transfers_status_check CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled'))
);

CREATE INDEX categories_slug_idx ON categories (slug);
CREATE INDEX products_category_idx ON products (category);
CREATE INDEX products_created_at_idx ON products (created_at DESC);
CREATE INDEX products_featured_idx ON products (featured);
CREATE INDEX products_slug_idx ON products (slug);
CREATE INDEX products_status_idx ON products (status);
CREATE INDEX orders_created_at_idx ON orders (created_at DESC);
CREATE UNIQUE INDEX orders_idempotency_key_uidx ON orders (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX orders_order_number_uidx ON orders (order_number) WHERE order_number IS NOT NULL;
CREATE UNIQUE INDEX orders_stripe_payment_intent_id_uidx ON orders (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX orders_status_idx ON orders (status);
CREATE INDEX orders_user_id_idx ON orders (user_id);
CREATE INDEX order_items_order_id_idx ON order_items (order_id);
CREATE INDEX waitlist_created_at_idx ON waitlist (created_at DESC);
CREATE INDEX waitlist_email_idx ON waitlist (email);
CREATE INDEX waitlist_interested_product_idx ON waitlist (interested_product);
CREATE INDEX waitlist_status_idx ON waitlist (status);
CREATE INDEX stripe_webhook_events_order_id_idx ON stripe_webhook_events (order_id);
CREATE INDEX admin_purchase_notifications_created_idx ON admin_purchase_notifications (created_at DESC);
CREATE INDEX profiles_account_status_idx ON profiles (account_status);
CREATE INDEX profiles_appearance_mode_idx ON profiles (appearance_mode);
CREATE INDEX profiles_created_at_idx ON profiles (created_at DESC);
CREATE INDEX profiles_is_admin_idx ON profiles (is_admin);
CREATE UNIQUE INDEX profiles_single_owner_idx ON profiles (is_owner) WHERE is_owner = 1;
CREATE INDEX discount_codes_active_idx ON discount_codes (active);
CREATE INDEX discount_codes_code_idx ON discount_codes (code);
CREATE INDEX user_shipping_addresses_user_id_idx ON user_shipping_addresses (user_id, created_at DESC);
CREATE UNIQUE INDEX user_shipping_addresses_one_default_per_user_idx ON user_shipping_addresses (user_id) WHERE is_default = 1;
CREATE INDEX audit_logs_action_idx ON audit_logs (action);
CREATE INDEX audit_logs_created_at_idx ON audit_logs (created_at DESC);
CREATE INDEX contact_messages_created_at_idx ON contact_messages (created_at DESC);
CREATE INDEX contact_messages_email_lower_idx ON contact_messages (lower(email));
CREATE INDEX contact_messages_status_idx ON contact_messages (status);
CREATE INDEX contact_messages_user_id_idx ON contact_messages (user_id);
CREATE INDEX admin_login_limits_expiry_idx ON admin_login_limits (expires_at);
CREATE INDEX admin_ownership_transfers_from_status_idx ON admin_ownership_transfers (from_user_id, status);
CREATE INDEX admin_ownership_transfers_to_status_idx ON admin_ownership_transfers (to_user_id, status);
