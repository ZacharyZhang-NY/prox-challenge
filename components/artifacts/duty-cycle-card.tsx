"use client";

import type { DutyCycleArtifact } from "@/lib/schemas/response";

interface DutyCycleCardProps {
  artifact: DutyCycleArtifact;
}

const PROCESS_LABELS: Record<string, string> = {
  mig: "MIG",
  tig: "TIG",
  stick: "Stick",
};

export function DutyCycleCard({ artifact }: DutyCycleCardProps) {
  const weldPercent = artifact.ratedDutyCycle;
  const coolPercent = 100 - weldPercent;
  const { weldMinutes, coolMinutes } = artifact.tenMinuteWindow;

  return (
    <div className="border border-ink/20 rounded-sm overflow-hidden">
      <div className="bg-accent-primary/10 px-4 py-2 border-b border-ink/10 flex items-center justify-between">
        <span className="font-mono text-label uppercase tracking-label text-ink-light">
          Duty Cycle
        </span>
        <span className="font-display text-sm uppercase tracking-heading text-ink">
          {PROCESS_LABELS[artifact.process] ?? artifact.process} &middot;{" "}
          {artifact.inputVoltage}V
        </span>
      </div>

      <div className="p-6 bg-background">
        <div className="flex flex-col gap-5">
          {/* Main stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="font-display text-3xl text-ink">
                {artifact.amps}
                <span className="text-base text-ink-light">A</span>
              </div>
              <div className="font-mono text-label tracking-label text-ink-light uppercase mt-1">
                Output
              </div>
            </div>
            <div>
              <div className="font-display text-3xl text-accent-primary">
                {weldPercent}
                <span className="text-base text-ink-light">%</span>
              </div>
              <div className="font-mono text-label tracking-label text-ink-light uppercase mt-1">
                Duty Cycle
              </div>
            </div>
            <div>
              <div className="font-display text-3xl text-ink">
                {artifact.inputVoltage}
                <span className="text-base text-ink-light">V</span>
              </div>
              <div className="font-mono text-label tracking-label text-ink-light uppercase mt-1">
                Input
              </div>
            </div>
          </div>

          {/* 10-minute cycle bar */}
          <div>
            <div className="font-mono text-label tracking-label text-ink-light uppercase mb-2">
              10-Minute Window
            </div>
            <div className="relative h-10 flex rounded-sm overflow-hidden border border-ink/20">
              <div
                className="bg-accent-primary flex items-center justify-center transition-all"
                style={{ width: `${weldPercent}%` }}
              >
                <span className="font-mono text-xs font-bold text-ink">
                  WELD {weldMinutes}m
                </span>
              </div>
              <div
                className="bg-accent-secondary/30 flex items-center justify-center"
                style={{ width: `${coolPercent}%` }}
              >
                <span className="font-mono text-xs text-ink-light">
                  COOL {coolMinutes}m
                </span>
              </div>
            </div>

            {/* Minute markers */}
            <div className="flex justify-between mt-1">
              {Array.from({ length: 11 }, (_, i) => (
                <span
                  key={i}
                  className="font-mono text-ink-light"
                  style={{ fontSize: "0.55rem" }}
                >
                  {i}
                </span>
              ))}
            </div>
          </div>

          {/* Continuous rating */}
          {artifact.continuousAmps && (
            <div className="border-t border-ink/10 pt-3 flex items-center justify-between">
              <span className="font-mono text-label tracking-label text-ink-light uppercase">
                100% Continuous Rating
              </span>
              <span className="font-display text-lg text-accent-secondary">
                {artifact.continuousAmps}A
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
