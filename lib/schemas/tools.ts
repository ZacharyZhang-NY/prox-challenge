import { z } from "zod";

// ── Tool Input Schemas ──

export const LookupFactInputSchema = z.object({
  collection: z.enum([
    "polarity",
    "duty_cycle",
    "controls",
    "troubleshooting",
    "specs",
    "process_setup",
  ]),
  filters: z.record(z.union([z.string(), z.number()])),
});
export type LookupFactInput = z.infer<typeof LookupFactInputSchema>;

export const SearchManualInputSchema = z.object({
  query: z.string(),
  topK: z.number().int().min(1).max(8).default(4),
  docIds: z.array(z.string()).optional(),
});
export type SearchManualInput = z.infer<typeof SearchManualInputSchema>;

export const GetVisualAssetInputSchema = z.object({
  query: z.string().optional(),
  tags: z.array(z.string()).optional(),
  page: z.number().optional(),
  docId: z.string().optional(),
});
export type GetVisualAssetInput = z.infer<typeof GetVisualAssetInputSchema>;

// ── Tool Output Schemas ──

export const LookupFactOutputSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      payload: z.record(z.unknown()),
      citation: z.object({
        docId: z.string(),
        page: z.number(),
        title: z.string().optional(),
      }),
    })
  ),
});
export type LookupFactOutput = z.infer<typeof LookupFactOutputSchema>;

export const SearchManualOutputSchema = z.object({
  chunks: z.array(
    z.object({
      id: z.string(),
      docId: z.string(),
      page: z.number(),
      section: z.string().optional(),
      text: z.string(),
      score: z.number().optional(),
    })
  ),
});
export type SearchManualOutput = z.infer<typeof SearchManualOutputSchema>;

export const GetVisualAssetOutputSchema = z.object({
  assets: z.array(
    z.object({
      id: z.string(),
      docId: z.string(),
      page: z.number(),
      title: z.string(),
      kind: z.enum(["page", "crop", "diagram"]),
      path: z.string(),
      tags: z.array(z.string()),
    })
  ),
});
export type GetVisualAssetOutput = z.infer<typeof GetVisualAssetOutputSchema>;
