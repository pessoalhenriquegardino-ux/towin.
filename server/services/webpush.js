import webpush from 'web-push';
import db from '../db.js';

let configured = false;

export function configurarWebPush() {
  if (configured) return;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[webpush] VAPID keys ausentes — push desabilitado até configurar o ambiente');
    return;
  }
  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:exemplo@towin.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
}

export async function salvarInscricao(subscription) {
  await db.run(
    `INSERT INTO inscricoes_push (endpoint, subscription_json) VALUES (?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET subscription_json = excluded.subscription_json`,
    [subscription.endpoint, JSON.stringify(subscription)]
  );
}

export async function removerInscricao(endpoint) {
  await db.run('DELETE FROM inscricoes_push WHERE endpoint = ?', [endpoint]);
}

export async function enviarPushParaTodos(payload) {
  configurarWebPush();
  if (!configured) {
    console.warn('[webpush] Tentativa de envio sem VAPID configurado.');
    return { enviados: 0, erro: 'VAPID não configurado' };
  }
  const inscricoes = await db.all('SELECT * FROM inscricoes_push');
  let enviados = 0;
  for (const row of inscricoes) {
    try {
      await webpush.sendNotification(JSON.parse(row.subscription_json), JSON.stringify(payload));
      enviados++;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await removerInscricao(row.endpoint);
      } else {
        console.error('[webpush] erro ao enviar:', err.message);
      }
    }
  }
  return { enviados };
}
