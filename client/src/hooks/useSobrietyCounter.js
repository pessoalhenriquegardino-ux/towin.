import { useEffect, useState } from 'react';

function calcular(dataInicioIso) {
  const inicio = new Date(dataInicioIso).getTime();
  const agora = Date.now();
  let diff = Math.max(0, agora - inicio);

  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  diff -= dias * 1000 * 60 * 60 * 24;
  const horas = Math.floor(diff / (1000 * 60 * 60));
  diff -= horas * 1000 * 60 * 60;
  const minutos = Math.floor(diff / (1000 * 60));
  diff -= minutos * 1000 * 60;
  const segundos = Math.floor(diff / 1000);

  return { dias, horas, minutos, segundos };
}

/** Contador ao vivo de tempo limpo, atualizado a cada segundo, em JS puro. */
export function useSobrietyCounter(dataInicioIso) {
  const [tempo, setTempo] = useState(() => calcular(dataInicioIso));

  useEffect(() => {
    setTempo(calcular(dataInicioIso));
    const id = setInterval(() => {
      setTempo(calcular(dataInicioIso));
    }, 1000);
    return () => clearInterval(id);
  }, [dataInicioIso]);

  return tempo;
}
