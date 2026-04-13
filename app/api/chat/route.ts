import { NextRequest } from "next/server";
import { ChatRequestSchema } from "@/lib/schemas/response";
import { runOrchestratorStream } from "@/lib/agent/orchestrator";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = ChatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const { message, image, imageMediaType, conversationHistory } = parsed.data;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }

      runOrchestratorStream(
        { message, image, imageMediaType, conversationHistory },
        {
          onStatus: (text) => send("status", { text }),
          onDelta: (text) => send("delta", { text }),
          onDone: (response) => {
            send("done", response);
            controller.close();
          },
          onError: (error) => {
            send("error", { error });
            controller.close();
          },
        }
      ).catch((err) => {
        const msg = err instanceof Error ? err.message : "Internal error";
        console.error("Chat stream error:", msg);
        send("error", { error: msg });
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
