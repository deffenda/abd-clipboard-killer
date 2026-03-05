import type { Action, AppManifest, ComponentNode, PublishCheck, Screen } from "./types";

const mutatingActionTypes = new Set<Action["type"]>([
  "runScript",
  "createRecord",
  "updateRecord",
  "deleteRecord"
]);

const collectComponents = (nodes: ComponentNode[]): ComponentNode[] => {
  const all: ComponentNode[] = [];

  for (const node of nodes) {
    all.push(node);
    if (node.children.length > 0) {
      all.push(...collectComponents(node.children));
    }
  }

  return all;
};

const checkScreenBindings = (screen: Screen): PublishCheck[] => {
  const findings: PublishCheck[] = [];
  const components = collectComponents(screen.components);

  for (const component of components) {
    const isBindableType = component.type === "Input" || component.type === "Text";
    if (isBindableType && component.bindings.length === 0) {
      findings.push({
        level: "error",
        code: "missing_bindings",
        message: `Component ${component.id} on screen ${screen.name} is missing a field binding.`,
        path: `screens.${screen.id}.components.${component.id}`
      });
    }

    for (const [eventName, actions] of Object.entries(component.events)) {
      for (const action of actions) {
        if (mutatingActionTypes.has(action.type) && action.onError === undefined) {
          findings.push({
            level: "warning",
            code: "action_no_error_strategy",
            message: `Action ${action.id} (${action.type}) on ${eventName} lacks explicit error handling.`,
            path: `screens.${screen.id}.components.${component.id}.events.${eventName}`
          });
        }
      }
    }
  }

  return findings;
};

const checkListQueries = (screen: Screen): PublishCheck[] => {
  if (screen.type !== "list") {
    return [];
  }

  if (screen.listConfig === undefined) {
    return [
      {
        level: "error",
        code: "list_config_missing",
        message: `List screen ${screen.name} is missing list configuration.`,
        path: `screens.${screen.id}.listConfig`
      }
    ];
  }

  if (screen.listConfig.limit > 200) {
    return [
      {
        level: "warning",
        code: "unbounded_query",
        message: `List screen ${screen.name} has a high limit (${screen.listConfig.limit}).`,
        path: `screens.${screen.id}.listConfig.limit`
      }
    ];
  }

  return [];
};

const checkDataSources = (manifest: AppManifest): PublishCheck[] => {
  const findings: PublishCheck[] = [];

  manifest.dataSources.forEach((source, index) => {
    if (source.host !== undefined && source.host.startsWith("http://")) {
      findings.push({
        level: "warning",
        code: "insecure_connector_config",
        message: `Data source ${source.name} uses an insecure connector host (${source.host}).`,
        path: `dataSources.${index}.host`
      });
    }
  });

  return findings;
};

export const runPrePublishChecks = (manifest: AppManifest): PublishCheck[] => {
  const findings: PublishCheck[] = [];

  for (const screen of manifest.screens) {
    findings.push(...checkScreenBindings(screen));
    findings.push(...checkListQueries(screen));
  }

  findings.push(...checkDataSources(manifest));

  return findings;
};

export const partitionPublishChecks = (checks: PublishCheck[]) => {
  return {
    errors: checks.filter((item) => item.level === "error"),
    warnings: checks.filter((item) => item.level === "warning")
  };
};
