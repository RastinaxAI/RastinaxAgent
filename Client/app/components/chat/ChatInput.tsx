'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useChat } from '~/context/ChatContext';
import { useUI } from '~/context/UIContext';
import { useToast } from '~/components/ui/Toast';
import { useAutoResize } from '~/hooks/useAutoResize';
import { getTranslations } from '~/lib/i18n';
import { cn } from '~/lib/utils';

function LegacyChatInput() {
  const { lang } = useUI();
  const {
    sendMessage,
    isGenerating,
    isLoadingConversation,
    isReady,
  } = useChat();
  const [messageText, setMessageText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { resizeTextarea } = useAutoResize(textareaRef);
  const translations = getTranslations(lang);
  const isDisabled =
    !isReady || isGenerating || isLoadingConversation;

  const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(event.target.value);
    resizeTextarea();
  };

  const handleSend = () => {
    if (!messageText.trim() || isDisabled) return;
    void sendMessage(messageText);
    setMessageText('');
    window.setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.overflowY = 'hidden';
      }
    }, 0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
      <div className="input-area relative mx-auto max-w-3xl rounded-2xl px-3 py-3 sm:px-4">
        <div className="relative flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={messageText}
            rows={1}
            dir={lang === 'fa' ? 'rtl' : 'ltr'}
            className="input-field min-w-0 flex-1 py-1.5 text-sm leading-relaxed"
            placeholder={translations.chat.placeholder}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            aria-label={translations.chat.placeholder}
          />

          <button
            type="button"
            className="send-btn mb-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
            disabled={!messageText.trim() || isDisabled}
            aria-label={lang === 'fa' ? 'ارسال پیام' : 'Send message'}
            onClick={handleSend}
          >
            <i className="fa-solid fa-arrow-up text-sm" />
          </button>
        </div>

        <div className="mt-2 text-center text-[10px] text-[var(--tx-m)]">
          {translations.chat.disclaimer}
        </div>
      </div>
    </div>
  );
}

export function ChatInput() {
  const { lang } = useUI();
  const {
    sendMessage,
    isGenerating,
    isLoadingConversation,
    isReady,
  } = useChat();
  const { showToast } = useToast();
  const [messageText, setMessageText] = useState('');
  const [plusOpen, setPlusOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const plusRef = useRef<HTMLDivElement>(null);
  const { resizeTextarea } = useAutoResize(textareaRef);
  const translations = getTranslations(lang);
  const isDisabled =
    !isReady || isGenerating || isLoadingConversation;

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        plusRef.current &&
        !plusRef.current.contains(event.target as Node)
      ) {
        setPlusOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(event.target.value);
    resizeTextarea();
  };

  const handleSend = () => {
    if (!messageText.trim() || isDisabled) return;
    void sendMessage(messageText);
    setMessageText('');
    window.setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.overflowY = 'hidden';
      }
    }, 0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleUpload = () => {
    setPlusOpen(false);
    showToast(
      lang === 'fa'
        ? 'آپلود فایل در نسخه بعدی فعال می‌شود.'
        : 'File upload is coming soon.',
    );
  };

  return (
    <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
      <div className="input-area relative mx-auto max-w-3xl rounded-2xl px-3 py-3 sm:px-4">
        <div className="relative flex items-end gap-2">
          <div className="relative" ref={plusRef}>
            <button
              type="button"
              className="hdr-icon mb-0.5"
              aria-label={translations.chat.uploadFile}
              aria-expanded={plusOpen}
              onClick={() => setPlusOpen((open) => !open)}
            >
              <i className="fa-solid fa-paperclip text-sm" aria-hidden="true" />
            </button>

            <div className={cn('plus-menu', plusOpen && 'active')}>
              <button
                type="button"
                className="plus-menu-item"
                onClick={handleUpload}
              >
                <span className="pmi-icon bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <i
                    className="fa-solid fa-file-arrow-up"
                    aria-hidden="true"
                  />
                </span>
                <span>
                  <span className="block font-medium">
                    {translations.chat.uploadFile}
                  </span>
                  <span className="block text-[11px] text-[var(--tx-m)]">
                    {translations.chat.uploadDescription}
                  </span>
                </span>
              </button>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={messageText}
            rows={1}
            dir={lang === 'fa' ? 'rtl' : 'ltr'}
            className="input-field min-w-0 flex-1 py-1.5 text-sm leading-relaxed"
            placeholder={translations.chat.placeholder}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            aria-label={translations.chat.placeholder}
          />

          <button
            type="button"
            className="send-btn mb-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
            disabled={!messageText.trim() || isDisabled}
            aria-label={lang === 'fa' ? 'ارسال پیام' : 'Send message'}
            onClick={handleSend}
          >
            <i className="fa-solid fa-arrow-up text-sm" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-2 text-center text-[10px] text-[var(--tx-m)]">
          {translations.chat.disclaimer}
        </div>
      </div>
    </div>
  );
}
