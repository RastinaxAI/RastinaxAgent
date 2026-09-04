#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC_IP="195.177.255.98"
SERVICE_USER="www-data"

fail() {
    echo
    echo "ERROR: $*" >&2
    exit 1
}

[[ "${EUID}" -eq 0 ]] || fail "این اسکریپت را با sudo اجرا کنید."

for required_file in \
    "$APP_DIR/Server/.env" \
    "$APP_DIR/AI/.env" \
    "$APP_DIR/Client/.env" \
    "$APP_DIR/deploy/nginx/rastinax.conf" \
    "$APP_DIR/deploy/systemd/rastinax-ai.service" \
    "$APP_DIR/deploy/systemd/rastinax-backend.service" \
    "$APP_DIR/deploy/systemd/rastinax-client.service"; do
    [[ -f "$required_file" ]] || fail "فایل پیدا نشد: $required_file"
done

grep -q '^DB_NAME=rastinax_agent_db$' "$APP_DIR/Server/.env" \
    || fail "در Server/.env مقدار DB_NAME باید rastinax_agent_db باشد."
grep -q '^DB_USER=admin_ai$' "$APP_DIR/Server/.env" \
    || fail "در Server/.env مقدار DB_USER باید admin_ai باشد."
grep -q '^DB_PASSWORD=.' "$APP_DIR/Server/.env" \
    || fail "در Server/.env مقدار DB_PASSWORD خالی است."
grep -q '^OPENROUTER_API_KEY=.' "$APP_DIR/AI/.env" \
    || fail "در AI/.env مقدار OPENROUTER_API_KEY خالی است."
grep -q '^VITE_API_BASE_URL=/api/v1$' "$APP_DIR/Client/.env" \
    || fail "در Client/.env باید VITE_API_BASE_URL=/api/v1 باشد."

if grep -Eq 'replace-with|کلید-واقعی|رمز-واقعی|یک-کلید-تصادفی' \
    "$APP_DIR/Server/.env" "$APP_DIR/AI/.env"; then
    fail "مقدارهای نمونه در فایل‌های .env باقی مانده‌اند؛ آن‌ها را با مقدار واقعی عوض کنید."
fi

echo "==> نصب بسته‌های Ubuntu"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y nginx curl ca-certificates gnupg python3 python3-venv python3-pip build-essential libpq-dev

NODE_MAJOR=0
if [[ -x /usr/bin/node ]]; then
    NODE_MAJOR="$(/usr/bin/node -p 'process.versions.node.split(".")[0]')"
fi

if [[ ! -x /usr/bin/npm || ! -x /usr/bin/node || "$NODE_MAJOR" -lt 20 ]]; then
    echo "==> نصب Node.js 22"
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
fi

NODE_MAJOR="$(/usr/bin/node -p 'process.versions.node.split(".")[0]')"
(( NODE_MAJOR >= 20 )) || fail "نسخه Node.js باید حداقل 20 باشد. نسخه فعلی: $NODE_MAJOR"

echo "==> نصب وابستگی‌های AI"
python3 -m venv "$APP_DIR/.venv-ai"
"$APP_DIR/.venv-ai/bin/python" -m pip install --upgrade pip
"$APP_DIR/.venv-ai/bin/pip" install -r "$APP_DIR/AI/requirements.txt"

echo "==> نصب وابستگی‌های Django"
python3 -m venv "$APP_DIR/.venv-server"
"$APP_DIR/.venv-server/bin/python" -m pip install --upgrade pip
"$APP_DIR/.venv-server/bin/pip" install \
    -r "$APP_DIR/Server/requirements.txt" \
    -r "$APP_DIR/Server/requirements-production.txt"

echo "==> اجرای migration و جمع‌آوری static"
(
    cd "$APP_DIR/Server"
    "$APP_DIR/.venv-server/bin/python" manage.py check
    if ! DJANGO_SETTINGS_MODULE=config.settings \
        "$APP_DIR/.venv-server/bin/python" -c \
        'import django; django.setup(); from django.db import connection; connection.ensure_connection(); print("PostgreSQL connection: OK")'; then
        fail "اتصال PostgreSQL برقرار نشد. برای اصلاح رمز، اجرا کنید: sudo bash deploy/fix-database-auth.sh"
    fi
    "$APP_DIR/.venv-server/bin/python" manage.py migrate
    "$APP_DIR/.venv-server/bin/python" manage.py collectstatic --noinput
)

echo "==> نصب و build فرانت‌اند"
(
    cd "$APP_DIR/Client"
    /usr/bin/npm ci
    /usr/bin/npm run typecheck
    /usr/bin/npm run build
)

echo "==> تنظیم دسترسی سرویس‌ها"
chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_DIR"
chmod 600 "$APP_DIR/Server/.env" "$APP_DIR/AI/.env" "$APP_DIR/Client/.env"

echo "==> نصب سرویس‌های systemd"
install -m 0644 "$APP_DIR/deploy/systemd/rastinax-ai.service" \
    /etc/systemd/system/rastinax-ai.service
install -m 0644 "$APP_DIR/deploy/systemd/rastinax-backend.service" \
    /etc/systemd/system/rastinax-backend.service
install -m 0644 "$APP_DIR/deploy/systemd/rastinax-client.service" \
    /etc/systemd/system/rastinax-client.service

systemctl daemon-reload
systemctl enable rastinax-ai rastinax-backend rastinax-client
systemctl restart rastinax-ai
systemctl restart rastinax-backend
systemctl restart rastinax-client

echo "==> تنظیم Nginx"
install -m 0644 "$APP_DIR/deploy/nginx/rastinax.conf" \
    /etc/nginx/sites-available/rastinax
ln -sfn /etc/nginx/sites-available/rastinax \
    /etc/nginx/sites-enabled/rastinax

if [[ -e /etc/nginx/sites-enabled/default || -L /etc/nginx/sites-enabled/default ]]; then
    backup="/etc/nginx/sites-enabled/default.disabled.$(date +%Y%m%d%H%M%S)"
    mv /etc/nginx/sites-enabled/default "$backup"
    echo "سایت پیش‌فرض Nginx به این مسیر منتقل شد: $backup"
fi

nginx -t
systemctl enable --now nginx
systemctl reload nginx

echo "==> تست سرویس‌های داخلی"
curl --fail --silent http://127.0.0.1:8000/health >/dev/null \
    || fail "AI روی پورت 8000 پاسخ نداد."
curl --fail --silent http://127.0.0.1:8001/api/docs/ >/dev/null \
    || fail "Django روی پورت 8001 پاسخ نداد."
curl --fail --silent http://127.0.0.1:3000/ >/dev/null \
    || fail "Client روی پورت 3000 پاسخ نداد."
curl --fail --silent http://127.0.0.1/nginx-health >/dev/null \
    || fail "Nginx روی localhost پاسخ نداد."

echo
echo "=============================================="
echo "استقرار با موفقیت انجام شد."
echo "Frontend: http://$PUBLIC_IP/"
echo "Swagger:  http://$PUBLIC_IP/api/docs/"
echo "Health:   http://$PUBLIC_IP/nginx-health"
echo "=============================================="
