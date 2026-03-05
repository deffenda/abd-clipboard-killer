import { CreateRecordBodySchema, PaginationQuerySchema } from "@fmweb/shared";
import type { NextRequest } from "next/server";

import { fileMakerClient } from "@/lib/filemaker-client";
import { withRouteMetrics } from "@/lib/handle-route";
import { jsonError, jsonOk, parseJson, preflight } from "@/lib/http";
import { requestContext, requireSession, withRateLimit } from "@/lib/route-helpers";

export const OPTIONS = preflight;

export async function GET(
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

  return withRouteMetrics(request, correlationId, "fm.records.get", async () => {
    const { layout } = await context.params;
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = PaginationQuerySchema.safeParse(query);

    if (!parsed.success) {
      return jsonError(
        request,
        correlationId,
        "invalid_query",
        "Invalid pagination query",
        400,
        parsed.error.issues
      );
    }

    const result = await fileMakerClient.getRecords(
      auth.session.id,
      decodeURIComponent(layout),
      parsed.data,
      correlationId
    );

    return jsonOk(request, correlationId, result);
  });
}

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

  return withRouteMetrics(request, correlationId, "fm.records.create", async () => {
    const { layout } = await context.params;
    const body = await parseJson<Record<string, unknown>>(request, {});
    const parsed = CreateRecordBodySchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        request,
        correlationId,
        "invalid_payload",
        "Invalid record payload",
        400,
        parsed.error.issues
      );
    }

    const record = await fileMakerClient.createRecord(
      auth.session.id,
      decodeURIComponent(layout),
      parsed.data.data,
      parsed.data.portalData,
      correlationId
    );

    return jsonOk(request, correlationId, record, 201);
  });
}
