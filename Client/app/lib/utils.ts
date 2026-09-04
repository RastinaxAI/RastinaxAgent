import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * یک تابع کاربردی برای ترکیب داینامیک کلاس‌های تیلویند
 * و جلوگیری از تداخل (Conflict) کلاس‌ها
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * تابع فرمت‌کننده اعداد به صورت سه رقم سه رقم (برای قیمت‌ها)
 */
export function formatPrice(price: number, lang: 'fa' | 'en' = 'fa') {
    const formatted = new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US').format(price);
    return lang === 'fa' ? `${formatted} تومان` : `$${formatted}`;
}