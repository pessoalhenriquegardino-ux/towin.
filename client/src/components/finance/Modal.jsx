import { useEffect } from 'react';

export default function Modal({ titulo, onFechar, children }) {
  useEffect(() => {
    const aoTeclar = (e) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', aoTeclar);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = anterior;
    };
  }, [onFechar]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="modal" role="dialog" aria-label={titulo}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{titulo}</h2>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 22, lineHeight: 1, padding: 4 }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Par de botões "pílula" para alternar entre opções (tipo, perfil...). */
export function Alternador({ valor, opcoes, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {opcoes.map(([v, rotulo]) => (
        <button
          key={v}
          type="button"
          className={valor === v ? 'pill pill-accent' : 'pill'}
          style={{ cursor: 'pointer' }}
          onClick={() => onChange(v)}
        >
          {rotulo}
        </button>
      ))}
    </div>
  );
}
