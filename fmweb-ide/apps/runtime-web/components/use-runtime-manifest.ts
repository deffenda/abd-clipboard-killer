"use client";

import { useEffect, useState } from "react";

import type { AppManifest } from "@fmweb/shared";

import { loadRuntimeManifest } from "@/lib/runtime-api";

type ManifestState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; manifest: AppManifest; version: string };

export const useRuntimeManifest = (version?: string) => {
  const [state, setState] = useState<ManifestState>({ status: "loading" });

  useEffect(() => {
    const load = async () => {
      setState({ status: "loading" });

      try {
        const payload = await loadRuntimeManifest(version);
        setState({
          status: "loaded",
          manifest: payload.manifest,
          version: payload.version
        });
      } catch (error) {
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Failed to load manifest"
        });
      }
    };

    void load();
  }, [version]);

  return state;
};
