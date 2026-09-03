import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';

const RTC_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

let sequence = 1;
const uid = () => `user-${Date.now()}-${sequence++}`;

/**
 * Hook que orquestra a sala + sinalização WebRTC ponto-a-ponto.
 * @param {string|null} roomId Código da sala (null quando ainda fora)
 */
export function useCall(roomId) {
  const socketRef = useRef(null);
  const myIdRef = useRef(uid());
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peersRef = useRef(new Map()); // socketId -> { pc, mediaStream }
  const pendingCandidatesRef = useRef(new Map()); // socketId -> [candidates]
  const nicknameRef = useRef('Participante');

  const [connected, setConnected] = useState(false);
  const [myNickname, setMyNickname] = useState('');
  const [participants, setParticipants] = useState([]); // [{id, nickname}]
  const [streams, setStreams] = useState([]); // [{id, nickname, stream}]
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);

  const myKey = myIdRef.current;

  const setNickname = useCallback((name) => {
    nicknameRef.current = name || 'Participante';
    setMyNickname(nicknameRef.current);
  }, []);

  const updateStreamsList = useCallback(() => {
    const list = [];
    for (const [id, { mediaStream }] of peersRef.current.entries()) {
      if (mediaStream) {
        const p = participants.find((x) => x.id === id);
        list.push({ id, nickname: p?.nickname || 'Participante', stream: mediaStream });
      }
    }
    setStreams(list);
  }, [participants]);

  // Iniciar mídia local
  const startLocalMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localStreamRef.current = stream;
    return stream;
  }, []);

  const createPeer = useCallback((targetId) => {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    const localStream = localStreamRef.current;
    if (localStream) {
      for (const track of localStream.getTracks()) {
        pc.addTrack(track, localStream);
      }
    }
    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current) {
        socketRef.current.emit('webrtc-ice-candidate', { to: targetId, candidate: e.candidate });
      }
    };
    pc.ontrack = (e) => {
      const peer = peersRef.current.get(targetId);
      if (peer) {
        peer.mediaStream = e.streams[0];
        updateStreamsList();
      }
    };
    return pc;
  }, [updateStreamsList]);

  const connectToPeer = useCallback(async (targetId) => {
    if (peersRef.current.has(targetId)) return;
    const pc = createPeer(targetId);
    peersRef.current.set(targetId, { pc, mediaStream: null });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current.emit('webrtc-offer', { to: targetId, offer });

    // Entrega candidatos pendentes coletados antes do setRemoteDescription
    const pendings = pendingCandidatesRef.current.get(targetId) || [];
    for (const c of pendings) {
      await pc.addIceCandidate(c);
    }
    pendingCandidatesRef.current.delete(targetId);
  }, [createPeer]);

  const handleOffer = useCallback(async ({ from, offer }) => {
    let peer = peersRef.current.get(from);
    if (!peer) {
      const pc = createPeer(from);
      peer = { pc, mediaStream: null };
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
  }, [createPeer]);

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

  const destroyPeer = useCallback((id) => {
    const peer = peersRef.current.get(id);
    if (peer) {
      peer.pc.close();
      const tracks = peer.mediaStream?.getTracks?.() || [];
      tracks.forEach((t) => t.stop());
      peersRef.current.delete(id);
      pendingCandidatesRef.current.delete(id);
      updateStreamsList();
    }
  }, [updateStreamsList]);

  const handleUserLeft = useCallback(({ id }) => {
    destroyPeer(id);
  }, [destroyPeer]);

  const handleUserJoined = useCallback(({ id, nickname }) => {
    setParticipants((prev) => {
      if (prev.some((p) => p.id === id)) return prev;
      return [...prev, { id, nickname }];
    });
    // O recém-chegado recebe a lista e iniciará as conexões conosco.
    // Aqui aguardamos o evento room-participants em quem entrou.
  }, []);

  const handleRoomParticipants = useCallback(
    ({ participants: list }) => {
      setParticipants((prev) => {
        const mine = prev.length && prev; // já tem outros?
        return list.concat(mine || []);
      });
      // Conecta com quem já estava na sala
      const targets = list.map((p) => p.id);
      targets.forEach((id) => {
        if (id !== myIdRef.current) {
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
      try {
        await startLocalMedia();
      } catch (e) {
        console.warn('Não foi possível obter câmera/microfone', e);
      }
      setConnected(true);
      socket.emit('join-room', { roomId, nickname: nicknameRef.current });
    });

    socket.on('room-participants', handleRoomParticipants);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('webrtc-offer', handleOffer);
    socket.on('webrtc-answer', handleAnswer);
    socket.on('webrtc-ice-candidate', handleIceCandidate);

    return () => {
      socket.emit('leave-room');
      socket.disconnect();
      peersRef.current.forEach(({ pc }) => pc.close());
      peersRef.current.clear();
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setStreams([]);
      setParticipants([]);
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
      // Para o compartilhamento de tela
      const screenTrack = screenStreamRef.current?.getVideoTracks?.()[0];
      const camTrack = localStreamRef.current?.getVideoTracks?.()[0];
      // Restaura a câmera em todos os peers
      for (const { pc } of peersRef.current.values()) {
        const sender = pc.getSenders().find((s) => s.track === screenTrack);
        if (sender && camTrack) await sender.replaceTrack(camTrack);
      }
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setScreenOn(false);
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
      handleScreenEnded();
    });

    // Substitui a video track da câmera pela tela em todos os peers já conectados
    const camTrack = localStreamRef.current.getVideoTracks()[0];
    for (const { pc } of peersRef.current.values()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(screenTrack);
    }
    // Garante que novos peers recebam a tela: adiciona a track ao localStream
    // (mesmo id de track, então os peers existentes não duplicam)
    localStreamRef.current.addTrack(screenTrack);
    screenStreamRef.current = displayStream;
    setScreenOn(true);
  }, [screenOn]);

  const handleScreenEnded = useCallback(() => {
    const screenTrack = screenStreamRef.current?.getVideoTracks?.[0];
    const camTrack = localStreamRef.current?.getVideoTracks?.()[0];
    for (const { pc } of peersRef.current.values()) {
      const sender = pc.getSenders().find((s) => s.track === screenTrack);
      if (sender && camTrack) sender.replaceTrack(camTrack);
    }
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenOn(false);
  }, []);

  const leave = useCallback(() => {
    socketRef.current?.emit('leave-room');
    socketRef.current?.disconnect();
    peersRef.current.forEach(({ pc }) => pc.close());
    peersRef.current.clear();
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setStreams([]);
    setParticipants([]);
    setConnected(false);
  }, []);

  return {
    socket: socketRef.current,
    connected,
    myKey,
    myNickname,
    localStream: localStreamRef,
    micOn,
    camOn,
    screenOn,
    participants,
    streams,
    setNickname,
    toggleMic,
    toggleCam,
    toggleScreen,
    leave,
  };
}
