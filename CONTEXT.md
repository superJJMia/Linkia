# Linkia — Contexto do Projeto

> Arquivo de contexto do projeto **Linkia**. Guarda os pontos principais de implementação,
> decisões e mudanças requeridas pelo usuário, para não precisar reler toda a conversa.

## 1. Visão Geral

Replica do Google Meet: aplicativo de **chamadas de vídeo** com **chat** e **streaming de tela** em tempo real.
Nome do site escolhido pelo usuário: **Linkia**.

## 2. Decisões Principais (aprovadas)

- **Nome do site:** Linkia
- **Stack:**
  - Frontend: **React**
  - Backend: **Node.js**
  - Vídeo/áudio/tela: **WebRTC**
  - Sinalização + chat em tempo real: **Socket.io**
  - Servidor: **Express**
- **Autenticação:** SEM login. Anônimo, entra na sala via **link/código**.
- **Diretório do projeto:** `C:\Users\MeowA\Documents\Linkia\`

## 3. Funcionalidades Planejadas

### MVP (fase 1)
- [ ] Criar/entrar em sala via código/link
- [ ] Chamada de vídeo/áudio ponto-a-ponto (WebRTC)
- [ ] Mudo / câmera liga-desliga
- [ ] Streaming de tela (captura de tela)
- [ ] Chat em tempo real (Socket.io)
- [ ] Lista de participantes
- [ ] Sair / encerrar a chamada

### Fase 2 (futura)
- [ ] Grading/espelhamento de vídeo (grid de participantes)
- [ ] Controles de layout (tela cheia, pin)
- [ ] Uso de TURN/STUN para NAT atravessar
- [ ] Melhorias de UX (nomes, avatares)

## 4. Arquitetura (proposta)

```
Linkia/
├── client/           # Frontend React (Vite)
│   └── src/
└── server/           # Backend Node (Express + Socket.io)
    └── src/
```

- **Sinalização:** Socket.io — `offer`, `answer`, `ice-candidate`, eventos de join/leave.
- **Mídia:** WebRTC — `getUserMedia` e `getDisplayMedia` no cliente, troca de SDP/ICE pelo socket.
- **Sala:** mapa em memória no servidor (sinas/participantes). Persistência futura.

## 5. Pontos de Mudança / Requests do Usuário

(registrar aqui toda mudança requerida pelo usuário durante o desenvolvimento)

---

## Log de Mudanças

| Data | Mudança |
|------|---------|
| 2026-09-02 | Nome aprovado: **Linkia** (rejeitados: Cutuca, Junta, Toca, Sala, Ponto, Liga, Roda) |
| 2026-09-02 | Stack aprovada: React + Node (Express + Socket.io) + WebRTC. Sem login (anônimo via link/código). |
| 2026-09-02 | Scaffold inicial criado: servidor (Express+Socket.io, sinalização e chat) e cliente (React+Vite). Vite servindo na porta 3001, servidor em 4000. |
| 2026-09-02 | `start.cmd` criado na raiz para iniciar servidor e cliente de uma vez. |
| 2026-09-02 | Visual repaginado inspirado em https://super-mia-chi.vercel.app/ (estilo futurista-tech, tema escuro, tipografia Orbitron/Rajdhani/Share Tech Mono, clip-path angular, scanlines, starfield, glow ciano). Correção de responsividade: `.call` com `height:100vh` + `overflow:hidden`, controles sempre fixos sem sumir, chat vira painel flutuante no mobile. |
| 2026-09-02 | Animacões adicionadas: transições de tela (fade/up/scale), entrada em cascata de tiles/controles/mensagens, chat com slide lateral + backdrop, hover com shimmer nos botões, logo flutuando com glow pulse, botão de encerrar com pulse de perigo, micro-interações de clique. |
| 2026-09-02 | Destaque visual para quem está falando: hook `useSpeaking` (Web Audio AnalyserNode, limiar RMS + hold), evento `speaking`/`peer-speaking` no servidor para sincronizar entre participantes, `speakingPeers` no useCall. Tile do falante ganha borda/glow ciano pulsante + badge "Ao vivo". Também corrigido bug de tela em branco por troca de `localStream` de ref->estado. |
| 2026-09-02 | Layout estilo Google Meet: ao compartilhar tela, a tela vai para painel grande em destaque no centro e a camera propria + demais participantes ficam em coluna lateral. Compartilhamento virou STREAM separado (addTrack + renegociacao), nao mais replaceTrack. Socket events screen-state/peer-screen + seletor de layout (Auto/Destaque/Grade). |

## Estado Atual da Implementação

- **Feito:** lobby (nome + criar/entrar com código), conexão Socket.io, sinalização WebRTC ponto-a-ponto (offer/answer/ICE), vídeo/áudio via getUserMedia, toggles de mudo e câmera, chat em tempo real, grid de vídeos, lista de participantes no servidor.
- **Em andamento / pendente de validação no browser:** streaming de tela agora como stream separado (getDisplayMedia + addTrack + renegociação) com layout estilo Meet (tela em destaque + coluna lateral). Precisa de teste real com 2 abas/navegadores, pois exige HTTPS ou localhost.
- **Nota:** para vídeo entre 2 máquinas pela internet falta adicionar servidor TURN (não incluído ainda).

---

## 6. Notas Técnicas do Ambiente

- OS: Windows (win32) / PowerShell 5.1
- Node.js em `C:\Program Files\nodejs` (não está no PATH)
- PowerShell bloqueia `.ps1` → usar `.cmd` ou chamar `node.exe` diretamente
- Rodar comandos npm:
  ```powershell
  $env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & "C:\Program Files\nodejs\npm.cmd" install
  ```
- Rodar dev server:
  ```powershell
  $env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & "C:\Program Files\nodejs\node.exe" node_modules\vite\bin\vite.js --port 3001
  ```
- Git user: MeowA / meow@ahmiau.com ; GitHub: superJJMia (renomeado de jordan23Reis)
