import { useEffect, useRef } from 'react';

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

  // Telas dos peers
  const remoteScreens = screenStreams.map((s) => ({
    id: s.id,
    stream: s.stream,
    label: s.nickname,
    badge: 'screen-tile',
  }));

  const hasLocalScreen = screenOn && localScreenStream;
  const totalScreens = (hasLocalScreen ? 1 : 0) + remoteScreens.length;

  // Modo grade (forçado) -> tudo em grade uniforme
  if (layout === 'grid') {
    const allTiles = [
      ...(hasLocalScreen
        ? [{ id: 'me-screen', stream: localScreenStream, label: `${myNickname} · tela`, muted: true, badge: 'screen-tile' }]
        : []),
      ...remoteScreens,
      ...cameraTiles,
    ];
    return (
      <div className="call-stage grid">
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
      <div className="call-stage grid">
        {cameraTiles.map((t) => (
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
    sidebar = [...remoteScreens, ...cameraTiles];
  } else if (remoteScreens.length > 0) {
    featured = { ...remoteScreens[0] };
    // A tela destacada não entra na coluna
    sidebar = [...remoteScreens.slice(1), ...cameraTiles];
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
