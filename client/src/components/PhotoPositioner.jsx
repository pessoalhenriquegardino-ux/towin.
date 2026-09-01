import { useRef, useState } from 'react';

/**
 * Preview da foto com arraste pra reposicionar o foco (objectPosition) e um
 * slider de zoom. Mostra exatamente a proporção usada no card real da meta.
 */
export default function PhotoPositioner({ fotoUrl, posX, posY, zoom, onChangePos, onChangeZoom, onTrocarFoto, altura = 190 }) {
  const boxRef = useRef(null);
  const [arrastando, setArrastando] = useState(false);

  function calcularPosicao(clientX, clientY) {
    const box = boxRef.current.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((clientX - box.left) / box.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - box.top) / box.height) * 100));
    return { x, y };
  }

  function handlePointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setArrastando(true);
    const { x, y } = calcularPosicao(e.clientX, e.clientY);
    onChangePos(x, y);
  }

  function handlePointerMove(e) {
    if (!arrastando) return;
    const { x, y } = calcularPosicao(e.clientX, e.clientY);
    onChangePos(x, y);
  }

  function handlePointerUp(e) {
    setArrastando(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  }

  return (
    <div>
      <div
        ref={boxRef}
        onPointerDown={fotoUrl ? handlePointerDown : undefined}
        onPointerMove={fotoUrl ? handlePointerMove : undefined}
        onPointerUp={fotoUrl ? handlePointerUp : undefined}
        className="panel"
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          height: altura,
          cursor: fotoUrl ? (arrastando ? 'grabbing' : 'grab') : 'pointer',
          touchAction: 'none',
        }}
        onClick={!fotoUrl ? onTrocarFoto : undefined}
      >
        {fotoUrl ? (
          <>
            <img
              src={fotoUrl}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: `${posX}% ${posY}%`,
                transform: `scale(${zoom / 100})`,
                transformOrigin: `${posX}% ${posY}%`,
                pointerEvents: 'none',
              }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.55))', pointerEvents: 'none' }} />
            <div
              style={{
                position: 'absolute',
                top: 10,
                left: 10,
                fontSize: 10.5,
                color: 'rgba(255,255,255,0.75)',
                background: 'rgba(0,0,0,0.5)',
                padding: '4px 9px',
                borderRadius: 100,
                fontFamily: 'var(--font-mono)',
                pointerEvents: 'none',
              }}
            >
              arraste pra reposicionar
            </div>
          </>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: 20 }}>
            Toque para adicionar a foto da sua meta<br />(ex: a Porsche que você quer)
          </div>
        )}
      </div>

      {fotoUrl && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>zoom</span>
          <input
            type="range"
            min={100}
            max={220}
            step={2}
            value={zoom}
            onChange={(e) => onChangeZoom(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <button type="button" className="btn btn-ghost" style={{ padding: '6px 14px' }} onClick={onTrocarFoto}>
            Trocar foto
          </button>
        </div>
      )}
    </div>
  );
}
