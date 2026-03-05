import { FindBodySchema } from "@fmweb/shared";
import type { NextRequest } from "next/server";

import { fileMakerClient } from "@/lib/filemaker-client";
import { withRouteMetrics } from "@/lib/handle-route";
import { jsonError, jsonOk, parseJson, preflight } from "@/lib/http";
import { requestContext, requireSession, withRateLimit } from "@/lib/route-helpers";

export const OPTIONS = preflight;

export async function POST(
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

  return withRouteMetrics(request, correlationId, "fm.find", async () => {
    const { layout } = await context.params;
    const body = await parseJson<Record<string, unknown>>(request, {});
    const parsed = FindBodySchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        request,
        correlationId,
        "invalid_payload",
        "Invalid find payload",
        400,
        parsed.error.issues
      );
    }

    const result = await fileMakerClient.find(
      auth.session.id,
      decodeURIComponent(layout),
      parsed.data,
      correlationId
    );

    return jsonOk(request, correlationId, result);
  });
}
