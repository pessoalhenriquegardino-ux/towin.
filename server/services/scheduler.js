import cron from 'node-cron';
import db from '../db.js';
import { escolherAlvoUrgente, montarContextoTexto } from './contexto.js';
import { gerarNotificacao } from './claude.js';
import { enviarPushParaTodos } from './webpush.js';

const TIPOS = ['provocacao', 'pergunta', 'citacao'];

function dentroDaJanelaDeSilencio(config) {
  const agora = new Date();
  const hhmm = agora.toTimeString().slice(0, 5);
  const { janela_silencio_inicio: inicio, janela_silencio_fim: fim } = config;
  if (inicio === fim) return false;
  if (inicio < fim) {
    return hhmm >= inicio && hhmm < fim;
  }
  // janela cruza a meia-noite (ex: 22:00 - 07:00)
  return hhmm >= inicio || hhmm < fim;
}

export async function dispararNotificacaoAutomatica() {
  const config = db.prepare('SELECT * FROM configuracao WHERE id = 1').get();
  if (dentroDaJanelaDeSilencio(config)) {
    console.log('[scheduler] dentro da janela de silêncio, pulando.');
    return;
  }

  const alvo = escolherAlvoUrgente();
  if (!alvo) {
    console.log('[scheduler] nada cadastrado ainda, pulando.');
    return;
  }

  const tipo = alvo.tipo === 'vicio' && alvo.bateuMarcoHoje ? 'marco' : TIPOS[Math.floor(Math.random() * TIPOS.length)];
  const contexto = montarContextoTexto(alvo);

  try {
    const conteudo = await gerarNotificacao({ tipo, contexto });

    db.prepare(
      `INSERT INTO notificacoes (tipo, conteudo_gerado, meta_id, vicio_id) VALUES (?, ?, ?, ?)`
    ).run(
      tipo,
      conteudo,
      alvo.tipo === 'meta' ? alvo.item.id : null,
      alvo.tipo === 'vicio' ? alvo.item.id : null
    );

    if (alvo.tipo === 'vicio' && alvo.bateuMarcoHoje) {
      db.prepare(
        `INSERT INTO marcos_atingidos (vicio_id, dias, mensagem_recebida) VALUES (?, ?, ?)`
      ).run(alvo.item.id, alvo.diasLimpo, conteudo);
    }

    await enviarPushParaTodos({
      title: 'To Win',
      body: conteudo,
      tag: tipo,
    });

    console.log(`[scheduler] notificação enviada (${tipo}): ${conteudo}`);
  } catch (err) {
    console.error('[scheduler] erro ao gerar/enviar notificação:', err.message);
  }
}

export function iniciarAgendador() {
  // Roda a cada hora e decide internamente, com base nos horários configurados,
  // se deve disparar. Simples e robusto a mudanças de configuração sem reiniciar.
  cron.schedule('*/30 * * * *', async () => {
    const config = db.prepare('SELECT * FROM configuracao WHERE id = 1').get();
    const horarios = JSON.parse(config.horarios || '[]');
    const agora = new Date();
    const hhmm = agora.toTimeString().slice(0, 5);

    const deveDisparar = horarios.some((h) => {
      const [hh, mm] = h.split(':').map(Number);
      const alvoMin = hh * 60 + mm;
      const agoraMin = agora.getHours() * 60 + agora.getMinutes();
      return Math.abs(agoraMin - alvoMin) <= 15; // tolerância da checagem de 30min
    });

    if (deveDisparar) {
      await dispararNotificacaoAutomatica();
    }
  });

  console.log('[scheduler] agendador iniciado (verificação a cada 30min).');
}
