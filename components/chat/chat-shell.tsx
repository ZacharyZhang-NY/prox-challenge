"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { ChatResponse } from "@/lib/schemas/response";
import { ChatMessage } from "./chat-message";
import { PromptSuggestions } from "./prompt-suggestions";
import { UploadInput } from "./upload-input";
import { SessionSidebar } from "./session-sidebar";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: ChatResponse;
}

interface SessionMeta {
  id: string;
  title: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
}

export function ChatShell() {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [imageData, setImageData] = useState<{
    base64: string;
    mediaType: string;
  } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchSessions = useCallback(async () => {
    const res = await fetch("/api/sessions");
    if (res.ok) setSessions(await res.json());
  }, []);

  const fetchMessages = useCallback(async (id: string) => {
    const res = await fetch(`/api/sessions/${id}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? []);
    }
  }, []);

  // Load sessions on mount
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const switchToSession = useCallback(
    async (id: string) => {
      setActiveId(id);
      setInput("");
      setImageData(null);
      await fetchMessages(id);
    },
    [fetchMessages]
  );

  const handleNewSession = useCallback(async () => {
    const res = await fetch("/api/sessions", { method: "POST" });
    if (res.ok) {
      const session = await res.json();
      setActiveId(session.id);
      setMessages([]);
      setInput("");
      setImageData(null);
      await fetchSessions();
    }
  }, [fetchSessions]);

  const handleDeleteSession = useCallback(
    async (id: string) => {
      await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      await fetchSessions();
      if (id === activeId) {
        setActiveId(null);
        setMessages([]);
      }
    },
    [activeId, fetchSessions]
  );

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  const persistMessages = useCallback(
    async (sessionId: string, msgs: Message[], firstUserText?: string) => {
      const body: Record<string, unknown> = { messages: msgs };
      if (firstUserText) {
        const title =
          firstUserText.length <= 40
            ? firstUserText
            : firstUserText.slice(0, 37) + "...";
        body.title = title;
      }
      await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await fetchSessions();
    },
    [fetchSessions]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      // Auto-create session if none active
      let currentId = activeId;
      if (!currentId) {
        const res = await fetch("/api/sessions", { method: "POST" });
        if (!res.ok) return;
        const session = await res.json();
        currentId = session.id as string;
        setActiveId(currentId);
        await fetchSessions();
      }

      const userMessage: Message = {
        id: `user_${Date.now()}`,
        role: "user",
        content: text,
      };

      const updated = [...messages, userMessage];
      setMessages(updated);
      setInput("");
      setIsLoading(true);
      scrollToBottom();

      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content:
          m.role === "assistant" ? (m.response?.answer ?? m.content) : m.content,
      }));

      const asstId = `asst_${Date.now()}`;
      // Add placeholder assistant message for streaming
      const withPlaceholder = [
        ...updated,
        { id: asstId, role: "assistant" as const, content: "" },
      ];
      setMessages(withPlaceholder);
      setStatusText("Thinking");

      try {
        const body: Record<string, unknown> = {
          message: text,
          conversationHistory,
        };
        if (imageData) {
          body.image = imageData.base64;
          body.imageMediaType = imageData.mediaType;
        }

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errBody = await res.text();
          let errMsg = `HTTP ${res.status}`;
          try {
            const parsed = JSON.parse(errBody);
            if (parsed.error) errMsg = parsed.error;
          } catch { /* use default */ }
          throw new Error(errMsg);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let streamedText = "";
        let finalResponse: ChatResponse | null = null;
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let currentEvent = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ") && currentEvent) {
              try {
                const payload = JSON.parse(line.slice(6));
                if (currentEvent === "status") {
                  setStatusText(payload.text ?? "");
                } else if (currentEvent === "delta") {
                  streamedText += payload.text ?? "";
                  setStatusText("");
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === asstId ? { ...m, content: streamedText } : m
                    )
                  );
                  scrollToBottom();
                } else if (currentEvent === "done") {
                  finalResponse = payload as ChatResponse;
                } else if (currentEvent === "error") {
                  throw new Error(payload.error ?? "Stream error");
                }
              } catch (e) {
                if (e instanceof Error && e.message === "Stream error") throw e;
              }
              currentEvent = "";
            }
          }
        }

        // Apply final parsed response with artifacts/citations
        if (finalResponse) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asstId
                ? { ...m, content: (finalResponse as ChatResponse).answer, response: finalResponse as ChatResponse }
                : m
            )
          );
        }

        setImageData(null);

        // Persist
        const finalMessages = finalResponse
          ? [
              ...updated,
              {
                id: asstId,
                role: "assistant" as const,
                content: (finalResponse as ChatResponse).answer,
                response: finalResponse as ChatResponse,
              },
            ]
          : [...updated, { id: asstId, role: "assistant" as const, content: streamedText }];

        const isFirstExchange = messages.length === 0;
        await persistMessages(
          currentId,
          finalMessages,
          isFirstExchange ? text : undefined
        );
      } catch (error) {
        const errorText =
          error instanceof Error ? error.message : "An error occurred";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === asstId ? { ...m, content: errorText } : m
          )
        );
        await persistMessages(currentId, [
          ...updated,
          { id: asstId, role: "assistant" as const, content: errorText },
        ]);
      } finally {
        setIsLoading(false);
        setStatusText("");
        scrollToBottom();
      }
    },
    [isLoading, messages, imageData, activeId, scrollToBottom, fetchSessions, persistMessages]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      sendMessage(input);
    },
    [input, sendMessage]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input);
      }
    },
    [input, sendMessage]
  );

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-60 shrink-0">
          <SessionSidebar
            sessions={sessions}
            activeId={activeId}
            onSelect={switchToSession}
            onNew={handleNewSession}
            onDelete={handleDeleteSession}
          />
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sidebar toggle */}
        <div className="h-9 flex items-center px-3 border-b border-ink/5 shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1 text-ink-light hover:text-ink transition-colors"
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto">
            {messages.length === 0 ? (
              <PromptSuggestions onSelect={(prompt) => sendMessage(prompt)} />
            ) : (
              <div className="flex flex-col gap-6">
                {messages.map((msg, idx) => (
                  <ChatMessage
                    key={msg.id}
                    role={msg.role}
                    content={msg.content}
                    response={msg.response}
                    statusText={
                      isLoading && idx === messages.length - 1 && msg.role === "assistant"
                        ? statusText
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-ink/10 bg-surface px-4 py-3">
          <form
            onSubmit={handleSubmit}
            className="max-w-3xl mx-auto flex items-center gap-3"
          >
            <UploadInput
              onImageSelect={(base64, mediaType) => setImageData({ base64, mediaType })}
              onImageClear={() => setImageData(null)}
              hasImage={!!imageData}
            />
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about the OmniPro 220..."
                disabled={isLoading}
                rows={1}
                className="w-full h-10 resize-none bg-background border border-ink/10 rounded-sm px-4 font-body text-sm text-ink placeholder:text-ink-light focus:outline-none focus:border-ink/30 transition-colors disabled:opacity-50 leading-10"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="h-10 px-4 bg-ink text-background font-display text-sm uppercase tracking-heading rounded-sm hover:bg-accent-primary hover:text-ink transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
