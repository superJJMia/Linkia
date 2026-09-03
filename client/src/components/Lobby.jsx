import { useState } from 'react';

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function Lobby({ onEnter }) {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const startNew = () => {
    onEnter({ nickname: nickname.trim() || 'Participante', roomId: generateRoomCode(), isNew: true });
  };

  const joinRoom = (e) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    onEnter({ nickname: nickname.trim() || 'Participante', roomId: roomCode.trim().toUpperCase(), isNew: false });
  };

  return (
    <div className="lobby">
      <div className="lobby-logo">Linkia</div>
      <div className="lobby-card">
        <div className="field">
          <label htmlFor="nickname">Seu nome</label>
          <input
            id="nickname"
            placeholder="Como quer aparecer?"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>
        <button className="btn" onClick={startNew}>
          Iniciar nova reunião
        </button>
        <div className="divider">ou</div>
        <form onSubmit={joinRoom} className="field">
          <label htmlFor="room">Código da sala</label>
          <input
            id="room"
            placeholder="Ex: 4K3JPQ"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
          />
          <button className="btn btn-secondary" type="submit" disabled={!roomCode.trim()}>
            Entrar na reunião
          </button>
        </form>
      </div>
    </div>
  );
}
