import { useEffect, useRef, useState } from 'react';

const THRESHOLD = 0.02;
const HOLD_FRAMES = 20;
const HOLD_DECAY = 0.85;

/**
 * Detecta se há fala no stream de áudio fornecido.
 * Retorna `speaking` (boolean) atualizado a intervalos.
 *
 * Utiliza o Web Audio API (`AnalyserNode`) para medir o volume RMS dos frames.
 *
 * @param {MediaStream|null} stream Stream contendo trilha de áudio.
 * @param {number} interval ms entre análises (default 100).
 */
export function useSpeaking(stream, interval = 100) {
  const [speaking, setSpeaking] = useState(false);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const decliningRef = useRef(0);
  const speakingRef = useRef(false);

  // Reaproveita o AnalyserNode quando possível
  useEffect(() => {
    if (stream === streamRef.current) return;
    streamRef.current = stream;

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    setSpeaking(false);
    speakingRef.current = false;
  }, [stream]);

  useEffect(() => {
    if (!stream) {
      setSpeaking(false);
      return;
    }
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
      setSpeaking(false);
      return;
    }

    let AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.2;
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Float32Array(analyser.fftSize);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          sum += data[i] * data[i];
        }
        const rms = Math.sqrt(sum / data.length);

        if (rms > THRESHOLD) {
          decliningRef.current = HOLD_FRAMES;
        } else if (decliningRef.current > 0) {
          decliningRef.current -= HOLD_DECAY;
        }

        const active = decliningRef.current > 0;
        if (active !== speakingRef.current) {
          speakingRef.current = active;
          setSpeaking(active);
        }
      };

      const id = setInterval(tick, interval);
      return () => {
        clearInterval(id);
        source.disconnect();
        analyser.disconnect();
        if (ctx && ctx.state === 'running') ctx.close();
        analyserRef.current = null;
        setSpeaking(false);
        speakingRef.current = false;
      };
    } catch (e) {
      // Sem detector de áudio disponível
    }
  }, [stream, interval]);

  return speaking;
}
