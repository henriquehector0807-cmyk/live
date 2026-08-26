import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  Bot, Video, Package, LogOut, Key, Cpu, Sparkles, Sliders, CheckCircle2, 
  AlertCircle, Play, RefreshCw, Send, Check, Settings, ShieldCheck, Eye, EyeOff, 
  MessageSquare, Clock, Zap, HelpCircle, FileText, Wrench
} from "lucide-react";

export default function DashboardAiBot() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  // ── Global AI Settings State ──────────────────────────────
  const [aiSettings, setAiSettings] = useState({
    hasApiKey: false,
    maskedApiKey: "",
    openRouterApiKey: "",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    temperature: 0.3,
    maxTokens: 150,
    isEnabled: true,
    tone: "amigavel",
    economicMode: true,
    isEnvKey: false
  });

  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaveSuccess, setSettingsSaveSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // ── Products List for AI ──────────────────────────────────
  const [productsList, setProductsList] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // ── Product Config Modal State ────────────────────────────
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productAiForm, setProductAiForm] = useState({
    benefits: "",
    howToUse: "",
    features: "",
    deliveryInfo: "",
    paymentInfo: "",
    exchangePolicy: "",
    additionalInfo: "",
    customInstructions: "",
    allowedTopics: "price,stock,features,benefits,howToUse,delivery,payment,purchase,exchange",
    isEnabled: true
  });
  const [isSavingProductAi, setIsSavingProductAi] = useState(false);
  const [productAiSaveSuccess, setProductAiSaveSuccess] = useState(false);

  // ── Bot Test State ────────────────────────────────────────
  const [testQuestion, setTestQuestion] = useState("Qual o preço e prazo de entrega deste produto?");
  const [testProductId, setTestProductId] = useState("default");
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  // ── Logs State ────────────────────────────────────────────
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // ── Preset Models ─────────────────────────────────────────
  const PRESET_MODELS = [
    { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Gratuito)", tag: "Grátis / Alta Capacidade" },
    { id: "google/gemini-2.0-flash-001", name: "Google Gemini 2.0 Flash", tag: "Econômico / Ultra Rápido" },
    { id: "openai/gpt-4o-mini", name: "OpenAI GPT-4o Mini", tag: "Alta Precisão / Baixo Custo" },
    { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B (Gratuito)", tag: "Grátis / Rápido" },
    { id: "deepseek/deepseek-chat", name: "DeepSeek V3", tag: "Super Econômico" },
  ];

  const TONES = [
    { id: "amigavel", name: "Amigável", example: "Oi! 😊 Sim, esse produto está disponível e o kit rende mais de 3 meses!" },
    { id: "profissional", name: "Profissional", example: "Olá. O produto encontra-se disponível em estoque com garantia oficial de fábrica." },
    { id: "formal", name: "Formal", example: "Prezado(a), confirmamos a disponibilidade do item para envio imediato com nota fiscal." },
    { id: "descontraido", name: "Descontraído", example: "Fala aí! Tá disponível sim, e tá saindo muito hoje na live! 🔥" },
    { id: "persuasivo", name: "Persuasivo", example: "Está disponível com 30% de desconto exclusivo só durante a live! Aproveite no botão Comprar." },
    { id: "direto", name: "Curto e Direto", example: "R$ 47,00 em até 3x sem juros. Envio em 2 dias." },
  ];

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  // Load Settings, Products & Logs
  const loadAll = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const [settRes, prodRes, logsRes] = await Promise.all([
        fetch("/api/ai/settings", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/ai/products", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/ai/logs", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (settRes.ok) {
        const settData = await settRes.json().catch(() => null);
        if (settData) {
          setAiSettings(prev => ({
            ...prev,
            hasApiKey: Boolean(settData.hasApiKey),
            maskedApiKey: settData.maskedApiKey || "",
            model: settData.model || prev.model,
            temperature: typeof settData.temperature === "number" ? settData.temperature : 0.3,
            maxTokens: typeof settData.maxTokens === "number" ? settData.maxTokens : 150,
            isEnabled: Boolean(settData.isEnabled),
            tone: settData.tone || "amigavel",
            economicMode: Boolean(settData.economicMode),
            isEnvKey: Boolean(settData.isEnvKey)
          }));
        }
      }

      if (prodRes.ok) {
        const prods = await prodRes.json().catch(() => []);
        if (Array.isArray(prods)) {
          setProductsList(prods);
          if (prods.length > 0 && testProductId === "default") {
            setTestProductId(prods[0].id);
          }
        }
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json().catch(() => []);
        if (Array.isArray(logsData)) {
          setLogs(logsData);
        }
      }
    } catch (err) {
      console.error("[DashboardAiBot load error]", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  // ── Save Global Settings ──────────────────────────────────
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsError(null);
    setSettingsSaveSuccess(false);

    try {
      const token = localStorage.getItem("token");
      const cleanKey = aiSettings.openRouterApiKey ? String(aiSettings.openRouterApiKey).trim() : "";
      
      const payload: any = {
        model: aiSettings.model && aiSettings.model !== "custom" ? aiSettings.model : "meta-llama/llama-3.3-70b-instruct:free",
        temperature: parseFloat(String(aiSettings.temperature)) || 0.3,
        maxTokens: parseInt(String(aiSettings.maxTokens), 10) || 150,
        isEnabled: Boolean(aiSettings.isEnabled),
        tone: aiSettings.tone || "amigavel",
        economicMode: Boolean(aiSettings.economicMode),
      };

      if (cleanKey.length > 0 && !cleanKey.includes("...")) {
        payload.openRouterApiKey = cleanKey;
      }

      const res = await fetch("/api/ai/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Falha ao salvar configurações (Status ${res.status})`);
      }

      setSettingsSaveSuccess(true);
      setShowApiKeyInput(false);
      setTimeout(() => setSettingsSaveSuccess(false), 4000);
      loadAll();
    } catch (err: any) {
      setSettingsError(err.message || "Erro ao salvar configurações de IA");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // ── Open Product Config Modal ─────────────────────────────
  const openProductConfig = async (product: any) => {
    setSelectedProduct(product);
    setProductAiSaveSuccess(false);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/ai/products/${product.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setProductAiForm({
          benefits: data.aiConfig?.benefits || "",
          howToUse: data.aiConfig?.howToUse || "",
          features: data.aiConfig?.features || "",
          deliveryInfo: data.aiConfig?.deliveryInfo || "",
          paymentInfo: data.aiConfig?.paymentInfo || "",
          exchangePolicy: data.aiConfig?.exchangePolicy || "",
          additionalInfo: data.aiConfig?.additionalInfo || "",
          customInstructions: data.aiConfig?.customInstructions || "",
          allowedTopics: data.aiConfig?.allowedTopics || "price,stock,features,benefits,howToUse,delivery,payment,purchase,exchange",
          isEnabled: data.aiConfig?.isEnabled !== 0
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ── Save Product Config ───────────────────────────────────
  const handleSaveProductAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setIsSavingProductAi(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/ai/products/${selectedProduct.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(productAiForm)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao salvar configurações do produto");
      
      setProductAiSaveSuccess(true);
      setTimeout(() => {
        setProductAiSaveSuccess(false);
        setSelectedProduct(null);
      }, 1200);
      loadAll();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao salvar configurações de IA do produto");
    } finally {
      setIsSavingProductAi(false);
    }
  };

  // ── Test Bot ──────────────────────────────────────────────
  const handleTestBot = async () => {
    if (!testQuestion.trim()) return;
    setIsTesting(true);
    setTestResult(null);
    setTestError(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: testProductId,
          question: testQuestion.trim(),
          customModel: aiSettings.model && aiSettings.model !== "custom" ? aiSettings.model : "meta-llama/llama-3.3-70b-instruct:free",
          customTemperature: typeof aiSettings.temperature === "number" ? aiSettings.temperature : 0.3,
          customMaxTokens: typeof aiSettings.maxTokens === "number" ? aiSettings.maxTokens : 150,
          customTone: aiSettings.tone || "amigavel"
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Erro no teste do Bot (Status ${res.status})`);
      }

      setTestResult(data);
      // Refresh logs
      fetch("/api/ai/logs", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json().catch(() => []))
        .then(d => { if (Array.isArray(d)) setLogs(d); })
        .catch(() => {});
    } catch (err: any) {
      setTestError(err.message || "Falha na conexão com a OpenRouter");
    } finally {
      setIsTesting(false);
    }
  };

  if (loading || !user) return <div className="min-h-screen bg-[#0F0F0F] text-white flex justify-center items-center">Carregando...</div>;

  return (
    <div className="flex min-h-screen bg-[#0F0F0F] text-white font-sans">
      
      {/* ── SIDEBAR ────────────────────────────────────────── */}
      <aside className="w-64 bg-[#121212] border-r border-white/10 flex flex-col p-4 space-y-4 shrink-0">
        <h2 className="text-xl font-black text-[#FF5A36] uppercase tracking-widest mb-8">Live Admin</h2>
        <nav className="flex-1 space-y-2">
          <Link to="/painel" className="flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg font-bold transition-colors">
            <Video className="w-5 h-5" />
            <span>Minhas Lives</span>
          </Link>
          <Link to="/painel/produtos" className="flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg font-bold transition-colors">
            <Package className="w-5 h-5" />
            <span>Produtos</span>
          </Link>
          <Link to="/painel/bot-ia" className="flex items-center space-x-3 px-4 py-3 bg-[#FF5A36] text-white rounded-lg font-bold shadow-lg shadow-[#FF5A36]/20">
            <Bot className="w-5 h-5" />
            <span>Bot IA</span>
          </Link>
          <Link to="/painel/ferramentas" className="flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg font-bold transition-colors">
            <Wrench className="w-5 h-5" />
            <span>Ferramentas</span>
          </Link>
        </nav>
        <button onClick={logout} className="flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </aside>

      {/* ── MAIN CONTENT ───────────────────────────────────── */}
      <main className="flex-1 p-8 overflow-y-auto max-w-7xl">
        
        {/* Header */}
        <header className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#FF5A36]/20 text-[#FF5A36] rounded-xl border border-[#FF5A36]/30">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black">Bot IA — Atendimento Automático</h1>
                <p className="text-gray-400 text-sm mt-0.5">Configure a inteligência artificial para responder dúvidas dos clientes na Live com OpenRouter.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
              aiSettings.isEnabled 
                ? 'bg-green-500/15 border-green-500/30 text-green-400' 
                : 'bg-red-500/15 border-red-500/30 text-red-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${aiSettings.isEnabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              {aiSettings.isEnabled ? 'Bot Ativo no Sistema' : 'Bot Desativado'}
            </span>
          </div>
        </header>

        <div className="space-y-8">

          {/* ── 1. CONFIGURAÇÃO GERAL & OPENROUTER ─────────── */}
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-[#FF5A36]" />
                <h2 className="text-lg font-bold text-white">Configuração da IA (OpenRouter)</h2>
              </div>
              <span className="text-xs text-gray-400 font-mono">Endpoint: https://openrouter.ai/api/v1</span>
            </div>

            {settingsSaveSuccess && (
              <div className="mb-6 p-4 bg-green-500/20 border border-green-500/40 rounded-xl text-green-400 font-bold text-sm flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5" />
                <span>Configurações da IA salvas com sucesso!</span>
              </div>
            )}

            {settingsError && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/40 rounded-xl text-red-400 font-bold text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>{settingsError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-6">
              
              {/* Row 1: API Key & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Key className="w-3.5 h-3.5 text-[#FF5A36]"/> API Key OpenRouter</span>
                    {aiSettings.hasApiKey && (
                      <span className="text-green-400 font-normal text-[11px] flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3"/> {aiSettings.isEnvKey ? 'Configurada via Variável de Ambiente' : 'Chave Salva'}
                      </span>
                    )}
                  </label>

                  <div className="relative">
                    <input
                      type={showApiKeyInput ? "text" : "password"}
                      placeholder={aiSettings.hasApiKey ? `Chave salva: ${aiSettings.maskedApiKey}` : "sk-or-v1-..."}
                      value={aiSettings.openRouterApiKey}
                      onChange={e => setAiSettings({ ...aiSettings, openRouterApiKey: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FF5A36] font-mono text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showApiKeyInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-gray-500 text-xs mt-1.5">
                    A chave nunca é enviada ao navegador do cliente e fica protegida no backend.
                  </p>
                </div>

                {/* Model Selector + Manual Input */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-[#FF5A36]"/> Modelo OpenRouter (Model ID)
                  </label>

                  <div className="space-y-2">
                    <select
                      value={PRESET_MODELS.some(m => m.id === aiSettings.model) ? aiSettings.model : "custom"}
                      onChange={e => {
                        if (e.target.value !== "custom") {
                          setAiSettings({ ...aiSettings, model: e.target.value });
                        }
                      }}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FF5A36] text-sm"
                    >
                      {PRESET_MODELS.map(m => (
                        <option key={m.id} value={m.id}>{m.name} — [{m.tag}]</option>
                      ))}
                      <option value="custom">Outro Modelo (Informar Model ID manualmente)</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Ex: meta-llama/llama-3.3-70b-instruct:free ou google/gemini-2.0-flash-001"
                      value={aiSettings.model}
                      onChange={e => setAiSettings({ ...aiSettings, model: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#FF5A36]"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Tone & Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-white/5">
                
                {/* Tone Select */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#FF5A36]"/> Tom das Respostas
                  </label>
                  <select
                    value={aiSettings.tone}
                    onChange={e => setAiSettings({ ...aiSettings, tone: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FF5A36] text-sm capitalize"
                  >
                    {TONES.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <p className="text-gray-400 text-[11px] mt-2 italic bg-black/40 p-2 rounded-lg border border-white/5">
                    <span className="text-gray-500">"</span>
                    {TONES.find(t => t.id === aiSettings.tone)?.example || ''}
                    <span className="text-gray-500">"</span>
                  </p>
                </div>

                {/* Temperature & Tokens */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                      <span>Temperatura: {aiSettings.temperature}</span>
                      <span className="text-gray-500 font-normal">Mais Preciso / Mais Criativo</span>
                    </div>
                    <input
                      type="range"
                      min={0.0}
                      max={1.0}
                      step={0.05}
                      value={aiSettings.temperature}
                      onChange={e => setAiSettings({ ...aiSettings, temperature: parseFloat(e.target.value) })}
                      className="w-full accent-[#FF5A36] bg-black/50 rounded-lg h-2"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                      Máximo de Tokens (Resposta curta: 150)
                    </label>
                    <input
                      type="number"
                      min={50}
                      max={600}
                      value={aiSettings.maxTokens}
                      onChange={e => setAiSettings({ ...aiSettings, maxTokens: parseInt(e.target.value, 10) })}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FF5A36] text-sm font-mono"
                    />
                  </div>
                </div>

                {/* Toggles: Ativar Bot & Modo Econômico */}
                <div className="bg-black/40 p-4 rounded-xl border border-white/10 space-y-4 flex flex-col justify-center">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <Bot className="w-4 h-4 text-[#FF5A36]"/> Ativar Bot no Sistema
                    </span>
                    <input
                      type="checkbox"
                      checked={aiSettings.isEnabled}
                      onChange={e => setAiSettings({ ...aiSettings, isEnabled: e.target.checked })}
                      className="w-5 h-5 accent-[#FF5A36] rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-white/5">
                    <div>
                      <span className="text-sm font-bold text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400"/> Modo Econômico
                      </span>
                      <p className="text-[11px] text-gray-400 leading-tight">Reduz consumo de tokens</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={aiSettings.economicMode}
                      onChange={e => setAiSettings({ ...aiSettings, economicMode: e.target.checked })}
                      className="w-5 h-5 accent-[#FF5A36] rounded"
                    />
                  </label>
                </div>

              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="bg-[#FF5A36] hover:bg-[#e04825] disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition shadow-lg shadow-[#FF5A36]/30 active:scale-95 flex items-center gap-2"
                >
                  {isSavingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Salvar Configurações da IA</span>
                </button>
              </div>

            </form>
          </div>

          {/* ── 2. TESTE DO BOT EM TEMPO REAL ─────────────── */}
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Play className="w-5 h-5 text-[#FF5A36]" />
                <h2 className="text-lg font-bold text-white">Testar Bot com a OpenRouter</h2>
              </div>
              <span className="text-xs text-gray-400">Verifique a resposta real antes de ativar na live</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Test Input Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                    Produto para Contexto do Teste
                  </label>
                  <select
                    value={testProductId}
                    onChange={e => setTestProductId(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FF5A36] text-sm"
                  >
                    <option value="default">Produto Demonstração (Kit de Cílios - R$ 47,00)</option>
                    {productsList.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - R$ {p.price?.toFixed(2)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                    Pergunta do Visitante
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Digite a pergunta que um cliente faria na live..."
                      value={testQuestion}
                      onChange={e => setTestQuestion(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleTestBot(); }}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FF5A36] text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleTestBot}
                      disabled={isTesting || !testQuestion.trim()}
                      className="bg-[#FF5A36] hover:bg-[#e04825] disabled:opacity-50 text-white px-5 rounded-xl font-bold uppercase tracking-wider text-xs transition shrink-0 active:scale-95 shadow-md shadow-[#FF5A36]/20 flex items-center gap-1.5"
                    >
                      {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>Testar</span>
                    </button>
                  </div>
                </div>

                {/* Quick test prompt chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    "Quanto custa esse produto?",
                    "Tem frete grátis?",
                    "Como devo utilizar?",
                    "Quais os benefícios?",
                    "Quem é o presidente do Brasil?" // Off-topic test
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTestQuestion(chip)}
                      className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-2.5 py-1 rounded-full text-xs transition border border-white/5"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Test Output Card */}
              <div className="bg-black/50 border border-white/10 rounded-xl p-4 flex flex-col justify-between min-h-[160px]">
                {testError ? (
                  <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-red-400 text-xs">
                    <p className="font-bold flex items-center gap-1.5 mb-1"><AlertCircle className="w-4 h-4"/> Falha na API OpenRouter</p>
                    <p className="font-mono">{testError}</p>
                  </div>
                ) : testResult ? (
                  <div className="space-y-3 animate-in fade-in">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 block">Resposta do Bot:</span>
                      <div className="p-3 bg-[#FF5A36]/10 border border-[#FF5A36]/30 rounded-xl text-white text-sm font-medium mt-1 leading-relaxed">
                        {testResult.answer}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-gray-400 pt-2 border-t border-white/10">
                      <div>
                        <span className="text-gray-500 block">Modelo:</span>
                        <span className="text-white truncate block">{testResult.model}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Tokens:</span>
                        <span className="text-amber-400 font-bold">{testResult.totalTokens} ({testResult.tokensInput} in / {testResult.tokensOutput} out)</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Tempo:</span>
                        <span className="text-green-400 font-bold">{testResult.responseTime} ms</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center text-gray-500 py-6 my-auto">
                    <Bot className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-xs">Digite uma pergunta e clique em <strong>Testar</strong> para ver o resultado da IA.</p>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ── 3. CONFIGURAÇÃO INDIVIDUAL POR PRODUTO ──────── */}
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Package className="w-5 h-5 text-[#FF5A36]" />
                <div>
                  <h2 className="text-lg font-bold text-white">Configuração por Produto</h2>
                  <p className="text-gray-400 text-xs mt-0.5">Defina as informações específicas e instruções exclusivas de cada produto.</p>
                </div>
              </div>
            </div>

            {loadingProducts ? (
              <div className="text-center py-10 text-gray-500">Carregando produtos...</div>
            ) : productsList.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                Nenhum produto cadastrado. <Link to="/painel/produtos" className="text-[#FF5A36] underline">Cadastre produtos aqui.</Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Produto</th>
                      <th className="py-3 px-4">Preço</th>
                      <th className="py-3 px-4">Estoque</th>
                      <th className="py-3 px-4">Status Bot</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {productsList.map((prod) => (
                      <tr key={prod.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4 flex items-center gap-3">
                          <div className="w-11 h-11 bg-black rounded-lg overflow-hidden shrink-0 border border-white/10 p-1 flex items-center justify-center">
                            {prod.imageUrl ? (
                              <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-contain" />
                            ) : (
                              <Package className="w-5 h-5 text-gray-500" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-white block">{prod.name}</span>
                            <span className="text-xs text-gray-400 line-clamp-1">{prod.description || 'Sem descrição'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">
                          R$ {prod.price?.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-gray-300">
                          {prod.stock ?? 0} un.
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            prod.aiConfig?.isEnabled !== 0 
                              ? 'bg-green-500/15 text-green-400 border border-green-500/30' 
                              : 'bg-red-500/15 text-red-400 border border-red-500/30'
                          }`}>
                            {prod.aiConfig?.isEnabled !== 0 ? '✓ Ativo' : 'Desativado'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => openProductConfig(prod)}
                            className="bg-white/10 hover:bg-[#FF5A36] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition active:scale-95 border border-white/10"
                          >
                            Configurar Bot deste produto
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── 4. LOGS DE ATENDIMENTO ─────────────────────── */}
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-[#FF5A36]" />
                <h2 className="text-lg font-bold text-white">Logs Recentes de Atendimento</h2>
              </div>
              <button
                onClick={loadAll}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Atualizar logs
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                Nenhum log registrado ainda. Teste o bot acima ou faça uma pergunta na live.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Data/Hora</th>
                      <th className="py-2.5 px-3">Pergunta do Cliente</th>
                      <th className="py-2.5 px-3">Resposta Gerada</th>
                      <th className="py-2.5 px-3">Tokens</th>
                      <th className="py-2.5 px-3">Tempo</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5">
                        <td className="py-2.5 px-3 whitespace-nowrap text-gray-400">
                          {new Date(log.createdAt).toLocaleString("pt-BR")}
                        </td>
                        <td className="py-2.5 px-3 max-w-[200px] truncate text-white">
                          {log.question}
                        </td>
                        <td className="py-2.5 px-3 max-w-[280px] truncate text-gray-300">
                          {log.answer || log.errorMessage || "—"}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-amber-400">
                          {log.totalTokens} tok
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-green-400">
                          {log.responseTime}ms
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === "success" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                          }`}>
                            {log.status === "success" ? "OK" : "ERRO"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </main>

      {/* ── MODAL DE CONFIGURAÇÃO DO PRODUTO ──────────────── */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-[#161616] border border-white/15 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-black rounded-xl overflow-hidden shrink-0 border border-white/10 p-1 flex items-center justify-center">
                  {selectedProduct.imageUrl ? (
                    <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-contain" />
                  ) : (
                    <Package className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base leading-tight">Configurar Bot: {selectedProduct.name}</h3>
                  <p className="text-xs text-[#FF5A36] font-bold">R$ {selectedProduct.price?.toFixed(2)} • {selectedProduct.stock} un. em estoque</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {productAiSaveSuccess && (
              <div className="my-3 p-3 bg-green-500/20 border border-green-500/40 rounded-xl text-green-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Configurações salvas para {selectedProduct.name}!</span>
              </div>
            )}

            {/* Modal Form Scrollable Body */}
            <form onSubmit={handleSaveProductAi} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              
              {/* Bot Toggle for Product */}
              <div className="bg-black/50 p-3.5 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-white block">Ativar Atendimento de IA neste Produto</span>
                  <span className="text-xs text-gray-400">Se desativado, o bot não responderá sobre este item na timeline</span>
                </div>
                <input
                  type="checkbox"
                  checked={productAiForm.isEnabled}
                  onChange={e => setProductAiForm({ ...productAiForm, isEnabled: e.target.checked })}
                  className="w-5 h-5 accent-[#FF5A36] rounded cursor-pointer"
                />
              </div>

              {/* Instruções Personalizadas */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#FF5A36]" /> Instruções Personalizadas do Bot
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Você atende clientes interessados neste produto. Responda de forma amigável. Quando o cliente demonstrar interesse, incentive-o a clicar no botão Comprar."
                  value={productAiForm.customInstructions}
                  onChange={e => setProductAiForm({ ...productAiForm, customInstructions: e.target.value })}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-[#FF5A36]"
                />
              </div>

              {/* Informações do Produto (Contexto da IA) */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-[#FF5A36] uppercase tracking-wider">Informações que o Bot pode usar (Contexto)</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">Benefícios</label>
                    <textarea
                      rows={2}
                      placeholder="Ex: Não borra, dura o dia todo, hipoalergênico..."
                      value={productAiForm.benefits}
                      onChange={e => setProductAiForm({ ...productAiForm, benefits: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-[#FF5A36]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">Como Utilizar</label>
                    <textarea
                      rows={2}
                      placeholder="Ex: Aplique o delineador magnético, espere 1 minuto e aproxime os cílios..."
                      value={productAiForm.howToUse}
                      onChange={e => setProductAiForm({ ...productAiForm, howToUse: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-[#FF5A36]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">Características / Composição</label>
                    <textarea
                      rows={2}
                      placeholder="Ex: Fibras de seda sintética, 5 ímãs ultrafinos, à prova d'água..."
                      value={productAiForm.features}
                      onChange={e => setProductAiForm({ ...productAiForm, features: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-[#FF5A36]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">Prazo de Entrega e Frete</label>
                    <textarea
                      rows={2}
                      placeholder="Ex: De 2 a 5 dias úteis. Frete grátis para todo o Brasil..."
                      value={productAiForm.deliveryInfo}
                      onChange={e => setProductAiForm({ ...productAiForm, deliveryInfo: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-[#FF5A36]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">Formas de Pagamento</label>
                    <textarea
                      rows={2}
                      placeholder="Ex: Cartão em até 12x, Pix com desconto ou Boleto..."
                      value={productAiForm.paymentInfo}
                      onChange={e => setProductAiForm({ ...productAiForm, paymentInfo: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-[#FF5A36]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">Política de Troca / Devolução</label>
                    <textarea
                      rows={2}
                      placeholder="Ex: Garantia de 30 dias para devolução ou troca sem custos..."
                      value={productAiForm.exchangePolicy}
                      onChange={e => setProductAiForm({ ...productAiForm, exchangePolicy: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-[#FF5A36]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-400 mb-1">Informações Adicionais</label>
                  <textarea
                    rows={2}
                    placeholder="Outras observações importantes que a IA deve saber sobre o produto..."
                    value={productAiForm.additionalInfo}
                    onChange={e => setProductAiForm({ ...productAiForm, additionalInfo: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-[#FF5A36]"
                  />
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-4 border-t border-white/10 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="bg-white/5 hover:bg-white/10 text-white px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingProductAi}
                  className="bg-[#FF5A36] hover:bg-[#e04825] disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs transition shadow-lg shadow-[#FF5A36]/30 active:scale-95 flex items-center gap-2"
                >
                  {isSavingProductAi ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Salvar Configuração do Produto</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
