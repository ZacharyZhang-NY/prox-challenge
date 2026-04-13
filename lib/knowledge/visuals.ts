import { getKnowledgeStore } from "./loader";

export interface VisualAssetRecord {
  id: string;
  docId: string;
  page: number;
  kind: string;
  title: string;
  path: string;
  tags: string[];
}

function normalizeVisualAssets(raw: unknown): VisualAssetRecord[] {
  if (Array.isArray(raw)) {
    return raw as VisualAssetRecord[];
  }

  // Handle nested format: { docId: { basePath, pages: { pageNum: { file, title, tags } } } }
  const result: VisualAssetRecord[] = [];
  const obj = raw as Record<
    string,
    {
      basePath?: string;
      pages?: Record<
        string,
        { file: string; title: string; tags: string[] }
      >;
    }
  >;

  for (const [docId, docData] of Object.entries(obj)) {
    const basePath = docData.basePath ?? `public/manual-pages/${docId}`;
    const pages = docData.pages ?? {};

    for (const [pageStr, pageData] of Object.entries(pages)) {
      const page = parseInt(pageStr, 10);
      result.push({
        id: `${docId}_p${String(page).padStart(2, "0")}`,
        docId,
        page,
        kind: "page",
        title: pageData.title,
        path: `${basePath.replace("public/", "")}/${pageData.file}`,
        tags: pageData.tags,
      });
    }
  }

  return result;
}

let cachedAssets: VisualAssetRecord[] | null = null;

function getAssets(): VisualAssetRecord[] {
  if (cachedAssets) return cachedAssets;

  const store = getKnowledgeStore();
  cachedAssets = normalizeVisualAssets(store.visualAssets);
  return cachedAssets;
}

export function getVisualAssets(params: {
  query?: string;
  tags?: string[];
  page?: number;
  docId?: string;
}): VisualAssetRecord[] {
  let assets = getAssets();

  if (params.docId) {
    assets = assets.filter((a) => a.docId === params.docId);
  }

  if (params.page) {
    assets = assets.filter((a) => a.page === params.page);
  }

  if (params.tags && params.tags.length > 0) {
    const searchTags = params.tags.map((t) => t.toLowerCase());
    assets = assets.filter((a) =>
      searchTags.some((st) =>
        a.tags.some((at) => at.toLowerCase().includes(st))
      )
    );
  }

  if (params.query) {
    const queryTerms = params.query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 1);
    assets = assets
      .map((a) => {
        const searchableText = [a.title, ...a.tags].join(" ").toLowerCase();
        const matchCount = queryTerms.filter((term) =>
          searchableText.includes(term)
        ).length;
        return { asset: a, score: matchCount };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.asset);
  }

  return assets.slice(0, 5);
}

export function getVisualAssetById(
  id: string
): VisualAssetRecord | undefined {
  return getAssets().find((a) => a.id === id);
}
