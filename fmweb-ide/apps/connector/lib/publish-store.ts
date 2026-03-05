import { promises as fs } from "fs";
import path from "path";

import type { AppManifest, PublishArtifact } from "@fmweb/shared";
import { PublishArtifactSchema } from "@fmweb/shared";
import { signManifest } from "@fmweb/shared/signature";

import { getManifestSigningSecret } from "./env";

const PUBLISH_DIR = path.join(process.cwd(), ".data", "published");

const parseVersion = (value: string) => {
  const cleaned = value.startsWith("v") ? value.slice(1) : value;
  const parts = cleaned.split(".");

  if (parts.length !== 3) {
    throw new Error(`Invalid version ${value}`);
  }

  const major = Number(parts[0]);
  const minor = Number(parts[1]);
  const patch = Number(parts[2]);

  if ([major, minor, patch].some((part) => Number.isNaN(part))) {
    throw new Error(`Invalid version ${value}`);
  }

  return { major, minor, patch };
};

const compareVersion = (a: string, b: string) => {
  const pa = parseVersion(a);
  const pb = parseVersion(b);

  if (pa.major !== pb.major) {
    return pa.major - pb.major;
  }

  if (pa.minor !== pb.minor) {
    return pa.minor - pb.minor;
  }

  return pa.patch - pb.patch;
};

const nextVersion = (versions: string[]): string => {
  if (versions.length === 0) {
    return "v0.1.0";
  }

  const latest = [...versions].sort(compareVersion).at(-1) ?? "v0.1.0";
  const parsed = parseVersion(latest);

  return `v${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
};

const ensureDirectory = async () => {
  await fs.mkdir(PUBLISH_DIR, { recursive: true });
};

const fileForVersion = (version: string) => path.join(PUBLISH_DIR, `${version}.json`);

export const listPublishedVersions = async (): Promise<string[]> => {
  await ensureDirectory();
  const entries = await fs.readdir(PUBLISH_DIR, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /^v\d+\.\d+\.\d+\.json$/.test(name))
    .map((name) => name.replace(/\.json$/, ""))
    .sort(compareVersion);
};

export const getPublishedArtifact = async (version: string): Promise<PublishArtifact | null> => {
  await ensureDirectory();

  try {
    const raw = await fs.readFile(fileForVersion(version), "utf8");
    return PublishArtifactSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const getLatestPublishedArtifact = async (): Promise<PublishArtifact | null> => {
  const versions = await listPublishedVersions();
  const latest = versions.at(-1);

  if (latest === undefined) {
    return null;
  }

  return getPublishedArtifact(latest);
};

export const publishManifest = async (manifest: AppManifest, forcedVersion?: string) => {
  await ensureDirectory();

  const versions = await listPublishedVersions();
  const version = forcedVersion ?? nextVersion(versions);
  const secret = getManifestSigningSecret();
  const signature = signManifest(manifest, secret);

  const artifact = PublishArtifactSchema.parse({
    version,
    manifest,
    signature,
    createdAt: new Date().toISOString()
  });

  await fs.writeFile(fileForVersion(version), JSON.stringify(artifact, null, 2), "utf8");

  return artifact;
};
