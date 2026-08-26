import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { ShoppingBag, Send, Heart, X, CheckCircle2, ChevronRight, ArrowLeft, Loader2, ExternalLink, Radio } from "lucide-react";

// ─────────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────────
interface ScriptLine {
  t: number;           // second in the video when this comment fires
  user: string;        // display name
  text: string;        // message content
  system?: boolean;    // store reply — highlighted differently
  cart?: boolean;      // "added to bag" notification
  purchase?: boolean;  // "bought" notification
}

interface LiveComment {
  id: string;
  user: string;
  text: string;
  system?: boolean;
  cart?: boolean;
  purchase?: boolean;
  ts: number;          // epoch ms — used as React key
}

// ─────────────────────────────────────────────────────────────
//  SCRIPT  (edit this data without touching component code)
// ─────────────────────────────────────────────────────────────
const LIVE_SCRIPT: ScriptLine[] = [
  { t: 2,  user: 'Marina S.',    text: 'gente que pele linda 😍' },
  { t: 4,  user: 'Loja Oficial', text: 'Olá gente! Kit com super desconto hoje ✨', system: true },
  { t: 7,  user: 'Carla M.',     text: 'esse produto clareia mancha mesmo?' },
  { t: 10, user: 'Loja Oficial', text: 'Clareia sim! Uso contínuo por 21 dias 🌟', system: true },
  { t: 13, user: 'Ju Ferreira',  text: 'já uso e confirmo, minha pele tá outra ❤️' },
  { t: 15, user: 'Patrícia L.',  text: 'adicionou o produto à sacola 🛍️', cart: true },
  { t: 17, user: 'Tainá V.',     text: 'qual tamanho tem a embalagem?' },
  { t: 19, user: 'Loja Oficial', text: 'Rende mais de 3 meses de uso diário!', system: true },
  { t: 21, user: 'Karine B.',    text: 'amei 😍😍 vou pedir agora' },
  { t: 23, user: 'Rafaela T.',   text: 'comprou 2 unidades ✅', purchase: true },
  { t: 25, user: 'Déb Souza',    text: 'tem frete grátis?' },
  { t: 27, user: 'Loja Oficial', text: 'Frete grátis para todo o Brasil hoje 🚚', system: true },
  { t: 29, user: 'Fernanda A.',  text: 'adicionou à sacola 🛍️', cart: true },
  { t: 31, user: 'Letícia M.',   text: 'funciona pra pele oleosa?' },
  { t: 33, user: 'Loja Oficial', text: 'Funciona perfeitamente! Fórmula oil-free 👏', system: true },
  { t: 35, user: 'Bianca R.',    text: 'meu produto favorito já faz 1 ano que uso ✨' },
  { t: 37, user: 'Mariane C.',   text: 'comprou 1 unidade ✅', purchase: true },
  { t: 39, user: 'Amanda K.',    text: '🔥🔥🔥 amando essa live' },
  { t: 41, user: 'Loja Oficial', text: '⚠️ Restam poucas unidades com esse valor promocional!', system: true },
  { t: 43, user: 'Nicole F.',    text: 'adicionou à sacola 🛍️', cart: true },
  { t: 45, user: 'Stela P.',     text: 'qual o prazo de entrega?' },
  { t: 47, user: 'Loja Oficial', text: 'Envio imediato após a confirmação 📦', system: true },
  { t: 49, user: 'Tati Gomes',   text: 'comprou 3 unidades para presentear ✅', purchase: true },
  { t: 51, user: 'Cris M.',      text: 'quero garantir o meu agora!!!! ❤️❤️' },
  { t: 53, user: 'Lara B.',      text: 'adicionou à sacola 🛍️', cart: true },
  { t: 55, user: 'Andressa T.',  text: 'esse desconto é só hoje?' },
  { t: 57, user: 'Loja Oficial', text: 'Preço exclusivo apenas durante a live 🚨', system: true },
  { t: 60, user: 'Priscila H.',  text: 'comprou 1 unidade ✅', purchase: true },
  { t: 63, user: 'Gabi N.',      text: 'adicionou à sacola 🛍️', cart: true },
  { t: 65, user: 'Renata J.',    text: 'o envio é pelos correios?' },
  { t: 67, user: 'Loja Oficial', text: 'Sim! Com código de rastreamento por e-mail ☀️', system: true },
  { t: 69, user: 'Vivian F.',    text: '❤️❤️❤️ maravilhosa essa apresentação' },
  { t: 71, user: 'Luana S.',     text: 'comprou 1 unidade ✅', purchase: true },
  { t: 74, user: 'Camila O.',    text: 'adicionou à sacola 🛍️', cart: true },
  { t: 76, user: 'Loja Oficial', text: '12 pessoas compraram nos últimos 5 minutos! 🔥', system: true },
  { t: 79, user: 'Sabrina V.',   text: 'chegou meu pedido da live passada e amei!' },
  { t: 82, user: 'Monique R.',   text: 'comprou 2 unidades ✅', purchase: true },
  { t: 85, user: 'Thais C.',     text: 'adicionou à sacola 🛍️', cart: true },
  { t: 88, user: 'Loja Oficial', text: '⚡ Últimas unidades em estoque! 🛒', system: true },
  { t: 91, user: 'Isabela M.',   text: 'comprou 1 unidade ✅', purchase: true },
  { t: 94, user: 'Flávia T.',    text: 'adicionou à sacola 🛍️', cart: true },
  { t: 97, user: 'Loja Oficial', text: 'Obrigada a todas! Aproveitem os descontos 💛', system: true },
];

// ─────────────────────────────────────────────────────────────
//  AVATAR COLOR HELPER
// ─────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  '#E74C3C','#9B59B6','#3498DB','#27AE60',
  '#F39C12','#16A085','#D35400','#2980B9',
  '#8E44AD','#C0392B','#1ABC9C','#F1C40F',
];
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function avatarInitials(name: string): string {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

// ─────────────────────────────────────────────────────────────
//  SINGLE COMMENT ITEM  (with CSS enter animation)
// ─────────────────────────────────────────────────────────────
const CommentItem = React.memo(({ comment }: { comment: LiveComment }) => {
  const isPurchase = comment.purchase;
  const isCart     = comment.cart;
  const isSystem   = comment.system;

  if (isPurchase) {
    return (
      <div className="flex items-center gap-2 py-1 animate-comment-in">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
          style={{ background: avatarColor(comment.user) }}
        >
          {avatarInitials(comment.user)}
        </div>
        <div className="bg-[#FF5A36]/20 border border-[#FF5A36]/40 rounded-full px-3 py-1 flex items-center gap-1.5 max-w-[85%]">
          <span className="text-[#FF5A36] text-[11px] font-bold shrink-0">{comment.user}</span>
          <span className="text-white/90 text-[11px] leading-snug">{comment.text}</span>
        </div>
      </div>
    );
  }

  if (isCart) {
    return (
      <div className="flex items-center gap-2 py-1 animate-comment-in">
        <div className="w-7 h-7 rounded-full bg-[#FFD700]/20 border border-[#FFD700]/40 flex items-center justify-center shrink-0">
          <ShoppingBag className="w-3.5 h-3.5 text-[#FFD700]" />
        </div>
        <div className="bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-full px-3 py-1 flex items-center gap-1.5 max-w-[85%]">
          <span className="text-[#FFD700] text-[11px] font-bold shrink-0">{comment.user}</span>
          <span className="text-white/80 text-[11px] leading-snug">{comment.text}</span>
        </div>
      </div>
    );
  }

  if (isSystem || comment.user === 'Assistente Virtual') {
    return (
      <div className="flex items-start gap-2 py-1 animate-comment-in">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ring-1 ring-[#FF5A36] mt-0.5"
          style={{ background: '#FF5A36' }}
        >
          {comment.user === 'Assistente Virtual' ? 'IA' : 'LO'}
        </div>
        <div className="bg-[#FF5A36]/20 border border-[#FF5A36]/40 rounded-2xl rounded-tl-none px-3 py-1.5 max-w-[85%] shadow-lg">
          <span className="text-[#FF5A36] text-[11px] font-black mr-1.5 block">
            {comment.user === 'Assistente Virtual' ? '🤖 Assistente Virtual' : 'Loja Oficial'}
          </span>
          <span className="text-white text-[11px] leading-snug font-medium">{comment.text}</span>
        </div>
      </div>
    );
  }

  // Normal user comment
  return (
    <div className="flex items-start gap-2 py-1 animate-comment-in">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
        style={{ background: avatarColor(comment.user) }}
      >
        {avatarInitials(comment.user)}
      </div>
      <div className="bg-black/40 backdrop-blur-md rounded-[1.25rem] rounded-tl-none px-3 py-1.5 max-w-[85%] border border-white/5">
        <span className="font-bold text-white text-[11px] mr-1.5">{comment.user}</span>
        <span className="text-white/85 text-[11px] leading-snug">{comment.text}</span>
      </div>
    </div>
  );
});
CommentItem.displayName = 'CommentItem';

// ─────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function LivePage() {
  const { slug } = useParams();
  const [live, setLive] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [activeProduct, setActiveProduct] = useState<any>(null);

  const [isPlaying, setIsPlaying]       = useState(false);
  const [videoError, setVideoError]     = useState<string | null>(null);
  const [playerStatus, setPlayerStatus] = useState<"loading"|"ready"|"playing"|"paused"|"ended"|"error">("loading");
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [currentTime, setCurrentTime]   = useState(0);
  const [duration, setDuration]         = useState(0);
  const [volume, setVolume]             = useState(1);
  const [isMuted, setIsMuted]           = useState(true);
  const [sessionId, setSessionId]       = useState<string | null>(null);

  const videoRef             = useRef<HTMLVideoElement>(null);
  const autoplayAttemptedRef = useRef(false);

  // ── Real chat (from API) ──────────────────────────────────
  const [apiChat, setApiChat]   = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [activeEvent, setActiveEvent] = useState<any>(null);

  // ── Live Ending Alert & Next Live Navigation ───────────────
  const [allLives, setAllLives] = useState<any[]>([]);
  const [showEndingModal, setShowEndingModal] = useState(false);
  const hasTriggeredEndingRef = useRef(false);

  // ── Checkout & Purchase Flow State ─────────────────────────
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'summary' | 'delivery' | 'redirecting' | 'success'>('summary');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    email: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: ''
  });
  
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [paymentRedirectUrl, setPaymentRedirectUrl] = useState<string | null>(null);

  // ── Scripted live comments ────────────────────────────────
  const [liveComments, setLiveComments]   = useState<LiveComment[]>([]);
  const scriptIndexRef                    = useRef(0);
  const MAX_LIVE_COMMENTS                 = 35;

  // ── Social counters ───────────────────────────────────────
  const [viewers, setViewers] = useState(3253);
  const [likes, setLikes]     = useState(18500);
  const [liked, setLiked]     = useState(false);

  // ─────────────────────────────────────────────────────────
  //  Initial data fetch
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const key = `live-commerce-session:${slug}`;
    const existingSession = localStorage.getItem(key) || crypto.randomUUID();
    localStorage.setItem(key, existingSession);
    setSessionId(existingSession);

    // Fetch this live
    fetch(`/api/public/live/${slug}`)
      .then(async res => {
        if (!res.ok) throw new Error("Live não encontrada");
        return res.json();
      })
      .then(async data => {
        if (data.live) {
          setLive(data.live);
          setEvents(data.events || []);
          setTimeline(data.timeline || []);
          await fetch("/api/public/visitor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ liveId: data.live.id, sessionId: existingSession }),
          });
          const chatRes = await fetch(`/api/public/chat/${data.live.id}`);
          if (chatRes.ok) setApiChat(await chatRes.json());
        }
      })
      .catch(err => console.error("[LivePage] fetch error:", err));

    // Fetch all public lives for next live navigation
    fetch("/api/public/lives")
      .then(res => res.json())
      .then(data => {
        if (data.lives) setAllLives(data.lives);
      })
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [apiChat]);

  // ─────────────────────────────────────────────────────────
  //  Viewers / likes oscillation
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setViewers(v => v + Math.floor(Math.random() * 7) - 3);
      setLikes(l => l + Math.floor(Math.random() * 15));
    }, 4000);
    return () => clearInterval(id);
  }, []);

  // ─────────────────────────────────────────────────────────
  //  Autoplay / video state
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    autoplayAttemptedRef.current = false;
    setAutoplayBlocked(false);
    setPlayerStatus(live?.videoUrl ? "loading" : "ready");
    setCurrentTime(0);
  }, [live?.videoUrl]);

  // ─────────────────────────────────────────────────────────
  //  Product timeline synchronization (handles seek forward & backward)
  // ─────────────────────────────────────────────────────────
  const syncActiveProduct = useCallback((time: number) => {
    if (timeline && timeline.length > 0) {
      // Find product matching current timestamp interval
      const active = timeline.find(t => time >= t.startTime && time < t.endTime);
      setActiveProduct(active ? active.product : null);
    } else {
      setActiveProduct(null);
    }
  }, [timeline]);

  useEffect(() => { 
    syncActiveProduct(currentTime); 
  }, [timeline, currentTime, syncActiveProduct]);

  // ─────────────────────────────────────────────────────────
  //  Scripted comment injection (synced to video time)
  // ─────────────────────────────────────────────────────────
  const injectScript = useCallback((now: number) => {
    const toAdd: LiveComment[] = [];
    while (
      scriptIndexRef.current < LIVE_SCRIPT.length &&
      LIVE_SCRIPT[scriptIndexRef.current].t <= now
    ) {
      const line = LIVE_SCRIPT[scriptIndexRef.current];
      toAdd.push({
        id: `script-${scriptIndexRef.current}`,
        user: line.user,
        text: line.text,
        system: line.system,
        cart: line.cart,
        purchase: line.purchase,
        ts: Date.now() + scriptIndexRef.current,
      });
      scriptIndexRef.current++;
    }
    if (toAdd.length === 0) return;
    setLiveComments(prev => {
      const next = [...prev, ...toAdd];
      return next.length > MAX_LIVE_COMMENTS ? next.slice(next.length - MAX_LIVE_COMMENTS) : next;
    });
  }, []);

  // Reset scripted comments when video loops
  const resetScript = useCallback(() => {
    scriptIndexRef.current = 0;
    setLiveComments([]);
  }, []);

  // ─────────────────────────────────────────────────────────
  //  Video event handlers
  // ─────────────────────────────────────────────────────────
  const tryAutoplay = async () => {
    const video = videoRef.current;
    if (!video || autoplayAttemptedRef.current) return;
    autoplayAttemptedRef.current = true;
    video.currentTime = 0;
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    setIsMuted(true);
    setPlayerStatus("loading");
    try {
      await video.play();
      setAutoplayBlocked(false);
      setIsPlaying(true);
      setPlayerStatus("playing");
    } catch {
      setAutoplayBlocked(true);
      setIsPlaying(false);
      setPlayerStatus("paused");
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const now = videoRef.current.currentTime;
    setCurrentTime(now);
    syncActiveProduct(now);
    injectScript(now);

    // Trigger ending popup in the last 4 seconds before video ends
    if (duration > 10 && duration - now <= 4 && !hasTriggeredEndingRef.current) {
      hasTriggeredEndingRef.current = true;
      setShowEndingModal(true);
    }

    // DB events (real orders/messages)
    const evt = events.find(e => e.timeSeconds === Math.floor(now) && e.enabled);
    if (evt) {
      if (evt.type === 'message') {
        if (!apiChat.find(c => c.id === evt.id)) {
          setApiChat(prev => [...prev, { id: evt.id, senderName: evt.buyerName || 'Visitante', message: evt.message }]);
        }
      } else if (evt.type === 'order') {
        setActiveEvent(evt);
        setTimeout(() => setActiveEvent(null), 3000);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(Number.isFinite(videoRef.current.duration) ? videoRef.current.duration : 0);
    setVolume(videoRef.current.volume);
  };

  const handleCanPlay = () => {
    setPlayerStatus(videoRef.current?.paused ? "ready" : "playing");
    void tryAutoplay();
  };

  const handleEnded = () => {
    resetScript();
    setShowEndingModal(true);
  };

  const handleAcceptPurchaseAtEnding = () => {
    setShowEndingModal(false);
    startBuyFlow(getDisplayProduct());
  };

  const goToNextLive = () => {
    setShowEndingModal(false);
    const otherLives = allLives.filter(l => l.slug !== slug);
    if (otherLives.length > 0) {
      window.location.href = `/live/${otherLives[0].slug}`;
    } else {
      hasTriggeredEndingRef.current = false;
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const handleViewerStart = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        video.muted = false; setIsMuted(false);
        await video.play();
        setAutoplayBlocked(false); setIsPlaying(true); setPlayerStatus("playing");
      } catch {
        try {
          video.muted = true; setIsMuted(true);
          await video.play();
          setAutoplayBlocked(false); setIsPlaying(true); setPlayerStatus("playing");
        } catch {
          setAutoplayBlocked(true); setPlayerStatus("paused");
        }
      }
    } else if (video.muted) {
      video.muted = false; setIsMuted(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  //  Chat (real) + AI Bot Integration
  // ─────────────────────────────────────────────────────────
  const sendChatMessage = async () => {
    const message = chatInput.trim();
    if (!message || !live?.id || !sessionId) return;
    
    setChatInput("");

    // Show user message immediately in live feed
    const userMsgId = `user-${Date.now()}`;
    setLiveComments(prev => {
      const next = [...prev, {
        id: userMsgId,
        user: 'Você',
        text: message,
        ts: Date.now(),
      }];
      return next.length > MAX_LIVE_COMMENTS ? next.slice(next.length - MAX_LIVE_COMMENTS) : next;
    });

    try {
      // 1. Post to chat message table
      fetch(`/api/public/chat/${live.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message }),
      })
      .then(res => res.ok ? res.json() : null)
      .then(created => {
        if (created) setApiChat(prev => [...prev, created]);
      })
      .catch(() => {});

      // 2. Call AI Bot to reply based on currently active product
      const activeProd = getDisplayProduct();
      const aiRes = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          liveId: live.id,
          productId: activeProd.id === "default" ? undefined : activeProd.id,
          message,
          conversationId: sessionId,
          history: liveComments.slice(-4).map(c => ({
            role: c.system || c.user === 'Assistente Virtual' ? 'assistant' : 'user',
            content: c.text
          }))
        })
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        if (aiData.answer) {
          // Display Bot response in live feed
          setLiveComments(prev => {
            const next = [...prev, {
              id: `ai-${Date.now()}`,
              user: 'Assistente Virtual',
              text: aiData.answer,
              system: true,
              ts: Date.now() + 50,
            }];
            return next.length > MAX_LIVE_COMMENTS ? next.slice(next.length - MAX_LIVE_COMMENTS) : next;
          });

          setApiChat(prev => [...prev, {
            id: `ai-${Date.now()}`,
            senderName: 'Assistente Virtual',
            message: aiData.answer,
            senderType: 'bot'
          }]);
        }
      }

    } catch (err) {
      console.error("[LivePage] chat error:", err);
    }
  };

  // ─────────────────────────────────────────────────────────
  //  Active Display Product
  // ─────────────────────────────────────────────────────────
  const getDisplayProduct = () => {
    if (activeProduct) {
      return { 
        id: activeProduct.id, 
        name: activeProduct.name, 
        price: activeProduct.promotionalPrice ?? activeProduct.price, 
        originalPrice: activeProduct.price,
        image: activeProduct.imageUrl,
        paymentUrl: activeProduct.paymentUrl,
        stock: activeProduct.stock
      };
    }
    return { 
      id: 'default', 
      name: live?.productName, 
      price: live?.productPrice || 0, 
      originalPrice: live?.productPrice || 0,
      image: live?.productImage,
      paymentUrl: null,
      stock: 99
    };
  };

  // ─────────────────────────────────────────────────────────
  //  Start Buy Flow
  // ─────────────────────────────────────────────────────────
  const startBuyFlow = (prodToBuy?: any) => {
    const target = prodToBuy || getDisplayProduct();
    if (!target || !target.name) return;
    setSelectedProduct(target);
    setOrderQuantity(1);
    setCheckoutStep('summary');
    setFormError(null);
    setShowCheckout(true);
  };

  const handleCepBlur = async () => {
    const cleanCep = customerData.cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setCustomerData(prev => ({
            ...prev,
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
          }));
        }
      } catch {}
    }
  };

  // ─────────────────────────────────────────────────────────
  //  Confirm Order & Redirect to Payment
  // ─────────────────────────────────────────────────────────
  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate required fields
    if (!customerData.name.trim()) { setFormError("Informe seu nome completo"); return; }
    if (!customerData.phone.trim()) { setFormError("Informe seu telefone / WhatsApp"); return; }
    if (!customerData.cep.trim()) { setFormError("Informe o CEP"); return; }
    if (!customerData.street.trim()) { setFormError("Informe o endereço"); return; }
    if (!customerData.number.trim()) { setFormError("Informe o número"); return; }
    if (!customerData.neighborhood.trim()) { setFormError("Informe o bairro"); return; }
    if (!customerData.city.trim()) { setFormError("Informe a cidade"); return; }
    if (!customerData.state.trim()) { setFormError("Informe o estado (UF)"); return; }

    setIsSubmittingOrder(true);

    try {
      const sk = 'live-commerce-session';
      const sid = sessionId || localStorage.getItem(sk) || crypto.randomUUID();

      const response = await fetch('/api/public/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          liveId: live.id,
          sessionId: sid,
          productId: selectedProduct.id === 'default' ? undefined : selectedProduct.id,
          quantity: orderQuantity,
          customerName: customerData.name.trim(),
          customerPhone: customerData.phone.trim(),
          customerEmail: customerData.email.trim() || undefined,
          shippingAddress: {
            cep: customerData.cep.trim(),
            street: customerData.street.trim(),
            number: customerData.number.trim(),
            complement: customerData.complement.trim(),
            neighborhood: customerData.neighborhood.trim(),
            city: customerData.city.trim(),
            state: customerData.state.trim(),
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Não foi possível registrar o pedido.");
      }

      const result = await response.json();
      const targetUrl = result.paymentUrl || selectedProduct.paymentUrl;

      if (targetUrl && (targetUrl.startsWith("http://") || targetUrl.startsWith("https://"))) {
        setPaymentRedirectUrl(targetUrl);
        setCheckoutStep('redirecting');
        setTimeout(() => {
          window.location.href = targetUrl;
        }, 1500);
      } else {
        setCheckoutStep('success');
      }
    } catch (err: any) {
      console.error("[Checkout error]", err);
      setFormError(err.message || "Erro ao processar pedido. Tente novamente.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const closeCheckout = () => {
    setShowCheckout(false);
    setTimeout(() => {
      setCheckoutStep('summary');
      setFormError(null);
    }, 300);
  };

  // ─────────────────────────────────────────────────────────
  //  Helpers
  // ─────────────────────────────────────────────────────────
  const formatViewers = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  const formatLikes   = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  if (!live) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">Carregando...</div>;

  const currentProd = getDisplayProduct();

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans select-none" onClick={handleViewerStart}>

      {/* ── VIDEO BACKGROUND ──────────────────────────────── */}
      {videoError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#121212] p-6 text-center">
          <div>
            <p className="font-bold text-white">Não foi possível carregar esta live</p>
            <p className="mt-2 text-sm text-white/60">O arquivo de vídeo não está disponível.</p>
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={live.videoUrl}
          className="absolute inset-0 w-full h-full object-cover cursor-pointer"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={handleCanPlay}
          onPlay={() => { setIsPlaying(true); setPlayerStatus("playing"); }}
          onPause={() => { setIsPlaying(false); setPlayerStatus(videoRef.current?.ended ? "ended" : "paused"); }}
          onSeeking={() => setPlayerStatus("loading")}
          onSeeked={() => {
            if (videoRef.current) { 
              setCurrentTime(videoRef.current.currentTime); 
              syncActiveProduct(videoRef.current.currentTime); 
            }
            setPlayerStatus(videoRef.current?.paused ? "paused" : "playing");
          }}
          onEnded={handleEnded}
          onError={() => { setVideoError("video-unavailable"); setPlayerStatus("error"); }}
          onVolumeChange={() => {
            if (!videoRef.current) return;
            setVolume(videoRef.current.volume);
            setIsMuted(videoRef.current.muted || videoRef.current.volume === 0);
          }}
          autoPlay muted playsInline preload="auto"
        />
      )}

      {/* ── OVERLAYS ──────────────────────────────────────── */}
      <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">

        {/* ── TOP BAR ─────────────────────────────────────── */}
        <div className="p-4 pt-8 bg-gradient-to-b from-black/85 to-transparent pointer-events-auto shrink-0">

          {/* Row 1: avatar + name + viewers + seguir */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              {/* Store avatar */}
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-[#FF5A36] shadow-lg">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${live.id}`}
                    className="w-full h-full object-cover bg-gray-200"
                    alt="Avatar"
                  />
                </div>
                {/* REPLAY badge */}
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#FF5A36] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  ● REPLAY
                </span>
              </div>

              <div className="flex flex-col">
                <span className="font-bold text-white text-[14px] leading-tight">Loja Oficial</span>
                <span className="text-white/70 text-[11px]">{formatViewers(viewers)} espectadores</span>
              </div>
            </div>

            <button className="bg-[#FF5A36] text-white font-bold px-4 py-1.5 rounded-full text-sm hover:bg-[#e04825] transition shadow-lg shrink-0">
              Seguir
            </button>
          </div>

          {/* Row 2: live title */}
          <h1 className="text-[15px] font-bold text-white leading-tight max-w-[90%] mb-1 drop-shadow-md">{live.title}</h1>
          <p className="text-white/60 text-[11px]">Apresentação ao vivo • replay disponível</p>

          {/* Row 3: Product spotlight card synced with timeline */}
          {currentProd.name && (
            <div
              className="mt-3 bg-black/75 backdrop-blur-md border border-[#FFD700]/40 rounded-2xl p-2.5 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all shadow-xl"
              onClick={e => { e.stopPropagation(); startBuyFlow(currentProd); }}
            >
              {/* Label */}
              <div className="flex flex-col items-start shrink-0">
                <span className="text-[#FFD700] text-[8px] font-bold uppercase tracking-widest leading-none">Produto em</span>
                <span className="text-[#FFD700] text-[8px] font-bold uppercase tracking-widest leading-none">Destaque</span>
              </div>

              {/* Image */}
              <div className="w-12 h-12 bg-white rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                {currentProd.image
                  ? <img src={currentProd.image} className="w-full h-full object-contain" alt={currentProd.name} />
                  : <ShoppingBag className="w-5 h-5 text-gray-400" />}
              </div>

              {/* Name + price */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-[12px] truncate leading-tight">{currentProd.name}</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-[#FF5A36] font-black text-[13px]">R$ {currentProd.price?.toFixed(2)}</span>
                  {currentProd.originalPrice && currentProd.originalPrice > currentProd.price && (
                    <span className="text-white/40 text-[10px] line-through">R$ {currentProd.originalPrice.toFixed(2)}</span>
                  )}
                </div>
              </div>

              {/* CTA COMPRAR AGORA */}
              <button
                className="bg-[#FF5A36] hover:bg-[#e04825] text-white text-[11px] font-black px-3.5 py-2.5 rounded-xl shrink-0 transition active:scale-95 shadow-md shadow-[#FF5A36]/30 uppercase tracking-wider"
                onClick={e => { e.stopPropagation(); startBuyFlow(currentProd); }}
              >
                COMPRAR AGORA
              </button>
            </div>
          )}
        </div>

        {/* ── MIDDLE (spacer + right-side counters) ───────── */}
        <div className="flex-1 relative">
          {/* Like + Bag on right */}
          <div className="absolute right-4 bottom-0 flex flex-col items-center gap-3 pointer-events-auto pb-2">
            <button
              className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
              onClick={e => { e.stopPropagation(); setLiked(l => !l); setLikes(l => l + (liked ? -1 : 1)); }}
            >
              <Heart className={`w-7 h-7 transition-colors ${liked ? 'fill-[#FF5A36] text-[#FF5A36]' : 'text-white'}`} />
              <span className="text-white text-[11px] font-bold">{formatLikes(likes)}</span>
            </button>

            <button
              className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
              onClick={e => { e.stopPropagation(); startBuyFlow(currentProd); }}
            >
              <div className="relative">
                <ShoppingBag className="w-7 h-7 text-white" />
              </div>
              <span className="text-white text-[11px] font-bold">Comprar</span>
            </button>
          </div>

          {/* Purchase event popup (DB orders) */}
          {activeEvent && (
            <div className="absolute top-4 left-0 right-12 z-20 pointer-events-auto px-4">
              <div
                className="bg-black/75 backdrop-blur-xl rounded-2xl p-3 shadow-2xl flex items-center gap-3 border border-white/10 cursor-pointer"
                onClick={() => startBuyFlow(currentProd)}
              >
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-5 h-5 text-[#FF5A36]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-[#FF5A36] uppercase tracking-wider">{activeEvent.buyerName} comprou!</p>
                  <p className="text-xs text-white font-medium truncate">{activeEvent.message}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── BOTTOM AREA ─────────────────────────────────── */}
        <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-8 px-3 pb-4 shrink-0 pointer-events-none">

          {/* Scripted live comments (scroll-up feed) */}
          <div
            className="flex flex-col justify-end gap-0.5 max-h-[200px] overflow-hidden mb-3 pointer-events-auto pr-14"
            style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 30%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 30%)' }}
          >
            {liveComments.map(c => (
              <CommentItem key={c.ts} comment={c} />
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Bottom bar: input + icons */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="flex-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full flex items-center px-4 h-11">
              <input
                type="text"
                placeholder="Faça uma pergunta..."
                className="bg-transparent border-none text-white text-sm outline-none w-full placeholder:text-gray-400"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onClick={e => e.stopPropagation()}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) sendChatMessage();
                }}
              />
              <button
                type="button"
                onClick={e => { e.stopPropagation(); sendChatMessage(); }}
                aria-label="Enviar"
                className="text-[#FF5A36] ml-2 disabled:opacity-40"
                disabled={!chatInput.trim() || !sessionId}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── CHECKOUT DRAWER / MODAL (ETAPA 5) ─────────────── */}
      {showCheckout && selectedProduct && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeCheckout} />

          <div className="relative w-full bg-[#121212] rounded-t-3xl flex flex-col max-h-[85vh] h-auto animate-in slide-in-from-bottom-full duration-300 border border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.7)]">

            {/* Handle bar */}
            <div className="w-full flex justify-center py-3 shrink-0 cursor-pointer" onClick={closeCheckout}>
              <div className="w-12 h-1.5 bg-white/20 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                {checkoutStep === 'delivery' && (
                  <button 
                    onClick={() => setCheckoutStep('summary')} 
                    className="p-1 hover:bg-white/10 rounded-full transition-colors text-gray-400 mr-1"
                    title="Voltar ao resumo"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#FF5A36]" />
                  {checkoutStep === 'summary' ? 'Resumo do Pedido' : checkoutStep === 'delivery' ? 'Dados de Entrega' : checkoutStep === 'redirecting' ? 'Redirecionando...' : 'Pedido Confirmado'}
                </h3>
              </div>
              <button onClick={closeCheckout} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="mx-6 mt-4 p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold flex items-center gap-2">
                <span>{formError}</span>
              </div>
            )}

            {/* ── STEP 1: RESUMO DO PEDIDO ── */}
            {checkoutStep === 'summary' && (
              <div className="flex flex-col flex-1 overflow-y-auto">
                <div className="p-6 space-y-6 flex-1">
                  
                  {/* Product Card Highlight */}
                  <div className="flex gap-4 p-4 border border-[#FF5A36]/30 bg-[#FF5A36]/5 rounded-2xl">
                    <div className="w-20 h-20 bg-white rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-1 border border-white/10">
                      {selectedProduct.image ? (
                        <img src={selectedProduct.image} className="w-full h-full object-contain" alt={selectedProduct.name} />
                      ) : (
                        <ShoppingBag className="text-gray-400 w-8 h-8"/>
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-white text-sm leading-tight mb-1">{selectedProduct.name}</h4>
                        <div className="flex items-baseline gap-2">
                          <span className="font-black text-[#FF5A36] text-lg">R$ {selectedProduct.price?.toFixed(2)}</span>
                          {selectedProduct.originalPrice > selectedProduct.price && (
                            <span className="text-white/40 text-xs line-through">R$ {selectedProduct.originalPrice.toFixed(2)}</span>
                          )}
                        </div>
                      </div>

                      {/* Quantity Selector: [-] 1 [+] */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Quantidade</span>
                        <div className="flex items-center gap-3 bg-black/60 border border-white/10 rounded-full px-3 py-1">
                          <button
                            type="button"
                            onClick={() => setOrderQuantity(q => Math.max(1, q - 1))}
                            className="text-gray-400 hover:text-white font-bold text-sm px-1 transition active:scale-90"
                          >
                            -
                          </button>
                          <span className="text-white font-bold text-sm min-w-[16px] text-center">{orderQuantity}</span>
                          <button
                            type="button"
                            onClick={() => setOrderQuantity(q => q + 1)}
                            className="text-gray-400 hover:text-white font-bold text-sm px-1 transition active:scale-90"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Summary */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2.5">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Preço unitário</span>
                      <span className="text-white font-medium">R$ {selectedProduct.price?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Quantidade</span>
                      <span className="text-white font-medium">{orderQuantity}x</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Frete</span>
                      <span className="text-green-400 font-bold">GRÁTIS</span>
                    </div>
                    <div className="pt-2.5 border-t border-white/10 flex justify-between items-baseline">
                      <span className="font-bold text-white text-sm uppercase tracking-wider">Subtotal</span>
                      <span className="font-black text-[#FF5A36] text-xl">
                        R$ {(selectedProduct.price * orderQuantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-white/10 bg-[#1A1A1A] pb-safe shrink-0">
                  <button
                    onClick={() => { setFormError(null); setCheckoutStep('delivery'); }}
                    className="w-full bg-[#FF5A36] hover:bg-[#e04825] text-white font-bold py-4 rounded-full uppercase tracking-widest text-sm active:scale-95 transition-all shadow-[0_0_20px_rgba(255,90,54,0.3)] flex items-center justify-center gap-2"
                  >
                    <span>Continuar</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: DADOS DE ENTREGA ── */}
            {checkoutStep === 'delivery' && (
              <form onSubmit={handleConfirmOrder} className="flex-1 overflow-y-auto flex flex-col no-scrollbar">
                <div className="p-6 space-y-4 flex-1">
                  
                  {/* Nome Completo */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Nome Completo *</label>
                    <input
                      required
                      type="text"
                      placeholder="Seu nome completo"
                      value={customerData.name}
                      onChange={e => setCustomerData({ ...customerData, name: e.target.value })}
                      className="w-full bg-[#1A1A1A] border border-white/10 text-white rounded-xl px-4 py-2.5 outline-none focus:border-[#FF5A36] transition-colors text-sm"
                    />
                  </div>

                  {/* Telefone & Email */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Telefone / WhatsApp *</label>
                      <input
                        required
                        type="tel"
                        placeholder="(11) 99999-9999"
                        value={customerData.phone}
                        onChange={e => setCustomerData({ ...customerData, phone: e.target.value })}
                        className="w-full bg-[#1A1A1A] border border-white/10 text-white rounded-xl px-4 py-2.5 outline-none focus:border-[#FF5A36] transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">E-mail</label>
                      <input
                        type="email"
                        placeholder="seu@email.com"
                        value={customerData.email}
                        onChange={e => setCustomerData({ ...customerData, email: e.target.value })}
                        className="w-full bg-[#1A1A1A] border border-white/10 text-white rounded-xl px-4 py-2.5 outline-none focus:border-[#FF5A36] transition-colors text-sm"
                      />
                    </div>
                  </div>

                  {/* CEP */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">CEP *</label>
                    <input
                      required
                      type="text"
                      placeholder="00000-000"
                      maxLength={9}
                      value={customerData.cep}
                      onBlur={handleCepBlur}
                      onChange={e => setCustomerData({ ...customerData, cep: e.target.value })}
                      className="w-full bg-[#1A1A1A] border border-white/10 text-white rounded-xl px-4 py-2.5 outline-none focus:border-[#FF5A36] transition-colors text-sm font-mono"
                    />
                  </div>

                  {/* Endereço & Número */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Endereço (Rua / Av.) *</label>
                      <input
                        required
                        type="text"
                        placeholder="Ex: Av. Paulista"
                        value={customerData.street}
                        onChange={e => setCustomerData({ ...customerData, street: e.target.value })}
                        className="w-full bg-[#1A1A1A] border border-white/10 text-white rounded-xl px-4 py-2.5 outline-none focus:border-[#FF5A36] transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Número *</label>
                      <input
                        required
                        type="text"
                        placeholder="123"
                        value={customerData.number}
                        onChange={e => setCustomerData({ ...customerData, number: e.target.value })}
                        className="w-full bg-[#1A1A1A] border border-white/10 text-white rounded-xl px-4 py-2.5 outline-none focus:border-[#FF5A36] transition-colors text-sm"
                      />
                    </div>
                  </div>

                  {/* Complemento & Bairro */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Complemento</label>
                      <input
                        type="text"
                        placeholder="Apto, Bloco..."
                        value={customerData.complement}
                        onChange={e => setCustomerData({ ...customerData, complement: e.target.value })}
                        className="w-full bg-[#1A1A1A] border border-white/10 text-white rounded-xl px-4 py-2.5 outline-none focus:border-[#FF5A36] transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Bairro *</label>
                      <input
                        required
                        type="text"
                        placeholder="Bairro"
                        value={customerData.neighborhood}
                        onChange={e => setCustomerData({ ...customerData, neighborhood: e.target.value })}
                        className="w-full bg-[#1A1A1A] border border-white/10 text-white rounded-xl px-4 py-2.5 outline-none focus:border-[#FF5A36] transition-colors text-sm"
                      />
                    </div>
                  </div>

                  {/* Cidade & Estado */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Cidade *</label>
                      <input
                        required
                        type="text"
                        placeholder="Cidade"
                        value={customerData.city}
                        onChange={e => setCustomerData({ ...customerData, city: e.target.value })}
                        className="w-full bg-[#1A1A1A] border border-white/10 text-white rounded-xl px-4 py-2.5 outline-none focus:border-[#FF5A36] transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Estado *</label>
                      <input
                        required
                        type="text"
                        placeholder="UF"
                        maxLength={2}
                        value={customerData.state}
                        onChange={e => setCustomerData({ ...customerData, state: e.target.value.toUpperCase() })}
                        className="w-full bg-[#1A1A1A] border border-white/10 text-white rounded-xl px-4 py-2.5 outline-none focus:border-[#FF5A36] transition-colors text-sm uppercase text-center font-mono"
                      />
                    </div>
                  </div>

                </div>

                <div className="p-6 border-t border-white/10 bg-[#1A1A1A] pb-safe shrink-0">
                  <button
                    type="submit"
                    disabled={isSubmittingOrder}
                    className="w-full bg-[#FF5A36] hover:bg-[#e04825] disabled:opacity-50 text-white font-bold py-4 rounded-full uppercase tracking-widest text-sm active:scale-95 transition-all shadow-[0_0_20px_rgba(255,90,54,0.3)] flex items-center justify-center gap-2"
                  >
                    {isSubmittingOrder ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Criando pedido...</span>
                      </>
                    ) : (
                      <span>Confirmar Pedido (R$ {(selectedProduct.price * orderQuantity).toFixed(2)})</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP 3A: REDIRECIONANDO PARA O LINK DE PAGAMENTO ── */}
            {checkoutStep === 'redirecting' && (
              <div className="flex-1 p-8 flex flex-col items-center justify-center text-center pb-safe">
                <div className="w-16 h-16 bg-[#FF5A36]/20 text-[#FF5A36] rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Pedido Registrado!</h3>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed max-w-[280px]">
                  Status: <strong className="text-amber-400 font-mono">Aguardando pagamento</strong>.<br/>
                  Redirecionando você para a página segura de pagamento...
                </p>
                {paymentRedirectUrl && (
                  <a
                    href={paymentRedirectUrl}
                    className="text-[#FF5A36] underline text-xs font-bold flex items-center gap-1"
                  >
                    <span>Clique aqui se não for redirecionado automaticamente</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            {/* ── STEP 3B: SUCESSO / CONFIRMAÇÃO MANUAL ── */}
            {checkoutStep === 'success' && (
              <div className="flex-1 p-8 flex flex-col items-center justify-center text-center pb-safe">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Pedido Criado com Sucesso!</h3>
                <p className="text-gray-400 text-sm mb-2 leading-relaxed max-w-[280px]">
                  Seu pedido foi registrado no sistema com status:
                </p>
                <div className="inline-block bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-xs font-bold mb-6 font-mono">
                  ● Aguardando Pagamento
                </div>
                <p className="text-gray-500 text-xs mb-8 max-w-[280px]">
                  O vendedor recebeu seus dados de entrega e aguardará a confirmação do pagamento.
                </p>
                <button
                  onClick={closeCheckout}
                  className="w-full bg-white text-black font-bold py-4 rounded-full uppercase tracking-widest text-sm active:scale-95 transition-transform"
                >
                  Voltar para a Live
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── LIVE ENDING MODAL ─────────────────────────────── */}
      {showEndingModal && !showCheckout && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowEndingModal(false)} />
          
          <div className="relative w-full max-w-sm bg-[#161616] border border-white/15 rounded-3xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.95)] animate-in zoom-in-95 duration-300 text-center flex flex-col items-center">
            
            {/* Live Ending Icon */}
            <div className="w-16 h-16 rounded-full bg-[#FF5A36]/20 border border-[#FF5A36]/40 flex items-center justify-center mb-4 text-[#FF5A36] shadow-lg shadow-[#FF5A36]/20">
              <Radio className="w-8 h-8 animate-pulse" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 mb-3">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              Encerramento da Live
            </div>

            <h3 className="text-xl font-black text-white mb-2 leading-tight">
              A live está sendo encerrada!
            </h3>

            <p className="text-gray-300 text-xs mb-5 leading-relaxed">
              Deseja aproveitar as ofertas exclusivas da transmissão e finalizar sua compra agora?
            </p>

            {/* Featured Product Preview */}
            {currentProd.name && (
              <div className="w-full bg-black/60 border border-white/10 rounded-2xl p-3 flex items-center gap-3 mb-6 text-left">
                <div className="w-12 h-12 bg-white rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-0.5 border border-white/10">
                  {currentProd.image ? (
                    <img src={currentProd.image} className="w-full h-full object-contain" alt={currentProd.name} />
                  ) : (
                    <ShoppingBag className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-xs truncate">{currentProd.name}</p>
                  <p className="text-[#FF5A36] font-black text-sm">R$ {currentProd.price?.toFixed(2)}</p>
                </div>
              </div>
            )}

            {/* Action Buttons: SIM & NÃO */}
            <div className="w-full space-y-2.5">
              <button
                type="button"
                onClick={handleAcceptPurchaseAtEnding}
                className="w-full bg-[#FF5A36] hover:bg-[#e04825] text-white font-black py-3.5 px-6 rounded-2xl uppercase tracking-wider text-sm transition active:scale-95 shadow-[0_0_25px_rgba(255,90,54,0.4)] flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Sim, finalizar compra</span>
              </button>

              <button
                type="button"
                onClick={goToNextLive}
                className="w-full bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white font-bold py-3 px-6 rounded-2xl text-xs transition active:scale-95 border border-white/10 flex items-center justify-center gap-1.5"
              >
                <span>Não, ir para a próxima live</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
