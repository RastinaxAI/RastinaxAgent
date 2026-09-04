// تعریف انواع پلن‌های موجود در پلتفرم
export type PlanType = 'free' | 'pro' | 'enterprise';

// ساختار اطلاعات کاربر
export interface UserProfile {
    id: string;
    phone: string;
    plan: PlanType;
    joinDate: number;
    credits: {
        messagesLimit: number | 'unlimited';
        imagesLimit: number | 'unlimited';
        videosLimit: number | 'unlimited';
        usedMessages: number;
        usedImages: number;
    };
}