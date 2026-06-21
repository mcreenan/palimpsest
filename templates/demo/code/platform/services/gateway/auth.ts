import type { Request, Response, NextFunction } from "express";

/**
 * Session verification — the gateway's one job before routing.
 *
 * The browser sends an opaque session cookie. We look it up, confirm it hasn't
 * expired, and stash the resolved identity on the request so `proxy` can forward
 * it downstream. Internal services trust these values and never re-read the
 * cookie themselves.
 */
export interface Session {
  userId: string;
  orgId: string;
  expiresAt: Date;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: Session;
    }
  }
}

export async function verifySession(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.["demo_session"];
  if (!token) {
    res.status(401).json({ error: "no session" });
    return;
  }

  const session = await lookupSession(token);
  if (!session || session.expiresAt < new Date()) {
    res.status(401).json({ error: "session expired" });
    return;
  }

  req.session = session;
  next();
}

/** Resolve a session token to its identity. Backed by Redis in production. */
async function lookupSession(_token: string): Promise<Session | null> {
  // SELECT user_id, org_id, expires_at FROM sessions WHERE token = $1
  return null; // not implemented in the sample
}
