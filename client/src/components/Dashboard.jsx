import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import GoalCard from './GoalCard.jsx';
import AddictionCard from './AddictionCard.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const [metas, setMetas] = useState([]);
  const [metasConcluidas, setMetasConcluidas] = useState([]);
  const [mostrarConcluidas, setMostrarConcluidas] = useState(false);
  const [vicios, setVicios] = useState([]);
  const [frase, setFrase] = useState('');
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    const [m, mc, v] = await Promise.all([
      api.listarMetas('ativa'),
      api.listarMetas('concluida'),
      api.listarVicios('ativo'),
    ]);
    setMetas(m);
    setMetasConcluidas(mc);
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
    const atualizada = await api.atualizarMeta(meta.id, { status: 'concluida', progresso: 100 });
    setMetas((prev) => prev.filter((m) => m.id !== meta.id));
    setMetasConcluidas((prev) => [atualizada, ...prev]);
  }

  async function reabrirMeta(meta) {
    const atualizada = await api.atualizarMeta(meta.id, { status: 'ativa' });
    setMetasConcluidas((prev) => prev.filter((m) => m.id !== meta.id));
    setMetas((prev) => [atualizada, ...prev]);
  }

  async function registrarRecaida(vicio, nota) {
    const atualizado = await api.registrarRecaida(vicio.id, nota);
    setVicios((prev) => prev.map((v) => (v.id === vicio.id ? { ...atualizado, recaidas: v.recaidas, marcos_alvo: v.marcos_alvo } : v)));
  }

  return (
    <div className="page page-wide">
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
        <div className="cards-grid">
          {metas.map((m) => (
            <GoalCard key={m.id} meta={m} onAtualizarProgresso={atualizarProgresso} onConcluir={concluirMeta} />
          ))}
        </div>
      </section>

      {metasConcluidas.length > 0 && (
        <section style={{ marginBottom: 30 }}>
          <button
            onClick={() => setMostrarConcluidas((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: mostrarConcluidas ? 14 : 0,
              cursor: 'pointer',
            }}
          >
            <h2 style={{ fontSize: 12.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)', margin: 0, fontFamily: 'var(--font-mono)' }}>
              Metas concluídas ({metasConcluidas.length})
            </h2>
            <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>{mostrarConcluidas ? '▲' : '▼'}</span>
          </button>

          {mostrarConcluidas && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {metasConcluidas.map((m) => (
                <div
                  key={m.id}
                  className="panel"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '13px 16px',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <span style={{ flex: 1, fontSize: 14, color: 'var(--text-dim)' }}>{m.titulo}</span>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '7px 14px', fontSize: 12 }}
                    onClick={() => reabrirMeta(m)}
                  >
                    Reabrir
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

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
        <div className="cards-grid">
          {vicios.map((v) => (
            <AddictionCard key={v.id} vicio={v} onRecaida={registrarRecaida} />
          ))}
        </div>
      </section>
    </div>
  );
}
