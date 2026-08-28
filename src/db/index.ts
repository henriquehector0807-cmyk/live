import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import fs from "fs";
import path from "path";

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// LibSQL client (Turso Cloud Database or local SQLite file fallback)
const dbUrl = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || "file:data/local.db";
const dbAuthToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN;

const sqliteClient = createClient({
  url: dbUrl,
  authToken: dbAuthToken,
});

// Auto-migrate new columns and tables if needed
(async () => {
  const tableCreations = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS lives (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      product_name TEXT NOT NULL,
      product_price REAL NOT NULL,
      product_image TEXT,
      video_url TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      bot_enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS video_events (
      id TEXT PRIMARY KEY,
      live_id TEXT NOT NULL,
      type TEXT NOT NULL,
      time_seconds INTEGER NOT NULL,
      message TEXT NOT NULL,
      buyer_name TEXT,
      enabled INTEGER DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS visitors (
      id TEXT PRIMARY KEY,
      live_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      name TEXT,
      buyer_status TEXT DEFAULT 'visitor',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      live_id TEXT NOT NULL,
      visitor_id TEXT,
      sender_name TEXT NOT NULL,
      message TEXT NOT NULL,
      sender_type TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      sku TEXT,
      category TEXT,
      image_url TEXT,
      price REAL NOT NULL,
      promotional_price REAL,
      payment_url TEXT,
      stock INTEGER DEFAULT 0,
      minimum_stock INTEGER DEFAULT 0,
      shipping_price REAL DEFAULT 0,
      delivery_time TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      live_id TEXT NOT NULL,
      visitor_id TEXT NOT NULL,
      product_id TEXT,
      buyer_name TEXT NOT NULL,
      customer_phone TEXT,
      customer_email TEXT,
      shipping_address TEXT,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total REAL NOT NULL,
      status TEXT DEFAULT 'pending_payment',
      payment_status TEXT DEFAULT 'pending_payment',
      customer_cpf TEXT,
      mp_payment_id TEXT,
      mp_status TEXT,
      payment_method TEXT DEFAULT 'pix',
      qr_code TEXT,
      qr_code_base64 TEXT,
      ticket_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS live_products (
      id TEXT PRIMARY KEY,
      live_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS live_product_timeline (
      id TEXT PRIMARY KEY,
      live_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      display_order INTEGER DEFAULT 0,
      show_on_video INTEGER DEFAULT 1,
      show_product_card INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS ai_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      open_router_api_key TEXT,
      model TEXT DEFAULT 'meta-llama/llama-3.3-70b-instruct:free',
      temperature REAL DEFAULT 0.3,
      max_tokens INTEGER DEFAULT 150,
      is_enabled INTEGER DEFAULT 1,
      tone TEXT DEFAULT 'amigavel',
      economic_mode INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS product_ai_settings (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      benefits TEXT,
      how_to_use TEXT,
      features TEXT,
      delivery_info TEXT,
      payment_info TEXT,
      exchange_policy TEXT,
      additional_info TEXT,
      custom_instructions TEXT,
      allowed_topics TEXT DEFAULT 'price,stock,features,benefits,howToUse,delivery,payment,purchase,exchange',
      is_enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS ai_chat_logs (
      id TEXT PRIMARY KEY,
      product_id TEXT,
      live_id TEXT,
      conversation_id TEXT,
      model TEXT,
      question TEXT NOT NULL,
      answer TEXT,
      tokens_input INTEGER DEFAULT 0,
      tokens_output INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      response_time INTEGER DEFAULT 0,
      status TEXT DEFAULT 'success',
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS payment_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      mp_access_token TEXT,
      mp_public_key TEXT,
      is_enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (const sql of tableCreations) {
    try {
      await sqliteClient.execute(sql);
    } catch (e) {
      console.warn("Table creation note:", e);
    }
  }

  const columnMigrations = [
    "ALTER TABLE products ADD COLUMN payment_url TEXT",
    "ALTER TABLE orders ADD COLUMN product_id TEXT",
    "ALTER TABLE orders ADD COLUMN customer_phone TEXT",
    "ALTER TABLE orders ADD COLUMN customer_email TEXT",
    "ALTER TABLE orders ADD COLUMN shipping_address TEXT",
    "ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending_payment'",
    "ALTER TABLE lives ADD COLUMN bot_enabled INTEGER DEFAULT 1",
    "ALTER TABLE orders ADD COLUMN customer_cpf TEXT",
    "ALTER TABLE orders ADD COLUMN mp_payment_id TEXT",
    "ALTER TABLE orders ADD COLUMN mp_status TEXT",
    "ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'pix'",
    "ALTER TABLE orders ADD COLUMN qr_code TEXT",
    "ALTER TABLE orders ADD COLUMN qr_code_base64 TEXT",
    "ALTER TABLE orders ADD COLUMN ticket_url TEXT"
  ];

  for (const sql of columnMigrations) {
    try {
      await sqliteClient.execute(sql);
    } catch {}
  }
})();

export const db = drizzle(sqliteClient, { schema });


