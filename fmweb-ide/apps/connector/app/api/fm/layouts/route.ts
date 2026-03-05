import type { NextRequest } from "next/server";

import { fileMakerClient } from "@/lib/filemaker-client";
import { withRouteMetrics } from "@/lib/handle-route";
import { jsonOk, preflight } from "@/lib/http";
import { requestContext, requireSession, withRateLimit } from "@/lib/route-helpers";

export const OPTIONS = preflight;

export async function GET(request: NextRequest) {
  const { correlationId } = requestContext(request);

  const limited = withRateLimit(request, correlationId);
  if (limited !== null) {
    return limited;
  }

  const auth = requireSession(request, correlationId);
  if (auth.response !== null || auth.session === null) {
    return auth.response;
  }

  return withRouteMetrics(request, correlationId, "fm.layouts", async () => {
    const layouts = await fileMakerClient.getLayouts(auth.session.id, correlationId);
    return jsonOk(request, correlationId, { layouts });
  });
}
