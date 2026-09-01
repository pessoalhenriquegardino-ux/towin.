import { api } from './api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function ativarNotificacoesPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Este navegador não suporta notificações push.');
  }

  const permissao = await Notification.requestPermission();
  if (permissao !== 'granted') {
    throw new Error('Permissão de notificação negada.');
  }

  const { publicKey } = await api.obterChavePublicaVapid();
  if (!publicKey) {
    throw new Error('Servidor sem VAPID configurado (rode npm run generate-vapid no servidor).');
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await api.inscreverPush(subscription);
  return subscription;
}

export async function statusPermissaoNotificacao() {
  if (!('Notification' in window)) return 'indisponivel';
  return Notification.permission;
}
