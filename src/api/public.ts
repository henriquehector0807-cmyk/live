import { apiRouter } from "./index";
import { db } from "../db/index";
import { lives, videoEvents, visitors, chatMessages, orders, products, liveProducts, liveProductTimeline, paymentSettings } from "../db/schema";
import { eq, and, asc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// Get Public Live Details
apiRouter.get("/public/live/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const live = await db.select().from(lives).where(eq(lives.slug, slug)).limit(1);
    if (!live.length) return res.status(404).json({ error: "Live não encontrada" });
    
    const events = await db.select().from(videoEvents).where(eq(videoEvents.liveId, live[0].id));
    const attached = await db.select({ product: products }).from(liveProducts).innerJoin(products, eq(liveProducts.productId, products.id)).where(eq(liveProducts.liveId, live[0].id));
    const timeline = await db.select({ timeline: liveProductTimeline, product: products })
      .from(liveProductTimeline)
      .innerJoin(products, eq(liveProductTimeline.productId, products.id))
      .where(eq(liveProductTimeline.liveId, live[0].id));

    // Check if live owner has Mercado Pago active
    const userPayment = await db.select().from(paymentSettings).where(eq(paymentSettings.userId, live[0].userId)).limit(1);
    const envToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const isMpActive = (userPayment.length > 0 && userPayment[0].isEnabled === 1 && !!userPayment[0].mpAccessToken) || (!!envToken && (!userPayment.length || userPayment[0].isEnabled === 1));

    res.json({
      live: live[0],
      events,
      products: attached.map((row) => row.product),
      timeline: timeline.map((row) => ({ ...row.timeline, product: row.product })),
      mercadoPagoEnabled: isMpActive,
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar live pública" });
  }
});

// Identify/Register Visitor
apiRouter.post("/public/visitor", async (req, res) => {
  try {
    const { liveId, sessionId, name } = req.body;
    let visitor = await db.select().from(visitors).where(and(eq(visitors.liveId, liveId), eq(visitors.sessionId, sessionId))).limit(1);
    
    if (visitor.length) {
      if (name && !visitor[0].name) {
        await db.update(visitors).set({ name }).where(eq(visitors.id, visitor[0].id));
        
        // Auto-welcome message
        const visitorName = typeof name === "string" ? name.trim() : "Visitante";
  const welcomeMsg = visitorName.endsWith("a") ? `Seja bem-vinda, ${visitorName}!` : `Seja bem-vindo(a), ${visitorName}!`;
        await db.insert(chatMessages).values({
          id: uuidv4(),
          liveId,
          senderName: "Sistema",
          message: welcomeMsg,
          senderType: "system",
        });
      }
    } else {
      await db.insert(visitors).values({
        id: uuidv4(),
        liveId,
        sessionId,
        name: name || null,
      });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao registrar visitante" });
  }
});

// Submit an Order (Creates order with status pending_payment and returns paymentUrl)
apiRouter.post("/public/order", async (req, res) => {
  try {
    const {
      liveId,
      sessionId,
      productId,
      quantity = 1,
      customerName,
      customerPhone,
      customerEmail,
      shippingAddress,
      shipping = 0,
    } = req.body;
    
    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    if (!liveId || !sessionId || !productId) {
      return res.status(400).json({ error: "Dados do pedido inválidos" });
    }

    let visitor = await db.select().from(visitors).where(and(eq(visitors.liveId, liveId), eq(visitors.sessionId, sessionId))).limit(1);
    if (!visitor.length) {
      const newVisitorId = uuidv4();
      await db.insert(visitors).values({
        id: newVisitorId,
        liveId,
        sessionId,
        name: customerName || "Comprador",
        buyerStatus: "interested",
      });
      visitor = await db.select().from(visitors).where(eq(visitors.id, newVisitorId)).limit(1);
    } else if (customerName && !visitor[0].name) {
      await db.update(visitors).set({ name: customerName }).where(eq(visitors.id, visitor[0].id));
    }

    const live = await db.select().from(lives).where(eq(lives.id, liveId)).limit(1);
    if (!live.length) return res.status(404).json({ error: "Live não encontrada" });

    const product = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product.length) return res.status(404).json({ error: "Produto não encontrado" });

    const unitPrice = Number(product[0].promotionalPrice ?? product[0].price);
    const stock = Number(product[0].stock || 0);
    const shippingValue = Math.max(0, Number(shipping) || Number(product[0].shippingPrice || 0));
    const total = qty * unitPrice + shippingValue;
    const orderId = uuidv4();
    const buyerName = String(customerName || visitor[0].name || "Comprador").trim();
    const formattedAddress = typeof shippingAddress === 'object' ? JSON.stringify(shippingAddress) : String(shippingAddress || '');

    await db.transaction(async (tx) => {
      if (stock >= qty) {
        await tx.update(products).set({ stock: stock - qty, updatedAt: new Date().toISOString() }).where(eq(products.id, productId));
      }
      await tx.insert(orders).values({
        id: orderId,
        liveId,
        visitorId: visitor[0].id,
        productId,
        buyerName,
        customerPhone: customerPhone ? String(customerPhone).trim() : null,
        customerEmail: customerEmail ? String(customerEmail).trim() : null,
        shippingAddress: formattedAddress || null,
        quantity: qty,
        unitPrice,
        total,
        status: "pending_payment",
        paymentStatus: "pending_payment",
      });
    });

    // Update visitor status to buyer
    await db.update(visitors).set({ buyerStatus: "buyer" }).where(eq(visitors.id, visitor[0].id));

    res.json({
      success: true,
      orderId,
      status: "pending_payment",
      paymentUrl: product[0].paymentUrl || null,
    });
  } catch (error) {
    console.error("[Order Error]", error);
    res.status(500).json({ error: "Erro ao processar pedido" });
  }
});

// Enviar mensagem real de visitante
apiRouter.post("/public/chat/:liveId", async (req, res) => {
  try {
    const { liveId } = req.params;
    const { sessionId, message } = req.body;
    if (typeof sessionId !== "string" || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Mensagem inválida" });
    }

    // Auto-create visitor if not found (prevents 404 errors)
    let visitor = await db.select().from(visitors).where(and(eq(visitors.liveId, liveId), eq(visitors.sessionId, sessionId))).limit(1);
    if (!visitor.length) {
      const newVisitorId = uuidv4();
      await db.insert(visitors).values({
        id: newVisitorId,
        liveId,
        sessionId,
        name: "Visitante",
        buyerStatus: "visitor",
      });
      visitor = await db.select().from(visitors).where(eq(visitors.id, newVisitorId)).limit(1);
    }

    const created = {
      id: uuidv4(),
      liveId,
      visitorId: visitor[0].id,
      senderName: visitor[0].name || "Visitante",
      message: message.trim().slice(0, 500),
      senderType: "viewer",
      createdAt: new Date().toISOString(),
    } as const;
    await db.insert(chatMessages).values(created);
    res.status(201).json(created);
  } catch (error) {
    console.error("[v0] Erro ao enviar mensagem:", error);
    res.status(500).json({ error: "Erro ao enviar mensagem" });
  }
});

// Get Live Chat Messages
apiRouter.get("/public/chat/:liveId", async (req, res) => {
  try {
    const { liveId } = req.params;
    const messages = await db.select().from(chatMessages).where(eq(chatMessages.liveId, liveId)).orderBy(asc(chatMessages.createdAt));
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Erro ao carregar chat" });
  }
});
