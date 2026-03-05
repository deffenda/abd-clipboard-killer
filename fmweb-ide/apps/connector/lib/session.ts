import { randomUUID } from "crypto";

import type { NextRequest, NextResponse } from "next/server";

import { TtlCache } from "./cache";

export const SESSION_COOKIE = "fmweb_session_id";
const SESSION_TTL_MS = 8 * 60 * 60 * 1_000;

type SessionData = {
  id: string;
  createdAt: number;
  lastSeenAt: number;
  username?: string;
};

const sessionStore = new TtlCache<SessionData>(5_000);

export const createSession = (username?: string): SessionData => {
  const now = Date.now();
  const session: SessionData = {
    id: randomUUID(),
    createdAt: now,
    lastSeenAt: now,
    username
  };

  sessionStore.set(session.id, session, SESSION_TTL_MS);

  return session;
};

export const getSession = (request: NextRequest): SessionData | null => {
  const id = request.cookies.get(SESSION_COOKIE)?.value;
  if (id === undefined) {
    return null;
  }

  const session = sessionStore.get(id);
  if (session === undefined) {
    return null;
  }

  const touched: SessionData = {
    ...session,
    lastSeenAt: Date.now()
  };

  sessionStore.set(id, touched, SESSION_TTL_MS);
  return touched;
};

export const setSessionCookie = (response: NextResponse, sessionId: string): void => {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: sessionId,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: false,
    maxAge: SESSION_TTL_MS / 1_000
  });
};

export const clearSessionCookie = (response: NextResponse): void => {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: false,
    maxAge: 0
  });
};

export const destroySession = (sessionId: string): void => {
  sessionStore.delete(sessionId);
};
