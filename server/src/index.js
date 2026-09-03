import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

const PORT = process.env.PORT || 4000;

/**
 * Estrutura da sala:
 * rooms: Map<roomId, Map<socketId, { nickname }>>
 */
const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }
  return rooms.get(roomId);
}

function joinRoom(socket, { roomId, nickname }) {
  const room = getRoom(roomId);
  const clean = (nickname || '').trim() || 'Participante';
  room.set(socket.id, { nickname: clean });
  socket.join(roomId);
  socket.data.roomId = roomId;
  socket.data.nickname = clean;

  // Avisa os demais participantes da sala que alguém entrou
  const participants = [...room.entries()].map(([id, data]) => ({ id, nickname: data.nickname }));
  socket.to(roomId).emit('user-joined', { id: socket.id, nickname });

  // Envia a lista atual de participantes para o recém-chegado
  socket.emit('room-participants', { participants });
}

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('join-room', (payload) => {
    joinRoom(socket, payload);
  });

  socket.on('leave-room', () => {
    const { roomId } = socket.data;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room) {
      room.delete(socket.id);
      socket.to(roomId).emit('user-left', { id: socket.id });
      if (room.size === 0) rooms.delete(roomId);
    }
    socket.leave(roomId);
  });

  socket.on('disconnect', () => {
    const { roomId } = socket.data;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room) {
      room.delete(socket.id);
      socket.to(roomId).emit('user-left', { id: socket.id });
      if (room.size === 0) rooms.delete(roomId);
    }
  });

  // Sinalização WebRTC
  socket.on('webrtc-offer', ({ to, offer }) => {
    socket.to(to).emit('webrtc-offer', { from: socket.id, offer });
  });
  socket.on('webrtc-answer', ({ to, answer }) => {
    socket.to(to).emit('webrtc-answer', { from: socket.id, answer });
  });
  socket.on('webrtc-ice-candidate', ({ to, candidate }) => {
    socket.to(to).emit('webrtc-ice-candidate', { from: socket.id, candidate });
  });

  // Chat
  socket.on('chat-message', ({ roomId, message }) => {
    socket.to(roomId).emit('chat-message', {
      id: socket.id,
      nickname: socket.data.nickname || 'Anônimo',
      message,
      timestamp: Date.now(),
    });
  });

  // Estado de fala (sinaliza aos demais quem está falando)
  socket.on('speaking', ({ roomId, speaking }) => {
    socket.to(roomId).emit('peer-speaking', { id: socket.id, speaking });
  });

  // Estado do compartilhamento de tela
  socket.on('screen-state', ({ roomId, streaming }) => {
    socket.to(roomId).emit('peer-screen', { id: socket.id, streaming });
  });

  // Atualização de apelido no meio da chamada
  socket.on('update-nickname', ({ roomId, nickname }) => {
    const clean = (nickname || '').trim() || 'Participante';
    socket.data.nickname = clean;
    const room = rooms.get(roomId);
    if (room && room.has(socket.id)) {
      room.set(socket.id, { nickname: clean });
    }
    socket.to(roomId).emit('peer-nickname', { id: socket.id, nickname: clean });
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

httpServer.listen(PORT, () => {
  console.log(`Linkia server rodando em http://localhost:${PORT}`);
});
