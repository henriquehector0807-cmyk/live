import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const lives = sqliteTable("lives", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  productName: text("product_name").notNull(),
  productPrice: real("product_price").notNull(),
  productImage: text("product_image"),
  videoUrl: text("video_url").notNull(),
  status: text("status").default("draft"), // draft, scheduled, live, ended
  botEnabled: integer("bot_enabled").default(1),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const videoEvents = sqliteTable("video_events", {
  id: text("id").primaryKey(),
  liveId: text("live_id").notNull().references(() => lives.id),
  type: text("type").notNull(), // order, message
  timeSeconds: integer("time_seconds").notNull(),
  message: text("message").notNull(),
  buyerName: text("buyer_name"),
  enabled: integer("enabled").default(1), // 1 or 0 for true/false
});

export const visitors = sqliteTable("visitors", {
  id: text("id").primaryKey(),
  liveId: text("live_id").notNull().references(() => lives.id),
  sessionId: text("session_id").notNull(),
  name: text("name"),
  buyerStatus: text("buyer_status").default("visitor"), // visitor, interested, buyer
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  liveId: text("live_id").notNull().references(() => lives.id),
  visitorId: text("visitor_id").references(() => visitors.id), // Null if system/influencer
  senderName: text("sender_name").notNull(),
  message: text("message").notNull(),
  senderType: text("sender_type").notNull(), // viewer, bot, system, influencer
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  liveId: text("live_id").notNull().references(() => lives.id),
  visitorId: text("visitor_id").notNull().references(() => visitors.id),
  productId: text("product_id").references(() => products.id),
  buyerName: text("buyer_name").notNull(),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  shippingAddress: text("shipping_address"),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  total: real("total").notNull(),
  status: text("status").default("pending_payment"), // pending_payment, confirmed, cancelled
  paymentStatus: text("payment_status").default("pending_payment"), // pending_payment, paid, refunded
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  sku: text("sku"),
  category: text("category"),
  imageUrl: text("image_url"),
  price: real("price").notNull(),
  promotionalPrice: real("promotional_price"),
  paymentUrl: text("payment_url"),
  stock: integer("stock").default(0),
  minimumStock: integer("minimum_stock").default(0),
  shippingPrice: real("shipping_price").default(0),
  deliveryTime: text("delivery_time"),
  status: text("status").default("active"), // active, inactive
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const liveProducts = sqliteTable("live_products", {
  id: text("id").primaryKey(),
  liveId: text("live_id").notNull().references(() => lives.id),
  productId: text("product_id").notNull().references(() => products.id),
  isPrimary: integer("is_primary").default(0),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const liveProductTimeline = sqliteTable("live_product_timeline", {
  id: text("id").primaryKey(),
  liveId: text("live_id").notNull().references(() => lives.id),
  productId: text("product_id").notNull().references(() => products.id),
  startTime: integer("start_time").notNull(),
  endTime: integer("end_time").notNull(),
  displayOrder: integer("display_order").default(0),
  showOnVideo: integer("show_on_video").default(1),
  showProductCard: integer("show_product_card").default(1),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const aiSettings = sqliteTable("ai_settings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  openRouterApiKey: text("open_router_api_key"),
  model: text("model").default("meta-llama/llama-3.3-70b-instruct:free"),
  temperature: real("temperature").default(0.3),
  maxTokens: integer("max_tokens").default(150),
  isEnabled: integer("is_enabled").default(1),
  tone: text("tone").default("amigavel"), // formal, profissional, amigavel, descontraido, persuasivo, direto
  economicMode: integer("economic_mode").default(1),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const productAiSettings = sqliteTable("product_ai_settings", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => products.id),
  benefits: text("benefits"),
  howToUse: text("how_to_use"),
  features: text("features"),
  deliveryInfo: text("delivery_info"),
  paymentInfo: text("payment_info"),
  exchangePolicy: text("exchange_policy"),
  additionalInfo: text("additional_info"),
  customInstructions: text("custom_instructions"),
  allowedTopics: text("allowed_topics").default("price,stock,features,benefits,howToUse,delivery,payment,purchase,exchange"),
  isEnabled: integer("is_enabled").default(1),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const aiChatLogs = sqliteTable("ai_chat_logs", {
  id: text("id").primaryKey(),
  productId: text("product_id").references(() => products.id),
  liveId: text("live_id").references(() => lives.id),
  conversationId: text("conversation_id"),
  model: text("model"),
  question: text("question").notNull(),
  answer: text("answer"),
  tokensInput: integer("tokens_input").default(0),
  tokensOutput: integer("tokens_output").default(0),
  totalTokens: integer("total_tokens").default(0),
  responseTime: integer("response_time").default(0), // in milliseconds
  status: text("status").default("success"), // success, error
  errorMessage: text("error_message"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

