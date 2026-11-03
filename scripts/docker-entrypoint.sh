#!/bin/sh
# Starts Closebuy on Fly.io:
#   1. if this machine has no database yet, restore the latest backup from R2;
#   2. create/update the tables;
#   3. run the app with Litestream copying every database change to R2 within seconds.
set -e

export DATABASE_URL="${DATABASE_URL:-/data/closebuy.db}"
mkdir -p "$(dirname "$DATABASE_URL")" "${UPLOAD_DIR:-/data/uploads}"
START_APP="node node_modules/next/dist/bin/next start -p ${PORT:-3000}"

if [ -n "$R2_BUCKET" ] && [ -n "$R2_ACCOUNT_ID" ] && [ -n "$R2_ACCESS_KEY_ID" ] && [ -n "$R2_SECRET_ACCESS_KEY" ]; then
  echo "[start] Restoring the database from the R2 backup if this machine doesn't have one..."
  litestream restore -config /etc/litestream.yml -if-db-not-exists -if-replica-exists "$DATABASE_URL"
  node scripts/migrate.mjs
  echo "[start] Starting Closebuy with continuous backups to R2."
  exec litestream replicate -config /etc/litestream.yml -exec "$START_APP"
else
  echo "[start] WARNING: R2 is not configured, so the database is NOT being backed up and uploads stay on this machine."
  node scripts/migrate.mjs
  exec $START_APP
fi
