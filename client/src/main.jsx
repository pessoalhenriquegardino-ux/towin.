import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import './index.css';

// No PWA instalado, checa por versão nova sempre que o app volta ao primeiro
// plano (o usuário reabre pelo ícone) e a cada 5min enquanto fica aberto —
// evita ficar preso numa versão antiga mostrando dados/telas desatualizadas.
const atualizarSW = registerSW({ immediate: true });

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') atualizarSW();
});

setInterval(atualizarSW, 5 * 60 * 1000);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
