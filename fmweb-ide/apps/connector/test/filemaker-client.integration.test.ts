import { describe, expect, it } from "vitest";

import { FileMakerClient } from "../lib/filemaker-client";

const enabled = process.env.FM_INTEGRATION_TESTS === "true";

describe.skipIf(!enabled)("FileMakerClient integration", () => {
  it("logs in and fetches layouts when integration env is enabled", async () => {
    const client = new FileMakerClient();
    const sessionId = `integration-${Date.now()}`;

    await client.login(sessionId, "integration-correlation");
    const layouts = await client.getLayouts(sessionId, "integration-correlation");

    expect(Array.isArray(layouts)).toBe(true);
  });
});
