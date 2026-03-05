import { NextResponse } from "next/server";

import { createDefaultManifest } from "@fmweb/shared";

export function GET() {
  const manifest = createDefaultManifest("Runtime Local Stub");
  return NextResponse.json(manifest);
}
