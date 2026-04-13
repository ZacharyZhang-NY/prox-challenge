import { z } from "zod";

// ── Document IDs ──

export const DocId = z.enum([
  "owners_manual",
  "quick_start",
  "selection_chart",
]);
export type DocId = z.infer<typeof DocId>;

// ── Citations ──

export const CitationSchema = z.object({
  docId: DocId,
  page: z.number().int().positive(),
  title: z.string().optional(),
});
export type Citation = z.infer<typeof CitationSchema>;

// ── Welding Processes ──

export const WeldProcess = z.enum(["mig", "flux_core", "tig", "stick"]);
export type WeldProcess = z.infer<typeof WeldProcess>;

export const InputVoltage = z.union([z.literal(120), z.literal(240)]);
export type InputVoltage = z.infer<typeof InputVoltage>;

export const CurrentType = z.enum(["DCEP", "DCEN"]);
export type CurrentType = z.infer<typeof CurrentType>;

// ── Polarity Matrix ──

export const PolarityFactSchema = z.object({
  process: WeldProcess,
  wireType: z.string().optional(),
  currentType: CurrentType,
  positiveLead: z.string(),
  negativeLead: z.string(),
  gasRequired: z.boolean(),
  gasType: z.string().optional(),
  notes: z.array(z.string()).default([]),
  source: CitationSchema,
});
export type PolarityFact = z.infer<typeof PolarityFactSchema>;

// ── Duty Cycle ──

export const DutyCycleEntrySchema = z.object({
  dutyCyclePercent: z.number(),
  amps: z.number(),
  outputVoltage: z.number(),
  weldMinutes: z.number(),
  coolMinutes: z.number(),
});
export type DutyCycleEntry = z.infer<typeof DutyCycleEntrySchema>;

export const DutyCycleFactSchema = z.object({
  process: WeldProcess,
  inputVoltage: InputVoltage,
  weldingCurrentRange: z.object({
    min: z.number(),
    max: z.number(),
  }),
  entries: z.array(DutyCycleEntrySchema),
  continuousAmps: z.number(),
  continuousVoltage: z.number(),
  source: CitationSchema,
});
export type DutyCycleFact = z.infer<typeof DutyCycleFactSchema>;

// ── Troubleshooting ──

export const TroubleshootingCauseSchema = z.object({
  cause: z.string(),
  solution: z.string(),
});

export const TroubleshootingFactSchema = z.object({
  category: z.enum(["mig_flux", "tig_stick"]),
  problem: z.string(),
  causes: z.array(TroubleshootingCauseSchema),
  source: CitationSchema,
});
export type TroubleshootingFact = z.infer<typeof TroubleshootingFactSchema>;

// ── Controls ──

export const ControlFactSchema = z.object({
  location: z.enum(["front_panel", "interior"]),
  name: z.string(),
  description: z.string(),
  visualAssetRef: z.string().optional(),
  source: CitationSchema,
});
export type ControlFact = z.infer<typeof ControlFactSchema>;

// ── Process Setup ──

export const ProcessSetupFactSchema = z.object({
  process: WeldProcess,
  cableSetup: z.object({
    positiveLead: z.string(),
    negativeLead: z.string(),
  }),
  gasSetup: z
    .object({
      required: z.boolean(),
      type: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
  steps: z.array(z.string()),
  source: CitationSchema,
});
export type ProcessSetupFact = z.infer<typeof ProcessSetupFactSchema>;

// ── Specs ──

export const ProcessSpecSchema = z.object({
  process: WeldProcess,
  powerInput: z.array(z.string()),
  currentInputAtOutput: z.array(z.string()),
  weldingCurrentRange: z.object({
    v120: z.string(),
    v240: z.string(),
  }),
  ratedDutyCycles: z.object({
    v120: z.array(z.string()),
    v240: z.array(z.string()),
  }),
  maxOCV: z.string(),
  weldableMaterials: z.array(z.string()),
  wireCapacity: z
    .object({
      solidCore: z.array(z.string()).optional(),
      fluxCored: z.array(z.string()).optional(),
    })
    .optional(),
  wireSpeed: z.string().optional(),
  wireSpoolCapacity: z.string().optional(),
  source: CitationSchema,
});
export type ProcessSpec = z.infer<typeof ProcessSpecSchema>;

// ── Visual Assets ──

export const VisualAssetSchema = z.object({
  id: z.string(),
  docId: DocId,
  page: z.number().int().positive(),
  kind: z.enum(["page", "crop", "diagram"]),
  title: z.string(),
  path: z.string(),
  tags: z.array(z.string()),
});
export type VisualAsset = z.infer<typeof VisualAssetSchema>;

// ── Manual Chunks ──

export const ManualChunkSchema = z.object({
  id: z.string(),
  docId: DocId,
  page: z.number().int().positive(),
  section: z.string().optional(),
  text: z.string(),
  keywords: z.array(z.string()),
  visualRefs: z.array(z.string()).optional(),
});
export type ManualChunk = z.infer<typeof ManualChunkSchema>;
