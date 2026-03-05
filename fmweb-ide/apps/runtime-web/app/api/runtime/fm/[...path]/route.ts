import type { NextRequest } from "next/server";

import { proxyToConnector } from "@/lib/connector";

const resolvePath = async (context: { params: Promise<{ path: string[] }> }) => {
  const { path } = await context.params;
  return `/api/fm/${path.join("/")}`;
};

const proxy = async (
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
  method: string
) => {
  const body = method === "GET" || method === "DELETE" ? undefined : await request.text();
  const connectorPath = await resolvePath(context);
  const query = request.nextUrl.search;

  return proxyToConnector(request, `${connectorPath}${query}`, {
    method,
    body
  });
};

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context, "GET");
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context, "POST");
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context, "PATCH");
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context, "DELETE");
}

export async function OPTIONS(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context, "OPTIONS");
}
