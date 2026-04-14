import { lookupFacts, searchManual, getVisualAssets } from "@/lib/knowledge";
import type { LookupFactInput, SearchManualInput, GetVisualAssetInput } from "@/lib/schemas/tools";

export function executeLookupFact(input: LookupFactInput): string {
  const collectionMap: Record<string, string> = {
    polarity: "polarity",
    duty_cycle: "duty_cycle",
    controls: "controls",
    troubleshooting: "troubleshooting",
    specs: "specs",
    process_setup: "process_setup",
    weld_settings: "weld_settings",
  };

  const collection = collectionMap[input.collection];
  if (!collection) {
    return JSON.stringify({ results: [] });
  }

  const results = lookupFacts(
    collection as Parameters<typeof lookupFacts>[0],
    input.filters
  );

  return JSON.stringify({ results });
}

export function executeSearchManual(input: SearchManualInput): string {
  const chunks = searchManual(input.query, input.topK, input.docIds);

  return JSON.stringify({
    chunks: chunks.map((c) => ({
      id: c.id,
      docId: c.docId,
      page: c.page,
      section: c.section,
      text: c.text.slice(0, 800),
      score: c.score,
    })),
  });
}

export function executeGetVisualAsset(input: GetVisualAssetInput): string {
  const assets = getVisualAssets({
    query: input.query,
    tags: input.tags,
    page: input.page,
    docId: input.docId,
  });

  return JSON.stringify({
    assets: assets.map((a) => ({
      id: a.id,
      docId: a.docId,
      page: a.page,
      title: a.title,
      kind: a.kind,
      path: a.path,
      tags: a.tags,
    })),
  });
}

export const TOOL_DEFINITIONS = [
  {
    name: "lookup_fact" as const,
    description:
      "Look up structured facts from the knowledge base. Collections: polarity (cable setup by process), duty_cycle (rated cycles by voltage/amps), controls (front panel and interior controls), troubleshooting (problems, causes, solutions), specs (welder specifications), process_setup (setup procedures by process), weld_settings (recommended wire speed, amperage, gas, wire size by process + material + thickness). Use filters to narrow results, e.g. {process: 'mig', material: 'Mild Steel', thickness: '3/16\"'}.",
    input_schema: {
      type: "object" as const,
      properties: {
        collection: {
          type: "string" as const,
          enum: [
            "polarity",
            "duty_cycle",
            "controls",
            "troubleshooting",
            "specs",
            "process_setup",
            "weld_settings",
          ],
          description: "The fact collection to query",
        },
        filters: {
          type: "object" as const,
          description:
            "Key-value filters to apply. Keys depend on collection: process (mig/flux_core/tig/stick), inputVoltage (120/240), category (mig_flux/tig_stick), location (front_panel/interior)",
        },
      },
      required: ["collection", "filters"],
    },
  },
  {
    name: "search_manual" as const,
    description:
      "Search the manual text chunks for relevant information. Returns top matching passages with page numbers. Use for open-ended questions or when structured facts don't cover the topic.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string" as const,
          description: "Search query text",
        },
        topK: {
          type: "number" as const,
          description: "Number of results to return (1-8, default 4)",
        },
        docIds: {
          type: "array" as const,
          items: { type: "string" as const },
          description:
            "Optional: limit search to specific documents (owners_manual, quick_start, selection_chart)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_visual_asset" as const,
    description:
      "Retrieve relevant manual page images or diagrams. Returns paths to page images that can be displayed. Use when the answer is visual or procedural (controls, setup diagrams, charts, troubleshooting tables).",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string" as const,
          description: "Description of the visual to find",
        },
        tags: {
          type: "array" as const,
          items: { type: "string" as const },
          description:
            "Tags to filter by (e.g. polarity, controls, duty_cycle, troubleshooting, setup, wiring)",
        },
        page: {
          type: "number" as const,
          description: "Specific page number to retrieve",
        },
        docId: {
          type: "string" as const,
          description: "Document ID to search within",
        },
      },
    },
  },
];
