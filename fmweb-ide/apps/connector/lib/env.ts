export type FileMakerEnvConfig = {
  host: string;
  file: string;
  username: string;
  password: string;
  verifyTls: boolean;
};

export const getFileMakerEnvConfig = (): FileMakerEnvConfig | null => {
  const host = process.env.FM_HOST;
  const file = process.env.FM_FILE;
  const username = process.env.FM_USERNAME;
  const password = process.env.FM_PASSWORD;

  if (
    host === undefined ||
    file === undefined ||
    username === undefined ||
    password === undefined
  ) {
    return null;
  }

  const verifyTls = (process.env.FM_VERIFY_TLS ?? "true").toLowerCase() !== "false";

  return {
    host: host.replace(/\/$/, ""),
    file,
    username,
    password,
    verifyTls
  };
};

export const getAllowedOrigins = (): string[] => {
  const raw = process.env.ALLOWED_ORIGINS;

  if (raw === undefined || raw.trim().length === 0) {
    return ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"];
  }

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
};

export const getManifestSigningSecret = (): string => {
  return process.env.MANIFEST_SIGNING_SECRET ?? "fmweb-dev-signing-secret";
};
