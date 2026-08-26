import express from "express";
import { v4 as uuidv4 } from "uuid";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index";
import { paymentSettings, orders, products, visitors, lives, users } from "../db/schema";
import { requireAuth } from "./auth";
import { MercadoPagoService } from "../services/mercadoPagoService";

export const paymentsRouter = express.Router();

// Helper to get active Mercado Pago token for a user or fallback to env
async function getMpTokenForUser(userId?: string): Promise<{ token: string | null; publicKey?: string | null; isEnabled: boolean }> {
  if (userId) {
    const userSettings = await db
      .select()
      .from(paymentSettings)
      .where(eq(paymentSettings.userId, userId))
      .limit(1);

    if (userSettings.length > 0 && userSettings[0].mpAccessToken) {
      return {
        token: userSettings[0].mpAccessToken,
        publicKey: userSettings[0].mpPublicKey,
        isEnabled: userSettings[0].isEnabled === 1,
      };
    }
  }

  // Fallback to environment variable
  const envToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const envPublicKey = process.env.MERCADOPAGO_PUBLIC_KEY;
  if (envToken) {
    return {
      token: envToken,
      publicKey: envPublicKey || null,
      isEnabled: true,
    };
  }

  return { token: null, isEnabled: false };
}

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────

// GET /api/payments/settings
paymentsRouter.get("/settings", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const settings = await db
      .select()
      .from(paymentSettings)
      .where(eq(paymentSettings.userId, userId))
      .limit(1);

    const envToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (settings.length === 0) {
      return res.json({
        hasToken: !!envToken,
        maskedToken: envToken ? `${envToken.slice(0, 10)}...${envToken.slice(-4)}` : "",
        publicKey: process.env.MERCADOPAGO_PUBLIC_KEY || "",
        isEnabled: true,
        isEnvToken: !!envToken,
      });
    }

    const current = settings[0];
    const token = current.mpAccessToken || envToken || "";
    const maskedToken = token ? `${token.slice(0, 10)}...${token.slice(-4)}` : "";

    res.json({
      hasToken: !!token,
      maskedToken,
      publicKey: current.mpPublicKey || process.env.MERCADOPAGO_PUBLIC_KEY || "",
      isEnabled: current.isEnabled === 1,
      isEnvToken: !current.mpAccessToken && !!envToken,
    });
  } catch (error) {
    console.error("[GET /payments/settings error]", error);
    res.status(500).json({ error: "Erro ao buscar configurações de pagamento" });
  }
});

// PUT /api/payments/settings
paymentsRouter.put("/settings", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { mpAccessToken, mpPublicKey, isEnabled } = req.body;

    const existing = await db
      .select()
      .from(paymentSettings)
      .where(eq(paymentSettings.userId, userId))
      .limit(1);

    const isEnabledVal = isEnabled !== undefined ? (isEnabled ? 1 : 0) : 1;

    if (existing.length === 0) {
      await db.insert(paymentSettings).values({
        id: uuidv4(),
        userId,
        mpAccessToken: mpAccessToken !== undefined ? String(mpAccessToken).trim() : null,
        mpPublicKey: mpPublicKey !== undefined ? String(mpPublicKey).trim() : null,
        isEnabled: isEnabledVal,
      });
    } else {
      const updateData: any = {
        isEnabled: isEnabledVal,
        updatedAt: new Date().toISOString(),
      };
      if (mpAccessToken !== undefined && mpAccessToken !== null && mpAccessToken !== "") {
        updateData.mpAccessToken = String(mpAccessToken).trim();
      }
      if (mpPublicKey !== undefined) {
        updateData.mpPublicKey = String(mpPublicKey).trim();
      }
      await db.update(paymentSettings).set(updateData).where(eq(paymentSettings.userId, userId));
    }

    res.json({ success: true, message: "Configurações de pagamento salvas com sucesso!" });
  } catch (error) {
    console.error("[PUT /payments/settings error]", error);
    res.status(500).json({ error: "Erro ao salvar configurações de pagamento" });
  }
});

// POST /api/payments/test
paymentsRouter.post("/test", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { token } = req.body;

    let testToken = token;
    if (!testToken) {
      const { token: savedToken } = await getMpTokenForUser(userId);
      testToken = savedToken;
    }

    if (!testToken) {
      return res.status(400).json({ valid: false, message: "Nenhum Access Token informado ou configurado." });
    }

    const mpService = new MercadoPagoService(testToken);
    const result = await mpService.testCredentials();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ valid: false, message: error.message || "Erro ao testar credenciais." });
  }
});

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

// POST /api/public/order/pix
paymentsRouter.post("/public/order/pix", async (req, res) => {
  try {
    const {
      liveId,
      sessionId,
      productId,
      quantity = 1,
      customerName,
      customerCpf,
      customerPhone,
      customerEmail,
      shippingAddress,
      shipping = 0,
    } = req.body;

    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    if (!liveId || !sessionId || !productId) {
      return res.status(400).json({ error: "Parâmetros da compra incompletos." });
    }

    const cleanCpf = (customerCpf || "").replace(/\D/g, "");
    if (!cleanCpf || cleanCpf.length !== 11) {
      return res.status(400).json({ error: "CPF válido (11 dígitos) é obrigatório para emissão de PIX." });
    }

    // Find Live and Product
    const live = await db.select().from(lives).where(eq(lives.id, liveId)).limit(1);
    if (!live.length) return res.status(404).json({ error: "Live não encontrada" });

    const product = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product.length) return res.status(404).json({ error: "Produto não encontrado" });

    // Check stock
    const stock = Number(product[0].stock || 0);
    if (stock < qty) {
      return res.status(400).json({ error: "Estoque insuficiente para este produto." });
    }

    // Get live owner's Mercado Pago token
    const { token: mpToken, isEnabled } = await getMpTokenForUser(live[0].userId);
    if (!mpToken || !isEnabled) {
      return res.status(400).json({
        error: "O meio de pagamento Mercado Pago não está configurado nesta live.",
        paymentUrl: product[0].paymentUrl || null,
      });
    }

    // Visitor
    let visitor = await db
      .select()
      .from(visitors)
      .where(and(eq(visitors.liveId, liveId), eq(visitors.sessionId, sessionId)))
      .limit(1);

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

    const unitPrice = Number(product[0].promotionalPrice ?? product[0].price);
    const shippingValue = Math.max(0, Number(shipping) || Number(product[0].shippingPrice || 0));
    const total = qty * unitPrice + shippingValue;
    const orderId = uuidv4();

    const formattedAddress = typeof shippingAddress === "object" ? JSON.stringify(shippingAddress) : String(shippingAddress || "");

    // Generate PIX via Mercado Pago
    const mpService = new MercadoPagoService(mpToken);
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
    const notificationUrl = appUrl.startsWith("https://") ? `${appUrl}/api/webhooks/mercadopago` : undefined;

    const pixResult = await mpService.createPixPayment({
      amount: total,
      description: `${product[0].name} (${qty}x) - Live Commerce`,
      payer: {
        email: customerEmail || `cliente_${Date.now()}@livecommerce.com`,
        name: customerName || "Comprador",
        cpf: cleanCpf,
      },
      externalReference: orderId,
      notificationUrl,
    });

    // Save order in database
    await db.transaction(async (tx) => {
      if (stock >= qty) {
        await tx.update(products).set({ stock: stock - qty, updatedAt: new Date().toISOString() }).where(eq(products.id, productId));
      }
      await tx.insert(orders).values({
        id: orderId,
        liveId,
        visitorId: visitor[0].id,
        productId,
        buyerName: String(customerName || visitor[0].name || "Comprador").trim(),
        customerPhone: customerPhone ? String(customerPhone).trim() : null,
        customerEmail: customerEmail ? String(customerEmail).trim() : null,
        customerCpf: cleanCpf,
        shippingAddress: formattedAddress || null,
        quantity: qty,
        unitPrice,
        total,
        status: "pending_payment",
        paymentStatus: "pending_payment",
        paymentMethod: "pix",
        mpPaymentId: pixResult.id,
        mpStatus: pixResult.status,
        qrCode: pixResult.qrCode || null,
        qrCodeBase64: pixResult.qrCodeBase64 || null,
        ticketUrl: pixResult.ticketUrl || null,
      });
    });

    // Update visitor status
    await db.update(visitors).set({ buyerStatus: "buyer" }).where(eq(visitors.id, visitor[0].id));

    res.status(201).json({
      success: true,
      orderId,
      mpPaymentId: pixResult.id,
      qrCode: pixResult.qrCode,
      qrCodeBase64: pixResult.qrCodeBase64,
      ticketUrl: pixResult.ticketUrl,
      total,
      status: "pending_payment",
    });
  } catch (error: any) {
    console.error("[PIX Order Error]", error);
    res.status(500).json({ error: error.message || "Erro ao processar pagamento PIX" });
  }
});

// GET /api/public/order/:orderId/status
paymentsRouter.get("/public/order/:orderId/status", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order.length) return res.status(404).json({ error: "Pedido não encontrado" });

    const currentOrder = order[0];

    // If already confirmed, return directly
    if (currentOrder.paymentStatus === "paid" || currentOrder.status === "confirmed") {
      return res.json({
        orderId,
        status: "confirmed",
        paymentStatus: "paid",
        isPaid: true,
        mpStatus: currentOrder.mpStatus || "approved",
      });
    }

    // If we have an mpPaymentId, check latest status on Mercado Pago
    if (currentOrder.mpPaymentId) {
      const live = await db.select().from(lives).where(eq(lives.id, currentOrder.liveId)).limit(1);
      const { token: mpToken } = await getMpTokenForUser(live[0]?.userId);

      if (mpToken) {
        try {
          const mpService = new MercadoPagoService(mpToken);
          const mpData = await mpService.getPayment(currentOrder.mpPaymentId);

          if (mpData.isApproved) {
            // Update order to paid and confirmed!
            await db
              .update(orders)
              .set({
                status: "confirmed",
                paymentStatus: "paid",
                mpStatus: "approved",
              })
              .where(eq(orders.id, orderId));

            return res.json({
              orderId,
              status: "confirmed",
              paymentStatus: "paid",
              isPaid: true,
              mpStatus: "approved",
            });
          } else if (mpData.status !== currentOrder.mpStatus) {
            await db
              .update(orders)
              .set({ mpStatus: mpData.status })
              .where(eq(orders.id, orderId));
          }
        } catch (mpError) {
          console.warn("[MP Status Check Warn]", mpError);
        }
      }
    }

    res.json({
      orderId,
      status: currentOrder.status,
      paymentStatus: currentOrder.paymentStatus,
      isPaid: false,
      mpStatus: currentOrder.mpStatus || "pending",
    });
  } catch (error) {
    console.error("[Order Status Check Error]", error);
    res.status(500).json({ error: "Erro ao consultar status do pedido" });
  }
});

// POST /api/webhooks/mercadopago
paymentsRouter.post("/webhooks/mercadopago", async (req, res) => {
  try {
    const topic = req.query.topic || req.body.type || req.body.action;
    const paymentId = req.query.id || req.body.data?.id || req.body.id;

    if (paymentId && (topic === "payment" || String(topic).includes("payment"))) {
      // Find order by mpPaymentId
      const order = await db
        .select()
        .from(orders)
        .where(eq(orders.mpPaymentId, String(paymentId)))
        .limit(1);

      if (order.length > 0) {
        const live = await db.select().from(lives).where(eq(lives.id, order[0].liveId)).limit(1);
        const { token: mpToken } = await getMpTokenForUser(live[0]?.userId);

        if (mpToken) {
          const mpService = new MercadoPagoService(mpToken);
          const mpData = await mpService.getPayment(String(paymentId));

          if (mpData.isApproved) {
            await db
              .update(orders)
              .set({
                status: "confirmed",
                paymentStatus: "paid",
                mpStatus: "approved",
              })
              .where(eq(orders.id, order[0].id));
            console.log(`[MercadoPago Webhook] Pedido ${order[0].id} atualizado para PAGO (Aprovado)!`);
          }
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("[MercadoPago Webhook Error]", error);
    res.status(200).json({ received: true }); // Always return 200 to MP
  }
});
