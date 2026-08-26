import express, { Request, Response } from "express";
import { db } from "../db/index";
import { aiSettings, productAiSettings, aiChatLogs, products, lives, chatMessages, visitors } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "./auth";
import { getEffectiveAiSettings, buildSystemPrompt, queryOpenRouter, logAiChat } from "../services/aiService";

export const aiRouter = express.Router();

// ── GET AI SETTINGS (ADMIN) ──────────────────────────────────
aiRouter.get("/settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const settings = await getEffectiveAiSettings(userId);
    
    // Mask API key for security
    const maskedKey = settings.apiKey
      ? settings.apiKey.length > 8
        ? `${settings.apiKey.slice(0, 4)}...${settings.apiKey.slice(-4)}`
        : "••••••••"
      : "";

    res.json({
      hasApiKey: Boolean(settings.apiKey),
      maskedApiKey: maskedKey,
      model: settings.model,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      isEnabled: settings.isEnabled,
      tone: settings.tone,
      economicMode: settings.economicMode,
      isEnvKey: !settings.raw?.openRouterApiKey && Boolean(process.env.OPENROUTER_API_KEY)
    });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao buscar configurações de IA" });
  }
});

// ── UPDATE AI SETTINGS (ADMIN) ───────────────────────────────
aiRouter.put("/settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { openRouterApiKey, model, temperature, maxTokens, isEnabled, tone, economicMode } = req.body;

    const existing = await db.select().from(aiSettings).where(eq(aiSettings.userId, userId)).limit(1);

    const valuesToUpdate: any = {
      model: model || "meta-llama/llama-3.3-70b-instruct:free",
      temperature: typeof temperature === "number" && !isNaN(temperature) ? Math.max(0, Math.min(2, temperature)) : 0.3,
      maxTokens: typeof maxTokens === "number" && !isNaN(maxTokens) ? Math.max(10, Math.min(2048, maxTokens)) : 150,
      isEnabled: isEnabled !== undefined ? (isEnabled ? 1 : 0) : 1,
      tone: tone || "amigavel",
      economicMode: economicMode !== undefined ? (economicMode ? 1 : 0) : 1,
      updatedAt: new Date().toISOString()
    };

    // Only update API key if provided explicitly (not empty string / mask)
    if (typeof openRouterApiKey === "string" && !openRouterApiKey.includes("...") && openRouterApiKey.trim().length > 0) {
      valuesToUpdate.openRouterApiKey = openRouterApiKey.trim();
    }

    if (existing.length > 0) {
      await db.update(aiSettings).set(valuesToUpdate).where(eq(aiSettings.userId, userId));
    } else {
      await db.insert(aiSettings).values({
        id: uuidv4(),
        userId,
        openRouterApiKey: (typeof openRouterApiKey === "string" && !openRouterApiKey.includes("...") && openRouterApiKey.trim().length > 0) ? openRouterApiKey.trim() : null,
        ...valuesToUpdate,
        createdAt: new Date().toISOString()
      });
    }

    return res.status(200).json({ success: true, message: "Configurações de IA salvas com sucesso" });
  } catch (err: any) {
    console.error("[PUT /api/ai/settings error]", err);
    return res.status(500).json({ error: err.message || "Erro ao salvar configurações de IA" });
  }
});

// ── GET ALL PRODUCTS WITH AI STATUS (ADMIN) ──────────────────
aiRouter.get("/products", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const allProducts = await db.select().from(products).where(eq(products.userId, userId)).orderBy(desc(products.createdAt));

    const enriched = await Promise.all(
      allProducts.map(async (prod) => {
        const aiConf = await db.select().from(productAiSettings).where(eq(productAiSettings.productId, prod.id)).limit(1);
        return {
          ...prod,
          aiConfig: aiConf[0] || null,
          aiEnabled: aiConf[0] ? Boolean(aiConf[0].isEnabled) : false,
        };
      })
    );

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao listar produtos para IA" });
  }
});

// ── GET PRODUCT AI CONFIG (ADMIN) ────────────────────────────
aiRouter.get("/products/:productId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const product = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product.length) return res.status(404).json({ error: "Produto não encontrado" });

    const aiConf = await db.select().from(productAiSettings).where(eq(productAiSettings.productId, productId)).limit(1);

    res.json({
      product: product[0],
      aiConfig: aiConf[0] || {
        productId,
        benefits: "",
        howToUse: "",
        features: "",
        deliveryInfo: "",
        paymentInfo: "",
        exchangePolicy: "",
        additionalInfo: "",
        customInstructions: "",
        allowedTopics: "price,stock,features,benefits,howToUse,delivery,payment,purchase,exchange",
        isEnabled: 1
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao buscar configuração de IA do produto" });
  }
});

// ── UPDATE PRODUCT AI CONFIG (ADMIN) ─────────────────────────
aiRouter.put("/products/:productId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const {
      benefits,
      howToUse,
      features,
      deliveryInfo,
      paymentInfo,
      exchangePolicy,
      additionalInfo,
      customInstructions,
      allowedTopics,
      isEnabled
    } = req.body;

    const existing = await db.select().from(productAiSettings).where(eq(productAiSettings.productId, productId)).limit(1);

    const values = {
      benefits: benefits || "",
      howToUse: howToUse || "",
      features: features || "",
      deliveryInfo: deliveryInfo || "",
      paymentInfo: paymentInfo || "",
      exchangePolicy: exchangePolicy || "",
      additionalInfo: additionalInfo || "",
      customInstructions: customInstructions || "",
      allowedTopics: allowedTopics || "price,stock,features,benefits,howToUse,delivery,payment,purchase,exchange",
      isEnabled: isEnabled !== undefined ? (isEnabled ? 1 : 0) : 1,
      updatedAt: new Date().toISOString()
    };

    if (existing.length > 0) {
      await db.update(productAiSettings).set(values).where(eq(productAiSettings.productId, productId));
    } else {
      await db.insert(productAiSettings).values({
        id: uuidv4(),
        productId,
        ...values,
        createdAt: new Date().toISOString()
      });
    }

    res.json({ success: true, message: "Configurações do produto salvas" });
  } catch (err: any) {
    console.error("[PUT /api/ai/products/:productId error]", err);
    res.status(500).json({ error: "Erro ao salvar configuração de IA do produto" });
  }
});

// ── TEST BOT (ADMIN) ─────────────────────────────────────────
aiRouter.post("/test", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { productId, question, customModel, customTemperature, customMaxTokens, customTone } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: "Digite uma pergunta para testar o Bot." });
    }

    const settings = await getEffectiveAiSettings(userId);
    if (!settings.apiKey) {
      return res.status(400).json({
        error: "Chave API OpenRouter não encontrada. Insira sua chave na seção Configuração da IA acima ou configure a variável OPENROUTER_API_KEY."
      });
    }

    let productData: any = {
      name: "Kit de Cílios Magnéticos",
      price: 47.0,
      promotionalPrice: 39.9,
      stock: 25,
      description: "Kit completo com cílios magnéticos e aplicador especial.",
      deliveryTime: "De 2 a 5 dias úteis"
    };

    let prodAiData: any = null;

    if (productId && productId !== "default") {
      const prodRows = await db.select().from(products).where(eq(products.id, productId)).limit(1);
      if (prodRows.length > 0) productData = prodRows[0];

      const aiRows = await db.select().from(productAiSettings).where(eq(productAiSettings.productId, productId)).limit(1);
      if (aiRows.length > 0) prodAiData = aiRows[0];
    }

    const toneToUse = customTone || settings.tone;
    const modelToUse = customModel || settings.model;
    const tempToUse = typeof customTemperature === "number" ? customTemperature : settings.temperature;
    const maxTokensToUse = typeof customMaxTokens === "number" ? customMaxTokens : settings.maxTokens;

    const systemPrompt = buildSystemPrompt(productData, prodAiData, toneToUse, settings.economicMode);

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: question.trim() }
    ];

    const result = await queryOpenRouter({
      apiKey: settings.apiKey,
      model: modelToUse,
      temperature: tempToUse,
      maxTokens: maxTokensToUse,
      messages
    });

    // Log the test in database
    await logAiChat({
      productId: productId && productId !== "default" ? productId : null,
      model: result.model,
      question: question.trim(),
      answer: result.answer,
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
      totalTokens: result.totalTokens,
      responseTime: result.responseTime,
      status: "success"
    });

    res.json({
      success: true,
      question: question.trim(),
      answer: result.answer,
      model: result.model,
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
      totalTokens: result.totalTokens,
      responseTime: result.responseTime,
      status: 200
    });
  } catch (err: any) {
    console.error("[POST /api/ai/test error]", err);
    
    // Log failure
    await logAiChat({
      productId: req.body?.productId || null,
      model: req.body?.customModel || "unknown",
      question: req.body?.question || "Test",
      status: "error",
      errorMessage: err.message || "Erro desconhecido",
      responseTime: err.responseTime || 0
    });

    res.status(err.status || 500).json({
      error: err.message || "Erro ao conectar com a OpenRouter",
      details: err
    });
  }
});

// ── GET AI CHAT LOGS (ADMIN) ─────────────────────────────────
aiRouter.get("/logs", requireAuth, async (req: Request, res: Response) => {
  try {
    const logs = await db.select().from(aiChatLogs).orderBy(desc(aiChatLogs.createdAt)).limit(50);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao buscar logs de IA" });
  }
});

// ── PUBLIC CHAT ENDPOINT FOR VISITORS ─────────────────────────
// POST /api/ai/chat
aiRouter.post("/chat", async (req: Request, res: Response) => {
  const { liveId, productId, message, conversationId, history } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Mensagem vazia" });
  }

  try {
    // 1. Validate Live
    let liveData = null;
    if (liveId) {
      const liveRows = await db.select().from(lives).where(eq(lives.id, liveId)).limit(1);
      if (liveRows.length > 0) liveData = liveRows[0];
    }

    // Check if bot is active for this live
    if (liveData && liveData.botEnabled === 0) {
      return res.json({ enabled: false, message: "Bot desativado nesta Live." });
    }

    // 2. Load global AI settings
    const settings = await getEffectiveAiSettings(liveData?.userId);
    if (!settings.isEnabled || !settings.apiKey) {
      return res.json({ enabled: false, message: "Bot não configurado." });
    }

    // 3. Load product details & product AI settings
    let productData: any = null;
    let prodAiData: any = null;

    if (productId && productId !== "default") {
      const prodRows = await db.select().from(products).where(eq(products.id, productId)).limit(1);
      if (prodRows.length > 0) productData = prodRows[0];

      const prodAiRows = await db.select().from(productAiSettings).where(eq(productAiSettings.productId, productId)).limit(1);
      if (prodAiRows.length > 0) prodAiData = prodAiRows[0];
    }

    // If product has bot disabled explicitly
    if (prodAiData && prodAiData.isEnabled === 0) {
      return res.json({ enabled: false, message: "Bot desativado para este produto." });
    }

    // Fallback product from Live if none specified
    if (!productData && liveData) {
      productData = {
        name: liveData.productName,
        price: liveData.productPrice,
        stock: 50,
        description: liveData.description || "Produto oficial apresentado na Live."
      };
    }

    if (!productData) {
      return res.status(404).json({ error: "Produto não encontrado para atendimento." });
    }

    // 4. Build prompt
    const systemPrompt = buildSystemPrompt(productData, prodAiData, settings.tone, settings.economicMode);

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt }
    ];

    // 5. Memory: Include only last 2-4 recent messages if available to save tokens
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = settings.economicMode ? history.slice(-3) : history.slice(-6);
      for (const h of recentHistory) {
        if (h.role && h.content) {
          messages.push({
            role: h.role === "bot" || h.role === "assistant" ? "assistant" : "user",
            content: String(h.content).slice(0, 300)
          });
        }
      }
    }

    messages.push({ role: "user", content: message.trim() });

    // 6. Query OpenRouter
    const result = await queryOpenRouter({
      apiKey: settings.apiKey,
      model: settings.model,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      messages
    });

    // 7. Log call in database
    await logAiChat({
      productId: productData.id || null,
      liveId: liveId || null,
      conversationId: conversationId || null,
      model: result.model,
      question: message.trim(),
      answer: result.answer,
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
      totalTokens: result.totalTokens,
      responseTime: result.responseTime,
      status: "success"
    });

    // 8. Insert assistant reply into live chat messages if liveId provided
    if (liveId) {
      await db.insert(chatMessages).values({
        id: uuidv4(),
        liveId,
        visitorId: null,
        senderName: "Assistente Virtual",
        senderType: "bot",
        message: result.answer,
        createdAt: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      answer: result.answer,
      senderName: "Assistente Virtual",
      senderType: "bot"
    });

  } catch (err: any) {
    console.error("[POST /api/ai/chat error]", err);

    // Log failure
    await logAiChat({
      productId,
      liveId,
      conversationId,
      question: message.trim(),
      status: "error",
      errorMessage: err.message || "Erro interno",
      responseTime: err.responseTime || 0
    });

    // Polite user-facing error response
    return res.json({
      success: false,
      answer: "Não consegui responder agora. Tente novamente em alguns instantes.",
      senderName: "Assistente Virtual",
      senderType: "bot"
    });
  }
});
