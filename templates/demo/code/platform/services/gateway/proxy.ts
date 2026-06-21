import type { Request, Response } from "express";

/**
 * Build an Express handler that forwards a request to an internal service.
 *
 * Internal services live at `http://<name>.internal` inside the cluster and are
 * not exposed publicly. We copy the verified identity onto `x-user-id` /
 * `x-org-id` headers; downstream services scope every query to `x-org-id` and
 * must ignore any `orgId` in the request body.
 */
export function proxy(service: "accounts" | "billing" | "usage" | "notifications") {
  const base = `http://${service}.internal`;

  return async (req: Request, res: Response): Promise<void> => {
    const session = req.session!; // verifySession guarantees this is set
    const upstream = await fetch(base + req.url, {
      method: req.method,
      headers: {
        "content-type": "application/json",
        "x-user-id": session.userId,
        "x-org-id": session.orgId,
      },
      body: req.method === "GET" ? undefined : JSON.stringify(req.body),
    });

    res.status(upstream.status);
    res.send(await upstream.text());
  };
}
