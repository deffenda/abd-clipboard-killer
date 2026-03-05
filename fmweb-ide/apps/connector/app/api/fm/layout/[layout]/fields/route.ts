import type { NextRequest } from "next/server";

import { fileMakerClient } from "@/lib/filemaker-client";
import { withRouteMetrics } from "@/lib/handle-route";
import { jsonOk, preflight } from "@/lib/http";
import { requestContext, requireSession, withRateLimit } from "@/lib/route-helpers";

export const OPTIONS = preflight;

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      layout: string;
    }>;
  }
) {
  const { correlationId } = requestContext(request);

  const limited = withRateLimit(request, correlationId);
  if (limited !== null) {
    return limited;
  }

  const auth = requireSession(request, correlationId);
  if (auth.response !== null || auth.session === null) {
    return auth.response;
  }

  return withRouteMetrics(request, correlationId, "fm.layout.fields", async () => {
    const { layout } = await context.params;
    const fields = await fileMakerClient.getFields(
      auth.session.id,
      decodeURIComponent(layout),
      correlationId
    );

    return jsonOk(request, correlationId, {
      layout: decodeURIComponent(layout),
      fields
    });
  });
}
