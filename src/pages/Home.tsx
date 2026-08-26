import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronRight, ShoppingBag, Users, Play } from "lucide-react";

interface Live {
  id: string;
  slug: string;
  title: string;
  productName: string;
  videoUrl: string;
  status: string;
  createdAt: string;
}

export default function Home() {
  const [lives, setLives] = useState<Live[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/lives")
      .then(res => res.json())
      .then(data => {
        if (data.lives) setLives(data.lives);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#111111] text-white font-sans pb-20 overflow-x-hidden">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-[#FF5A36] rounded-full flex items-center justify-center font-bold text-white text-lg">V</div>
          <span className="text-xl font-bold tracking-tight">Viva<span className="text-[#FF5A36]">Shop</span></span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-400">
          <a href="#" className="text-white font-medium">Início</a>
          <a href="#" className="hover:text-white transition">Seguindo</a>
          <a href="#" className="hover:text-white transition">Ofertas</a>
          <a href="#" className="hover:text-white transition">Como funciona</a>
        </nav>

        <div className="flex items-center gap-4">
          <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition">
            <Search className="w-4 h-4 text-gray-300" />
          </button>
          <Link to="/login" className="hidden md:block text-sm font-medium px-5 py-2.5 rounded-full border border-white/10 hover:bg-white/5 transition">
            Entrar
          </Link>
          <Link to="/login" className="text-sm font-medium px-5 py-2.5 rounded-full bg-[#FF5A36] hover:bg-[#e04825] transition text-white">
            Criar conta
          </Link>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto">
        <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-[#2A1612] to-[#120A08] border border-white/5 p-8 md:p-16 flex flex-col md:flex-row items-center justify-between min-h-[480px]">
          <div className="max-w-xl relative z-10 md:pr-8">
            <p className="text-[#FF5A36] text-xs font-bold tracking-[0.2em] uppercase mb-4">Compras que parecem conversa</p>
            <h1 className="text-5xl md:text-[5rem] font-bold tracking-tight mb-6 leading-[1.05]">
              Descubra. Converse.<br/>
              <span className="text-[#FF5A36]">Compre ao vivo.</span>
            </h1>
            <p className="text-gray-400 text-lg mb-8 max-w-md leading-relaxed font-medium">
              Assista às melhores lives, encontre produtos incríveis e compre com quem entende.
            </p>
            <button className="bg-[#FF5A36] text-white px-8 py-4 rounded-full font-bold flex items-center gap-2 hover:bg-[#e04825] transition">
              Explorar lives <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          {/* Mockup Phone */}
          <div className="hidden lg:block relative w-[320px] h-[500px] bg-[#1a1a1a] rounded-[2.5rem] border-[10px] border-[#222] overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] rotate-[-4deg] mt-8 md:mt-0 mr-12 shrink-0">
             <div className="absolute inset-0 bg-gradient-to-b from-[#bdaaa1] to-[#8d7c75] z-0"></div>
             {/* Plant Image Mockup */}
             <div className="absolute inset-x-0 bottom-0 top-1/4 bg-white/10 backdrop-blur-xl z-10 rounded-t-[3rem] shadow-inner flex flex-col items-center pt-8">
                 <div className="w-32 h-32 bg-orange-400/20 rounded-full blur-3xl absolute top-10"></div>
                 <div className="relative w-48 h-48 bg-[#d8c8bd] rounded-3xl overflow-hidden border border-white/20 mb-4 shadow-xl">
                   <img src="https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=400&q=80" className="w-full h-full object-cover mix-blend-multiply opacity-80" alt="Plant" />
                 </div>
             </div>
             
             <div className="absolute bottom-6 left-0 w-full flex justify-center z-20">
                <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-[10px] font-bold uppercase tracking-wider text-white">
                  Ao vivo no replay
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Lives Section */}
      <main className="p-4 md:p-8 max-w-[1400px] mx-auto">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-[1.75rem] font-bold mb-1">Explore as lives</h2>
            <p className="text-gray-400 text-sm font-medium">Conteúdo selecionado para você</p>
          </div>
          <button className="text-[#FF5A36] text-sm hover:underline flex items-center gap-1 font-medium">
            Ver todas <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Categories */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar mb-8 pb-2">
          {['Para você', 'Casa', 'Beleza', 'Moda', 'Cozinha', 'Eletrônicos'].map((cat, i) => (
            <button key={cat} className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-semibold transition ${i === 0 ? 'bg-white text-black' : 'bg-[#1A1A1A] text-gray-300 hover:bg-[#2A2A2A]'}`}>
              {cat}
            </button>
          ))}
        </div>
        
        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="aspect-[9/16] bg-[#1A1A1A] animate-pulse rounded-[2rem]"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {lives.map(live => (
              <Link 
                key={live.id} 
                to={`/live/${live.slug}`}
                className="group relative aspect-[9/16] rounded-[2rem] overflow-hidden shadow-lg bg-[#1A1A1A] block"
              >
                {/* Simulated Thumbnail */}
                <div className="absolute inset-0 z-0 opacity-80 group-hover:scale-105 transition-transform duration-700 ease-out" 
                     style={{ background: `linear-gradient(135deg, hsl(${live.id.charCodeAt(0) * 10 % 360}, 30%, 30%), hsl(${live.id.charCodeAt(1) * 20 % 360}, 40%, 15%))` }}>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/20 to-transparent z-10" />
                
                {/* Badges */}
                <div className="absolute top-4 left-4 z-20">
                  <span className="bg-[#FF5A36] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                    Replay
                  </span>
                </div>
                <div className="absolute top-4 right-4 z-20">
                  <span className="bg-black/40 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/5">
                    Replay gravado
                  </span>
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 w-full p-5 z-20">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white border border-white/20 shrink-0">
                      {live.title.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white/90 text-[11px] font-semibold truncate">{live.title}</span>
                  </div>
                  <p className="text-white font-bold text-sm truncate mb-4">{live.productName}</p>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#FF5A36]/20 flex items-center justify-center">
                       <ShoppingBag className="w-3 h-3 text-[#FF5A36]" />
                    </div>
                    <span className="text-gray-300 font-semibold text-xs tracking-wide">Comprar</span>
                  </div>
                </div>

                {/* Play Overlay */}
                <div className="absolute inset-0 z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-14 h-14 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                    <Play className="w-6 h-6 text-white ml-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
