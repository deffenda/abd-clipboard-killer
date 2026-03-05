import { AppManifestSchema, DEFAULT_SCHEMA_VERSION, ThemeTokensSchema } from "./schemas";
import type { AppManifest, ComponentNode, Screen } from "./types";

const nowIso = () => new Date().toISOString();

const makeId = () => {
  if (typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }

  const segment = () =>
    Math.floor(Math.random() * 0x10000)
      .toString(16)
      .padStart(4, "0");
  return `${segment()}${segment()}-${segment()}-${segment()}-${segment()}-${segment()}${segment()}${segment()}`;
};

export const defaultBreakpoints = [
  { name: "phone", minWidth: 0 },
  { name: "tablet", minWidth: 768 },
  { name: "desktop", minWidth: 1024 }
] as const;

export const defaultTheme = {
  id: "theme-default",
  name: "Default Theme",
  tokens: ThemeTokensSchema.parse({})
};

export const createComponentNode = (type: ComponentNode["type"]): ComponentNode => {
  return {
    id: makeId(),
    type,
    props: {
      label: type
    },
    style: {
      base: {},
      byBreakpoint: {}
    },
    bindings: [],
    events: {
      onLoad: [],
      onClick: [],
      onSubmit: [],
      onChange: []
    },
    children: []
  };
};

export const createDefaultScreen = (name = "Home", route = "/"): Screen => {
  return {
    id: makeId(),
    name,
    route,
    type: "custom",
    components: [
      {
        ...createComponentNode("Container"),
        props: {
          label: "Root Container"
        },
        children: [
          {
            ...createComponentNode("Heading"),
            props: {
              text: "Welcome to FMWeb IDE"
            }
          }
        ]
      }
    ],
    events: {
      onLoad: [],
      onClick: [],
      onSubmit: [],
      onChange: []
    }
  };
};

export const createDefaultManifest = (name = "Untitled FMWeb App"): AppManifest => {
  const createdAt = nowIso();

  return AppManifestSchema.parse({
    schemaVersion: DEFAULT_SCHEMA_VERSION,
    appId: makeId(),
    name,
    createdAt,
    updatedAt: createdAt,
    dataSources: [],
    breakpoints: [...defaultBreakpoints],
    screens: [createDefaultScreen()],
    themes: [defaultTheme],
    roles: []
  });
};

export const touchManifest = (manifest: AppManifest): AppManifest => {
  return {
    ...manifest,
    updatedAt: nowIso()
  };
};
