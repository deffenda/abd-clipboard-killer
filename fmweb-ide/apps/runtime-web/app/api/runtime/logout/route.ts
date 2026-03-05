import type { NextRequest } from "next/server";

import { proxyToConnector } from "@/lib/connector";

export async function POST(request: NextRequest) {
  return proxyToConnector(request, "/api/auth/logout", {
    method: "POST"
  });
}
