import { useEffect, useState } from 'react';

const QUERY = '(orientation: landscape) and (max-height: 520px)';

/**
 * Detecta automaticamente quando o celular está deitado (paisagem, tela baixa) —
 * o cenário típico de "deitar o celular pra acompanhar o tempo de longe".
 * Também expõe um toggle manual, caso o navegador/dispositivo não dispare a media query.
 */
export function useLandscapeFocus() {
  const [autoDeitado, setAutoDeitado] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches
  );
  const [forcado, setForcado] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const handler = (e) => setAutoDeitado(e.matches);
    mql.addEventListener ? mql.addEventListener('change', handler) : mql.addListener(handler);
    return () => {
      mql.removeEventListener ? mql.removeEventListener('change', handler) : mql.removeListener(handler);
    };
  }, []);

  return {
    deitado: autoDeitado || forcado,
    alternarForcado: () => setForcado((f) => !f),
  };
}
