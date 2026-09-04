#!/usr/bin/env bash
set -Eeuo pipefail

# This script intentionally resets the PostgreSQL password for the known local
# production role and writes the same value to Server/.env.
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$APP_DIR/Server/.env"
DB_NAME="rastinax_agent_db"
DB_USER="admin_ai"
DB_HOST="127.0.0.1"
DB_PORT="5432"

fail() {
    echo
    echo "ERROR: $*" >&2
    exit 1
}

[[ "${EUID}" -eq 0 ]] || fail "این اسکریپت را با sudo اجرا کنید."
[[ -f "$ENV_FILE" ]] || fail "فایل Server/.env پیدا نشد."
command -v psql >/dev/null 2>&1 || fail "psql نصب نیست. ابتدا PostgreSQL client را نصب کنید."
command -v openssl >/dev/null 2>&1 || fail "openssl نصب نیست."

grep -q "^DB_NAME=$DB_NAME$" "$ENV_FILE" \
    || fail "نام دیتابیس در Server/.env باید $DB_NAME باشد."
grep -q "^DB_USER=$DB_USER$" "$ENV_FILE" \
    || fail "کاربر دیتابیس در Server/.env باید $DB_USER باشد."

echo "این عملیات رمز PostgreSQL کاربر $DB_USER را تغییر می‌دهد."
echo "برای جلوگیری از خطای .env، فقط حروف انگلیسی، عدد، نقطه، خط تیره و زیرخط استفاده کنید."
read -r -s -p "رمز جدید را وارد کنید (خالی = تولید خودکار): " DB_PASSWORD
echo

if [[ -z "$DB_PASSWORD" ]]; then
    DB_PASSWORD="$(openssl rand -hex 32)"
    echo "رمز جدید تولید شد؛ آن را در محل امن ذخیره کنید:"
    echo "$DB_PASSWORD"
fi

[[ "$DB_PASSWORD" =~ ^[A-Za-z0-9._-]{8,128}$ ]] \
    || fail "رمز باید بین ۸ تا ۱۲۸ کاراکتر و فقط شامل A-Z، a-z، عدد، نقطه، خط تیره یا زیرخط باشد."

echo "==> تغییر رمز role در PostgreSQL"
sudo -u postgres psql -X -v ON_ERROR_STOP=1 \
    -v db_user="$DB_USER" \
    -v db_password="$DB_PASSWORD" <<'SQL'
ALTER ROLE :"db_user" WITH LOGIN PASSWORD :'db_password';
SQL

echo "==> بررسی دسترسی role به دیتابیس"
sudo -u postgres psql -X -v ON_ERROR_STOP=1 \
    -v db_name="$DB_NAME" \
    -v db_user="$DB_USER" \
    -c 'ALTER DATABASE :"db_name" OWNER TO :"db_user";'
sudo -u postgres psql -X -v ON_ERROR_STOP=1 \
    -v db_user="$DB_USER" \
    -d "$DB_NAME" <<'SQL'
ALTER SCHEMA public OWNER TO :"db_user";
GRANT ALL ON SCHEMA public TO :"db_user";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO :"db_user";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO :"db_user";
SQL

echo "==> ذخیره همان رمز در Server/.env"
DB_PASSWORD="$DB_PASSWORD" ENV_FILE="$ENV_FILE" python3 - <<'PY'
import os
from pathlib import Path

path = Path(os.environ["ENV_FILE"])
password = os.environ["DB_PASSWORD"]
lines = path.read_text(encoding="utf-8").splitlines()
updated = False
result = []

for line in lines:
    if line.startswith("DB_PASSWORD="):
        result.append(f"DB_PASSWORD={password}")
        updated = True
    else:
        result.append(line)

if not updated:
    result.append(f"DB_PASSWORD={password}")

path.write_text("\n".join(result) + "\n", encoding="utf-8")
os.chmod(path, 0o600)
PY

echo "==> تست اتصال با همان credentials"
PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -X -v ON_ERROR_STOP=1 \
    -c 'SELECT current_user, current_database();' >/dev/null \
    || fail "هنوز اتصال برقرار نشد. وضعیت PostgreSQL و pg_hba.conf را بررسی کنید."
unset PGPASSWORD

if [[ -x "$APP_DIR/.venv-server/bin/python" ]]; then
    echo "==> اجرای migration"
    (
        cd "$APP_DIR/Server"
        "$APP_DIR/.venv-server/bin/python" manage.py migrate
    )
fi

if systemctl list-unit-files --type=service --no-legend 2>/dev/null \
    | awk '{print $1}' \
    | grep -qx 'rastinax-backend.service'; then
    systemctl restart rastinax-backend
fi

echo
echo "اتصال دیتابیس اصلاح شد."
echo "اکنون وضعیت بک‌اند را بررسی کنید:"
echo "systemctl status rastinax-backend --no-pager"
