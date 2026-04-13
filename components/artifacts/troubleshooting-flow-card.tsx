"use client";

import type { TroubleshootingFlowArtifact } from "@/lib/schemas/response";

interface TroubleshootingFlowCardProps {
  artifact: TroubleshootingFlowArtifact;
}

export function TroubleshootingFlowCard({
  artifact,
}: TroubleshootingFlowCardProps) {
  return (
    <div className="border border-ink/20 rounded-sm overflow-hidden">
      <div className="bg-danger/10 px-4 py-2 border-b border-ink/10 flex items-center justify-between">
        <span className="font-mono text-label uppercase tracking-label text-ink-light">
          Troubleshooting
        </span>
        <span className="font-display text-sm uppercase tracking-heading text-ink truncate ml-2">
          {artifact.symptom}
        </span>
      </div>

      <div className="p-5 bg-background">
        <div className="flex flex-col">
          {artifact.steps.map((step, index) => {
            const isLast = index === artifact.steps.length - 1;
            return (
              <div key={index} className="flex gap-4">
                {/* Left rail: number + connector line */}
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center border-2 border-accent-primary bg-accent-primary/10 shrink-0"
                  >
                    <span className="font-mono text-xs font-bold text-ink">
                      {index + 1}
                    </span>
                  </div>
                  {!isLast && (
                    <div className="w-px flex-1 min-h-4 bg-ink/15" />
                  )}
                </div>

                {/* Right: step content */}
                <div className={isLast ? "pb-0" : "pb-4"}>
                  <div className="font-display text-sm uppercase tracking-heading text-ink leading-7">
                    {step.label}
                  </div>
                  <div className="font-body text-sm text-ink-light mt-0.5 leading-relaxed">
                    {step.action}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
