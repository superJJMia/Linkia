import { useEffect, useRef, useState } from 'react';

function useWindowWidth() {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return w;
}

// Quantidade máxima de vídeos visíveis de acordo com a largura da tela.
// Mínimo 3 quando há gente suficiente; até 5 nas telas mais largas.
function maxTilesFor(width) {
  if (width < 700) return 3;
  if (width < 1100) return 4;
  return 5;
}

// Número de colunas para distribuir N tiles ocupando a tela de forma proporcional.
function colsFor(count, width) {
  if (count <= 2) return count; // 1 -> 1 coluna (tela toda); 2 -> metade cada
  if (count === 3) return width < 700 ? 2 : 3; // 3 -> terços (ou 2+1 em telas estreitas)
  if (count === 4) return 2; // 2x2
  return width < 900 ? 2 : 3; // 5/6 -> 3+2 (ou 2x3 em telas estreitas)
}

function VideoTile({ stream, label, muted, speaking, badge }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => {});
    }
  }, [stream]);

  const initials = (label || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const tileClass = ['video-tile'];
  if (speaking) tileClass.push('speaking');
  if (badge) tileClass.push(badge);

  return (
    <div className={tileClass.join(' ')}>
      {stream ? (
        <video ref={ref} autoPlay playsInline muted={muted} />
      ) : (
        <div className="tile-empty">
          <div className="avatar">{initials}</div>
        </div>
      )}
      {speaking && (
        <span className="speaking-badge">
          <span className="wave-dot" />
          Ao vivo
        </span>
      )}
      {label && (
        <span className="tile-label">
          <span>{label}</span>
        </span>
      )}
    </div>
  );
}

export default function VideoGrid({
  myStream,
  myNickname,
  camOn,
  micOn,
  localSpeaking,
  speakingPeers,
  screenStreams,
  screenOn,
  localScreenStream,
  streams,
  participants,
  layout,
}) {
  const width = useWindowWidth();
  const myActive = myStream && camOn;
  const mySpeaking = localSpeaking && micOn;

  // Mapa de ids de peers para seus streams de câmera (podem ainda não ter vídeo)
  const streamById = {};
  streams.forEach((s) => {
    streamById[s.id] = s.stream;
  });

  // Tiles de câmera dos peers: baseados em TODOS os participantes da sala,
  // garantindo um tile por pessoa (avatar vazio se o vídeo ainda não chegou).
  const peerTiles = (participants || []).map((p) => ({
    id: p.id,
    stream: streamById[p.id] || null,
    label: p.nickname,
    muted: false,
    speaking: speakingPeers.has(p.id),
  }));

  // Tiles de câmera: o próprio usuário sempre no topo + os peers
  const cameraTiles = [
    {
      id: 'me',
      stream: myActive ? myStream : null,
      label: `${myNickname} (você)`,
      muted: true,
      speaking: mySpeaking,
    },
    ...peerTiles,
  ];

  // Prioridade de exibição ao limitar a quantidade de tiles:
  // 1) O próprio usuário (tela principal do streamer) - sempre presente
  // 2) Quem está falando
  // 3) Demais participantes
  const score = (t) => (t.id === 'me' ? 100 : t.speaking ? 80 : 10);

  const selectTiles = (tiles, max) =>
    [...tiles]
      .sort((a, b) => score(b) - score(a))
      .slice(0, max);

  // Telas dos peers
  const remoteScreens = screenStreams.map((s) => ({
    id: s.id,
    stream: s.stream,
    label: s.nickname,
    badge: 'screen-tile',
  }));

  const hasLocalScreen = screenOn && localScreenStream;
  const totalScreens = (hasLocalScreen ? 1 : 0) + remoteScreens.length;

  const maxTiles = maxTilesFor(width);
  const selectedCams = selectTiles(cameraTiles, maxTiles);

  const renderGrid = (tiles) => {
    const count = Math.max(1, Math.min(6, tiles.length));
    const cols = Math.min(count, colsFor(count, width));
    return (
      <div className={`call-stage grid cols-${cols}`}>
        {tiles.map((t) => (
          <VideoTile key={t.id} {...t} />
        ))}
      </div>
    );
  };

  // Modo grade (forçado)
  if (layout === 'grid') {
    const allTiles = [
      ...(hasLocalScreen
        ? [{ id: 'me-screen', stream: localScreenStream, label: `${myNickname} · tela`, muted: true, badge: 'screen-tile' }]
        : []),
      ...remoteScreens,
      ...selectTiles(
        cameraTiles,
        Math.max(0, maxTiles - (hasLocalScreen ? 1 : 0) - remoteScreens.length)
      ),
    ];
    return renderGrid(allTiles);
  }

  // Modo destaque (spotlight / auto): tela grande + coluna lateral
  const hasSpotlight = layout === 'spotlight' || totalScreens > 0;

  if (!hasSpotlight) {
    return renderGrid(selectedCams);
  }

  // Determina o destaque: tela local primeiro, senão a primeira tela remota
  let featured = null;
  let sidebar = [];
  if (hasLocalScreen) {
    featured = {
      id: 'me-screen',
      stream: localScreenStream,
      label: `${myNickname} · apresentando`,
      muted: true,
      badge: 'screen-tile',
    };
    sidebar = [...remoteScreens, ...selectedCams];
  } else if (remoteScreens.length > 0) {
    featured = { ...remoteScreens[0] };
    sidebar = [...remoteScreens.slice(1), ...selectedCams];
  }

  return (
    <div className="layout-spotlight">
      <div className="spotlight-area">
        <VideoTile {...featured} />
      </div>
      <div className="sidebar">
        {sidebar.map((t) => (
          <VideoTile key={t.id} {...t} />
        ))}
      </div>
    </div>
  );
}
