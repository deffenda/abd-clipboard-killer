import type { NextRequest } from "next/server";

import { logoutSession } from "@/lib/auth-service";
import { withRouteMetrics } from "@/lib/handle-route";
import { preflight } from "@/lib/http";
import { requestContext, withRateLimit } from "@/lib/route-helpers";

export const OPTIONS = preflight;

export async function POST(request: NextRequest) {
  const { correlationId } = requestContext(request);
  const limited = withRateLimit(request, correlationId);

  if (limited !== null) {
    return limited;
  }

  return withRouteMetrics(request, correlationId, "auth.logout", async () => {
    return logoutSession(request, correlationId);
  });
}
