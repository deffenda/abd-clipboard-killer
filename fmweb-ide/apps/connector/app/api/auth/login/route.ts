import { RuntimeLoginBodySchema } from "@fmweb/shared";
import type { NextRequest } from "next/server";

import { loginSession } from "@/lib/auth-service";
import { withRouteMetrics } from "@/lib/handle-route";
import { jsonError, parseJson, preflight } from "@/lib/http";
import { requestContext, withRateLimit } from "@/lib/route-helpers";

export const OPTIONS = preflight;

export async function POST(request: NextRequest) {
  const { correlationId } = requestContext(request);
  const limited = withRateLimit(request, correlationId);

  if (limited !== null) {
    return limited;
  }

  return withRouteMetrics(request, correlationId, "auth.login", async () => {
    const body = await parseJson<Record<string, unknown>>(request, {});
    const parsed = RuntimeLoginBodySchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        request,
        correlationId,
        "invalid_payload",
        "Invalid runtime login payload",
        400,
        parsed.error.issues
      );
    }

    return loginSession(request, correlationId, parsed.data);
  });
}
