'use client';

import { useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useChat } from '~/context/ChatContext';
import { useUI } from '~/context/UIContext';
import { useAutoResize } from '~/hooks/useAutoResize';
import { getTranslations } from '~/lib/i18n';

export function ChatInput() {
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
