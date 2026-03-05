import { randomUUID } from "crypto";

import type { NextRequest } from "next/server";

export const getCorrelationId = (request: NextRequest): string => {
  return request.headers.get("x-correlation-id") ?? randomUUID();
};

export const getRequestIp = (request: NextRequest): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded !== null && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return "unknown";
};
