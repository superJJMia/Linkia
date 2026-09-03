import { useEffect, useRef } from 'react';
import { CloseIcon } from '../icons.jsx';

export default function ChatPanel({ messages, input, setInput, send, open, toggleChat, myKey, mine }) {
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const submit = (e) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div className="chat-panel" style={{ display: open ? 'flex' : 'none' }}>
      <div className="chat-header">
        <span>Chat</span>
        <button onClick={toggleChat} title="Fechar">
          <CloseIcon size={18} />
        </button>
      </div>
      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 && (
          <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: 20 }}>
            Nenhuma mensagem ainda.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.mine ? 'own' : ''}`}>
            <div className="msg-meta">
              <strong>{m.mine ? 'Você' : m.nickname || 'Anônimo'}</strong>
            </div>
            <div className="msg-body">{m.message}</div>
          </div>
        ))}
      </div>
      <form className="chat-input" onSubmit={submit}>
        <input
          placeholder="Enviar mensagem..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn" type="submit" disabled={!input.trim()}>
          Enviar
        </button>
      </form>
    </div>
  );
}
