import { createHmac, timingSafeEqual } from "crypto";

import type { AppManifest } from "./types";

const stableStringify = (input: unknown): string => {
  if (input === null || typeof input !== "object") {
    return JSON.stringify(input);
  }

  if (Array.isArray(input)) {
    return `[${input.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(input as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return `{${entries.map(([key, value]) => `${JSON.stringify(key)}:${stableStringify(value)}`).join(",")}}`;
};

export const signManifest = (manifest: AppManifest, secret: string): string => {
  return createHmac("sha256", secret).update(stableStringify(manifest)).digest("hex");
};

export const verifyManifestSignature = (
  manifest: AppManifest,
  signature: string,
  secret: string
): boolean => {
  const expected = signManifest(manifest, secret);
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(signature, "hex");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
};
