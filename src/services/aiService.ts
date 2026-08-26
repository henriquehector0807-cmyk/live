import { db } from "../db/index";
import { aiSettings, productAiSettings, aiChatLogs, products, lives } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function getEffectiveAiSettings(userId?: string) {
  let settings = null;
  if (userId) {
    const rows = await db.select().from(aiSettings).where(eq(aiSettings.userId, userId)).limit(1);
    if (rows.length > 0) settings = rows[0];
  }
  if (!settings) {
    const all = await db.select().from(aiSettings).limit(1);
    if (all.length > 0) settings = all[0];
  }

  const apiKey = settings?.openRouterApiKey?.trim() || process.env.OPENROUTER_API_KEY || "";
  const model = settings?.model || "meta-llama/llama-3.3-70b-instruct:free";
  const temperature = settings?.temperature ?? 0.3;
  const maxTokens = settings?.maxTokens ?? 150;
  const isEnabled = settings ? Boolean(settings.isEnabled) : true;
  const tone = settings?.tone || "amigavel";
  const economicMode = settings ? Boolean(settings.economicMode) : true;

  return {
    apiKey,
    model,
    temperature,
    maxTokens,
    isEnabled,
    tone,
    economicMode,
    raw: settings
  };
}

export function buildSystemPrompt(
  product: any,
  prodAi: any,
  tone: string,
  economicMode: boolean
): string {
  const toneDescriptions: Record<string, string> = {
    formal: "Formal, elegante, polido e respeitoso.",
    profissional: "Profissional, objetivo, claro e confiável.",
    amigavel: "Amigável, acolhedor, prestativo e simpático com emojis moderados.",
    descontraido: "Descontraído, leve, animado e informal.",
    persuasivo: "Persuasivo, destacando os benefícios do produto e convidando para a compra.",
    direto: "Curto, direto ao ponto e ultra objetivo, sem rodeios."
  };

  const toneText = toneDescriptions[tone] || toneDescriptions["amigavel"];

  return `Você é o Assistente Virtual oficial da loja nesta Live Shopping.

REGRAS E DIRETRIZES OBRIGATÓRIAS:
1. Responda única e exclusivamente perguntas relacionadas ao produto apresentado na Live.
2. Seja sempre breve e conciso: responda preferencialmente em 1 a 3 frases curtas (máximo 150 tokens).
3. Use exclusivamente as informações fornecidas neste contexto. NUNCA invente preços, prazos, estoque, características ou políticas que não estejam descritas abaixo.
4. Se o cliente perguntar algo cuja informação não esteja no contexto abaixo, diga educadamente que essa informação não está disponível no momento.
5. Se a pergunta for totalmente fora do contexto do produto ou da loja, responda apenas: "Posso te ajudar com informações sobre este produto. 😊".
6. Se o cliente demonstrar intenção de compra ou interesse em adquirir, incentive-o de forma natural a clicar no botão "Comprar" ou "+ Sacola" na tela.
7. Não finja ser uma pessoa real; você é o assistente virtual da loja.

TOM DA RESPOSTA: ${toneText}

DADOS DO PRODUTO ATUAL:
- Nome do Produto: ${product.name}
- Preço: R$ ${Number(product.promotionalPrice || product.price).toFixed(2)} ${product.promotionalPrice ? `(De R$ ${Number(product.price).toFixed(2)})` : ''}
- Estoque disponível: ${product.stock ?? 'Disponível'} unidades
- Descrição: ${product.description || 'Sem descrição adicional'}
${prodAi?.benefits ? `- Benefícios: ${prodAi.benefits}` : ''}
${prodAi?.howToUse ? `- Como Utilizar: ${prodAi.howToUse}` : ''}
${prodAi?.features ? `- Características: ${prodAi.features}` : ''}
${prodAi?.deliveryInfo ? `- Prazo de Entrega: ${prodAi.deliveryInfo}` : (product.deliveryTime ? `- Prazo de Entrega: ${product.deliveryTime}` : '')}
${prodAi?.paymentInfo ? `- Formas de Pagamento: ${prodAi.paymentInfo}` : ''}
${prodAi?.exchangePolicy ? `- Política de Troca/Devolução: ${prodAi.exchangePolicy}` : ''}
${prodAi?.additionalInfo ? `- Informações Adicionais: ${prodAi.additionalInfo}` : ''}

${prodAi?.customInstructions ? `INSTRUÇÕES ADICIONAIS DO PRODUTO:\n${prodAi.customInstructions}` : ''}
`;
}

export async function queryOpenRouter({
  apiKey,
  model,
  temperature,
  maxTokens,
  messages,
}: {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  messages: Array<{ role: string; content: string }>;
}) {
  if (!apiKey || !String(apiKey).trim()) {
    throw new Error("Chave da API OpenRouter não configurada. Configure no painel em 'Bot IA' ou na variável OPENROUTER_API_KEY.");
  }

  const cleanApiKey = String(apiKey).trim();
  const startTime = Date.now();

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cleanApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Live Commerce Platform",
      },
      body: JSON.stringify({
        model: model || "meta-llama/llama-3.3-70b-instruct:free",
        messages,
        temperature: typeof temperature === "number" ? temperature : 0.3,
        max_tokens: typeof maxTokens === "number" ? maxTokens : 150,
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      let parsedError;
      try { parsedError = JSON.parse(errorText); } catch {}
      const message = parsedError?.error?.message || (errorText ? `Erro OpenRouter (${response.status}): ${errorText}` : `Falha de conexão com a OpenRouter (Status ${response.status})`);
      const err: any = new Error(message);
      err.status = response.status;
      err.responseTime = responseTime;
      throw err;
    }

    const data: any = await response.json();
    const choice = data.choices?.[0];
    const answer = choice?.message?.content?.trim() || "";
    const usage = data.usage || {};

    return {
      answer,
      model: data.model || model,
      tokensInput: usage.prompt_tokens || 0,
      tokensOutput: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
      responseTime,
      raw: data,
    };
  } catch (err: any) {
    if (!err.responseTime) err.responseTime = Date.now() - startTime;
    throw err;
  }
}

export async function logAiChat({
  productId,
  liveId,
  conversationId,
  model,
  question,
  answer,
  tokensInput,
  tokensOutput,
  totalTokens,
  responseTime,
  status,
  errorMessage,
}: {
  productId?: string | null;
  liveId?: string | null;
  conversationId?: string | null;
  model?: string;
  question: string;
  answer?: string;
  tokensInput?: number;
  tokensOutput?: number;
  totalTokens?: number;
  responseTime?: number;
  status: "success" | "error";
  errorMessage?: string | null;
}) {
  try {
    await db.insert(aiChatLogs).values({
      id: uuidv4(),
      productId: productId || null,
      liveId: liveId || null,
      conversationId: conversationId || null,
      model: model || null,
      question,
      answer: answer || null,
      tokensInput: tokensInput || 0,
      tokensOutput: tokensOutput || 0,
      totalTokens: totalTokens || 0,
      responseTime: responseTime || 0,
      status,
      errorMessage: errorMessage || null,
    });
  } catch (err) {
    console.error("[logAiChat error]", err);
  }
}
