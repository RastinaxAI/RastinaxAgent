'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '~/context/AuthContext';
import { useChat } from '~/context/ChatContext';
import { useModal } from '~/context/ModalContext';
import { useUI } from '~/context/UIContext';
import { getTranslations } from '~/lib/i18n';
import type { Lang } from '~/lib/i18n';
import type { ConversationSummary } from '~/types/chat';
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

function LegacySidebar() {
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

type HistoryGroupKey = 'today' | 'yesterday' | 'previous';

function isSameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function getHistoryGroup(value: string): HistoryGroupKey {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'previous';

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(date, today)) return 'today';
  if (isSameDay(date, yesterday)) return 'yesterday';
  return 'previous';
}

function groupChats(chats: ConversationSummary[]) {
  const groups: Record<HistoryGroupKey, ConversationSummary[]> = {
    today: [],
    yesterday: [],
    previous: [],
  };

  chats.forEach((chat) => {
    groups[getHistoryGroup(chat.created_at)].push(chat);
  });

  return groups;
}

export function Sidebar() {
  const {
    chats,
    activeChatId,
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
    toggleSidebar,
    closeMobileSidebar,
  } = useUI();
  const { isLoggedIn, userPhone, plan, logout } = useAuth();
  const { openModal } = useModal();
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const translations = getTranslations(lang);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const filteredChats = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return chats;

    return chats.filter((chat) =>
      [chat.title, chat.last_message?.content]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase().includes(query)),
    );
  }, [chats, search]);

  const groupedChats = useMemo(
    () => groupChats(filteredChats),
    [filteredChats],
  );

  const handleNewChat = () => {
    createNewChat();
    closeMobileSidebar();
  };

  const handleSelectChat = (id: string) => {
    closeMobileSidebar();
    void selectChat(id);
  };

  const handleSidebarClose = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      closeMobileSidebar();
      return;
    }
    toggleSidebar();
  };

  const renderChatItem = (chat: ConversationSummary) => (
    <button
      key={chat.id}
      type="button"
      className={cn(
        'sidebar-item group mb-0.5 flex w-[calc(100%-8px)] items-center gap-2 px-3 py-2.5 text-start',
        chat.id === activeChatId && 'active',
      )}
      onClick={() => handleSelectChat(chat.id)}
      disabled={isLoadingConversation}
    >
      <i
        className="fa-regular fa-message flex-shrink-0 text-xs text-[var(--tx-m)]"
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 truncate text-sm">
        {chat.title || translations.sidebar.newChat}
      </span>
    </button>
  );

  const renderGroup = (key: HistoryGroupKey) => {
    const items = groupedChats[key];
    if (items.length === 0) return null;

    return (
      <section key={key} aria-label={translations.sidebar[key]}>
        <div className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-[var(--tx-m)]">
          {translations.sidebar[key]}
        </div>
        {items.map(renderChatItem)}
      </section>
    );
  };

  const renderPreferences = () => (
    <>
      <button
        type="button"
        className="sidebar-item flex w-full items-center justify-between px-3 py-2.5"
        onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
        aria-pressed={lang === 'fa'}
      >
        <span className="flex items-center gap-3">
          <i
            className="fa-solid fa-language w-5 text-center text-sm text-[var(--tx-m)]"
            aria-hidden="true"
          />
          <span className="text-sm">{translations.common.language}</span>
        </span>
        <span
          className={cn('toggle-track', lang === 'fa' && 'active')}
          aria-hidden="true"
        >
          <span className="toggle-thumb" />
        </span>
      </button>

      <button
        type="button"
        className="sidebar-item flex w-full items-center justify-between px-3 py-2.5"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-pressed={theme === 'dark'}
      >
        <span className="flex items-center gap-3">
          <i
            className={cn(
              'fa-solid w-5 text-center text-sm text-[var(--tx-m)]',
              theme === 'dark' ? 'fa-sun' : 'fa-moon',
            )}
            aria-hidden="true"
          />
          <span className="text-sm">
            {theme === 'dark'
              ? translations.sidebar.lightTheme
              : translations.sidebar.darkTheme}
          </span>
        </span>
        <span
          className={cn('toggle-track', theme === 'dark' && 'active')}
          aria-hidden="true"
        >
          <span className="toggle-thumb" />
        </span>
      </button>
    </>
  );

  return (
    <>
      <button
        type="button"
        className={cn('sidebar-overlay', mobileSidebarOpen && 'active')}
        aria-label={
          lang === 'fa' ? 'بستن فهرست گفتگوها' : 'Close conversations'
        }
        onClick={closeMobileSidebar}
      />

      <aside
        className={cn(
          'sidebar border-e',
          !sidebarOpen && 'collapsed',
          mobileSidebarOpen && 'mobile-open',
        )}
        aria-label={lang === 'fa' ? 'فهرست گفتگوها' : 'Conversation list'}
      >
        <div
          className="flex items-center gap-1 p-3"
          style={{ minWidth: '252px' }}
        >
          <button
            type="button"
            className="hdr-icon"
            aria-label={translations.common.close}
            onClick={handleSidebarClose}
          >
            <i className="fa-solid fa-xmark text-base" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="hdr-icon"
            aria-label={translations.sidebar.searchPlaceholder}
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((open) => !open)}
          >
            <i
              className="fa-solid fa-magnifying-glass text-sm"
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            className="new-chat-btn flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium"
            onClick={handleNewChat}
          >
            <i className="fa-solid fa-plus text-xs" aria-hidden="true" />
            <span>{translations.sidebar.newChat}</span>
          </button>
        </div>

        <div className={cn('search-wrap px-3 pb-1', searchOpen && 'open')}>
          <div className="relative">
            <i
              className="fa-solid fa-magnifying-glass pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-xs text-[var(--tx-m)]"
              aria-hidden="true"
            />
            <label>
              <span className="sr-only">
                {translations.sidebar.searchPlaceholder}
              </span>
              <input
                ref={searchInputRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="search-input"
                placeholder={translations.sidebar.searchPlaceholder}
                type="search"
              />
            </label>
          </div>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto px-2 pb-2"
          style={{ minWidth: '252px' }}
        >
          <div aria-label={translations.sidebar.comingSoon}>
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

          <div className="history-sep" />

          {isLoadingConversations ? (
            <div className="space-y-2 px-2 pt-2" aria-label="Loading">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-10 animate-pulse rounded-lg bg-[var(--bg-t)]"
                />
              ))}
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
              <i
                className="fa-regular fa-comment-dots mb-2 text-2xl text-[var(--tx-m)]"
                aria-hidden="true"
              />
              <p className="text-xs text-[var(--tx-m)]">
                {search.trim()
                  ? translations.sidebar.noResults
                  : translations.sidebar.noChats}
              </p>
            </div>
          ) : (
            <div>
              {(['today', 'yesterday', 'previous'] as const).map(renderGroup)}
            </div>
          )}
        </div>

        {isLoggedIn ? (
          <div
            className="border-t border-[var(--bc)] p-3"
            style={{ minWidth: '252px' }}
          >
            <button
              type="button"
              className="sb-user-card w-[calc(100%-16px)] text-start"
              onClick={() => openModal('profile')}
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {userPhone.slice(-2) || 'AI'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold" dir="ltr">
                    {userPhone}
                  </span>
                  <span
                    className={cn(
                      'plan-tag',
                      plan === 'free' &&
                        'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
                      plan === 'pro' &&
                        'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
                      plan === 'enterprise' &&
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                    )}
                  >
                    {translations.plans[plan].name}
                  </span>
                </span>
              </span>
            </button>
            <div className="space-y-0.5">{renderPreferences()}</div>
            <button
              type="button"
              className="sidebar-item flex w-full items-center gap-3 px-3 py-2.5 text-start"
              onClick={logout}
            >
              <i
                className="fa-solid fa-right-from-bracket w-5 text-center text-sm text-[var(--tx-m)]"
                aria-hidden="true"
              />
              <span className="text-sm">{translations.sidebar.logout}</span>
            </button>
          </div>
        ) : (
          <div
            className="space-y-1 border-t border-[var(--bc)] p-3"
            style={{ minWidth: '252px' }}
          >
            {renderPreferences()}
            <div className="px-2 pb-3 pt-1">
              <button
                type="button"
                className="sb-login-btn cursor-not-allowed opacity-60"
                disabled
                aria-disabled="true"
                title={translations.sidebar.comingSoon}
              >
                <i
                  className="fa-solid fa-right-to-bracket"
                  aria-hidden="true"
                />
                <span>{translations.sidebar.login}</span>
                <span className="text-[10px] font-normal text-[var(--tx-m)]">
                  {translations.sidebar.comingSoon}
                </span>
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
