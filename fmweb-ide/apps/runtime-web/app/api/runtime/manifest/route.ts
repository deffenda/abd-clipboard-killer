import { verifyManifestSignature } from "@fmweb/shared/signature";
import { AppManifestSchema, PublishArtifactSchema } from "@fmweb/shared";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getConnectorUrl } from "@/lib/connector";

const signingSecret = process.env.MANIFEST_SIGNING_SECRET ?? "fmweb-dev-signing-secret";

const fetchArtifact = async (version: string | null) => {
  const endpoint =
    version === null
      ? `${getConnectorUrl()}/api/publish/latest`
      : `${getConnectorUrl()}/api/publish/version/${encodeURIComponent(version)}`;

  const response = await fetch(endpoint, {
    cache: "no-store"
  });

  const payload = (await response.json()) as {
    ok: boolean;
    message?: string;
    data?: unknown;
  };

  if (!response.ok || !payload.ok) {
    throw new Error(payload.message ?? "Failed to fetch published artifact");
  }

  return PublishArtifactSchema.parse(payload.data);
};

export async function GET(request: NextRequest) {
  try {
    const version = request.nextUrl.searchParams.get("version");
    const artifact = await fetchArtifact(version);

    const valid = verifyManifestSignature(artifact.manifest, artifact.signature, signingSecret);
    if (!valid) {
      return NextResponse.json(
        {
          ok: false,
          message: "Manifest signature validation failed"
        },
        {
          status: 400
        }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        version: artifact.version,
        manifest: AppManifestSchema.parse(artifact.manifest),
        signature: artifact.signature,
        createdAt: artifact.createdAt
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Failed to load runtime manifest"
      },
      {
        status: 500
      }
    );
  }
}
