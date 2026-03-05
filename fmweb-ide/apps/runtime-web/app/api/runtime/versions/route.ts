import type { NextRequest } from "next/server";

import { proxyToConnector } from "@/lib/connector";

export async function GET(request: NextRequest) {
  const admin = request.nextUrl.searchParams.get("admin") ?? "0";
  return proxyToConnector(request, `/api/publish/versions?admin=${encodeURIComponent(admin)}`);
}
