# Database migrations

> Wiki article 1007 · Engineering · last reviewed 2026-06

We deploy continuously and roll pods one at a time, so for a short window the old
and new code run against the **same** database. Every migration must be safe for
that overlap. The rule: **expand, then contract**, across two deploys.

## Where they live
Each service owns its schema and migrations under
`platform/services/<name>/migrations`, applied in filename order by `make migrate`.
A service never migrates another service's schema (see ADR-002).

## Expand / contract
Renaming `full_name` → `display_name`:

**Deploy 1 (expand):** add `display_name` nullable, backfill it, and update code to
write both and read the new column. Old pods keep working.

**Deploy 2 (contract):** stop writing `full_name`, then drop it.

## Do / don't
- ✅ Add columns nullable or with a default; backfill in batches; add indexes
  `CONCURRENTLY`.
- ❌ Don't rename/drop a column in the same deploy that stops using it.
- ❌ Don't add a `NOT NULL` column without a default to a populated table.

A failed migration fails the deploy and the old version keeps serving — fix
forward with a new migration.
