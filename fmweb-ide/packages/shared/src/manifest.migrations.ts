import { AppManifestSchema, DEFAULT_SCHEMA_VERSION, ThemeTokensSchema } from "./schemas";
import type { AppManifest } from "./types";

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

const defaultBreakpoints = [
  { name: "phone", minWidth: 0 },
  { name: "tablet", minWidth: 768 },
  { name: "desktop", minWidth: 1024 }
];

const defaultTheme = {
  id: "theme-default",
  name: "Default Theme",
  tokens: ThemeTokensSchema.parse({})
};

type UnknownRecord = Record<string, unknown>;

const migrateFromV010 = (input: UnknownRecord): AppManifest => {
  const createdAt = typeof input.createdAt === "string" ? input.createdAt : nowIso();
  const updatedAt = typeof input.updatedAt === "string" ? input.updatedAt : createdAt;

  const migrated = {
    schemaVersion: DEFAULT_SCHEMA_VERSION,
    appId: typeof input.appId === "string" ? input.appId : makeId(),
    name: typeof input.name === "string" ? input.name : "Migrated App",
    createdAt,
    updatedAt,
    dataSources: [],
    breakpoints: defaultBreakpoints,
    screens: Array.isArray(input.screens) ? input.screens : [],
    themes: [defaultTheme],
    roles: []
  };

  return AppManifestSchema.parse(migrated);
};

const migrations: Record<string, (input: UnknownRecord) => AppManifest> = {
  "0.1.0": migrateFromV010
};

export const migrateManifest = (input: unknown): AppManifest => {
  if (typeof input !== "object" || input === null) {
    throw new Error("Manifest must be an object");
  }

  const data = input as UnknownRecord;

  if (typeof data.schemaVersion === "string" && data.schemaVersion === DEFAULT_SCHEMA_VERSION) {
    return AppManifestSchema.parse(data);
  }

  if (typeof data.version === "string") {
    const migration = migrations[data.version];
    if (migration !== undefined) {
      return migration(data);
    }
  }

  throw new Error("Unsupported manifest schema/version for migration");
};
