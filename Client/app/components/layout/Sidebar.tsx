'use client';

import { useMemo, useState } from 'react';
import { useChat } from '~/context/ChatContext';
import { useUI } from '~/context/UIContext';
import { getTranslations } from '~/lib/i18n';
import type { Lang } from '~/lib/i18n';
import { cn } from '~/lib/utils';

function formatConversationDate(value: string, lang: Lang) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR' : 'en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

const futureTools = [
  {
    key: 'imageGeneration',
    icon: 'fa-solid fa-image',
    iconClass:
      'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  },
  {
    key: 'videoGeneration',
    icon: 'fa-solid fa-film',
    iconClass:
      'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  },
  {
    key: 'siteGeneration',
    icon: 'fa-solid fa-globe',
    iconClass:
      'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  },
] as const;

export function Sidebar() {
  const {
    chats,
    activeChatId,
    visitorId,
    isLoadingConversations,
    isLoadingConversation,
    createNewChat,
    selectChat,
  } = useChat();
  const {
    lang,
    setLang,
    theme,
    setTheme,
    sidebarOpen,
    mobileSidebarOpen,
    closeMobileSidebar,
  } = useUI();
  const [search, setSearch] = useState('');
  const translations = getTranslations(lang);

  const filteredChats = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return chats;

    return chats.filter((chat) =>
      [chat.title, chat.last_message?.content]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase().includes(query)),
    );
  }, [chats, search]);

  const handleNewChat = () => {
    createNewChat();
    closeMobileSidebar();
  };

  const handleSelectChat = (id: string) => {
    closeMobileSidebar();
    void selectChat(id);
  };

  return (
    <>
      <button
        type="button"
        className={cn('sidebar-overlay', mobileSidebarOpen && 'active')}
        aria-label={lang === 'fa' ? 'بستن فهرست گفتگوها' : 'Close conversations'}
        onClick={closeMobileSidebar}
      />

      <aside
        className={cn(
          'sidebar',
          !sidebarOpen && 'collapsed',
          mobileSidebarOpen && 'mobile-open',
        )}
        aria-label={lang === 'fa' ? 'فهرست گفتگوها' : 'Conversation list'}
      >
        <div className="flex items-center justify-between border-b border-[var(--bc)] px-3 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              R
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-[var(--tx-p)]">
                Rastinax
              </div>
              <div className="truncate text-[10px] text-[var(--tx-m)]">
                AI Marketing Agent
              </div>
            </div>
          </div>

          <button
            type="button"
            className="hdr-icon md:hidden"
            aria-label={translations.common.close}
            onClick={closeMobileSidebar}
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        <div className="px-3 pt-3">
          <button
            type="button"
            className="new-chat-btn flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold"
            onClick={handleNewChat}
          >
            <i className="fa-solid fa-plus text-xs" aria-hidden="true" />
            <span>{translations.sidebar.newChat}</span>
          </button>
        </div>

        <div className="px-3 pt-3">
          <label className="relative block">
            <i
              className="fa-solid fa-magnifying-glass absolute start-3 top-1/2 -translate-y-1/2 text-xs text-[var(--tx-m)]"
              aria-hidden="true"
            />
            <span className="sr-only">
              {translations.sidebar.searchPlaceholder}
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="search-input"
              placeholder={translations.sidebar.searchPlaceholder}
              type="search"
            />
          </label>
        </div>

        <div className="px-2 pt-3" aria-label={translations.sidebar.comingSoon}>
          {futureTools.map((tool) => (
            <button
              key={tool.key}
              type="button"
              className="tool-item cursor-not-allowed opacity-60"
              disabled
              aria-disabled="true"
              title={translations.sidebar.comingSoon}
            >
              <span className={cn('tool-icon', tool.iconClass)}>
                <i className={tool.icon} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 text-start">
                <span className="block truncate text-[13px] font-medium">
                  {translations.sidebar[tool.key]}
                </span>
                <span className="mt-0.5 block text-[10px] text-[var(--tx-m)]">
                  {translations.sidebar.comingSoon}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          {isLoadingConversations ? (
            <div className="space-y-2 px-2" aria-label="Loading">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-10 animate-pulse rounded-lg bg-[var(--bg-t)]"
                />
              ))}
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs leading-6 text-[var(--tx-m)]">
              {search.trim()
                ? translations.sidebar.noResults
                : translations.sidebar.noChats}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  className={cn(
                    'sidebar-item group flex items-start gap-2 px-2.5 py-2.5',
                    chat.id === activeChatId && 'active',
                  )}
                  onClick={() => handleSelectChat(chat.id)}
                  disabled={isLoadingConversation}
                >
                  <i
                    className="fa-regular fa-message mt-0.5 flex-shrink-0 text-xs opacity-70"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 text-start">
                    <span className="block truncate text-sm font-medium">
                      {chat.title || translations.sidebar.newChat}
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-[var(--tx-m)]">
                      <span className="truncate">
                        {chat.last_message?.content ||
                          translations.sidebar.noChats}
                      </span>
                      <span className="flex-shrink-0">
                        {formatConversationDate(chat.updated_at, lang)}
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[var(--bc)] p-3">
          <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-[var(--tx-m)]">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500" />
              <span className="truncate">
                {visitorId
                  ? `${lang === 'fa' ? 'مهمان' : 'Guest'} · ${visitorId.slice(0, 8)}`
                  : lang === 'fa'
                    ? 'مهمان جدید'
                    : 'New guest'}
              </span>
            </span>
            <span className="rounded-full bg-[var(--bg-t)] px-2 py-0.5">
              {lang === 'fa' ? 'ذخیره در سرور' : 'Server history'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--bc)] bg-[var(--bg-t)] px-2 py-2 text-xs text-[var(--tx-s)] transition hover:border-brand-500 hover:text-[var(--tx-p)]"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={
                theme === 'dark'
                  ? translations.sidebar.lightTheme
                  : translations.sidebar.darkTheme
              }
            >
              <i
                className={cn(
                  'fa-solid text-xs',
                  theme === 'dark' ? 'fa-sun' : 'fa-moon',
                )}
                aria-hidden="true"
              />
              <span>
                {theme === 'dark'
                  ? translations.sidebar.lightTheme
                  : translations.sidebar.darkTheme}
              </span>
            </button>

            <label className="flex items-center rounded-lg border border-[var(--bc)] bg-[var(--bg-t)] px-2 py-2">
              <span className="sr-only">{translations.common.language}</span>
              <select
                value={lang}
                onChange={(event) => setLang(event.target.value as Lang)}
                className="bg-transparent text-xs text-[var(--tx-s)] outline-none"
                aria-label={translations.common.language}
              >
                <option value="fa">{translations.sidebar.persian}</option>
                <option value="en">{translations.sidebar.english}</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            className="mt-2 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-[var(--bc)] bg-[var(--bg-t)] px-2 py-2 text-xs font-semibold text-[var(--tx-s)] opacity-60"
            disabled
            aria-disabled="true"
            title={translations.sidebar.comingSoon}
          >
            <i className="fa-solid fa-right-to-bracket text-xs" aria-hidden="true" />
            <span>{translations.sidebar.login}</span>
            <span className="text-[10px] font-normal text-[var(--tx-m)]">
              {translations.sidebar.comingSoon}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
