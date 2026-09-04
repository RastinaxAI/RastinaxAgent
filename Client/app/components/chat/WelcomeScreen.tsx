'use client';

import { useChat } from '~/context/ChatContext';
import { useUI } from '~/context/UIContext';
import { getTranslations } from '~/lib/i18n';
import { LOGO_URL } from '~/lib/constants';

export function WelcomeScreen() {
  const { lang } = useUI();
  const { sendMessage } = useChat();
  const translations = getTranslations(lang);

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-8">
      <img
        src={LOGO_URL}
        alt="NexChat"
        className="logo-img-lg mb-6 shadow-lg shadow-brand-600/10"
      />
      <h1 className="mb-2 text-center text-2xl font-bold text-[var(--tx-p)] sm:text-3xl">
        {translations.welcome.title}
      </h1>
      <p className="mb-8 text-center text-sm text-[var(--tx-m)]">
        {translations.welcome.subtitle}
      </p>

      <div className="welcome-grid w-full max-w-xl">
        {translations.suggestions.map((suggestion) => (
          <button
            key={suggestion.text}
            type="button"
            className="suggestion-card text-start"
            onClick={() => void sendMessage(suggestion.text)}
          >
            <div className="mb-1 text-xs font-medium text-brand-600 dark:text-brand-400">
              {suggestion.label}
            </div>
            <div className="text-sm text-[var(--tx-p)]">
              {suggestion.text}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
