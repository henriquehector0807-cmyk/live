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

// LibSQL local file client
const sqliteClient = createClient({
  url: "file:data/local.db",
});

// Auto-migrate new columns and tables if needed
(async () => {
  const migrations = [
    "ALTER TABLE products ADD COLUMN payment_url TEXT",
    "ALTER TABLE orders ADD COLUMN product_id TEXT",
    "ALTER TABLE orders ADD COLUMN customer_phone TEXT",
    "ALTER TABLE orders ADD COLUMN customer_email TEXT",
    "ALTER TABLE orders ADD COLUMN shipping_address TEXT",
    "ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending_payment'",
    "ALTER TABLE lives ADD COLUMN bot_enabled INTEGER DEFAULT 1",
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
    "ALTER TABLE orders ADD COLUMN customer_cpf TEXT",
    "ALTER TABLE orders ADD COLUMN mp_payment_id TEXT",
    "ALTER TABLE orders ADD COLUMN mp_status TEXT",
    "ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'pix'",
    "ALTER TABLE orders ADD COLUMN qr_code TEXT",
    "ALTER TABLE orders ADD COLUMN qr_code_base64 TEXT",
    "ALTER TABLE orders ADD COLUMN ticket_url TEXT",
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
  for (const sql of migrations) {
    try {
      await sqliteClient.execute(sql);
    } catch {}
  }
})();

export const db = drizzle(sqliteClient, { schema });


