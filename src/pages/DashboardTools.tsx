import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Wrench, Video, Package, Bot, LogOut, Link2, Copy, Check,
  BarChart3, Users, ShoppingCart, DollarSign, MessageSquare,
  Download, Trash2, RefreshCw, ExternalLink, AlertCircle,
  Radio, Clock, TrendingUp, Eye, CheckCircle2, CreditCard,
  Database, Cloud, Server
} from "lucide-react";

const AUTH_HEADER = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });
const AUTH_PLAIN = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

interface LiveItem {
  id: string;
  slug: string;
  title: string;
  status: string;
  createdAt: string;
}

interface LiveStats {
  totalOrders: number;
  confirmedOrders: number;
  totalRevenue: number;
  confirmedRevenue: number;
  totalVisitors: number;
  buyers: number;
  totalMessages: number;
}

export default function DashboardTools() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  const [lives, setLives] = useState<LiveItem[]>([]);
  const [livesLoading, setLivesLoading] = useState(true);

  const [selectedLiveId, setSelectedLiveId] = useState("");
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [csvLoading, setCsvLoading] = useState(false);

  const [dbStatus, setDbStatus] = useState<any>(null);
  const [dbStatusLoading, setDbStatusLoading] = useState(false);

  useEffect(() => { if (!loading && !user) navigate("/login"); }, [user, loading, navigate]);
  useEffect(() => { if (user) { loadLives(); loadDbStatus(); } }, [user]);
  useEffect(() => { if (selectedLiveId) loadStats(selectedLiveId); }, [selectedLiveId]);

  const loadDbStatus = async () => {
    setDbStatusLoading(true);
    try {
      const res = await fetch("/api/system/db-status");
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (e) {
      console.error("DB Status error:", e);
    } finally {
      setDbStatusLoading(false);
    }
  };

  const loadLives = async () => {
    setLivesLoading(true);
    try {
      const res = await fetch("/api/lives", { headers: AUTH_PLAIN() });
      if (res.ok) {
        const data = await res.json();
        setLives(data);
        if (data.length > 0 && !selectedLiveId) setSelectedLiveId(data[0].id);
      }
    } catch (e) { console.error(e); } finally { setLivesLoading(false); }
  };

  const loadStats = async (liveId: string) => {
    setStatsLoading(true);
    setStats(null);
    try {
      const res = await fetch(`/api/lives/${liveId}/stats`, { headers: AUTH_PLAIN() });
      if (res.ok) setStats(await res.json());
    } catch (e) { console.error(e); } finally { setStatsLoading(false); }
  };

  const copyLink = (slug: string, liveId: string) => {
    const link = `${window.location.origin}/live/${slug}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(liveId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const deleteDraftLive = async (liveId: string, title: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir a live "${title}"? Esta ação é irreversível.`)) return;
    setDeletingId(liveId);
    setDeleteMessage(null);
    try {
      const res = await fetch(`/api/lives/${liveId}`, { method: "DELETE", headers: AUTH_PLAIN() });
      if (res.ok) {
        setDeleteMessage({ type: "success", text: `Live "${title}" excluída com sucesso.` });
        setLives(prev => prev.filter(l => l.id !== liveId));
        if (selectedLiveId === liveId) {
          const remaining = lives.filter(l => l.id !== liveId);
          setSelectedLiveId(remaining[0]?.id || "");
        }
      } else {
        setDeleteMessage({ type: "error", text: "Não foi possível excluir a live." });
      }
    } catch (e) {
      setDeleteMessage({ type: "error", text: "Erro de conexão." });
    } finally {
      setDeletingId(null);
      setTimeout(() => setDeleteMessage(null), 4000);
    }
  };

  const exportCSV = async () => {
    if (!selectedLiveId) return;
    setCsvLoading(true);
    try {
      const res = await fetch(`/api/lives/${selectedLiveId}/orders`, { headers: AUTH_PLAIN() });
      if (!res.ok) throw new Error("Erro ao buscar pedidos");
      const orders: any[] = await res.json();
      if (orders.length === 0) { alert("Nenhum pedido para exportar."); return; }

      const header = ["ID", "Comprador", "Email", "Telefone", "Produto", "Quantidade", "Valor Unit.", "Total", "Status", "Data"];
      const rows = orders.map(o => [
        o.id, o.buyerName, o.customerEmail || "", o.customerPhone || "",
        o.product?.name || o.productId, o.quantity, Number(o.unitPrice || 0).toFixed(2),
        Number(o.total || 0).toFixed(2), o.status, o.createdAt ? new Date(o.createdAt).toLocaleString("pt-BR") : ""
      ]);

      const csv = [header, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const live = lives.find(l => l.id === selectedLiveId);
      link.href = url;
      link.download = `pedidos-${live?.slug || selectedLiveId}.csv`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); alert("Erro ao exportar CSV."); } finally { setCsvLoading(false); }
  };

  if (loading || !user) return <div className="min-h-screen bg-[#0F0F0F] text-white flex justify-center items-center">Carregando...</div>;

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: "bg-gray-800 text-gray-400",
      scheduled: "bg-blue-500/20 text-blue-400",
      live: "bg-red-500/20 text-red-500",
      ended: "bg-gray-700 text-gray-500",
    };
    const labels: Record<string, string> = { draft: "Rascunho", scheduled: "Agendada", live: "🔴 Ao Vivo", ended: "Encerrada" };
    return { cls: map[status] || "bg-gray-700 text-gray-400", label: labels[status] || status };
  };

  const selectedLive = lives.find(l => l.id === selectedLiveId);

  return (
    <div className="flex min-h-screen bg-[#0F0F0F] text-white font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#121212] border-r border-white/10 flex flex-col p-4 space-y-4">
        <h2 className="text-xl font-black text-orange-500 uppercase tracking-widest mb-8">Admin</h2>
        <nav className="flex-1 space-y-2">
          <Link to="/painel" className="flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg font-bold transition-colors">
            <Video className="w-5 h-5" /><span>Minhas Lives</span>
          </Link>
          <Link to="/painel/produtos" className="flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg font-bold transition-colors">
            <Package className="w-5 h-5" /><span>Produtos</span>
          </Link>
          <Link to="/painel/bot-ia" className="flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg font-bold transition-colors">
            <Bot className="w-5 h-5" /><span>Bot IA</span>
          </Link>
          <Link to="/painel/pagamentos" className="flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg font-bold transition-colors">
            <CreditCard className="w-5 h-5" /><span>Pagamentos</span>
          </Link>
          <Link to="/painel/ferramentas" className="flex items-center space-x-3 px-4 py-3 bg-white/10 text-white rounded-lg font-bold">
            <Wrench className="w-5 h-5" /><span>Ferramentas</span>
          </Link>
        </nav>
        <button onClick={logout} className="flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
          <LogOut className="w-5 h-5" /><span>Sair</span>
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <Wrench className="w-7 h-7 text-orange-500" />
            <h1 className="text-2xl font-bold">Ferramentas</h1>
          </div>
          <p className="text-gray-400">Gerencie links, exporte dados e analise o desempenho das suas lives.</p>
        </header>

        {deleteMessage && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 font-bold text-sm ${deleteMessage.type === "success" ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}>
            {deleteMessage.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {deleteMessage.text}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Left Column: Live selector + Link Generator + CSV */}
          <div className="xl:col-span-1 space-y-6">

            {/* Live Selector */}
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Radio className="w-5 h-5 text-[#FF5A36]" />Selecionar Live</h2>
              {livesLoading ? (
                <div className="text-gray-500 text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" />Carregando...</div>
              ) : lives.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhuma live cadastrada.</p>
              ) : (
                <select value={selectedLiveId} onChange={e => setSelectedLiveId(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FF5A36] text-sm">
                  {lives.map(l => <option key={l.id} value={l.id}>{l.title} ({l.status})</option>)}
                </select>
              )}
            </div>

            {/* Link Generator */}
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Link2 className="w-5 h-5 text-[#FF5A36]" />Link da Live</h2>
              {selectedLive ? (
                <div className="space-y-3">
                  <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-3 font-mono text-xs text-gray-300 break-all">
                    {window.location.origin}/live/{selectedLive.slug}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyLink(selectedLive.slug, selectedLive.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors ${copiedId === selectedLive.id ? "bg-green-500 text-white" : "bg-white/10 hover:bg-white/20 text-white"}`}
                    >
                      {copiedId === selectedLive.id ? <><Check className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar Link</>}
                    </button>
                    <Link to={`/live/${selectedLive.slug}`} target="_blank" className="flex items-center justify-center gap-2 bg-[#FF5A36]/20 hover:bg-[#FF5A36]/30 text-[#FF5A36] px-4 rounded-xl transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ) : <p className="text-gray-500 text-sm">Selecione uma live acima.</p>}
            </div>

            {/* Export CSV */}
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-2 flex items-center gap-2"><Download className="w-5 h-5 text-[#FF5A36]" />Exportar Pedidos</h2>
              <p className="text-gray-500 text-xs mb-4">Exporta todos os pedidos da live selecionada em formato CSV.</p>
              <button
                onClick={exportCSV}
                disabled={!selectedLiveId || csvLoading}
                className="w-full flex items-center justify-center gap-2 bg-[#FF5A36] hover:bg-[#e04825] disabled:opacity-40 text-white py-3 rounded-xl font-bold text-sm transition-colors"
              >
                {csvLoading ? <><RefreshCw className="w-4 h-4 animate-spin" />Gerando CSV...</> : <><Download className="w-4 h-4" />Exportar CSV</>}
              </button>
            </div>

            {/* Supabase & Database Connection Status */}
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#FF5A36]" />Banco & Supabase
                </h2>
                <button
                  onClick={loadDbStatus}
                  disabled={dbStatusLoading}
                  className="text-gray-500 hover:text-white transition-colors"
                  title="Atualizar status"
                >
                  <RefreshCw className={`w-4 h-4 ${dbStatusLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
              <p className="text-gray-500 text-xs mb-4">Gerenciamento do banco de dados e integração com Supabase.</p>

              <div className="space-y-3">
                {/* Supabase status */}
                <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <Cloud className="w-4 h-4 text-emerald-400" />
                      <div>
                        <p className="text-xs font-bold text-white">Supabase Cloud</p>
                        <p className="text-[11px] text-gray-500">Banco de Dados PostgreSQL e Storage</p>
                      </div>
                    </div>
                    {dbStatus?.supabase?.connected ? (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Conectado
                      </span>
                    ) : dbStatus?.supabase?.configured ? (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Configurado
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400">
                        Pendente
                      </span>
                    )}
                  </div>
                  {dbStatus?.supabase?.message && (
                    <p className="text-[11px] text-gray-400 mt-2 border-t border-white/5 pt-2">
                      {dbStatus.supabase.message}
                    </p>
                  )}
                  {dbStatus?.supabase?.storageBuckets && dbStatus.supabase.storageBuckets.length > 0 && (
                    <div className="mt-2 text-[11px] text-emerald-400/80 bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-2">
                      Buckets detectados: {dbStatus.supabase.storageBuckets.join(", ")}
                    </div>
                  )}
                </div>

                {/* Schema copy guide */}
                <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-orange-400" /> Esquema SQL Supabase
                    </span>
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#FF5A36] hover:underline flex items-center gap-1"
                    >
                      Supabase <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-[11px] text-gray-400 mb-3">
                    Arquivo <code className="text-white bg-black/40 px-1 py-0.5 rounded">supabase_schema.sql</code> pronto com todas as tabelas (users, lives, products, orders, chat, etc).
                  </p>
                  <button
                    onClick={() => {
                      fetch("/api/system/supabase-schema")
                        .then((res) => {
                          if (res.ok) return res.text();
                          throw new Error();
                        })
                        .catch(() => "Arquivo supabase_schema.sql disponível na raiz do projeto.")
                        .then((text) => {
                          navigator.clipboard.writeText(text);
                          setCopiedId("supabase_sql");
                          setTimeout(() => setCopiedId(null), 2500);
                        });
                    }}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      copiedId === "supabase_sql"
                        ? "bg-emerald-600 text-white"
                        : "bg-white/10 hover:bg-white/20 text-white"
                    }`}
                  >
                    {copiedId === "supabase_sql" ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Script SQL Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copiar Script SQL do Supabase
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Stats + Draft Cleanup */}
          <div className="xl:col-span-2 space-y-6">

            {/* Live Stats */}
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2"><BarChart3 className="w-5 h-5 text-[#FF5A36]" />Relatório da Live</h2>
                {selectedLiveId && <button onClick={() => loadStats(selectedLiveId)} className="text-gray-500 hover:text-white transition-colors"><RefreshCw className={`w-4 h-4 ${statsLoading ? "animate-spin" : ""}`} /></button>}
              </div>

              {statsLoading ? (
                <div className="text-center py-8 text-gray-500"><RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" />Carregando dados...</div>
              ) : !stats ? (
                <div className="text-center py-8 text-gray-600">
                  <BarChart3 className="w-10 h-10 mx-auto text-gray-700 mb-3" />
                  <p>Selecione uma live para ver o relatório.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Visitantes", value: stats.totalVisitors, sub: `${stats.buyers} compradores`, icon: <Users className="w-5 h-5" />, color: "text-blue-400", bg: "bg-blue-500/10" },
                    { label: "Pedidos", value: stats.totalOrders, sub: `${stats.confirmedOrders} confirmados`, icon: <ShoppingCart className="w-5 h-5" />, color: "text-yellow-400", bg: "bg-yellow-500/10" },
                    { label: "Faturamento", value: `R$ ${stats.totalRevenue.toFixed(2)}`, sub: `R$ ${stats.confirmedRevenue.toFixed(2)} confirmado`, icon: <DollarSign className="w-5 h-5" />, color: "text-green-400", bg: "bg-green-500/10" },
                    { label: "Chat", value: stats.totalMessages, sub: "mensagens", icon: <MessageSquare className="w-5 h-5" />, color: "text-purple-400", bg: "bg-purple-500/10" },
                  ].map(m => (
                    <div key={m.label} className={`${m.bg} border border-white/5 rounded-2xl p-5 flex flex-col gap-2`}>
                      <div className={`${m.color} mb-1`}>{m.icon}</div>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{m.label}</p>
                      <p className={`text-2xl font-black ${m.color}`}>{m.value}</p>
                      <p className="text-xs text-gray-500">{m.sub}</p>
                    </div>
                  ))}
                </div>
              )}

              {stats && stats.totalVisitors > 0 && (
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-2 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" />Taxa de Conversão</p>
                    <p className="text-3xl font-black text-[#FF5A36]">
                      {stats.totalVisitors > 0 ? ((stats.buyers / stats.totalVisitors) * 100).toFixed(1) : "0"}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{stats.buyers} de {stats.totalVisitors} visitantes compraram</p>
                  </div>
                  <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-2 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" />Ticket Médio</p>
                    <p className="text-3xl font-black text-green-400">
                      R$ {stats.totalOrders > 0 ? (stats.totalRevenue / stats.totalOrders).toFixed(2) : "0,00"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">por pedido</p>
                  </div>
                </div>
              )}
            </div>

            {/* Draft Cleanup */}
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-2 flex items-center gap-2"><Trash2 className="w-5 h-5 text-[#FF5A36]" />Limpeza de Lives</h2>
              <p className="text-gray-500 text-sm mb-5">Exclua lives que não serão mais usadas para manter o painel organizado.</p>
              {livesLoading ? (
                <div className="text-gray-500 text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" />Carregando...</div>
              ) : lives.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhuma live cadastrada.</p>
              ) : (
                <div className="space-y-3">
                  {lives.map(live => {
                    const badge = statusBadge(live.status);
                    return (
                      <div key={live.id} className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-bold text-white text-sm truncate">{live.title}</p>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                          </div>
                          <p className="text-xs text-gray-500 font-mono">{live.slug}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Link to={`/painel/lives/${live.id}`} className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors">
                            <Eye className="w-3.5 h-3.5" /> Editar
                          </Link>
                          <button
                            onClick={() => deleteDraftLive(live.id, live.title)}
                            disabled={deletingId === live.id}
                            className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-40"
                          >
                            {deletingId === live.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            Excluir
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
