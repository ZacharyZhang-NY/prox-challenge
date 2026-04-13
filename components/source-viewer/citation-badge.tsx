"use client";

import type { Citation } from "@/lib/schemas/knowledge";

interface CitationBadgeProps {
  citation: Citation;
}

const DOC_LABELS: Record<string, string> = {
  owners_manual: "Owner's Manual",
  quick_start: "Quick Start Guide",
  selection_chart: "Selection Chart",
};

export function CitationBadge({ citation }: CitationBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-accent-secondary/15 border border-accent-secondary/30 rounded-sm">
      <span className="font-mono text-ink-light uppercase" style={{ fontSize: "0.6rem", letterSpacing: "0.1em" }}>
        {DOC_LABELS[citation.docId] ?? citation.docId}
      </span>
      <span className="font-mono text-accent-secondary font-bold" style={{ fontSize: "0.6rem" }}>
        p.{citation.page}
      </span>
    </span>
  );
}
