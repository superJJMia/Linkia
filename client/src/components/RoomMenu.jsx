import { useEffect, useState } from 'react';
import { CloseIcon, CopyIcon, CheckIcon, LinkIcon } from '../icons.jsx';

export default function RoomMenu({
  open,
  onClose,
  roomId,
  myNickname,
  onRename,
  participants,
  roomLink,
  layout,
  setLayout,
}) {
  const [name, setName] = useState(myNickname);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    if (open) setName(myNickname);
  }, [open, myNickname]);

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1600);
    } catch (e) {
      console.warn('Falha ao copiar', e);
    }
  };

  const saveName = () => {
    onRename(name);
  };

  const layoutOptions = [
    { key: 'auto', label: 'Auto' },
    { key: 'spotlight', label: 'Destaque' },
    { key: 'grid', label: 'Grade' },
  ];

  return (
    <>
      <div className={`room-backdrop${open ? ' open' : ''}`} onClick={onClose} />
      <aside className={`room-menu${open ? ' open' : ''}`}>
        <div className="room-header">
          <span>Menu da sala</span>
          <button onClick={onClose} title="Fechar" className="room-close">
            <CloseIcon size={20} />
          </button>
        </div>

        <section className="room-section">
          <h3 className="room-title">Sobre a sala</h3>
          <div className="room-row">
            <span className="room-key">Código</span>
            <span className="room-code">{roomId}</span>
            <button
              className="room-copy"
              onClick={() => copy(roomId, 'code')}
              title="Copiar código"
            >
              {copied === 'code' ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
            </button>
          </div>
          <div className="room-link">
            <span className="room-link-icon">
              <LinkIcon size={16} />
            </span>
            <span className="room-link-text">{roomLink}</span>
            <button
              className="room-copy"
              onClick={() => copy(roomLink, 'link')}
              title="Copiar link"
            >
              {copied === 'link' ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
            </button>
          </div>
        </section>

        <section className="room-section">
          <h3 className="room-title">Você</h3>
          <div className="room-name-row">
            <input
              className="room-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
            />
            <button
              className="room-save"
              onClick={saveName}
              disabled={!name.trim() || name.trim() === myNickname}
            >
              Salvar
            </button>
          </div>
        </section>

        <section className="room-section">
          <h3 className="room-title">Layout de vídeo</h3>
          <div className="room-seg">
            {layoutOptions.map((o) => (
              <button
                key={o.key}
                className={`room-seg-btn ${layout === o.key ? 'active' : ''}`}
                onClick={() => setLayout(o.key)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </section>

        <section className="room-section">
          <h3 className="room-title">Participantes · {participants.length + 1}</h3>
          <ul className="room-participants">
            <li className="room-participant own">
              <span className="room-dot" />
              <span className="room-p-name">{myNickname}</span>
              <span className="room-p-tag">você</span>
            </li>
            {participants.map((p) => (
              <li key={p.id} className="room-participant">
                <span className="room-dot" />
                <span className="room-p-name">{p.nickname}</span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </>
  );
}
