"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button, Card, Heading, Input, Text } from "@fmweb/ui";

import { runtimeApi } from "@/lib/runtime-api";
import { useCachedQuery } from "@/lib/use-cached-query";

import { useRuntimeManifest } from "@/components/use-runtime-manifest";

type RecordRow = {
  recordId: string;
  fieldData: Record<string, unknown>;
};

export default function RuntimeListPage() {
  const router = useRouter();
  const manifestState = useRuntimeManifest();

  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);
  const [findField, setFindField] = useState("FirstName");
  const [findValue, setFindValue] = useState("");

  const screen =
    manifestState.status === "loaded"
      ? manifestState.manifest.screens.find((item) => item.type === "list")
      : undefined;

  const queryPayload = useMemo(() => {
    if (findValue.trim().length === 0) {
      return null;
    }

    return {
      query: [{ [findField]: findValue }],
      limit,
      offset
    };
  }, [findField, findValue, limit, offset]);

  const key = `${screen?.listConfig?.layout ?? "none"}:${offset}:${limit}:${findField}:${findValue}`;

  const query = useCachedQuery(
    key,
    async () => {
      if (screen?.listConfig?.layout === undefined) {
        return { data: [], totalCount: 0 };
      }

      if (queryPayload !== null) {
        return runtimeApi.post<{ data: RecordRow[]; totalCount: number }>(
          `layout/${encodeURIComponent(screen.listConfig.layout)}/_find`,
          queryPayload
        );
      }

      return runtimeApi.get<{ data: RecordRow[]; totalCount: number }>(
        `layout/${encodeURIComponent(screen.listConfig.layout)}/records?limit=${limit}&offset=${offset}`
      );
    },
    3_000
  );

  if (manifestState.status === "loading") {
    return (
      <main>
        <Card>
          <Text>Loading list manifest...</Text>
        </Card>
      </main>
    );
  }

  if (manifestState.status === "error") {
    return (
      <main>
        <Card>
          <Text>{manifestState.message}</Text>
        </Card>
      </main>
    );
  }

  if (screen === undefined || screen.listConfig === undefined) {
    return (
      <main>
        <Card>
          <Text>No list screen configured in manifest.</Text>
        </Card>
      </main>
    );
  }

  if (query.error !== null && query.error.toLowerCase().includes("authentication")) {
    router.push("/login");
  }

  return (
    <main>
      <Card>
        <Heading level={2}>List Screen: {screen.name}</Heading>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <Text>Find field</Text>
          <Input value={findField} onChange={setFindField} />
          <Text>Value</Text>
          <Input value={findValue} onChange={setFindValue} />
          <Button onClick={() => void query.refresh()}>Find</Button>
          <Button
            onClick={() => {
              setFindValue("");
              void query.refresh();
            }}
          >
            Reset
          </Button>
        </div>

        <div style={{ marginTop: "12px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {screen.listConfig.columns.map((column) => (
                  <th key={column} style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>
                    {column}
                  </th>
                ))}
                <th style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(query.data?.data ?? []).map((row) => (
                <tr key={row.recordId}>
                  {screen.listConfig!.columns.map((column) => (
                    <td
                      key={`${row.recordId}-${column}`}
                      style={{ borderBottom: "1px solid #e2e8f0" }}
                    >
                      {String(row.fieldData[column] ?? "")}
                    </td>
                  ))}
                  <td style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <Button onClick={() => router.push(`/record/${row.recordId}`)}>Open</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: "10px", display: "flex", gap: "8px", alignItems: "center" }}>
          <Button
            onClick={() => {
              const next = Math.max(0, offset - limit);
              setOffset(next);
            }}
          >
            Prev
          </Button>
          <Button
            onClick={() => {
              setOffset(offset + limit);
            }}
          >
            Next
          </Button>
          <Text>
            Offset {offset}, Limit {limit}, Total {query.data?.totalCount ?? 0}
          </Text>
          <Input value={String(limit)} onChange={(value) => setLimit(Number(value) || 20)} />
        </div>
      </Card>
    </main>
  );
}
