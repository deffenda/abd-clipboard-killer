import { NextResponse, type NextRequest } from "next/server";

import { fileMakerClient } from "./filemaker-client";
import { jsonOk } from "./http";
import {
  clearSessionCookie,
  createSession,
  destroySession,
  getSession,
  setSessionCookie
} from "./session";

export const loginSession = async (
  request: NextRequest,
  correlationId: string,
  credentials?: { username: string; password: string }
) => {
  const session = createSession(credentials?.username);
  const login = await fileMakerClient.login(session.id, correlationId, credentials);

  const response = jsonOk(
    request,
    correlationId,
    {
      sessionId: session.id,
      tokenMode: login.mode,
      configured: fileMakerClient.isConfigured()
    },
    200
  );

  setSessionCookie(response, session.id);

  return response;
};

export const logoutSession = async (request: NextRequest, correlationId: string) => {
  const session = getSession(request);

  if (session !== null) {
    await fileMakerClient.logout(session.id, correlationId);
    destroySession(session.id);
  }

  const response = jsonOk(request, correlationId, { ok: true });
  clearSessionCookie(response);

  return response;
};

export const unauthorized = (request: NextRequest, correlationId: string) => {
  const response = NextResponse.json(
    {
      ok: false,
      correlationId,
      code: "unauthorized",
      message: "Authentication required"
    },
    {
      status: 401
    }
  );

  clearSessionCookie(response);

  return response;
};
