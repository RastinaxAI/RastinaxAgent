'use client';

import { useEffect, useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import { useModal } from '~/context/ModalContext';
import { useAuth } from '~/context/AuthContext';
import { useUI } from '~/context/UIContext';
import { useToast } from '~/components/ui/Toast';
import { getTranslations } from '~/lib/i18n';

export function AuthModal() {
  const { activeModal, closeModal } = useModal();
  const { login } = useAuth();
  const { lang } = useUI();
  const { showToast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '']);
  const [error, setError] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const translations = getTranslations(lang);

  useEffect(() => {
    if (activeModal !== 'auth') return;

    setStep(1);
    setPhone('');
    setOtp(['', '', '', '', '']);
    setError(false);
    const timeout = window.setTimeout(() => phoneInputRef.current?.focus(), 300);
    return () => window.clearTimeout(timeout);
  }, [activeModal]);

  if (activeModal !== 'auth') return null;

  const clearOtp = () => {
    setOtp(['', '', '', '', '']);
    setError(false);
  };

  const handleSendCode = () => {
    if (phone.length !== 11) return;
    setStep(2);
    clearOtp();
    window.setTimeout(() => otpRefs.current[0]?.focus(), 300);
  };

  const handleVerify = () => {
    const code = otp.join('');
    if (code !== '11111') {
      clearOtp();
      setError(true);
      window.setTimeout(() => otpRefs.current[0]?.focus(), 0);
      return;
    }

    login(phone);
    setStep(3);
    showToast(translations.common.loginSuccess);
    window.setTimeout(closeModal, 1200);
  };

  const handleOtpChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      setOtp((current) => current.map((digit, i) => (i === index ? '' : digit)));
      return;
    }

    const nextOtp = [...otp];
    digits
      .slice(0, 5 - index)
      .split('')
      .forEach((digit, offset) => {
        nextOtp[index + offset] = digit;
      });
    setOtp(nextOtp);

    const nextIndex = Math.min(index + digits.length, 4);
    otpRefs.current[nextIndex]?.focus();
  };

  const handleOtpKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      const previousIndex = index - 1;
      setOtp((current) =>
        current.map((digit, i) => (i === previousIndex ? '' : digit)),
      );
      otpRefs.current[previousIndex]?.focus();
    }
  };

  const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 5);
    if (!digits) return;
    setOtp(digits.split('').concat(['', '', '', '', '']).slice(0, 5));
    otpRefs.current[Math.min(digits.length, 4)]?.focus();
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
        className="modal-card max-w-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 id="auth-modal-title" className="text-xl font-bold text-[var(--tx-p)]">
              {translations.auth.title}
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

          {step === 1 && (
            <div className="fade-in-up">
              <p className="mb-4 text-sm text-[var(--tx-s)]">
                {translations.auth.description}
              </p>
              <input
                ref={phoneInputRef}
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={11}
                value={phone}
                placeholder="09123456789"
                className="phone-input mb-4"
                dir="ltr"
                onChange={(event) =>
                  setPhone(event.target.value.replace(/\D/g, '').slice(0, 11))
                }
              />
              <button
                type="button"
                className="plan-cta plan-cta-primary"
                disabled={phone.length < 11}
                onClick={handleSendCode}
              >
                {translations.auth.sendCode}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="fade-in-up">
              <p className="mb-1 text-sm text-[var(--tx-s)]">
                {translations.auth.otpDescription}
              </p>
              <p className="mb-5 text-sm font-semibold text-[var(--tx-p)]" dir="ltr">
                {phone}
              </p>

              <div className="mb-4 flex justify-center gap-2" dir="ltr">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      otpRefs.current[index] = element;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    maxLength={5}
                    value={digit}
                    className={`otp-box ${digit ? 'filled' : ''}`}
                    aria-label={`${lang === 'fa' ? 'رقم' : 'Digit'} ${index + 1}`}
                    onChange={(event) => handleOtpChange(index, event.target.value)}
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    onPaste={handleOtpPaste}
                  />
                ))}
              </div>

              {error && (
                <p className="mb-3 text-center text-sm text-red-500">
                  {translations.auth.otpError}
                </p>
              )}

              <button
                type="button"
                className="plan-cta plan-cta-primary"
                disabled={otp.join('').length !== 5}
                onClick={handleVerify}
              >
                {translations.auth.verify}
              </button>
              <button
                type="button"
                className="mt-3 w-full border-0 bg-transparent text-sm text-[var(--tx-m)] transition-colors hover:text-[var(--tx-p)]"
                onClick={() => {
                  setStep(1);
                  clearOtp();
                }}
              >
                {translations.auth.changeNumber}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="text-center fade-in-up">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <i className="fa-solid fa-check text-2xl text-emerald-500" />
              </div>
              <h3 className="mb-1 text-lg font-bold text-[var(--tx-p)]">
                {translations.auth.welcome}
              </h3>
              <p className="text-sm text-[var(--tx-s)]">
                {translations.auth.success}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
