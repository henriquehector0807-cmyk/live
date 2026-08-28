-- ==============================================================================
-- SCHEMA COMPLETO DO BANCO DE DADOS SUPABASE (PostgreSQL)
-- LIVE REPLAY COMMERCE PLATFORM
-- ==============================================================================
-- Execute este script no "SQL Editor" do seu painel Supabase (https://supabase.com/dashboard)

-- 1. TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE LIVES
CREATE TABLE IF NOT EXISTS lives (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  product_name TEXT NOT NULL,
  product_price NUMERIC(10, 2) NOT NULL,
  product_image TEXT,
  video_url TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  bot_enabled INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Campos estendidos de personalização e conversão
  loop_enabled INTEGER DEFAULT 1,
  simulated_viewers_base INTEGER DEFAULT 120,
  show_recent_purchases INTEGER DEFAULT 1,
  theme_color TEXT DEFAULT '#FF5A36',
  font_style TEXT DEFAULT 'default',
  bg_gradient TEXT DEFAULT 'dark',
  banner_text TEXT,
  banner_active INTEGER DEFAULT 0,
  cta_text TEXT DEFAULT 'Comprar Agora',
  cta_subtext TEXT DEFAULT 'Oferta por tempo limitado!',
  show_countdown INTEGER DEFAULT 0,
  countdown_minutes INTEGER DEFAULT 15,
  show_stock_alert INTEGER DEFAULT 1,
  stock_quantity INTEGER DEFAULT 12,
  custom_css TEXT,
  checkout_type TEXT DEFAULT 'redirect',
  whatsapp_number TEXT,
  auto_open_checkout INTEGER DEFAULT 0,
  auto_open_delay INTEGER DEFAULT 60,
  discount_coupon TEXT,
  discount_percentage INTEGER DEFAULT 0,
  fake_comments_enabled INTEGER DEFAULT 1,
  fake_comments_interval INTEGER DEFAULT 15,
  min_viewer_count INTEGER DEFAULT 80,
  max_viewer_count INTEGER DEFAULT 350,
  likes_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  simulated_purchases_count INTEGER DEFAULT 0
);

-- 3. TABELA DE PRODUTOS DO CATÁLOGO
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  category TEXT,
  image_url TEXT,
  price NUMERIC(10, 2) NOT NULL,
  promotional_price NUMERIC(10, 2),
  payment_url TEXT,
  stock INTEGER DEFAULT 0,
  minimum_stock INTEGER DEFAULT 0,
  shipping_price NUMERIC(10, 2) DEFAULT 0,
  delivery_time TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE PRODUTOS SINCRONIZADOS NA TIMELINE DA LIVE
CREATE TABLE IF NOT EXISTS live_products (
  id TEXT PRIMARY KEY,
  live_id TEXT NOT NULL REFERENCES lives(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE EVENTOS DE VÍDEO (GATILHOS)
CREATE TABLE IF NOT EXISTS video_events (
  id TEXT PRIMARY KEY,
  live_id TEXT NOT NULL REFERENCES lives(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  time_seconds INTEGER NOT NULL,
  message TEXT NOT NULL,
  buyer_name TEXT,
  enabled INTEGER DEFAULT 1
);

-- 6. TABELA DE VISITANTES
CREATE TABLE IF NOT EXISTS visitors (
  id TEXT PRIMARY KEY,
  live_id TEXT NOT NULL REFERENCES lives(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  name TEXT,
  buyer_status TEXT DEFAULT 'visitor',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABELA DE MENSAGENS DE CHAT
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  live_id TEXT NOT NULL REFERENCES lives(id) ON DELETE CASCADE,
  visitor_id TEXT,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  sender_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABELA DE PEDIDOS
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  live_id TEXT NOT NULL REFERENCES lives(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  buyer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  shipping_address TEXT,
  quantity INTEGER NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending_payment',
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABELA DE CONFIGURAÇÕES DE IA / BOT
CREATE TABLE IF NOT EXISTS ai_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  live_id TEXT REFERENCES lives(id) ON DELETE CASCADE,
  bot_name TEXT DEFAULT 'Assistente Virtual',
  prompt TEXT,
  active INTEGER DEFAULT 1,
  simulated_audience INTEGER DEFAULT 1,
  engagement_level TEXT DEFAULT 'medium',
  product_pitch_interval INTEGER DEFAULT 60,
  ai_provider TEXT DEFAULT 'openrouter',
  ai_model TEXT DEFAULT 'openai/gpt-4o-mini',
  custom_api_key TEXT,
  personality TEXT DEFAULT 'vendedora_animada',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABELA DE CONFIGURAÇÕES DO MERCADO PAGO
CREATE TABLE IF NOT EXISTS mercado_pago_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  live_id TEXT REFERENCES lives(id) ON DELETE CASCADE,
  access_token TEXT,
  public_key TEXT,
  webhook_secret TEXT,
  is_live_mode INTEGER DEFAULT 0,
  active INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TABELA DE COMENTÁRIOS ROTEIRIZADOS
CREATE TABLE IF NOT EXISTS scripted_comments (
  id TEXT PRIMARY KEY,
  live_id TEXT NOT NULL REFERENCES lives(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  text TEXT NOT NULL,
  time_offset INTEGER NOT NULL DEFAULT 0,
  avatar TEXT,
  verified INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ÍNDICES PARA ALTA PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_lives_slug ON lives(slug);
CREATE INDEX IF NOT EXISTS idx_lives_user_id ON lives(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_live_products_live_id ON live_products(live_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_live_id ON chat_messages(live_id);
CREATE INDEX IF NOT EXISTS idx_visitors_live_id ON visitors(live_id);
CREATE INDEX IF NOT EXISTS idx_orders_live_id ON orders(live_id);
CREATE INDEX IF NOT EXISTS idx_orders_visitor_id ON orders(visitor_id);
CREATE INDEX IF NOT EXISTS idx_scripted_comments_live_id ON scripted_comments(live_id);

-- ==============================================================================
-- STORAGE BUCKETS NO SUPABASE (Públicos)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage Públicas para Leitura e Gravação
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Videos') THEN
    CREATE POLICY "Public Access Videos" ON storage.objects FOR SELECT USING (bucket_id = 'videos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Upload Videos') THEN
    CREATE POLICY "Public Upload Videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'videos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Images') THEN
    CREATE POLICY "Public Access Images" ON storage.objects FOR SELECT USING (bucket_id = 'images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Upload Images') THEN
    CREATE POLICY "Public Upload Images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'images');
  END IF;
END
$$;
