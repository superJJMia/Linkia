import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook de chat em tempo real usando o socket já conectado da chamada.
 * @param {object} socket Instância do socket.io compartilhada pela chamada
 * @param {string} roomId Código da sala
 */
export function useChat(socket, roomId) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!socket) return;
    const onMessage = (data) => {
      setMessages((prev) => [...prev, data]);
      setUnread((prev) => (open ? prev : prev + 1));
    };
    socket.on('chat-message', onMessage);
    return () => socket.off('chat-message', onMessage);
  }, [socket, open]);

  const send = useCallback(
    (text) => {
      if (!socket || !roomId || !text.trim()) return;
      const message = text.trim();
      socket.emit('chat-message', { roomId, message });
      setMessages((prev) => [...prev, { id: 'me', message, mine: true, timestamp: Date.now() }]);
      setInput('');
    },
    [socket, roomId]
  );

  const toggleChat = useCallback(() => {
    setOpen((prev) => {
      if (!prev) setUnread(0);
      return !prev;
    });
  }, []);

  return { messages, input, setInput, send, open, unread, toggleChat };
}
