import { getKnowledgeStore } from "./loader";
import type { FactCollection } from "./types";

function matchesFilters(
  item: Record<string, unknown>,
  filters: Record<string, string | number>
): boolean {
  for (const [key, value] of Object.entries(filters)) {
    const itemValue = item[key];
    if (itemValue === undefined) return false;

    if (typeof value === "string" && typeof itemValue === "string") {
      if (itemValue.toLowerCase() !== value.toLowerCase()) return false;
    } else if (typeof value === "number" && typeof itemValue === "number") {
      if (itemValue !== value) return false;
    } else if (typeof value === "string" && typeof itemValue === "number") {
      if (String(itemValue) !== value) return false;
    } else if (typeof value === "number" && typeof itemValue === "string") {
      if (Number(itemValue) !== value) return false;
    }
  }
  return true;
}

function extractCitation(item: Record<string, unknown>): {
  docId: string;
  page: number;
  title?: string;
} {
  const source = item.source as Record<string, unknown> | undefined;
  if (source) {
    const page = typeof source.page === "number"
      ? source.page
      : Array.isArray(source.pages) && source.pages.length > 0
        ? (source.pages[0] as number)
        : 1;

    return {
      docId: (source.docId as string) ?? "owners_manual",
      page,
      title: (source.section as string) ?? (source.title as string) ?? undefined,
    };
  }
  return { docId: "owners_manual", page: 1 };
}

export function lookupFacts(
  collection: FactCollection,
  filters: Record<string, string | number>
): Array<{
  id: string;
  payload: Record<string, unknown>;
  citation: { docId: string; page: number; title?: string };
}> {
  const store = getKnowledgeStore();

  let items: Record<string, unknown>[];
  switch (collection) {
    case "polarity":
      items = store.polarity as unknown as Record<string, unknown>[];
      break;
    case "duty_cycle":
      items = store.dutyCycle as unknown as Record<string, unknown>[];
      break;
    case "troubleshooting":
      items = store.troubleshooting as unknown as Record<string, unknown>[];
      break;
    case "controls":
      items = store.controls as unknown as Record<string, unknown>[];
      break;
    case "process_setup":
      items = store.processSetup as unknown as Record<string, unknown>[];
      break;
    case "specs":
      items = store.specs as unknown as Record<string, unknown>[];
      break;
    case "weld_settings":
      items = store.weldSettings as unknown as Record<string, unknown>[];
      break;
    default:
      return [];
  }

  const matched = items.filter((item) => matchesFilters(item, filters));

  // If no match with exact filters, try returning all items in collection
  // (the agent can then select the right one from the full set)
  const results = matched.length > 0 ? matched : items;

  return results.map((item, index) => ({
    id: `${collection}_${index}`,
    payload: item,
    citation: extractCitation(item),
  }));
}
