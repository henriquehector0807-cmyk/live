import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isBypassing, setIsBypassing] = useState(true);
  const navigate = useNavigate();
  const { login } = useAuth();
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    const autoLogin = async () => {
      try {
        const res = await fetch("/api/auth/dev-bypass");
        const data = await res.json();
        if (res.ok) {
          login(data.token, data.user);
          navigate("/painel");
        } else {
          setIsBypassing(false);
        }
      } catch (err) {
        console.error(err);
        setIsBypassing(false);
      }
    };
    
    autoLogin();
  }, [login, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        navigate("/painel");
      } else {
        setError(data.error || "Erro ao fazer login");
      }
    } catch (err) {
      setError("Falha na conexão");
    }
  };

  if (isBypassing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F] text-white p-4">
        <div className="w-full max-w-md bg-[#1a1a1a] p-8 rounded-xl border border-white/10 shadow-2xl text-center space-y-6">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <h1 className="text-xl font-bold uppercase tracking-widest text-orange-500">Acessando Painel...</h1>
          <p className="text-gray-400 text-sm">Entrando automaticamente (Modo de Desenvolvimento).</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F] text-white p-4">
      <div className="w-full max-w-md bg-[#1a1a1a] p-8 rounded-xl border border-white/10 shadow-2xl">
        <h1 className="text-2xl font-bold text-center mb-6 uppercase tracking-wider text-orange-500">Live Commerce</h1>
        {error && <p className="bg-red-500/20 text-red-500 p-3 rounded mb-4 text-sm font-bold text-center">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
          <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg mt-4 uppercase tracking-wider transition-colors shadow-lg shadow-orange-600/20">
            Entrar
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-400">
          Não tem uma conta? <Link to="/cadastro" className="text-orange-500 hover:underline">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}
