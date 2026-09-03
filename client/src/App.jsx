import { useState, useEffect, useRef, useMemo } from 'react';
import { useCall } from './hooks/useCall.js';
import { useChat } from './hooks/useChat.js';
import { useSpeaking } from './hooks/useSpeaking.js';
import Lobby from './components/Lobby.jsx';
import VideoGrid from './components/VideoGrid.jsx';
import Controls from './components/Controls.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import RoomMenu from './components/RoomMenu.jsx';
import { SettingsIcon } from './icons.jsx';

function Starfield() {
  const ref = useRef(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv.getContext('2d');
    let w, h, stars = [];

    const resize = () => {
      w = cv.width = window.innerWidth;
      h = cv.height = window.innerHeight;
      stars = Array.from({ length: 180 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.4 + 0.2,
        s: Math.random() * 1.2 + 0.2,
        t: Math.random() * Math.PI * 2,
        c: Math.random() < 0.14 ? '#2ee6ff' : '#ffffff',
      }));
    };

    const loop = () => {
      ctx.fillStyle = '#04060c';
      ctx.fillRect(0, 0, w, h);
      for (const s of stars) {
        s.t += 0.04;
        s.y += s.s;
        if (s.y > h) {
          s.y = -2;
          s.x = Math.random() * w;
        }
        ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(s.t));
        ctx.fillStyle = s.c;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 7);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(loop);
    };

    window.addEventListener('resize', resize);
    resize();
    loop();
    return () => window.removeEventListener('resize', resize);
  }, []);

  return <canvas ref={ref} className="app-bg" />;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [layout, setLayout] = useState('auto');
  const [menuOpen, setMenuOpen] = useState(false);

  const roomLink = useMemo(() => {
    if (!roomId) return '';
    const base = window.location.origin + window.location.pathname;
    return `${base}?room=${roomId}`;
  }, [roomId]);

  const call = useCall(roomId);
  const chat = useChat(call.socket, roomId);

  const localSpeaking = useSpeaking(call.localStream, 120);
  useEffect(() => {
    if (call.micOn && session) {
      call.broadcastSpeaking(localSpeaking);
    } else if (localSpeaking) {
      call.broadcastSpeaking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSpeaking, call.micOn, session]);

  useEffect(() => {
    if (session) {
      call.setNickname(session.nickname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleEnter = ({ roomId: rid, nickname }) => {
    setSession({ roomId: rid, nickname });
    setRoomId(rid);
  };

  const handleLeave = () => {
    call.leave();
    setRoomId(null);
    setSession(null);
  };

  return (
    <>
      <Starfield />
      <div className="vignette" />
      <div className="scanlines" />

      {!session ? (
        <Lobby key="lobby" onEnter={handleEnter} />
      ) : (
        <div className="call animate-in" key="call">
          <button
            className={`room-menu-btn ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            title="Menu da sala"
          >
            <SettingsIcon size={22} />
          </button>
          <div className="call-main">
            <VideoGrid
              myStream={call.localStream}
              myNickname={call.myNickname}
              camOn={call.camOn}
              micOn={call.micOn}
              localSpeaking={localSpeaking}
              speakingPeers={call.speakingPeers}
              screenStreams={call.screenStreams}
              screenOn={call.screenOn}
              localScreenStream={call.localScreenStream}
              streams={call.streams}
              layout={layout}
            />
            <ChatPanel
              messages={chat.messages}
              input={chat.input}
              setInput={chat.setInput}
              send={chat.send}
              open={chat.open}
              toggleChat={chat.toggleChat}
              myKey={call.myKey}
            />
          </div>
          <Controls
            micOn={call.micOn}
            camOn={call.camOn}
            screenOn={call.screenOn}
            toggleMic={call.toggleMic}
            toggleCam={call.toggleCam}
            toggleScreen={call.toggleScreen}
            leave={handleLeave}
            unread={chat.unread}
            toggleChat={chat.toggleChat}
            layout={layout}
            setLayout={setLayout}
          />
          <RoomMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            roomId={roomId}
            myNickname={call.myNickname}
            onRename={call.rename}
            participants={call.participants}
            roomLink={roomLink}
            layout={layout}
            setLayout={setLayout}
          />
        </div>
      )}
    </>
  );
}
