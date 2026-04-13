"use client";

interface SessionMeta {
  id: string;
  title: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
}

interface SessionSidebarProps {
  sessions: SessionMeta[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function SessionSidebar({
  sessions,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: SessionSidebarProps) {
  return (
    <div className="flex flex-col h-full bg-background border-r border-ink/10">
      {/* New chat button */}
      <div className="p-3 border-b border-ink/10">
        <button
          onClick={onNew}
          className="w-full h-9 flex items-center justify-center gap-2 bg-ink text-background font-mono text-label tracking-label uppercase rounded-sm hover:bg-accent-primary hover:text-ink transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-1">
        {sessions.length === 0 && (
          <div className="px-3 py-6 text-center">
            <span className="font-mono text-label tracking-label text-ink-light uppercase">
              No sessions
            </span>
          </div>
        )}
        {sessions.map((session) => {
          const isActive = session.id === activeId;
          return (
            <div
              key={session.id}
              className={`group flex items-center gap-1 mx-1.5 my-0.5 rounded-sm cursor-pointer transition-colors ${
                isActive ? "bg-ink/8" : "hover:bg-ink/4"
              }`}
            >
              <button
                onClick={() => onSelect(session.id)}
                className="flex-1 min-w-0 px-3 py-2.5 text-left"
              >
                <div className="font-body text-sm text-ink truncate">
                  {session.title}
                </div>
                <div
                  className="font-mono text-ink-light mt-0.5"
                  style={{ fontSize: "0.55rem", letterSpacing: "0.08em" }}
                >
                  {session.messageCount} messages
                </div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(session.id);
                }}
                className="shrink-0 p-1.5 mr-1.5 opacity-0 group-hover:opacity-100 text-ink-light hover:text-danger transition-all"
                title="Delete session"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
