import express from "express";
import bcrypt from "bcryptjs";
import path from "path";
import { db } from "../db/index";
import { users, lives, videoEvents, visitors, chatMessages, orders, products, liveProducts, liveProductTimeline } from "../db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { LocalVideoStorageService, SupabaseVideoStorageService, videoUploadMiddleware, imageUploadMiddleware } from "../services/videoStorageService";
import { aiRouter } from "./ai";
import { paymentsRouter } from "./mercadopago";
import { requireAuth, signAuthToken } from "./auth";

export const apiRouter = express.Router();
apiRouter.use("/ai", aiRouter);
apiRouter.use("/payments", paymentsRouter);
apiRouter.use(paymentsRouter);

// Configure Video Service based on Environment Variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const isValidSupabaseUrl = SUPABASE_URL?.startsWith("http://") || SUPABASE_URL?.startsWith("https://");

const videoService = (SUPABASE_URL && SUPABASE_KEY && isValidSupabaseUrl) 
  ? new SupabaseVideoStorageService(SUPABASE_URL, SUPABASE_KEY)
  : new LocalVideoStorageService(process.env.APP_URL || "http://localhost:3000");

// --- AUTH ROUTES ---
apiRouter.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || String(password).length < 6) return res.status(400).json({ error: "Nome, email e senha válida são obrigatórios" });
    const existing = await db.select().from(users).where(eq(users.email, String(email).toLowerCase())).limit(1);
    if (existing.length > 0) return res.status(400).json({ error: "Email já cadastrado" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    await db.insert(users).values({
      id: userId,
      name: String(name).trim(),
      email: String(email).toLowerCase(),
      password: hashedPassword,
    });

    const token = signAuthToken(userId);
    res.cookie("token", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    res.status(201).json({ token, user: { id: userId, name: String(name).trim(), email: String(email).toLowerCase() } });
  } catch { res.status(500).json({ error: "Erro ao registrar" }); }
});

// Helper to normalize and validate URL (auto-prefixes https:// if missing)
function sanitizeUrl(urlString?: string | null): string | null {
  if (!urlString || !String(urlString).trim()) return null;
  let trimmed = String(urlString).trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = "https://" + trimmed;
  }
  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    return null;
  }
}

// --- UPLOAD IMAGES / FILES ---
apiRouter.post("/upload", requireAuth, (req: any, res: any) => {
  (imageUploadMiddleware.single("file") as any)(req, res, (err: any) => {
    if (err) return res.status(400).json({ error: err.message || "Erro no upload da imagem" });
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });
    const fileUrl = `/uploads/${encodeURIComponent(req.file.filename)}`;
    res.json({ url: fileUrl, filename: req.file.filename });
  });
});

apiRouter.post("/upload/image", requireAuth, (req: any, res: any) => {
  (imageUploadMiddleware.single("image") as any)(req, res, (err: any) => {
    if (err) return res.status(400).json({ error: err.message || "Erro no upload da imagem" });
    if (!req.file) return res.status(400).json({ error: "Nenhuma imagem enviada" });
    const fileUrl = `/uploads/${encodeURIComponent(req.file.filename)}`;
    res.json({ url: fileUrl, filename: req.file.filename });
  });
});

apiRouter.post("/products/upload-image", requireAuth, (req: any, res: any) => {
  (imageUploadMiddleware.single("image") as any)(req, res, (err: any) => {
    if (err) return res.status(400).json({ error: err.message || "Erro no upload da imagem" });
    if (!req.file) return res.status(400).json({ error: "Nenhuma imagem enviada" });
    const fileUrl = `/uploads/${encodeURIComponent(req.file.filename)}`;
    res.json({ url: fileUrl, filename: req.file.filename });
  });
});

// --- PRODUCTS ROUTES ---
apiRouter.get("/products", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const rows = await db.select().from(products).where(eq(products.userId, userId)).orderBy(desc(products.createdAt));
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

apiRouter.post("/products", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const {
      name,
      description,
      price,
      promotionalPrice,
      paymentUrl,
      stock,
      sku,
      category,
      imageUrl,
      minimumStock,
      shippingPrice,
      deliveryTime,
      status
    } = req.body;

    if (!name || String(name).trim().length === 0) {
      return res.status(400).json({ error: "Nome do produto é obrigatório" });
    }
    const numPrice = Number(price);
    if (!Number.isFinite(numPrice) || numPrice < 0) {
      return res.status(400).json({ error: "Preço de venda válido é obrigatório" });
    }

    const normalizedPaymentUrl = sanitizeUrl(paymentUrl);
    const id = uuidv4();
    await db.insert(products).values({
      id,
      userId,
      name: String(name).trim(),
      description: description ? String(description) : null,
      price: numPrice,
      promotionalPrice: promotionalPrice == null || promotionalPrice === "" || !Number.isFinite(Number(promotionalPrice)) ? null : Number(promotionalPrice),
      paymentUrl: normalizedPaymentUrl,
      stock: Number(stock || 0),
      sku: sku ? String(sku).trim() : null,
      category: category ? String(category).trim() : null,
      imageUrl: imageUrl ? String(imageUrl).trim() : null,
      minimumStock: Number(minimumStock || 0),
      shippingPrice: Number(shippingPrice || 0),
      deliveryTime: deliveryTime ? String(deliveryTime).trim() : null,
      status: status || "active",
    });
    res.status(201).json({ id });
  } catch (error) {
    console.error("[POST /products error]", error);
    res.status(500).json({ error: "Erro ao criar produto" });
  }
});

apiRouter.put("/products/:id", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const existing = await db.select().from(products).where(and(eq(products.id, id), eq(products.userId, userId))).limit(1);
    if (!existing.length) return res.status(404).json({ error: "Produto não encontrado" });
    
    const {
      name,
      description,
      price,
      promotionalPrice,
      paymentUrl,
      stock,
      sku,
      category,
      imageUrl,
      minimumStock,
      shippingPrice,
      deliveryTime,
      status
    } = req.body;

    const normalizedPaymentUrl = paymentUrl !== undefined ? sanitizeUrl(paymentUrl) : existing[0].paymentUrl;

    await db.update(products).set({
      name: name !== undefined ? String(name).trim() : existing[0].name,
      description: description !== undefined ? (description ? String(description) : null) : existing[0].description,
      price: price !== undefined && Number.isFinite(Number(price)) ? Number(price) : existing[0].price,
      promotionalPrice: promotionalPrice !== undefined ? (promotionalPrice === null || promotionalPrice === "" || !Number.isFinite(Number(promotionalPrice)) ? null : Number(promotionalPrice)) : existing[0].promotionalPrice,
      paymentUrl: normalizedPaymentUrl,
      stock: stock !== undefined && Number.isFinite(Number(stock)) ? Number(stock) : existing[0].stock,
      sku: sku !== undefined ? (sku ? String(sku).trim() : null) : existing[0].sku,
      category: category !== undefined ? (category ? String(category).trim() : null) : existing[0].category,
      imageUrl: imageUrl !== undefined ? (imageUrl ? String(imageUrl).trim() : null) : existing[0].imageUrl,
      minimumStock: minimumStock !== undefined && Number.isFinite(Number(minimumStock)) ? Number(minimumStock) : existing[0].minimumStock,
      shippingPrice: shippingPrice !== undefined && Number.isFinite(Number(shippingPrice)) ? Number(shippingPrice) : existing[0].shippingPrice,
      deliveryTime: deliveryTime !== undefined ? (deliveryTime ? String(deliveryTime).trim() : null) : existing[0].deliveryTime,
      status: status !== undefined ? String(status) : existing[0].status,
      updatedAt: new Date().toISOString(),
    }).where(eq(products.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error("[PUT /products/:id error]", error);
    res.status(500).json({ error: "Erro ao atualizar produto" });
  }
});

apiRouter.delete("/products/:id", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const result = await db.delete(products).where(and(eq(products.id, req.params.id), eq(products.userId, userId)));
    res.json({ success: true, result });
  } catch {
    res.status(500).json({ error: "Erro ao excluir produto" });
  }
});

apiRouter.put("/lives/:id", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const existing = await db.select().from(lives).where(and(eq(lives.id, req.params.id), eq(lives.userId, userId))).limit(1);
    if (!existing.length) return res.status(404).json({ error: "Live não encontrada" });
    const updateData = { ...req.body };
    if (updateData.botEnabled !== undefined) {
      updateData.botEnabled = updateData.botEnabled ? 1 : 0;
    }
    await db.update(lives).set(updateData).where(eq(lives.id, req.params.id));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Erro ao atualizar live" }); }
});

apiRouter.delete("/lives/:id", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    await db.delete(lives).where(and(eq(lives.id, req.params.id), eq(lives.userId, userId)));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Erro ao excluir live" }); }
});


apiRouter.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (user.length === 0 || !(await bcrypt.compare(password, user[0].password))) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = signAuthToken(user[0].id);
    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production" });
    res.json({ token, user: { id: user[0].id, name: user[0].name, email: user[0].email } });
  } catch (error) {
    res.status(500).json({ error: "Erro ao fazer login" });
  }
});

apiRouter.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user.length) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json({ user: { id: user[0].id, name: user[0].name, email: user[0].email } });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar usuário" });
  }
});

apiRouter.post("/auth/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});

// DEV BYPASS: Auto-login to skip login screen during testing
apiRouter.get("/auth/dev-bypass", async (req, res) => {
  try {
    const email = "admin@livecommerce.com";
    let user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    let userId = "";
    let userName = "Admin (Teste)";
    if (user.length === 0) {
      userId = uuidv4();
      await db.insert(users).values({
        id: userId,
        name: userName,
        email,
        password: await bcrypt.hash("123456", 10),
      });
    } else {
      userId = user[0].id;
      userName = user[0].name;
    }

    const token = signAuthToken(userId);
    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production" });
    res.json({ token, user: { id: userId, name: userName, email } });
  } catch (error) {
    res.status(500).json({ error: "Erro no bypass de login" });
  }
});

// --- PUBLIC ROUTES ---
apiRouter.get("/public/lives", async (req, res) => {
  try {
    const allLives = await db.select().from(lives).orderBy(desc(lives.createdAt));
    res.json({ lives: allLives });
  } catch (error) {
    console.error("Erro /public/lives", error);
    res.status(500).json({ error: "Erro ao buscar lives" });
  }
});

// --- LIVES ROUTES (Influencer) ---
apiRouter.post("/lives", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { title, description, productName, productPrice, videoUrl, status, botEnabled } = req.body;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();
    
    const liveId = uuidv4();
    await db.insert(lives).values({
      id: liveId,
      userId,
      slug,
      title,
      description,
      productName,
      productPrice,
      videoUrl,
      status: status || "draft",
      botEnabled: botEnabled !== undefined ? (botEnabled ? 1 : 0) : 1,
    });
    res.json({ id: liveId, slug });
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar live" });
  }
});

apiRouter.get("/lives", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const userLives = await db.select().from(lives).where(eq(lives.userId, userId)).orderBy(desc(lives.createdAt));
    res.json(userLives);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar lives" });
  }
});

apiRouter.get("/lives/:id", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const live = await db.select().from(lives).where(and(eq(lives.id, id), eq(lives.userId, userId))).limit(1);
    if (!live.length) return res.status(404).json({ error: "Live não encontrada" });
    
    const events = await db.select().from(videoEvents).where(eq(videoEvents.liveId, id));
    res.json({ ...live[0], events });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar live" });
  }
});

// --- UPLOAD VIDEO ---
apiRouter.post("/videos/upload", requireAuth, videoUploadMiddleware.single("video") as any, async (req: any, res: any) => {
  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });
  try {
    const result = await videoService.uploadVideo(req.file);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Erro ao salvar vídeo" });
  }
});

apiRouter.get("/lives/:id/products", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const owned = await db.select().from(lives).where(and(eq(lives.id, req.params.id), eq(lives.userId, userId))).limit(1);
  if (!owned.length) return res.status(404).json({ error: "Live não encontrada" });
  const rows = await db.select({ timeline: liveProductTimeline, product: products })
    .from(liveProductTimeline).innerJoin(products, eq(liveProductTimeline.productId, products.id))
    .where(eq(liveProductTimeline.liveId, req.params.id));
  res.json(rows.map((row) => ({ ...row.timeline, product: row.product })));
});

apiRouter.post("/lives/:id/products", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const owned = await db.select().from(lives).where(and(eq(lives.id, req.params.id), eq(lives.userId, userId))).limit(1);
    if (!owned.length) return res.status(404).json({ error: "Live não encontrada" });
    const { productId, startTime = 0, endTime = 60, displayOrder = 0, showOnVideo = true, duration } = req.body;
    const start = Math.floor(Number(startTime));
    const end = Math.floor(Number(endTime));
    const videoDuration = Math.floor(Number(duration));
    const product = await db.select().from(products).where(and(eq(products.id, productId), eq(products.userId, userId))).limit(1);
    if (!product.length) return res.status(400).json({ error: "Produto inválido" });
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) return res.status(400).json({ error: "O fim deve ser maior que o início" });
    if (Number.isFinite(videoDuration) && videoDuration > 0 && (start > videoDuration || end > videoDuration)) return res.status(400).json({ error: "O intervalo não pode ultrapassar a duração do vídeo" });
    const existing = await db.select().from(liveProductTimeline).where(eq(liveProductTimeline.liveId, req.params.id));
    if (existing.some((item) => start < item.endTime && end > item.startTime)) return res.status(409).json({ error: "Este horário já está ocupado" });
    const id = uuidv4();
    await db.insert(liveProductTimeline).values({ id, liveId: req.params.id, productId, startTime: start, endTime: end, displayOrder: Number(displayOrder), showOnVideo: showOnVideo ? 1 : 0 });
    const attached = await db.select().from(liveProducts).where(and(eq(liveProducts.liveId, req.params.id), eq(liveProducts.productId, productId))).limit(1);
    if (!attached.length) await db.insert(liveProducts).values({ id: uuidv4(), liveId: req.params.id, productId });
    res.status(201).json({ id });
  } catch { res.status(500).json({ error: "Erro ao adicionar produto à live" }); }
});

apiRouter.put("/lives/:id/products/:timelineId", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const owned = await db.select().from(lives).where(and(eq(lives.id, req.params.id), eq(lives.userId, userId))).limit(1);
    if (!owned.length) return res.status(404).json({ error: "Live não encontrada" });
    const current = await db.select().from(liveProductTimeline).where(and(eq(liveProductTimeline.id, req.params.timelineId), eq(liveProductTimeline.liveId, req.params.id))).limit(1);
    if (!current.length) return res.status(404).json({ error: "Item não encontrado" });
    const start = Math.floor(Number(req.body.startTime));
    const end = Math.floor(Number(req.body.endTime));
    const videoDuration = Math.floor(Number(req.body.duration));
    const productId = req.body.productId || current[0].productId;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) return res.status(400).json({ error: "Intervalo de tempo inválido" });
    if (Number.isFinite(videoDuration) && videoDuration > 0 && (start > videoDuration || end > videoDuration)) return res.status(400).json({ error: "O intervalo não pode ultrapassar a duração do vídeo" });
    const product = await db.select().from(products).where(and(eq(products.id, productId), eq(products.userId, userId))).limit(1);
    if (!product.length) return res.status(400).json({ error: "Produto inválido" });
    const existing = await db.select().from(liveProductTimeline).where(eq(liveProductTimeline.liveId, req.params.id));
    if (existing.some((item) => item.id !== req.params.timelineId && start < item.endTime && end > item.startTime)) return res.status(409).json({ error: "Este horário já está ocupado" });
    await db.update(liveProductTimeline).set({ productId, startTime: start, endTime: end, showOnVideo: req.body.showOnVideo ? 1 : 0, updatedAt: new Date().toISOString() }).where(eq(liveProductTimeline.id, req.params.timelineId));
    const attached = await db.select().from(liveProducts).where(and(eq(liveProducts.liveId, req.params.id), eq(liveProducts.productId, productId))).limit(1);
    if (!attached.length) await db.insert(liveProducts).values({ id: uuidv4(), liveId: req.params.id, productId });
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Erro ao atualizar timeline" }); }
});

apiRouter.delete("/lives/:id/products/:timelineId", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const owned = await db.select().from(lives).where(and(eq(lives.id, req.params.id), eq(lives.userId, userId))).limit(1);
    if (!owned.length) return res.status(404).json({ error: "Live não encontrada" });
    await db.delete(liveProductTimeline).where(and(eq(liveProductTimeline.id, req.params.timelineId), eq(liveProductTimeline.liveId, req.params.id)));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Erro ao remover produto da live" }); }
});

// ─── VIDEO EVENTS (popup events on video) ─────────────────────────────────────

apiRouter.get("/lives/:id/events", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const owned = await db.select().from(lives).where(and(eq(lives.id, req.params.id), eq(lives.userId, userId))).limit(1);
    if (!owned.length) return res.status(404).json({ error: "Live não encontrada" });
    const events = await db.select().from(videoEvents).where(eq(videoEvents.liveId, req.params.id)).orderBy(asc(videoEvents.timeSeconds));
    res.json(events);
  } catch { res.status(500).json({ error: "Erro ao buscar eventos" }); }
});

apiRouter.post("/lives/:id/events", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const owned = await db.select().from(lives).where(and(eq(lives.id, req.params.id), eq(lives.userId, userId))).limit(1);
    if (!owned.length) return res.status(404).json({ error: "Live não encontrada" });
    const { type, timeSeconds, message, buyerName } = req.body;
    if (!type || !message || !message.trim()) return res.status(400).json({ error: "Tipo e mensagem são obrigatórios" });
    if (!Number.isFinite(Number(timeSeconds)) || Number(timeSeconds) < 0) return res.status(400).json({ error: "Tempo inválido" });
    const id = uuidv4();
    await db.insert(videoEvents).values({
      id,
      liveId: req.params.id,
      type: String(type),
      timeSeconds: Math.floor(Number(timeSeconds)),
      message: String(message).trim().slice(0, 300),
      buyerName: buyerName ? String(buyerName).trim().slice(0, 100) : null,
      enabled: 1,
    });
    res.status(201).json({ id });
  } catch { res.status(500).json({ error: "Erro ao criar evento" }); }
});

apiRouter.put("/lives/:id/events/:eventId", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const owned = await db.select().from(lives).where(and(eq(lives.id, req.params.id), eq(lives.userId, userId))).limit(1);
    if (!owned.length) return res.status(404).json({ error: "Live não encontrada" });
    const { type, timeSeconds, message, buyerName, enabled } = req.body;
    await db.update(videoEvents).set({
      type: type ? String(type) : undefined,
      timeSeconds: timeSeconds !== undefined ? Math.floor(Number(timeSeconds)) : undefined,
      message: message ? String(message).trim().slice(0, 300) : undefined,
      buyerName: buyerName !== undefined ? (buyerName ? String(buyerName).trim().slice(0, 100) : null) : undefined,
      enabled: enabled !== undefined ? (enabled ? 1 : 0) : undefined,
    }).where(and(eq(videoEvents.id, req.params.eventId), eq(videoEvents.liveId, req.params.id)));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Erro ao atualizar evento" }); }
});

apiRouter.delete("/lives/:id/events/:eventId", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const owned = await db.select().from(lives).where(and(eq(lives.id, req.params.id), eq(lives.userId, userId))).limit(1);
    if (!owned.length) return res.status(404).json({ error: "Live não encontrada" });
    await db.delete(videoEvents).where(and(eq(videoEvents.id, req.params.eventId), eq(videoEvents.liveId, req.params.id)));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Erro ao excluir evento" }); }
});

// ─── ORDERS (admin view) ──────────────────────────────────────────────────────

apiRouter.get("/lives/:id/orders", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const owned = await db.select().from(lives).where(and(eq(lives.id, req.params.id), eq(lives.userId, userId))).limit(1);
    if (!owned.length) return res.status(404).json({ error: "Live não encontrada" });
    const rows = await db
      .select({
        order: orders,
        product: { id: products.id, name: products.name, imageUrl: products.imageUrl },
        visitor: { id: visitors.id, name: visitors.name },
      })
      .from(orders)
      .leftJoin(products, eq(orders.productId, products.id))
      .leftJoin(visitors, eq(orders.visitorId, visitors.id))
      .where(eq(orders.liveId, req.params.id))
      .orderBy(desc(orders.createdAt));
    res.json(rows.map(r => ({ ...r.order, product: r.product, visitor: r.visitor })));
  } catch { res.status(500).json({ error: "Erro ao buscar pedidos" }); }
});

apiRouter.put("/lives/:id/orders/:orderId", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const owned = await db.select().from(lives).where(and(eq(lives.id, req.params.id), eq(lives.userId, userId))).limit(1);
    if (!owned.length) return res.status(404).json({ error: "Live não encontrada" });
    const { status, paymentStatus } = req.body;
    await db.update(orders).set({
      ...(status ? { status } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
    }).where(and(eq(orders.id, req.params.orderId), eq(orders.liveId, req.params.id)));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Erro ao atualizar pedido" }); }
});

// ─── ADMIN CHAT ───────────────────────────────────────────────────────────────

apiRouter.get("/lives/:id/admin-chat", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const owned = await db.select().from(lives).where(and(eq(lives.id, req.params.id), eq(lives.userId, userId))).limit(1);
    if (!owned.length) return res.status(404).json({ error: "Live não encontrada" });
    const messages = await db.select().from(chatMessages).where(eq(chatMessages.liveId, req.params.id)).orderBy(asc(chatMessages.createdAt)).limit(200);
    res.json(messages);
  } catch { res.status(500).json({ error: "Erro ao buscar chat" }); }
});

apiRouter.post("/lives/:id/admin-chat", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const owned = await db.select().from(lives).where(and(eq(lives.id, req.params.id), eq(lives.userId, userId))).limit(1);
    if (!owned.length) return res.status(404).json({ error: "Live não encontrada" });
    const { message, senderName } = req.body;
    if (!message || !String(message).trim()) return res.status(400).json({ error: "Mensagem não pode ser vazia" });
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const name = senderName || (user[0]?.name ?? "Admin");
    const id = uuidv4();
    const created = {
      id,
      liveId: req.params.id,
      senderName: String(name).trim(),
      message: String(message).trim().slice(0, 500),
      senderType: "influencer",
      createdAt: new Date().toISOString(),
    };
    await db.insert(chatMessages).values(created);
    res.status(201).json(created);
  } catch { res.status(500).json({ error: "Erro ao enviar mensagem" }); }
});

// ─── STATS (dashboard tools) ──────────────────────────────────────────────────

apiRouter.get("/lives/:id/stats", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const owned = await db.select().from(lives).where(and(eq(lives.id, req.params.id), eq(lives.userId, userId))).limit(1);
    if (!owned.length) return res.status(404).json({ error: "Live não encontrada" });
    const [allOrders, allVisitors, allMessages] = await Promise.all([
      db.select().from(orders).where(eq(orders.liveId, req.params.id)),
      db.select().from(visitors).where(eq(visitors.liveId, req.params.id)),
      db.select().from(chatMessages).where(eq(chatMessages.liveId, req.params.id)),
    ]);
    const confirmed = allOrders.filter(o => o.status === "confirmed");
    const totalRevenue = allOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const confirmedRevenue = confirmed.reduce((sum, o) => sum + Number(o.total || 0), 0);
    res.json({
      totalOrders: allOrders.length,
      confirmedOrders: confirmed.length,
      totalRevenue,
      confirmedRevenue,
      totalVisitors: allVisitors.length,
      buyers: allVisitors.filter(v => v.buyerStatus === "buyer").length,
      totalMessages: allMessages.length,
    });
  } catch { res.status(500).json({ error: "Erro ao buscar stats" }); }
});
