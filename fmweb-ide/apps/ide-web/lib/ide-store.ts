"use client";

import { create } from "zustand";

import {
  createComponentNode,
  createDefaultManifest,
  createDefaultScreen,
  touchManifest,
  type Action,
  type AppManifest,
  type Binding,
  type ComponentNode,
  type Screen,
  type ThemeTokens
} from "@fmweb/shared";

import {
  addComponentToTree,
  deleteComponentFromTree,
  duplicateComponentInTree,
  findComponentById,
  updateComponentInTree
} from "./tree";

type DevicePreset = "phone" | "tablet" | "desktop";

const STORAGE_KEY = "fmweb.ide.manifest";

const clone = <T>(value: T): T => structuredClone(value);

const presetWidth: Record<DevicePreset, number> = {
  phone: 390,
  tablet: 834,
  desktop: 1280
};

type IdeState = {
  manifest: AppManifest;
  activeScreenId: string;
  selectedComponentId?: string;
  activeBreakpoint: string;
  devicePreset: DevicePreset;
  history: AppManifest[];
  future: AppManifest[];
  logs: string[];
  connectorUrl: string;
  layouts: string[];
  fields: string[];
  selectedLayout?: string;
  selectedDataTab: "palette" | "data" | "templates" | "wizard";
  previewMode: boolean;
  publishVersion?: string;
  publishWarnings: string[];
  checkErrors: string[];
  setConnectorUrl: (url: string) => void;
  appendLog: (message: string) => void;
  setSelectedDataTab: (tab: IdeState["selectedDataTab"]) => void;
  setLayouts: (layouts: string[]) => void;
  setSelectedLayout: (layout?: string) => void;
  setFields: (fields: string[]) => void;
  setPreviewMode: (enabled: boolean) => void;
  setPublishState: (payload: { version?: string; warnings?: string[]; errors?: string[] }) => void;
  setActiveScreen: (screenId: string) => void;
  setActiveBreakpoint: (breakpoint: string) => void;
  setDevicePreset: (device: DevicePreset) => void;
  newProject: (name?: string) => void;
  loadManifest: (manifest: AppManifest) => void;
  saveToStorage: () => void;
  loadFromStorage: () => boolean;
  addComponent: (type: string, parentId?: string) => void;
  selectComponent: (id?: string) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  updateSelectedProps: (patch: Record<string, unknown>) => void;
  updateSelectedStyle: (
    scope: "base" | "breakpoint",
    key: keyof ComponentNode["style"]["base"],
    value: string
  ) => void;
  updateSelectedBinding: (binding: Binding | null) => void;
  addSelectedAction: (eventName: keyof ComponentNode["events"], action: Action) => void;
  setScreenBaseLayout: (layout: string) => void;
  configureListScreen: (columns: string[]) => void;
  undo: () => void;
  redo: () => void;
  updateThemeTokens: (updater: (tokens: ThemeTokens) => ThemeTokens) => void;
  applyTemplate: (template: "blank" | "crm" | "inventory" | "portal") => void;
  runWizard: (payload: { appName: string; baseLayout: string; includePortal: boolean }) => void;
};

const defaultManifest = createDefaultManifest();

const nowLog = (message: string) => `${new Date().toLocaleTimeString()}: ${message}`;

const commit = (
  state: IdeState,
  nextManifest: AppManifest
): Pick<IdeState, "manifest" | "history" | "future"> => {
  return {
    manifest: touchManifest(nextManifest),
    history: [...state.history.slice(-49), state.manifest],
    future: []
  };
};

const getActiveScreen = (manifest: AppManifest, activeScreenId: string): Screen => {
  return manifest.screens.find((screen) => screen.id === activeScreenId) ?? manifest.screens[0]!;
};

const mapActiveScreen = (
  manifest: AppManifest,
  activeScreenId: string,
  mapper: (screen: Screen) => Screen
): AppManifest => {
  return {
    ...manifest,
    screens: manifest.screens.map((screen) =>
      screen.id === activeScreenId ? mapper(screen) : screen
    )
  };
};

export const useIdeStore = create<IdeState>((set, get) => ({
  manifest: defaultManifest,
  activeScreenId: defaultManifest.screens[0]!.id,
  selectedComponentId: undefined,
  activeBreakpoint: defaultManifest.breakpoints[0]!.name,
  devicePreset: "desktop",
  history: [],
  future: [],
  logs: [nowLog("IDE initialized")],
  connectorUrl: process.env.NEXT_PUBLIC_CONNECTOR_URL ?? "http://localhost:3002",
  layouts: [],
  fields: [],
  selectedLayout: undefined,
  selectedDataTab: "palette",
  previewMode: false,
  publishVersion: undefined,
  publishWarnings: [],
  checkErrors: [],
  setConnectorUrl: (url) => set({ connectorUrl: url }),
  appendLog: (message) =>
    set((state) => ({ logs: [nowLog(message), ...state.logs].slice(0, 200) })),
  setSelectedDataTab: (tab) => set({ selectedDataTab: tab }),
  setLayouts: (layouts) => set({ layouts }),
  setSelectedLayout: (layout) => set({ selectedLayout: layout }),
  setFields: (fields) => set({ fields }),
  setPreviewMode: (enabled) => set({ previewMode: enabled }),
  setPublishState: (payload) =>
    set({
      publishVersion: payload.version,
      publishWarnings: payload.warnings ?? [],
      checkErrors: payload.errors ?? []
    }),
  setActiveScreen: (screenId) => set({ activeScreenId: screenId, selectedComponentId: undefined }),
  setActiveBreakpoint: (breakpoint) => set({ activeBreakpoint: breakpoint }),
  setDevicePreset: (device) => set({ devicePreset: device }),
  newProject: (name) => {
    const manifest = createDefaultManifest(name ?? "Untitled FMWeb App");
    set({
      manifest,
      activeScreenId: manifest.screens[0]!.id,
      selectedComponentId: undefined,
      history: [],
      future: [],
      publishVersion: undefined,
      publishWarnings: [],
      checkErrors: [],
      logs: [nowLog("Created new project")]
    });
  },
  loadManifest: (manifest) => {
    set({
      manifest,
      activeScreenId: manifest.screens[0]!.id,
      selectedComponentId: undefined,
      history: [],
      future: [],
      logs: [nowLog("Manifest loaded")]
    });
  },
  saveToStorage: () => {
    const manifest = get().manifest;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(manifest));
    get().appendLog("Project saved to localStorage");
  },
  loadFromStorage: () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return false;
    }

    try {
      const manifest = JSON.parse(raw) as AppManifest;
      get().loadManifest(manifest);
      get().appendLog("Loaded project from localStorage");
      return true;
    } catch {
      return false;
    }
  },
  addComponent: (type, parentId) => {
    set((state) => {
      const nextManifest = mapActiveScreen(state.manifest, state.activeScreenId, (screen) => {
        const result = addComponentToTree(screen.components, type, parentId);
        return {
          ...screen,
          components: result.nodes
        };
      });

      const activeScreen = getActiveScreen(nextManifest, state.activeScreenId);
      const latest = activeScreen.components.at(-1);

      return {
        ...commit(state, nextManifest),
        selectedComponentId: latest?.id
      };
    });

    get().appendLog(`Added component: ${type}`);
  },
  selectComponent: (id) => set({ selectedComponentId: id }),
  deleteSelected: () => {
    set((state) => {
      if (state.selectedComponentId === undefined) {
        return state;
      }

      const nextManifest = mapActiveScreen(state.manifest, state.activeScreenId, (screen) => {
        const result = deleteComponentFromTree(screen.components, state.selectedComponentId!);
        if (!result.removed) {
          return screen;
        }

        return {
          ...screen,
          components: result.nodes
        };
      });

      return {
        ...commit(state, nextManifest),
        selectedComponentId: undefined
      };
    });

    get().appendLog("Deleted selected component");
  },
  duplicateSelected: () => {
    set((state) => {
      if (state.selectedComponentId === undefined) {
        return state;
      }

      let duplicatedId: string | undefined;
      const nextManifest = mapActiveScreen(state.manifest, state.activeScreenId, (screen) => {
        const result = duplicateComponentInTree(screen.components, state.selectedComponentId!);
        duplicatedId = result.duplicatedId;
        return {
          ...screen,
          components: result.nodes
        };
      });

      return {
        ...commit(state, nextManifest),
        selectedComponentId: duplicatedId
      };
    });

    get().appendLog("Duplicated selected component");
  },
  updateSelectedProps: (patch) => {
    set((state) => {
      if (state.selectedComponentId === undefined) {
        return state;
      }

      const nextManifest = mapActiveScreen(state.manifest, state.activeScreenId, (screen) => ({
        ...screen,
        components: updateComponentInTree(
          screen.components,
          state.selectedComponentId!,
          (node) => ({
            ...node,
            props: {
              ...node.props,
              ...patch
            }
          })
        )
      }));

      return commit(state, nextManifest);
    });
  },
  updateSelectedStyle: (scope, key, value) => {
    set((state) => {
      if (state.selectedComponentId === undefined) {
        return state;
      }

      const nextManifest = mapActiveScreen(state.manifest, state.activeScreenId, (screen) => ({
        ...screen,
        components: updateComponentInTree(screen.components, state.selectedComponentId!, (node) => {
          const style = clone(node.style);

          if (scope === "base") {
            style.base[key] = value;
          } else {
            style.byBreakpoint[state.activeBreakpoint] = {
              ...(style.byBreakpoint[state.activeBreakpoint] ?? {}),
              [key]: value
            };
          }

          return {
            ...node,
            style
          };
        })
      }));

      return commit(state, nextManifest);
    });
  },
  updateSelectedBinding: (binding) => {
    set((state) => {
      if (state.selectedComponentId === undefined) {
        return state;
      }

      const nextManifest = mapActiveScreen(state.manifest, state.activeScreenId, (screen) => ({
        ...screen,
        components: updateComponentInTree(
          screen.components,
          state.selectedComponentId!,
          (node) => ({
            ...node,
            bindings: binding === null ? [] : [binding]
          })
        )
      }));

      return commit(state, nextManifest);
    });
  },
  addSelectedAction: (eventName, action) => {
    set((state) => {
      if (state.selectedComponentId === undefined) {
        return state;
      }

      const nextManifest = mapActiveScreen(state.manifest, state.activeScreenId, (screen) => ({
        ...screen,
        components: updateComponentInTree(
          screen.components,
          state.selectedComponentId!,
          (node) => ({
            ...node,
            events: {
              ...node.events,
              [eventName]: [...node.events[eventName], action]
            }
          })
        )
      }));

      return commit(state, nextManifest);
    });
  },
  setScreenBaseLayout: (layout) => {
    set((state) => {
      const nextManifest = mapActiveScreen(state.manifest, state.activeScreenId, (screen) => ({
        ...screen,
        baseLayoutContext: layout
      }));

      return commit(state, nextManifest);
    });
  },
  configureListScreen: (columns) => {
    set((state) => {
      const nextManifest = mapActiveScreen(state.manifest, state.activeScreenId, (screen) => ({
        ...screen,
        type: "list",
        listConfig: {
          layout: screen.baseLayoutContext ?? state.selectedLayout ?? "Contacts",
          columns,
          limit: 20,
          find: []
        }
      }));

      return commit(state, nextManifest);
    });
  },
  undo: () => {
    set((state) => {
      const previous = state.history.at(-1);
      if (previous === undefined) {
        return state;
      }

      const nextHistory = state.history.slice(0, -1);

      return {
        ...state,
        manifest: previous,
        history: nextHistory,
        future: [state.manifest, ...state.future]
      };
    });
  },
  redo: () => {
    set((state) => {
      const next = state.future[0];
      if (next === undefined) {
        return state;
      }

      return {
        ...state,
        manifest: next,
        history: [...state.history, state.manifest],
        future: state.future.slice(1)
      };
    });
  },
  updateThemeTokens: (updater) => {
    set((state) => {
      const theme = state.manifest.themes[0];
      if (theme === undefined) {
        return state;
      }

      const nextManifest: AppManifest = {
        ...state.manifest,
        themes: [
          {
            ...theme,
            tokens: updater(clone(theme.tokens))
          },
          ...state.manifest.themes.slice(1)
        ]
      };

      return commit(state, nextManifest);
    });
  },
  applyTemplate: (template) => {
    const base = createDefaultManifest(
      template === "blank"
        ? "Blank App"
        : template === "crm"
          ? "CRM Starter"
          : template === "inventory"
            ? "Inventory Tracker"
            : "Portal Manager"
    );

    const listScreen = createDefaultScreen("List", "/list");
    listScreen.type = "list";
    listScreen.baseLayoutContext = "Contacts";
    listScreen.listConfig = {
      layout: "Contacts",
      columns: ["FirstName", "LastName", "Email"],
      limit: 20,
      find: []
    };

    const detailScreen = createDefaultScreen("Detail", "/record/[recordId]");
    detailScreen.type = "detail";
    detailScreen.baseLayoutContext = "Contacts";
    detailScreen.components = [
      {
        ...createComponentNode("Input"),
        props: {
          label: "First Name"
        },
        bindings: [
          {
            id: createComponentNode("Input").id,
            type: "record.field",
            field: "FirstName"
          }
        ]
      },
      {
        ...createComponentNode("Button"),
        props: {
          label: "Save"
        },
        events: {
          onLoad: [],
          onClick: [
            {
              id: createComponentNode("Button").id,
              type: "updateRecord",
              config: {
                layout: "Contacts"
              },
              onError: "toast"
            }
          ],
          onSubmit: [],
          onChange: []
        }
      }
    ];

    base.screens = [listScreen, detailScreen];

    if (template === "portal") {
      base.screens[1]!.portal = {
        parentLayout: "Contacts",
        relatedSet: "Notes",
        fields: ["Note"],
        pageSize: 10
      };
    }

    set({
      manifest: base,
      activeScreenId: base.screens[0]!.id,
      selectedComponentId: undefined,
      history: [],
      future: []
    });

    get().appendLog(`Applied template: ${template}`);
  },
  runWizard: ({ appName, baseLayout, includePortal }) => {
    const manifest = createDefaultManifest(appName);

    const listScreen = createDefaultScreen("List", "/list");
    listScreen.type = "list";
    listScreen.baseLayoutContext = baseLayout;
    listScreen.listConfig = {
      layout: baseLayout,
      columns: ["FirstName", "LastName", "Email"],
      limit: 20,
      find: []
    };

    const detailScreen = createDefaultScreen("Detail", "/record/[recordId]");
    detailScreen.type = "detail";
    detailScreen.baseLayoutContext = baseLayout;
    detailScreen.components = [
      {
        ...createComponentNode("Input"),
        props: {
          label: "Primary Field"
        },
        bindings: [
          {
            id: createComponentNode("Input").id,
            type: "record.field",
            field: "FirstName"
          }
        ]
      },
      {
        ...createComponentNode("Button"),
        props: {
          label: "Save"
        },
        events: {
          onLoad: [],
          onClick: [
            {
              id: createComponentNode("Button").id,
              type: "updateRecord",
              config: {
                layout: baseLayout
              },
              onError: "toast"
            }
          ],
          onSubmit: [],
          onChange: []
        }
      }
    ];

    if (includePortal) {
      detailScreen.portal = {
        parentLayout: baseLayout,
        relatedSet: "Notes",
        fields: ["Note"],
        pageSize: 10
      };
    }

    manifest.screens = [listScreen, detailScreen];

    set({
      manifest,
      activeScreenId: listScreen.id,
      selectedComponentId: undefined,
      history: [],
      future: []
    });

    get().appendLog("Wizard generated list/detail app scaffold");
  }
}));

export const useActiveScreen = () => {
  return useIdeStore((state) => getActiveScreen(state.manifest, state.activeScreenId));
};

export const useSelectedComponent = () => {
  return useIdeStore((state) => {
    if (state.selectedComponentId === undefined) {
      return undefined;
    }

    const screen = getActiveScreen(state.manifest, state.activeScreenId);
    return findComponentById(screen.components, state.selectedComponentId);
  });
};

export const useCanvasWidth = () => {
  const device = useIdeStore((state) => state.devicePreset);
  return presetWidth[device];
};

export const IDE_STORAGE_KEY = STORAGE_KEY;
