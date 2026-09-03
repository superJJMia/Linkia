# Deploy do Linkia

O Linkia tem **duas partes**, deployadas em lugares diferentes:

- **Client** (React + Vite) → Vercel (estático)
- **Server** (Express + Socket.io) → serviço que mantém WebSocket (ex: Render, Railway, Fly.io)

> O Vercel é serverless e **não** mantém conexões WebSocket/signaling persistente. O backend precisa de um host com WebSocket de longa duração.

## 1. Backend (Express + Socket.io)

Deploy no Render (ou similar). No repo, o servidor está em `server/` e lê `process.env.PORT` (padrão 4000).

Exemplo Render:
- **Root Directory:** `server`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

Anote a URL pública gerada (ex: `https://linkia-server.onrender.com`).

## 2. Frontend (Vercel)

- **Root Directory:** `client`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

Defina a variável de ambiente:

```
VITE_SOCKET_URL=https://SEU-SERVIDOR.onrender.com
```

Sem essa variável, o client tenta a mesma origem (`/`) — útil apenas em dev local via proxy do Vite.

## 3. Convites

Os convites usam query string (`?room=CODIGO`) e funcionam em qualquer sub-rota do domínio, sem config extra de rotas.

## Desenvolvimento local

```bash
cd client
VITE_SOCKET_URL= npm run dev   # usa / (proxy para :4000)
```

```bash
cd server
npm run dev
```
