"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Card, Heading, Select, Text, themeTokensToCssVariables } from "@fmweb/ui";

import { loadAdminVersions } from "@/lib/runtime-api";

import { useRuntimeManifest } from "./use-runtime-manifest";

export const RuntimeHome = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const version = searchParams.get("version") ?? undefined;
  const adminMode = searchParams.get("admin") === "1";

  const state = useRuntimeManifest(version);
  const [versions, setVersions] = useState<string[]>([]);

  useEffect(() => {
    if (!adminMode) {
      return;
    }

    const run = async () => {
      try {
        const data = await loadAdminVersions();
        setVersions(data);
      } catch {
        setVersions([]);
      }
    };

    void run();
  }, [adminMode]);

  const themeStyle = useMemo(() => {
    if (state.status !== "loaded") {
      return undefined;
    }

    const theme = state.manifest.themes[0];
    if (theme === undefined) {
      return undefined;
    }

    return themeTokensToCssVariables(theme.tokens);
  }, [state]);

  if (state.status === "loading") {
    return (
      <main>
        <Card>
          <Heading level={2}>FMWeb Runtime</Heading>
          <Text>Loading published manifest...</Text>
        </Card>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main>
        <Card>
          <Heading level={2}>Runtime error</Heading>
          <Text>{state.message}</Text>
          <Text>You can publish from IDE first, then refresh runtime.</Text>
        </Card>
      </main>
    );
  }

  const firstDetail = state.manifest.screens.find((screen) => screen.type === "detail");
  const firstList = state.manifest.screens.find((screen) => screen.type === "list");

  return (
    <main style={themeStyle}>
      <Card>
        <Heading level={1}>{state.manifest.name}</Heading>
        <Text>Published version: {state.version}</Text>
        <Text>Manifest loaded and signature verified.</Text>

        {adminMode ? (
          <div style={{ margin: "10px 0" }}>
            <Text>Admin version selector</Text>
            <Select
              value={state.version}
              options={versions.map((item) => ({ value: item, label: item }))}
              onChange={(nextVersion) => {
                router.replace(`/?admin=1&version=${encodeURIComponent(nextVersion)}`);
              }}
            />
          </div>
        ) : null}

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link href="/login">Login</Link>
          {firstList !== undefined ? <Link href="/list">Open List Screen</Link> : null}
          {firstDetail !== undefined ? (
            <Link href="/record/1">Open Detail Screen (record 1)</Link>
          ) : null}
        </div>
      </Card>
    </main>
  );
};
