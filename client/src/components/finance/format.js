export const moeda = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Data de hoje no horário do aparelho, em YYYY-MM-DD. */
export function hojeISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export const mesAtual = () => hojeISO().slice(0, 7);

export function addMes(mes, delta) {
  const [a, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export function nomeMes(mes, curto = false) {
  const [a, m] = mes.split('-').map(Number);
  const nome = new Date(Date.UTC(a, m - 1, 1)).toLocaleDateString('pt-BR', {
    month: curto ? 'short' : 'long',
    timeZone: 'UTC',
  });
  return curto ? nome.replace('.', '') : `${nome} de ${a}`;
}

export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const dataCurta = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : '');

export function diasAte(data, hoje = hojeISO()) {
  const t = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  return Math.round((t(data) - t(hoje)) / 86400000);
}

export function rotuloVencimento(data, pago, hoje = hojeISO()) {
  if (pago) return { texto: `pago ${dataCurta(pago)}`, atrasado: false };
  const d = diasAte(data, hoje);
  if (d < 0) return { texto: `atrasado ${-d}d`, atrasado: true };
  if (d === 0) return { texto: 'vence hoje', atrasado: false, alerta: true };
  if (d === 1) return { texto: 'vence amanhã', atrasado: false, alerta: true };
  return { texto: dataCurta(data), atrasado: false };
}

const PASSO = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };
export const PERIODICIDADES = [
  ['mensal', 'Mensal'],
  ['trimestral', 'Trimestral'],
  ['semestral', 'Semestral'],
  ['anual', 'Anual'],
];

/** Próxima data de cobrança de uma assinatura/conta fixa (a partir de hoje). */
export function proximaCobranca(rec, hoje = hojeISO()) {
  const passo = PASSO[rec.periodicidade] || 1;
  const inicio = rec.data_inicio.slice(0, 7);
  const mesHoje = hoje.slice(0, 7);
  for (let i = 0; i <= 24; i++) {
    const mes = addMes(mesHoje, i);
    const [a1, m1] = inicio.split('-').map(Number);
    const [a2, m2] = mes.split('-').map(Number);
    const diff = (a2 - a1) * 12 + (m2 - m1);
    if (diff < 0 || diff % passo !== 0) continue;
    const [ano, mm] = mes.split('-').map(Number);
    const ultimo = new Date(Date.UTC(ano, mm, 0)).getUTCDate();
    const data = `${mes}-${String(Math.min(rec.dia_cobranca, ultimo)).padStart(2, '0')}`;
    if (data >= hoje && data >= rec.data_inicio) return data;
  }
  return null;
}

/** Aceita "1.234,56", "1234,56" ou "1234.56". */
export function lerValor(texto) {
  const t = String(texto ?? '').trim();
  if (!t) return NaN;
  if (t.includes(',')) return Number(t.replace(/\./g, '').replace(',', '.'));
  return Number(t);
}
