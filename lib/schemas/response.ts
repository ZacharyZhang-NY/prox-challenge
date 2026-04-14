import { z } from "zod";
import { CitationSchema, WeldProcess, CurrentType, InputVoltage } from "./knowledge";

// ── Artifact Schemas ──

export const ManualImageArtifactSchema = z.object({
  type: z.literal("manual_image"),
  assetId: z.string(),
  caption: z.string(),
});
export type ManualImageArtifact = z.infer<typeof ManualImageArtifactSchema>;

export const PolarityDiagramArtifactSchema = z.object({
  type: z.literal("polarity_diagram"),
  process: WeldProcess,
  currentType: CurrentType,
  positiveLead: z.string(),
  negativeLead: z.string(),
  notes: z.array(z.string()).default([]),
});
export type PolarityDiagramArtifact = z.infer<
  typeof PolarityDiagramArtifactSchema
>;

export const DutyCycleArtifactSchema = z.object({
  type: z.literal("duty_cycle_widget"),
  process: WeldProcess,
  inputVoltage: InputVoltage,
  amps: z.number(),
  ratedDutyCycle: z.number(),
  tenMinuteWindow: z.object({
    weldMinutes: z.number(),
    coolMinutes: z.number(),
  }),
  continuousAmps: z.number().optional(),
});
export type DutyCycleArtifact = z.infer<typeof DutyCycleArtifactSchema>;

export const TroubleshootingFlowArtifactSchema = z.object({
  type: z.literal("troubleshooting_flow"),
  symptom: z.string(),
  steps: z.array(
    z.object({
      label: z.string(),
      action: z.string(),
    })
  ),
});
export type TroubleshootingFlowArtifact = z.infer<
  typeof TroubleshootingFlowArtifactSchema
>;

export const SettingsCardArtifactSchema = z.object({
  type: z.literal("settings_card"),
  title: z.string(),
  entries: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    })
  ),
  notes: z.array(z.string()).default([]),
});
export type SettingsCardArtifact = z.infer<typeof SettingsCardArtifactSchema>;

export const WeldConfiguratorArtifactSchema = z.object({
  type: z.literal("weld_configurator"),
  process: WeldProcess,
  material: z.string(),
  thickness: z.string(),
  wireSize: z.string(),
  shieldingGas: z.string(),
  gasFlow: z.string(),
  amperageRange: z.string(),
  wireSpeedRange: z.string().optional(),
  stickout: z.string().optional(),
  tungstenSize: z.string().optional(),
  fillerRod: z.string().optional(),
  electrodeType: z.string().optional(),
  electrodeSize: z.string().optional(),
  voltageRange: z.string(),
  polarity: CurrentType,
  notes: z.array(z.string()).default([]),
});
export type WeldConfiguratorArtifact = z.infer<typeof WeldConfiguratorArtifactSchema>;

// ── Combined Artifact ──

export const ArtifactSchema = z.discriminatedUnion("type", [
  ManualImageArtifactSchema,
  PolarityDiagramArtifactSchema,
  DutyCycleArtifactSchema,
  TroubleshootingFlowArtifactSchema,
  SettingsCardArtifactSchema,
  WeldConfiguratorArtifactSchema,
]);
export type Artifact = z.infer<typeof ArtifactSchema>;

// ── Clarification ──

export const ClarificationSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).optional(),
});
export type Clarification = z.infer<typeof ClarificationSchema>;

// ── Chat Response ──

export const ChatResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(CitationSchema).min(1),
  artifacts: z.array(ArtifactSchema).optional(),
  // backward compat: single artifact → wrap into array during parsing
  artifact: ArtifactSchema.optional(),
  clarification: ClarificationSchema.optional(),
}).transform((data) => {
  const merged: z.infer<typeof ArtifactSchema>[] = [];
  if (data.artifacts) merged.push(...data.artifacts);
  if (data.artifact) merged.push(data.artifact);
  return {
    answer: data.answer,
    citations: data.citations,
    artifacts: merged.length > 0 ? merged : undefined,
    clarification: data.clarification,
  };
});
export type ChatResponse = {
  answer: string;
  citations: Array<z.infer<typeof CitationSchema>>;
  artifacts?: Array<z.infer<typeof ArtifactSchema>>;
  clarification?: z.infer<typeof ClarificationSchema>;
};

// ── Chat Request ──

export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  image: z.string().optional(), // base64 encoded image
  imageMediaType: z
    .enum(["image/jpeg", "image/png", "image/webp", "image/gif"])
    .optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
