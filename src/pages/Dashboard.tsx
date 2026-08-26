import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Play, Plus, Video, LogOut, ExternalLink, Package, Edit, Bot, Wrench, BarChart3, CreditCard } from "lucide-react";

export default function Dashboard() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [lives, setLives] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetch("/api/lives", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      })
      .then(res => res.json())
      .then(data => setLives(data))
      .catch(console.error);
    }
  }, [user]);

  if (loading || !user) return <div className="min-h-screen bg-[#0F0F0F] text-white flex justify-center items-center">Carregando...</div>;

  return (
    <div className="flex min-h-screen bg-[#0F0F0F] text-white font-sans">
      <aside className="w-64 bg-[#121212] border-r border-white/10 flex flex-col p-4 space-y-4">
        <h2 className="text-xl font-black text-orange-500 uppercase tracking-widest mb-8">Admin</h2>
        <nav className="flex-1 space-y-2">
          <Link to="/painel" className="flex items-center space-x-3 px-4 py-3 bg-white/10 text-white rounded-lg font-bold">
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
          <Link to="/painel/pagamentos" className="flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg font-bold transition-colors">
            <CreditCard className="w-5 h-5" />
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

      <main className="flex-1 p-8">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Olá, {user.name}</h1>
            <p className="text-gray-400">Gerencie suas lives e vendas.</p>
          </div>
          <Link to="/painel/lives/nova" className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-bold uppercase tracking-wide shadow-lg shadow-orange-600/20">
            <Plus className="w-5 h-5" />
            <span>Criar Live</span>
          </Link>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lives.map(live => (
            <div key={live.id} className="bg-[#121212] border border-white/10 rounded-xl overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-widest ${live.status === 'live' ? 'bg-red-500/20 text-red-500' : 'bg-gray-800 text-gray-400'}`}>
                    {live.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-1">{live.title}</h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{live.productName} - R$ {live.productPrice.toFixed(2)}</p>
              </div>
              <div className="p-4 border-t border-white/10 bg-black/20 flex gap-2">
                <Link to={`/painel/lives/${live.id}`} className="flex-1 flex justify-center items-center space-x-2 bg-[#FF5A36] hover:bg-[#e04825] text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                  <Edit className="w-4 h-4" />
                  <span>Editar</span>
                </Link>
                <Link to={`/live/${live.slug}`} target="_blank" className="flex-1 flex justify-center items-center space-x-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                  <ExternalLink className="w-4 h-4" />
                  <span>Ver Página</span>
                </Link>
              </div>
            </div>
          ))}
          {lives.length === 0 && (
            <div className="col-span-full py-12 text-center border border-dashed border-white/20 rounded-xl bg-white/5">
              <p className="text-gray-400 mb-4">Nenhuma live cadastrada ainda.</p>
              <Link to="/painel/lives/nova" className="inline-flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-bold uppercase tracking-wide">
                <Plus className="w-5 h-5" />
                <span>Criar Primeira Live</span>
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
