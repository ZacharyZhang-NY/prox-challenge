import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { KnowledgeStore } from "./types";

const DATA_DIR = join(process.cwd(), "data");

function loadJSON<T>(relativePath: string, fallback: T): T {
  const fullPath = join(DATA_DIR, relativePath);
  if (!existsSync(fullPath)) return fallback;
  const raw = readFileSync(fullPath, "utf-8");
  return JSON.parse(raw) as T;
}

let cachedStore: KnowledgeStore | null = null;

export function getKnowledgeStore(): KnowledgeStore {
  if (cachedStore) return cachedStore;

  // Load fact stores (loose typing — we handle schema mismatch in facts.ts)
  const polarity = loadJSON<Record<string, unknown>[]>(
    "facts/polarity_matrix.json",
    []
  );
  const dutyCycle = loadJSON<Record<string, unknown>[]>(
    "facts/duty_cycle.json",
    []
  );
  const troubleshooting = loadJSON<Record<string, unknown>[]>(
    "facts/troubleshooting.json",
    []
  );
  const controls = loadJSON<Record<string, unknown>[]>(
    "facts/controls.json",
    []
  );
  const processSetup = loadJSON<Record<string, unknown>[]>(
    "facts/process_setup.json",
    []
  );
  const specs = loadJSON<Record<string, unknown>[]>("facts/specs.json", []);
  const visualAssets = loadJSON<Record<string, unknown>[]>(
    "visual_assets.json",
    []
  );

  // Load chunks
  const ownersManualChunks = loadJSON<Record<string, unknown>[]>(
    "chunks/owners_manual.json",
    []
  );
  const quickStartChunks = loadJSON<Record<string, unknown>[]>(
    "chunks/quick_start.json",
    []
  );
  const chunks = [...ownersManualChunks, ...quickStartChunks];

  cachedStore = {
    polarity,
    dutyCycle,
    troubleshooting,
    controls,
    processSetup,
    specs,
    visualAssets,
    chunks,
  } as unknown as KnowledgeStore;

  return cachedStore;
}
