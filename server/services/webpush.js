import webpush from 'web-push';
import db from '../db.js';

let configured = false;

export function configurarWebPush() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[webpush] VAPID keys ausentes — push desabilitado até configurar .env');
    return;
  }
  webpush.setVapidDetails(
    VAPID_SUBJECT || 'mailto:exemplo@towin.app',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  configured = true;
}

export function salvarInscricao(subscription) {
  const stmt = db.prepare(
    `INSERT INTO inscricoes_push (endpoint, subscription_json) VALUES (?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET subscription_json = excluded.subscription_json`
  );
  stmt.run(subscription.endpoint, JSON.stringify(subscription));
}

export function removerInscricao(endpoint) {
  db.prepare('DELETE FROM inscricoes_push WHERE endpoint = ?').run(endpoint);
}

export async function enviarPushParaTodos(payload) {
  if (!configured) {
    console.warn('[webpush] Tentativa de envio sem VAPID configurado.');
    return { enviados: 0, erro: 'VAPID não configurado' };
  }
  const inscricoes = db.prepare('SELECT * FROM inscricoes_push').all();
  let enviados = 0;
  for (const row of inscricoes) {
    try {
      const sub = JSON.parse(row.subscription_json);
      await webpush.sendNotification(sub, JSON.stringify(payload));
      enviados++;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        removerInscricao(row.endpoint);
      } else {
        console.error('[webpush] erro ao enviar:', err.message);
      }
    }
  }
  return { enviados };
}
