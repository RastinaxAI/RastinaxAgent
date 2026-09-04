import { Link } from 'react-router';
import { useUI } from '~/context/UIContext';
import { getTranslations } from '~/lib/i18n';
import type { Lang } from '~/lib/i18n';
import { LOGO_URL } from '~/lib/constants';

export default function HomePage() {
  const { lang, setLang } = useUI();
  const translations = getTranslations(lang);
  const copy =
    lang === 'fa'
      ? {
          eyebrow: 'دستیار هوشمند نسل جدید',
          title: 'فکر کنید، بسازید، سریع‌تر جلو بروید.',
          description:
            'NexChat برای گفت‌وگو، ایده‌پردازی، تولید محتوا و حل مسئله‌های پیچیده طراحی شده است.',
          cta: 'شروع چت',
          secondary: 'امکانات',
          features: [
            ['fa-solid fa-sparkles', 'پاسخ‌های کاربردی', 'برای کارهای روزمره و پروژه‌های جدی.'],
            ['fa-solid fa-image', 'ابزارهای خلاقانه', 'ایده‌هایتان را به تصویر و محتوا تبدیل کنید.'],
            ['fa-solid fa-shield-halved', 'فضای امن و شخصی', 'تاریخچه گفتگوها در مرورگر شما نگهداری می‌شود.'],
          ],
        }
      : {
          eyebrow: 'A smarter creative workspace',
          title: 'Think, create, and move faster.',
          description:
            'NexChat helps you chat, brainstorm, write, and solve complex problems with confidence.',
          cta: 'Start chatting',
          secondary: 'Explore features',
          features: [
            ['fa-solid fa-sparkles', 'Useful answers', 'For everyday tasks and ambitious projects.'],
            ['fa-solid fa-image', 'Creative tools', 'Turn ideas into visuals and compelling content.'],
            ['fa-solid fa-shield-halved', 'Private by default', 'Your chat history stays in your browser.'],
          ],
        };

  return (
    <main className="h-screen overflow-y-auto bg-[var(--bg-p)]">
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={LOGO_URL} alt="NexChat" className="logo-img" />
            <span className="text-lg font-bold tracking-tight">NexChat</span>
            <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
              AI
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label className="home-language-control" dir="ltr">
              <i className="fa-solid fa-language" aria-hidden="true" />
              <span className="sr-only">{translations.common.language}</span>
              <select
                value={lang}
                aria-label={translations.common.language}
                onChange={(event) => setLang(event.target.value as Lang)}
              >
                <option value="fa">{translations.sidebar.persian}</option>
                <option value="en">{translations.sidebar.english}</option>
              </select>
              <i
                className="fa-solid fa-chevron-down home-language-chevron"
                aria-hidden="true"
              />
            </label>
            <span
              className="cursor-not-allowed rounded-xl border border-[var(--bc)] bg-[var(--bg-c)] px-4 py-2 text-sm font-semibold text-[var(--tx-p)] opacity-60"
              aria-disabled="true"
              title={translations.sidebar.comingSoon}
            >
              {translations.sidebar.login}
              <span className="ms-1 text-[10px] font-normal text-[var(--tx-m)]">
                ({translations.sidebar.comingSoon})
              </span>
            </span>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-300">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              {copy.eyebrow}
            </div>
            <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight text-[var(--tx-p)] sm:text-6xl">
              {copy.title}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-[var(--tx-s)] sm:text-lg">
              {copy.description}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/chat"
                className="rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:from-brand-700 hover:via-brand-600 hover:to-cyan-600"
              >
                {copy.cta}
                <i className="fa-solid fa-arrow-up ms-2 -rotate-45 text-xs" />
              </Link>
              <a
                href="#features"
                className="rounded-xl border border-[var(--bc)] bg-[var(--bg-c)] px-5 py-3 text-sm font-semibold text-[var(--tx-p)] transition hover:border-brand-500"
              >
                {copy.secondary}
              </a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-8 rounded-[40px] bg-brand-400/10 blur-3xl" />
            <div className="relative rounded-[28px] border border-[var(--bc)] bg-[var(--bg-c)] p-4 shadow-2xl shadow-black/10">
              <div className="flex items-center gap-3 border-b border-[var(--bc)] px-2 pb-4">
                <img src={LOGO_URL} alt="" className="logo-img-sm" />
                <div>
                  <div className="text-sm font-semibold">NexChat</div>
                  <div className="text-[11px] text-[var(--tx-m)]">
                    {translations.chat.modelName}
                  </div>
                </div>
                <span className="ms-auto h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <div className="space-y-4 px-2 py-5 text-sm">
                <div className="ms-auto max-w-[78%] rounded-2xl rounded-tr-sm bg-brand-700 px-4 py-3 text-white">
                  {lang === 'fa'
                    ? 'برای شروع یک ایده دارم...'
                    : 'I have an idea to explore...'}
                </div>
                <div className="flex items-start gap-2">
                  <img src={LOGO_URL} alt="" className="logo-img-sm" />
                  <div className="max-w-[82%] rounded-2xl rounded-tl-sm bg-[var(--bg-s)] px-4 py-3 leading-7 text-[var(--tx-p)]">
                    {lang === 'fa'
                      ? 'عالیه. از همین‌جا شروع کنیم و آن را به یک برنامه روشن تبدیل کنیم.'
                      : 'Great. Let’s turn it into a clear plan together.'}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--bc)] bg-[var(--bg-in)] px-3 py-3 text-xs text-[var(--tx-m)]">
                {translations.chat.placeholder}
                <span className="float-end flex h-6 w-6 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <i className="fa-solid fa-arrow-up" />
                </span>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="grid gap-3 pb-8 sm:grid-cols-3">
          {copy.features.map(([icon, title, description], index) => (
            <div
              key={title}
              className="rounded-2xl border border-[var(--bc)] bg-[var(--bg-c)] p-5"
            >
              <i
                className={`${icon} mb-4 text-lg ${
                  index === 0
                    ? 'text-violet-500'
                    : index === 1
                      ? 'text-cyan-500'
                      : 'text-emerald-500'
                }`}
              />
              <h2 className="mb-1 text-sm font-bold text-[var(--tx-p)]">{title}</h2>
              <p className="text-xs leading-6 text-[var(--tx-s)]">{description}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
