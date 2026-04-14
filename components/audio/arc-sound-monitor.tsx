"use client";

import { useRef, useEffect, useCallback, useState } from "react";

interface ArcSoundMonitorProps {
  stream: MediaStream | null;
  onSnapshot: (features: AudioFeatures) => void;
}

export interface AudioFeatures {
  peakFrequency: number;
  spectralCentroid: number;
  rmsDb: number;
  lowEnergy: number;
  midEnergy: number;
  highEnergy: number;
  timestamp: number;
}

export function ArcSoundMonitor({ stream, onSnapshot }: ArcSoundMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);
  const [features, setFeatures] = useState<AudioFeatures | null>(null);
  const lastEmitRef = useRef<number>(0);
  const onSnapshotRef = useRef(onSnapshot);
  onSnapshotRef.current = onSnapshot;

  useEffect(() => {
    if (!stream || !canvasRef.current) return;

    const audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);

    audioCtxRef.current = audioCtx;
    analyserRef.current = analyser;

    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const logicalW = 600;
    const logicalH = 120;
    canvas.width = logicalW * dpr;
    canvas.height = logicalH * dpr;
    canvas.style.width = "100%";
    canvas.style.height = `${logicalH}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const w = logicalW;
      const h = logicalH;
      ctx.fillStyle = "#e4e3dc";
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = "rgba(20, 20, 20, 0.06)";
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Draw frequency bars — 0-8kHz range
      const maxBin = Math.floor(8000 / (audioCtx.sampleRate / analyser.fftSize));
      const barCount = Math.min(maxBin, 128);
      const barWidth = w / barCount;
      const step = Math.max(1, Math.floor(maxBin / barCount));

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step];
        const barHeight = (value / 255) * h;
        const intensity = value / 255;

        const r = Math.round(20 + intensity * (250 - 20));
        const g = Math.round(20 + intensity * (106 - 20));
        const b = Math.round(20 + intensity * (37 - 20));

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(i * barWidth, h - barHeight, barWidth - 1, barHeight);
      }

      ctx.fillStyle = "rgba(20, 20, 20, 0.4)";
      ctx.font = "10px 'Space Mono', monospace";
      const freqLabels = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      for (const fl of freqLabels) {
        const x = (fl / 8) * w;
        ctx.fillText(`${fl}k`, x + 2, h - 3);
      }

      // Extract and emit features every 500ms
      const f = extractFeatures(analyser);
      setFeatures(f);
      const now = Date.now();
      if (now - lastEmitRef.current >= 500) {
        lastEmitRef.current = now;
        onSnapshotRef.current(f);
      }
    }

    draw();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      source.disconnect();
      audioCtx.close();
    };
  }, [stream]);

  return (
    <div className="border border-ink/15 rounded-sm overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-ink/10">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
          <span className="font-mono text-ink-light uppercase" style={{ fontSize: "0.6rem", letterSpacing: "0.12em" }}>
            Arc Sound Monitor
          </span>
        </div>
        <span className="font-mono text-accent-secondary uppercase" style={{ fontSize: "0.6rem", letterSpacing: "0.1em" }}>
          Live
        </span>
      </div>

      {/* FFT Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-[120px]"
      />

      {/* Metrics bar */}
      <div className="flex items-center gap-4 px-3 py-1.5 border-t border-ink/10 bg-background">
        <Metric label="PEAK" value={features ? `${features.peakFrequency}Hz` : "—"} />
        <Metric label="RMS" value={features ? `${features.rmsDb.toFixed(1)}dB` : "—"} />
        <Metric label="LOW" value={features ? `${(features.lowEnergy * 100).toFixed(0)}%` : "—"} />
        <Metric label="MID" value={features ? `${(features.midEnergy * 100).toFixed(0)}%` : "—"} />
        <Metric label="HIGH" value={features ? `${(features.highEnergy * 100).toFixed(0)}%` : "—"} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-ink-light" style={{ fontSize: "0.55rem", letterSpacing: "0.1em" }}>
        {label}
      </span>
      <span className="font-mono text-ink" style={{ fontSize: "0.65rem" }}>
        {value}
      </span>
    </div>
  );
}

function extractFeatures(analyser: AnalyserNode): AudioFeatures {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  const sampleRate = analyser.context.sampleRate;
  const binHz = sampleRate / analyser.fftSize;

  // Peak frequency
  let maxVal = 0;
  let maxIdx = 0;
  for (let i = 1; i < bufferLength; i++) {
    if (dataArray[i] > maxVal) {
      maxVal = dataArray[i];
      maxIdx = i;
    }
  }
  const peakFrequency = Math.round(maxIdx * binHz);

  // Spectral centroid
  let weightedSum = 0;
  let totalSum = 0;
  for (let i = 0; i < bufferLength; i++) {
    weightedSum += i * binHz * dataArray[i];
    totalSum += dataArray[i];
  }
  const spectralCentroid = totalSum > 0 ? Math.round(weightedSum / totalSum) : 0;

  // RMS in dB
  const timeData = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(timeData);
  let rmsSum = 0;
  for (let i = 0; i < timeData.length; i++) {
    rmsSum += timeData[i] * timeData[i];
  }
  const rms = Math.sqrt(rmsSum / timeData.length);
  const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -100;

  // Band energy ratios (low: 0-500Hz, mid: 500-2kHz, high: 2k-8kHz)
  const lowEnd = Math.floor(500 / binHz);
  const midEnd = Math.floor(2000 / binHz);
  const highEnd = Math.floor(8000 / binHz);

  let lowSum = 0, midSum = 0, highSum = 0;
  for (let i = 0; i < lowEnd && i < bufferLength; i++) lowSum += dataArray[i];
  for (let i = lowEnd; i < midEnd && i < bufferLength; i++) midSum += dataArray[i];
  for (let i = midEnd; i < highEnd && i < bufferLength; i++) highSum += dataArray[i];

  const bandTotal = lowSum + midSum + highSum || 1;

  return {
    peakFrequency,
    spectralCentroid,
    rmsDb,
    lowEnergy: lowSum / bandTotal,
    midEnergy: midSum / bandTotal,
    highEnergy: highSum / bandTotal,
    timestamp: Date.now(),
  };
}
