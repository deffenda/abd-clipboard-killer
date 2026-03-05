import { describe, expect, it } from "vitest";

import {
  DEFAULT_SCHEMA_VERSION,
  createDefaultManifest,
  migrateManifest,
  runPrePublishChecks,
  validateManifest
} from "../src";

describe("manifest validation", () => {
  it("accepts a generated manifest", () => {
    const manifest = createDefaultManifest("Test App");
    const result = validateManifest(manifest);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe(DEFAULT_SCHEMA_VERSION);
    }
  });

  it("migrates a legacy v0.1.0 manifest", () => {
    const now = new Date().toISOString();

    const migrated = migrateManifest({
      version: "0.1.0",
      appId: "2df7957f-5121-41da-988f-d3b8f896f070",
      name: "Legacy",
      createdAt: now,
      updatedAt: now,
      screens: [
        {
          id: "screen-1",
          name: "Home",
          route: "/",
          components: []
        }
      ]
    });

    expect(migrated.schemaVersion).toBe(DEFAULT_SCHEMA_VERSION);
    expect(migrated.screens).toHaveLength(1);
  });

  it("finds missing binding checks", () => {
    const manifest = createDefaultManifest("Checks App");
    manifest.screens[0]?.components.push({
      id: "input-1",
      type: "Input",
      props: {},
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
    });

    const checks = runPrePublishChecks(manifest);
    expect(checks.some((check) => check.code === "missing_bindings")).toBe(true);
  });
});
