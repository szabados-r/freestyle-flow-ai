import { useEffect, useRef, useState } from "react";

// Synthesizes a simple loopable boom-bap pattern using Web Audio API,
// and exposes the current beat (0..3) for visual sync.

export interface BeatClock {
  start: () => Promise<void>;
  stop: () => void;
  isPlaying: boolean;
  beat: number; // 0..3 within current bar
  bar: number; // increments every bar
}

export function useBeatClock(bpm: number): BeatClock {
  const [isPlaying, setIsPlaying] = useState(false);
  const [beat, setBeat] = useState(0);
  const [bar, setBar] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const stopFlagRef = useRef(false);
  const startedAtRef = useRef(0);
  const beatDur = 60 / bpm;

  useEffect(() => {
    return () => {
      stopFlagRef.current = true;
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  const playKick = (ctx: AudioContext, t: number) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.22);
  };
  const playSnare = (ctx: AudioContext, t: number) => {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1500;
    const g = ctx.createGain();
    g.gain.value = 0.4;
    src.connect(hp).connect(g).connect(ctx.destination);
    src.start(t);
  };
  const playHat = (ctx: AudioContext, t: number) => {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 6000;
    const g = ctx.createGain();
    g.gain.value = 0.15;
    src.connect(hp).connect(g).connect(ctx.destination);
    src.start(t);
  };

  const start = async () => {
    if (isPlaying) return;
    stopFlagRef.current = false;
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    await ctx.resume();
    setIsPlaying(true);
    const startTime = ctx.currentTime + 0.1;
    startedAtRef.current = startTime;

    // Scheduler loop
    let scheduledUntil = startTime;
    let beatIndex = 0;
    const scheduleAhead = async () => {
      while (!stopFlagRef.current) {
        while (scheduledUntil < ctx.currentTime + 0.3) {
          const t = scheduledUntil;
          const bi = beatIndex % 4;
          if (bi === 0 || bi === 2) playKick(ctx, t);
          if (bi === 1 || bi === 3) playSnare(ctx, t);
          playHat(ctx, t);
          playHat(ctx, t + beatDur / 2);
          scheduledUntil += beatDur;
          beatIndex++;
        }
        await new Promise((r) => setTimeout(r, 50));
      }
    };
    void scheduleAhead();

    // Visual beat tracker
    const visualTick = () => {
      if (stopFlagRef.current || !ctxRef.current) return;
      const elapsed = ctxRef.current.currentTime - startTime;
      const b = Math.max(0, Math.floor(elapsed / beatDur));
      setBeat(b % 4);
      setBar(Math.floor(b / 4));
      requestAnimationFrame(visualTick);
    };
    requestAnimationFrame(visualTick);
  };

  const stop = () => {
    stopFlagRef.current = true;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    setIsPlaying(false);
    setBeat(0);
    setBar(0);
  };

  return { start, stop, isPlaying, beat, bar };
}