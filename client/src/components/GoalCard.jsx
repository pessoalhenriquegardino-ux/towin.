import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function diasRestantes(prazo) {
  if (!prazo) return null;
  const ms = new Date(prazo).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export default function GoalCard({ meta, onAtualizarProgresso, onConcluir }) {
  const navigate = useNavigate();
  const [expandido, setExpandido] = useState(false);
  const restantes = diasRestantes(meta.prazo);

  const temValor = meta.valor_alvo && meta.valor_alvo > 0;
  const valorAtual = meta.valor_atual || 0;
  const valorFalta = temValor ? Math.max(0, meta.valor_alvo - valorAtual) : null;
  const progressoValor = temValor ? Math.min(100, Math.round((valorAtual / meta.valor_alvo) * 100)) : null;
  const fotoPosX = meta.foto_pos_x ?? 50;
  const fotoPosY = meta.foto_pos_y ?? 50;
  const fotoZoom = meta.foto_zoom ?? 100;

  return (
    <div
      className="panel"
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        marginBottom: 16,
        minHeight: meta.foto_url ? 220 : 'auto',
      }}
    >
      {meta.foto_url && (
        <>
          <img
            src={meta.foto_url}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: `${fotoPosX}% ${fotoPosY}%`,
              transform: `scale(${fotoZoom / 100})`,
              transformOrigin: `${fotoPosX}% ${fotoPosY}%`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 55%, rgba(3,3,3,0.94) 100%)',
            }}
          />
        </>
      )}

      <div style={{ position: 'relative', padding: 20, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            {meta.categoria && <span className="pill pill-accent">{meta.categoria}</span>}
            <h3
              style={{
                margin: '10px 0 0',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 'clamp(19px, 5.5vw, 24px)',
                letterSpacing: '-0.01em',
                textShadow: meta.foto_url ? '0 2px 12px rgba(0,0,0,0.6)' : 'none',
              }}
            >
              {meta.titulo}
            </h3>
          </div>
        </div>

        {/* Números da meta: prazo e dinheiro, estilo dashboard */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          {restantes !== null && (
            <div style={{ flex: '1 1 120px', borderRadius: 'var(--radius-sm)' }} className="panel" >
              <div style={{ padding: '10px 14px' }}>
                <div className="eyebrow" style={{ fontSize: 10 }}>Prazo</div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 20,
                    fontWeight: 500,
                    color: restantes < 0 ? 'var(--danger)' : 'var(--text)',
                    marginTop: 2,
                  }}
                >
                  {restantes < 0 ? `+${Math.abs(restantes)}d` : `${restantes}d`}
                </div>
              </div>
            </div>
          )}

          {temValor && (
            <div style={{ flex: '1 1 150px', borderRadius: 'var(--radius-sm)' }} className="panel">
              <div style={{ padding: '10px 14px' }}>
                <div className="eyebrow" style={{ fontSize: 10 }}>Falta juntar</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--text)', marginTop: 2 }}>
                  {formatarMoeda(valorFalta)}
                </div>
              </div>
            </div>
          )}
        </div>

        {temValor ? (
          <div style={{ marginTop: 14 }}>
            <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${progressoValor}%` }} /></div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 5, fontFamily: 'var(--font-mono)' }}>
              {formatarMoeda(valorAtual)} de {formatarMoeda(meta.valor_alvo)} · {progressoValor}%
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 14 }}>
            <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${meta.progresso}%` }} /></div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 5, fontFamily: 'var(--font-mono)' }}>
              {meta.progresso}% concluído
            </div>
          </div>
        )}

        {expandido && (
          <p style={{ margin: '14px 0 0', fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>
            {meta.porque}
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => setExpandido((v) => !v)} style={{ padding: '9px 16px' }}>
            {expandido ? 'Ocultar porquê' : 'Ver o porquê'}
          </button>
          {temValor ? (
            <button
              className="btn btn-ghost"
              style={{ padding: '9px 16px' }}
              onClick={() => {
                const novoValor = prompt('Quanto você já tem guardado agora?', valorAtual);
                if (novoValor !== null && !Number.isNaN(parseFloat(novoValor))) {
                  onAtualizarProgresso(meta, meta.progresso, parseFloat(novoValor));
                }
              }}
            >
              Atualizar valor
            </button>
          ) : (
            <button
              className="btn btn-ghost"
              style={{ padding: '9px 16px' }}
              onClick={() => onAtualizarProgresso(meta, Math.min(100, meta.progresso + 10))}
            >
              +10% progresso
            </button>
          )}
          <button className="btn btn-ghost" style={{ padding: '9px 16px' }} onClick={() => navigate(`/metas/${meta.id}/editar`)}>
            Editar
          </button>
          <button className="btn btn-solid" style={{ padding: '9px 18px', marginLeft: 'auto' }} onClick={() => onConcluir(meta)}>
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
