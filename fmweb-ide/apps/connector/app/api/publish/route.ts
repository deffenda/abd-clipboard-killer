import { AppManifestSchema, partitionPublishChecks, runPrePublishChecks } from "@fmweb/shared";
import type { NextRequest } from "next/server";

import { withRouteMetrics } from "@/lib/handle-route";
import { jsonError, jsonOk, parseJson, preflight } from "@/lib/http";
import { publishManifest } from "@/lib/publish-store";
import { requestContext, withRateLimit } from "@/lib/route-helpers";

export const OPTIONS = preflight;

export async function POST(request: NextRequest) {
  const { correlationId } = requestContext(request);
  const limited = withRateLimit(request, correlationId);

  if (limited !== null) {
    return limited;
  }

  return withRouteMetrics(request, correlationId, "publish.create", async () => {
    const body = await parseJson<Record<string, unknown>>(request, {});
    const manifestInput = body.manifest;
    const version = typeof body.version === "string" ? body.version : undefined;

    const parsed = AppManifestSchema.safeParse(manifestInput);

    if (!parsed.success) {
      return jsonError(
        request,
        correlationId,
        "invalid_manifest",
        "Manifest failed schema validation",
        400,
        parsed.error.issues
      );
    }

    const checks = runPrePublishChecks(parsed.data);
    const partition = partitionPublishChecks(checks);

    if (partition.errors.length > 0) {
      return jsonError(
        request,
        correlationId,
        "publish_blocked",
        "Pre-publish checks failed",
        400,
        partition
      );
    }

    const artifact = await publishManifest(parsed.data, version);

    return jsonOk(request, correlationId, {
      artifact,
      checks: partition
    });
  });
}
