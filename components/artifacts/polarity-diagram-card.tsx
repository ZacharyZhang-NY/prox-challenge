"use client";

import type { PolarityDiagramArtifact } from "@/lib/schemas/response";

interface PolarityDiagramCardProps {
  artifact: PolarityDiagramArtifact;
}

const PROCESS_LABELS: Record<string, string> = {
  mig: "MIG (Solid Core)",
  flux_core: "Flux-Cored",
  tig: "TIG",
  stick: "Stick",
};

const POS = "#fa6a25";
const NEG = "#6b9f74";
const INK = "#141414";
const INK_LIGHT = "rgba(20,20,20,0.45)";
const BG = "#e4e3dc";

export function PolarityDiagramCard({ artifact }: PolarityDiagramCardProps) {
  const isDCEP = artifact.currentType === "DCEP";

  // Layout constants — all coordinates in one place
  const W = 500;
  const cx1 = 130; // positive terminal x
  const cx2 = 370; // negative terminal x
  const welderY = 24;
  const welderH = 52;
  const termLabelY = welderY + welderH + 16;
  const termY = termLabelY + 20;
  const termR = 16;
  const lineStartY = termY + termR + 2;
  const lineEndY = lineStartY + 50;
  const boxY = lineEndY + 4;
  const boxH = 30;
  const boxW = 180;
  const totalH = boxY + boxH + 12;

  return (
    <div className="border border-ink/20 rounded-sm overflow-hidden">
      <div className="bg-accent-secondary/10 px-4 py-2 border-b border-ink/10 flex items-center justify-between">
        <span className="font-mono text-label uppercase tracking-label text-ink-light">
          Polarity Diagram
        </span>
        <span className="font-display text-sm uppercase tracking-heading text-ink">
          {PROCESS_LABELS[artifact.process] ?? artifact.process}
        </span>
      </div>

      <div className="p-5 bg-background">
        {/* Current type badge */}
        <div className="text-center mb-3">
          <span className="font-display text-xl tracking-heading uppercase text-ink">
            {artifact.currentType}
          </span>
          <span className="font-mono text-label tracking-label text-ink-light uppercase ml-2">
            {isDCEP ? "Electrode Positive" : "Electrode Negative"}
          </span>
        </div>

        {/* Pure SVG diagram */}
        <svg
          viewBox={`0 0 ${W} ${totalH}`}
          className="w-full max-w-sm mx-auto block"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <marker id="arr-pos" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
              <path d="M0,0 L7,2.5 L0,5" fill="none" stroke={POS} strokeWidth="1.2" />
            </marker>
            <marker id="arr-neg" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
              <path d="M0,0 L7,2.5 L0,5" fill="none" stroke={NEG} strokeWidth="1.2" />
            </marker>
          </defs>

          {/* Welder body */}
          <rect
            x={(W - 160) / 2} y={welderY} width={160} height={welderH}
            rx={4} fill={BG} stroke={INK} strokeWidth={1.5}
          />
          <text
            x={W / 2} y={welderY + 22} textAnchor="middle"
            fontSize="12" fontWeight="600" fill={INK} fontFamily="'Oswald Variable', Oswald, sans-serif"
            letterSpacing="0.04em"
          >
            OMNIPRO 220
          </text>
          <text
            x={W / 2} y={welderY + 40} textAnchor="middle"
            fontSize="8" fill={INK_LIGHT} fontFamily="'Space Mono', monospace"
            letterSpacing="0.15em"
          >
            VULCAN
          </text>

          {/* Terminal labels */}
          <text
            x={cx1} y={termLabelY} textAnchor="middle"
            fontSize="7" fill={INK_LIGHT} fontFamily="'Space Mono', monospace"
            letterSpacing="0.1em"
          >
            POSITIVE (+)
          </text>
          <text
            x={cx2} y={termLabelY} textAnchor="middle"
            fontSize="7" fill={INK_LIGHT} fontFamily="'Space Mono', monospace"
            letterSpacing="0.1em"
          >
            NEGATIVE (-)
          </text>

          {/* Positive terminal circle */}
          <circle cx={cx1} cy={termY} r={termR} fill={`${POS}20`} stroke={POS} strokeWidth={2} />
          <text
            x={cx1} y={termY + 5} textAnchor="middle"
            fontSize="16" fontWeight="700" fill={POS} fontFamily="'Oswald Variable', Oswald, sans-serif"
          >
            +
          </text>

          {/* Negative terminal circle */}
          <circle cx={cx2} cy={termY} r={termR} fill={`${NEG}20`} stroke={NEG} strokeWidth={2} />
          <text
            x={cx2} y={termY + 5} textAnchor="middle"
            fontSize="16" fontWeight="700" fill={NEG} fontFamily="'Oswald Variable', Oswald, sans-serif"
          >
            &#8211;
          </text>

          {/* Connection lines with arrows */}
          <line
            x1={cx1} y1={lineStartY} x2={cx1} y2={lineEndY}
            stroke={POS} strokeWidth={2} strokeDasharray="5 3"
            markerEnd="url(#arr-pos)"
          />
          <line
            x1={cx2} y1={lineStartY} x2={cx2} y2={lineEndY}
            stroke={NEG} strokeWidth={2} strokeDasharray="5 3"
            markerEnd="url(#arr-neg)"
          />

          {/* Lead boxes — same size, centered under each terminal */}
          <rect
            x={cx1 - boxW / 2} y={boxY} width={boxW} height={boxH}
            rx={3} fill={`${POS}0a`} stroke={POS} strokeWidth={1.5}
          />
          <text
            x={cx1} y={boxY + boxH / 2 + 4} textAnchor="middle"
            fontSize="9" fill={INK} fontFamily="'Space Mono', monospace"
          >
            {artifact.positiveLead}
          </text>

          <rect
            x={cx2 - boxW / 2} y={boxY} width={boxW} height={boxH}
            rx={3} fill={`${NEG}0a`} stroke={NEG} strokeWidth={1.5}
          />
          <text
            x={cx2} y={boxY + boxH / 2 + 4} textAnchor="middle"
            fontSize="9" fill={INK} fontFamily="'Space Mono', monospace"
          >
            {artifact.negativeLead}
          </text>
        </svg>

        {/* Notes */}
        {artifact.notes.length > 0 && (
          <div className="border-t border-ink/10 mt-4 pt-3 flex flex-col gap-1">
            {artifact.notes.map((note, i) => (
              <p key={i} className="font-mono text-xs text-ink-light leading-relaxed">
                {note}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
