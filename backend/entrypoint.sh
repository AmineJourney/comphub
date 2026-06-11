#!/bin/sh
set -e

echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT:-5432}..."
python - <<'PY'
import os
import time
import psycopg2

host = os.environ.get("DB_HOST", "postgres")
port = int(os.environ.get("DB_PORT", "5432"))
name = os.environ.get("DB_NAME")
user = os.environ.get("DB_USER")
password = os.environ.get("DB_PASSWORD")

for attempt in range(30):
    try:
        psycopg2.connect(
            dbname=name,
            user=user,
            password=password,
            host=host,
            port=port,
        ).close()
        print("PostgreSQL is ready.")
        break
    except Exception as exc:
        if attempt == 29:
            raise
        print(f"PostgreSQL not ready yet: {exc}")
        time.sleep(2)
PY

python manage.py migrate --noinput
python manage.py collectstatic --noinput

exec uvicorn config.asgi:application --host 0.0.0.0 --port 8000
