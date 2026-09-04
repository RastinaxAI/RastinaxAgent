'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { STORAGE_KEYS } from '~/lib/constants';

export type Plan = 'free' | 'pro' | 'enterprise';

interface AuthState {
  isLoggedIn: boolean;
  userPhone: string;
  plan: Plan;
  joinDate: number;
  imagesUsed: number;
  imageGenUsed: boolean;
}

interface AuthContextType extends AuthState {
  login: (phone: string) => void;
  logout: () => void;
  setPlan: (newPlan: Plan) => void;
  markImageUsed: () => void;
}

const INITIAL_STATE: AuthState = {
  isLoggedIn: false,
  userPhone: '',
  plan: 'free',
  joinDate: Date.now(),
  imagesUsed: 0,
  imageGenUsed: false,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizePhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');

  if (digits.startsWith('98') && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }

  if (digits.length === 10) {
    return `0${digits}`;
  }

  return digits;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.auth);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<AuthState>;
        setState({
          ...INITIAL_STATE,
          ...parsed,
          plan:
            parsed.plan === 'pro' || parsed.plan === 'enterprise'
              ? parsed.plan
              : 'free',
          isLoggedIn: Boolean(parsed.isLoggedIn),
          userPhone:
            typeof parsed.userPhone === 'string'
              ? normalizePhone(parsed.userPhone)
              : '',
          joinDate:
            typeof parsed.joinDate === 'number' ? parsed.joinDate : Date.now(),
          imagesUsed:
            typeof parsed.imagesUsed === 'number' ? parsed.imagesUsed : 0,
          imageGenUsed: Boolean(parsed.imageGenUsed),
        });
      }
    } catch {
      // Ignore malformed or unavailable localStorage data.
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(state));
    }
  }, [isHydrated, state]);

  const login = (phone: string) => {
    setState((current) => ({
      ...current,
      isLoggedIn: true,
      userPhone: normalizePhone(phone),
      joinDate: Date.now(),
    }));
  };

  const logout = () => {
    setState((current) => ({
      ...current,
      isLoggedIn: false,
      userPhone: '',
      plan: 'free',
      imageGenUsed: false,
    }));
  };

  const setPlan = (plan: Plan) => {
    setState((current) => ({ ...current, plan }));
  };

  const markImageUsed = () => {
    setState((current) => ({
      ...current,
      imageGenUsed: true,
      imagesUsed: current.imagesUsed + 1,
    }));
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, setPlan, markImageUsed }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
