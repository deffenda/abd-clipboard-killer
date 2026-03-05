"use client";

import {
  Button,
  Card,
  Container,
  Heading,
  Input,
  Select,
  Text,
  themeTokensToCssVariables
} from "@fmweb/ui";
import { mergeResponsiveStyle } from "@fmweb/shared";
import type { AppManifest, ComponentNode } from "@fmweb/shared";

type RendererProps = {
  manifest: AppManifest;
  nodes: ComponentNode[];
  activeBreakpoint: string;
  selectedId?: string;
  onSelect: (id: string) => void;
  mode: "design" | "preview";
};

const applySelectStyle = (selected: boolean, mode: "design" | "preview") => {
  if (mode === "preview") {
    return {};
  }

  return {
    outline: selected ? "2px solid #2563eb" : "1px dashed rgba(37,99,235,0.2)",
    outlineOffset: "2px",
    cursor: "pointer"
  };
};

const renderLeaf = (
  node: ComponentNode,
  style: Record<string, string>,
  onSelect: (id: string) => void,
  selected: boolean,
  mode: "design" | "preview"
) => {
  const textValue = String(node.props.text ?? node.props.label ?? node.type);

  switch (node.type) {
    case "Text":
      return <Text style={{ ...style, ...applySelectStyle(selected, mode) }}>{textValue}</Text>;
    case "Heading":
      return (
        <Heading style={{ ...style, ...applySelectStyle(selected, mode) }} level={2}>
          {textValue}
        </Heading>
      );
    case "Button":
      return (
        <Button
          style={{ ...style, ...applySelectStyle(selected, mode) }}
          onClick={() => {
            if (mode === "design") {
              onSelect(node.id);
            }
          }}
        >
          {textValue}
        </Button>
      );
    case "Input":
      return (
        <Input
          style={{ ...style, ...applySelectStyle(selected, mode) }}
          placeholder={String(node.props.placeholder ?? "Input")}
          value={String(node.props.value ?? "")}
          onChange={() => {
            // Canvas preview does not mutate app data.
          }}
        />
      );
    case "Select": {
      const options = Array.isArray(node.props.options)
        ? (node.props.options as Array<{ label: string; value: string }>)
        : [
            { value: "one", label: "One" },
            { value: "two", label: "Two" }
          ];

      return (
        <Select
          style={{ ...style, ...applySelectStyle(selected, mode) }}
          options={options}
          value={String(node.props.value ?? options[0]?.value ?? "")}
          onChange={() => {
            // Canvas preview does not mutate app data.
          }}
        />
      );
    }
    case "Portal":
      return (
        <Card style={{ ...style, ...applySelectStyle(selected, mode) }}>
          <Heading level={4}>Portal Component</Heading>
          <Text>Related rows preview placeholder</Text>
        </Card>
      );
    case "Table":
      return (
        <Card style={{ ...style, ...applySelectStyle(selected, mode) }}>
          <Heading level={4}>Table Component</Heading>
          <Text>Found set preview placeholder</Text>
        </Card>
      );
    default:
      return (
        <Container style={{ ...style, ...applySelectStyle(selected, mode) }}>
          <Text>{textValue}</Text>
        </Container>
      );
  }
};

const renderNode = (
  manifest: AppManifest,
  node: ComponentNode,
  activeBreakpoint: string,
  selectedId: string | undefined,
  onSelect: (id: string) => void,
  mode: "design" | "preview"
): JSX.Element => {
  const mergedStyle = mergeResponsiveStyle(node.style, activeBreakpoint, manifest.breakpoints);
  const styleMap = Object.fromEntries(
    Object.entries(mergedStyle).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  );

  const selected = node.id === selectedId;

  const content =
    node.children.length > 0 ? (
      <Container
        style={{
          ...styleMap,
          ...applySelectStyle(selected, mode),
          padding: styleMap.padding ?? "8px",
          minHeight: styleMap.height ?? "40px"
        }}
      >
        {node.children.map((child) => (
          <div key={child.id} onClick={(event) => event.stopPropagation()}>
            {renderNode(manifest, child, activeBreakpoint, selectedId, onSelect, mode)}
          </div>
        ))}
      </Container>
    ) : (
      renderLeaf(node, styleMap, onSelect, selected, mode)
    );

  return (
    <div
      key={node.id}
      onClick={(event) => {
        event.stopPropagation();
        if (mode === "design") {
          onSelect(node.id);
        }
      }}
      style={{ marginBottom: "8px" }}
    >
      {content}
    </div>
  );
};

export const ComponentRenderer = ({
  manifest,
  nodes,
  activeBreakpoint,
  selectedId,
  onSelect,
  mode
}: RendererProps) => {
  const theme = manifest.themes[0];

  return (
    <div style={theme === undefined ? undefined : themeTokensToCssVariables(theme.tokens)}>
      {nodes.map((node) =>
        renderNode(manifest, node, activeBreakpoint, selectedId, onSelect, mode)
      )}
    </div>
  );
};
