# راه‌اندازی ساده روی Ubuntu

این راهنما برای همین پروژه و همین سرور نوشته شده است:

```text
IP:       195.177.255.98
Database: rastinax_agent_db
DB user:  admin_ai
```

در پایان، فقط پورت ۸۰ عمومی است:

```text
Browser → Nginx :80
             ├── Client :3000
             └── Django :8001 → AI :8000 → OpenRouter
                              └→ PostgreSQL :5432
```

پورت‌های `3000`، `8000`، `8001` و `5432` را در فایروال باز نکنید.

## مرحله ۱: آپلود پروژه

با WinSCP یا هر روش دیگری، کل پوشه‌ی پروژه را در این مسیر سرور قرار دهید:

```text
/var/www/rastinax-agent
```

بعد از ورود به سرور این دستور باید فایل پروژه را نشان دهد:

```bash
cd /var/www/rastinax-agent
ls deploy/ubuntu-install.sh
```

اگر فایل پیدا نشد، پروژه داخل یک پوشه‌ی اضافه استخراج شده است؛ باید محتویات
پوشه‌ی داخلی را به `/var/www/rastinax-agent` منتقل کنید.

## مرحله ۲: ورود به Ubuntu و نصب پیش‌نیازها

```bash
ssh root@195.177.255.98
cd /var/www/rastinax-agent
```

اگر با کاربر دیگری وارد می‌شوید، بعد از ورود این دستور را اجرا کنید تا ادامه‌ی
مراحل را با دسترسی root انجام دهید:

```bash
sudo -i
cd /var/www/rastinax-agent
```

## مرحله ۳: ساخت فایل‌های تنظیمات

از ریشه‌ی پروژه اجرا کنید:

```bash
cd /var/www/rastinax-agent
cp deploy/env/server.production.example Server/.env
cp deploy/env/ai.production.example AI/.env
cp deploy/env/client.production.example Client/.env
```

### تنظیم Django و دیتابیس

```bash
nano Server/.env
```

محتوای مهم این فایل باید دقیقاً این باشد. فقط دو مقدار مشخص‌شده را با مقدار
واقعی خودتان عوض کنید:

```dotenv
DEBUG=False
SECRET_KEY=یک-کلید-تصادفی-طولانی

DB_NAME=rastinax_agent_db
DB_USER=admin_ai
DB_PASSWORD=رمز-واقعی-admin_ai
DB_HOST=127.0.0.1
DB_PORT=5432

AI_AGENT_BASE_URL=http://127.0.0.1:8000
AI_AGENT_TIMEOUT=180

ALLOWED_HOSTS=195.177.255.98,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://195.177.255.98
CSRF_TRUSTED_ORIGINS=http://195.177.255.98
```

برای ساخت `SECRET_KEY` می‌توانید این دستور را بزنید و خروجی آن را در فایل
قرار دهید:

```bash
openssl rand -hex 32
```

رمز دیتابیس همان رمزی است که برای کاربر PostgreSQL با نام `admin_ai` ساخته‌اید.

### تنظیم کلید OpenRouter

```bash
nano AI/.env
```

محتوا:

```dotenv
OPENROUTER_API_KEY=کلید-واقعی-OpenRouter
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_SITE_URL=http://195.177.255.98
OPENROUTER_SITE_NAME=Rastinax Marketing Agent
```

### تنظیم Client

```bash
cat Client/.env
```

باید فقط این مقدار را داشته باشد:

```dotenv
VITE_API_BASE_URL=/api/v1
```

## مرحله ۴: اجرای نصب خودکار

این اسکریپت همه‌ی کارهای اصلی را انجام می‌دهد: نصب Python و Node، نصب پکیج‌ها،
اتصال به دیتابیس، migration، build فرانت، ساخت سرویس‌ها و تنظیم Nginx.

```bash
cd /var/www/rastinax-agent
sudo bash deploy/ubuntu-install.sh
```

اسکریپت ممکن است چند دقیقه زمان ببرد. تا پایان آن را متوقف نکنید.

اگر در مرحله‌ی migration خطای password دیدید، مقدار `DB_PASSWORD` در
`Server/.env` اشتباه است. آن را اصلاح کنید و اسکریپت را دوباره اجرا کنید.

اگر رمز فعلی را نمی‌دانید، روی همان سرور Ubuntu این دستور را اجرا کنید. اسکریپت
رمز role را عوض می‌کند، همان رمز را در `Server/.env` می‌نویسد و migration را
دوباره اجرا می‌کند:

```bash
cd /var/www/rastinax-agent
sudo bash deploy/fix-database-auth.sh
```

برای رمز جدید فقط حروف انگلیسی، عدد، نقطه، خط تیره یا زیرخط استفاده کنید.
اگر هنگام سؤال رمز، فقط Enter بزنید، یک رمز امن به‌صورت خودکار تولید می‌شود؛
آن را در محل امن ذخیره کنید.

## مرحله ۵: تست نهایی

پس از پایان موفق اسکریپت، این آدرس‌ها را در مرورگر باز کنید:

```text
سایت:
http://195.177.255.98/

Swagger:
http://195.177.255.98/api/docs/

بررسی Nginx:
http://195.177.255.98/nginx-health
```

برای بررسی سرویس‌ها روی خود سرور:

```bash
systemctl status rastinax-ai --no-pager
systemctl status rastinax-backend --no-pager
systemctl status rastinax-client --no-pager
systemctl status nginx --no-pager
```

تست مستقیم داخلی:

```bash
curl http://127.0.0.1:8000/health
curl -I http://127.0.0.1:8001/api/docs/
curl -I http://127.0.0.1:3000/
curl http://127.0.0.1/nginx-health
```

خروجی سلامت AI باید شبیه این باشد:

```json
{"status":"ok"}
```

## اگر خطا دیدید

### خطای `502 Bad Gateway`

یعنی یکی از سرویس‌های داخلی بالا نیست:

```bash
systemctl restart rastinax-ai
systemctl restart rastinax-backend
systemctl restart rastinax-client

systemctl status rastinax-ai --no-pager
systemctl status rastinax-backend --no-pager
systemctl status rastinax-client --no-pager
```

برای دیدن دلیل خطا:

```bash
journalctl -u rastinax-ai -n 80 --no-pager
journalctl -u rastinax-backend -n 80 --no-pager
journalctl -u rastinax-client -n 80 --no-pager
tail -n 80 /var/log/nginx/error.log
```

### خطای اتصال PostgreSQL یا `password authentication failed`

فقط این فایل را باز کنید و رمز واقعی همان کاربر را وارد کنید:

```bash
nano /var/www/rastinax-agent/Server/.env
```

مقادیر باید این‌ها باشند:

```dotenv
DB_NAME=rastinax_agent_db
DB_USER=admin_ai
DB_PASSWORD=رمز-واقعی-admin_ai
DB_HOST=127.0.0.1
DB_PORT=5432
```

راه سریع اصلاح همین خطا:

```bash
cd /var/www/rastinax-agent
sudo bash deploy/fix-database-auth.sh
```

اگر PostgreSQL روی سرور دیگری است، فقط `DB_HOST` را به IP یا hostname همان
سرور تغییر دهید.

بعد دوباره اجرا کنید:

```bash
cd /var/www/rastinax-agent
sudo bash deploy/ubuntu-install.sh
```

### خطای AI

کلید را بررسی کنید:

```bash
nano /var/www/rastinax-agent/AI/.env
systemctl restart rastinax-ai
curl http://127.0.0.1:8000/health
```

### سایت باز نمی‌شود

در پنل شرکت ارائه‌دهنده‌ی سرور نیز باید پورت `80/TCP` باز باشد. روی Ubuntu:

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw --force enable
```

### انتشار نسخه‌ی جدید

بعد از جایگزین‌کردن فایل‌های پروژه با نسخه‌ی جدید، همین دستور را دوباره اجرا
کنید؛ migrationهای انجام‌شده دوباره خراب نمی‌شوند:

```bash
cd /var/www/rastinax-agent
sudo bash deploy/ubuntu-install.sh
```

## نکته‌ی مهم امنیتی

فایل‌های `Server/.env` و `AI/.env` شامل رمز دیتابیس و کلید OpenRouter هستند.
آن‌ها را در Git، Client یا Nginx قرار ندهید و پورت‌های داخلی سرویس‌ها را عمومی
نکنید.
