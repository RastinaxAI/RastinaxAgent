'use client';

import { useModal } from '~/context/ModalContext';
import { useUI } from '~/context/UIContext';
import { getTranslations } from '~/lib/i18n';

export function UpsellModal() {
  const { activeModal, closeModal, openModal } = useModal();
  const { lang } = useUI();
  const translations = getTranslations(lang);

  if (activeModal !== 'upsell') return null;

  return (
    <div
      className="modal-overlay active"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      <div
        className="modal-card max-w-md text-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upsell-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-6 sm:p-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 dark:bg-brand-900/30">
            <i className="fa-solid fa-lock text-2xl text-brand-600 dark:text-brand-400" />
          </div>
          <h2 id="upsell-modal-title" className="mb-2 text-xl font-bold text-[var(--tx-p)]">
            {translations.upsell.title}
          </h2>
          <p className="mb-6 text-sm text-[var(--tx-s)]">
            {translations.upsell.description}
          </p>
          <button
            type="button"
            className="plan-cta plan-cta-primary mb-3"
            onClick={() => openModal('plans')}
          >
            {translations.upsell.upgrade}
          </button>
          <button
            type="button"
            className="w-full border-0 bg-transparent text-sm text-[var(--tx-m)] transition-colors hover:text-[var(--tx-p)]"
            onClick={closeModal}
          >
            {translations.upsell.later}
          </button>
        </div>
      </div>
    </div>
  );
}
