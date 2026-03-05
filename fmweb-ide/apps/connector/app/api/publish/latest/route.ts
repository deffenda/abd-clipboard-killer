import type { NextRequest } from "next/server";

import { withRouteMetrics } from "@/lib/handle-route";
import { jsonError, jsonOk, preflight } from "@/lib/http";
import { getLatestPublishedArtifact } from "@/lib/publish-store";
import { requestContext, withRateLimit } from "@/lib/route-helpers";

export const OPTIONS = preflight;

export async function GET(request: NextRequest) {
  const { correlationId } = requestContext(request);
  const limited = withRateLimit(request, correlationId);

  if (limited !== null) {
    return limited;
  }

  return withRouteMetrics(request, correlationId, "publish.latest", async () => {
    const artifact = await getLatestPublishedArtifact();

    if (artifact === null) {
      return jsonError(request, correlationId, "not_found", "No published versions found", 404);
    }

    return jsonOk(request, correlationId, artifact);
  });
}
