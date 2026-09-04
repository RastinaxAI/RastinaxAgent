import type { Config } from 'tailwindcss';

export default {
    // مشخص کردن فایل‌هایی که تیلویند باید کلاس‌های آن‌ها را پردازش کند
    content: [
        './app/**/*.{js,jsx,ts,tsx}',
        './index.html',
    ],
    // فعال‌سازی دارک مود بر اساس کلاس 'dark' در تگ html
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                fa: ['B Yekan', 'Vazirmatn', 'sans-serif'],
                en: ['B Yekan', 'Space Grotesk', 'sans-serif'],
            },
            colors: {
                brand: {
                    50: '#f3f4ff',
                    100: '#e7e8ff',
                    200: '#d2d4ff',
                    300: '#afb4ff',
                    400: '#818cf8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                    950: '#1e1b4b',
                },
            },
        },
    },
    plugins: [
        // پلاگین‌های احتمالی مانند typography را می‌توانید اینجا اضافه کنید
    ],
} satisfies Config;
