import { useEffect, useState } from 'react';
import {
  MicIcon,
  MicOffIcon,
  VideoIcon,
  VideoOffIcon,
  ScreenIcon,
  HangUpIcon,
  ChatIcon,
  FullscreenIcon,
  FullscreenExitIcon,
} from '../icons.jsx';

export default function Controls({
  micOn,
  camOn,
  screenOn,
  toggleMic,
  toggleCam,
  toggleScreen,
  leave,
  unread,
  toggleChat,
  layout,
  setLayout,
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const layoutLabel =
    layout === 'grid' ? 'Grade' : layout === 'spotlight' ? 'Destaque' : 'Auto';

  const cycleLayout = () => {
    const order = ['auto', 'spotlight', 'grid'];
    const idx = order.indexOf(layout);
    setLayout(order[(idx + 1) % order.length]);
  };

  return (
    <div className="controls">
      <button
        className={`control-btn ${micOn ? 'active' : 'off'}`}
        onClick={toggleMic}
        title={micOn ? 'Desligar microfone' : 'Ligar microfone'}
      >
        {micOn ? <MicIcon /> : <MicOffIcon />}
      </button>
      <button
        className={`control-btn ${camOn ? 'active' : 'off'}`}
        onClick={toggleCam}
        title={camOn ? 'Desligar câmera' : 'Ligar câmera'}
      >
        {camOn ? <VideoIcon /> : <VideoOffIcon />}
      </button>
      <button
        className={`control-btn ${screenOn ? 'active' : ''}`}
        onClick={toggleScreen}
        title={screenOn ? 'Parar de compartilhar' : 'Compartilhar tela'}
      >
        <ScreenIcon />
      </button>
      <button
        className={`control-btn layout-toggle ${layout !== 'auto' ? 'active' : ''}`}
        onClick={cycleLayout}
        title="Alternar layout (Auto / Destaque / Grade)"
      >
        <span className="layout-label">{layoutLabel}</span>
      </button>
      <button className="control-btn" onClick={toggleChat} title="Chat">
        <ChatIcon />
        {unread > 0 && <span className="chat-badge">{unread}</span>}
      </button>
      <button
        className={`control-btn ${isFullscreen ? 'active' : ''}`}
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
      >
        {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
      </button>
      <button className="control-btn off" onClick={leave} title="Encerrar chamada">
        <HangUpIcon />
      </button>
    </div>
  );
}
