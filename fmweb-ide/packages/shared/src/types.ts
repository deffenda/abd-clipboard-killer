import type { z } from "zod";

import type {
  ActionSchema,
  AppManifestSchema,
  BindingSchema,
  BreakpointSchema,
  ComponentNodeSchema,
  ComponentStyleSchema,
  DataSourceSchema,
  EventActionMapSchema,
  FindRuleSchema,
  ListConfigSchema,
  PortalBindingDefinitionSchema,
  PublishArtifactSchema,
  RoleSchema,
  ScreenSchema,
  ThemeSchema,
  ThemeTokensSchema
} from "./schemas";

export type Binding = z.infer<typeof BindingSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type EventActionMap = z.infer<typeof EventActionMapSchema>;
export type ComponentStyle = z.infer<typeof ComponentStyleSchema>;
export type ComponentNode = z.infer<typeof ComponentNodeSchema>;
export type FindRule = z.infer<typeof FindRuleSchema>;
export type ListConfig = z.infer<typeof ListConfigSchema>;
export type PortalBindingDefinition = z.infer<typeof PortalBindingDefinitionSchema>;
export type Screen = z.infer<typeof ScreenSchema>;
export type DataSource = z.infer<typeof DataSourceSchema>;
export type Breakpoint = z.infer<typeof BreakpointSchema>;
export type ThemeTokens = z.infer<typeof ThemeTokensSchema>;
export type Theme = z.infer<typeof ThemeSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type AppManifest = z.infer<typeof AppManifestSchema>;
export type PublishArtifact = z.infer<typeof PublishArtifactSchema>;

export type PublishCheck = {
  level: "error" | "warning";
  code: string;
  message: string;
  path?: string;
};
