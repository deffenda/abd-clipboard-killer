import { UpdateRecordBodySchema } from "@fmweb/shared";
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
      recordId: string;
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

  return withRouteMetrics(request, correlationId, "fm.record.get", async () => {
    const { layout, recordId } = await context.params;
    const record = await fileMakerClient.getRecord(
      auth.session.id,
      decodeURIComponent(layout),
      decodeURIComponent(recordId),
      correlationId
    );

    return jsonOk(request, correlationId, record);
  });
}

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      layout: string;
      recordId: string;
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

  return withRouteMetrics(request, correlationId, "fm.record.update", async () => {
    const { layout, recordId } = await context.params;
    const body = await parseJson<Record<string, unknown>>(request, {});
    const parsed = UpdateRecordBodySchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        request,
        correlationId,
        "invalid_payload",
        "Invalid update payload",
        400,
        parsed.error.issues
      );
    }

    const record = await fileMakerClient.updateRecord(
      auth.session.id,
      decodeURIComponent(layout),
      decodeURIComponent(recordId),
      parsed.data.data,
      correlationId
    );

    return jsonOk(request, correlationId, record);
  });
}

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{
      layout: string;
      recordId: string;
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

  return withRouteMetrics(request, correlationId, "fm.record.delete", async () => {
    const { layout, recordId } = await context.params;
    const result = await fileMakerClient.deleteRecord(
      auth.session.id,
      decodeURIComponent(layout),
      decodeURIComponent(recordId),
      correlationId
    );

    return jsonOk(request, correlationId, result);
  });
}
