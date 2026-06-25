import { useState, useEffect, useRef, useCallback } from "react";

const QUOTES = [
  { text: "Намір не потребує зусиль. Він просто є — як факт, що вже відбувся.", source: "Трансерфінг реальності" },
  { text: "Ти не повинен боротися з реальністю. Просто вибери іншу.", source: "Трансерфінг реальності" },
  { text: "Надлишковий потенціал виникає тоді, коли ти надаєш речам більшого значення, ніж вони мають насправді.", source: "Трансерфінг реальності" },
  { text: "Слайд — це живий образ тієї реальності, яку ти хочеш отримати. Входь у нього кожного дня.", source: "Трансерфінг реальності" },
  { text: "Зовнішній намір не просить і не намагається. Він просто бере те, що вже належить йому.", source: "Трансерфінг реальності" },
  { text: "Думки матеріальні — не як мрія, а як константа. Те, про що ти думаєш постійно, стає твоєю реальністю.", source: "Трансерфінг реальності" },
  { text: "Не борись з течією. Просто вибери іншу річку.", source: "Трансерфінг реальності" },
  { text: "Якщо ти дозволяєш собі мати — воно приходить. Якщо ти прагнеш отримати — воно тікає.", source: "Трансерфінг реальності" },
  { text: "Відпусти контроль над результатом — і результат прийде сам.", source: "Трансерфінг реальності" },
  { text: "Хвилі варіантів існують незалежно від тебе. Твоє завдання — просто настроїтись на потрібну.", source: "Трансерфінг реальності" },
  { text: "Страх і тривога притягують те, чого ти боїшся. Спокій і впевненість притягують те, чого ти хочеш.", source: "Трансерфінг реальності" },
  { text: "Ти вже маєш все необхідне. Просто перестань сумніватись у цьому.", source: "Трансерфінг реальності" },
  { text: "Реальність — це дзеркало. Воно відображає не твої бажання, а твій внутрішній стан.", source: "Трансерфінг реальності" },
  { text: "Константація — це не самонавіювання. Це тиха впевненість у тому, що вже є.", source: "Трансерфінг реальності" },
  { text: "Зовнішній намір живе в просторі варіантів. Внутрішній намір — лише у твоїй голові.", source: "Трансерфінг реальності" },
];

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

function createNoiseSource(ctx, type) {
  const sampleRate = ctx.sampleRate;
  const bufferSize = sampleRate * 4; // 4 seconds looped
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);

  if (type === "pink") {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  } else {
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (last + 0.02 * white) / 1.02;
      last = data[i];
      data[i] *= 3.5;
    }
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

function playBell(ctx, volume = 0.5) {
  const now = ctx.currentTime;
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
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [quoteFade, setQuoteFade] = useState(true);

  const audioCtxRef = useRef(null);
  const nodesRef = useRef([]);
  const masterGainRef = useRef(null);
  const timerRef = useRef(null);
  const durationRef = useRef(duration);
  const volumeRef = useRef(volume);
  const wakeLockRef = useRef(null);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch {}
  };

  const releaseWakeLock = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch {}
  };

  // Re-acquire wake lock if tab becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isPlaying) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isPlaying]);

  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  const nextQuote = () => {
    setQuoteFade(false);
    setTimeout(() => {
      setQuoteIndex((i) => {
        let next = i;
        while (next === i) next = Math.floor(Math.random() * QUOTES.length);
        return next;
      });
      setQuoteFade(true);
    }, 300);
  };

  const stopAudio = useCallback((withBell = false) => {
    clearInterval(timerRef.current);
    if (withBell && audioCtxRef.current) {
      playBell(audioCtxRef.current, volumeRef.current);
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
      if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} audioCtxRef.current = null; }
    }
    audioCtxRef.current = null;
    masterGainRef.current = null;
    setIsPlaying(false);
    setElapsed(0);
    releaseWakeLock();
  }, []);

  const startAudio = useCallback((preset) => {
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

    const noiseNode = createNoiseSource(ctx, preset.noise);
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = preset.noiseVolume;
    noiseNode.connect(noiseGain);
    noiseGain.connect(master);

    leftOsc.start();
    rightOsc.start();
    noiseNode.start();
    nodesRef.current = [leftOsc, rightOsc, noiseNode, { disconnect: () => { noiseGain.disconnect(); } }];

    setIsPlaying(true);
    setTimeout(() => requestWakeLock(), 500);

    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= durationRef.current * 60) {
          clearInterval(timerRef.current);
          setFinished(true);
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
  const R = 70;
  const CIRC = 2 * Math.PI * R;
  const dash = isPlaying ? CIRC * (1 - progress / 100) : CIRC;
  const ringColor = activePreset?.glow || "#A78BFA";

  return (
    <div className="root">
      <div className="layout">

        {/* LEFT COLUMN */}
        <div className="left-col">
          {/* Header */}
          <div className="header">
            <div className="eyebrow">Transurfing · Звуковий простір</div>
            <h1 className="title">Поле для констатації</h1>
            <p className="subtitle">Бінауральні ритми · Фоновий шум · Намір без бажання</p>
          </div>

          {/* Presets */}
          <div className="presets">
            {PRESETS.map((preset) => {
              const active = isPlaying && activePreset?.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handlePreset(preset)}
                  className="preset-btn"
                  style={{
                    background: active ? `linear-gradient(135deg, ${preset.color}22, ${preset.color}11)` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${active ? preset.color + "66" : "rgba(255,255,255,0.07)"}`,
                    boxShadow: active ? `0 0 32px ${preset.glow}18` : "none",
                  }}
                >
                  {active && (
                    <div style={{
                      position: "absolute", inset: 0,
                      background: `radial-gradient(ellipse at 15% 50%, ${preset.glow}08 0%, transparent 65%)`,
                      pointerEvents: "none",
                    }} />
                  )}
                  <div className="preset-inner">
                    <div className="preset-text">
                      <div className="preset-name-row">
                        <span style={{ fontSize: "15px", fontWeight: "500", color: active ? preset.glow : "#cbd5e1" }}>
                          {preset.name}
                        </span>
                        <span className="preset-tag" style={{
                          color: active ? preset.glow : "#475569",
                          background: active ? `${preset.color}22` : "rgba(255,255,255,0.05)",
                          border: `1px solid ${active ? preset.color + "44" : "transparent"}`,
                        }}>
                          {preset.subtitle}
                        </span>
                      </div>
                      <p className="preset-desc">{preset.description}</p>
                    </div>
                    <div className="preset-icon" style={{
                      border: `1.5px solid ${active ? preset.glow : "#334155"}`,
                      background: active ? `${preset.color}33` : "transparent",
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

          {/* Quote */}
          <div className="quote-block" style={{ opacity: quoteFade ? 1 : 0 }}>
            <div className="section-label">Цитата</div>
            <p className="quote-text">«{QUOTES[quoteIndex].text}»</p>
            <div className="quote-footer">
              <span className="quote-source">{QUOTES[quoteIndex].source}</span>
              <button onClick={nextQuote} className="quote-btn">інша →</button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="right-col">
          {/* Ring */}
          <div className="ring-wrap">
            <svg width="180" height="180" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="90" cy="90" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
              <circle
                cx="90" cy="90" r={R}
                fill="none"
                stroke={finished ? "#34D399" : ringColor}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={dash}
                style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
              />
            </svg>
            <div className="ring-center">
              {finished ? (
                <div style={{ fontSize: "36px", animation: "bellPulse 1s ease-in-out 3" }}>🔔</div>
              ) : isPlaying ? (
                <>
                  <span className="ring-time">{formatTime(remaining)}</span>
                  <span className="ring-label">залишилось</span>
                </>
              ) : (
                <>
                  <span className="ring-idle-num">{duration}</span>
                  <span className="ring-idle-label">хвилин</span>
                </>
              )}
            </div>
          </div>

          {/* Controls card */}
          <div className="controls-card">
            {/* Volume */}
            <div className="control-row">
              <div className="control-header">
                <span className="control-label">Гучність</span>
                <span className="control-value">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: activePreset?.color || "#7C3AED" }}
              />
            </div>

            {/* Duration */}
            <div className="control-row" style={{ marginBottom: 0 }}>
              <div className="control-header">
                <span className="control-label">Тривалість</span>
                <span className="control-value">{duration} хв</span>
              </div>
              <div className="duration-btns">
                {[5, 10, 15, 20, 30].map((m) => (
                  <button
                    key={m}
                    onClick={() => { setDuration(m); durationRef.current = m; if (isPlaying) setElapsed(0); }}
                    className="dur-btn"
                    style={{
                      border: `1px solid ${duration === m ? (activePreset?.color || "#7C3AED") + "66" : "rgba(255,255,255,0.07)"}`,
                      background: duration === m ? (activePreset?.color || "#7C3AED") + "22" : "transparent",
                      color: duration === m ? "#e2e8f0" : "#64748b",
                    }}
                  >{m}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Tip */}
          <p className="tip">
            🎧 Навушники обов'язкові<br />
            <em>Констатуй, не благай — дзвін сповістить про кінець</em>
          </p>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        .root {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0a0f 0%, #0d0d1a 50%, #0a0f0a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', system-ui, sans-serif;
          color: #e2e8f0;
          padding: 40px 24px;
        }
        .layout {
          width: 100%;
          max-width: 900px;
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 40px;
          align-items: start;
        }
        .left-col { display: flex; flex-direction: column; gap: 20px; }
        .right-col { display: flex; flex-direction: column; align-items: center; gap: 20px; position: sticky; top: 40px; }

        /* Header */
        .eyebrow { font-size: 11px; letter-spacing: 4px; color: #334155; text-transform: uppercase; margin-bottom: 10px; }
        .title { font-size: 32px; font-weight: 300; margin: 0 0 6px; color: #f1f5f9; letter-spacing: -0.5px; }
        .subtitle { font-size: 13px; color: #475569; margin: 0; }

        /* Presets */
        .presets { display: flex; flex-direction: column; gap: 10px; }
        .preset-btn {
          position: relative; overflow: hidden;
          border-radius: 16px; padding: 18px 20px;
          cursor: pointer; text-align: left;
          transition: all 0.3s ease;
        }
        .preset-inner { display: flex; align-items: center; justify-content: space-between; }
        .preset-text { flex: 1; }
        .preset-name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; flex-wrap: wrap; }
        .preset-tag { font-size: 10px; padding: 2px 8px; border-radius: 20px; }
        .preset-desc { margin: 0; font-size: 12px; color: #64748b; line-height: 1.55; }
        .preset-icon {
          width: 34px; height: 34px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin-left: 16px; flex-shrink: 0; transition: all 0.3s;
        }

        /* Quote */
        .quote-block {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px; padding: 22px 24px;
          transition: opacity 0.3s ease;
        }
        .section-label { font-size: 10px; letter-spacing: 3px; color: #334155; text-transform: uppercase; margin-bottom: 14px; }
        .quote-text { margin: 0 0 14px; font-size: 15px; color: #94a3b8; line-height: 1.75; font-weight: 300; font-style: italic; }
        .quote-footer { display: flex; justify-content: space-between; align-items: center; }
        .quote-source { font-size: 11px; color: #334155; }
        .quote-btn {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px; color: #475569;
          font-size: 11px; padding: 5px 14px; cursor: pointer;
          transition: all 0.2s;
        }
        .quote-btn:hover { color: #94a3b8; border-color: rgba(255,255,255,0.14); }

        /* Ring */
        .ring-wrap { position: relative; width: 180px; height: 180px; flex-shrink: 0; }
        .ring-center {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
        }
        .ring-time { font-size: 34px; font-weight: 200; font-variant-numeric: tabular-nums; letter-spacing: -1px; color: #f1f5f9; }
        .ring-label { font-size: 10px; color: #475569; margin-top: 2px; }
        .ring-idle-num { font-size: 34px; font-weight: 200; color: #334155; }
        .ring-idle-label { font-size: 11px; color: #334155; }

        /* Controls */
        .controls-card {
          width: 100%;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px; padding: 20px 22px;
        }
        .control-row { margin-bottom: 16px; }
        .control-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .control-label { font-size: 12px; color: #64748b; }
        .control-value { font-size: 12px; color: #94a3b8; }
        .duration-btns { display: flex; gap: 6px; }
        .dur-btn { flex: 1; padding: 7px 4px; border-radius: 8px; font-size: 12px; cursor: pointer; transition: all 0.2s; }

        .tip { font-size: 11px; color: #1e293b; line-height: 1.7; text-align: center; margin: 0; }
        .tip em { color: #334155; }

        input[type=range] { -webkit-appearance: none; width: 100%; height: 3px; background: rgba(255,255,255,0.08); border-radius: 2px; outline: none; cursor: pointer; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #7C3AED; cursor: pointer; }

        @keyframes wave {
          from { transform: scaleY(0.5); }
          to { transform: scaleY(1.5); }
        }
        @keyframes bellPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }

        /* Mobile */
        @media (max-width: 680px) {
          .layout {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .right-col { position: static; width: 100%; }
          .ring-wrap { width: 140px; height: 140px; }
          .ring-time { font-size: 26px; }
          .ring-idle-num { font-size: 26px; }
          .title { font-size: 24px; }
        }
      `}</style>
    </div>
  );
}
