import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, IMAGE_PROMPT_ADDENDUM } from "./system-prompt";
import {
  TOOL_DEFINITIONS,
  executeLookupFact,
  executeSearchManual,
  executeGetVisualAsset,
} from "./tools";
import { ChatResponseSchema } from "@/lib/schemas/response";
import type { ChatResponse } from "@/lib/schemas/response";

const getClient = (() => {
  let client: Anthropic | null = null;
  return () => {
    if (!client) {
      client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseURL: process.env.BASE_URL || undefined,
        timeout: 10 * 60 * 1000,
      });
    }
    return client;
  };
})();

function getModelName(): string {
  return process.env.MODEL_NAME || "claude-sonnet-4-6";
}

function getMaxOutputTokens(): number {
  const raw = parseInt(process.env.MAX_OUTPUT_TOKENS || "4096", 10);
  return Math.min(raw, 8192);
}

export interface OrchestratorInput {
  message: string;
  image?: string;
  imageMediaType?: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

interface StreamCallbacks {
  onStatus: (text: string) => void;
  onDelta: (text: string) => void;
  onDone: (response: ChatResponse) => void;
  onError: (error: string) => void;
}

const TOOL_LABELS: Record<string, string> = {
  lookup_fact: "Looking up facts",
  search_manual: "Searching manual",
  get_visual_asset: "Finding visuals",
};

function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>
): string {
  switch (toolName) {
    case "lookup_fact":
      return executeLookupFact(
        toolInput as Parameters<typeof executeLookupFact>[0]
      );
    case "search_manual":
      return executeSearchManual(
        toolInput as Parameters<typeof executeSearchManual>[0]
      );
    case "get_visual_asset":
      return executeGetVisualAsset(
        toolInput as Parameters<typeof executeGetVisualAsset>[0]
      );
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

function buildUserContent(
  input: OrchestratorInput
): Anthropic.MessageCreateParams["messages"][0]["content"] {
  const content: Array<Anthropic.ContentBlockParam> = [];

  if (input.image && input.imageMediaType) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: input.imageMediaType,
        data: input.image,
      },
    });
  }

  content.push({
    type: "text",
    text: input.message,
  });

  return content;
}

export async function runOrchestratorStream(
  input: OrchestratorInput,
  callbacks: StreamCallbacks
) {
  const client = getClient();
  const systemPrompt = input.image
    ? `${SYSTEM_PROMPT}\n\n${IMAGE_PROMPT_ADDENDUM}`
    : SYSTEM_PROMPT;

  const messages: Anthropic.MessageParam[] = [];

  if (input.conversationHistory) {
    for (const msg of input.conversationHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({
    role: "user",
    content: buildUserContent(input),
  });

  const modelParams = {
    model: getModelName(),
    max_tokens: getMaxOutputTokens(),
    system: systemPrompt,
    tools: TOOL_DEFINITIONS,
    messages,
  };

  // Tool loop: non-streaming (need full response to execute tools)
  let response = await client.messages.stream(modelParams).finalMessage();
  const maxIterations = 3;
  let iteration = 0;

  while (response.stop_reason === "tool_use" && iteration < maxIterations) {
    iteration++;

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    for (const toolUse of toolUseBlocks) {
      callbacks.onStatus(TOOL_LABELS[toolUse.name] ?? toolUse.name);
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map(
      (toolUse) => ({
        type: "tool_result" as const,
        tool_use_id: toolUse.id,
        content: executeToolCall(
          toolUse.name,
          toolUse.input as Record<string, unknown>
        ),
      })
    );

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });

    response = await client.messages
      .stream({ ...modelParams, messages })
      .finalMessage();
  }

  // Final call: stream text to client
  callbacks.onStatus("Generating response");

  // Check if we already have the final text (from tool loop ending with end_turn)
  const existingText = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );

  if (existingText && response.stop_reason === "end_turn") {
    // Already have complete response from tool loop
    callbacks.onDelta(existingText.text);
    callbacks.onDone(parseAndValidateResponse(existingText.text));
    return;
  }

  // Need a fresh streaming call for final response
  messages.push({ role: "assistant", content: response.content });
  const finalStream = client.messages.stream({ ...modelParams, messages });
  let fullText = "";

  finalStream.on("text", (text) => {
    fullText += text;
    callbacks.onDelta(text);
  });

  const finalMessage = await finalStream.finalMessage();

  if (finalMessage.stop_reason === "max_tokens") {
    console.warn("[orchestrator] Response truncated by max_tokens");
  }

  if (!fullText) {
    const textBlock = finalMessage.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text"
    );
    fullText = textBlock?.text ?? "";
  }

  callbacks.onDone(
    fullText
      ? parseAndValidateResponse(fullText)
      : buildFallbackResponse("No response generated.")
  );
}

// Keep non-streaming version for backward compat
export async function runOrchestrator(
  input: OrchestratorInput
): Promise<ChatResponse> {
  return new Promise((resolve, reject) => {
    runOrchestratorStream(input, {
      onStatus: () => {},
      onDelta: () => {},
      onDone: resolve,
      onError: (e) => reject(new Error(e)),
    }).catch(reject);
  });
}

function parseAndValidateResponse(raw: string): ChatResponse {
  let jsonStr = raw.trim();

  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const braceStart = jsonStr.indexOf("{");
  const braceEnd = jsonStr.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd !== -1) {
    jsonStr = jsonStr.slice(braceStart, braceEnd + 1);
  }

  try {
    const parsed = JSON.parse(jsonStr);
    const validated = ChatResponseSchema.safeParse(parsed);

    if (validated.success) {
      return validated.data;
    }

    if (parsed.answer && typeof parsed.answer === "string") {
      // Normalize artifact(s) into array
      const artifacts: ChatResponse["artifacts"] = [];
      if (Array.isArray(parsed.artifacts)) artifacts.push(...parsed.artifacts);
      if (parsed.artifact && typeof parsed.artifact === "object") artifacts.push(parsed.artifact);

      return {
        answer: parsed.answer,
        citations: Array.isArray(parsed.citations)
          ? parsed.citations
          : [{ docId: "owners_manual" as const, page: 1 }],
        artifacts: artifacts.length > 0 ? artifacts : undefined,
        clarification: parsed.clarification,
      };
    }

    return buildFallbackResponse(raw);
  } catch {
    return buildFallbackResponse(raw);
  }
}

function buildFallbackResponse(text: string): ChatResponse {
  const answerMatch = text.match(/"answer"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (answerMatch) {
    return {
      answer: answerMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
      citations: [{ docId: "owners_manual" as const, page: 1 }],
    };
  }

  const cleanText = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/"[a-zA-Z_]+":\s*/g, "")
    .replace(/[{}[\]"]/g, "")
    .replace(/,\s*$/gm, "")
    .trim();

  return {
    answer:
      cleanText.length > 0
        ? cleanText.slice(0, 2000)
        : "I could not generate a structured response. Please try rephrasing your question.",
    citations: [{ docId: "owners_manual" as const, page: 1 }],
  };
}
