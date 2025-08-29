#!/usr/bin/env sh
set -eu

echo "[init] Waiting for database to be ready..."
# Optional extra wait in case healthcheck has just flipped
sleep 2

echo "[init] Running database migrations..."
if npm run db:security-migrate; then
  echo "[init] Migrations completed successfully."
else
  echo "[init] Migrations failed." >&2
  exit 1
fi

# In production, skip seeding if data already exists
SHOULD_SEED=true
if [ "${NODE_ENV:-development}" = "production" ]; then
  echo "[init] Checking for existing data before seeding..."
  # Try to count users; if table doesn't exist yet, we'll proceed with seeding
  COUNT_OUTPUT=$(node -e '
    (async () => {
      try {
        const { Client } = require("pg");
        const conn = { connectionString: process.env.DATABASE_URL };
        if (process.env.NODE_ENV === "production") conn.ssl = { rejectUnauthorized: false };
        const client = new Client(conn);
        await client.connect();
        const res = await client.query("SELECT COUNT(*)::int AS count FROM users");
        await client.end();
        console.log(res.rows[0].count);
      } catch (e) {
        // Non-fatal: if table missing or query fails, just exit 0 without output
        process.exit(0);
      }
    })();
  ' 2>/dev/null || true)

  if [ -n "$COUNT_OUTPUT" ] && [ "$COUNT_OUTPUT" -gt 0 ] 2>/dev/null; then
    echo "[init] Existing data detected ($COUNT_OUTPUT records). Skipping seed."
    SHOULD_SEED=false
  fi
fi

if [ "$SHOULD_SEED" = true ]; then
  echo "[init] Seeding database (idempotent)..."
  if npm run db:setup; then
    echo "[init] Seed completed successfully."
  else
    echo "[init] Seed failed." >&2
    exit 1
  fi
else
  echo "[init] Seed skipped."
fi

echo "[init] Initialization complete."
exit 0
