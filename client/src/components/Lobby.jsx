import { useState, useEffect, useRef } from 'react';

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
  const [pendingRoom, setPendingRoom] = useState(null); // código escolhido, aguardando nome
  const nameRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = (params.get('room') || '').trim().toUpperCase();
    if (room) {
      setPendingRoom(room);
      setRoomCode(room);
    }
  }, []);

  useEffect(() => {
    if (pendingRoom && nameRef.current) {
      nameRef.current.focus();
    }
  }, [pendingRoom]);

  const startNew = () => {
    onEnter({ nickname: nickname.trim() || 'Participante', roomId: generateRoomCode(), isNew: true });
  };

  const requestJoin = (e) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    setPendingRoom(roomCode.trim().toUpperCase());
  };

  const confirmJoin = (e) => {
    e.preventDefault();
    if (!pendingRoom || !nickname.trim()) return;
    onEnter({ nickname: nickname.trim(), roomId: pendingRoom, isNew: false });
  };

  return (
    <div className="lobby">
      <div className="lobby-logo animate-up">
        Li<b>nk</b>ia
      </div>
      {pendingRoom ? (
        <>
          <p className="holo-line animate-up d1">⟨ você foi convidado para uma sala ⟩</p>
          <p className="lobby-tagline animate-up d2">
            Informe seu nome para entrar na sala de chamada.
          </p>
          <form onSubmit={confirmJoin} className="lobby-card animate-scale d3">
            <div className="field">
              <label htmlFor="invite-name">Seu nome</label>
              <input
                id="invite-name"
                ref={nameRef}
                placeholder="Como quer aparecer na reunião?"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="invite-room">Código da sala</label>
              <input id="invite-room" value={pendingRoom} readOnly className="input-locked" />
            </div>
            <button className="btn" type="submit" disabled={!nickname.trim()}>
              Entrar na sala
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setPendingRoom(null)}
            >
              Voltar
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="holo-line animate-up d1">⟨ chamadas de vídeo · sala remota ⟩</p>
          <p className="lobby-tagline animate-up d2">
            Entre em uma sala para conversar por vídeo, compartilhar a tela e trocar mensagens em tempo real.
          </p>
          <div className="lobby-card animate-scale d3">
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
            <form onSubmit={requestJoin} className="field">
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
        </>
      )}
    </div>
  );
}
