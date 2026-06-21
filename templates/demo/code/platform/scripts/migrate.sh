#!/usr/bin/env bash
# Apply every .sql migration in a directory, in filename order.
# Usage: ./scripts/migrate.sh services/accounts/migrations
set -euo pipefail

dir="${1:?usage: migrate.sh <migrations-dir>}"
: "${DATABASE_URL:?set DATABASE_URL}"

for file in "$dir"/*.sql; do
  echo "→ applying $file"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
done
