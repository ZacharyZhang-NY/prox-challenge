import { ChatShell } from "@/components/chat/chat-shell";

export default function Home() {
  return (
    <div className="flex flex-col h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background border-b border-structural border-ink">
        <div className="h-[60px] flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <svg className="w-7 h-7" viewBox="0 0 512 512" fill="none">
              <rect x="32" y="32" width="448" height="448" stroke="currentColor" strokeWidth="16" fill="none"/>
              <path d="M152 128 L152 384" stroke="currentColor" strokeWidth="40" strokeLinecap="square"/>
              <path d="M152 128 L280 128 Q360 128 360 208 Q360 288 280 288 L152 288" stroke="currentColor" strokeWidth="40" strokeLinecap="square" strokeLinejoin="miter" fill="none"/>
              <circle cx="360" cy="360" r="6" fill="currentColor"/>
              <line x1="360" y1="328" x2="360" y2="344" stroke="currentColor" strokeWidth="8" strokeLinecap="square"/>
              <line x1="360" y1="376" x2="360" y2="392" stroke="currentColor" strokeWidth="8" strokeLinecap="square"/>
              <line x1="328" y1="360" x2="344" y2="360" stroke="currentColor" strokeWidth="8" strokeLinecap="square"/>
              <line x1="376" y1="360" x2="392" y2="360" stroke="currentColor" strokeWidth="8" strokeLinecap="square"/>
              <circle cx="360" cy="360" r="24" stroke="currentColor" strokeWidth="8" fill="none"/>
            </svg>
            <span className="font-display text-xl uppercase tracking-heading text-ink">
              Prox
            </span>
            <span className="font-mono text-label tracking-label text-ink-light uppercase hidden sm:inline">
              Vulcan OmniPro 220
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-label tracking-label text-ink-light uppercase hidden md:inline">
              Multimodal Technical Agent
            </span>
            <div className="w-2 h-2 rounded-full bg-accent-secondary" />
          </div>
        </div>
      </nav>

      {/* Chat */}
      <main className="flex-1 overflow-hidden">
        <ChatShell />
      </main>
    </div>
  );
}
