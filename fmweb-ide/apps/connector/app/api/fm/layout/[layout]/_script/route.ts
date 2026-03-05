import { ScriptBodySchema } from "@fmweb/shared";
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

  return withRouteMetrics(request, correlationId, "fm.script", async () => {
    const { layout } = await context.params;
    const body = await parseJson<Record<string, unknown>>(request, {});
    const parsed = ScriptBodySchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        request,
        correlationId,
        "invalid_payload",
        "Invalid script payload",
        400,
        parsed.error.issues
      );
    }

    const result = await fileMakerClient.runScript(
      auth.session.id,
      decodeURIComponent(layout),
      parsed.data.scriptName,
      parsed.data.parameter,
      correlationId
    );

    return jsonOk(request, correlationId, result);
  });
}
