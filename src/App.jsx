import { useState, useEffect, useRef, useCallback } from "react";

const PRESETS = [
  {
    id: "theta",
    name: "Тета-поле",
    subtitle: "4–7 Гц · слайд Зеланда",
    description: "Межа між свідомим і підсвідомим. Ідеально для прописування слайдів і констатації реальності.",
    beat: 6,
    carrier: 200,
    noise: "pink",
    noiseVolume: 0.03,
    color: "#7C3AED",
    glow: "#A78BFA",
  },
  {
    id: "schumann",
    name: "Резонанс Шумана",
    subtitle: "7.83 Гц · частота Землі",
    description: "Природна частота електромагнітного поля Землі. Синхронізує нервову систему з планетарним фоном.",
    beat: 7.83,
    carrier: 180,
    noise: "brown",
    noiseVolume: 0.04,
    color: "#065F46",
    glow: "#34D399",
  },
  {
    id: "alpha",
    name: "Альфа-намір",
    subtitle: "10 Гц · спокійна присутність",
    description: "Розслаблена, але чітка свідомість. Стан без надлишкового потенціалу — саме те, що Зеланд називає «наміром без бажання».",
    beat: 10,
    carrier: 220,
    noise: "pink",
    noiseVolume: 0.025,
    color: "#1D4ED8",
    glow: "#60A5FA",
  },
];

function createPinkNoise(ctx) {
  const bufferSize = 4096;
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  const node = ctx.createScriptProcessor(bufferSize, 1, 1);
  node.onaudioprocess = (e) => {
    const out = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  };
  return node;
}

function createBrownNoise(ctx) {
  const bufferSize = 4096;
  let last = 0;
  const node = ctx.createScriptProcessor(bufferSize, 1, 1);
  node.onaudioprocess = (e) => {
    const out = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      out[i] = (last + 0.02 * white) / 1.02;
      last = out[i];
      out[i] *= 3.5;
    }
  };
  return node;
}

// Tibetan bowl-like bell: layered sine with slow decay
function playBell(ctx, volume = 0.5) {
  const now = ctx.currentTime;
  // Three partials for a rich bowl sound
  const partials = [
    { freq: 432, gain: 0.5, decay: 4.0 },
    { freq: 864, gain: 0.25, decay: 2.5 },
    { freq: 1188, gain: 0.12, decay: 1.5 },
  ];
  partials.forEach(({ freq, gain, decay }) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain * volume, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + decay);
  });
}

export default function ZelandSound() {
  const [activePreset, setActivePreset] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(10);
  const [finished, setFinished] = useState(false);

  const audioCtxRef = useRef(null);
  const nodesRef = useRef([]);
  const masterGainRef = useRef(null);
  const timerRef = useRef(null);
  const durationRef = useRef(duration);
  const volumeRef = useRef(volume);

  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  const stopAudio = useCallback((withBell = false) => {
    clearInterval(timerRef.current);

    if (withBell && audioCtxRef.current) {
      playBell(audioCtxRef.current, volumeRef.current);
      // fade out main audio
      if (masterGainRef.current) {
        masterGainRef.current.gain.setValueAtTime(masterGainRef.current.gain.value, audioCtxRef.current.currentTime);
        masterGainRef.current.gain.linearRampToValueAtTime(0, audioCtxRef.current.currentTime + 1.5);
      }
      const ctx = audioCtxRef.current;
      setTimeout(() => {
        nodesRef.current.forEach((n) => { try { n.stop?.(); n.disconnect?.(); } catch {} });
        nodesRef.current = [];
        try { ctx.close(); } catch {}
      }, 4500);
    } else {
      nodesRef.current.forEach((n) => { try { n.stop?.(); n.disconnect?.(); } catch {} });
      nodesRef.current = [];
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch {}
        audioCtxRef.current = null;
      }
    }

    audioCtxRef.current = null;
    masterGainRef.current = null;
    setIsPlaying(false);
    setElapsed(0);
  }, []);

  const startAudio = useCallback((preset) => {
    // full stop first (no bell)
    clearInterval(timerRef.current);
    nodesRef.current.forEach((n) => { try { n.stop?.(); n.disconnect?.(); } catch {} });
    nodesRef.current = [];
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} audioCtxRef.current = null; }

    setFinished(false);
    setElapsed(0);

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;

    const master = ctx.createGain();
    master.gain.value = volumeRef.current;
    master.connect(ctx.destination);
    masterGainRef.current = master;

    const leftOsc = ctx.createOscillator();
    leftOsc.frequency.value = preset.carrier;
    leftOsc.type = "sine";
    const leftGain = ctx.createGain();
    leftGain.gain.value = 0.3;
    const merger = ctx.createChannelMerger(2);
    leftOsc.connect(leftGain);
    leftGain.connect(merger, 0, 0);

    const rightOsc = ctx.createOscillator();
    rightOsc.frequency.value = preset.carrier + preset.beat;
    rightOsc.type = "sine";
    const rightGain = ctx.createGain();
    rightGain.gain.value = 0.3;
    rightOsc.connect(rightGain);
    rightGain.connect(merger, 0, 1);

    merger.connect(master);

    const noiseNode = preset.noise === "brown" ? createBrownNoise(ctx) : createPinkNoise(ctx);
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = preset.noiseVolume;
    noiseNode.connect(noiseGain);
    noiseGain.connect(master);

    leftOsc.start();
    rightOsc.start();

    nodesRef.current = [leftOsc, rightOsc, { disconnect: () => { noiseNode.disconnect(); noiseGain.disconnect(); } }];

    setIsPlaying(true);

    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= durationRef.current * 60) {
          clearInterval(timerRef.current);
          setFinished(true);
          // bell + stop
          if (masterGainRef.current && audioCtxRef.current) {
            playBell(audioCtxRef.current, volumeRef.current);
            masterGainRef.current.gain.setValueAtTime(masterGainRef.current.gain.value, audioCtxRef.current.currentTime);
            masterGainRef.current.gain.linearRampToValueAtTime(0, audioCtxRef.current.currentTime + 2);
          }
          setTimeout(() => {
            nodesRef.current.forEach((n) => { try { n.stop?.(); n.disconnect?.(); } catch {} });
            nodesRef.current = [];
            if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} audioCtxRef.current = null; }
            masterGainRef.current = null;
            setIsPlaying(false);
            setElapsed(0);
            setFinished(false);
          }, 5000);
          return next;
        }
        return next;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (masterGainRef.current) masterGainRef.current.gain.value = volume;
  }, [volume]);

  useEffect(() => () => stopAudio(false), [stopAudio]);

  const handlePreset = (preset) => {
    if (isPlaying && activePreset?.id === preset.id) {
      stopAudio(false);
      setActivePreset(null);
    } else {
      setActivePreset(preset);
      startAudio(preset);
    }
  };

  const remaining = Math.max(0, duration * 60 - elapsed);
  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const progress = isPlaying ? (elapsed / (duration * 60)) * 100 : 0;

  // Countdown ring
  const R = 54;
  const CIRC = 2 * Math.PI * R;
  const dash = isPlaying ? CIRC * (1 - progress / 100) : CIRC;
  const ringColor = activePreset?.glow || "#A78BFA";

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0f 0%, #0d0d1a 50%, #0a0f0a 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: "24px 16px",
      color: "#e2e8f0",
    }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div style={{ fontSize: "11px", letterSpacing: "4px", color: "#64748b", textTransform: "uppercase", marginBottom: "10px" }}>
          Transurfing · Звуковий простір
        </div>
        <h1 style={{ fontSize: "26px", fontWeight: "300", margin: 0, color: "#f1f5f9", letterSpacing: "-0.5px" }}>
          Поле для констатації
        </h1>
      </div>

      {/* Countdown ring */}
      <div style={{ position: "relative", width: "140px", height: "140px", marginBottom: "32px", flexShrink: 0 }}>
        <svg width="140" height="140" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
          <circle
            cx="70" cy="70" r={R}
            fill="none"
            stroke={finished ? "#34D399" : ringColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={dash}
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          {finished ? (
            <div style={{ fontSize: "28px", animation: "bellPulse 1s ease-in-out 3" }}>🔔</div>
          ) : isPlaying ? (
            <>
              <span style={{ fontSize: "28px", fontWeight: "200", fontVariantNumeric: "tabular-nums", letterSpacing: "-1px", color: "#f1f5f9" }}>
                {formatTime(remaining)}
              </span>
              <span style={{ fontSize: "10px", color: "#475569", marginTop: "2px" }}>залишилось</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: "28px", fontWeight: "200", color: "#334155" }}>{duration}</span>
              <span style={{ fontSize: "11px", color: "#334155" }}>хвилин</span>
            </>
          )}
        </div>
      </div>

      {/* Presets */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", maxWidth: "440px", marginBottom: "24px" }}>
        {PRESETS.map((preset) => {
          const active = isPlaying && activePreset?.id === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handlePreset(preset)}
              style={{
                background: active ? `linear-gradient(135deg, ${preset.color}22, ${preset.color}11)` : "rgba(255,255,255,0.03)",
                border: `1px solid ${active ? preset.color + "66" : "rgba(255,255,255,0.07)"}`,
                borderRadius: "16px",
                padding: "18px 20px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.3s ease",
                boxShadow: active ? `0 0 24px ${preset.glow}22` : "none",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {active && (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  background: `radial-gradient(ellipse at 20% 50%, ${preset.glow}08 0%, transparent 70%)`,
                  pointerEvents: "none",
                }} />
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "15px", fontWeight: "500", color: active ? preset.glow : "#cbd5e1" }}>
                      {preset.name}
                    </span>
                    <span style={{
                      fontSize: "10px",
                      color: active ? preset.glow : "#475569",
                      background: active ? `${preset.color}22` : "rgba(255,255,255,0.05)",
                      padding: "2px 8px",
                      borderRadius: "20px",
                      border: `1px solid ${active ? preset.color + "44" : "transparent"}`,
                    }}>
                      {preset.subtitle}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#64748b", lineHeight: "1.5" }}>
                    {preset.description}
                  </p>
                </div>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "50%",
                  border: `1.5px solid ${active ? preset.glow : "#334155"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginLeft: "14px", flexShrink: 0,
                  background: active ? `${preset.color}33` : "transparent",
                  transition: "all 0.3s",
                }}>
                  {active ? (
                    <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{
                          width: "2px", background: preset.glow, borderRadius: "2px",
                          animation: `wave 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
                          height: `${8 + i * 3}px`,
                        }} />
                      ))}
                    </div>
                  ) : (
                    <div style={{ width: 0, height: 0, borderStyle: "solid", borderWidth: "5px 0 5px 9px", borderColor: "transparent transparent transparent #64748b", marginLeft: "2px" }} />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div style={{
        width: "100%", maxWidth: "440px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "16px",
        padding: "20px 24px",
      }}>
        {/* Volume */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", color: "#64748b" }}>Гучність</span>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range" min="0" max="1" step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: activePreset?.color || "#7C3AED", cursor: "pointer" }}
          />
        </div>

        {/* Duration */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", color: "#64748b" }}>Тривалість</span>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>{duration} хв</span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {[5, 10, 15, 20, 30].map((m) => (
              <button
                key={m}
                onClick={() => {
                  setDuration(m);
                  durationRef.current = m;
                  if (isPlaying) setElapsed(0);
                }}
                style={{
                  flex: 1, padding: "7px",
                  borderRadius: "8px",
                  border: `1px solid ${duration === m ? (activePreset?.color || "#7C3AED") + "66" : "rgba(255,255,255,0.07)"}`,
                  background: duration === m ? (activePreset?.color || "#7C3AED") + "22" : "transparent",
                  color: duration === m ? "#e2e8f0" : "#64748b",
                  fontSize: "12px", cursor: "pointer",
                }}
              >{m}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Tip */}
      <div style={{ maxWidth: "440px", marginTop: "20px", textAlign: "center" }}>
        <p style={{ fontSize: "11px", color: "#1e293b", lineHeight: "1.7", margin: 0 }}>
          🎧 Навушники обов'язкові · Пиши в теперішньому часі<br />
          <em style={{ color: "#334155" }}>Констатуй, не благай — дзвін сповістить про кінець</em>
        </p>
      </div>

      <style>{`
        @keyframes wave {
          from { transform: scaleY(0.5); }
          to { transform: scaleY(1.5); }
        }
        @keyframes bellPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
        input[type=range] { -webkit-appearance: none; height: 3px; background: rgba(255,255,255,0.08); border-radius: 2px; outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #7C3AED; cursor: pointer; }
      `}</style>
    </div>
  );
}
