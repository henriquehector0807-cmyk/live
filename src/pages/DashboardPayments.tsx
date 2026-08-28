import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  CreditCard, Video, Package, Bot, Wrench, LogOut, Key, CheckCircle2,
  AlertCircle, RefreshCw, Copy, Check, ExternalLink, ShieldCheck, Eye, EyeOff,
  Zap, QrCode, ArrowRight, HelpCircle
} from "lucide-react";

export default function DashboardPayments() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  const [settings, setSettings] = useState({
    hasToken: false,
    maskedToken: "",
    mpAccessToken: "",
    publicKey: "",
    isEnabled: true,
    isEnvToken: false,
  });

  const [showTokenInput, setShowTokenInput] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Test credentials state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string; user?: any } | null>(null);
  const [verifiedStep, setVerifiedStep] = useState(0);

  const verifyNextVariable = async () => {
    setErrorMsg(null);
    setTestResult(null);
    if (verifiedStep === 0) {
      if (!/^(APP_USR|TEST)-\S+$/.test(settings.publicKey.trim())) {
        setErrorMsg("A Public Key deve começar com APP_USR- ou TEST-.");
        return;
      }
      setVerifiedStep(1);
      return;
    }
    await handleTest();
  };

  // Webhook copy
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) loadSettings();
  }, [user]);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/payments/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({
          ...prev,
          hasToken: data.hasToken,
          maskedToken: data.maskedToken,
          publicKey: data.publicKey || "",
          isEnabled: data.isEnabled ?? true,
          isEnvToken: data.isEnvToken,
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/payments/settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mpAccessToken: settings.mpAccessToken || undefined,
          mpPublicKey: settings.publicKey,
          isEnabled: settings.isEnabled,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSaveSuccess(true);
        setSettings(prev => ({ ...prev, mpAccessToken: "" }));
        setShowTokenInput(false);
        loadSettings();
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setErrorMsg(data.error || "Erro ao salvar configurações.");
      }
    } catch (e) {
      setErrorMsg("Erro de conexão ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/payments/test", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: settings.mpAccessToken || undefined,
        }),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.valid) setVerifiedStep(2);
    } catch (e: any) {
      setTestResult({ valid: false, message: e.message || "Erro ao testar conexão." });
    } finally {
      setIsTesting(false);
    }
  };

  const webhookUrl = `${window.location.origin}/api/webhooks/mercadopago`;

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    });
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-[#0F0F0F] text-white flex justify-center items-center">Carregando...</div>;
  }

  return (
    <div className="flex min-h-screen bg-[#0F0F0F] text-white font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#121212] border-r border-white/10 flex flex-col p-4 space-y-4 shrink-0">
        <h2 className="text-xl font-black text-orange-500 uppercase tracking-widest mb-8">Admin</h2>
        <nav className="flex-1 space-y-2">
          <Link to="/painel" className="flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg font-bold transition-colors">
            <Video className="w-5 h-5" />
            <span>Minhas Lives</span>
          </Link>
          <Link to="/painel/produtos" className="flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg font-bold transition-colors">
            <Package className="w-5 h-5" />
            <span>Produtos</span>
          </Link>
          <Link to="/painel/bot-ia" className="flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg font-bold transition-colors">
            <Bot className="w-5 h-5" />
            <span>Bot IA</span>
          </Link>
          <Link to="/painel/pagamentos" className="flex items-center space-x-3 px-4 py-3 bg-white/10 text-white rounded-lg font-bold">
            <CreditCard className="w-5 h-5 text-blue-400" />
            <span>Pagamentos</span>
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

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto max-w-5xl">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Configuração de Pagamento (Mercado Pago)</h1>
              <p className="text-gray-400 text-sm">Receba pagamentos via PIX instantâneo com QR Code e confirmação automática direto na Live.</p>
            </div>
          </div>
        </header>

        {/* Status Card */}
        <div className={`mb-8 p-5 rounded-2xl border flex items-center justify-between ${
          settings.hasToken && settings.isEnabled
            ? "bg-green-500/10 border-green-500/30"
            : "bg-yellow-500/10 border-yellow-500/30"
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              settings.hasToken && settings.isEnabled ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
            }`}>
              {settings.hasToken && settings.isEnabled ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-bold text-base">
                {settings.hasToken && settings.isEnabled
                  ? "Checkout Transparente PIX Conectado"
                  : settings.hasToken && !settings.isEnabled
                  ? "Mercado Pago Desativado"
                  : "Nenhuma credencial do Mercado Pago configurada"}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {settings.hasToken && settings.isEnabled
                  ? "Os clientes poderão pagar via PIX dentro da página da live sem serem redirecionados para fora."
                  : "Adicione seu Access Token abaixo para habilitar o pagamento PIX nativo na Live."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting || (!settings.hasToken && !settings.mpAccessToken)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`} />
            <span>{isTesting ? "Testando..." : "Testar Conexão"}</span>
          </button>
        </div>

        {/* Test Result Feedback */}
        {testResult && (
          <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
            testResult.valid ? "bg-green-500/10 border-green-500/30 text-green-300" : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}>
            {testResult.valid ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
            <div className="text-sm">
              <p className="font-bold">{testResult.valid ? "Sucesso!" : "Falha no teste"}</p>
              <p className="text-xs opacity-90 mt-0.5">{testResult.message}</p>
              {testResult.user && (
                <p className="text-xs text-gray-400 mt-1">
                  Conta vinculada: <strong className="text-white">{testResult.user.nickname || testResult.user.email}</strong> ({testResult.user.countryId || "BR"})
                </p>
              )}
            </div>
          </div>
        )}

        {/* Save feedback */}
        {saveSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/20 border border-green-500/40 text-green-300 flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span>Configurações salvas com sucesso! O pagamento via PIX já está ativo.</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Configuration */}
        <form onSubmit={handleSave} className="bg-[#141414] border border-white/10 rounded-2xl p-6 space-y-6 mb-8">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-bold">Credenciais de API</h2>
              <p className="text-xs text-gray-400">Preencha os campos abaixo ou configure as mesmas variáveis no ambiente do servidor.</p>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <span className="text-xs font-semibold text-gray-300">Ativar PIX na Live</span>
              <input
                type="checkbox"
                checked={settings.isEnabled}
                onChange={(e) => setSettings(prev => ({ ...prev, isEnabled: e.target.checked }))}
                className="w-5 h-5 rounded accent-orange-500 cursor-pointer"
              />
            </label>
          </div>

          <div className="mb-2 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs text-blue-200">
            Etapa {verifiedStep + 1} de 2: valide cada credencial para liberar o próximo campo.
          </div>

          {/* Access Token */}
          {verifiedStep >= 1 && <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Access Token — MERCADOPAGO_ACCESS_TOKEN *</span>
              {settings.hasToken && !showTokenInput && (
                <button
                  type="button"
                  onClick={() => setShowTokenInput(true)}
                  className="text-orange-400 hover:text-orange-300 text-xs normal-case font-semibold"
                >
                  Alterar Token
                </button>
              )}
            </label>

            {settings.hasToken && !showTokenInput ? (
              <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-gray-300 font-mono">
                  <Key className="w-4 h-4 text-green-400" />
                  <span>{settings.maskedToken}</span>
                  {settings.isEnvToken && (
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">definido no .env</span>
                  )}
                </div>
                <span className="text-xs text-green-400 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Configurado
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="APP_USR-xxxxxxxxx-xxxxxx ou TEST-xxxxxxxxx-xxxxxx"
                  value={settings.mpAccessToken}
                  onChange={(e) => setSettings(prev => ({ ...prev, mpAccessToken: e.target.value }))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 font-mono text-white placeholder-gray-600"
                />
                <p className="text-[11px] text-gray-500">
                  Começa com <code className="text-orange-400 font-mono">APP_USR-</code> (para receber pagamentos reais) ou <code className="text-orange-400 font-mono">TEST-</code> (para testes).
                </p>
              </div>
            )}
          </div>}

          {/* Public Key */}
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
              Public Key — MERCADOPAGO_PUBLIC_KEY
            </label>
            <input
              type="text"
              placeholder="APP_USR-xxxxxxxxx-xxxxxx ou TEST-xxxxxxxxx-xxxxxx"
              value={settings.publicKey}
              onChange={(e) => setSettings(prev => ({ ...prev, publicKey: e.target.value }))}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 font-mono text-white placeholder-gray-600"
            />
          </div>

          {verifiedStep === 0 && (
            <button type="button" onClick={verifyNextVariable} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-500">
              OK — Verificar Public Key e liberar Access Token
            </button>
          )}
          {verifiedStep === 1 && (
            <button type="button" onClick={verifyNextVariable} disabled={isTesting || !settings.mpAccessToken} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50">
              {isTesting ? "Verificando Access Token..." : "OK — Verificar Access Token e vincular Mercado Pago"}
            </button>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={isSaving || verifiedStep < 2}
              className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-orange-600/20 transition-colors flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Salvar Configurações</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Webhook Info Box */}
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h3 className="font-bold text-base">Notificações Automáticas (Webhook)</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4 leading-relaxed">
            Para que o sistema confirme pedidos e dê baixa no pagamento instantaneamente via Mercado Pago, cadastre a URL de Webhook abaixo na sua aplicação do Mercado Pago.
          </p>
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl p-2.5">
            <code className="text-xs text-orange-400 font-mono flex-1 select-all px-2 break-all">
              {webhookUrl}
            </code>
            <button
              type="button"
              onClick={copyWebhookUrl}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
            >
              {copiedWebhook ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedWebhook ? "Copiado!" : "Copiar"}</span>
            </button>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 text-orange-400 font-bold text-sm mb-4">
            <HelpCircle className="w-5 h-5" />
            <span>Como obter seu Access Token no Mercado Pago (Passo a Passo)</span>
          </div>

          <ol className="space-y-3 text-xs text-gray-300">
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-orange-600/30 text-orange-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
              <span>
                Acesse o painel oficial de desenvolvedores do Mercado Pago:{" "}
                <a
                  href="https://www.mercadopago.com.br/developers/panel/app"
                  target="_blank"
                  rel="noreferrer"
                  className="text-orange-400 hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  Painel de Aplicações Mercado Pago <ExternalLink className="w-3 h-3" />
                </a>
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-orange-600/30 text-orange-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
              <span>Clique no botão <strong>"Criar aplicação"</strong> (ou selecione uma aplicação já existente).</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-orange-600/30 text-orange-400 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
              <span>No menu lateral da sua aplicação, clique em <strong>"Credenciais de Produção"</strong> (para vendas reais) ou <strong>"Credenciais de Teste"</strong>.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-orange-600/30 text-orange-400 font-bold flex items-center justify-center shrink-0 text-[11px]">4</span>
              <span>Copie o <strong>Access Token</strong> (começa com <code className="text-orange-400">APP_USR-</code> ou <code className="text-orange-400">TEST-</code>) e cole no formulário acima.</span>
            </li>
          </ol>
        </div>
      </main>
    </div>
  );
}
