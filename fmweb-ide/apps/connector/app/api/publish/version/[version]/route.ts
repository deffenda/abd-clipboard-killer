import type { NextRequest } from "next/server";

import { withRouteMetrics } from "@/lib/handle-route";
import { jsonError, jsonOk, preflight } from "@/lib/http";
import { getPublishedArtifact } from "@/lib/publish-store";
import { requestContext, withRateLimit } from "@/lib/route-helpers";

export const OPTIONS = preflight;

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      version: string;
    }>;
  }
) {
  const { correlationId } = requestContext(request);
  const limited = withRateLimit(request, correlationId);

  if (limited !== null) {
    return limited;
  }

  return withRouteMetrics(request, correlationId, "publish.version.get", async () => {
    const { version } = await context.params;
    const artifact = await getPublishedArtifact(decodeURIComponent(version));

    if (artifact === null) {
      return jsonError(request, correlationId, "not_found", "Published version not found", 404);
    }

    return jsonOk(request, correlationId, artifact);
  });
}
