import type { NextRequest } from "next/server";

import { defaultRateLimiter } from "./rate-limit";
import { getCorrelationId, getRequestIp } from "./correlation";
import { getSession } from "./session";
import { jsonError } from "./http";

export const withRateLimit = (request: NextRequest, correlationId: string) => {
  const ip = getRequestIp(request);
  const result = defaultRateLimiter.consume(ip);

  if (!result.allowed) {
    return jsonError(
      request,
      correlationId,
      "rate_limited",
      "Too many requests. Try again soon.",
      429,
      {
        retryAfterSec: result.retryAfterSec
      }
    );
  }

  return null;
};

export const requireSession = (request: NextRequest, correlationId: string) => {
  const session = getSession(request);

  if (session === null) {
    return {
      session: null,
      response: jsonError(request, correlationId, "unauthorized", "Authentication required", 401)
    };
  }

  return {
    session,
    response: null
  };
};

export const requestContext = (request: NextRequest) => {
  return {
    correlationId: getCorrelationId(request)
  };
};
