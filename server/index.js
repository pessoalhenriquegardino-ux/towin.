// Entrada do servidor.
// - Na Vercel: só exporta o `app` (a plataforma cuida de escutar requisições; o
//   agendamento das notificações vem de um cron externo chamando /api/cron/notificar).
// - Local / qualquer host com processo sempre ligado: sobe o servidor, serve o PWA
//   (se já houver build) e roda o agendador interno.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import dotenv from 'dotenv';
import express from 'express';

import app from './app.js';
import { configurarWebPush } from './services/webpush.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

configurarWebPush();

async function iniciarLocal() {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  if (existsSync(clientDist)) {
    app.use(
      express.static(clientDist, {
        setHeaders: (res, filePath) => {
          // index.html, manifest e service worker sempre revalidados, senão o PWA
          // instalado fica preso numa versão antiga.
          if (/(index\.html|sw\.js|manifest\.webmanifest)$/.test(filePath)) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      })
    );
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  const { processarCicloAgendado } = await import('./services/scheduler.js');
  const { default: cron } = await import('node-cron');
  cron.schedule('*/10 * * * *', () => {
    processarCicloAgendado().catch((err) => console.error('[scheduler]', err.message));
  });

  const PORT = process.env.PORT || 8787;
  app.listen(PORT, () => {
    console.log(`\n  To Win — servidor rodando em http://localhost:${PORT}\n`);
  });
}

if (!process.env.VERCEL) iniciarLocal();

export default app;
