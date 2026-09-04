'use client';

import { useUI } from '~/context/UIContext';
import { getTranslations } from '~/lib/i18n';
import { cn } from '~/lib/utils';
import type { ToolType } from '~/types/chat';

const toolIcons: Record<ToolType, string> = {
  image: 'fa-solid fa-wand-magic-sparkles',
  video: 'fa-solid fa-clapperboard',
  site: 'fa-solid fa-globe',
};

const toolAccents: Record<ToolType, string> = {
  image:
    'bg-violet-100 text-violet-700 dark:bg-violet-200 dark:text-violet-900',
  video: 'bg-rose-100 text-rose-700 dark:bg-rose-200 dark:text-rose-900',
  site: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-200 dark:text-cyan-900',
};

export function ToolIntro({ tool }: { tool: ToolType }) {
  const { lang } = useUI();
  const translations = getTranslations(lang);
  const content = translations.tools[tool];

  return (
    <div className="tool-intro-wrap flex min-h-full items-center justify-center px-4 py-10">
      <div className="tool-intro flex max-w-lg flex-col items-center text-center fade-in-up">
        <div className={cn('tool-intro-icon', toolAccents[tool])}>
          <i className={toolIcons[tool]} aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-[var(--tx-p)] sm:text-3xl">
          {content.title}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-7 text-[var(--tx-s)] sm:text-base">
          {content.description}
        </p>
        <div className="tool-intro-hint mt-7">
          <i className="fa-solid fa-sparkles" aria-hidden="true" />
          <span>{content.hint}</span>
        </div>
      </div>
    </div>
  );
}
