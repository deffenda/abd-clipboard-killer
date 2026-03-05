import { setTimeout as delay } from "timers/promises";

import { TtlCache } from "./cache";
import { getFileMakerEnvConfig } from "./env";
import { InternalApiError } from "./errors";
import { serverLogger } from "./logger";
import { mockFileMakerStore } from "./mock-store";

type TokenRecord = {
  token: string;
};

type RequestOptions = {
  correlationId: string;
  body?: unknown;
  retriesLeft?: number;
  authRetry?: boolean;
};

type Credentials = {
  username: string;
  password: string;
};

const TOKEN_TTL_MS = 30 * 60 * 1_000;

export class FileMakerClient {
  private readonly tokenStore = new TtlCache<TokenRecord>(5_000);
  private readonly metadataCache = new TtlCache<unknown>(500);
  private readonly queryCache = new TtlCache<unknown>(500);

  public constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  public isConfigured(): boolean {
    return getFileMakerEnvConfig() !== null;
  }

  public clearSession(sessionId: string): void {
    this.tokenStore.delete(sessionId);
  }

  public async login(
    sessionId: string,
    correlationId: string,
    credentials?: Credentials
  ): Promise<{ token: string; mode: "live" | "mock" }> {
    const config = getFileMakerEnvConfig();

    if (config === null) {
      const result = await mockFileMakerStore.login();
      this.tokenStore.set(sessionId, { token: result.token }, TOKEN_TTL_MS);

      return {
        token: result.token,
        mode: "mock"
      };
    }

    const payload = {
      fmDataSource: [
        {
          database: config.file,
          username: credentials?.username ?? config.username,
          password: credentials?.password ?? config.password
        }
      ]
    };

    const json = await this.rawRequest(
      config,
      "/sessions",
      {
        method: "POST",
        body: payload
      },
      correlationId,
      {
        retriesLeft: 2,
        authRetry: false
      }
    );

    const token =
      typeof json?.response?.token === "string"
        ? (json.response.token as string)
        : typeof json?.response?.token?.toString === "function"
          ? String(json.response.token)
          : null;

    if (token === null || token.length === 0) {
      throw new InternalApiError(
        "fm_login_failed",
        "FileMaker login did not return a token",
        502,
        json
      );
    }

    this.tokenStore.set(sessionId, { token }, TOKEN_TTL_MS);

    return {
      token,
      mode: "live"
    };
  }

  public async logout(sessionId: string, correlationId: string): Promise<{ ok: true }> {
    const config = getFileMakerEnvConfig();
    const token = this.tokenStore.get(sessionId)?.token;

    if (config === null) {
      await mockFileMakerStore.logout();
      this.tokenStore.delete(sessionId);
      return { ok: true };
    }

    if (token !== undefined) {
      try {
        await this.rawRequest(
          config,
          `/sessions/${token}`,
          {
            method: "DELETE",
            token
          },
          correlationId,
          {
            retriesLeft: 0,
            authRetry: false
          }
        );
      } catch (error) {
        serverLogger.warn(
          { err: error, correlationId },
          "Failed to explicitly logout FileMaker token"
        );
      }
    }

    this.tokenStore.delete(sessionId);
    return { ok: true };
  }

  public async getLayouts(sessionId: string, correlationId: string): Promise<string[]> {
    const cacheKey = `layouts:${sessionId}`;
    const cached = this.metadataCache.get(cacheKey);

    if (Array.isArray(cached)) {
      return cached as string[];
    }

    const config = getFileMakerEnvConfig();

    if (config === null) {
      const data = await mockFileMakerStore.getLayouts();
      this.metadataCache.set(cacheKey, data, 30_000);
      return data;
    }

    const json = await this.request(sessionId, config, "/layouts", { correlationId });

    const layouts = Array.isArray(json?.response?.layouts)
      ? json.response.layouts.map((item: Record<string, unknown>) => String(item.name))
      : [];

    this.metadataCache.set(cacheKey, layouts, 30_000);

    return layouts;
  }

  public async getFields(
    sessionId: string,
    layout: string,
    correlationId: string
  ): Promise<string[]> {
    const cacheKey = `fields:${sessionId}:${layout}`;
    const cached = this.metadataCache.get(cacheKey);

    if (Array.isArray(cached)) {
      return cached as string[];
    }

    const config = getFileMakerEnvConfig();

    if (config === null) {
      const data = await mockFileMakerStore.getFields(layout);
      this.metadataCache.set(cacheKey, data, 30_000);
      return data;
    }

    const json = await this.request(sessionId, config, `/layouts/${encodeURIComponent(layout)}`, {
      correlationId
    });

    const fieldMeta = (json?.response?.fieldMetaData ?? {}) as Record<string, unknown>;
    const fields = Object.keys(fieldMeta);

    this.metadataCache.set(cacheKey, fields, 30_000);

    return fields;
  }

  public async getRecords(
    sessionId: string,
    layout: string,
    params: { limit: number; offset: number },
    correlationId: string
  ): Promise<{ data: unknown[]; totalCount: number }> {
    const config = getFileMakerEnvConfig();

    if (config === null) {
      return mockFileMakerStore.getRecords(layout, params.limit, params.offset);
    }

    const query = new URLSearchParams({
      _limit: String(params.limit),
      _offset: String(params.offset)
    });

    const json = await this.request(
      sessionId,
      config,
      `/layouts/${encodeURIComponent(layout)}/records?${query.toString()}`,
      { correlationId }
    );

    return {
      data: Array.isArray(json?.response?.data) ? json.response.data : [],
      totalCount: Number(json?.response?.dataInfo?.foundCount ?? 0)
    };
  }

  public async getRecord(
    sessionId: string,
    layout: string,
    recordId: string,
    correlationId: string
  ): Promise<unknown> {
    const config = getFileMakerEnvConfig();

    if (config === null) {
      return mockFileMakerStore.getRecordById(layout, recordId);
    }

    const json = await this.request(
      sessionId,
      config,
      `/layouts/${encodeURIComponent(layout)}/records/${encodeURIComponent(recordId)}`,
      {
        correlationId
      }
    );

    return json?.response?.data?.[0] ?? null;
  }

  public async createRecord(
    sessionId: string,
    layout: string,
    data: Record<string, unknown>,
    portalData: Record<string, unknown> | undefined,
    correlationId: string
  ): Promise<unknown> {
    const config = getFileMakerEnvConfig();

    if (config === null) {
      return mockFileMakerStore.createRecord(layout, data);
    }

    const json = await this.request(
      sessionId,
      config,
      `/layouts/${encodeURIComponent(layout)}/records`,
      {
        correlationId,
        body: {
          fieldData: data,
          portalData
        }
      }
    );

    return json?.response;
  }

  public async updateRecord(
    sessionId: string,
    layout: string,
    recordId: string,
    data: Record<string, unknown>,
    correlationId: string
  ): Promise<unknown> {
    const config = getFileMakerEnvConfig();

    if (config === null) {
      return mockFileMakerStore.updateRecord(layout, recordId, data);
    }

    const json = await this.request(
      sessionId,
      config,
      `/layouts/${encodeURIComponent(layout)}/records/${encodeURIComponent(recordId)}`,
      {
        correlationId,
        body: {
          fieldData: data
        }
      },
      "PATCH"
    );

    return json?.response;
  }

  public async deleteRecord(
    sessionId: string,
    layout: string,
    recordId: string,
    correlationId: string
  ): Promise<{ ok: true }> {
    const config = getFileMakerEnvConfig();

    if (config === null) {
      const deleted = await mockFileMakerStore.deleteRecord(layout, recordId);
      if (!deleted) {
        throw new InternalApiError("record_not_found", "Record not found", 404);
      }

      return {
        ok: true
      };
    }

    await this.request(
      sessionId,
      config,
      `/layouts/${encodeURIComponent(layout)}/records/${encodeURIComponent(recordId)}`,
      {
        correlationId
      },
      "DELETE"
    );

    return {
      ok: true
    };
  }

  public async find(
    sessionId: string,
    layout: string,
    payload: Record<string, unknown>,
    correlationId: string
  ): Promise<{ data: unknown[]; totalCount: number }> {
    const limit = Number(payload.limit ?? 20);
    const offset = Number(payload.offset ?? 0);
    const query = Array.isArray(payload.query)
      ? (payload.query as Array<Record<string, unknown>>)
      : [];

    const cacheKey = `find:${sessionId}:${layout}:${JSON.stringify(payload)}`;
    const cached = this.queryCache.get(cacheKey);
    if (cached !== undefined) {
      return cached as { data: unknown[]; totalCount: number };
    }

    const config = getFileMakerEnvConfig();

    if (config === null) {
      const data = await mockFileMakerStore.find(layout, query, limit, offset);
      this.queryCache.set(cacheKey, data, 10_000);
      return data;
    }

    const json = await this.request(
      sessionId,
      config,
      `/layouts/${encodeURIComponent(layout)}/_find`,
      {
        correlationId,
        body: payload
      }
    );

    const parsed = {
      data: Array.isArray(json?.response?.data) ? json.response.data : [],
      totalCount: Number(json?.response?.dataInfo?.foundCount ?? 0)
    };

    this.queryCache.set(cacheKey, parsed, 10_000);

    return parsed;
  }

  public async runScript(
    sessionId: string,
    layout: string,
    scriptName: string,
    parameter: string | undefined,
    correlationId: string
  ): Promise<unknown> {
    const config = getFileMakerEnvConfig();

    if (config === null) {
      return mockFileMakerStore.runScript(layout, scriptName, parameter);
    }

    const query = new URLSearchParams({
      script: scriptName,
      "script.param": parameter ?? "",
      _limit: "1"
    });

    const json = await this.request(
      sessionId,
      config,
      `/layouts/${encodeURIComponent(layout)}/records?${query.toString()}`,
      {
        correlationId
      }
    );

    return {
      scriptName,
      scriptResult: json?.response?.scriptResult ?? null
    };
  }

  public async upsertPortalRow(
    sessionId: string,
    layout: string,
    recordId: string,
    relatedSet: string,
    row: Record<string, unknown>
  ): Promise<unknown> {
    const config = getFileMakerEnvConfig();

    if (config === null) {
      return mockFileMakerStore.upsertPortalRow(layout, recordId, relatedSet, row);
    }

    // FileMaker portal writes are model-specific; for MVP we return a structured unsupported response.
    return {
      unsupportedInLiveMode: true,
      layout,
      recordId,
      relatedSet,
      row
    };
  }

  public async deletePortalRow(
    sessionId: string,
    layout: string,
    recordId: string,
    relatedSet: string,
    rowId: string
  ): Promise<{ ok: boolean }> {
    const config = getFileMakerEnvConfig();

    if (config === null) {
      const deleted = await mockFileMakerStore.deletePortalRow(layout, recordId, relatedSet, rowId);
      return {
        ok: deleted
      };
    }

    return {
      ok: false
    };
  }

  private async request(
    sessionId: string,
    config: NonNullable<ReturnType<typeof getFileMakerEnvConfig>>,
    path: string,
    options: RequestOptions,
    method: "GET" | "POST" | "PATCH" | "DELETE" = options.body === undefined ? "GET" : "POST"
  ): Promise<Record<string, any>> {
    const token = this.tokenStore.get(sessionId)?.token;

    if (token === undefined) {
      await this.login(sessionId, options.correlationId);
    }

    const freshToken = this.tokenStore.get(sessionId)?.token;
    if (freshToken === undefined) {
      throw new InternalApiError("fm_auth_missing", "Missing FileMaker session token", 401);
    }

    try {
      return await this.rawRequest(
        config,
        path,
        {
          method,
          body: options.body,
          token: freshToken
        },
        options.correlationId,
        {
          retriesLeft: options.retriesLeft ?? 2,
          authRetry: options.authRetry ?? true
        }
      );
    } catch (error) {
      if (
        error instanceof InternalApiError &&
        error.status === 401 &&
        (options.authRetry ?? true)
      ) {
        await this.login(sessionId, options.correlationId);

        return this.request(
          sessionId,
          config,
          path,
          {
            ...options,
            authRetry: false
          },
          method
        );
      }

      throw error;
    }
  }

  private async rawRequest(
    config: NonNullable<ReturnType<typeof getFileMakerEnvConfig>>,
    path: string,
    request: {
      method: "GET" | "POST" | "PATCH" | "DELETE";
      token?: string;
      body?: unknown;
    },
    correlationId: string,
    retry: { retriesLeft: number; authRetry: boolean }
  ): Promise<Record<string, any>> {
    if (!config.verifyTls) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }

    const url = `${config.host}/fmi/data/vLatest/databases/${encodeURIComponent(config.file)}${path}`;

    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-correlation-id": correlationId
    };

    if (request.token !== undefined) {
      headers.authorization = `Bearer ${request.token}`;
    }

    try {
      const response = await this.fetchImpl(url, {
        method: request.method,
        headers,
        body: request.body === undefined ? undefined : JSON.stringify(request.body)
      });

      const json = (await response.json().catch(() => ({}))) as Record<string, any>;

      if (response.status === 401) {
        throw new InternalApiError(
          "fm_unauthorized",
          "FileMaker authentication failed or token expired",
          401,
          json
        );
      }

      if (response.status >= 500 && retry.retriesLeft > 0) {
        const waitMs = (3 - retry.retriesLeft) * 200;
        await delay(waitMs);

        return this.rawRequest(config, path, request, correlationId, {
          ...retry,
          retriesLeft: retry.retriesLeft - 1
        });
      }

      if (!response.ok) {
        throw new InternalApiError(
          "fm_request_failed",
          json?.messages?.[0]?.message ?? `FileMaker request failed with ${response.status}`,
          response.status,
          json
        );
      }

      return json;
    } catch (error) {
      if (error instanceof InternalApiError) {
        throw error;
      }

      if (retry.retriesLeft > 0) {
        const waitMs = (3 - retry.retriesLeft) * 200;
        await delay(waitMs);

        return this.rawRequest(config, path, request, correlationId, {
          ...retry,
          retriesLeft: retry.retriesLeft - 1
        });
      }

      throw new InternalApiError(
        "fm_network_error",
        "Network error while talking to FileMaker",
        503,
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}

export const fileMakerClient = new FileMakerClient();
