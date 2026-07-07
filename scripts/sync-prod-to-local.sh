#!/usr/bin/env bash
# Copy production data into the local Supabase DB so you can edit it freely.
# Data-only: schema/triggers come from supabase/migrations via `db reset`.
#
# Usage: ./scripts/sync-prod-to-local.sh
# Requires: linked Supabase project (supabase/.temp/project-ref) + local stack running.
set -euo pipefail

DUMP=/tmp/prod_data.sql
DB_CONTAINER=supabase_db_$(grep -E '^project_id' supabase/config.toml | cut -d'"' -f2)

echo "1/4 dumping prod data (data-only)..."
npx supabase db dump --linked --data-only -f "$DUMP"

echo "2/4 resetting local schema from migrations..."
npx supabase db reset

echo "3/4 loading prod data into $DB_CONTAINER..."
docker exec -i "$DB_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 < "$DUMP"

# The catalog read is wrapped in unstable_cache (revalidate 3600s). Swapping the
# DB underneath the app skips revalidateTag, so old entries go stale. Nuke them.
echo "4/4 clearing Next data cache..."
rm -rf .next/cache

echo "done. restart 'npm run dev' if it was running."
