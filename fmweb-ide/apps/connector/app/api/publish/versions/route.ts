import type { NextRequest } from "next/server";

import { withRouteMetrics } from "@/lib/handle-route";
import { jsonError, jsonOk, preflight } from "@/lib/http";
import { listPublishedVersions } from "@/lib/publish-store";
import { requestContext, withRateLimit } from "@/lib/route-helpers";

export const OPTIONS = preflight;

export async function GET(request: NextRequest) {
  const { correlationId } = requestContext(request);
  const limited = withRateLimit(request, correlationId);

  if (limited !== null) {
    return limited;
  }

  return withRouteMetrics(request, correlationId, "publish.versions", async () => {
    const admin = request.nextUrl.searchParams.get("admin");

    if (admin !== "1") {
      return jsonError(
        request,
        correlationId,
        "forbidden",
        "Admin mode required for version listing",
        403
      );
    }

    const versions = await listPublishedVersions();

    return jsonOk(request, correlationId, {
      versions
    });
  });
}
