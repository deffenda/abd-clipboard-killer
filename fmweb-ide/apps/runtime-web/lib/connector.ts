import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const getConnectorUrl = () => {
  return (
    process.env.CONNECTOR_URL ?? process.env.NEXT_PUBLIC_CONNECTOR_URL ?? "http://localhost:3002"
  );
};

export const proxyToConnector = async (
  request: NextRequest,
  path: string,
  init?: {
    method?: string;
    body?: string;
  }
) => {
  const target = `${getConnectorUrl()}${path}`;
  const headers = new Headers();

  const contentType = request.headers.get("content-type");
  if (contentType !== null) {
    headers.set("content-type", contentType);
  }

  const cookie = request.headers.get("cookie");
  if (cookie !== null) {
    headers.set("cookie", cookie);
  }

  const correlation = request.headers.get("x-correlation-id");
  if (correlation !== null) {
    headers.set("x-correlation-id", correlation);
  }

  const response = await fetch(target, {
    method: init?.method ?? request.method,
    headers,
    body: init?.body,
    cache: "no-store"
  });

  const payload = await response.text();

  const nextResponse = new NextResponse(payload, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json"
    }
  });

  const setCookie = response.headers.get("set-cookie");
  if (setCookie !== null) {
    nextResponse.headers.set("set-cookie", setCookie);
  }

  const correlationHeader = response.headers.get("x-correlation-id");
  if (correlationHeader !== null) {
    nextResponse.headers.set("x-correlation-id", correlationHeader);
  }

  return nextResponse;
};
