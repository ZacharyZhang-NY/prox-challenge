"use client";

import { useState } from "react";
import Image from "next/image";
import type { ManualImageArtifact } from "@/lib/schemas/response";

interface ManualImageCardProps {
  artifact: ManualImageArtifact;
}

export function ManualImageCard({ artifact }: ManualImageCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const imageSrc = `/api/assets/${artifact.assetId}`;

  return (
    <>
      <div className="border-structural border-ink rounded-sm overflow-hidden">
        <div className="bg-accent-secondary/20 px-4 py-2 border-b border-structural border-ink flex items-center justify-between">
          <span className="font-mono text-label uppercase tracking-label text-ink-light">
            Manual Reference
          </span>
          <button
            onClick={() => setIsExpanded(true)}
            className="font-mono text-label tracking-label text-accent-primary hover:text-ink transition-colors uppercase"
          >
            Expand
          </button>
        </div>

        <div className="bg-background p-4">
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full cursor-zoom-in"
          >
            <div className="relative w-full aspect-[4/3] bg-surface rounded-sm overflow-hidden">
              <Image
                src={imageSrc}
                alt={artifact.caption}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </button>
          <p className="font-mono text-label tracking-label text-ink-light mt-3 uppercase">
            {artifact.caption}
          </p>
        </div>
      </div>

      {/* Expanded modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 bg-ink/80 flex items-center justify-center p-4"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="relative bg-background rounded-sm max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-background px-4 py-2 border-b border-structural border-ink flex items-center justify-between z-10">
              <span className="font-mono text-label uppercase tracking-label text-ink-light">
                {artifact.caption}
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                className="font-display text-sm uppercase tracking-heading text-ink hover:text-accent-primary transition-colors"
              >
                Close
              </button>
            </div>
            <div className="p-4">
              <div className="relative w-full" style={{ minHeight: "60vh" }}>
                <Image
                  src={imageSrc}
                  alt={artifact.caption}
                  fill
                  className="object-contain"
                  sizes="90vw"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
