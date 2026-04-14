"use client";

import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from "react";

export interface WeldInspectorHandle {
  capture: () => string | null;
}

interface WeldInspectorProps {
  stream: MediaStream | null;
}

export const WeldInspector = forwardRef<WeldInspectorHandle, WeldInspectorProps>(
  function WeldInspector({ stream }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [ready, setReady] = useState(false);

    useImperativeHandle(ref, () => ({
      capture: () => {
        const video = videoRef.current;
        if (!video || !ready) return null;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(video, 0, 0);
        return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
      },
    }));

    useEffect(() => {
      if (!stream || !videoRef.current) return;
      const video = videoRef.current;
      video.srcObject = stream;
      video.onloadedmetadata = () => setReady(true);
      return () => {
        video.srcObject = null;
        setReady(false);
      };
    }, [stream]);

    return (
      <div className="border border-ink/15 rounded-sm overflow-hidden bg-background">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-ink/10">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
            <span
              className="font-mono text-ink-light uppercase"
              style={{ fontSize: "0.6rem", letterSpacing: "0.12em" }}
            >
              Weld Inspector
            </span>
          </div>
          <span
            className="font-mono text-accent-secondary uppercase"
            style={{ fontSize: "0.6rem", letterSpacing: "0.1em" }}
          >
            Live
          </span>
        </div>

        {/* Video preview */}
        <div className="relative bg-ink/5">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-[200px] object-cover"
          />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <span className="font-mono text-ink-light" style={{ fontSize: "0.65rem" }}>
                Starting camera...
              </span>
            </div>
          )}
          {/* Crosshair overlay */}
          {ready && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <svg
                width="64"
                height="64"
                viewBox="0 0 64 64"
                fill="none"
                stroke="rgba(250,106,37,0.35)"
                strokeWidth="1"
              >
                <circle cx="32" cy="32" r="22" />
                <circle cx="32" cy="32" r="3" />
                <line x1="32" y1="4" x2="32" y2="14" />
                <line x1="32" y1="50" x2="32" y2="60" />
                <line x1="4" y1="32" x2="14" y2="32" />
                <line x1="50" y1="32" x2="60" y2="32" />
              </svg>
            </div>
          )}
        </div>

        {/* Hint bar */}
        <div className="px-3 py-1.5 border-t border-ink/10">
          <span
            className="font-mono text-ink-light"
            style={{ fontSize: "0.55rem", letterSpacing: "0.08em" }}
          >
            Position camera over weld bead, then capture
          </span>
        </div>
      </div>
    );
  }
);
