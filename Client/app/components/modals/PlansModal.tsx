'use client';

import { useModal } from '~/context/ModalContext';
import { useAuth } from '~/context/AuthContext';
import { useUI } from '~/context/UIContext';
import { useToast } from '~/components/ui/Toast';
import { getTranslations } from '~/lib/i18n';

const PLAN_IDS = ['free', 'pro', 'enterprise'] as const;

export function PlansModal() {
  const { activeModal, closeModal } = useModal();
  const { plan: currentPlan, setPlan } = useAuth();
  const { lang } = useUI();
  const { showToast } = useToast();
  const translations = getTranslations(lang);

  if (activeModal !== 'plans') return null;

  const handleSelectPlan = (planId: (typeof PLAN_IDS)[number]) => {
    if (planId === currentPlan) {
      closeModal();
      return;
    }

    setPlan(planId);
    closeModal();
    showToast(translations.common.planUpdated);
  };

  return (
    <div
      className="modal-overlay active"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      <div
        className="modal-card max-w-3xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plans-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-6 sm:p-8">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="plans-modal-title" className="text-xl font-bold text-[var(--tx-p)]">
              {translations.plans.title}
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
          <p className="mb-6 text-sm text-[var(--tx-s)]">
            {translations.plans.subtitle}
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PLAN_IDS.map((id) => {
              const plan = translations.plans[id];
              const isCurrent = currentPlan === id;

              return (
                <div
                  key={id}
                  className={`plan-card ${plan.featured ? 'featured' : ''}`}
                >
                  {plan.featured && (
                    <div className="plan-badge">{translations.plans.popular}</div>
                  )}
                  <div className="mb-4">
                    <div className="mb-1 text-lg font-bold text-[var(--tx-p)]">
                      {plan.name}
                    </div>
                    <div
                      className="mb-1 text-2xl font-extrabold text-brand-600 dark:text-brand-400"
                      dir="ltr"
                    >
                      {plan.price}
                    </div>
                    <div className="text-xs text-[var(--tx-m)]">
                      {plan.description}
                    </div>
                  </div>

                  <div className="mb-5 flex-1 space-y-2.5">
                    {plan.features.map((feature) => (
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
                    disabled={isCurrent}
                    className={`plan-cta ${
                      plan.featured
                        ? 'plan-cta-primary'
                        : 'plan-cta-secondary'
                    }`}
                    onClick={() => handleSelectPlan(id)}
                  >
                    {isCurrent
                      ? translations.plans.current
                      : translations.plans.choose}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
