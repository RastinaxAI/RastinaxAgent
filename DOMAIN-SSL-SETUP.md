# اتصال `ai.rastinax.com` و فعال‌سازی SSL

## ۱. اصلاح DNS

در پنل DNS دامنه، فقط این رکورد را تنظیم کنید:

```text
Type: A
Name: ai
Value: 195.177.255.98
TTL: 3600
```

رکورد فعلی به `195.77.255.98` اشاره می‌کند و اشتباه است. باید دقیقاً `195.177.255.98` باشد.

از کامپیوتر خودتان بررسی کنید:

```powershell
Resolve-DnsName ai.rastinax.com -Type A
```

خروجی باید IP زیر را نشان دهد:

```text
195.177.255.98
```

## ۲. ورود به سرور

```bash
ssh root@195.177.255.98
cd /var/www/rastinax-agent
```

اگر پروژه هنوز روی سرور نیست، ابتدا کل پوشه‌ی پروژه را در همین مسیر آپلود کنید.

## ۳. تنظیم فایل‌های محیطی

در `Server/.env` این مقادیر باید وجود داشته باشند:

```dotenv
DEBUG=False
ALLOWED_HOSTS=ai.rastinax.com,195.177.255.98,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://ai.rastinax.com,http://ai.rastinax.com,http://195.177.255.98
CSRF_TRUSTED_ORIGINS=https://ai.rastinax.com,http://ai.rastinax.com,http://195.177.255.98
```

در `AI/.env` مقدار زیر را تنظیم کنید:

```dotenv
OPENROUTER_SITE_URL=https://ai.rastinax.com
```

مقادیر واقعی `DB_PASSWORD` و `OPENROUTER_API_KEY` را نگه دارید و در فایل عمومی یا Git قرار ندهید.

## ۴. استقرار HTTP

اگر سرویس‌ها و Nginx قبلاً نصب شده‌اند:

```bash
sudo bash deploy/ubuntu-install.sh
```

این دستور سرویس‌های AI، Django، Client و Nginx را راه‌اندازی می‌کند و پورت‌های داخلی را فقط روی localhost نگه می‌دارد.

اگر فقط می‌خواهید Nginx را بعد از تغییر فایل‌ها reload کنید:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## ۵. فعال‌سازی SSL

پورت‌های ۸۰ و ۴۴۳ باید در پنل Cloud Firewall و UFW باز باشند:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

بعد اسکریپت SSL را اجرا کنید. ایمیل اختیاری است، ولی برای هشدارهای تمدید بهتر است وارد شود:

```bash
sudo CERTBOT_EMAIL=you@example.com bash deploy/enable-domain-ssl.sh
```

اسکریپت این کارها را انجام می‌دهد:

1. درست بودن DNS را بررسی می‌کند.
2. مسیر challenge مربوط به Let's Encrypt را روی Nginx فعال می‌کند.
3. گواهی دامنه را می‌گیرد.
4. Nginx را به HTTPS و redirect خودکار HTTP به HTTPS منتقل می‌کند.
5. تمدید خودکار گواهی را تست می‌کند.

## ۶. بررسی نهایی

```bash
curl -I https://ai.rastinax.com/
curl https://ai.rastinax.com/nginx-health
curl -I https://ai.rastinax.com/api/docs/
```

باید نتیجه‌ی زیر را ببینید:

```text
HTTP/2 200
```

و برای health:

```json
{"status":"ok","service":"nginx"}
```

## اگر خطای 502 دیدید

```bash
sudo systemctl status rastinax-ai --no-pager
sudo systemctl status rastinax-backend --no-pager
sudo systemctl status rastinax-client --no-pager
sudo tail -n 100 /var/log/nginx/error.log
```

تست مستقیم سرویس‌ها:

```bash
curl http://127.0.0.1:8000/health
curl -I http://127.0.0.1:8001/api/docs/
curl -I http://127.0.0.1:3000/
```

## اگر Certbot خطای challenge داد

اول این موارد را بررسی کنید:

```bash
getent ahostsv4 ai.rastinax.com
sudo ss -ltnp | grep -E ':80|:443'
sudo nginx -t
sudo ufw status
```

تا زمانی که `ai.rastinax.com` به `195.177.255.98` resolve نشود و پورت ۸۰ از اینترنت قابل‌دسترسی نباشد، صدور SSL انجام نمی‌شود.
