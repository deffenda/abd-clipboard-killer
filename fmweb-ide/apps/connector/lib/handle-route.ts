import type { NextRequest } from "next/server";

import { InternalApiError } from "./errors";
import { jsonError } from "./http";
import { recordMetric } from "./metrics";

export const withRouteMetrics = async (
  request: NextRequest,
  correlationId: string,
  metricName: string,
  run: () => Promise<Response>
) => {
  const started = performance.now();

  try {
    const response = await run();
    recordMetric(metricName, performance.now() - started, false);
    return response;
  } catch (error) {
    recordMetric(metricName, performance.now() - started, true);

    if (error instanceof InternalApiError) {
      return jsonError(
        request,
        correlationId,
        error.code,
        error.message,
        error.status,
        error.details
      );
    }

    return jsonError(
      request,
      correlationId,
      "internal_error",
      "Unexpected internal error",
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
};
