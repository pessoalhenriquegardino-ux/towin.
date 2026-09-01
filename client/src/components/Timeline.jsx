import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const ICONES = {
  meta_concluida: '★',
  marco_sobriedade: '◆',
  reflexao: '✎',
};

function formatarData(iso) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function Timeline() {
  const [eventos, setEventos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.obterTimeline().then((r) => {
      setEventos(r);
      setCarregando(false);
    });
  }, []);

  return (
    <div className="page">
      <h1 className="page-title">Sua jornada</h1>
      <p style={{ color: 'var(--text-dim)', marginTop: -12, marginBottom: 24, fontSize: 14 }}>
        A prova de que você está mudando, mesmo nos dias ruins.
      </p>

      {!carregando && eventos.length === 0 && (
        <div className="empty-state">Ainda não há marcos registrados. Eles vão aparecer aqui conforme você avança.</div>
      )}

      <div style={{ borderLeft: '2px solid var(--border)', marginLeft: 8, paddingLeft: 20 }}>
        {eventos.map((ev, i) => (
          <div key={i} style={{ position: 'relative', marginBottom: 22 }}>
            <div
              className="glass-circle"
              style={{
                position: 'absolute',
                left: -29,
                top: 2,
                width: 18,
                height: 18,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                color: 'var(--text)',
              }}
            >
              {ICONES[ev.tipo] || '•'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {formatarData(ev.data)}
            </div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>{ev.titulo}</div>
            {ev.detalhe && (
              <div style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 4, lineHeight: 1.4 }}>{ev.detalhe}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
