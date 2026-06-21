# Runbook: deploys

How code gets from a merge to running in production, and how to undo it.

## The pipeline

`.github/workflows/deploy.yml` runs on every push:

1. **test** — `npm test` across the platform workspaces. A red build never deploys.
2. **build-and-push** — one container image per service, tagged with the commit SHA,
   pushed to `ghcr.io/demo-co/*`.
3. **deploy** — `kubectl apply -f kubernetes/` against the target cluster, then
   waits for the gateway rollout to become healthy.

Routing:

- A merge to `main` → **staging** (`eks-staging`).
- A `v*` tag → **production** (`eks-prod`).

So shipping to production is: cut a release tag once staging looks good.

## Watching a deploy

```sh
aws eks update-kubeconfig --name eks-prod
kubectl rollout status deploy/gateway
kubectl get pods -l tier=internal
```

Kubernetes rolls pods one at a time; the readiness probe (`/healthz` on the
gateway) gates traffic, so a bad image fails the rollout instead of taking the
site down.

## Rolling back

Fastest path — roll the Deployment back to the previous ReplicaSet:

```sh
kubectl rollout undo deploy/gateway
```

If a release tag was bad, re-tag the last good commit and let the pipeline ship
it. **Never** hand-edit production with `kubectl edit` — the next deploy would
overwrite it and the change would be lost. All production change goes through git.

## Database migrations

Migrations are applied by `make migrate` as part of the release, before the new
image takes traffic. They must be backward compatible (the old pods run against
the new schema during the rollout). See the wiki runbook "Database migrations"
for the expand/contract pattern.
