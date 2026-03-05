import { NextResponse } from "next/server";

import { serverLogger } from "@/lib/logger";

const resolveVersion = () => {
  return process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? "dev";
};

export async function GET() {
  const version = resolveVersion();

  serverLogger.debug({ route: "/api/version", version }, "Connector version check");

  return NextResponse.json({ version });
}
