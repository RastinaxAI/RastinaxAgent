'use client';

import { useEffect, useRef, useState } from 'react';
import { useUI } from '~/context/UIContext';
import { useAuth } from '~/context/AuthContext';
import { useModal } from '~/context/ModalContext';
import { useChat } from '~/context/ChatContext';
import { getTranslations } from '~/lib/i18n';
import { LOGO_URL } from '~/lib/constants';
import { cn } from '~/lib/utils';

export function Header() {
  const { lang, toggleSidebar } = useUI();
  const { isLoggedIn, userPhone, plan, logout } = useAuth();
  const { openModal } = useModal();
  const { createNewChat } = useChat();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const translations = getTranslations(lang);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const handleProfile = () => {
    setDropdownOpen(false);
    openModal(isLoggedIn ? 'profile' : 'auth');
  };

  return (
    <header className="flex items-center justify-between border-b border-[var(--bc)] bg-[var(--bg-c)] px-3 py-3 transition-colors sm:px-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="hdr-icon"
          aria-label={lang === 'fa' ? 'نمایش سایدبار' : 'Toggle sidebar'}
          onClick={toggleSidebar}
        >
          <i className="fa-solid fa-bars text-base" />
        </button>

        <button
          type="button"
          className="flex items-center gap-2.5"
          onClick={createNewChat}
          aria-label={lang === 'fa' ? 'چت جدید' : 'New chat'}
        >
          <img src={LOGO_URL} alt="NexChat" className="logo-img" />
          <span className="hidden text-lg font-bold tracking-tight text-[var(--tx-p)] sm:inline">
            NexChat
          </span>
          <span className="hidden rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 sm:inline">
            AI
          </span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-[var(--tx-m)] md:block">
          {translations.chat.modelName}
        </span>

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            className="hdr-icon"
            aria-label={lang === 'fa' ? 'حساب کاربری' : 'Account'}
            aria-expanded={dropdownOpen}
            onClick={() => setDropdownOpen((open) => !open)}
          >
            {isLoggedIn ? (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {userPhone.slice(-1)}
              </span>
            ) : (
              <i className="fa-regular fa-user text-base" />
            )}
          </button>

          {dropdownOpen && (
            <div className="user-dropdown active">
              {isLoggedIn ? (
                <>
                  <div className="mb-1 border-b border-[var(--bc)] px-3 py-2">
                    <div className="text-sm font-semibold text-[var(--tx-p)]" dir="ltr">
                      {userPhone}
                    </div>
                    <div className="text-[11px] text-[var(--tx-m)]">
                      {translations.plans[plan].name}
                    </div>
                  </div>
                  <button type="button" className="ud-item" onClick={handleProfile}>
                    <i className="fa-regular fa-user w-4" />
                    <span>{translations.sidebar.profile}</span>
                  </button>
                  <button
                    type="button"
                    className="ud-item"
                    onClick={() => {
                      setDropdownOpen(false);
                      openModal('plans');
                    }}
                  >
                    <i className="fa-solid fa-crown w-4 text-amber-500" />
                    <span>{translations.sidebar.plans}</span>
                  </button>
                  <button
                    type="button"
                    className={cn('ud-item', 'hover:text-red-500')}
                    onClick={() => {
                      logout();
                      setDropdownOpen(false);
                    }}
                  >
                    <i className="fa-solid fa-right-from-bracket w-4" />
                    <span>{translations.sidebar.logout}</span>
                  </button>
                </>
              ) : (
                <div
                  className="ud-item cursor-not-allowed opacity-60"
                  aria-disabled="true"
                  title={translations.sidebar.comingSoon}
                >
                  <i className="fa-solid fa-right-to-bracket w-4" />
                  <span>{translations.sidebar.login}</span>
                  <span className="ms-auto text-[10px] text-[var(--tx-m)]">
                    {translations.sidebar.comingSoon}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
