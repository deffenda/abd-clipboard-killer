"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { ComponentNode } from "@fmweb/shared";
import { mergeResponsiveStyle } from "@fmweb/shared";
import { Button, Card, Heading, Input, Text } from "@fmweb/ui";

import { executeActions } from "@/lib/actions";
import { runtimeApi } from "@/lib/runtime-api";

import { useRuntimeManifest } from "@/components/use-runtime-manifest";

type RuntimeRecord = {
  recordId: string;
  fieldData: Record<string, unknown>;
  portalData?: Record<string, Array<Record<string, unknown>>>;
};

const flatten = (nodes: ComponentNode[]): ComponentNode[] => {
  const all: ComponentNode[] = [];

  for (const node of nodes) {
    all.push(node);
    all.push(...flatten(node.children));
  }

  return all;
};

export default function RuntimeRecordPage() {
  const params = useParams<{ recordId: string }>();
  const router = useRouter();
  const recordId = String(params.recordId);

  const manifestState = useRuntimeManifest();

  const [record, setRecord] = useState<RuntimeRecord | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const detailScreen =
    manifestState.status === "loaded"
      ? manifestState.manifest.screens.find((item) => item.type === "detail")
      : undefined;

  const layout = detailScreen?.baseLayoutContext ?? "Contacts";

  const notify = (text: string, variant: "info" | "error" = "info") => {
    setMessage(variant === "error" ? `Error: ${text}` : text);
  };

  const loadRecord = async () => {
    setLoading(true);

    try {
      const data = await runtimeApi.get<RuntimeRecord>(
        `layout/${encodeURIComponent(layout)}/records/${encodeURIComponent(recordId)}`
      );

      setRecord(data);
      setFormValues(
        Object.fromEntries(
          Object.entries(data.fieldData ?? {}).map(([key, value]) => [key, String(value ?? "")])
        )
      );
      setMessage(null);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to load record";
      setMessage(text);
      if (text.toLowerCase().includes("authentication")) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecord();
  }, [layout, recordId]);

  const saveRecord = async () => {
    try {
      await runtimeApi.patch(
        `layout/${encodeURIComponent(layout)}/records/${encodeURIComponent(recordId)}`,
        {
          data: formValues
        }
      );
      notify("Record saved");
      await loadRecord();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Save failed", "error");
    }
  };

  useEffect(() => {
    if (detailScreen === undefined) {
      return;
    }

    const run = async () => {
      const actions = flatten(detailScreen.components).flatMap((node) => node.events.onLoad);

      if (actions.length > 0) {
        await executeActions(actions, {
          layout,
          recordId,
          navigate: (route) => router.push(route),
          notify
        });
      }
    };

    void run();
  }, [detailScreen, layout, recordId, router]);

  const portalRows = useMemo(() => {
    const portal = detailScreen?.portal;

    if (portal === undefined || record?.portalData === undefined) {
      return [];
    }

    return record.portalData[portal.relatedSet] ?? [];
  }, [detailScreen?.portal, record?.portalData]);

  const upsertPortalRow = async (row: Record<string, unknown>) => {
    const portal = detailScreen?.portal;
    if (portal === undefined) {
      return;
    }

    await runtimeApi.post(
      `layout/${encodeURIComponent(layout)}/records/${encodeURIComponent(recordId)}/portal/${encodeURIComponent(portal.relatedSet)}`,
      {
        row
      }
    );

    await loadRecord();
  };

  const deletePortalRow = async (rowId: string) => {
    const portal = detailScreen?.portal;
    if (portal === undefined) {
      return;
    }

    await runtimeApi.delete(
      `layout/${encodeURIComponent(layout)}/records/${encodeURIComponent(recordId)}/portal/${encodeURIComponent(portal.relatedSet)}?rowId=${encodeURIComponent(rowId)}`
    );

    await loadRecord();
  };

  if (manifestState.status === "loading" || loading) {
    return (
      <main>
        <Card>
          <Text>Loading record...</Text>
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

  if (detailScreen === undefined) {
    return (
      <main>
        <Card>
          <Text>No detail screen configured.</Text>
        </Card>
      </main>
    );
  }

  return (
    <main>
      <Card>
        <Heading level={2}>{detailScreen.name}</Heading>
        <Text>Layout: {layout}</Text>
        <Text>Record ID: {recordId}</Text>
        {message !== null ? <Text>{message}</Text> : null}

        {detailScreen.components.map((node) => {
          const binding = node.bindings[0];
          const field = binding?.field;
          const style = mergeResponsiveStyle(
            node.style,
            "desktop",
            manifestState.manifest.breakpoints
          );

          if (node.type === "Input") {
            const value = field === undefined ? "" : (formValues[field] ?? "");
            return (
              <div key={node.id} style={{ marginBottom: "8px" }}>
                <Text>{String(node.props.label ?? field ?? "Input")}</Text>
                <Input
                  value={value}
                  onChange={(next) => {
                    if (field !== undefined) {
                      setFormValues((current) => ({ ...current, [field]: next }));
                    }
                  }}
                  style={style}
                />
              </div>
            );
          }

          if (node.type === "Text") {
            const text =
              field === undefined
                ? node.props.text
                : (formValues[field] ?? record?.fieldData[field] ?? "");
            return (
              <Text key={node.id} style={style}>
                {String(text ?? "")}
              </Text>
            );
          }

          if (node.type === "Button") {
            return (
              <Button
                key={node.id}
                style={style}
                onClick={() => {
                  void executeActions(node.events.onClick, {
                    layout,
                    recordId,
                    navigate: (route) => router.push(route),
                    notify
                  });
                }}
              >
                {String(node.props.label ?? "Button")}
              </Button>
            );
          }

          return (
            <div key={node.id}>
              <Text>{node.type}</Text>
            </div>
          );
        })}

        <div style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
          <Button onClick={() => void saveRecord()}>Save</Button>
          <Button onClick={() => router.push("/list")}>Back to List</Button>
        </div>

        {detailScreen.portal !== undefined ? (
          <Card style={{ marginTop: "14px" }}>
            <Heading level={3}>Related: {detailScreen.portal.relatedSet}</Heading>

            {portalRows.map((row, index) => (
              <div
                key={String(row.id ?? index)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: "6px",
                  marginBottom: "8px"
                }}
              >
                {detailScreen.portal!.fields.map((field) => (
                  <Input
                    key={field}
                    value={String(row[field] ?? "")}
                    onChange={(value) => {
                      const next = {
                        ...row,
                        [field]: value
                      };

                      void upsertPortalRow(next);
                    }}
                  />
                ))}

                <Button
                  onClick={() => {
                    void deletePortalRow(String(row.id));
                  }}
                >
                  Delete
                </Button>
              </div>
            ))}

            <Button
              onClick={() => {
                const row = Object.fromEntries(
                  detailScreen.portal!.fields.map((field) => [field, ""])
                );
                void upsertPortalRow(row);
              }}
            >
              Add Related Row
            </Button>
          </Card>
        ) : null}
      </Card>
    </main>
  );
}
