import type {
  PolarityFact,
  DutyCycleFact,
  TroubleshootingFact,
  ControlFact,
  ProcessSetupFact,
  ProcessSpec,
  VisualAsset,
  ManualChunk,
} from "@/lib/schemas/knowledge";

export interface KnowledgeStore {
  polarity: PolarityFact[];
  dutyCycle: DutyCycleFact[];
  troubleshooting: TroubleshootingFact[];
  controls: ControlFact[];
  processSetup: ProcessSetupFact[];
  specs: ProcessSpec[];
  weldSettings: Record<string, unknown>[];
  visualAssets: VisualAsset[];
  chunks: ManualChunk[];
}

export interface SearchResult {
  id: string;
  docId: string;
  page: number;
  section?: string;
  text: string;
  score: number;
}

export type FactCollection =
  | "polarity"
  | "duty_cycle"
  | "controls"
  | "troubleshooting"
  | "specs"
  | "process_setup"
  | "weld_settings";
