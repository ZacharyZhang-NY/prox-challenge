"use client";

import type { Artifact } from "@/lib/schemas/response";
import { PolarityDiagramCard } from "./polarity-diagram-card";
import { DutyCycleCard } from "./duty-cycle-card";
import { TroubleshootingFlowCard } from "./troubleshooting-flow-card";
import { ManualImageCard } from "./manual-image-card";
import { SettingsCard } from "./settings-card";
import { WeldConfiguratorCard } from "./weld-configurator-card";

interface ArtifactSwitchProps {
  artifact: Artifact;
}

export function ArtifactSwitch({ artifact }: ArtifactSwitchProps) {
  switch (artifact.type) {
    case "polarity_diagram":
      return <PolarityDiagramCard artifact={artifact} />;
    case "duty_cycle_widget":
      return <DutyCycleCard artifact={artifact} />;
    case "troubleshooting_flow":
      return <TroubleshootingFlowCard artifact={artifact} />;
    case "manual_image":
      return <ManualImageCard artifact={artifact} />;
    case "settings_card":
      return <SettingsCard artifact={artifact} />;
    case "weld_configurator":
      return <WeldConfiguratorCard artifact={artifact} />;
    default:
      return null;
  }
}
