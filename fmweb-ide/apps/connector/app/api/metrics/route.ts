import type { NextRequest } from "next/server";

import { jsonOk, preflight } from "@/lib/http";
import { getMetricsSnapshot } from "@/lib/metrics";
import { requestContext } from "@/lib/route-helpers";

export const OPTIONS = preflight;

export function GET(request: NextRequest) {
  const { correlationId } = requestContext(request);

  return jsonOk(request, correlationId, {
    metrics: getMetricsSnapshot()
  });
}
