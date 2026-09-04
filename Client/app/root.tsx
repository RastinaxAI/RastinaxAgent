import React from "react";
import {
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
    isRouteErrorResponse,
    useRouteError,
} from "react-router";

import "./app.css";

import { AppProviders } from "./components/AppProviders";
import { Toast } from "./components/ui/Toast";
import { useUI } from "./context/UIContext";

// ایمپورت کامپوننت‌های سراسری (مودال‌ها)
import { AuthModal } from "./components/modals/AuthModal";
import { PlansModal } from "./components/modals/PlansModal";
import { ProfileModal } from "./components/modals/ProfileModal";
import { UpsellModal } from "./components/modals/UpsellModal";

export const links = () => [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Space+Grotesk:wght@300;400;500;600;700&family=Vazirmatn:wght@300;400;500;600;700;800&display=swap",
    },
    { rel: "icon", href: "/favicon.ico" },
];

export const meta = () => [
    { charset: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { title: "NexChat AI | دستیار هوشمند و خلاق شما" },
    { name: "description", content: "NexChat پلتفرمی هوشمند و امن برای چت، تولید محتوا، و حل مسائل پیچیده با استفاده از قدرت هوش مصنوعی است." },
];

/**
 * کامپوننت اصلی App
 */
export default function App() {
    return (
        <AppProviders>
            <AppContent />
        </AppProviders>
    );
}

/**
 * کامپوننت داخلی AppContent
 */
function AppContent() {
    const { lang, theme } = useUI();

    return (
        <html lang={lang} dir={lang === 'fa' ? 'rtl' : 'ltr'} className={`${theme} overflow-hidden h-full`}>
        <head>
            <Meta />
            <Links />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
        </head>
        <body className="antialiased overflow-hidden h-full">
        <Outlet />

        {/* قرار دادن تمام مودال‌ها در بالاترین سطح بدنه صفحه */}
        <AuthModal />
        <PlansModal />
        <ProfileModal />
        <UpsellModal />
        <Toast />

        <ScrollRestoration />
        <Scripts />
        </body>
        </html>
    );
}

/**
 * کامپوننت ErrorBoundary برای مدیریت خطاهای سراسری
 */
export function ErrorBoundary() {
    const error = useRouteError();
    const fallbackLang = 'fa'; // مقدار ایمن و ثابت خارج از کانتکست

    return (
        <html lang={fallbackLang} dir="rtl" className="light overflow-hidden h-full">
        <head>
            <title>خطایی رخ داد! | NexChat</title>
            <Meta />
            <Links />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
        </head>
        <body className="antialiased h-screen flex flex-col items-center justify-center gap-6 p-6 bg-[var(--bg-p)] text-[var(--tx-p)] font-fa">
        <i className="fa-solid fa-circle-exclamation text-8xl text-rose-500 opacity-80"></i>

        {isRouteErrorResponse(error) ? (
            <>
                <h1 className="text-6xl font-extrabold text-brand-600">
                    {error.status}
                </h1>
                <p className="text-xl text-[var(--tx-s)]">
                    {error.status === 404
                        ? "متأسفانه صفحه مورد نظر شما پیدا نشد."
                        : error.statusText}
                </p>
            </>
        ) : error instanceof Error ? (
            <>
                <h1 className="text-2xl font-bold text-red-600">خطای غیرمنتظره رخ داد!</h1>
                <pre className="bg-red-50 p-4 rounded-xl text-sm overflow-auto max-w-full font-en shadow-inner text-left" dir="ltr">
              {error.message}
            </pre>
            </>
        ) : (
            <h1 className="text-2xl font-bold text-[var(--tx-p)]">خطای ناشناخته!</h1>
        )}

        <a href="/" className="mt-6 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-500 px-6 py-3 text-white transition hover:from-brand-700 hover:to-cyan-600">
            بازگشت به صفحه اصلی
        </a>
        <Scripts />
        </body>
        </html>
    );
}
