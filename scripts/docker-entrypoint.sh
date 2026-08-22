#!/bin/sh
set -e

UPLOAD_DIR="${UPLOAD_DIR:-/app/data/uploads}"
BACKUP_DIR="${BACKUP_DIR:-/app/data/backups}"
BACKUP_CRON_ENABLED="${BACKUP_CRON_ENABLED:-1}"
BACKUP_CRON_HOUR="${BACKUP_CRON_HOUR:-22}"

if [ -n "$DATABASE_URL" ]; then
  echo "Waiting for database..."
  until psql "$DATABASE_URL" -c "SELECT 1" >/dev/null 2>&1; do
    echo "Database not ready, retrying in 2s..."
    sleep 2
  done

  echo "Applying database schema..."
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/schema.sql
  echo "Database schema ready."

  echo "Seeding database if empty..."
  COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM campaign_settings")
  if [ "$COUNT" = "0" ]; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seed.sql
    echo "Demo data seeded."
  else
    echo "Database already has campaigns, skipping seed."
  fi
fi

mkdir -p "$UPLOAD_DIR" "$BACKUP_DIR" "$BACKUP_DIR/system"
chown -R nextjs:nodejs "$UPLOAD_DIR" "$BACKUP_DIR" 2>/dev/null || true

if [ "$BACKUP_CRON_ENABLED" = "1" ] && [ -n "$CRON_SECRET" ]; then
  echo "Starting nightly backup scheduler (${BACKUP_CRON_HOUR}:00 Asia/Tehran)..."
  (
    export TZ=Asia/Tehran
    while true; do
      today=$(date +%Y-%m-%d)
      marker="/tmp/dolatma-backup-cron-${today}"
      hour=$(date +%H)
      minute=$(date +%M)
      if [ "$hour" = "$BACKUP_CRON_HOUR" ] && [ "$minute" -lt "10" ] && [ ! -f "$marker" ]; then
        touch "$marker"
        node -e "
          const port = process.env.PORT || 3030;
          const secret = process.env.CRON_SECRET;
          const run = () =>
            fetch('http://127.0.0.1:' + port + '/api/cron/create-backups', {
              method: 'POST',
              headers: { Authorization: 'Bearer ' + secret },
            })
              .then((r) => r.text())
              .then((body) => console.log('[backup-cron]', body))
              .catch((err) => console.error('[backup-cron]', err));
          fetch('http://127.0.0.1:' + port + '/api/health')
            .then((r) => (r.ok ? run() : Promise.reject(new Error('health not ready'))))
            .catch((err) => console.error('[backup-cron]', err));
        " || true
      fi
      sleep 60
    done
  ) &
fi

exec su-exec nextjs:nodejs node server.js
