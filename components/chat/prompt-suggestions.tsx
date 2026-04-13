"use client";

interface PromptSuggestionsProps {
  onSelect: (prompt: string) => void;
}

const SUGGESTIONS = [
  {
    label: "Polarity",
    prompt: "What polarity should I use for flux-core welding?",
  },
  {
    label: "Duty Cycle",
    prompt: "What duty cycle do I get at 200A on 240V MIG?",
  },
  {
    label: "Troubleshooting",
    prompt: "Why do I have porosity in my weld?",
  },
  {
    label: "Controls",
    prompt: "Show me the front panel controls.",
  },
  {
    label: "Stick Setup",
    prompt: "How do I set up stick welding?",
  },
];

export function PromptSuggestions({ onSelect }: PromptSuggestionsProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-12">
      <div className="text-center">
        <h2 className="font-display text-2xl uppercase tracking-heading text-ink">
          Vulcan OmniPro 220
        </h2>
        <p className="font-mono text-label tracking-label text-ink-light uppercase mt-2">
          Technical Support Agent
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 w-full max-w-lg">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion.label}
            onClick={() => onSelect(suggestion.prompt)}
            className="group flex items-center gap-3 px-4 py-3 bg-surface border border-structural border-ink/20 rounded-sm hover:bg-ink hover:text-background transition-all duration-200 text-left"
          >
            <span className="font-mono text-label tracking-label uppercase text-ink-light group-hover:text-background/60 shrink-0 w-28">
              {suggestion.label}
            </span>
            <span className="font-body text-sm text-ink group-hover:text-background">
              {suggestion.prompt}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
