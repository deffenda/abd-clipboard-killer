import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FileMakerClient } from "../lib/filemaker-client";

const jsonResponse = (status: number, body: unknown) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
};

describe("FileMakerClient", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.FM_HOST = "https://example.fm";
    process.env.FM_FILE = "TestDB";
    process.env.FM_USERNAME = "admin";
    process.env.FM_PASSWORD = "secret";
    process.env.FM_VERIFY_TLS = "true";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("retries login requests on transient 5xx", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(500, { messages: [{ message: "oops" }] }))
      .mockResolvedValueOnce(jsonResponse(500, { messages: [{ message: "oops" }] }))
      .mockResolvedValueOnce(jsonResponse(200, { response: { token: "token-1" } }));

    const client = new FileMakerClient(fetchMock);
    const result = await client.login("session-1", "corr-1");

    expect(result.mode).toBe("live");
    expect(result.token).toBe("token-1");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("re-logins automatically after a 401", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(200, { response: { token: "token-1" } }))
      .mockResolvedValueOnce(jsonResponse(401, { messages: [{ message: "expired" }] }))
      .mockResolvedValueOnce(jsonResponse(200, { response: { token: "token-2" } }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          response: {
            layouts: [{ name: "Contacts" }]
          }
        })
      );

    const client = new FileMakerClient(fetchMock);
    const layouts = await client.getLayouts("session-1", "corr-2");

    expect(layouts).toEqual(["Contacts"]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
