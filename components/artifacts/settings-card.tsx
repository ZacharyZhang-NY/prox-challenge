"use client";

import type { SettingsCardArtifact } from "@/lib/schemas/response";

interface SettingsCardProps {
  artifact: SettingsCardArtifact;
}

export function SettingsCard({ artifact }: SettingsCardProps) {
  return (
    <div className="border border-ink/20 rounded-sm overflow-hidden">
      <div className="bg-accent-secondary/10 px-4 py-2 border-b border-ink/10 flex items-center justify-between">
        <span className="font-mono text-label uppercase tracking-label text-ink-light">
          Settings
        </span>
        <span className="font-display text-sm uppercase tracking-heading text-ink">
          {artifact.title}
        </span>
      </div>

      <div className="bg-background">
        {artifact.entries.map((entry, index) => (
          <div
            key={index}
            className={`flex items-center justify-between px-4 py-3 ${
              index < artifact.entries.length - 1
                ? "border-b border-ink/10"
                : ""
            }`}
          >
            <span className="font-mono text-label tracking-label text-ink-light uppercase">
              {entry.label}
            </span>
            <span className="font-display text-base text-ink">
              {entry.value}
            </span>
          </div>
        ))}

        {artifact.notes.length > 0 && (
          <div className="border-t border-ink/10 px-4 py-3">
            {artifact.notes.map((note, i) => (
              <p
                key={i}
                className="font-mono text-label tracking-label text-ink-light"
              >
                {note}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
