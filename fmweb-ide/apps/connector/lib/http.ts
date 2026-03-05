import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAllowedOrigins } from "./env";

const getCorsHeaders = (request: NextRequest): HeadersInit => {
  const origin = request.headers.get("origin");
  const allowed = getAllowedOrigins();

  if (origin !== null && allowed.includes(origin)) {
    return {
      "access-control-allow-origin": origin,
      "access-control-allow-credentials": "true",
      "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type,x-correlation-id"
    };
  }

  return {
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,x-correlation-id"
  };
};

export const preflight = (request: NextRequest): NextResponse => {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request)
  });
};

export const jsonOk = <T>(request: NextRequest, correlationId: string, data: T, status = 200) => {
  return NextResponse.json(
    {
      ok: true,
      correlationId,
      data
    },
    {
      status,
      headers: {
        ...getCorsHeaders(request),
        "x-correlation-id": correlationId
      }
    }
  );
};

export const jsonError = (
  request: NextRequest,
  correlationId: string,
  code: string,
  message: string,
  status = 500,
  details?: unknown
) => {
  return NextResponse.json(
    {
      ok: false,
      correlationId,
      code,
      message,
      details
    },
    {
      status,
      headers: {
        ...getCorsHeaders(request),
        "x-correlation-id": correlationId
      }
    }
  );
};

export const parseJson = async <T>(request: NextRequest, fallback: T): Promise<T> => {
  try {
    return (await request.json()) as T;
  } catch {
    return fallback;
  }
};
