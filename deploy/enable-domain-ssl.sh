#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOMAIN="ai.rastinax.com"
PUBLIC_IP="195.177.255.98"
EMAIL="${CERTBOT_EMAIL:-}"

fail() {
    echo "ERROR: $*" >&2
    exit 1
}

[[ "${EUID}" -eq 0 ]] || fail "این اسکریپت را با sudo اجرا کنید."
command -v nginx >/dev/null 2>&1 || fail "Nginx نصب نیست. ابتدا ubuntu-install.sh را اجرا کنید."
command -v curl >/dev/null 2>&1 || fail "curl نصب نیست."

resolved_ips="$(getent ahostsv4 "$DOMAIN" | awk '{print $1}' | sort -u || true)"
echo "DNS for $DOMAIN:"
echo "${resolved_ips:-<no IPv4 record>}"
echo "$resolved_ips" | grep -Fxq "$PUBLIC_IP" || fail "رکورد DNS دامنه باید به $PUBLIC_IP اشاره کند."

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y certbot

install -d -o www-data -g www-data -m 0755 \
    /var/www/letsencrypt/.well-known/acme-challenge
install -m 0644 "$APP_DIR/deploy/nginx/rastinax.conf" \
    /etc/nginx/sites-available/rastinax
ln -sfn /etc/nginx/sites-available/rastinax \
    /etc/nginx/sites-enabled/rastinax

if [[ -e /etc/nginx/sites-enabled/default || -L /etc/nginx/sites-enabled/default ]]; then
    mv /etc/nginx/sites-enabled/default \
        "/etc/nginx/sites-enabled/default.disabled.$(date +%Y%m%d%H%M%S)"
fi

nginx -t
systemctl reload nginx

curl --fail --silent --show-error \
    -H "Host: $DOMAIN" \
    http://127.0.0.1/nginx-health >/dev/null \
    || fail "Nginx روی HTTP پاسخ نمی‌دهد؛ پورت 80 و لاگ Nginx را بررسی کنید."

certbot_args=(
    certonly
    --webroot
    --webroot-path /var/www/letsencrypt
    --domain "$DOMAIN"
    --agree-tos
    --non-interactive
    --keep-until-expiring
)

if [[ -n "$EMAIL" ]]; then
    certbot_args+=(--email "$EMAIL")
else
    certbot_args+=(--register-unsafely-without-email)
fi

certbot "${certbot_args[@]}"
[[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]] || \
    fail "گواهی SSL ساخته نشد."

install -m 0644 "$APP_DIR/deploy/nginx/rastinax-ssl.conf" \
    /etc/nginx/sites-available/rastinax
nginx -t
systemctl reload nginx

if command -v ufw >/dev/null 2>&1; then
    ufw allow 80/tcp >/dev/null || true
    ufw allow 443/tcp >/dev/null || true
fi

systemctl enable --now certbot.timer >/dev/null 2>&1 || true

curl --fail --silent --show-error \
    --resolve "$DOMAIN:443:127.0.0.1" \
    "https://$DOMAIN/nginx-health" >/dev/null \
    || fail "HTTPS فعال نشد؛ nginx -t و لاگ سرویس Nginx را بررسی کنید."

certbot renew --dry-run

echo
echo "HTTPS فعال شد: https://$DOMAIN/"
echo "API:          https://$DOMAIN/api/v1/"
