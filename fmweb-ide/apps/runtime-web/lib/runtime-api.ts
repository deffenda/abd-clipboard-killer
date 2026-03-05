import type { AppManifest } from "@fmweb/shared";

const parsePayload = async (response: Response) => {
  const payload = (await response.json()) as {
    ok: boolean;
    message?: string;
    data?: unknown;
  };

  if (!response.ok || !payload.ok) {
    throw new Error(payload.message ?? `Request failed (${response.status})`);
  }

  return payload.data;
};

export const loadRuntimeManifest = async (
  version?: string
): Promise<{
  manifest: AppManifest;
  version: string;
}> => {
  const query = version !== undefined ? `?version=${encodeURIComponent(version)}` : "";
  const response = await fetch(`/api/runtime/manifest${query}`, {
    cache: "no-store"
  });

  const data = (await parsePayload(response)) as {
    manifest: AppManifest;
    version: string;
  };

  return data;
};

export const runtimeLogin = async (username: string, password: string) => {
  const response = await fetch("/api/runtime/login", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });

  return parsePayload(response);
};

export const runtimeLogout = async () => {
  const response = await fetch("/api/runtime/logout", {
    method: "POST"
  });

  return parsePayload(response);
};

export const runtimeApi = {
  get: async <T>(path: string): Promise<T> => {
    const response = await fetch(`/api/runtime/fm/${path}`, {
      credentials: "include",
      cache: "no-store"
    });

    return (await parsePayload(response)) as T;
  },
  post: async <T>(path: string, payload: unknown): Promise<T> => {
    const response = await fetch(`/api/runtime/fm/${path}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    return (await parsePayload(response)) as T;
  },
  patch: async <T>(path: string, payload: unknown): Promise<T> => {
    const response = await fetch(`/api/runtime/fm/${path}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    return (await parsePayload(response)) as T;
  },
  delete: async <T>(path: string): Promise<T> => {
    const response = await fetch(`/api/runtime/fm/${path}`, {
      method: "DELETE",
      credentials: "include"
    });

    return (await parsePayload(response)) as T;
  }
};

export const loadAdminVersions = async (): Promise<string[]> => {
  const response = await fetch("/api/runtime/versions?admin=1", {
    cache: "no-store"
  });

  const data = (await parsePayload(response)) as {
    versions: string[];
  };

  return data.versions;
};
