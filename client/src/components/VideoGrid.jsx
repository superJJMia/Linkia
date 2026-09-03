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
// Mínimo 3 em todos os cenários; até 5 nas telas mais largas.
function maxTilesFor(width) {
  if (width < 700) return 3;
  if (width < 1100) return 4;
  return 5;
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
  layout,
}) {
  const width = useWindowWidth();
  const myActive = myStream && camOn;
  const mySpeaking = localSpeaking && micOn;

  // Tiles de câmera: o próprio + câmeras dos peers
  const cameraTiles = [
    {
      id: 'me',
      stream: myActive ? myStream : null,
      label: `${myNickname} (você)`,
      muted: true,
      speaking: mySpeaking,
    },
    ...streams.map((s) => ({
      id: s.id,
      stream: s.stream,
      label: s.nickname,
      muted: false,
      speaking: speakingPeers.has(s.id),
    })),
  ];

  // Prioridade de exibição ao limitar a quantidade de tiles:
  // 1) O próprio usuário (tela principal do streamer) - sempre presente
  // 2) Quem está falando
  // 3) Demais participantes
  const score = (t) => (t.id === 'me' ? 100 : t.speaking ? 80 : 10);

  // Seleciona até maxTiles câmeras, priorizando falantes e o próprio usuário
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
  const tileCount = Math.max(
    3,
    Math.min(5, selectedCams.length + (hasLocalScreen ? 1 : 0) + remoteScreens.length)
  );

  // Modo grade (forçado) -> tudo em grade uniforme
  if (layout === 'grid') {
    const allTiles = [
      ...(hasLocalScreen
        ? [{ id: 'me-screen', stream: localScreenStream, label: `${myNickname} · tela`, muted: true, badge: 'screen-tile' }]
        : []),
      ...remoteScreens,
      ...selectTiles(cameraTiles, Math.max(0, maxTiles - (hasLocalScreen ? 1 : 0) - remoteScreens.length)),
    ];
    const count = Math.max(3, Math.min(5, allTiles.length));
    return (
      <div className={`call-stage grid tiles-${count}`}>
        {allTiles.map((t) => (
          <VideoTile key={t.id} {...t} />
        ))}
      </div>
    );
  }

  // Modo destaque (spotlight / auto): tela grande + coluna lateral
  const hasSpotlight = layout === 'spotlight' || totalScreens > 0;

  if (!hasSpotlight) {
    return (
      <div className={`call-stage grid tiles-${tileCount}`}>
        {selectedCams.map((t) => (
          <VideoTile key={t.id} {...t} />
        ))}
      </div>
    );
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
    // A tela destacada não entra na coluna
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
