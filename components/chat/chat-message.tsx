"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatResponse } from "@/lib/schemas/response";
import { ArtifactSwitch } from "@/components/artifacts/artifact-switch";
import { CitationBadge } from "@/components/source-viewer/citation-badge";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  response?: ChatResponse;
  statusText?: string;
  imageDataUrl?: string;
}

export function ChatMessage({ role, content, response, statusText, imageDataUrl }: ChatMessageProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-ink text-background px-4 py-3 rounded-sm">
          {imageDataUrl && (
            <img
              src={imageDataUrl}
              alt="Attached"
              className="max-h-48 rounded-sm mb-2 border border-background/20"
            />
          )}
          <p className="font-body text-sm leading-relaxed">{content}</p>
        </div>
      </div>
    );
  }

  const displayText = response?.answer ?? content;
  const isEmpty = !displayText.trim();

  return (
    <div className="flex flex-col gap-4 max-w-full">
      {/* Answer text */}
      <div className="bg-surface border border-structural border-ink/10 px-5 py-4 rounded-sm prose prose-sm max-w-none text-ink">
        {isEmpty && statusText ? (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-pulse" />
              <span className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
              <span className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
            </div>
            <span className="font-mono text-label tracking-label text-ink-light uppercase">
              {statusText}
            </span>
          </div>
        ) : (
          <Markdown remarkPlugins={[remarkGfm]}>{displayText}</Markdown>
        )}
      </div>

      {/* Artifact visualizations */}
      {response?.artifacts && response.artifacts.map((art, i) => (
        <ArtifactSwitch key={i} artifact={art} />
      ))}

      {/* Clarification */}
      {response?.clarification && (
        <div className="bg-accent-primary/10 border border-accent-primary/20 px-4 py-3 rounded-sm">
          <p className="font-body text-sm text-ink">
            {response.clarification.question}
          </p>
          {response.clarification.options && (
            <div className="flex flex-wrap gap-2 mt-2">
              {response.clarification.options.map((option, i) => (
                <span
                  key={i}
                  className="font-mono text-label tracking-label px-2 py-1 bg-background border border-ink/10 rounded-sm text-ink"
                >
                  {option}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Citations */}
      {response?.citations && response.citations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {response.citations.map((citation, index) => (
            <CitationBadge key={index} citation={citation} />
          ))}
        </div>
      )}
    </div>
  );
}
