import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSobrietyCounter } from '../hooks/useSobrietyCounter.js';

function pad(n) {
  return String(n).padStart(2, '0');
}

export default function AddictionCard({ vicio, onRecaida }) {
  const navigate = useNavigate();
  const { dias, horas, minutos, segundos } = useSobrietyCounter(vicio.data_inicio_sobriedade);
  const [confirmando, setConfirmando] = useState(false);
  const [nota, setNota] = useState('');

  const proximoMarco = (vicio.marcos_alvo || []).find((m) => m > dias);

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <strong style={{ fontSize: 16 }}>{vicio.nome}</strong>
        <button
          className="btn-ghost"
          style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--text-faint)', padding: 0 }}
          onClick={() => navigate(`/vicios/${vicio.id}/editar`)}
        >
          editar
        </button>
      </div>
      <p style={{ margin: '4px 0 14px', fontSize: 13, color: 'var(--text-dim)' }}>{vicio.motivo_principal}</p>

      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'clamp(28px, 8vw, 38px)',
          fontWeight: 500,
          letterSpacing: '-0.01em',
          color: 'var(--text)',
          lineHeight: 1,
        }}
      >
        {dias}d {pad(horas)}:{pad(minutos)}:{pad(segundos)}
      </div>
      {proximoMarco && (
        <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
          próximo marco: {proximoMarco}d · faltam {proximoMarco - dias}
        </div>
      )}

      {vicio.recaidas && vicio.recaidas.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 6 }}>
          {vicio.recaidas.length} recaída(s) no histórico — dado, não sentença.
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        {!confirmando ? (
          <button className="btn btn-danger" onClick={() => setConfirmando(true)}>
            Registrar recaída
          </button>
        ) : (
          <div>
            <textarea
              placeholder="O que aconteceu? (opcional, fica no seu histórico)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={2}
              style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', marginBottom: 10 }}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn btn-danger"
                onClick={() => {
                  onRecaida(vicio, nota);
                  setConfirmando(false);
                  setNota('');
                }}
              >
                Confirmar e reiniciar contador
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirmando(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
