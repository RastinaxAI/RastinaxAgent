# Rastinax AI Agent

این پروژه یک چت‌بات بازاریابی و فروش برای راستیناکس است که از سه سرویس تشکیل
می‌شود:

```text
Client (React Router / Vite)
        │  REST API
        ▼
Server (Django + DRF) :8001 ───── PostgreSQL
        │
        │  user_input + chat_history
        ▼
AI (FastAPI + OpenRouter) :8000
```

فرانت‌اند فقط به Django متصل می‌شود. کلید OpenRouter، مدیریت Conversation،
ذخیره پیام‌ها و تاریخچه‌ی Agent هرگز در فرانت‌اند قرار نمی‌گیرند.

برای استقرار روی سرور ابری با IP `195.177.255.98`، [راهنمای استقرار ابری](DEPLOYMENT.md)
و [کانفیگ آماده‌ی Nginx](deploy/nginx/rastinax.conf) را ببینید.
بعد از قرار دادن سه فایل `.env`، اجرای `sudo bash deploy/ubuntu-install.sh`
نصب و راه‌اندازی را انجام می‌دهد.

## ساختار پروژه

```text
AI/                              سرویس FastAPI و اتصال OpenRouter
Server/                          بک‌اند Django، API و مدل‌های PostgreSQL
Client/                          رابط React Router
```

## پیش‌نیازها

- Python 3.11 یا بالاتر
- Node.js 20 یا بالاتر و npm
- PostgreSQL فعال
- کلید معتبر OpenRouter

## پیکربندی محیط

### ۱. سرویس هوش مصنوعی

فایل زیر را بسازید:

```text
AI/.env
```

محتوا:

```dotenv
OPENROUTER_API_KEY=کلید-واقعی-OpenRouter
OPENROUTER_MODEL=openai/gpt-4o-mini
# اختیاری:
# OPENROUTER_SITE_URL=http://localhost:5173
# OPENROUTER_SITE_NAME=Rastinax Marketing Agent
```

نمونه آماده در [AI/.env.example](AI/.env.example)
قرار دارد.

### ۲. بک‌اند Django

فایل زیر را بسازید:

```text
Server/.env
```

نمونه:

```dotenv
DEBUG=True
SECRET_KEY=یک-کلید-طولانی-و-تصادفی

DB_NAME=rastinax_agent_db
DB_USER=admin_ai
DB_PASSWORD=رمز-پایگاه-داده
DB_HOST=127.0.0.1
DB_PORT=5432

AI_AGENT_BASE_URL=http://127.0.0.1:8000
AI_AGENT_TIMEOUT=60

ALLOWED_HOSTS=127.0.0.1,localhost
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000
CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000
```

نمونه کامل در [Server/.env.example](Server/.env.example)
قرار دارد.

### ۳. فرانت‌اند

در مسیر `Client/.env` قرار دهید:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8001/api/v1
```

در محیط production فقط همین مقدار را به آدرس عمومی Django تغییر دهید. فرانت
هیچ‌وقت نباید مستقیماً به پورت `8000` وصل شود.

## نصب و اجرا

هر بخش را در یک ترمینال جدا اجرا کنید.

### ترمینال اول: AI Agent

```powershell
cd AI
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

بررسی سلامت:

```text
http://127.0.0.1:8000/health
```

### ترمینال دوم: Django Backend

```powershell
cd Server
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8001
```

Migration شماره `0002_seed_default_agent` به‌صورت خودکار Agent پیش‌فرض
`rastinax-marketing` را ایجاد می‌کند؛ بنابراین لازم نیست Agent را دستی در
دیتابیس بسازید.

### ترمینال سوم: Client

```powershell
cd Client
npm ci
npm run dev
```

سپس صفحه را در آدرس اعلام‌شده توسط Vite، معمولاً
`http://localhost:5173`، باز کنید.

## قرارداد API

| متد | مسیر | کاربرد |
| --- | --- | --- |
| `POST` | `/api/v1/chat/` | ایجاد یا ادامه‌ی Conversation |
| `GET` | `/api/v1/conversations/?visitor_id=...` | فهرست گفتگوهای مهمان |
| `GET` | `/api/v1/conversations/{conversation_id}/?visitor_id=...` | تاریخچه کامل یک گفتگو |
| `GET` | `/api/schema/` | OpenAPI Schema |
| `GET` | `/api/docs/` | Swagger UI |
| `GET` | `/api/redoc/` | ReDoc |

### شروع گفتگو

```json
{
  "message": "برای کسب‌وکار من یک ایده بازاریابی پیشنهاد بده"
}
```

در پاسخ، `visitor_id` و `conversation_id` برمی‌گردند. فرانت آن‌ها را در
`localStorage` ذخیره می‌کند.

### ادامه گفتگو

```json
{
  "message": "برای این ایده یک تقویم محتوایی هم بساز",
  "visitor_id": "VISITOR_UUID",
  "conversation_id": "CONVERSATION_UUID"
}
```

فرانت‌اند `chat_history` را ارسال نمی‌کند. Django تاریخچه را از
`Conversation.provider_history` می‌خواند و آن را به AI Agent منتقل می‌کند.

## رفتار رابط کاربری

- با اولین پیام، در صورت نبود شناسه، Visitor و Conversation جدید ساخته می‌شود.
- Sidebar با `GET /conversations/` از PostgreSQL تغذیه می‌شود.
- کلیک روی یک گفتگو، تاریخچه کامل را از Backend می‌گیرد.
- `New Chat` فقط `conversation_id` فعال و پیام‌های صفحه را reset می‌کند؛
  `visitor_id` باقی می‌ماند.
- هنگام ارسال، وضعیت Thinking نمایش داده می‌شود و پیام‌ها به‌صورت خودکار به
  انتهای صفحه scroll می‌شوند.
- پیام‌ها در `localStorage` ذخیره نمی‌شوند؛ منبع اصلی تاریخچه PostgreSQL است.
- در موبایل Sidebar به Drawer تبدیل می‌شود و در دسکتاپ کنار چت قرار می‌گیرد.

## مدیریت خطا

| کد | رفتار فرانت |
| --- | --- |
| `400` | نمایش خطای عمومی درخواست |
| `403` | پاک‌کردن گفتگوی فعال و بازگشت به حالت جدید |
| `404` | حذف شناسه گفتگوی منقضی و تازه‌سازی Sidebar |
| `502` یا `503` | نمایش عدم دسترسی موقت سرویس AI |
| خطای شبکه | راهنمای بررسی Django و Base URL |

Stack trace و متن خطای داخلی سرویس به کاربر نهایی نمایش داده نمی‌شود.

## تست و اعتبارسنجی

فرمان‌های زیر برای نسخه فعلی اجرا شده‌اند:

```powershell
cd Client
npm run typecheck
npm run build

cd ..\Server\RastinaxAgent-BackEnd
python manage.py check
python -m py_compile agents\services\agent_client.py agents\services\chat_service.py agents\views.py config\settings.py

cd ..\..\AI\marketing-ai-agent
python -m py_compile app\main.py app\agent\agent.py app\agent\agent_service.py app\agent\llm.py app\agent\tools.py
```

همه بررسی‌های فوق با موفقیت انجام شده‌اند. برای تست کامل پیام واقعی، سه سرویس،
PostgreSQL و کلید OpenRouter باید فعال باشند.

## امنیت و محدودیت‌های نسخه فعلی

- `OPENROUTER_API_KEY` فقط در AI Agent نگهداری می‌شود و نباید وارد Client شود.
- شناسه مهمان در `localStorage` است؛ برای production نهایی بهتر است Signed
  Cookie یا JWT اضافه شود.
- حذف یا تغییر عنوان Conversation، احراز هویت واقعی، streaming، upload فایل و
  pagination در قرارداد فعلی پیاده‌سازی نشده‌اند.
- بعد از تغییر دامنه یا پورت فرانت، مقدار `CORS_ALLOWED_ORIGINS` را در Django
  به‌روزرسانی کنید.

## عیب‌یابی سریع

### `Could not connect to the backend`

بررسی کنید Django روی `127.0.0.1:8001` اجرا باشد و
`Client/.env` مقدار زیر را داشته باشد:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8001/api/v1
```

### `No active agent is configured`

این فرمان را اجرا کنید:

```powershell
cd Server
python manage.py migrate
```

### `AI Agent is not configured`

وجود `OPENROUTER_API_KEY` در
`AI/.env` و اجرای سرویس روی پورت `8000` را بررسی کنید.

### خطای CORS

Origin فرانت را دقیقاً، همراه با protocol، در
`CORS_ALLOWED_ORIGINS` اضافه کنید؛ برای مثال:

```text
http://localhost:5173
http://127.0.0.1:5173
```

### `password authentication failed for user`

PostgreSQL در حال اجراست، اما مقدار `DB_PASSWORD` یا سایر مشخصات اتصال در
`Server/.env` با role دیتابیس یکی نیست. مقدار واقعی
`DB_NAME`، `DB_USER`، `DB_PASSWORD`، `DB_HOST` و `DB_PORT` را وارد کنید و سپس
دوباره اجرا کنید:

```powershell
python manage.py migrate
```
