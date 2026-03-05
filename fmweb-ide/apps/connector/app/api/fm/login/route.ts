import { LoginBodySchema } from "@fmweb/shared";
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

  return withRouteMetrics(request, correlationId, "fm.login", async () => {
    const body = await parseJson<Record<string, unknown>>(request, {});
    const parsed = LoginBodySchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        request,
        correlationId,
        "invalid_payload",
        "Invalid login payload",
        400,
        parsed.error.issues
      );
    }

    const credentials =
      parsed.data.username !== undefined && parsed.data.password !== undefined
        ? {
            username: parsed.data.username,
            password: parsed.data.password
          }
        : undefined;

    return loginSession(request, correlationId, credentials);
  });
}
