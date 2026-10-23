import db from '../db.js';
import { lerDataBanco } from './tempo.js';

const MS_DIA = 1000 * 60 * 60 * 24;

function diasEntre(dataTexto) {
  return (Date.now() - lerDataBanco(dataTexto).getTime()) / MS_DIA;
}

/**
 * Escolhe o alvo mais "urgente" agora: meta parada há mais tempo ou perto do prazo,
 * ou vício batendo um marco hoje, ou vício em geral (mantém a chama acesa).
 * Retorna { tipo: 'meta'|'vicio', item, ... } ou null.
 */
export async function escolherAlvoUrgente() {
  const [metas, vicios] = await Promise.all([
    db.all(`SELECT * FROM metas WHERE status = 'ativa'`),
    db.all(`SELECT * FROM vicios WHERE status = 'ativo'`),
  ]);

  const candidatos = [];

  for (const m of metas) {
    const diasParado = diasEntre(m.ultima_atualizacao);
    let diasParaPrazo = Infinity;
    if (m.prazo) {
      diasParaPrazo = (new Date(m.prazo).getTime() - Date.now()) / MS_DIA;
    }
    // Score: mais parado e mais perto do prazo = mais urgente
    let score = diasParado * 2;
    if (diasParaPrazo < 30 && diasParaPrazo > 0) score += 30 - diasParaPrazo;
    if (diasParaPrazo <= 0) score += 50; // prazo estourado
    candidatos.push({ tipo: 'meta', item: m, score, diasParado, diasParaPrazo });
  }

  for (const v of vicios) {
    const marcosAlvo = JSON.parse(v.marcos_alvo || '[]');
    const diasLimpo = Math.floor(diasEntre(v.data_inicio_sobriedade));
    const bateuMarcoHoje = marcosAlvo.includes(diasLimpo);
    const score = bateuMarcoHoje ? 100 : 10; // marco tem prioridade máxima
    candidatos.push({ tipo: 'vicio', item: v, score, diasLimpo, bateuMarcoHoje });
  }

  if (candidatos.length === 0) return null;
  candidatos.sort((a, b) => b.score - a.score);
  return candidatos[0];
}

export function montarContextoTexto(alvo) {
  if (!alvo) return 'O usuário ainda não cadastrou metas nem vícios.';

  if (alvo.tipo === 'meta') {
    const m = alvo.item;
    return `Meta: "${m.titulo}"
Categoria: ${m.categoria || 'não definida'}
Porquê (motivo original do usuário): "${m.porque}"
Progresso atual: ${m.progresso}%
Dias sem atualização: ${Math.floor(alvo.diasParado)}
Prazo: ${m.prazo ? `${m.prazo} (${Math.floor(alvo.diasParaPrazo)} dias restantes)` : 'sem prazo definido'}`;
  }

  const v = alvo.item;
  return `Vício/hábito a abandonar: "${v.nome}"
Motivo principal do usuário para largar: "${v.motivo_principal}"
Dias limpo atualmente: ${alvo.diasLimpo}
${alvo.bateuMarcoHoje ? `HOJE é um marco: ${alvo.diasLimpo} dias! Celebre isso.` : ''}`;
}

export async function montarContextoGeralParaChat() {
  const [metas, vicios] = await Promise.all([
    db.all(`SELECT * FROM metas WHERE status = 'ativa'`),
    db.all(`SELECT * FROM vicios WHERE status = 'ativo'`),
  ]);

  const linhasMetas = metas.map((m) => {
    const diasParado = Math.floor(diasEntre(m.ultima_atualizacao));
    return `- "${m.titulo}" (${m.categoria || 's/categoria'}), porquê: "${m.porque}", progresso ${m.progresso}%, parada há ${diasParado} dia(s), prazo: ${m.prazo || 'sem prazo'}`;
  });

  const linhasVicios = vicios.map((v) => {
    const diasLimpo = Math.floor(diasEntre(v.data_inicio_sobriedade));
    return `- "${v.nome}", motivo: "${v.motivo_principal}", ${diasLimpo} dia(s) limpo`;
  });

  return `METAS ATIVAS:
${linhasMetas.join('\n') || 'nenhuma'}

VÍCIOS EM ACOMPANHAMENTO:
${linhasVicios.join('\n') || 'nenhum'}`;
}
