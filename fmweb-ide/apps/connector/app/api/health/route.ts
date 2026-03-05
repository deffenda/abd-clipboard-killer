import { NextResponse } from "next/server";

import { serverLogger } from "@/lib/logger";

export async function GET() {
  const payload = {
    ok: true,
    ts: new Date().toISOString()
  };

  serverLogger.debug({ route: "/api/health", payload }, "Connector health check");

  return NextResponse.json(payload);
}
