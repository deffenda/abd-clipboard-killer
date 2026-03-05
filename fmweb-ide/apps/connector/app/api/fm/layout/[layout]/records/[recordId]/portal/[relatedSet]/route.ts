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
      recordId: string;
      relatedSet: string;
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

  return withRouteMetrics(request, correlationId, "fm.portal.upsert", async () => {
    const body = await parseJson<Record<string, unknown>>(request, {});

    if (typeof body.row !== "object" || body.row === null) {
      return jsonError(request, correlationId, "invalid_payload", "Expected body.row object", 400);
    }

    const { layout, recordId, relatedSet } = await context.params;

    const row = await fileMakerClient.upsertPortalRow(
      auth.session.id,
      decodeURIComponent(layout),
      decodeURIComponent(recordId),
      decodeURIComponent(relatedSet),
      body.row as Record<string, unknown>
    );

    return jsonOk(request, correlationId, row);
  });
}

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{
      layout: string;
      recordId: string;
      relatedSet: string;
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

  return withRouteMetrics(request, correlationId, "fm.portal.delete", async () => {
    const rowId = request.nextUrl.searchParams.get("rowId");

    if (rowId === null) {
      return jsonError(request, correlationId, "invalid_query", "rowId is required", 400);
    }

    const { layout, recordId, relatedSet } = await context.params;

    const result = await fileMakerClient.deletePortalRow(
      auth.session.id,
      decodeURIComponent(layout),
      decodeURIComponent(recordId),
      decodeURIComponent(relatedSet),
      rowId
    );

    return jsonOk(request, correlationId, result);
  });
}
