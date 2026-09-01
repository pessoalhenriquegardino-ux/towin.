import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import GoalCard from './GoalCard.jsx';
import AddictionCard from './AddictionCard.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const [metas, setMetas] = useState([]);
  const [vicios, setVicios] = useState([]);
  const [frase, setFrase] = useState('');
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    const [m, v] = await Promise.all([api.listarMetas('ativa'), api.listarVicios('ativo')]);
    setMetas(m);
    setVicios(v);
    setCarregando(false);
    api.obterFraseDoDia().then((r) => setFrase(r.frase)).catch(() => {});
  }

  useEffect(() => {
    carregar();
  }, []);

  async function atualizarProgresso(meta, progresso, valorAtual) {
    const payload = valorAtual !== undefined ? { valor_atual: valorAtual } : { progresso };
    const atualizada = await api.atualizarMeta(meta.id, payload);
    setMetas((prev) => prev.map((m) => (m.id === meta.id ? atualizada : m)));
  }

  async function concluirMeta(meta) {
    await api.atualizarMeta(meta.id, { status: 'concluida', progresso: 100 });
    setMetas((prev) => prev.filter((m) => m.id !== meta.id));
  }

  async function registrarRecaida(vicio, nota) {
    const atualizado = await api.registrarRecaida(vicio.id, nota);
    setVicios((prev) => prev.map((v) => (v.id === vicio.id ? { ...atualizado, recaidas: v.recaidas, marcos_alvo: v.marcos_alvo } : v)));
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 4 }}>
        <img src="/logo-wordmark.png" alt="To Win" style={{ height: 22, width: 'auto', marginBottom: 10 }} />
        <h1 className="page-title" style={{ marginBottom: 8 }}>Seu caminho</h1>
      </div>

      {frase && (
        <div
          className="panel"
          style={{
            marginBottom: 24,
            borderRadius: 'var(--radius-lg)',
            padding: 18,
          }}
        >
          <div className="pill pill-accent" style={{ marginBottom: 10 }}>O coach diz</div>
          <div style={{ fontSize: 15, lineHeight: 1.55 }}>{frase}</div>
        </div>
      )}

      <section style={{ marginBottom: 30 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 12.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)', margin: 0, fontFamily: 'var(--font-mono)' }}>
            Metas ativas
          </h2>
          <button className="btn btn-ghost" onClick={() => navigate('/metas/nova')} style={{ padding: '8px 16px' }}>+ Nova meta</button>
        </div>
        {!carregando && metas.length === 0 && (
          <div className="empty-state">Nenhuma meta ativa. Toda mudança começa com uma decisão registrada.</div>
        )}
        {metas.map((m) => (
          <GoalCard key={m.id} meta={m} onAtualizarProgresso={atualizarProgresso} onConcluir={concluirMeta} />
        ))}
      </section>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 12.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)', margin: 0, fontFamily: 'var(--font-mono)' }}>
            Sobriedade
          </h2>
          <button className="btn btn-ghost" onClick={() => navigate('/vicios/novo')} style={{ padding: '8px 16px' }}>+ Novo vício</button>
        </div>
        {!carregando && vicios.length === 0 && (
          <div className="empty-state">Nada cadastrado aqui ainda. O primeiro passo é admitir o que precisa largar.</div>
        )}
        {vicios.map((v) => (
          <AddictionCard key={v.id} vicio={v} onRecaida={registrarRecaida} />
        ))}
      </section>
    </div>
  );
}
