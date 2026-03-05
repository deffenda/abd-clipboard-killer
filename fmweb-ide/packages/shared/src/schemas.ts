import { z } from "zod";

export const DEFAULT_SCHEMA_VERSION = "1.0.0";
export const DEFAULT_MANIFEST_VERSION = DEFAULT_SCHEMA_VERSION;

const semverRegex = /^\d+\.\d+\.\d+$/;

export const ComponentStyleSchema = z
  .object({
    padding: z.string().optional(),
    margin: z.string().optional(),
    width: z.string().optional(),
    height: z.string().optional(),
    display: z.string().optional(),
    background: z.string().optional(),
    border: z.string().optional(),
    borderRadius: z.string().optional(),
    fontSize: z.string().optional(),
    fontWeight: z.string().optional(),
    color: z.string().optional()
  })
  .default({});

export const ResponsiveStyleSchema = z
  .object({
    base: ComponentStyleSchema.default({}),
    byBreakpoint: z.record(z.string(), ComponentStyleSchema).default({})
  })
  .default({
    base: {},
    byBreakpoint: {}
  });

export const BindingSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["record.field", "record.readonly", "query.list", "portal.related"]),
  field: z.string().optional(),
  source: z.string().optional(),
  target: z.string().optional(),
  layout: z.string().optional(),
  relatedSet: z.string().optional(),
  columns: z.array(z.string()).optional()
});

export const ActionSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "navigate",
    "runScript",
    "createRecord",
    "updateRecord",
    "deleteRecord",
    "showToast",
    "showDialog",
    "setValue",
    "submit"
  ]),
  config: z.record(z.string(), z.unknown()).default({}),
  onError: z.enum(["toast", "dialog", "silent"]).optional()
});

export const EventActionMapSchema = z
  .object({
    onLoad: z.array(ActionSchema).default([]),
    onClick: z.array(ActionSchema).default([]),
    onSubmit: z.array(ActionSchema).default([]),
    onChange: z.array(ActionSchema).default([])
  })
  .default({
    onLoad: [],
    onClick: [],
    onSubmit: [],
    onChange: []
  });

type Binding = z.infer<typeof BindingSchema>;
type EventActionMap = z.infer<typeof EventActionMapSchema>;

type ComponentNode = {
  id: string;
  type: string;
  props: Record<string, unknown>;
  style: z.infer<typeof ResponsiveStyleSchema>;
  bindings: Binding[];
  events: EventActionMap;
  children: ComponentNode[];
};

export const ComponentNodeSchema: z.ZodType<ComponentNode, z.ZodTypeDef, unknown> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    props: z.record(z.string(), z.unknown()).default({}),
    style: ResponsiveStyleSchema.default({
      base: {},
      byBreakpoint: {}
    }),
    bindings: z.array(BindingSchema).default([]),
    events: EventActionMapSchema.default({
      onLoad: [],
      onClick: [],
      onSubmit: [],
      onChange: []
    }),
    children: z.array(ComponentNodeSchema).default([])
  })
);

export const FindRuleSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["equals"]).default("equals"),
  value: z.string().default("")
});

export const ListConfigSchema = z.object({
  layout: z.string().min(1),
  columns: z.array(z.string()).default([]),
  limit: z.number().int().positive().max(500).default(20),
  find: z.array(FindRuleSchema).default([])
});

export const PortalBindingDefinitionSchema = z.object({
  parentLayout: z.string().min(1),
  relatedSet: z.string().min(1),
  fields: z.array(z.string()).default([]),
  pageSize: z.number().int().positive().default(10)
});

export const ScreenSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  route: z.string().startsWith("/"),
  type: z.enum(["custom", "detail", "list"]).default("custom"),
  baseLayoutContext: z.string().optional(),
  components: z.array(ComponentNodeSchema).default([]),
  listConfig: ListConfigSchema.optional(),
  portal: PortalBindingDefinitionSchema.optional(),
  events: EventActionMapSchema.default({
    onLoad: [],
    onClick: [],
    onSubmit: [],
    onChange: []
  })
});

export const DataSourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.literal("filemaker"),
  connectorBaseUrl: z.string().url().optional(),
  host: z.string().optional(),
  file: z.string().optional()
});

export const BreakpointSchema = z.object({
  name: z.string().min(1),
  minWidth: z.number().int().nonnegative()
});

export const ThemeTokensSchema = z.object({
  typography: z
    .object({
      fontFamily: z.string().default("Inter, system-ui, sans-serif"),
      baseSize: z.string().default("16px"),
      scale: z
        .object({
          xs: z.string().default("0.75rem"),
          sm: z.string().default("0.875rem"),
          md: z.string().default("1rem"),
          lg: z.string().default("1.125rem"),
          xl: z.string().default("1.25rem")
        })
        .default({
          xs: "0.75rem",
          sm: "0.875rem",
          md: "1rem",
          lg: "1.125rem",
          xl: "1.25rem"
        })
    })
    .default({
      fontFamily: "Inter, system-ui, sans-serif",
      baseSize: "16px",
      scale: {
        xs: "0.75rem",
        sm: "0.875rem",
        md: "1rem",
        lg: "1.125rem",
        xl: "1.25rem"
      }
    }),
  spacing: z
    .object({
      xs: z.string().default("4px"),
      sm: z.string().default("8px"),
      md: z.string().default("12px"),
      lg: z.string().default("16px"),
      xl: z.string().default("24px")
    })
    .default({
      xs: "4px",
      sm: "8px",
      md: "12px",
      lg: "16px",
      xl: "24px"
    }),
  radii: z
    .object({
      sm: z.string().default("4px"),
      md: z.string().default("8px"),
      lg: z.string().default("12px")
    })
    .default({
      sm: "4px",
      md: "8px",
      lg: "12px"
    }),
  colors: z
    .object({
      background: z.string().default("#f8fafc"),
      surface: z.string().default("#ffffff"),
      text: z.string().default("#0f172a"),
      primary: z.string().default("#2563eb"),
      danger: z.string().default("#dc2626"),
      border: z.string().default("#cbd5e1")
    })
    .default({
      background: "#f8fafc",
      surface: "#ffffff",
      text: "#0f172a",
      primary: "#2563eb",
      danger: "#dc2626",
      border: "#cbd5e1"
    })
});

export const ThemeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tokens: ThemeTokensSchema
});

export const RoleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  permissions: z.array(z.string()).default([])
});

export const AppManifestSchema = z.object({
  schemaVersion: z.string().regex(semverRegex, "schemaVersion must be semver (x.y.z)"),
  appId: z.string().uuid(),
  name: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  dataSources: z.array(DataSourceSchema).default([]),
  breakpoints: z.array(BreakpointSchema).min(1),
  screens: z.array(ScreenSchema).min(1),
  themes: z.array(ThemeSchema).default([]),
  roles: z.array(RoleSchema).default([]),
  publishedVersion: z.string().regex(semverRegex).optional()
});

export const PublishArtifactSchema = z.object({
  version: z.string().regex(semverRegex),
  manifest: AppManifestSchema,
  signature: z.string().min(1),
  createdAt: z.string().datetime()
});

export const InternalApiErrorSchema = z.object({
  ok: z.literal(false),
  code: z.string().min(1),
  message: z.string().min(1),
  correlationId: z.string().min(1),
  details: z.unknown().optional()
});

export const InternalApiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    ok: z.literal(true),
    correlationId: z.string().min(1),
    data: dataSchema
  });
