import type { ReactNode } from 'react';
import { UIProvider } from '~/context/UIContext';
import { AuthProvider } from '~/context/AuthContext';
import { ChatProvider } from '~/context/ChatContext';
import { ModalProvider } from '~/context/ModalContext';
import { ToastProvider } from '~/components/ui/Toast';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <UIProvider>
      <AuthProvider>
        <ChatProvider>
          <ModalProvider>
            <ToastProvider>{children}</ToastProvider>
          </ModalProvider>
        </ChatProvider>
      </AuthProvider>
    </UIProvider>
  );
}
