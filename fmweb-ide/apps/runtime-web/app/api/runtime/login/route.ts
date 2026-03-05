import type { NextRequest } from "next/server";

import { proxyToConnector } from "@/lib/connector";

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyToConnector(request, "/api/auth/login", {
    method: "POST",
    body
  });
}
