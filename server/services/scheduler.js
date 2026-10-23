import db from '../db.js';
import { escolherAlvoUrgente, montarContextoTexto } from './contexto.js';
import { gerarNotificacao } from './claude.js';
import { enviarPushParaTodos } from './webpush.js';
import { agoraLocal, paraMinutos } from './tempo.js';

const TIPOS = ['provocacao', 'pergunta', 'citacao'];
// Se o cron externo atrasar, ainda dispara o horário até este limite (em minutos).
const TOLERANCIA_ATRASO_MIN = 90;

function dentroDaJanelaDeSilencio(config, minutosAgora) {
  const inicio = paraMinutos(config.janela_silencio_inicio);
  const fim = paraMinutos(config.janela_silencio_fim);
  if (inicio === fim) return false;
  if (inicio < fim) return minutosAgora >= inicio && minutosAgora < fim;
  // janela cruza a meia-noite (ex: 22:00 - 07:00)
  return minutosAgora >= inicio || minutosAgora < fim;
}

/** Gera uma notificação com a IA a partir do alvo mais urgente e envia por push. */
export async function dispararNotificacaoAutomatica({ ignorarSilencio = false } = {}) {
  const config = await db.get('SELECT * FROM configuracao WHERE id = 1');
  if (!ignorarSilencio && dentroDaJanelaDeSilencio(config, agoraLocal().minutos)) {
    return { pulado: 'janela de silêncio' };
  }

  const alvo = await escolherAlvoUrgente();
  if (!alvo) return { pulado: 'nada cadastrado ainda' };

  const tipo =
    alvo.tipo === 'vicio' && alvo.bateuMarcoHoje ? 'marco' : TIPOS[Math.floor(Math.random() * TIPOS.length)];
  const contexto = montarContextoTexto(alvo);

  try {
    const conteudo = await gerarNotificacao({ tipo, contexto });

    await db.run(`INSERT INTO notificacoes (tipo, conteudo_gerado, meta_id, vicio_id) VALUES (?, ?, ?, ?)`, [
      tipo,
      conteudo,
      alvo.tipo === 'meta' ? alvo.item.id : null,
      alvo.tipo === 'vicio' ? alvo.item.id : null,
    ]);

    if (alvo.tipo === 'vicio' && alvo.bateuMarcoHoje) {
      const jaRegistrado = await db.get('SELECT id FROM marcos_atingidos WHERE vicio_id = ? AND dias = ?', [
        alvo.item.id,
        alvo.diasLimpo,
      ]);
      if (!jaRegistrado) {
        await db.run('INSERT INTO marcos_atingidos (vicio_id, dias, mensagem_recebida) VALUES (?, ?, ?)', [
          alvo.item.id,
          alvo.diasLimpo,
          conteudo,
        ]);
      }
    }

    const envio = await enviarPushParaTodos({ title: 'To Win', body: conteudo, tag: tipo });
    console.log(`[scheduler] notificação (${tipo}): ${conteudo}`);
    return { enviada: true, tipo, conteudo, ...envio };
  } catch (err) {
    console.error('[scheduler] erro ao gerar/enviar notificação:', err.message);
    return { erro: err.message };
  }
}

/**
 * Chamado periodicamente por um cron (GitHub Actions / Vercel Cron / node-cron local).
 * Dispara cada horário configurado no máximo UMA vez por dia, mesmo se o cron atrasar,
 * falhar ou rodar duas vezes seguidas.
 */
export async function processarCicloAgendado() {
  const config = await db.get('SELECT * FROM configuracao WHERE id = 1');
  const horarios = JSON.parse(config.horarios || '[]');
  const { data, hhmm, minutos } = agoraLocal();
  const disparados = [];

  for (const horario of horarios) {
    const atraso = minutos - paraMinutos(horario);
    if (atraso < 0 || atraso > TOLERANCIA_ATRASO_MIN) continue;

    const slot = `${data} ${horario}`;
    // INSERT OR IGNORE + changes garante que só uma execução "ganha" o horário.
    const reserva = await db.run('INSERT OR IGNORE INTO disparos (slot) VALUES (?)', [slot]);
    if (reserva.changes === 0) continue;

    disparados.push({ slot, ...(await dispararNotificacaoAutomatica()) });
  }

  return { agora: `${data} ${hhmm}`, horarios, disparados };
}
