# Demo Co platform — common developer tasks.
# `make dev` is the one command you need day to day.

.PHONY: dev test migrate seed lint clean

# Start every service with hot reload against a seeded local Postgres.
dev: migrate seed
	npm run dev --workspaces --if-present

# Run the test suite across all service workspaces.
test:
	npx vitest run

# Apply pending SQL migrations (each service owns its own schema).
migrate:
	./scripts/migrate.sh services/accounts/migrations
	./scripts/migrate.sh services/billing/migrations
	./scripts/migrate.sh services/usage/migrations
	./scripts/migrate.sh services/notifications/migrations

# Load the demo fixture: one org, a few users, the three plans.
seed:
	psql "$$DATABASE_URL" -f scripts/seed.sql

lint:
	npx eslint services

clean:
	rm -rf services/*/dist node_modules
