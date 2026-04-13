# Prox

A multimodal AI knowledge agent for the Vulcan OmniPro 220 multiprocess welder. It answers technical questions using structured facts, full-text manual search, and page-level visual references — grounded entirely in source documentation.

Built with Next.js 15, React 19, the Anthropic SDK, and a local knowledge base. No vector database, no external services beyond the Claude API.

![Chat with polarity diagram](screenshot/chat1.png)
![Manual image reference](screenshot/chat2.png)

## Architecture

![System Architecture](screenshot/arch.png)

The interactive HTML version is at [`docs/architecture.html`](docs/architecture.html).

## How the Agent Works

The core is in `lib/agent/orchestrator.ts`. When a user sends a message:

1. **Build context.** The orchestrator collects conversation history and the current message (text + optional image), then sends everything to the Claude API with the system prompt and three tool definitions.

2. **Tool loop.** Claude decides which tools to call. The orchestrator executes them locally and feeds results back. This loops up to 3 iterations. All tool execution happens server-side with zero external calls — the tools read from static JSON files on disk.

3. **Stream the response.** Once Claude produces its final answer (JSON with `answer`, `citations`, `artifacts`, optional `clarification`), the orchestrator streams it to the browser via Server-Sent Events. The frontend renders markdown text incrementally, then materializes any artifacts (SVG diagrams, image cards, settings tables) once the full response arrives.

The model never generates freeform text. Every response is validated against a Zod schema. If the JSON is malformed or truncated, a fallback parser extracts what it can from the raw output.

## Knowledge Extraction and Representation

The knowledge base was built by extracting content from three source documents for the Vulcan OmniPro 220:

**Structured facts** (`data/facts/`) — Six JSON collections covering polarity configurations, duty cycle ratings, front panel controls, troubleshooting trees, process setup procedures, and equipment specifications. Each record includes source citations (document ID + page number). The `lookup_fact` tool queries these with key-value filters (e.g., `{process: "mig", inputVoltage: 240}`).

**Text chunks** (`data/chunks/`) — The owner's manual (48 pages) and quick start guide are split into page-level text chunks with section headers and keyword arrays. The `search_manual` tool indexes these with MiniSearch at startup, using fuzzy matching, prefix search, and field boosting (section headers weighted 2x, keywords 1.5x).

**Visual assets** (`data/visual_assets.json` + `public/manual-pages/`) — 51 PNG page scans are indexed with descriptive titles and tags (polarity, controls, duty_cycle, troubleshooting, setup, wiring). The `get_visual_asset` tool finds relevant pages by tag filtering and term matching against titles. The frontend renders these as expandable image cards with zoom modals.

This three-layer approach means the agent can answer "what polarity for MIG?" with a precise structured lookup, "how do I set up stick welding?" with a full-text search across the manual, and "show me the cable setup diagram" with the actual manual page image — all from the same question if needed.

## Design Decisions

**Local tools over RAG.** Traditional RAG would embed the manual into a vector database and retrieve by similarity. This project uses structured JSON lookups and lexical search instead. For a 48-page technical manual with well-defined categories (polarity, duty cycle, troubleshooting), structured data gives more precise results than embedding similarity. MiniSearch handles the long-tail questions that don't map cleanly to a structured collection.

**Agentic tool loop over single-shot.** The orchestrator lets Claude call multiple tools and iterate, rather than pre-selecting tools based on the question. This handles compound questions naturally — "what polarity for stick and show me the setup diagram" triggers both `lookup_fact` and `get_visual_asset` in a single turn.

**SSE streaming over WebSocket.** Server-Sent Events are simpler than WebSockets for this use case (server-to-client only). The stream carries three event types: `status` (tool execution progress), `delta` (incremental text), and `done` (final structured response with artifacts and citations).

**sql.js over native SQLite.** The session database uses sql.js (pure WASM SQLite) instead of better-sqlite3 or an external database. Zero native compilation, zero config — `pnpm install` and it works on any OS. The database file is auto-created on first startup.

**Typed artifacts over raw markdown.** Instead of letting the model generate arbitrary markdown/HTML, responses include typed artifact objects (polarity diagrams, duty cycle widgets, troubleshooting flows, settings cards, manual images). The frontend renders these as purpose-built interactive components. This guarantees visual consistency and prevents the model from producing broken layouts.

**Schema validation everywhere.** Every API boundary uses Zod: request validation, response parsing, artifact type discrimination. If the model produces malformed JSON, the fallback parser extracts the answer field via regex rather than showing raw JSON to the user.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- An Anthropic API key (or compatible proxy)

### Setup

```bash
git clone <repo-url>
cd prox
pnpm install
cp .env.example .env.local
```

Edit `.env.local` and add your API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

The other variables are optional:

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | — | Required. Your Claude API key. |
| `BASE_URL` | Anthropic default | API endpoint. Set this if using a proxy. |
| `MODEL_NAME` | `claude-sonnet-4-6` | Model ID for the orchestrator. |
| `MAX_OUTPUT_TOKENS` | `4096` | Max tokens per response (capped at 8192). |

### Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). No database setup needed — sessions are stored in a local SQLite file that initializes automatically.

### Build for Production

```bash
pnpm build
pnpm start
```

## Project Structure

```
prox/
├── app/
│   ├── api/
│   │   ├── chat/route.ts            # SSE streaming endpoint
│   │   ├── sessions/route.ts        # Session list + create
│   │   ├── sessions/[id]/route.ts   # Session CRUD
│   │   └── assets/[id]/route.ts     # Manual page image server
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── chat/
│   │   ├── chat-shell.tsx           # Main chat UI + state
│   │   ├── chat-message.tsx         # Message rendering
│   │   ├── session-sidebar.tsx      # Session list
│   │   ├── prompt-suggestions.tsx   # Starter prompts
│   │   └── upload-input.tsx         # Image upload
│   ├── artifacts/
│   │   ├── artifact-switch.tsx      # Routes artifact type → component
│   │   ├── polarity-diagram-card.tsx
│   │   ├── duty-cycle-card.tsx
│   │   ├── troubleshooting-flow-card.tsx
│   │   ├── settings-card.tsx
│   │   └── manual-image-card.tsx
│   └── source-viewer/
│       └── citation-badge.tsx
├── lib/
│   ├── agent/
│   │   ├── orchestrator.ts          # Tool loop + streaming
│   │   ├── system-prompt.ts         # Claude system prompt
│   │   └── tools.ts                 # Tool definitions + executors
│   ├── knowledge/
│   │   ├── loader.ts                # JSON file loader
│   │   ├── facts.ts                 # Structured fact queries
│   │   ├── search.ts                # MiniSearch full-text index
│   │   ├── visuals.ts              # Visual asset lookup
│   │   └── types.ts
│   ├── schemas/
│   │   ├── response.ts              # ChatResponse + Artifact schemas
│   │   ├── knowledge.ts
│   │   └── tools.ts
│   ├── db.ts                        # sql.js initialization
│   └── sessions.ts                  # Session CRUD operations
├── data/
│   ├── facts/                       # Structured fact JSON files
│   ├── chunks/                      # Manual text chunks
│   └── visual_assets.json           # Page image index
├── public/
│   └── manual-pages/                # 51 PNG page scans
├── docs/
│   └── architecture.html            # Blueprint-style system diagram
└── screenshot/
    ├── chat1.png
    └── chat2.png
```

## Future Optimizations

**Vector search with sqlite-vec.** The current search layer uses MiniSearch for lexical full-text matching. This works well for exact terminology ("DCEP polarity", "duty cycle 240V") but struggles with semantic queries where the user's phrasing diverges from the manual's wording. Integrating [sqlite-vec](https://github.com/asg017/sqlite-vec) would add embedding-based similarity search while keeping the zero-config SQLite architecture — no external vector database needed. The approach: embed each text chunk at build time, store vectors in a sqlite-vec virtual table alongside the existing session database, and add a hybrid retrieval tool that combines lexical scores from MiniSearch with cosine similarity from sqlite-vec. This gives the best of both worlds: precise term matching for spec lookups and semantic recall for natural language questions.

**Prompt caching.** The system prompt and tool definitions are identical across every request. Anthropic's prompt caching API would let us mark these as cacheable, cutting input token costs and latency for repeat conversations significantly.

**Multi-document scaling.** The current knowledge extraction pipeline is manual — JSON facts and text chunks are hand-curated for one specific welder model. To support additional equipment, the extraction could be automated: PDF parsing with layout detection, automatic chunking by section headers, and structured fact extraction via an LLM pass over each page. The tool interface and frontend would remain unchanged.

**Image understanding for diagnostics.** The current image upload flow sends user photos to Claude for general analysis. A more targeted approach would use vision embeddings to match uploaded images against known reference images in the manual (e.g., "this looks like Figure 12 on page 23"), providing more precise visual grounding.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 |
| UI | React 19, Tailwind CSS 4, react-markdown |
| AI | Anthropic SDK, Claude Sonnet |
| Search | MiniSearch (lexical full-text) |
| Database | sql.js (WASM SQLite, zero-config) |
| Validation | Zod |
