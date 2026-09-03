import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const RTC_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

let sequence = 1;
const uid = () => `user-${Date.now()}-${sequence++}`;

/**
 * Hook que orquestra a sala + sinalização WebRTC ponto-a-ponto.
 * O compartilhamento de tela é tratado como um stream separado (com renegociação),
 * permitindo exibir câmera e tela do mesmo participante em painéis distintos.
 * @param {string|null} roomId Código da sala (null quando ainda fora)
 */
export function useCall(roomId) {
  const socketRef = useRef(null);
  const myIdRef = useRef(uid());
  const mySocketIdRef = useRef(null); // socket.id real (usado p/ filtrar o próprio usuário)
  const localStreamRef = useRef(null);      // câmera + microfone (sempre)
  const screenStreamRef = useRef(null);     // tela local (quando compartilhando)
  const peersRef = useRef(new Map());       // socketId -> { pc, mediaStream, screenStream, screenSender }
  const pendingCandidatesRef = useRef(new Map()); // socketId -> [candidates]
  const nicknameRef = useRef('Participante');

  const [connected, setConnected] = useState(false);
  const [myNickname, setMyNickname] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [localScreenStream, setLocalScreenStream] = useState(null);
  const [participants, setParticipants] = useState([]); // [{id, nickname}]
  const [streams, setStreams] = useState([]);            // câmeras dos peers [{id, nickname, stream}]
  const [screenStreams, setScreenStreams] = useState([]); // telas dos peers [{id, nickname, stream}]
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [screenUsers, setScreenUsers] = useState(new Set()); // ids que estão compartilhando tela
  const [speakingPeers, setSpeakingPeers] = useState(new Set());
  const localSpeakingRef = useRef(false);

  const myKey = myIdRef.current;

  const setNickname = useCallback((name) => {
    nicknameRef.current = name || 'Participante';
    setMyNickname(nicknameRef.current);
  }, []);

  const nicknameOf = useCallback(
    (id) => {
      if (id === myIdRef.current) return myNickname;
      return participants.find((p) => p.id === id)?.nickname || 'Participante';
    },
    [participants, myNickname]
  );

  // Reconstroi as listas de streams de câmera e de tela dos peers
  const updateStreamsList = useCallback(() => {
    const cams = [];
    const screens = [];
    for (const [id, peer] of peersRef.current.entries()) {
      if (peer.mediaStream) {
        cams.push({ id, nickname: nicknameOf(id), stream: peer.mediaStream });
      }
      if (peer.screenStream) {
        screens.push({ id, nickname: nicknameOf(id), stream: peer.screenStream });
      }
    }
    setStreams(cams);
    setScreenStreams(screens);
  }, [nicknameOf]);

  const rename = useCallback(
    (name) => {
      const clean = (name || '').trim() || 'Participante';
      if (clean === nicknameRef.current) return;
      nicknameRef.current = clean;
      setMyNickname(clean);
      if (socketRef.current) {
        socketRef.current.emit('update-nickname', { roomId, nickname: clean });
      }
      updateStreamsList();
    },
    [roomId, updateStreamsList]
  );

  const startLocalMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localStreamRef.current = stream;
    return stream;
  }, []);

  const renegotiate = useCallback(async (targetId) => {
    const peer = peersRef.current.get(targetId);
    if (!peer || !socketRef.current) return;
    try {
      const offer = await peer.pc.createOffer();
      await peer.pc.setLocalDescription(offer);
      socketRef.current.emit('webrtc-offer', { to: targetId, offer });
    } catch (e) {
      console.warn('Falha na renegociação com', targetId, e);
    }
  }, []);

  const createPeer = useCallback(
    (targetId) => {
      const pc = new RTCPeerConnection(RTC_CONFIG);
      const localStream = localStreamRef.current;
      if (localStream) {
        for (const track of localStream.getTracks()) {
          pc.addTrack(track, localStream);
        }
      }
      pc.onnegotiationneeded = () => {
        renegotiate(targetId);
      };
      pc.onicecandidate = (e) => {
        if (e.candidate && socketRef.current) {
          socketRef.current.emit('webrtc-ice-candidate', { to: targetId, candidate: e.candidate });
        }
      };
      pc.ontrack = (e) => {
        const peer = peersRef.current.get(targetId);
        if (!peer) return;
        const received = e.streams[0];
        // Primeira mídia recebida = câmera; a seguinte (quando o peer compartilha tela) = tela
        if (!peer.mediaStream) {
          peer.mediaStream = received;
        } else if (received !== peer.mediaStream) {
          peer.screenStream = received;
        }
        updateStreamsList();
      };
      return pc;
    },
    [renegotiate, updateStreamsList]
  );

  const connectToPeer = useCallback(
    async (targetId) => {
      if (peersRef.current.has(targetId)) return;
      const pc = createPeer(targetId);
      peersRef.current.set(targetId, { pc, mediaStream: null, screenStream: null, screenSender: null });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit('webrtc-offer', { to: targetId, offer });

      const pendings = pendingCandidatesRef.current.get(targetId) || [];
      for (const c of pendings) {
        await pc.addIceCandidate(c);
      }
      pendingCandidatesRef.current.delete(targetId);
    },
    [createPeer]
  );

  const handleOffer = useCallback(
    async ({ from, offer }) => {
      let peer = peersRef.current.get(from);
      if (!peer) {
        const pc = createPeer(from);
        peer = { pc, mediaStream: null, screenStream: null, screenSender: null };
        peersRef.current.set(from, peer);
      }
      const pc = peer.pc;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit('webrtc-answer', { to: from, answer });

      const pendings = pendingCandidatesRef.current.get(from) || [];
      for (const c of pendings) {
        await pc.addIceCandidate(c);
      }
      pendingCandidatesRef.current.delete(from);
    },
    [createPeer]
  );

  const handleAnswer = useCallback(async ({ from, answer }) => {
    const peer = peersRef.current.get(from);
    if (peer) {
      await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }, []);

  const handleIceCandidate = useCallback(async ({ from, candidate }) => {
    const peer = peersRef.current.get(from);
    if (peer && peer.pc.remoteDescription) {
      await peer.pc.addIceCandidate(candidate);
    } else {
      const pendings = pendingCandidatesRef.current.get(from) || [];
      pendingCandidatesRef.current.set(from, [...pendings, candidate]);
    }
  }, []);

  const destroyPeer = useCallback(
    (id) => {
      const peer = peersRef.current.get(id);
      if (peer) {
        peer.pc.close();
        peer.mediaStream?.getTracks?.().forEach((t) => t.stop());
        peer.screenStream?.getTracks?.().forEach((t) => t.stop());
        peersRef.current.delete(id);
        pendingCandidatesRef.current.delete(id);
        updateStreamsList();
      }
    },
    [updateStreamsList]
  );

  const handleUserLeft = useCallback(
    (payload) => {
      destroyPeer(payload?.id);
    },
    [destroyPeer]
  );

  const handleUserJoined = useCallback(({ id, nickname }) => {
    if (id === myIdRef.current || id === mySocketIdRef.current) return;
    setParticipants((prev) => {
      if (prev.some((p) => p.id === id)) return prev;
      return [...prev, { id, nickname }];
    });
  }, []);

  const handleRoomParticipants = useCallback(
    ({ participants: list }) => {
      setParticipants((prev) => {
        const seen = new Set();
        const merged = [...(list || []), ...(prev || [])];
        return merged.filter((p) => {
          if (p.id === myIdRef.current) return false;
          if (p.id === mySocketIdRef.current) return false;
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
      });
      const targets = (list || []).map((p) => p.id);
      targets.forEach((id) => {
        if (id !== myIdRef.current && id !== mySocketIdRef.current) {
          connectToPeer(id);
        }
      });
    },
    [connectToPeer]
  );

  // Conectar ao socket ao entrar na sala
  useEffect(() => {
    if (!roomId) return;
    const socket = io('/', { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', async () => {
      mySocketIdRef.current = socket.id;
      try {
        await startLocalMedia();
      } catch (e) {
        console.warn('Não foi possível obter câmera/microfone', e);
      }
      setLocalStream(localStreamRef.current);
      setConnected(true);
      socket.emit('join-room', { roomId, nickname: nicknameRef.current });
    });

    socket.on('room-participants', handleRoomParticipants);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('webrtc-offer', handleOffer);
    socket.on('webrtc-answer', handleAnswer);
    socket.on('webrtc-ice-candidate', handleIceCandidate);

    socket.on('peer-speaking', ({ id, speaking }) => {
      setSpeakingPeers((prev) => {
        const next = new Set(prev);
        if (speaking) next.add(id);
        else next.delete(id);
        return next;
      });
    });

    socket.on('peer-screen', ({ id, streaming }) => {
      setScreenUsers((prev) => {
        const next = new Set(prev);
        if (streaming) next.add(id);
        else next.delete(id);
        return next;
      });
    });

    socket.on('peer-nickname', ({ id, nickname }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, nickname } : p))
      );
      updateStreamsList();
    });

    return () => {
      socket.emit('leave-room');
      socket.disconnect();
      peersRef.current.forEach(({ pc }) => pc.close());
      peersRef.current.clear();
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
      setLocalScreenStream(null);
      setStreams([]);
      setScreenStreams([]);
      setParticipants([]);
      setScreenUsers(new Set());
      setSpeakingPeers(new Set());
      localSpeakingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Toggle de mídia
  const toggleMic = useCallback(() => {
    const local = localStreamRef.current;
    setMicOn((prev) => {
      const next = !prev;
      local?.getAudioTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  }, []);

  const toggleCam = useCallback(() => {
    const local = localStreamRef.current;
    setCamOn((prev) => {
      const next = !prev;
      local?.getVideoTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  }, []);

  const toggleScreen = useCallback(async () => {
    if (screenOn) {
      await stopScreenShare();
      return;
    }
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });
    if (!localStreamRef.current) {
      displayStream.getTracks().forEach((t) => t.stop());
      return;
    }
    const screenTrack = displayStream.getVideoTracks()[0];
    screenTrack.addEventListener('ended', () => {
      stopScreenShare();
    });
    screenStreamRef.current = displayStream;

    // Adiciona a track de tela em cada peer existente e negocia novamente
    for (const [id, peer] of peersRef.current.entries()) {
      if (peer.screenSender) continue;
      const sender = peer.pc.addTrack(screenTrack, displayStream);
      peer.screenSender = sender;
      await renegotiate(id);
    }

    setScreenOn(true);
    setLocalScreenStream(displayStream);
    socketRef.current?.emit('screen-state', { roomId, streaming: true });
  }, [screenOn, roomId, renegotiate]);

  const stopScreenShare = useCallback(async () => {
    const displayStream = screenStreamRef.current;
    if (!displayStream) {
      setScreenOn(false);
      return;
    }
    for (const [id, peer] of peersRef.current.entries()) {
      if (peer.screenSender) {
        try {
          peer.pc.removeTrack(peer.screenSender);
        } catch (e) {
          console.warn('Falha ao remover track de tela', e);
        }
        peer.screenSender = null;
        await renegotiate(id);
      }
    }
    displayStream.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenOn(false);
    setLocalScreenStream(null);
    socketRef.current?.emit('screen-state', { roomId, streaming: false });
  }, [roomId, renegotiate]);

  const leave = useCallback(() => {
    socketRef.current?.emit('leave-room');
    socketRef.current?.disconnect();
    peersRef.current.forEach(({ pc }) => pc.close());
    peersRef.current.clear();
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setLocalScreenStream(null);
    setStreams([]);
    setScreenStreams([]);
    setParticipants([]);
    setScreenUsers(new Set());
    setSpeakingPeers(new Set());
    setConnected(false);
    localSpeakingRef.current = false;
  }, []);

  const broadcastSpeaking = useCallback(
    (speaking) => {
      if (speaking === localSpeakingRef.current) return;
      localSpeakingRef.current = speaking;
      if (socketRef.current && roomId) {
        socketRef.current.emit('speaking', { roomId, speaking });
      }
    },
    [roomId]
  );

  return {
    socket: socketRef.current,
    connected,
    myKey,
    myNickname,
    localStream,
    localScreenStream,
    micOn,
    camOn,
    screenOn,
    screenUsers,
    speakingPeers,
    participants,
    streams,
    screenStreams,
    setNickname,
    rename,
    toggleMic,
    toggleCam,
    toggleScreen,
    stopScreenShare,
    broadcastSpeaking,
    leave,
  };
}
