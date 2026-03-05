import type { ZodError } from "zod";

import { AppManifestSchema } from "./schemas";
import type { AppManifest } from "./types";

export type ManifestValidationResult =
  | {
      success: true;
      data: AppManifest;
    }
  | {
      success: false;
      errors: string[];
    };

const toErrorMessages = (error: ZodError) => {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "manifest";
    return `${path}: ${issue.message}`;
  });
};

export const validateManifest = (input: unknown): ManifestValidationResult => {
  const parsed = AppManifestSchema.safeParse(input);

  if (parsed.success) {
    return {
      success: true,
      data: parsed.data
    };
  }

  return {
    success: false,
    errors: toErrorMessages(parsed.error)
  };
};

export const assertManifest = (input: unknown): AppManifest => {
  return AppManifestSchema.parse(input);
};
