# راهنمای استقرار ابری Rastinax AI Agent

این راهنما برای سرور لینوکسی با IP عمومی زیر نوشته شده است:

```text
195.177.255.98
```

معماری نهایی:

```text
Browser
   │
   ▼
Nginx :80 ───────────────► Client SSR :3000
   │
   └── /api/ و /admin/ ──► Django :8001 ──► AI :8000 ──► OpenRouter
                                      │
                                      └── PostgreSQL :5432
```

فقط Nginx باید از اینترنت قابل‌دسترسی باشد. پورت‌های `3000`، `8000`،
`8001` و `5432` را عمومی نکنید.

## ۱. آماده‌سازی سرور

دستورهای زیر را روی سرور اجرا کنید. فرض این راهنما این است که پروژه در مسیر
`/var/www/rastinax-agent` قرار دارد:

```bash
sudo apt update
sudo apt install -y nginx python3-venv python3-pip

node --version
npm --version
```

نسخه Node باید حداقل ۲۰ باشد. اگر Node روی سرور نصب نیست یا نسخه‌اش قدیمی است،
ابتدا Node.js نسخه ۲۰ یا بالاتر را نصب کنید.

کد پروژه را در مسیر زیر قرار دهید:

```bash
sudo mkdir -p /var/www/rastinax-agent
sudo chown -R "$USER":"$USER" /var/www/rastinax-agent
cd /var/www/rastinax-agent
```

## ۲. فایل‌های محیطی production

فایل‌های نمونه را کپی کنید:

```bash
cp deploy/env/server.production.example Server/.env
cp deploy/env/ai.production.example AI/.env
cp deploy/env/client.production.example Client/.env
```

سپس مقدارهای واقعی را وارد کنید:

```dotenv
# Server/.env
DEBUG=False
DB_NAME=rastinax_agent_db
DB_USER=admin_ai
DB_PASSWORD=رمز-واقعی-کاربر-admin_ai
DB_HOST=127.0.0.1
DB_PORT=5432
AI_AGENT_BASE_URL=http://127.0.0.1:8000
ALLOWED_HOSTS=195.177.255.98,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://195.177.255.98
CSRF_TRUSTED_ORIGINS=http://195.177.255.98
```

در `AI/.env` نیز مقدار واقعی `OPENROUTER_API_KEY` را قرار دهید. این کلید را
در Client یا Nginx قرار ندهید.

اگر بعداً دامنه و HTTPS اضافه شد، مقدارهای `CORS_ALLOWED_ORIGINS` و
`CSRF_TRUSTED_ORIGINS` را به آدرس `https://...` تغییر دهید.

## ۳. نصب و build سرویس‌ها

### AI Agent

```bash
cd /var/www/rastinax-agent
python3 -m venv .venv-ai
source .venv-ai/bin/activate
python -m pip install --upgrade pip
python -m pip install -r AI/requirements.txt
deactivate
```

### Django Backend

```bash
cd /var/www/rastinax-agent
python3 -m venv .venv-server
source .venv-server/bin/activate
python -m pip install --upgrade pip
python -m pip install -r Server/requirements.txt -r Server/requirements-production.txt

cd Server
python manage.py check
python manage.py migrate
python manage.py collectstatic --noinput
deactivate
```

اتصال Django به PostgreSQL باید با همین مشخصات انجام شود:
`rastinax_agent_db`، کاربر `admin_ai`، پورت `5432` و Host برابر
`127.0.0.1`.

### Client

```bash
cd /var/www/rastinax-agent/Client
npm ci
npm run typecheck
npm run build
```

## ۴. اجرای سرویس‌ها روی loopback

برای تست اولیه، هر دستور را در یک ترمینال جدا اجرا کنید:

```bash
# ترمینال ۱: AI
cd /var/www/rastinax-agent
.venv-ai/bin/uvicorn app.main:app --app-dir AI --host 127.0.0.1 --port 8000
```

```bash
# ترمینال ۲: Django
cd /var/www/rastinax-agent/Server
../.venv-server/bin/gunicorn config.wsgi:application \
  --bind 127.0.0.1:8001 \
  --workers 3 \
  --timeout 180
```

```bash
# ترمینال ۳: Client
cd /var/www/rastinax-agent/Client
HOST=127.0.0.1 PORT=3000 npm run start
```

برای اجرای دائمی بعد از reboot، این سه دستور را با systemd یا supervisor
مدیریت کنید. Nginx فقط زمانی پاسخ کامل می‌دهد که هر سه سرویس بالا باشند.

## ۵. اجرای دائمی با systemd

سه unit آماده در مسیر `deploy/systemd/` قرار دارند. آن‌ها فرض می‌کنند سرویس‌ها
با کاربر `www-data` اجرا می‌شوند و پروژه دقیقاً در
`/var/www/rastinax-agent` قرار دارد:

```bash
sudo cp deploy/systemd/rastinax-ai.service /etc/systemd/system/
sudo cp deploy/systemd/rastinax-backend.service /etc/systemd/system/
sudo cp deploy/systemd/rastinax-client.service /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable --now rastinax-ai.service
sudo systemctl enable --now rastinax-backend.service
sudo systemctl enable --now rastinax-client.service
```

وضعیت و لاگ‌ها:

```bash
sudo systemctl status rastinax-ai --no-pager
sudo systemctl status rastinax-backend --no-pager
sudo systemctl status rastinax-client --no-pager

sudo journalctl -u rastinax-ai -n 100 --no-pager
sudo journalctl -u rastinax-backend -n 100 --no-pager
sudo journalctl -u rastinax-client -n 100 --no-pager
```

اگر مسیر نصب Node شما `/usr/bin/npm` نیست، مقدار `ExecStart` در
`rastinax-client.service` را با خروجی `command -v npm` جایگزین کنید. قبل از
فعال‌سازی unitها نیز دسترسی خواندن `www-data` به پروژه و فایل‌های `.env` را
بررسی کنید.

## ۶. فعال‌سازی Nginx روی IP اصلی

فایل آماده در این مسیر قرار دارد:

```text
deploy/nginx/rastinax.conf
```

آن را فعال کنید:

```bash
sudo cp /var/www/rastinax-agent/deploy/nginx/rastinax.conf \
  /etc/nginx/sites-available/rastinax

sudo ln -sfn /etc/nginx/sites-available/rastinax \
  /etc/nginx/sites-enabled/rastinax
```

اگر سایت پیش‌فرض Nginx هم `default_server` دارد، آن را به‌صورت قابل‌بازگشت
غیرفعال کنید:

```bash
if [ -e /etc/nginx/sites-enabled/default ]; then
  sudo mv /etc/nginx/sites-enabled/default \
    /etc/nginx/sites-enabled/default.disabled
fi
```

مسیر static در کانفیگ برابر است با:

```text
/var/www/rastinax-agent/Server/staticfiles/
```

اگر پروژه را در مسیر دیگری قرار دادید، مقدار `alias` در فایل Nginx را تغییر
دهید.

سپس کانفیگ را بررسی و Nginx را reload کنید:

```bash
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx
```

## ۷. تست نهایی

روی خود سرور:

```bash
curl -fsS http://127.0.0.1:8000/health
curl -I http://127.0.0.1:8001/api/docs/
curl -fsS http://195.177.255.98/nginx-health
curl -I http://195.177.255.98/
curl -I http://195.177.255.98/api/docs/
```

آدرس‌های عمومی:

```text
Frontend: http://195.177.255.98/
Swagger:  http://195.177.255.98/api/docs/
ReDoc:    http://195.177.255.98/api/redoc/
Admin:    http://195.177.255.98/admin/
Health:   http://195.177.255.98/nginx-health
```

## ۸. فایروال

حداقل پورت‌های عمومی:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

برای این معماری نیازی به باز کردن `3000`، `8000`، `8001` یا `5432` در فایروال
نیست.

## خطاهای رایج

### `502 Bad Gateway`

بررسی کنید هر سرویس روی پورت داخلی خودش در حال اجراست:

```bash
ss -lntp | grep -E ':3000|:8000|:8001'
sudo tail -n 100 /var/log/nginx/error.log
```

### خطای دیتابیس

مقدارهای زیر در `Server/.env` را با تنظیمات واقعی PostgreSQL تطبیق دهید:

```dotenv
DB_NAME=rastinax_agent_db
DB_USER=admin_ai
DB_PASSWORD=...
DB_HOST=127.0.0.1
DB_PORT=5432
```

### خطای AI

مقدار `OPENROUTER_API_KEY` در `AI/.env` و سلامت سرویس AI را بررسی کنید:

```bash
curl -fsS http://127.0.0.1:8000/health
```

### صفحه سفید یا خطای asset

در مسیر Client دوباره build بگیرید و مطمئن شوید Client روی پورت `3000` اجرا
شده است:

```bash
cd /var/www/rastinax-agent/Client
npm run build
HOST=127.0.0.1 PORT=3000 npm run start
```

## ۹. HTTPS در آینده

برای IP خام معمولاً از گواهی معتبر Let's Encrypt استفاده نمی‌شود. بعد از اتصال
دامنه به سرور، `server_name` را به دامنه تغییر دهید و گواهی SSL را با Certbot
فعال کنید. سپس آدرس‌های HTTPS را در فایل‌های محیطی Django و OpenRouter نیز
به‌روزرسانی کنید.
