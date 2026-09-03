import { useEffect, useRef } from 'react';

function VideoTile({ stream, label, muted, empty }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => {});
    }
  }, [stream]);

  const initials = (label || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="video-tile">
      {stream ? (
        <video ref={ref} autoPlay playsInline muted={muted} />
      ) : (
        <div className="tile-empty">
          <div className="avatar">{initials}</div>
        </div>
      )}
      {label && (
        <span className="tile-label">
          <span>{label}</span>
        </span>
      )}
    </div>
  );
}

export default function VideoGrid({ myStream, myKey, myNickname, camOn, streams }) {
  const videoStreams =
    streams && streams.length > 0 ? streams : null;
  const myActive = myStream && camOn;

  return (
    <div className="call-stage">
      <VideoTile
        stream={myActive ? myStream : null}
        label={`${myNickname} (você)`}
        muted
      />
      {videoStreams
        ? videoStreams.map((s) => (
            <VideoTile key={s.id} stream={s.stream} label={s.nickname} />
          ))
        : null}
    </div>
  );
}
