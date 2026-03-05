"use client";

import JSZip from "jszip";
import { useEffect, useMemo, useState } from "react";

import {
  migrateManifest,
  partitionPublishChecks,
  runPrePublishChecks,
  validateManifest,
  type Action,
  type ComponentNode,
  type PublishCheck
} from "@fmweb/shared";
import { Button, Input, Select } from "@fmweb/ui";

import { ComponentRenderer } from "./component-renderer";
import {
  useActiveScreen,
  useCanvasWidth,
  useIdeStore,
  useSelectedComponent
} from "../lib/ide-store";

const palette = [
  "Text",
  "Heading",
  "Button",
  "Input",
  "Select",
  "Container",
  "Card",
  "Portal",
  "Table"
];

const styleFields: Array<keyof ComponentNode["style"]["base"]> = [
  "padding",
  "margin",
  "width",
  "height",
  "display",
  "background",
  "border",
  "borderRadius",
  "fontSize",
  "fontWeight",
  "color"
];

const actionTypes: Action["type"][] = [
  "navigate",
  "runScript",
  "createRecord",
  "updateRecord",
  "deleteRecord",
  "showToast",
  "showDialog",
  "setValue",
  "submit"
];

const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2, 12);
};

const parseApiPayload = async (response: Response) => {
  const payload = (await response.json()) as {
    ok: boolean;
    data?: unknown;
    message?: string;
    details?: unknown;
  };

  if (!response.ok || !payload.ok) {
    throw new Error(payload.message ?? `Request failed (${response.status})`);
  }

  return payload.data;
};

const exportProjectZip = async (manifest: object) => {
  const zip = new JSZip();
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.folder("assets")?.file(".keep", "assets placeholder");

  const blob = await zip.generateAsync({ type: "blob" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "fmweb-project.zip";
  link.click();
  URL.revokeObjectURL(link.href);
};

const importProjectZip = async (file: File) => {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const manifestFile = zip.file("manifest.json");

  if (manifestFile === null) {
    throw new Error("Zip is missing manifest.json");
  }

  const manifestText = await manifestFile.async("string");
  const parsed = JSON.parse(manifestText) as unknown;

  try {
    return migrateManifest(parsed);
  } catch {
    const validated = validateManifest(parsed);
    if (!validated.success) {
      throw new Error(validated.errors.join("\n"));
    }

    return validated.data;
  }
};

const LayersTree = ({
  nodes,
  selected,
  onSelect,
  depth = 0
}: {
  nodes: ComponentNode[];
  selected?: string;
  onSelect: (id: string) => void;
  depth?: number;
}) => {
  return (
    <ul style={{ listStyle: "none", paddingLeft: depth === 0 ? 8 : 12, margin: 0 }}>
      {nodes.map((node) => (
        <li key={node.id}>
          <button
            type="button"
            onClick={() => onSelect(node.id)}
            style={{
              border: "none",
              background: node.id === selected ? "#dbeafe" : "transparent",
              padding: "3px 6px",
              borderRadius: 6,
              width: "100%",
              textAlign: "left"
            }}
          >
            {node.type} ({node.id.slice(0, 6)})
          </button>

          {node.children.length > 0 ? (
            <LayersTree
              nodes={node.children}
              selected={selected}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
};

export const IdeShell = () => {
  const manifest = useIdeStore((state) => state.manifest);
  const activeScreen = useActiveScreen();
  const selectedComponent = useSelectedComponent();
  const selectedId = useIdeStore((state) => state.selectedComponentId);
  const activeBreakpoint = useIdeStore((state) => state.activeBreakpoint);
  const canvasWidth = useCanvasWidth();

  const addComponent = useIdeStore((state) => state.addComponent);
  const selectComponent = useIdeStore((state) => state.selectComponent);
  const deleteSelected = useIdeStore((state) => state.deleteSelected);
  const duplicateSelected = useIdeStore((state) => state.duplicateSelected);
  const updateSelectedProps = useIdeStore((state) => state.updateSelectedProps);
  const updateSelectedStyle = useIdeStore((state) => state.updateSelectedStyle);
  const updateSelectedBinding = useIdeStore((state) => state.updateSelectedBinding);
  const addSelectedAction = useIdeStore((state) => state.addSelectedAction);
  const updateThemeTokens = useIdeStore((state) => state.updateThemeTokens);

  const setActiveScreen = useIdeStore((state) => state.setActiveScreen);
  const setActiveBreakpoint = useIdeStore((state) => state.setActiveBreakpoint);
  const setDevicePreset = useIdeStore((state) => state.setDevicePreset);
  const setScreenBaseLayout = useIdeStore((state) => state.setScreenBaseLayout);
  const configureListScreen = useIdeStore((state) => state.configureListScreen);

  const undo = useIdeStore((state) => state.undo);
  const redo = useIdeStore((state) => state.redo);
  const newProject = useIdeStore((state) => state.newProject);
  const saveToStorage = useIdeStore((state) => state.saveToStorage);
  const loadFromStorage = useIdeStore((state) => state.loadFromStorage);
  const loadManifest = useIdeStore((state) => state.loadManifest);
  const appendLog = useIdeStore((state) => state.appendLog);

  const connectorUrl = useIdeStore((state) => state.connectorUrl);
  const setConnectorUrl = useIdeStore((state) => state.setConnectorUrl);
  const layouts = useIdeStore((state) => state.layouts);
  const fields = useIdeStore((state) => state.fields);
  const selectedLayout = useIdeStore((state) => state.selectedLayout);
  const setLayouts = useIdeStore((state) => state.setLayouts);
  const setFields = useIdeStore((state) => state.setFields);
  const setSelectedLayout = useIdeStore((state) => state.setSelectedLayout);
  const selectedDataTab = useIdeStore((state) => state.selectedDataTab);
  const setSelectedDataTab = useIdeStore((state) => state.setSelectedDataTab);
  const logs = useIdeStore((state) => state.logs);

  const previewMode = useIdeStore((state) => state.previewMode);
  const setPreviewMode = useIdeStore((state) => state.setPreviewMode);
  const publishVersion = useIdeStore((state) => state.publishVersion);
  const publishWarnings = useIdeStore((state) => state.publishWarnings);
  const checkErrors = useIdeStore((state) => state.checkErrors);
  const setPublishState = useIdeStore((state) => state.setPublishState);

  const [consoleOpen, setConsoleOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [loginUsername, setLoginUsername] = useState("runtime");
  const [loginPassword, setLoginPassword] = useState("runtime");

  const [newActionEvent, setNewActionEvent] = useState<keyof ComponentNode["events"]>("onClick");
  const [newActionType, setNewActionType] = useState<Action["type"]>("navigate");
  const [newActionTarget, setNewActionTarget] = useState("/");

  const [wizardName, setWizardName] = useState("New Wizard App");
  const [wizardLayout, setWizardLayout] = useState("Contacts");
  const [wizardPortal, setWizardPortal] = useState(true);

  const runWizard = useIdeStore((state) => state.runWizard);
  const applyTemplate = useIdeStore((state) => state.applyTemplate);

  const checks = useMemo(() => runPrePublishChecks(manifest), [manifest]);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const connectFileMaker = async () => {
    const response = await fetch(`${connectorUrl}/api/fm/login`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        username: loginUsername,
        password: loginPassword
      })
    });

    await parseApiPayload(response);
    appendLog("Connector session established");
  };

  const refreshLayouts = async () => {
    const response = await fetch(`${connectorUrl}/api/fm/layouts`, {
      credentials: "include"
    });

    const data = (await parseApiPayload(response)) as {
      layouts: string[];
    };

    setLayouts(data.layouts);
    appendLog(`Fetched ${data.layouts.length} layouts`);
  };

  const refreshFields = async (layout: string) => {
    const response = await fetch(
      `${connectorUrl}/api/fm/layout/${encodeURIComponent(layout)}/fields`,
      {
        credentials: "include"
      }
    );

    const data = (await parseApiPayload(response)) as {
      fields: string[];
    };

    setFields(data.fields);
    appendLog(`Fetched ${data.fields.length} fields for ${layout}`);
  };

  const handleImport = async (file: File | null) => {
    if (file === null) {
      return;
    }

    try {
      const imported = await importProjectZip(file);
      loadManifest(imported);
      setImportError(null);
      appendLog("Imported project from zip");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed";
      setImportError(message);
    }
  };

  const handlePublish = async () => {
    const checkSummary = runPrePublishChecks(manifest);
    const partition = partitionPublishChecks(checkSummary);

    setPublishState({
      errors: partition.errors.map((item) => item.message),
      warnings: partition.warnings.map((item) => item.message)
    });

    if (partition.errors.length > 0) {
      appendLog("Publish blocked by pre-publish errors");
      return;
    }

    const response = await fetch(`${connectorUrl}/api/publish`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ manifest })
    });

    const data = (await parseApiPayload(response)) as {
      artifact: {
        version: string;
      };
      checks: {
        warnings: PublishCheck[];
        errors: PublishCheck[];
      };
    };

    setPublishState({
      version: data.artifact.version,
      warnings: data.checks.warnings.map((item) => item.message),
      errors: data.checks.errors.map((item) => item.message)
    });

    appendLog(`Published ${data.artifact.version}`);
  };

  const screenComponents = activeScreen.components;

  const selectedBinding = selectedComponent?.bindings[0];

  return (
    <main className="ide-shell-root">
      <header className="toolbar">
        <div className="toolbar-group">
          <Button onClick={() => newProject()}>New Project</Button>
          <Button onClick={saveToStorage}>Save (localStorage)</Button>
          <Button onClick={loadFromStorage}>Load</Button>
          <Button
            onClick={() => {
              void exportProjectZip(manifest);
            }}
          >
            Export Zip
          </Button>
          <label className="file-button">
            Import Zip
            <input
              type="file"
              accept=".zip"
              onChange={(event) => {
                void handleImport(event.target.files?.[0] ?? null);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>

        <div className="toolbar-group">
          <Button onClick={undo}>Undo</Button>
          <Button onClick={redo}>Redo</Button>
          <Button onClick={() => setPreviewMode(!previewMode)}>
            {previewMode ? "Exit Preview" : "Preview"}
          </Button>
          <Button onClick={() => void handlePublish()}>Publish</Button>
        </div>
      </header>

      {importError !== null ? (
        <div className="error-banner">Import error: {importError}</div>
      ) : null}

      {publishVersion !== undefined ? (
        <div className="success-banner">Published version: {publishVersion}</div>
      ) : null}

      {checkErrors.length > 0 ? (
        <div className="error-banner">Publish blocked: {checkErrors.join(" | ")}</div>
      ) : null}

      {publishWarnings.length > 0 ? (
        <div className="warn-banner">Warnings: {publishWarnings.join(" | ")}</div>
      ) : null}

      <section className="layout-grid">
        <aside className="panel left-panel">
          <div className="tabs">
            {[
              ["palette", "Palette"],
              ["data", "Data"],
              ["templates", "Templates"],
              ["wizard", "Wizard"]
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={selectedDataTab === value ? "tab active" : "tab"}
                onClick={() => setSelectedDataTab(value as typeof selectedDataTab)}
              >
                {label}
              </button>
            ))}
          </div>

          {selectedDataTab === "palette" ? (
            <div className="scroll-area">
              <h3>Palette</h3>
              {palette.map((item) => (
                <div className="palette-item" key={item}>
                  <span
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData("text/plain", item)}
                  >
                    {item}
                  </span>
                  <Button onClick={() => addComponent(item)}>{`Add ${item}`}</Button>
                </div>
              ))}
            </div>
          ) : null}

          {selectedDataTab === "data" ? (
            <div className="scroll-area">
              <h3>Connector</h3>
              <label>Connector URL</label>
              <Input value={connectorUrl} onChange={setConnectorUrl} />

              <label>Username</label>
              <Input value={loginUsername} onChange={setLoginUsername} />

              <label>Password</label>
              <Input value={loginPassword} onChange={setLoginPassword} type="password" />

              <div className="inline-actions">
                <Button onClick={() => void connectFileMaker()}>Connect</Button>
                <Button
                  onClick={() => {
                    void refreshLayouts();
                  }}
                >
                  Refresh Layouts
                </Button>
              </div>

              <label>Layouts</label>
              <Select
                value={selectedLayout}
                options={layouts.map((layout) => ({ value: layout, label: layout }))}
                onChange={(layout) => {
                  setSelectedLayout(layout);
                  setScreenBaseLayout(layout);
                  void refreshFields(layout);
                }}
              />

              <label>Fields</label>
              <ul className="fields-list">
                {fields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>

              <Button
                onClick={() => {
                  if (selectedLayout !== undefined) {
                    configureListScreen(fields.slice(0, 3));
                  }
                }}
              >
                Configure List Screen
              </Button>
            </div>
          ) : null}

          {selectedDataTab === "templates" ? (
            <div className="scroll-area">
              <h3>Template Gallery</h3>
              <Button onClick={() => applyTemplate("blank")}>Blank</Button>
              <Button onClick={() => applyTemplate("crm")}>CRM Starter</Button>
              <Button onClick={() => applyTemplate("inventory")}>Inventory</Button>
              <Button onClick={() => applyTemplate("portal")}>Portal Manager</Button>
            </div>
          ) : null}

          {selectedDataTab === "wizard" ? (
            <div className="scroll-area">
              <h3>New App Wizard</h3>
              <label>App Name</label>
              <Input value={wizardName} onChange={setWizardName} />

              <label>Base Layout</label>
              <Input value={wizardLayout} onChange={setWizardLayout} />

              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={wizardPortal}
                  onChange={(event) => setWizardPortal(event.target.checked)}
                />
                Include related portal section
              </label>

              <Button
                onClick={() =>
                  runWizard({
                    appName: wizardName,
                    baseLayout: wizardLayout,
                    includePortal: wizardPortal
                  })
                }
              >
                Generate App
              </Button>
            </div>
          ) : null}
        </aside>

        <section className="panel canvas-panel">
          <div className="canvas-toolbar">
            <div className="inline-actions">
              <span>Screen:</span>
              <Select
                value={activeScreen.id}
                options={manifest.screens.map((screen) => ({
                  value: screen.id,
                  label: screen.name
                }))}
                onChange={setActiveScreen}
              />
            </div>

            <div className="inline-actions">
              <span>Device:</span>
              <Button
                onClick={() => {
                  setDevicePreset("phone");
                  setActiveBreakpoint("phone");
                }}
              >
                Phone
              </Button>
              <Button
                onClick={() => {
                  setDevicePreset("tablet");
                  setActiveBreakpoint("tablet");
                }}
              >
                Tablet
              </Button>
              <Button
                onClick={() => {
                  setDevicePreset("desktop");
                  setActiveBreakpoint("desktop");
                }}
              >
                Desktop
              </Button>
            </div>

            <div className="inline-actions">
              <span>Breakpoint:</span>
              <Select
                value={activeBreakpoint}
                options={manifest.breakpoints.map((breakpoint) => ({
                  value: breakpoint.name,
                  label: `${breakpoint.name} (${breakpoint.minWidth}px+)`
                }))}
                onChange={setActiveBreakpoint}
              />
            </div>

            <div className="inline-actions">
              <Button onClick={deleteSelected}>Delete</Button>
              <Button onClick={duplicateSelected}>Duplicate</Button>
            </div>
          </div>

          <div
            className="canvas-dropzone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const type = event.dataTransfer.getData("text/plain");
              if (type.length > 0) {
                addComponent(type, selectedId);
              }
            }}
          >
            <div
              className="canvas-surface"
              style={{ width: `${canvasWidth}px` }}
              onClick={() => selectComponent(undefined)}
            >
              <ComponentRenderer
                manifest={manifest}
                nodes={screenComponents}
                activeBreakpoint={activeBreakpoint}
                selectedId={selectedId}
                onSelect={(id) => selectComponent(id)}
                mode={previewMode ? "preview" : "design"}
              />
            </div>
          </div>
        </section>

        <aside className="panel right-panel">
          <h3>Layers</h3>
          <LayersTree nodes={screenComponents} selected={selectedId} onSelect={selectComponent} />

          <h3>Inspector</h3>
          {selectedComponent === undefined ? (
            <p>Select a component on the canvas.</p>
          ) : (
            <div className="scroll-area">
              <label>Label/Text</label>
              <Input
                value={String(selectedComponent.props.text ?? selectedComponent.props.label ?? "")}
                onChange={(value) => updateSelectedProps({ text: value, label: value })}
              />

              <label>Placeholder</label>
              <Input
                value={String(selectedComponent.props.placeholder ?? "")}
                onChange={(value) => updateSelectedProps({ placeholder: value })}
              />

              <h4>Binding</h4>
              <Select
                value={selectedBinding?.type ?? "record.field"}
                options={[
                  { value: "record.field", label: "record.field" },
                  { value: "record.readonly", label: "record.readonly" },
                  { value: "query.list", label: "query.list" },
                  { value: "portal.related", label: "portal.related" }
                ]}
                onChange={(value) => {
                  updateSelectedBinding({
                    id: makeId(),
                    type: value as ComponentNode["bindings"][number]["type"],
                    field: selectedBinding?.field ?? fields[0]
                  });
                }}
              />

              <Select
                value={selectedBinding?.field}
                options={fields.map((field) => ({ value: field, label: field }))}
                onChange={(field) => {
                  updateSelectedBinding({
                    id: selectedBinding?.id ?? makeId(),
                    type: selectedBinding?.type ?? "record.field",
                    field
                  });
                }}
              />

              <h4>Styles</h4>
              {styleFields.map((field) => (
                <div className="field-row" key={field}>
                  <label>{field}</label>
                  <Input
                    value={String(selectedComponent.style.base[field] ?? "")}
                    onChange={(value) => updateSelectedStyle("base", field, value)}
                  />
                  <Input
                    value={String(
                      selectedComponent.style.byBreakpoint[activeBreakpoint]?.[field] ?? ""
                    )}
                    onChange={(value) => updateSelectedStyle("breakpoint", field, value)}
                  />
                </div>
              ))}

              <h4>Actions</h4>
              <label>Event</label>
              <Select
                value={newActionEvent}
                options={[
                  { value: "onLoad", label: "onLoad" },
                  { value: "onClick", label: "onClick" },
                  { value: "onSubmit", label: "onSubmit" },
                  { value: "onChange", label: "onChange" }
                ]}
                onChange={(value) => setNewActionEvent(value as keyof ComponentNode["events"])}
              />

              <label>Action</label>
              <Select
                value={newActionType}
                options={actionTypes.map((item) => ({ value: item, label: item }))}
                onChange={(value) => setNewActionType(value as Action["type"])}
              />

              <label>Target / Config</label>
              <Input value={newActionTarget} onChange={setNewActionTarget} />

              <Button
                onClick={() => {
                  addSelectedAction(newActionEvent, {
                    id: makeId(),
                    type: newActionType,
                    config: {
                      target: newActionTarget
                    },
                    onError: "toast"
                  });
                }}
              >
                Add Action
              </Button>
            </div>
          )}

          <h3>Theme Tokens</h3>
          <div className="scroll-area">
            <label>Font Family</label>
            <Input
              value={manifest.themes[0]?.tokens.typography.fontFamily ?? ""}
              onChange={(value) =>
                updateThemeTokens((tokens) => ({
                  ...tokens,
                  typography: {
                    ...tokens.typography,
                    fontFamily: value
                  }
                }))
              }
            />

            <label>Base Size</label>
            <Input
              value={manifest.themes[0]?.tokens.typography.baseSize ?? ""}
              onChange={(value) =>
                updateThemeTokens((tokens) => ({
                  ...tokens,
                  typography: {
                    ...tokens.typography,
                    baseSize: value
                  }
                }))
              }
            />

            <label>Primary Color</label>
            <Input
              value={manifest.themes[0]?.tokens.colors.primary ?? ""}
              onChange={(value) =>
                updateThemeTokens((tokens) => ({
                  ...tokens,
                  colors: {
                    ...tokens.colors,
                    primary: value
                  }
                }))
              }
            />

            <label>Surface Color</label>
            <Input
              value={manifest.themes[0]?.tokens.colors.surface ?? ""}
              onChange={(value) =>
                updateThemeTokens((tokens) => ({
                  ...tokens,
                  colors: {
                    ...tokens.colors,
                    surface: value
                  }
                }))
              }
            />
          </div>
        </aside>
      </section>

      <section className="panel checks-panel">
        <h3>Pre-publish Checks</h3>
        <ul>
          {checks.map((check) => (
            <li
              key={`${check.code}-${check.path}`}
            >{`${check.level.toUpperCase()} - ${check.message}`}</li>
          ))}
        </ul>
      </section>

      <section className="panel console-panel">
        <button
          type="button"
          className="console-toggle"
          onClick={() => setConsoleOpen(!consoleOpen)}
        >
          {consoleOpen ? "Hide Console" : "Show Console"}
        </button>

        {consoleOpen ? (
          <ul className="console-list">
            {logs.map((entry, index) => (
              <li key={`${entry}-${index}`}>{entry}</li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
};
