import {
  MicIcon,
  MicOffIcon,
  VideoIcon,
  VideoOffIcon,
  ScreenIcon,
  HangUpIcon,
  ChatIcon,
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
}) {
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
      <button className="control-btn" onClick={toggleChat} title="Chat">
        <ChatIcon />
        {unread > 0 && <span className="chat-badge">{unread}</span>}
      </button>
      <button className="control-btn off" onClick={leave} title="Encerrar chamada">
        <HangUpIcon />
      </button>
    </div>
  );
}
