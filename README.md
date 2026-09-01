# To Win

App pessoal (uso individual) de metas, sobriedade e propósito. PWA em tema preto/dourado,
com um "Coach" movido a IA (Claude) que confronta em vez de animar.

## Estrutura

```
ToWin/
  server/   → API Node/Express + banco SQLite (node:sqlite, sem dependências nativas) + Web Push + Claude
  client/   → PWA React + Vite (tema preto)
```

## 1. Configurar o servidor

```bash
cd ToWin/server
npm install          # já rodado
npm run generate-vapid   # já rodado — chaves estão em .env
```

Abra `ToWin/server/.env` e preencha:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Sem essa chave, o app funciona (CRUD de metas/vícios, contador, timeline), mas o Coach
(chat, notificações geradas por IA, frase do dia) não vai responder.

Rodar o servidor:

```bash
npm run dev
```

Sobe em `http://localhost:8787`.

## 2. Rodar o cliente

```bash
cd ToWin/client
npm install    # já rodado
npm run dev
```

Sobe em `http://localhost:5173`, já com proxy de `/api` para o servidor.

## 3. Testar Web Push

1. Abra o app no navegador (Chrome/Edge — em `localhost` o HTTPS não é exigido).
2. Vá em **Ajustes** → **Ativar notificações** → aceite a permissão do navegador.
3. Clique em **Enviar notificação de teste** — dispara uma notificação real via Web Push,
   gerada pelo Claude a partir da sua meta/vício mais urgente no momento.
4. Pode fechar a aba: o Service Worker recebe o push mesmo assim.

O agendador automático (`server/services/scheduler.js`) roda a cada 30 minutos e dispara
notificações reais nos horários configurados em Ajustes, respeitando a janela de silêncio.

## 4. Build de produção do PWA

```bash
cd ToWin/client
npm run build
npm run preview   # serve o build em localhost para testar "instalar app"
```

Para instalar de verdade no celular como PWA (ícone na tela, push com app fechado),
o site precisa estar em HTTPS público — pode publicar `client/dist` em qualquer host
estático (Vercel, Netlify, etc.) apontando as chamadas `/api` para o `server` publicado
(Railway, Fly.io, um VPS, etc.). Nenhuma mudança de código é necessária além da URL da API.

## O que já funciona (MVP completo, passos 1–8 do plano original)

1. ✅ Setup PWA (manifest, service worker, ícones)
2. ✅ Modelo de dados completo em SQLite (metas, vícios, recaídas, marcos, notificações,
   reflexões, configuração)
3. ✅ CRUD de Metas e Vícios (com foto em base64, "porquê" obrigatório)
4. ✅ Painel principal com contador de sobriedade em tempo real (JS puro, 1x/segundo)
5. ✅ Integração com Claude para gerar notificações e a "frase do dia"
6. ✅ Web Push funcional (VAPID configurado, funciona com navegador fechado)
7. ✅ Chat com o Coach usando o system prompt de confronto construtivo
8. ✅ Linha do tempo / histórico de evolução

## Próximos ajustes possíveis (não bloqueantes)

- Trocar SQLite por Postgres/Supabase se quiser acessar de vários dispositivos.
- Adicionar autenticação simples se for expor o servidor publicamente (hoje é single-user,
  sem login, como pedido).
- Melhorar os ícones do manifest (hoje são gerados programaticamente, bem simples).
