"use client";

import type { WeldConfiguratorArtifact } from "@/lib/schemas/response";

interface WeldConfiguratorCardProps {
  artifact: WeldConfiguratorArtifact;
}

const PROCESS_LABELS: Record<string, string> = {
  mig: "MIG",
  flux_core: "Flux-Cored",
  tig: "TIG",
  stick: "Stick",
};

function ParamRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-ink/8">
      <span className="font-mono text-label tracking-label text-ink-light uppercase">
        {label}
      </span>
      <span className={`font-display text-base ${accent ? "text-accent-primary" : "text-ink"}`}>
        {value}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pt-4 pb-1.5">
      <span className="font-mono text-ink-light uppercase" style={{ fontSize: "0.55rem", letterSpacing: "0.15em" }}>
        {children}
      </span>
    </div>
  );
}

export function WeldConfiguratorCard({ artifact }: WeldConfiguratorCardProps) {
  const isMigLike = artifact.process === "mig" || artifact.process === "flux_core";
  const isTig = artifact.process === "tig";
  const isStick = artifact.process === "stick";

  return (
    <div className="border border-ink/20 rounded-sm overflow-hidden">
      {/* Header */}
      <div className="bg-accent-primary/10 px-4 py-2 border-b border-ink/10 flex items-center justify-between">
        <span className="font-mono text-label uppercase tracking-label text-ink-light">
          Weld Configurator
        </span>
        <span className="font-display text-sm uppercase tracking-heading text-ink">
          {PROCESS_LABELS[artifact.process] ?? artifact.process}
        </span>
      </div>

      <div className="bg-background">
        {/* Top badge: material + thickness */}
        <div className="px-4 pt-5 pb-3 text-center">
          <span className="font-display text-2xl tracking-heading uppercase text-ink">
            {artifact.material}
          </span>
          <span className="font-display text-2xl tracking-heading text-accent-primary ml-3">
            {artifact.thickness}
          </span>
        </div>

        {/* Power section */}
        <SectionLabel>Power</SectionLabel>
        <ParamRow label="Amperage" value={artifact.amperageRange} accent />
        <ParamRow label="Input Voltage" value={artifact.voltageRange} />
        <ParamRow label="Polarity" value={artifact.polarity} />

        {/* Wire / Electrode section */}
        <SectionLabel>{isTig ? "Tungsten & Filler" : isStick ? "Electrode" : "Wire"}</SectionLabel>
        {isMigLike && (
          <>
            <ParamRow label="Wire Size" value={artifact.wireSize} />
            {artifact.wireSpeedRange && (
              <ParamRow label="Wire Speed" value={artifact.wireSpeedRange} accent />
            )}
            {artifact.stickout && (
              <ParamRow label="Stickout" value={artifact.stickout} />
            )}
          </>
        )}
        {isTig && (
          <>
            {artifact.tungstenSize && (
              <ParamRow label="Tungsten" value={artifact.tungstenSize} />
            )}
            {artifact.fillerRod && (
              <ParamRow label="Filler Rod" value={artifact.fillerRod} />
            )}
          </>
        )}
        {isStick && (
          <>
            {artifact.electrodeType && (
              <ParamRow label="Type" value={artifact.electrodeType} />
            )}
            {artifact.electrodeSize && (
              <ParamRow label="Size" value={artifact.electrodeSize} />
            )}
          </>
        )}

        {/* Gas section */}
        <SectionLabel>Shielding Gas</SectionLabel>
        <ParamRow label="Gas" value={artifact.shieldingGas} />
        <ParamRow label="Flow Rate" value={artifact.gasFlow} />

        {/* Notes */}
        {artifact.notes.length > 0 && (
          <div className="border-t border-ink/10 mt-1 px-4 py-3 flex flex-col gap-1">
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
