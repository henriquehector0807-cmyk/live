import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft, Upload, Save, Plus, Clock, Trash2, ExternalLink, Play,
  AlertCircle, ShoppingBag, Package, Send, MessageSquare, Settings,
  ShoppingCart, Zap, CheckCircle2, XCircle, RefreshCw, Copy, Check,
  Radio, Users, BarChart3, Pencil, Eye, EyeOff
} from "lucide-react";

const AUTH_HEADER = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });
const AUTH_HEADER_PLAIN = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

export default function LiveEditor() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [activeTab, setActiveTab] = useState("info");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Live form data
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    productName: "",
    productPrice: 0,
    videoUrl: "",
    status: "draft",
    botEnabled: true
  });

  // Timeline
  const [timeline, setTimeline] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Player
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Timeline form
  const [newTimelineItem, setNewTimelineItem] = useState({ productId: "", startTime: 0, endTime: 0, showOnVideo: true });
  const [editingTimelineId, setEditingTimelineId] = useState<string | null>(null);
  const [overlapError, setOverlapError] = useState("");

  // Events
  const [events, setEvents] = useState<any[]>([]);
  const [eventForm, setEventForm] = useState({ type: "order", timeSeconds: 0, message: "", buyerName: "" });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventError, setEventError] = useState("");

  // Orders
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Chat
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatPolling, setChatPolling] = useState<ReturnType<typeof setInterval> | null>(null);

  // Settings
  const [liveSlug, setLiveSlug] = useState("");
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [isDeletingLive, setIsDeletingLive] = useState(false);

  useEffect(() => { if (!loading && !user) navigate("/login"); }, [user, loading, navigate]);

  useEffect(() => {
    if (user && isEditing) { loadLive(); loadTimeline(); }
    if (user) loadProducts();
  }, [user, isEditing]);

  // Tab change effects
  useEffect(() => {
    if (!isEditing) return;
    if (activeTab === "events") loadEvents();
    if (activeTab === "orders") loadOrders();
    if (activeTab === "chat") { loadChat(); startChatPolling(); }
    else { stopChatPolling(); }
  }, [activeTab, isEditing]);

  useEffect(() => () => stopChatPolling(), []);

  // ── Loaders ─────────────────────────────────────────────────

  const loadLive = async () => {
    try {
      const res = await fetch(`/api/lives/${id}`, { headers: AUTH_HEADER_PLAIN() });
      if (res.ok) {
        const data = await res.json();
        setFormData({
          title: data.title, description: data.description || "",
          productName: data.productName, productPrice: data.productPrice,
          videoUrl: data.videoUrl, status: data.status, botEnabled: data.botEnabled !== 0
        });
        setLiveSlug(data.slug || "");
      }
    } catch (e) { console.error(e); }
  };

  const loadTimeline = async () => {
    try {
      const res = await fetch(`/api/lives/${id}/products`, { headers: AUTH_HEADER_PLAIN() });
      if (res.ok) setTimeline(await res.json());
    } catch (e) { console.error(e); }
  };

  const loadProducts = async () => {
    try {
      const res = await fetch(`/api/products`, { headers: AUTH_HEADER_PLAIN() });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
        if (data.length > 0 && !newTimelineItem.productId)
          setNewTimelineItem(prev => ({ ...prev, productId: data[0].id }));
      }
    } catch (e) { console.error(e); }
  };

  const loadEvents = async () => {
    try {
      const res = await fetch(`/api/lives/${id}/events`, { headers: AUTH_HEADER_PLAIN() });
      if (res.ok) setEvents(await res.json());
    } catch (e) { console.error(e); }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch(`/api/lives/${id}/orders`, { headers: AUTH_HEADER_PLAIN() });
      if (res.ok) setOrders(await res.json());
    } catch (e) { console.error(e); } finally { setOrdersLoading(false); }
  };

  const loadChat = async () => {
    try {
      const res = await fetch(`/api/lives/${id}/admin-chat`, { headers: AUTH_HEADER_PLAIN() });
      if (res.ok) {
        const msgs = await res.json();
        setChatMessages(msgs);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    } catch (e) { console.error(e); }
  };

  const startChatPolling = () => {
    stopChatPolling();
    const iv = setInterval(loadChat, 4000);
    setChatPolling(iv);
  };
  const stopChatPolling = () => {
    setChatPolling(prev => { if (prev) clearInterval(prev); return null; });
  };

  // ── Save Live ────────────────────────────────────────────────

  const handleSubmit = async (e?: React.FormEvent, overrideStatus?: string) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const url = isEditing ? `/api/lives/${id}` : "/api/lives";
      const method = isEditing ? "PUT" : "POST";
      const body = { ...formData, productPrice: parseFloat(formData.productPrice as any) || 0 };
      if (overrideStatus) body.status = overrideStatus;
      const res = await fetch(url, { method, headers: AUTH_HEADER(), body: JSON.stringify(body) });
      if (res.ok) {
        const data = await res.json();
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
        if (!isEditing) navigate(`/painel/lives/${data.id}`);
        else if (overrideStatus) setFormData(prev => ({ ...prev, status: overrideStatus }));
      }
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
  };

  const handlePublish = () => handleSubmit(undefined, "live");

  // ── Video Upload ─────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    if (!file.type.startsWith("video/")) { setUploadError("Selecione um arquivo de vídeo válido."); e.target.value = ""; return; }
    setIsUploading(true); setUploadProgress(0); setUploadError("");
    const form = new FormData();
    form.append("video", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/videos/upload");
    xhr.setRequestHeader("Authorization", `Bearer ${localStorage.getItem("token")}`);
    xhr.upload.onprogress = ev => { if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100)); };
    xhr.onload = () => {
      setIsUploading(false);
      try {
        const data = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300 && data.url) { setUploadProgress(100); setFormData(prev => ({ ...prev, videoUrl: data.url })); }
        else setUploadError(data.error || "Não foi possível enviar o vídeo.");
      } catch { setUploadError("Resposta inválida ao enviar o vídeo."); }
    };
    xhr.onerror = () => { setIsUploading(false); setUploadError("Falha de conexão durante o upload."); };
    xhr.send(form);
  };

  // ── Player helpers ───────────────────────────────────────────

  const handleTimeUpdate = () => { if (videoRef.current) setCurrentTime(videoRef.current.currentTime); };
  const handleLoadedMetadata = () => { if (videoRef.current) setDuration(videoRef.current.duration || 0); };
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); }
    else { videoRef.current.pause(); setIsPlaying(false); }
  };
  const seekVideo = (t: number) => {
    if (videoRef.current) { const c = Math.max(0, Math.min(t, duration || 0)); videoRef.current.currentTime = c; setCurrentTime(c); }
  };
  const formatTime = (secs: number) => {
    const total = Math.max(0, Math.floor(Number(secs) || 0));
    const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
    if (h > 0) return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };
  const formatFullTime = (secs: number) => {
    const total = Math.max(0, Math.floor(Number(secs) || 0));
    const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };
  const parseTime = (value: string) => {
    const parts = value.split(":").map(Number);
    if (parts.some(p => !Number.isFinite(p) || p < 0)) return 0;
    if (parts.length === 3) return Math.floor(parts[0] * 3600 + parts[1] * 60 + parts[2]);
    if (parts.length === 2) return Math.floor(parts[0] * 60 + parts[1]);
    return Math.floor(parts[0] || 0);
  };

  // ── Timeline handlers ────────────────────────────────────────

  const resetTimelineForm = () => { setEditingTimelineId(null); setNewTimelineItem({ productId: products[0]?.id || "", startTime: 0, endTime: 0, showOnVideo: true }); setOverlapError(""); };

  const handleAddTimelineItem = async (e: React.FormEvent) => {
    e.preventDefault(); setOverlapError("");
    if (!newTimelineItem.productId) { setOverlapError("Selecione um produto."); return; }
    if (newTimelineItem.endTime <= newTimelineItem.startTime) { setOverlapError("O tempo final deve ser maior que o tempo inicial."); return; }
    const url = editingTimelineId ? `/api/lives/${id}/products/${editingTimelineId}` : `/api/lives/${id}/products`;
    const res = await fetch(url, { method: editingTimelineId ? "PUT" : "POST", headers: AUTH_HEADER(), body: JSON.stringify({ ...newTimelineItem, duration }) });
    if (res.ok) { resetTimelineForm(); loadTimeline(); }
    else { const d = await res.json(); setOverlapError(d.error || "Erro ao salvar produto na timeline"); }
  };

  const editTimelineItem = (item: any) => {
    setEditingTimelineId(item.id);
    setNewTimelineItem({ productId: item.productId, startTime: item.startTime, endTime: item.endTime, showOnVideo: Boolean(item.showOnVideo) });
    setOverlapError(""); seekVideo(item.startTime);
  };

  const duplicateTimelineItem = async (item: any) => {
    const shift = Math.max(15, item.endTime - item.startTime);
    const newStart = Math.min(item.endTime, Math.max(0, (duration || 0) - shift));
    const newEnd = Math.min(newStart + shift, duration || newStart + shift);
    const res = await fetch(`/api/lives/${id}/products`, { method: "POST", headers: AUTH_HEADER(), body: JSON.stringify({ productId: item.productId, startTime: newStart, endTime: newEnd, showOnVideo: Boolean(item.showOnVideo), duration }) });
    if (res.ok) loadTimeline();
    else { setEditingTimelineId(null); setNewTimelineItem({ productId: item.productId, startTime: Math.floor(currentTime), endTime: Math.floor(currentTime + shift), showOnVideo: true }); }
  };

  const removeTimelineItem = async (timelineId: string) => {
    if (!window.confirm("Remover este produto da timeline?")) return;
    await fetch(`/api/lives/${id}/products/${timelineId}`, { method: "DELETE", headers: AUTH_HEADER_PLAIN() });
    loadTimeline();
  };

  const getActiveProductAtTime = (t: number) => timeline.find(item => t >= item.startTime && t < item.endTime);
  const activeProduct = getActiveProductAtTime(currentTime);

  // ── Events handlers ──────────────────────────────────────────

  const resetEventForm = () => { setEditingEventId(null); setEventForm({ type: "order", timeSeconds: 0, message: "", buyerName: "" }); setEventError(""); };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault(); setEventError("");
    if (!eventForm.message.trim()) { setEventError("Mensagem obrigatória."); return; }
    const url = editingEventId ? `/api/lives/${id}/events/${editingEventId}` : `/api/lives/${id}/events`;
    const res = await fetch(url, { method: editingEventId ? "PUT" : "POST", headers: AUTH_HEADER(), body: JSON.stringify(eventForm) });
    if (res.ok) { resetEventForm(); loadEvents(); }
    else { const d = await res.json(); setEventError(d.error || "Erro ao salvar evento"); }
  };

  const deleteEvent = async (eventId: string) => {
    if (!window.confirm("Excluir este evento?")) return;
    await fetch(`/api/lives/${id}/events/${eventId}`, { method: "DELETE", headers: AUTH_HEADER_PLAIN() });
    loadEvents();
  };

  const toggleEventEnabled = async (ev: any) => {
    await fetch(`/api/lives/${id}/events/${ev.id}`, { method: "PUT", headers: AUTH_HEADER(), body: JSON.stringify({ enabled: !ev.enabled }) });
    loadEvents();
  };

  // ── Orders helpers ───────────────────────────────────────────

  const updateOrderStatus = async (orderId: string, status: string) => {
    await fetch(`/api/lives/${id}/orders/${orderId}`, { method: "PUT", headers: AUTH_HEADER(), body: JSON.stringify({ status }) });
    loadOrders();
  };

  const ordersBadge = (status: string) => {
    if (status === "confirmed") return "bg-green-500/20 text-green-400 border border-green-500/30";
    if (status === "cancelled") return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
    return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
  };
  const ordersLabel = (status: string) => ({ confirmed: "Confirmado", cancelled: "Cancelado", pending_payment: "Aguardando Pagto" }[status] || status);

  // ── Chat ──────────────────────────────────────────────────────

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingChat) return;
    setIsSendingChat(true);
    try {
      const res = await fetch(`/api/lives/${id}/admin-chat`, { method: "POST", headers: AUTH_HEADER(), body: JSON.stringify({ message: chatInput.trim() }) });
      if (res.ok) {
        const msg = await res.json();
        setChatMessages(prev => [...prev, msg]);
        setChatInput("");
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    } catch (e) { console.error(e); } finally { setIsSendingChat(false); }
  };

  const chatSenderStyle = (type: string) => {
    if (type === "influencer") return "bg-[#FF5A36]/20 border border-[#FF5A36]/30 text-[#FF5A36]";
    if (type === "bot") return "bg-blue-500/20 border border-blue-500/30 text-blue-400";
    if (type === "system") return "bg-white/10 border border-white/10 text-gray-400";
    return "bg-white/5 border border-white/10 text-white";
  };

  // ── Delete live ──────────────────────────────────────────────

  const deleteLive = async () => {
    if (!window.confirm("Tem certeza que deseja EXCLUIR esta live permanentemente? Esta ação não pode ser desfeita.")) return;
    setIsDeletingLive(true);
    try {
      const res = await fetch(`/api/lives/${id}`, { method: "DELETE", headers: AUTH_HEADER_PLAIN() });
      if (res.ok) navigate("/painel");
    } catch (e) { console.error(e); } finally { setIsDeletingLive(false); }
  };

  // ── Copy slug ─────────────────────────────────────────────────

  const copyLink = () => {
    const link = `${window.location.origin}/live/${liveSlug}`;
    navigator.clipboard.writeText(link).then(() => { setCopiedSlug(true); setTimeout(() => setCopiedSlug(false), 2000); });
  };

  if (loading) return null;

  const statusColor = { draft: "bg-gray-800 text-gray-400", scheduled: "bg-blue-500/20 text-blue-400", live: "bg-red-500/20 text-red-400", ended: "bg-gray-700 text-gray-500" };

  // ── TABS CONFIG ───────────────────────────────────────────────

  const TABS = [
    { id: "info", label: "Informações", icon: "📝" },
    { id: "video", label: "Vídeo", icon: "🎬" },
    { id: "products", label: "Produtos da Live", icon: "📦" },
    { id: "events", label: "Eventos", icon: "⚡" },
    { id: "orders", label: "Pedidos", icon: "🛒" },
    { id: "chat", label: "Chat", icon: "💬" },
    { id: "settings", label: "Configurações", icon: "⚙️" },
  ];

  return (
    <div className="flex min-h-screen bg-[#0F0F0F] text-white font-sans">
      <main className="flex-1 max-w-6xl mx-auto w-full flex flex-col h-screen">
        {/* Header */}
        <header className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-4">
            <Link to="/painel" className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{isEditing ? "Editar Live" : "Nova Live"}</h1>
              {isEditing && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${statusColor[formData.status as keyof typeof statusColor] || "bg-gray-800 text-gray-400"}`}>{formData.status}</span>
                  {liveSlug && <span className="text-xs text-gray-500 font-mono">{liveSlug}</span>}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSubmit()}
              disabled={isSaving || !formData.videoUrl}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold transition-colors ${saveSuccess ? "bg-green-600 text-white" : "bg-white/10 hover:bg-white/20 text-white"} disabled:opacity-40`}
            >
              {saveSuccess ? <><CheckCircle2 className="w-4 h-4" /><span>Salvo!</span></> : <><Save className="w-4 h-4" /><span>{isSaving ? "Salvando..." : "Salvar"}</span></>}
            </button>
            <button
              onClick={handlePublish}
              disabled={isSaving || !formData.videoUrl || formData.status === "live"}
              className="flex items-center space-x-2 bg-[#FF5A36] hover:bg-[#e04825] disabled:opacity-40 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-lg shadow-[#FF5A36]/20"
            >
              <Radio className="w-4 h-4" />
              <span>{formData.status === "live" ? "Ao Vivo!" : "Publicar"}</span>
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Tabs Sidebar */}
          <aside className="w-56 border-r border-white/10 p-3 space-y-1 overflow-y-auto shrink-0 bg-[#121212]">
            {TABS.map(tab => {
              const disabled = !isEditing && tab.id !== "info" && tab.id !== "video";
              return (
                <button
                  key={tab.id}
                  disabled={disabled}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-2.5 ${
                    activeTab === tab.id ? "bg-[#FF5A36] text-white" : disabled ? "opacity-30 cursor-not-allowed text-gray-500" : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="text-base">{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </aside>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-8 relative">

            {/* ─── INFO TAB ─────────────────────────────────────── */}
            {activeTab === "info" && (
              <div className="max-w-2xl space-y-6">
                <h2 className="text-xl font-bold mb-6">Informações Básicas</h2>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Título da Live</label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF5A36]" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Descrição</label>
                  <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF5A36]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Produto Fallback</label>
                    <input required type="text" value={formData.productName} onChange={e => setFormData({ ...formData, productName: e.target.value })} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF5A36]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Preço Fallback (R$)</label>
                    <input required type="number" step="0.01" value={formData.productPrice} onChange={e => setFormData({ ...formData, productPrice: parseFloat(e.target.value) })} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF5A36]" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Status</label>
                  <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF5A36]">
                    <option value="draft">Rascunho</option>
                    <option value="scheduled">Agendada</option>
                    <option value="live">Ao Vivo</option>
                    <option value="ended">Encerrada</option>
                  </select>
                </div>
                <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white text-sm block">Bot IA de Atendimento</span>
                    <span className="text-gray-400 text-xs">Permitir que a IA responda perguntas dos visitantes</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={formData.botEnabled} onChange={e => setFormData({ ...formData, botEnabled: e.target.checked })} className="sr-only peer" />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF5A36]"></div>
                  </label>
                </div>
                <button onClick={() => handleSubmit()} disabled={isSaving} className="w-full bg-[#FF5A36] hover:bg-[#e04825] text-white py-3 rounded-xl font-bold text-sm transition-colors">
                  {isSaving ? "Salvando..." : isEditing ? "Salvar Informações" : "Criar Live →"}
                </button>
              </div>
            )}

            {/* ─── VIDEO TAB ────────────────────────────────────── */}
            {activeTab === "video" && (
              <div className="max-w-2xl space-y-6">
                <h2 className="text-xl font-bold mb-6">Vídeo Gravado</h2>
                {!formData.videoUrl ? (
                  <div className="border-2 border-dashed border-white/20 rounded-xl p-8 flex flex-col items-center justify-center bg-[#1A1A1A] hover:bg-white/5 transition-colors relative cursor-pointer min-h-64">
                    <input type="file" accept="video/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isUploading} />
                    <Upload className="w-10 h-10 text-gray-500 mb-4" />
                    <p className="font-bold text-gray-300">{isUploading ? "Enviando..." : "Clique ou arraste um vídeo"}</p>
                    {isUploading && (
                      <div className="mt-5 w-full max-w-sm">
                        <div className="flex justify-between text-xs font-bold text-gray-400 mb-2"><span>Progresso</span><span>{uploadProgress}%</span></div>
                        <div className="h-2 rounded-full bg-black/60 overflow-hidden border border-white/10">
                          <div className="h-full bg-[#FF5A36] transition-[width] duration-150" style={{ width: `${uploadProgress}%` }} />
                        </div>
                      </div>
                    )}
                    {uploadError && <div className="mt-5 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300"><AlertCircle className="w-4 h-4" />{uploadError}</div>}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-[#1A1A1A] border border-white/10 rounded-lg p-4 flex justify-between items-center">
                      <span className="truncate flex-1 pr-4 font-mono text-sm">{formData.videoUrl}</span>
                      <button type="button" onClick={() => setFormData({ ...formData, videoUrl: "" })} className="text-red-500 text-sm font-bold uppercase hover:bg-red-500/10 px-3 py-1 rounded">Remover</button>
                    </div>
                    <div className="aspect-[9/16] max-h-[500px] w-auto mx-auto bg-black rounded-xl overflow-hidden border border-white/10">
                      <video src={formData.videoUrl} controls className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── PRODUCTS / TIMELINE TAB ─────────────────────── */}
            {activeTab === "products" && (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-6 shrink-0">
                  <div>
                    <h2 className="text-xl font-bold">Timeline de Exibição</h2>
                    <p className="text-gray-400 text-sm mt-1">Sincronize a exibição dos produtos com os momentos exatos do vídeo.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 min-h-0 flex-1">
                  {/* Player */}
                  <div className="flex flex-col min-h-0 space-y-4">
                    <div className="bg-[#121212] p-4 rounded-2xl border border-white/10 shrink-0">
                      <div className="relative aspect-[9/16] mx-auto w-full max-w-[280px] bg-black rounded-xl overflow-hidden shadow-xl shrink-0">
                        {formData.videoUrl ? (
                          <video ref={videoRef} src={formData.videoUrl} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} className="w-full h-full object-cover cursor-pointer" onClick={togglePlay} />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-500">Sem vídeo</div>
                        )}
                        {activeProduct && activeProduct.showOnVideo && (
                          <div className="absolute bottom-4 left-3 right-3 bg-black/85 backdrop-blur-md border border-[#FF5A36]/40 rounded-xl p-2.5 flex items-center gap-3 shadow-2xl">
                            <div className="w-11 h-11 bg-white rounded-lg overflow-hidden shrink-0 p-0.5 flex items-center justify-center">
                              {activeProduct.product?.imageUrl ? <img src={activeProduct.product.imageUrl} className="w-full h-full object-contain" /> : <ShoppingBag className="w-5 h-5 text-gray-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[#FF5A36] text-[9px] font-bold uppercase tracking-wider block">Produto Ativo</span>
                              <p className="font-bold text-white text-xs truncate">{activeProduct.product?.name}</p>
                              <p className="text-[#FF5A36] font-black text-xs mt-0.5">R$ {activeProduct.product?.price?.toFixed(2)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 bg-[#1A1A1A] border border-white/10 rounded-xl p-3 max-w-[340px] mx-auto">
                        <div className="flex items-center gap-3 mb-2">
                          <button type="button" onClick={togglePlay} className="w-9 h-9 rounded-full bg-[#FF5A36] hover:bg-[#e04825] text-white flex items-center justify-center shrink-0 transition active:scale-95">
                            {isPlaying ? <span className="w-3 h-3 border-x-2 border-white block"></span> : <Play className="w-4 h-4 ml-0.5" />}
                          </button>
                          <div className="font-mono text-xs font-bold text-white flex-1">
                            <span className="text-[#FF5A36]">{formatFullTime(currentTime)}</span>
                            <span className="text-gray-500 mx-1">/</span>
                            <span className="text-gray-400">{formatFullTime(duration)}</span>
                          </div>
                        </div>
                        <input type="range" min={0} max={duration || 100} step={0.1} value={duration ? Math.min(currentTime, duration) : 0} onChange={e => seekVideo(parseFloat(e.target.value))} className="w-full h-2 bg-black rounded-lg appearance-none cursor-pointer accent-[#FF5A36]" />
                      </div>
                    </div>
                    {/* Visual Timeline */}
                    <div className="bg-[#121212] p-4 rounded-2xl border border-white/10 flex flex-col min-h-0">
                      <div className="flex items-center justify-between text-xs font-mono text-gray-400 mb-2">
                        <span className="font-bold text-white flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-[#FF5A36]" /> Régua da Timeline</span>
                        <span>Total: {formatFullTime(duration)}</span>
                      </div>
                      <div className="relative h-6 text-[10px] font-mono text-gray-500 select-none border-b border-white/10 mb-1">
                        {duration > 0 ? (() => {
                          const step = duration > 300 ? 120 : duration > 120 ? 60 : 30;
                          const markers = [];
                          for (let t = 0; t <= duration; t += step) {
                            markers.push(<div key={t} className="absolute -translate-x-1/2 flex flex-col items-center" style={{ left: `${(t / duration) * 100}%` }}><span>{formatTime(t)}</span><div className="w-px h-1.5 bg-white/20"></div></div>);
                          }
                          return markers;
                        })() : <div className="text-center text-gray-600">Carregue um vídeo para exibir a régua</div>}
                      </div>
                      <div className="relative h-28 bg-black/60 rounded-xl border border-white/10 overflow-hidden cursor-pointer shadow-inner" onClick={e => { if (!duration) return; const rect = e.currentTarget.getBoundingClientRect(); seekVideo((Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))) * duration); }}>
                        {duration > 0 && <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none" style={{ left: `${(currentTime / duration) * 100}%` }}><div className="absolute -top-1 -translate-x-1/2 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white shadow"></div></div>}
                        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px)] bg-[size:10%_100%] pointer-events-none"></div>
                        {duration > 0 && timeline.map(item => {
                          const left = (item.startTime / duration) * 100;
                          const width = Math.max(2, ((item.endTime - item.startTime) / duration) * 100);
                          const isActive = currentTime >= item.startTime && currentTime < item.endTime;
                          return (
                            <div key={item.id} onClick={e => { e.stopPropagation(); seekVideo(item.startTime); }} className={`absolute top-2 bottom-2 rounded-lg border text-[10px] p-2 flex flex-col justify-between overflow-hidden transition-all duration-200 ${isActive ? "bg-[#FF5A36]/40 border-[#FF5A36] text-white z-20" : "bg-white/10 border-white/20 text-gray-300 hover:bg-white/20"}`} style={{ left: `${left}%`, width: `${width}%` }} title={`${item.product?.name} (${formatTime(item.startTime)} - ${formatTime(item.endTime)})`}>
                              <span className="font-bold truncate text-xs leading-none text-white">{item.product?.name}</span>
                              <span className="font-mono text-[9px] opacity-80">{formatTime(item.startTime)} - {formatTime(item.endTime)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  {/* Timeline Controls */}
                  <div className="flex flex-col min-h-0 bg-[#121212] rounded-2xl border border-white/10 overflow-hidden">
                    <div className="p-5 border-b border-white/10 bg-[#1A1A1A]">
                      <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-[#FF5A36]" />{editingTimelineId ? "Editar Produto na Live" : "Adicionar Produto à Live"}</h3>
                      <form onSubmit={handleAddTimelineItem} className="space-y-4">
                        {overlapError && <div className="bg-red-500/20 text-red-400 p-3 rounded-lg border border-red-500/20 text-sm font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{overlapError}</div>}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Produto</label>
                            <select required value={newTimelineItem.productId} onChange={e => setNewTimelineItem({ ...newTimelineItem, productId: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF5A36]">
                              <option value="" disabled>Selecionar produto ▼</option>
                              {products.map(p => <option key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)}</option>)}
                            </select>
                          </div>
                          {(["startTime", "endTime"] as const).map(field => (
                            <div key={field}>
                              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">{field === "startTime" ? "Início" : "Fim"} (00:00:00)</label>
                              <div className="flex gap-2">
                                <input required type="text" placeholder="00:00:00" value={formatFullTime(newTimelineItem[field])} onChange={e => setNewTimelineItem({ ...newTimelineItem, [field]: parseTime(e.target.value) })} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF5A36] font-mono text-center text-sm" />
                                <button type="button" onClick={() => setNewTimelineItem({ ...newTimelineItem, [field]: Math.floor(videoRef.current?.currentTime || 0) })} className="shrink-0 bg-white/10 hover:bg-[#FF5A36] text-white px-3 rounded-lg text-xs font-bold transition-colors border border-white/10 flex items-center gap-1.5" title="Capturar tempo atual"><Clock className="w-3.5 h-3.5" /> ⏱</button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                          {editingTimelineId && <button type="button" onClick={resetTimelineForm} className="bg-white/5 text-white px-5 py-2.5 rounded-lg font-bold text-xs hover:bg-white/10 transition">Cancelar</button>}
                          <button type="submit" className="bg-[#FF5A36] text-white px-6 py-2.5 rounded-lg font-bold text-xs hover:bg-[#e04825] transition active:scale-95">{editingTimelineId ? "Salvar alterações" : "Adicionar produto"}</button>
                        </div>
                      </form>
                    </div>
                    <div className="p-4 bg-[#121212] border-b border-white/5 font-bold flex justify-between items-center text-sm"><span>Produtos na Timeline ({timeline.length})</span></div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {timeline.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 text-sm"><Package className="w-10 h-10 mx-auto text-gray-700 mb-3" />Nenhum produto configurado.<br />Selecione o produto e o tempo acima.</div>
                      ) : (
                        timeline.sort((a, b) => a.startTime - b.startTime).map(item => (
                          <div key={item.id} className="bg-[#1A1A1A] border border-white/5 rounded-xl p-3.5 flex items-center gap-4 hover:bg-white/5 transition-colors group">
                            <div className="w-12 h-12 bg-black rounded-lg overflow-hidden shrink-0 border border-white/5 p-1 flex items-center justify-center">
                              {item.product?.imageUrl ? <img src={item.product.imageUrl} className="w-full h-full object-contain" /> : <ShoppingBag className="w-6 h-6 text-gray-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-white text-sm truncate">{item.product?.name}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                <span className="font-mono bg-black px-1.5 py-0.5 rounded border border-white/10 text-white">{formatFullTime(item.startTime)}</span>
                                <span>até</span>
                                <span className="font-mono bg-black px-1.5 py-0.5 rounded border border-white/10 text-white">{formatFullTime(item.endTime)}</span>
                                <span className="text-[#FF5A36] ml-1 font-bold">({formatTime(item.endTime - item.startTime)})</span>
                              </div>
                            </div>
                            <div className="shrink-0 flex items-center gap-1.5">
                              <button onClick={() => editTimelineItem(item)} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-xs font-bold">Editar</button>
                              <button onClick={() => duplicateTimelineItem(item)} className="px-3 py-1.5 bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white rounded-lg transition-colors text-xs font-bold">Dupl.</button>
                              <button onClick={() => removeTimelineItem(item.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── EVENTS TAB ───────────────────────────────────── */}
            {activeTab === "events" && (
              <div className="max-w-3xl">
                <div className="mb-6">
                  <h2 className="text-xl font-bold">Eventos do Vídeo</h2>
                  <p className="text-gray-400 text-sm mt-1">Crie popups automáticos que aparecem no momento exato do vídeo (notificações de compra, mensagens de sistema, etc.)</p>
                </div>

                {/* Event Form */}
                <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 mb-6">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#FF5A36]" />
                    {editingEventId ? "Editar Evento" : "Adicionar Evento"}
                  </h3>
                  <form onSubmit={handleSaveEvent} className="space-y-4">
                    {eventError && <div className="bg-red-500/20 text-red-400 p-3 rounded-lg border border-red-500/20 text-sm font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4" />{eventError}</div>}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">Tipo de Evento</label>
                        <select value={eventForm.type} onChange={e => setEventForm({ ...eventForm, type: e.target.value })} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF5A36]">
                          <option value="order">🛒 Compra / Pedido</option>
                          <option value="message">💬 Mensagem do Sistema</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">Segundo do Vídeo</label>
                        <div className="flex gap-2">
                          <input type="number" min={0} value={eventForm.timeSeconds} onChange={e => setEventForm({ ...eventForm, timeSeconds: parseInt(e.target.value) || 0 })} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF5A36] font-mono" />
                          <button type="button" onClick={() => setEventForm({ ...eventForm, timeSeconds: Math.floor(videoRef.current?.currentTime || 0) })} className="shrink-0 bg-white/10 hover:bg-[#FF5A36] text-white px-3 rounded-lg text-xs font-bold transition-colors border border-white/10 flex items-center gap-1" title="Usar tempo atual do player"><Clock className="w-4 h-4" /></button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">= {formatFullTime(eventForm.timeSeconds)}</p>
                      </div>
                    </div>
                    {eventForm.type === "order" && (
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">Nome do Comprador (opcional)</label>
                        <input type="text" placeholder="Ex: Ana S." value={eventForm.buyerName} onChange={e => setEventForm({ ...eventForm, buyerName: e.target.value })} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF5A36]" />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">Mensagem</label>
                      <input required type="text" placeholder={eventForm.type === "order" ? "Ex: comprou 2 unidades ✅" : "Ex: ⚡ Últimas unidades em estoque!"} value={eventForm.message} onChange={e => setEventForm({ ...eventForm, message: e.target.value })} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF5A36]" />
                    </div>
                    <div className="flex justify-end gap-3">
                      {editingEventId && <button type="button" onClick={resetEventForm} className="bg-white/5 text-white px-5 py-2.5 rounded-lg font-bold text-xs hover:bg-white/10 transition">Cancelar</button>}
                      <button type="submit" className="bg-[#FF5A36] text-white px-6 py-2.5 rounded-lg font-bold text-xs hover:bg-[#e04825] transition active:scale-95">{editingEventId ? "Salvar alterações" : "Adicionar Evento"}</button>
                    </div>
                  </form>
                </div>

                {/* Events List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-300">Eventos Configurados ({events.length})</h3>
                    <button onClick={loadEvents} className="text-gray-500 hover:text-white transition-colors"><RefreshCw className="w-4 h-4" /></button>
                  </div>
                  {events.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-white/10 rounded-xl text-gray-500">
                      <Zap className="w-10 h-10 mx-auto text-gray-700 mb-3" />
                      Nenhum evento configurado ainda.
                    </div>
                  ) : (
                    events.map(ev => (
                      <div key={ev.id} className={`bg-[#121212] border rounded-xl p-4 flex items-center gap-4 transition-all ${ev.enabled ? "border-white/10" : "border-white/5 opacity-50"}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${ev.type === "order" ? "bg-green-500/20" : "bg-blue-500/20"}`}>
                          {ev.type === "order" ? "🛒" : "💬"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs bg-black px-2 py-0.5 rounded border border-white/10 text-[#FF5A36] font-bold">{formatFullTime(ev.timeSeconds)}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ev.type === "order" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}`}>{ev.type === "order" ? "Compra" : "Mensagem"}</span>
                          </div>
                          <p className="text-white text-sm font-bold truncate">{ev.buyerName ? <span className="text-[#FF5A36] mr-1">{ev.buyerName}</span> : null}{ev.message}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => toggleEventEnabled(ev)} className={`p-1.5 rounded-lg transition-colors ${ev.enabled ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" : "bg-white/5 text-gray-500 hover:bg-white/10"}`} title={ev.enabled ? "Desativar" : "Ativar"}>
                            {ev.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button onClick={() => { setEditingEventId(ev.id); setEventForm({ type: ev.type, timeSeconds: ev.timeSeconds, message: ev.message, buyerName: ev.buyerName || "" }); }} className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => deleteEvent(ev.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ─── ORDERS TAB ───────────────────────────────────── */}
            {activeTab === "orders" && (
              <div className="max-w-4xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold">Pedidos da Live</h2>
                    <p className="text-gray-400 text-sm mt-1">Gerencie todos os pedidos feitos nessa live.</p>
                  </div>
                  <button onClick={loadOrders} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                    <RefreshCw className={`w-4 h-4 ${ordersLoading ? "animate-spin" : ""}`} /> Atualizar
                  </button>
                </div>

                {/* Metrics */}
                {orders.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: "Total de Pedidos", value: orders.length, color: "text-white" },
                      { label: "Confirmados", value: orders.filter(o => o.status === "confirmed").length, color: "text-green-400" },
                      { label: "Faturamento Total", value: `R$ ${orders.reduce((s, o) => s + Number(o.total || 0), 0).toFixed(2)}`, color: "text-[#FF5A36]" },
                      { label: "Ticket Médio", value: orders.length > 0 ? `R$ ${(orders.reduce((s, o) => s + Number(o.total || 0), 0) / orders.length).toFixed(2)}` : "R$ 0,00", color: "text-blue-400" },
                    ].map(m => (
                      <div key={m.label} className="bg-[#121212] border border-white/10 rounded-xl p-4">
                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">{m.label}</p>
                        <p className={`text-xl font-black ${m.color}`}>{m.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {ordersLoading ? (
                  <div className="text-center py-12 text-gray-500"><RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" />Carregando pedidos...</div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-white/10 rounded-xl">
                    <ShoppingCart className="w-12 h-12 mx-auto text-gray-700 mb-4" />
                    <p className="text-gray-400 font-bold">Nenhum pedido ainda.</p>
                    <p className="text-gray-600 text-sm mt-1">Os pedidos aparecerão aqui conforme os clientes comprarem.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map(order => (
                      <div key={order.id} className="bg-[#121212] border border-white/10 rounded-xl p-4 flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#FF5A36]/20 rounded-xl flex items-center justify-center shrink-0">
                          <ShoppingBag className="w-5 h-5 text-[#FF5A36]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-bold text-white text-sm">{order.buyerName}</p>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ordersBadge(order.status)}`}>{ordersLabel(order.status)}</span>
                          </div>
                          <p className="text-gray-400 text-xs">{order.product?.name || order.productId} · {order.quantity}x · <span className="text-white font-bold">R$ {Number(order.total || 0).toFixed(2)}</span></p>
                          {order.customerPhone && <p className="text-gray-500 text-xs mt-0.5">📞 {order.customerPhone}</p>}
                          {order.customerEmail && <p className="text-gray-500 text-xs">✉️ {order.customerEmail}</p>}
                        </div>
                        <div className="shrink-0 flex flex-col gap-2 items-end">
                          <p className="text-xs text-gray-500">{order.createdAt ? new Date(order.createdAt).toLocaleString("pt-BR") : ""}</p>
                          <div className="flex gap-2">
                            {order.status !== "confirmed" && (
                              <button onClick={() => updateOrderStatus(order.id, "confirmed")} className="flex items-center gap-1 bg-green-500/20 hover:bg-green-500/40 text-green-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar
                              </button>
                            )}
                            {order.status !== "cancelled" && (
                              <button onClick={() => updateOrderStatus(order.id, "cancelled")} className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                                <XCircle className="w-3.5 h-3.5" /> Cancelar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── CHAT TAB ─────────────────────────────────────── */}
            {activeTab === "chat" && (
              <div className="flex flex-col h-full max-w-2xl">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <div>
                    <h2 className="text-xl font-bold">Chat da Live</h2>
                    <p className="text-gray-400 text-sm mt-1">Monitore e participe do chat em tempo real. Suas mensagens aparecem como influencer.</p>
                  </div>
                  <button onClick={loadChat} className="text-gray-500 hover:text-white transition-colors"><RefreshCw className="w-4 h-4" /></button>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-2 mb-4 shrink-0">
                  {[{ type: "viewer", label: "Visitante" }, { type: "influencer", label: "Você (Admin)" }, { type: "bot", label: "Bot IA" }, { type: "system", label: "Sistema" }].map(l => (
                    <span key={l.type} className={`text-xs px-2.5 py-1 rounded-full font-bold ${chatSenderStyle(l.type)}`}>{l.label}</span>
                  ))}
                </div>

                {/* Messages */}
                <div className="flex-1 bg-[#121212] border border-white/10 rounded-2xl p-4 overflow-y-auto space-y-2 min-h-[300px]">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-gray-600 py-12">
                      <MessageSquare className="w-10 h-10 mx-auto text-gray-700 mb-3" />
                      Sem mensagens ainda. O chat ficará ativo quando a live estiver ao vivo.
                    </div>
                  ) : (
                    chatMessages.map(msg => (
                      <div key={msg.id} className={`flex gap-3 ${msg.senderType === "influencer" ? "flex-row-reverse" : ""}`}>
                        <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${msg.senderType === "influencer" ? "bg-[#FF5A36]" : msg.senderType === "bot" ? "bg-blue-600" : msg.senderType === "system" ? "bg-gray-700" : "bg-purple-600"}`}>
                          {msg.senderType === "bot" ? "🤖" : msg.senderType === "system" ? "⚙" : msg.senderName?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className={`max-w-[80%] rounded-xl px-3 py-2 ${chatSenderStyle(msg.senderType)}`}>
                          <p className="text-xs font-bold mb-0.5 opacity-70">{msg.senderName} <span className="text-[10px] opacity-50 font-normal">{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}</span></p>
                          <p className="text-sm leading-relaxed">{msg.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Send Form */}
                <form onSubmit={sendChatMessage} className="flex gap-3 mt-4 shrink-0">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Enviar mensagem como influencer..."
                    className="flex-1 bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FF5A36] text-sm"
                  />
                  <button type="submit" disabled={isSendingChat || !chatInput.trim()} className="bg-[#FF5A36] hover:bg-[#e04825] disabled:opacity-40 text-white px-5 rounded-xl font-bold transition-colors flex items-center gap-2">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* ─── SETTINGS TAB ─────────────────────────────────── */}
            {activeTab === "settings" && (
              <div className="max-w-2xl space-y-6">
                <h2 className="text-xl font-bold mb-6">Configurações da Live</h2>

                {/* Link público */}
                <div className="bg-[#121212] border border-white/10 rounded-2xl p-6">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2"><ExternalLink className="w-5 h-5 text-[#FF5A36]" />Link Público da Live</h3>
                  <div className="flex gap-3">
                    <div className="flex-1 bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap">
                      {window.location.origin}/live/{liveSlug}
                    </div>
                    <button onClick={copyLink} className={`shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${copiedSlug ? "bg-green-500 text-white" : "bg-white/10 hover:bg-white/20 text-white"}`}>
                      {copiedSlug ? <><Check className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar</>}
                    </button>
                    <Link to={`/live/${liveSlug}`} target="_blank" className="shrink-0 flex items-center gap-2 bg-[#FF5A36]/20 hover:bg-[#FF5A36]/30 text-[#FF5A36] px-4 py-3 rounded-xl font-bold text-sm transition-colors">
                      <ExternalLink className="w-4 h-4" /> Ver Live
                    </Link>
                  </div>
                </div>

                {/* Status & Bot */}
                <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 space-y-5">
                  <h3 className="font-bold text-white flex items-center gap-2"><Settings className="w-5 h-5 text-[#FF5A36]" />Controles da Live</h3>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Status atual</label>
                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FF5A36]">
                      <option value="draft">🗒️ Rascunho</option>
                      <option value="scheduled">📅 Agendada</option>
                      <option value="live">🔴 Ao Vivo</option>
                      <option value="ended">✅ Encerrada</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between bg-[#1A1A1A] border border-white/10 rounded-xl p-4">
                    <div>
                      <span className="font-bold text-white text-sm block">Bot IA de Atendimento</span>
                      <span className="text-gray-400 text-xs">Respostas automáticas via IA para visitantes</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={formData.botEnabled} onChange={e => setFormData({ ...formData, botEnabled: e.target.checked })} className="sr-only peer" />
                      <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF5A36]"></div>
                    </label>
                  </div>
                  <button onClick={() => handleSubmit()} disabled={isSaving} className="w-full bg-[#FF5A36] hover:bg-[#e04825] text-white py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" />{isSaving ? "Salvando..." : "Salvar Configurações"}
                  </button>
                </div>

                {/* Danger Zone */}
                <div className="bg-red-950/30 border border-red-500/30 rounded-2xl p-6">
                  <h3 className="font-bold text-red-400 mb-2 flex items-center gap-2"><AlertCircle className="w-5 h-5" />Zona de Perigo</h3>
                  <p className="text-gray-400 text-sm mb-4">Esta ação é irreversível. Todos os dados desta live (pedidos, chat, eventos, timeline) serão permanentemente excluídos.</p>
                  <button onClick={deleteLive} disabled={isDeletingLive} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-5 py-3 rounded-xl font-bold text-sm transition-colors">
                    <Trash2 className="w-4 h-4" />{isDeletingLive ? "Excluindo..." : "Excluir Live Permanentemente"}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
