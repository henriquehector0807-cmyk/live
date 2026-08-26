import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Package, Search, Plus, MoreVertical, Edit, Copy, Link as LinkIcon, AlertTriangle, Trash2, X, Upload, Video, LogOut, Bot, Wrench, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  imageUrl: string;
  price: number;
  promotionalPrice: number | null;
  paymentUrl: string | null;
  stock: number;
  minimumStock: number;
  shippingPrice: number;
  deliveryTime: string;
  status: string;
  createdAt: string;
  livesCount: number;
  soldQuantity: number;
}

export default function DashboardProducts() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  // Image Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadImageProgress, setUploadImageProgress] = useState(0);
  const [uploadImageError, setUploadImageError] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) loadProducts();
  }, [user]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/products", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let result = [...products];
    
    // Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(lower) || 
        (p.sku && p.sku.toLowerCase().includes(lower))
      );
    }
    
    // Status Filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') result = result.filter(p => p.status === 'active' && p.stock > 0);
      if (statusFilter === 'inactive') result = result.filter(p => p.status === 'inactive');
      if (statusFilter === 'soldout') result = result.filter(p => p.stock === 0);
    }
    
    // Stock Filter
    if (stockFilter !== 'all') {
      if (stockFilter === 'available') result = result.filter(p => p.stock > p.minimumStock);
      if (stockFilter === 'low') result = result.filter(p => p.stock > 0 && p.stock <= p.minimumStock);
      if (stockFilter === 'out') result = result.filter(p => p.stock === 0);
    }
    
    // Sort
    result.sort((a, b) => {
      if (sortBy === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'sold') return b.soldQuantity - a.soldQuantity;
      if (sortBy === 'stock-low') return a.stock - b.stock;
      return 0;
    });
    
    setFilteredProducts(result);
  }, [products, searchTerm, statusFilter, stockFilter, sortBy]);

  const showMsg = (type: 'success'|'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleImageFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadImageError("Selecione um arquivo de imagem válido (JPG, PNG, WebP, GIF, SVG).");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setUploadImageError("A imagem não pode ultrapassar 25MB.");
      return;
    }

    setIsUploadingImage(true);
    setUploadImageProgress(0);
    setUploadImageError("");

    const formData = new FormData();
    formData.append("image", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/products/upload-image");
    xhr.setRequestHeader("Authorization", `Bearer ${localStorage.getItem("token")}`);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        setUploadImageProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };

    xhr.onload = () => {
      setIsUploadingImage(false);
      try {
        const data = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300 && data.url) {
          setUploadImageProgress(100);
          setEditingProduct(prev => ({ ...prev, imageUrl: data.url }));
          setUploadImageError("");
        } else {
          setUploadImageError(data.error || "Não foi possível enviar a imagem.");
        }
      } catch {
        setUploadImageError("Resposta inválida ao enviar imagem.");
      }
    };

    xhr.onerror = () => {
      setIsUploadingImage(false);
      setUploadImageError("Falha na conexão ao enviar a imagem.");
    };

    xhr.send(formData);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsSaving(true);

    let cleanPaymentUrl = editingProduct.paymentUrl ? editingProduct.paymentUrl.trim() : null;
    if (cleanPaymentUrl) {
      if (!/^https?:\/\//i.test(cleanPaymentUrl)) {
        cleanPaymentUrl = "https://" + cleanPaymentUrl;
      }
      try {
        new URL(cleanPaymentUrl);
      } catch {
        showMsg('error', 'Link de pagamento inválido. Verifique o endereço digitado.');
        setIsSaving(false);
        return;
      }
    }

    const payload = {
      name: editingProduct.name ? String(editingProduct.name).trim() : "",
      description: editingProduct.description ? String(editingProduct.description).trim() : null,
      sku: editingProduct.sku ? String(editingProduct.sku).trim() : null,
      category: editingProduct.category ? String(editingProduct.category).trim() : null,
      imageUrl: editingProduct.imageUrl ? String(editingProduct.imageUrl).trim() : null,
      price: parseFloat(String(editingProduct.price)) || 0,
      promotionalPrice: editingProduct.promotionalPrice == null || editingProduct.promotionalPrice === ("" as any) ? null : parseFloat(String(editingProduct.promotionalPrice)),
      paymentUrl: cleanPaymentUrl,
      stock: parseInt(String(editingProduct.stock || 0), 10) || 0,
      minimumStock: parseInt(String(editingProduct.minimumStock || 0), 10) || 0,
      shippingPrice: parseFloat(String(editingProduct.shippingPrice || 0)) || 0,
      deliveryTime: editingProduct.deliveryTime ? String(editingProduct.deliveryTime).trim() : null,
      status: editingProduct.status || "active",
    };

    const isNew = !editingProduct?.id;
    const url = isNew ? "/api/products" : `/api/products/${editingProduct.id}`;
    const method = isNew ? "POST" : "PUT";
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        showMsg('success', isNew ? 'Produto criado com sucesso' : 'Produto atualizado');
        setShowModal(false);
        loadProducts();
      } else {
        const errData = await res.json().catch(() => ({}));
        showMsg('error', errData.error || 'Não foi possível salvar o produto.');
      }
    } catch (err) {
      showMsg('error', 'Não foi possível salvar o produto. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        showMsg('success', 'Produto excluído');
        loadProducts();
      }
    } catch (e) {
      showMsg('error', 'Erro ao excluir');
    }
    setShowDeleteModal(null);
  };

  if (loading || !user) return <div className="min-h-screen bg-[#0F0F0F] text-white flex justify-center items-center">Carregando...</div>;

  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.status === 'active' && p.stock > 0).length;
  const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= p.minimumStock).length;
  const outOfStockProducts = products.filter(p => p.stock === 0).length;

  return (
    <div className="flex min-h-screen bg-[#0F0F0F] text-white font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#121212] border-r border-white/10 flex flex-col p-4 space-y-4 hidden md:flex">
        <h2 className="text-xl font-black text-[#FF5A36] uppercase tracking-widest mb-8">Admin</h2>
        <nav className="flex-1 space-y-2">
          <Link to="/painel" className="flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg font-bold transition-colors">
            <Video className="w-5 h-5" />
            <span>Minhas Lives</span>
          </Link>
          <Link to="/painel/produtos" className="flex items-center space-x-3 px-4 py-3 bg-white/10 text-white rounded-lg font-bold">
            <Package className="w-5 h-5" />
            <span>Produtos</span>
          </Link>
          <Link to="/painel/bot-ia" className="flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg font-bold transition-colors">
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

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen relative">
        
        {/* Toast Message */}
        {message && (
          <div className={`absolute top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full font-bold shadow-2xl animate-in fade-in slide-in-from-top-4 ${message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
            {message.text}
          </div>
        )}

        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Produtos</h1>
            <p className="text-gray-400">Gerencie os produtos vendidos nas suas lives</p>
          </div>
          <button 
            onClick={() => { setEditingProduct({ status: 'active', stock: 0, minimumStock: 0, price: 0 }); setShowModal(true); }}
            className="flex items-center justify-center space-x-2 bg-[#FF5A36] hover:bg-[#e04825] text-white px-6 py-3 rounded-lg font-bold uppercase tracking-wide shadow-lg shadow-[#FF5A36]/20 transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Novo produto</span>
          </button>
        </header>

        {/* Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#121212] border border-white/5 p-4 rounded-2xl">
            <p className="text-gray-400 text-sm font-medium mb-1">Total de produtos</p>
            <p className="text-2xl font-bold">{totalProducts}</p>
          </div>
          <div className="bg-[#121212] border border-white/5 p-4 rounded-2xl">
            <p className="text-gray-400 text-sm font-medium mb-1">Produtos ativos</p>
            <p className="text-2xl font-bold">{activeProducts}</p>
          </div>
          <div className="bg-[#121212] border border-[#FF5A36]/30 p-4 rounded-2xl">
            <p className="text-[#FF5A36] text-sm font-medium mb-1">Estoque baixo</p>
            <p className="text-2xl font-bold">{lowStockProducts}</p>
          </div>
          <div className="bg-[#121212] border border-red-500/30 p-4 rounded-2xl">
            <p className="text-red-500 text-sm font-medium mb-1">Esgotados</p>
            <p className="text-2xl font-bold">{outOfStockProducts}</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-[#121212] border border-white/10 rounded-2xl p-2 md:p-4 mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="🔎 Pesquisar produto..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-[#FF5A36] transition-colors text-sm"
            />
          </div>
          <div className="flex flex-wrap md:flex-nowrap gap-2">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-2.5 outline-none focus:border-[#FF5A36] text-sm appearance-none cursor-pointer text-white">
              <option value="all">Status ▼</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="soldout">Esgotado</option>
            </select>
            <select value={stockFilter} onChange={e => setStockFilter(e.target.value)} className="bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-2.5 outline-none focus:border-[#FF5A36] text-sm appearance-none cursor-pointer text-white">
              <option value="all">Estoque ▼</option>
              <option value="available">Disponível</option>
              <option value="low">Estoque baixo</option>
              <option value="out">Esgotado</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-2.5 outline-none focus:border-[#FF5A36] text-sm appearance-none cursor-pointer text-white">
              <option value="recent">Mais recentes</option>
              <option value="oldest">Mais antigos</option>
              <option value="price-high">Maior preço</option>
              <option value="price-low">Menor preço</option>
              <option value="sold">Mais vendidos</option>
              <option value="stock-low">Menor estoque</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-[#FF5A36] border-t-transparent rounded-full animate-spin"></div></div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-[#121212] border border-dashed border-white/20 rounded-2xl p-12 flex flex-col items-center text-center">
             <div className="text-4xl mb-4">📦</div>
             <h3 className="text-xl font-bold mb-2">Nenhum produto encontrado</h3>
             <p className="text-gray-400 mb-6 max-w-md">Cadastre seu primeiro produto para começar a vender durante suas lives.</p>
             <button 
                onClick={() => { setEditingProduct({ status: 'active', stock: 0, minimumStock: 0, price: 0 }); setShowModal(true); }}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-lg font-bold transition-colors"
             >
               + Cadastrar produto
             </button>
          </div>
        ) : (
          <div className="bg-[#121212] border border-white/5 rounded-2xl overflow-hidden">
             {/* Desktop Table */}
             <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#1A1A1A] text-gray-400">
                    <tr>
                      <th className="px-6 py-4 font-medium">Produto</th>
                      <th className="px-6 py-4 font-medium">Preço</th>
                      <th className="px-6 py-4 font-medium">Estoque</th>
                      <th className="px-6 py-4 font-medium">Link de Pagamento</th>
                      <th className="px-6 py-4 font-medium">Vendidos</th>
                      <th className="px-6 py-4 font-medium">Lives</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredProducts.map(p => {
                      const isOutOfStock = p.stock === 0;
                      const isLowStock = !isOutOfStock && p.stock <= p.minimumStock;
                      return (
                        <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white/10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border border-white/10">
                                {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-gray-500" />}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-white truncate max-w-[200px]">{p.name}</span>
                                {p.sku && <span className="text-xs text-gray-500">SKU: {p.sku}</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-white">R$ {p.price.toFixed(2)}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold">{p.stock}</span>
                              {isLowStock && <span className="text-[10px] text-[#FF5A36] flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Baixo</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {p.paymentUrl ? (
                              <a
                                href={p.paymentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors max-w-[170px] truncate"
                                title={p.paymentUrl}
                              >
                                <LinkIcon className="w-3 h-3 shrink-0" /> <span className="truncate">✓ Link configurado</span>
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20" title="Cadastre um link para redirecionar o cliente">
                                <AlertTriangle className="w-3 h-3 shrink-0" /> ⚠ Não configurado
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-300">{p.soldQuantity}</td>
                          <td className="px-6 py-4 font-medium text-gray-300">{p.livesCount}</td>
                          <td className="px-6 py-4">
                            {isOutOfStock ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Esgotado
                              </span>
                            ) : p.status === 'active' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Ativo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span> Inativo
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center relative">
                             <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button onClick={() => { setEditingProduct(p); setShowModal(true); }} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors" title="Editar">
                                 <Edit className="w-4 h-4" />
                               </button>
                               <button onClick={() => setShowDeleteModal(p.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors" title="Excluir">
                                 <Trash2 className="w-4 h-4" />
                               </button>
                             </div>
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:opacity-0 transition-opacity">
                               <MoreVertical className="w-5 h-5 text-gray-600" />
                             </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
             </div>

             {/* Mobile Cards */}
             <div className="md:hidden flex flex-col p-2 gap-2">
               {filteredProducts.map(p => {
                  const isOutOfStock = p.stock === 0;
                  return (
                    <div key={p.id} className="bg-[#1A1A1A] p-4 rounded-xl border border-white/5 flex gap-4">
                      <div className="w-20 h-20 bg-white/10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border border-white/10">
                        {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <Package className="w-8 h-8 text-gray-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="flex justify-between items-start mb-1">
                           <h4 className="font-bold text-white truncate pr-2 text-sm">{p.name}</h4>
                           {isOutOfStock ? (
                              <span className="shrink-0 text-[10px] font-bold text-red-500">● Esgotado</span>
                            ) : p.status === 'active' ? (
                              <span className="shrink-0 text-[10px] font-bold text-green-500">● Ativo</span>
                            ) : (
                              <span className="shrink-0 text-[10px] font-bold text-gray-400">● Inativo</span>
                            )}
                         </div>
                         <div className="text-sm font-bold text-[#FF5A36] mb-1.5">R$ {p.price.toFixed(2)}</div>
                         <div className="mb-2">
                            {p.paymentUrl ? (
                              <span className="text-[11px] font-bold text-green-400 flex items-center gap-1">
                                <LinkIcon className="w-3 h-3"/> ✓ Link configurado
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3"/> ⚠ Link não configurado
                              </span>
                            )}
                         </div>
                         <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-gray-400">
                           <span>Estoque: <strong className="text-white">{p.stock}</strong></span>
                           <span>Vendidos: <strong className="text-white">{p.soldQuantity}</strong></span>
                         </div>
                         <div className="mt-3 flex gap-2">
                           <button onClick={() => { setEditingProduct(p); setShowModal(true); }} className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-2 rounded-lg transition-colors">Editar</button>
                           <button onClick={() => setShowDeleteModal(p.id)} className="w-8 flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                         </div>
                      </div>
                    </div>
                  )
               })}
             </div>
             
             {/* Pagination (Mock) */}
             {filteredProducts.length > 0 && (
               <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm text-gray-400">
                 <span>Mostrando {filteredProducts.length} produtos</span>
                 <div className="flex items-center gap-1">
                   <button className="px-3 py-1 bg-white/10 text-white rounded font-medium">1</button>
                 </div>
               </div>
             )}
          </div>
        )}
      </main>

      {/* CREATE / EDIT MODAL */}
      {showModal && editingProduct && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-2xl bg-[#121212] h-full shadow-2xl flex flex-col border-l border-white/10 animate-in slide-in-from-right-full">
            <header className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-[#1A1A1A]">
              <h2 className="text-xl font-bold">{editingProduct.id ? 'Editar produto' : 'Novo produto'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </header>
            
            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
              
              {/* Info Basics */}
              <section className="space-y-4">
                <h3 className="font-bold text-[#FF5A36] uppercase tracking-wider text-xs">Informações básicas</h3>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Nome do produto *</label>
                  <input required type="text" value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 outline-none focus:border-[#FF5A36] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Descrição</label>
                  <textarea rows={3} value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 outline-none focus:border-[#FF5A36] transition-colors resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">SKU</label>
                    <input type="text" value={editingProduct.sku || ''} onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 outline-none focus:border-[#FF5A36] transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Categoria</label>
                    <input type="text" value={editingProduct.category || ''} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 outline-none focus:border-[#FF5A36] transition-colors" />
                  </div>
                </div>
              </section>

              {/* Imagem */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[#FF5A36] uppercase tracking-wider text-xs">Imagem do Produto</h3>
                  {editingProduct.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setEditingProduct({ ...editingProduct, imageUrl: '' })}
                      className="text-xs text-red-400 hover:text-red-300 font-bold transition-colors"
                    >
                      Remover imagem
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      handleImageFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleImageFile(e.dataTransfer.files[0]);
                    }
                  }}
                  className="border-2 border-dashed border-white/20 hover:border-[#FF5A36]/50 rounded-xl p-6 flex flex-col items-center justify-center bg-[#1A1A1A] hover:bg-white/5 transition-all cursor-pointer relative overflow-hidden group min-h-[160px]"
                >
                  {isUploadingImage ? (
                    <div className="flex flex-col items-center justify-center py-4 w-full max-w-xs text-center">
                      <Loader2 className="w-8 h-8 text-[#FF5A36] animate-spin mb-3" />
                      <p className="text-sm font-bold text-white mb-2">Enviando imagem ({uploadImageProgress}%)...</p>
                      <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/10">
                        <div 
                          className="h-full bg-[#FF5A36] transition-all duration-150 rounded-full"
                          style={{ width: `${uploadImageProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : editingProduct.imageUrl ? (
                    <div className="relative w-full flex flex-col items-center">
                      <div className="w-32 h-32 bg-black/60 rounded-lg p-2 border border-white/10 flex items-center justify-center overflow-hidden mb-3">
                        <img 
                          src={editingProduct.imageUrl} 
                          alt="Produto" 
                          className="max-w-full max-h-full object-contain rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://via.placeholder.com/150?text=Sem+Foto";
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-300 font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
                        <Upload className="w-3.5 h-3.5" /> Clique para trocar a foto
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:bg-[#FF5A36]/10 transition-colors">
                        <Upload className="w-6 h-6 text-gray-400 group-hover:text-[#FF5A36] transition-colors" />
                      </div>
                      <p className="text-sm font-bold text-white mb-1">Clique ou arraste uma foto do produto</p>
                      <p className="text-xs text-gray-500">JPG, PNG, WebP, GIF até 25MB</p>
                    </div>
                  )}

                  {uploadImageError && (
                    <div className="mt-3 flex items-center gap-2 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg" onClick={e => e.stopPropagation()}>
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {uploadImageError}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-400 mb-1">Ou cole uma URL direta da imagem:</label>
                  <div className="relative">
                    <ImageIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input 
                      type="text" 
                      placeholder="https://exemplo.com/imagem-do-produto.jpg" 
                      value={editingProduct.imageUrl || ''} 
                      onChange={e => setEditingProduct({...editingProduct, imageUrl: e.target.value})} 
                      className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-[#FF5A36] transition-colors" 
                      onClick={e => e.stopPropagation()} 
                    />
                  </div>
                </div>
              </section>

              {/* Pricing */}
              <section className="space-y-4">
                <h3 className="font-bold text-[#FF5A36] uppercase tracking-wider text-xs">Preço</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Preço de venda *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                      <input required type="number" step="0.01" value={editingProduct.price ?? ''} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg pl-9 pr-4 py-2.5 outline-none focus:border-[#FF5A36] transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Preço promocional</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                      <input type="number" step="0.01" value={editingProduct.promotionalPrice ?? ''} onChange={e => setEditingProduct({...editingProduct, promotionalPrice: e.target.value ? parseFloat(e.target.value) : null})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg pl-9 pr-4 py-2.5 outline-none focus:border-[#FF5A36] transition-colors" />
                    </div>
                  </div>
                </div>
              </section>

              {/* Link de Pagamento */}
              <section className="space-y-4">
                <h3 className="font-bold text-[#FF5A36] uppercase tracking-wider text-xs">Link de Pagamento</h3>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">URL de Pagamento / Checkout do Produto</label>
                  <div className="relative">
                    <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input 
                      type="url" 
                      placeholder="https://pagamento.exemplo.com/checkout/123" 
                      value={editingProduct.paymentUrl || ''} 
                      onChange={e => setEditingProduct({...editingProduct, paymentUrl: e.target.value})} 
                      className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-[#FF5A36] transition-colors text-sm font-mono text-white placeholder:text-gray-600" 
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
                    Insira o link fornecido pelo seu gateway de pagamento (ex: Hotmart, Kiwify, Mercado Pago, Stripe, Cakto, etc). O cliente será redirecionado para este link após preencher os dados de entrega.
                  </p>
                </div>
              </section>

              {/* Stock */}
              <section className="space-y-4">
                <h3 className="font-bold text-[#FF5A36] uppercase tracking-wider text-xs">Estoque</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Quantidade em estoque *</label>
                    <input required type="number" value={editingProduct.stock || 0} onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value)})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 outline-none focus:border-[#FF5A36] transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Estoque mínimo</label>
                    <input type="number" value={editingProduct.minimumStock || 0} onChange={e => setEditingProduct({...editingProduct, minimumStock: parseInt(e.target.value)})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 outline-none focus:border-[#FF5A36] transition-colors" />
                  </div>
                </div>
              </section>

              {/* Status */}
              <section className="space-y-4">
                <h3 className="font-bold text-[#FF5A36] uppercase tracking-wider text-xs">Status</h3>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="status" checked={editingProduct.status === 'active'} onChange={() => setEditingProduct({...editingProduct, status: 'active'})} className="accent-[#FF5A36]" />
                    <span className="text-sm">Ativo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="status" checked={editingProduct.status === 'inactive'} onChange={() => setEditingProduct({...editingProduct, status: 'inactive'})} className="accent-[#FF5A36]" />
                    <span className="text-sm">Inativo</span>
                  </label>
                </div>
              </section>

            </form>

            <footer className="p-6 border-t border-white/10 bg-[#1A1A1A] flex justify-end gap-3 pb-safe">
              <button onClick={() => setShowModal(false)} className="px-6 py-3 rounded-lg font-bold text-white hover:bg-white/10 transition-colors">
                Cancelar
              </button>
              <button disabled={isSaving} onClick={handleSaveProduct} className="bg-[#FF5A36] hover:bg-[#e04825] disabled:opacity-50 text-white px-8 py-3 rounded-lg font-bold uppercase tracking-wide transition-colors flex items-center gap-2">
                {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : null}
                Salvar produto
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowDeleteModal(null)} />
          <div className="relative bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Excluir produto?</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">Essa ação não poderá ser desfeita. O histórico de pedidos será preservado.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(null)} className="flex-1 px-4 py-2.5 rounded-lg font-bold text-white bg-white/5 hover:bg-white/10 transition-colors">
                Cancelar
              </button>
              <button onClick={() => handleDelete(showDeleteModal)} className="flex-1 px-4 py-2.5 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 transition-colors">
                Excluir produto
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
