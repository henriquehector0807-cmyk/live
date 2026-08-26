import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import LivePage from './pages/LivePage';
import LiveEditor from './pages/LiveEditor';
import { AuthProvider } from './context/AuthContext';
import './index.css';

import DashboardProducts from './pages/DashboardProducts';
import DashboardAiBot from './pages/DashboardAiBot';
import DashboardTools from './pages/DashboardTools';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Register />} />
          <Route path="/painel" element={<Dashboard />} />
          <Route path="/painel/produtos" element={<DashboardProducts />} />
          <Route path="/painel/bot-ia" element={<DashboardAiBot />} />
          <Route path="/painel/lives/nova" element={<LiveEditor />} />
          <Route path="/painel/lives/:id" element={<LiveEditor />} />
          <Route path="/painel/ferramentas" element={<DashboardTools />} />
          <Route path="/live/:slug" element={<LivePage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
