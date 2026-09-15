from pathlib import Path

import environ


# ---------------------------------------------------------
# Base directory
# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent


# ---------------------------------------------------------
# Environment variables
# ---------------------------------------------------------

env = environ.Env(
    DEBUG=(bool, False),
)

environ.Env.read_env(
    BASE_DIR / ".env"
)


# ---------------------------------------------------------
# Security
# ---------------------------------------------------------

SECRET_KEY = env(
    "SECRET_KEY"
)

DEBUG = env.bool(
    "DEBUG",
    default=False,
)


ALLOWED_HOSTS = env.list(
    "ALLOWED_HOSTS",
    default=[
        "127.0.0.1",
        "localhost",
        "ai.rastinax.com",
        "195.177.255.98",
    ],
)


# ---------------------------------------------------------
# Applications
# ---------------------------------------------------------

INSTALLED_APPS = [
    # Django
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third party
    "rest_framework",
    "corsheaders",
    "drf_spectacular",

    # Local apps
    "accounts",
    "agents",
]


# ---------------------------------------------------------
# Middleware
# ---------------------------------------------------------

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",

    "django.contrib.sessions.middleware.SessionMiddleware",

    # CORS
    "corsheaders.middleware.CorsMiddleware",

    "django.middleware.common.CommonMiddleware",

    "django.middleware.csrf.CsrfViewMiddleware",

    "django.contrib.auth.middleware.AuthenticationMiddleware",

    "django.contrib.messages.middleware.MessageMiddleware",

    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# ---------------------------------------------------------
# URL / WSGI
# ---------------------------------------------------------

ROOT_URLCONF = "config.urls"

WSGI_APPLICATION = "config.wsgi.application"


# ---------------------------------------------------------
# Templates
# ---------------------------------------------------------

TEMPLATES = [
    {
        "BACKEND": (
            "django.template.backends.django."
            "DjangoTemplates"
        ),
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                (
                    "django.template.context_processors."
                    "request"
                ),
                (
                    "django.contrib.auth."
                    "context_processors.auth"
                ),
                (
                    "django.contrib.messages."
                    "context_processors.messages"
                ),
            ],
        },
    },
]


# ---------------------------------------------------------
# Database - PostgreSQL
# ---------------------------------------------------------

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",

        "NAME": env(
            "DB_NAME"
        ),

        "USER": env(
            "DB_USER"
        ),

        "PASSWORD": env(
            "DB_PASSWORD"
        ),

        "HOST": env(
            "DB_HOST",
            default="127.0.0.1",
        ),

        "PORT": env(
            "DB_PORT",
            default="5432",
        ),
    }
}


# ---------------------------------------------------------
# Custom User Model
# ---------------------------------------------------------

AUTH_USER_MODEL = "accounts.User"


# ---------------------------------------------------------
# Password validation
# ---------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "UserAttributeSimilarityValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "MinimumLengthValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "CommonPasswordValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "NumericPasswordValidator"
        ),
    },
]


# ---------------------------------------------------------
# Internationalization
# ---------------------------------------------------------

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# ---------------------------------------------------------
# Static files
# ---------------------------------------------------------

STATIC_URL = "static/"

STATIC_ROOT = BASE_DIR / "staticfiles"


# ---------------------------------------------------------
# Default primary key
# ---------------------------------------------------------

DEFAULT_AUTO_FIELD = (
    "django.db.models.BigAutoField"
)


# ---------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": (
        "drf_spectacular.openapi.AutoSchema"
    ),
}


# ---------------------------------------------------------
# Swagger / OpenAPI
# ---------------------------------------------------------

SPECTACULAR_SETTINGS = {
    "TITLE": "Rastinax AI Agent API",

    "DESCRIPTION": (
        "Backend API for Rastinax "
        "intelligent website assistant"
    ),

    "VERSION": "1.0.0",

    "SERVE_INCLUDE_SCHEMA": False,
}


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=[
        # React / Next.js
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://ai.rastinax.com",

        # Vite
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://ai.rastinax.com",
    ],
)


# Requests behind nginx arrive with an https Origin
# while Django itself sees http; trusting the origins
# below keeps CSRF checks passing for POSTs (admin).

CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=[
        "https://ai.rastinax.com",
        "http://ai.rastinax.com",
        "http://195.177.255.98",
    ],
)


# Frontend must be able to read these headers
# from the streaming chat response.

CORS_EXPOSE_HEADERS = [
    "X-Conversation-ID",
    "X-Visitor-ID",
    "X-User-Message-ID",
]


# ---------------------------------------------------------
# AI Agent
# ---------------------------------------------------------

AI_AGENT_BASE_URL = env(
    "AI_AGENT_BASE_URL",
    default="http://127.0.0.1:8000",
)


AI_AGENT_TIMEOUT = env.int(
    "AI_AGENT_TIMEOUT",
    default=60,
)