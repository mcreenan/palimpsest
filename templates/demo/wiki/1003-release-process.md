# Release & deployment

> Wiki article 1003 · Engineering · last reviewed 2026-06

We ship from `main` continuously. A merge to `main` triggers CI, builds container
images, and deploys to staging automatically. Production deploys are promoted
manually after a staging soak of roughly 30 minutes. Rollbacks are a one-click
redeploy of the previous image tag.
