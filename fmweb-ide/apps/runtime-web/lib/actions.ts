"use client";

import type { Action } from "@fmweb/shared";

import { runtimeApi } from "./runtime-api";

type ActionContext = {
  layout?: string;
  recordId?: string;
  navigate: (route: string) => void;
  notify: (message: string, variant?: "info" | "error") => void;
};

export const executeActions = async (actions: Action[], context: ActionContext) => {
  for (const action of actions) {
    try {
      switch (action.type) {
        case "navigate": {
          const target = String(action.config.target ?? "/");
          context.navigate(target);
          break;
        }
        case "runScript": {
          if (context.layout === undefined) {
            throw new Error("Missing layout for runScript action");
          }

          await runtimeApi.post(`layout/${encodeURIComponent(context.layout)}/_script`, {
            scriptName: String(action.config.scriptName ?? action.config.target ?? ""),
            parameter: action.config.parameter
          });
          context.notify("Script executed");
          break;
        }
        case "createRecord": {
          if (context.layout === undefined) {
            throw new Error("Missing layout for createRecord action");
          }

          await runtimeApi.post(`layout/${encodeURIComponent(context.layout)}/records`, {
            data: action.config.data ?? {}
          });
          context.notify("Record created");
          break;
        }
        case "updateRecord": {
          if (context.layout === undefined || context.recordId === undefined) {
            throw new Error("Missing layout/record for updateRecord action");
          }

          await runtimeApi.patch(
            `layout/${encodeURIComponent(context.layout)}/records/${encodeURIComponent(context.recordId)}`,
            {
              data: action.config.data ?? {}
            }
          );
          context.notify("Record updated");
          break;
        }
        case "deleteRecord": {
          if (context.layout === undefined || context.recordId === undefined) {
            throw new Error("Missing layout/record for deleteRecord action");
          }

          await runtimeApi.delete(
            `layout/${encodeURIComponent(context.layout)}/records/${encodeURIComponent(context.recordId)}`
          );
          context.notify("Record deleted");
          break;
        }
        case "showToast": {
          context.notify(String(action.config.message ?? "Action completed"));
          break;
        }
        case "showDialog": {
          window.alert(String(action.config.message ?? "Dialog"));
          break;
        }
        case "setValue":
        case "submit": {
          context.notify(`Action ${action.type} executed`);
          break;
        }
        default:
          context.notify(`Unsupported action ${(action as { type: string }).type}`);
      }
    } catch (error) {
      if (action.onError === "dialog") {
        window.alert(error instanceof Error ? error.message : "Action failed");
      } else if (action.onError !== "silent") {
        context.notify(error instanceof Error ? error.message : "Action failed", "error");
      }
    }
  }
};
