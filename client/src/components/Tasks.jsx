import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

function hojeISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60 * 1000).toISOString().slice(0, 10);
}

function formatarDataLabel(dataISO) {
  const hoje = hojeISO();
  if (dataISO === hoje) return 'Hoje';
  const d = new Date(dataISO + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' });
}

export default function Tasks() {
  const [data, setData] = useState(hojeISO());
  const [tarefas, setTarefas] = useState([]);
  const [texto, setTexto] = useState('');
  const [carregando, setCarregando] = useState(true);

  async function carregar(dia) {
    setCarregando(true);
    const rows = await api.listarTarefas(dia);
    setTarefas(rows);
    setCarregando(false);
  }

  useEffect(() => {
    carregar(data);
  }, [data]);

  async function adicionar(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    const nova = await api.criarTarefa(texto.trim(), data);
    setTexto('');
    setTarefas((prev) => [...prev, nova]);
  }

  async function alternar(tarefa) {
    const atualizada = await api.atualizarTarefa(tarefa.id, { concluida: tarefa.concluida ? 0 : 1 });
    setTarefas((prev) =>
      prev
        .map((t) => (t.id === tarefa.id ? atualizada : t))
        .sort((a, b) => a.concluida - b.concluida || a.ordem - b.ordem)
    );
  }

  async function excluir(id) {
    await api.excluirTarefa(id);
    setTarefas((prev) => prev.filter((t) => t.id !== id));
  }

  async function limparConcluidas() {
    await api.limparConcluidas(data);
    setTarefas((prev) => prev.filter((t) => !t.concluida));
  }

  function mudarDia(deltaDias) {
    const d = new Date(data + 'T00:00:00');
    d.setDate(d.getDate() + deltaDias);
    setData(d.toISOString().slice(0, 10));
  }

  const pendentes = tarefas.filter((t) => !t.concluida);
  const concluidas = tarefas.filter((t) => t.concluida);
  const progresso = tarefas.length ? Math.round((concluidas.length / tarefas.length) * 100) : 0;

  return (
    <div className="page">
      <div className="eyebrow">Checklist</div>
      <h1 className="page-title">Tarefas</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <button className="btn btn-ghost" style={{ padding: '8px 14px' }} onClick={() => mudarDia(-1)}>←</button>
        <div className="pill pill-accent" style={{ textTransform: 'capitalize', flex: 1, justifyContent: 'center' }}>
          {formatarDataLabel(data)}
        </div>
        <button className="btn btn-ghost" style={{ padding: '8px 14px' }} onClick={() => mudarDia(1)}>→</button>
        {data !== hojeISO() && (
          <button className="btn btn-ghost" style={{ padding: '8px 14px' }} onClick={() => setData(hojeISO())}>Hoje</button>
        )}
      </div>

      {tarefas.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${progresso}%` }} /></div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 5, fontFamily: 'var(--font-mono)' }}>
            {concluidas.length} de {tarefas.length} concluídas · {progresso}%
          </div>
        </div>
      )}

      <form onSubmit={adicionar} style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="O que precisa ser feito hoje?"
          style={{ flex: 1, padding: 13, borderRadius: 'var(--radius-md)' }}
        />
        <button className="btn btn-solid" type="submit">+ Adicionar</button>
      </form>

      {!carregando && tarefas.length === 0 && (
        <div className="empty-state">Nada na lista ainda. Adicione o que precisa fazer hoje.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pendentes.map((t) => (
          <TaskItem key={t.id} tarefa={t} onAlternar={alternar} onExcluir={excluir} />
        ))}
      </div>

      {concluidas.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="eyebrow">Concluídas</div>
            <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 11.5 }} onClick={limparConcluidas}>
              Limpar concluídas
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {concluidas.map((t) => (
              <TaskItem key={t.id} tarefa={t} onAlternar={alternar} onExcluir={excluir} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskItem({ tarefa, onAlternar, onExcluir }) {
  return (
    <div
      className="panel"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 14px',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <button
        onClick={() => onAlternar(tarefa)}
        aria-label={tarefa.concluida ? 'Marcar como pendente' : 'Marcar como concluída'}
        style={{
          width: 22,
          height: 22,
          flexShrink: 0,
          borderRadius: 7,
          border: `1.5px solid ${tarefa.concluida ? 'var(--accent)' : 'var(--border-strong)'}`,
          background: tarefa.concluida ? 'var(--accent)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#050505',
          fontSize: 13,
          fontWeight: 700,
          padding: 0,
        }}
      >
        {tarefa.concluida ? '✓' : ''}
      </button>

      <span
        style={{
          flex: 1,
          fontSize: 14.5,
          color: tarefa.concluida ? 'var(--text-faint)' : 'var(--text)',
          textDecoration: tarefa.concluida ? 'line-through' : 'none',
          wordBreak: 'break-word',
        }}
      >
        {tarefa.texto}
      </span>

      <button
        onClick={() => onExcluir(tarefa.id)}
        aria-label="Excluir tarefa"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-faint)',
          fontSize: 16,
          padding: 4,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
