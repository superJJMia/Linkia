import { useState, useEffect } from 'react';
import { useCall } from './hooks/useCall.js';
import { useChat } from './hooks/useChat.js';
import Lobby from './components/Lobby.jsx';
import VideoGrid from './components/VideoGrid.jsx';
import Controls from './components/Controls.jsx';
import ChatPanel from './components/ChatPanel.jsx';

export default function App() {
  const [session, setSession] = useState(null); // { roomId, nickname }
  const [roomId, setRoomId] = useState(null);

  const call = useCall(roomId);
  const chat = useChat(call.socket, roomId);

  // Define o apelido quando entra na sala
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

  if (!session) {
    return <Lobby onEnter={handleEnter} />;
  }

  return (
    <div className="call">
      <div className="call-main">
        <div className="call-stage" style={{ flex: 1 }}>
          <VideoGrid
            myStream={call.localStream.current}
            myKey={call.myKey}
            myNickname={call.myNickname}
            camOn={call.camOn}
            streams={call.streams}
          />
        </div>
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
      />
    </div>
  );
}
