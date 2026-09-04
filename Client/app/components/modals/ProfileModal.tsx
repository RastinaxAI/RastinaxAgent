'use client';

import { useEffect, useState } from 'react';
import { useModal } from '~/context/ModalContext';
import { useAuth } from '~/context/AuthContext';
import { useUI } from '~/context/UIContext';
import { useChat } from '~/context/ChatContext';
import { getTranslations } from '~/lib/i18n';

const PLAN_IDS = ['free', 'pro', 'enterprise'] as const;

function planTagClass(plan: (typeof PLAN_IDS)[number]) {
  if (plan === 'pro') {
    return 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400';
  }
  if (plan === 'enterprise') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  }
  return 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
}

export function ProfileModal() {
  const { activeModal, closeModal, openModal } = useModal();
  const { userPhone, plan, joinDate, imagesUsed } = useAuth();
  const { lang } = useUI();
  const { chats } = useChat();
  const [activeTab, setActiveTab] = useState<'profile' | 'payment'>('profile');
  const translations = getTranslations(lang);

  useEffect(() => {
    if (activeModal === 'profile') {
      setActiveTab('profile');
    }
  }, [activeModal]);

  if (activeModal !== 'profile') return null;

  const profileTranslations = translations.profile;
  const planData = translations.plans[plan];
  const dateLocale = lang === 'fa' ? 'fa-IR' : 'en-US';
  const invoicePrice =
    plan === 'pro'
      ? lang === 'fa'
        ? '۴۹۹,۰۰۰ تومان'
        : '$9.99'
      : lang === 'fa'
        ? '۱,۴۹۹,۰۰۰ تومان'
        : '$29.99';

  return (
    <div
      className="modal-overlay active"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      <div
        className="modal-card max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-6 sm:p-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="profile-modal-title" className="text-lg font-bold text-[var(--tx-p)]">
              {profileTranslations.title}
            </h2>
            <button
              type="button"
              className="hdr-icon"
              aria-label={translations.common.close}
              onClick={closeModal}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          <div className="tab-bar">
            <button
              type="button"
              className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              {profileTranslations.profileTab}
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'payment' ? 'active' : ''}`}
              onClick={() => setActiveTab('payment')}
            >
              {profileTranslations.paymentTab}
            </button>
          </div>

          {activeTab === 'profile' && (
            <div className="fade-in-up">
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-xl font-bold text-white">
                  {userPhone.slice(-2) || '?'}
                </div>
                <div>
                  <div className="text-lg font-bold text-[var(--tx-p)]" dir="ltr">
                    {userPhone || '—'}
                  </div>
                  <span className={`plan-tag mt-1 ${planTagClass(plan)}`}>
                    {planData.name}
                  </span>
                </div>
              </div>

              <div className="space-y-0">
                <div className="flex justify-between border-b border-[var(--bc)] py-2 text-sm">
                  <span className="text-[var(--tx-m)]">
                    {profileTranslations.joinDate}
                  </span>
                  <span className="font-medium text-[var(--tx-p)]" dir="ltr">
                    {new Date(joinDate).toLocaleDateString(dateLocale)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[var(--bc)] py-2 text-sm">
                  <span className="text-[var(--tx-m)]">
                    {profileTranslations.totalChats}
                  </span>
                  <span className="font-medium text-[var(--tx-p)]">{chats.length}</span>
                </div>
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-[var(--tx-m)]">
                    {profileTranslations.imagesUsed}
                  </span>
                  <span className="font-medium text-[var(--tx-p)]">{imagesUsed}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="fade-in-up">
              <div className="mb-4 rounded-xl bg-[var(--bg-t)] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--tx-p)]">
                    {profileTranslations.currentPlan}
                  </span>
                  <span className={`plan-tag ${planTagClass(plan)}`}>
                    {planData.name}
                  </span>
                </div>
                <div className="mt-3 space-y-1.5">
                  {planData.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 text-sm text-[var(--tx-p)]"
                    >
                      <i className="fa-solid fa-check text-xs text-emerald-500" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="plan-cta plan-cta-primary mt-4 text-sm"
                  onClick={() => openModal('plans')}
                >
                  {profileTranslations.changePlan}
                </button>
              </div>

              <h3 className="mb-2 text-sm font-semibold text-[var(--tx-p)]">
                {profileTranslations.invoices}
              </h3>
              {plan === 'free' ? (
                <p className="border border-dashed border-[var(--bc)] bg-[var(--bg-s)] py-4 text-center text-sm text-[var(--tx-m)]">
                  {profileTranslations.noInvoices}
                </p>
              ) : (
                <div>
                  {[0, 1, 2].map((offset) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - offset);
                    return (
                      <div key={offset} className="invoice-row">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-[var(--tx-p)]">
                            {planData.name}
                          </div>
                          <div className="text-[11px] text-[var(--tx-m)]">
                            {date.toLocaleDateString(dateLocale)}
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="text-sm font-semibold text-[var(--tx-p)]" dir="ltr">
                            {invoicePrice}
                          </div>
                          <div className="text-[11px] text-emerald-500">
                            {profileTranslations.paid}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
