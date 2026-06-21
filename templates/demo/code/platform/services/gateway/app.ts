import express from "express";
import { verifySession } from "./auth";
import { proxy } from "./proxy";

/**
 * The Gateway is the only publicly-exposed service. Every request is
 * authenticated here, then routed to an internal service. Internal services are
 * never reachable directly from outside the cluster, and they never call each
 * other directly — a cross-service read comes back out through this gateway.
 */
export class Gateway {
  private app = express();

  constructor() {
    // Liveness probe for Kubernetes — must NOT require auth.
    this.app.get("/healthz", (_req, res) => res.json({ ok: true }));

    // Everything past this point requires a valid session.
    this.app.use(verifySession);

    // Route each public prefix to its internal service. `proxy` forwards the
    // request and attaches `x-user-id` / `x-org-id` from the verified session.
    this.app.use("/accounts", proxy("accounts"));
    this.app.use("/billing", proxy("billing"));
    this.app.use("/usage", proxy("usage"));
    this.app.use("/notifications", proxy("notifications"));
  }

  listen(port = 3000) {
    return this.app.listen(port);
  }
}

if (require.main === module) new Gateway().listen();
