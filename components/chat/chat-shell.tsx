"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { ChatResponse } from "@/lib/schemas/response";
import { ChatMessage } from "./chat-message";
import { PromptSuggestions } from "./prompt-suggestions";
import { UploadInput } from "./upload-input";
import { SessionSidebar } from "./session-sidebar";
import { ArcSoundMonitor, type AudioFeatures } from "@/components/audio/arc-sound-monitor";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: ChatResponse;
  imageDataUrl?: string;
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [arcMode, setArcMode] = useState(false);
  const [arcStream, setArcStream] = useState<MediaStream | null>(null);
  const [arcAnalyzing, setArcAnalyzing] = useState(false);
  const arcFeaturesRef = useRef<AudioFeatures[]>([]);

  // Auto-open sidebar on desktop, keep closed on mobile
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setSidebarOpen(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSidebarOpen(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
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
        imageDataUrl: imageData
          ? `data:${imageData.mediaType};base64,${imageData.base64}`
          : undefined,
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

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(",")[1];
            setImageData({ base64, mediaType: file.type });
          };
          reader.readAsDataURL(file);
          return;
        }
      }
    },
    []
  );

  const toggleArcMode = useCallback(async () => {
    if (arcMode) {
      arcStream?.getTracks().forEach((t) => t.stop());
      setArcStream(null);
      setArcMode(false);
      setArcAnalyzing(false);
      arcFeaturesRef.current = [];
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Microphone access requires HTTPS or localhost.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setArcStream(stream);
      setArcMode(true);
    } catch (err) {
      const e = err instanceof DOMException ? err : new Error(String(err));
      console.error("Microphone access failed:", e.name, e.message);
      alert(
        `Microphone error: ${e.name}\n${e.message}\n\n` +
        "Troubleshooting:\n" +
        "1. Check if another app is using the microphone\n" +
        "2. Try chrome://settings/content/microphone and ensure the correct device is selected\n" +
        "3. Try a different browser (Edge/Firefox)"
      );
    }
  }, [arcMode, arcStream]);

  const arcIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  const handleArcSnapshot = useCallback((features: AudioFeatures) => {
    arcFeaturesRef.current.push(features);
    // Keep a rolling window of last 60 seconds (~120 samples at 500ms)
    if (arcFeaturesRef.current.length > 120) {
      arcFeaturesRef.current = arcFeaturesRef.current.slice(-120);
    }
  }, []);

  const flushArcAnalysis = useCallback(() => {
    const samples = arcFeaturesRef.current;
    if (samples.length === 0) return;
    const avg = {
      peakFrequency: Math.round(samples.reduce((s, f) => s + f.peakFrequency, 0) / samples.length),
      spectralCentroid: Math.round(samples.reduce((s, f) => s + f.spectralCentroid, 0) / samples.length),
      rmsDb: +(samples.reduce((s, f) => s + f.rmsDb, 0) / samples.length).toFixed(1),
      lowEnergy: +(samples.reduce((s, f) => s + f.lowEnergy, 0) / samples.length * 100).toFixed(1),
      midEnergy: +(samples.reduce((s, f) => s + f.midEnergy, 0) / samples.length * 100).toFixed(1),
      highEnergy: +(samples.reduce((s, f) => s + f.highEnergy, 0) / samples.length * 100).toFixed(1),
      sampleCount: samples.length,
      durationMs: samples.length > 1 ? samples[samples.length - 1].timestamp - samples[0].timestamp : 0,
    };
    // Clear buffer for next window
    arcFeaturesRef.current = [];
    const analysisMessage =
      `[Arc Sound Analysis — ${avg.durationMs}ms, ${avg.sampleCount} samples]\n` +
      `Peak frequency: ${avg.peakFrequency}Hz | Spectral centroid: ${avg.spectralCentroid}Hz\n` +
      `RMS level: ${avg.rmsDb}dB\n` +
      `Band energy — Low(0-500Hz): ${avg.lowEnergy}%, Mid(500-2kHz): ${avg.midEnergy}%, High(2k-8kHz): ${avg.highEnergy}%\n\n` +
      `REFERENCE RANGES FOR REAL WELDING:\n` +
      `- Active arc RMS: -25 to -5 dB (loud continuous noise)\n` +
      `- Active arc peak freq: 200-2000 Hz with broad spectral energy\n` +
      `- Active arc high band: typically >30% (crackling/hiss)\n` +
      `- Ambient/non-welding: RMS below -35 dB, narrow spectrum\n\n` +
      `IMPORTANT: First determine if this audio is actually from an active welding arc based on the reference ranges above. ` +
      `If RMS is below -35 dB or the spectrum does not match welding characteristics, clearly state that NO active welding arc is detected and the recording appears to be ambient noise, speech, or other non-welding audio. ` +
      `Only provide welding diagnostics if the readings are consistent with an actual welding arc.`;
    sendMessageRef.current(analysisMessage);
  }, []);

  const toggleArcAnalysis = useCallback(() => {
    if (arcAnalyzing) {
      // Stop continuous analysis
      if (arcIntervalRef.current) {
        clearInterval(arcIntervalRef.current);
        arcIntervalRef.current = null;
      }
      setArcAnalyzing(false);
      return;
    }
    // Start continuous analysis: flush every 5 seconds
    arcFeaturesRef.current = [];
    setArcAnalyzing(true);
    // First flush after 5s, then every 5s
    arcIntervalRef.current = setInterval(() => {
      flushArcAnalysis();
    }, 5000);
  }, [arcAnalyzing, flushArcAnalysis]);

  // Cleanup interval on unmount or arc mode off
  useEffect(() => {
    return () => {
      if (arcIntervalRef.current) {
        clearInterval(arcIntervalRef.current);
        arcIntervalRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex h-full">
      {/* Sidebar — overlay on mobile, inline on desktop */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink/30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-60 md:static md:z-auto shrink-0">
            <SessionSidebar
              sessions={sessions}
              activeId={activeId}
              onSelect={(id) => {
                switchToSession(id);
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
              onNew={async () => {
                await handleNewSession();
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
              onDelete={handleDeleteSession}
            />
          </div>
        </>
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

        {/* Arc Sound Monitor panel */}
        {arcMode && (
          <div className="px-4 pt-4 shrink-0">
            <div className="max-w-3xl mx-auto">
              <ArcSoundMonitor stream={arcStream} onSnapshot={handleArcSnapshot} />
            </div>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto">
            {messages.length === 0 && !arcMode ? (
              <PromptSuggestions onSelect={(prompt) => sendMessage(prompt)} />
            ) : (
              <div className="flex flex-col gap-6">
                {messages.map((msg, idx) => (
                  <ChatMessage
                    key={msg.id}
                    role={msg.role}
                    content={msg.content}
                    response={msg.response}
                    imageDataUrl={msg.imageDataUrl}
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
        <div className="border-t border-ink/10 bg-surface px-4">
          <div className="max-w-3xl mx-auto">
            {/* Toolbar */}
            <div className="flex items-center gap-2 py-2">
              <button
                type="button"
                onClick={toggleArcMode}
                className={`h-10 flex items-center gap-1.5 px-3 border rounded-sm font-mono uppercase transition-colors ${
                  arcMode
                    ? "bg-accent-primary/15 border-accent-primary/30 text-accent-primary"
                    : "border-ink/10 text-ink-light hover:border-ink/30 hover:text-ink"
                }`}
                style={{ fontSize: "0.6rem", letterSpacing: "0.1em" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 12h4l3-9 6 18 3-9h4" />
                </svg>
                Arc Sound
              </button>
            </div>

            {/* Input row */}
            <div className="py-2.5">
              {arcMode ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleArcAnalysis}
                    disabled={isLoading}
                    className={`flex-1 h-10 font-display text-sm uppercase tracking-heading rounded-sm transition-all duration-200 ${
                      arcAnalyzing
                        ? "bg-accent-primary text-background animate-pulse"
                        : "bg-ink text-background hover:bg-accent-primary hover:text-ink"
                    } disabled:cursor-not-allowed`}
                  >
                    {arcAnalyzing ? "Analyzing..." : "Start Analysis"}
                  </button>
                  <button
                    onClick={() => {
                      if (arcAnalyzing) toggleArcAnalysis();
                      toggleArcMode();
                    }}
                    className="h-10 px-4 border border-ink/20 text-ink font-display text-sm uppercase tracking-heading rounded-sm hover:bg-ink/5 transition-colors shrink-0"
                  >
                    Exit
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="flex items-center gap-3"
                >
                  <UploadInput
                    onImageSelect={(base64, mediaType) => setImageData({ base64, mediaType })}
                    onImageClear={() => setImageData(null)}
                    hasImage={!!imageData}
                  />
                  <div className="flex-1">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onPaste={handlePaste}
                      placeholder="Ask about the OmniPro 220..."
                      disabled={isLoading}
                      rows={1}
                      className="block w-full h-10 resize-none overflow-hidden bg-background border border-ink/10 rounded-sm px-4 font-body text-sm text-ink placeholder:text-ink-light focus:outline-none focus:border-ink/30 transition-colors disabled:opacity-50 leading-10"
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
