const fuso = () => process.env.APP_TIMEZONE || 'America/Sao_Paulo';

/** Data e hora "de parede" no fuso do usuário (o servidor roda em UTC). */
export function agoraLocal() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const p = Object.fromEntries(partes.map((x) => [x.type, x.value]));
  const hora = Number(p.hour);
  const minuto = Number(p.minute);
  return {
    data: `${p.year}-${p.month}-${p.day}`,
    hhmm: `${p.hour}:${p.minute}`,
    minutos: hora * 60 + minuto,
  };
}

export function hojeLocal() {
  return agoraLocal().data;
}

/** "HH:MM" -> minutos desde 00:00 */
export function paraMinutos(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * O SQLite grava datetime('now') como 'YYYY-MM-DD HH:MM:SS' em UTC, sem sufixo.
 * `new Date()` desse texto interpretaria como horário local; aqui forçamos UTC.
 */
export function lerDataBanco(texto) {
  if (!texto) return new Date(NaN);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(texto)) {
    return new Date(texto.replace(' ', 'T') + 'Z');
  }
  return new Date(texto);
}
