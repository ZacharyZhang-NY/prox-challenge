import MiniSearch from "minisearch";
import type { SearchResult } from "./types";
import { getKnowledgeStore } from "./loader";

interface IndexableChunk {
  id: string;
  docId: string;
  page: number;
  section: string;
  text: string;
  keywords: string;
}

let searchIndex: MiniSearch<IndexableChunk> | null = null;

function getSearchIndex(): MiniSearch<IndexableChunk> {
  if (searchIndex) return searchIndex;

  const store = getKnowledgeStore();

  searchIndex = new MiniSearch<IndexableChunk>({
    fields: ["text", "section", "keywords"],
    storeFields: ["id", "docId", "page", "section", "text"],
    searchOptions: {
      boost: { section: 2, keywords: 1.5 },
      fuzzy: 0.2,
      prefix: true,
    },
    tokenize: (text: string) =>
      text
        .toLowerCase()
        .split(/[\s/\-_,.;:!?()]+/)
        .filter((t) => t.length > 1),
  });

  const chunks = store.chunks as unknown as Array<Record<string, unknown>>;

  const documents: IndexableChunk[] = chunks.map((chunk) => ({
    id: chunk.id as string,
    docId: chunk.docId as string,
    page: chunk.page as number,
    section: (chunk.section as string) ?? "",
    text: chunk.text as string,
    keywords: Array.isArray(chunk.keywords)
      ? (chunk.keywords as string[]).join(" ")
      : (chunk.keywords as string) ?? "",
  }));

  searchIndex.addAll(documents);

  return searchIndex;
}

export function searchManual(
  query: string,
  topK: number = 4,
  docIds?: string[]
): SearchResult[] {
  const index = getSearchIndex();

  let results = index.search(query, {
    boost: { section: 2, keywords: 1.5, text: 1 },
    fuzzy: 0.2,
    prefix: true,
    combineWith: "OR",
  });

  if (docIds && docIds.length > 0) {
    results = results.filter((r) => {
      const docId = (r as unknown as { docId: string }).docId;
      return docIds.includes(docId);
    });
  }

  return results.slice(0, topK).map((r) => ({
    id: r.id as string,
    docId: (r as unknown as { docId: string }).docId,
    page: (r as unknown as { page: number }).page,
    section: (r as unknown as { section?: string }).section,
    text: (r as unknown as { text: string }).text,
    score: r.score,
  }));
}
