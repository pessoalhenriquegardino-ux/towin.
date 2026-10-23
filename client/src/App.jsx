import { useCallback, useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { api } from './lib/api.js';
import NavBar from './components/NavBar.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import GoalForm from './components/GoalForm.jsx';
import AddictionForm from './components/AddictionForm.jsx';
import Timeline from './components/Timeline.jsx';
import Chat from './components/Chat.jsx';
import Settings from './components/Settings.jsx';
import Pomodoro from './components/Pomodoro.jsx';
import Tasks from './components/Tasks.jsx';
import Finance from './components/Finance.jsx';

export default function App() {
  // 'carregando' | 'login' | 'ok'
  const [sessao, setSessao] = useState('carregando');

  const verificar = useCallback(async () => {
    try {
      const { protegido, autenticado } = await api.statusAuth();
      setSessao(!protegido || autenticado ? 'ok' : 'login');
    } catch {
      // Sem resposta do servidor: deixa o app abrir; cada tela mostra seu próprio erro.
      setSessao('ok');
    }
  }, []);

  useEffect(() => {
    verificar();
    const aoExpirar = () => setSessao('login');
    window.addEventListener('towin:nao-autenticado', aoExpirar);
    return () => window.removeEventListener('towin:nao-autenticado', aoExpirar);
  }, [verificar]);

  if (sessao === 'carregando') return null;
  if (sessao === 'login') return <Login onEntrar={() => setSessao('ok')} />;

  return (
    <div className="app-shell">
      <ScrollToTop />
      <NavBar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/metas/nova" element={<GoalForm />} />
          <Route path="/metas/:id/editar" element={<GoalForm />} />
          <Route path="/vicios/novo" element={<AddictionForm />} />
          <Route path="/vicios/:id/editar" element={<AddictionForm />} />
          <Route path="/linha-do-tempo" element={<Timeline />} />
          <Route path="/pomodoro" element={<Pomodoro />} />
          <Route path="/tarefas" element={<Tasks />} />
          <Route path="/financas" element={<Finance />} />
          <Route path="/coach" element={<Chat />} />
          <Route path="/config" element={<Settings onSair={() => setSessao('login')} />} />
        </Routes>
      </main>
    </div>
  );
}
