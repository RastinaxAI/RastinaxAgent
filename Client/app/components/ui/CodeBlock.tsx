'use client';

import { useState } from 'react';
import { useUI } from '~/context/UIContext';
import { useToast } from '~/components/ui/Toast';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code }: CodeBlockProps) {
  const { lang } = useUI();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      showToast(lang === 'fa' ? 'کپی شد!' : 'Copied!');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast(lang === 'fa' ? 'کپی انجام نشد' : 'Copy failed');
    }
  };

  return (
    <div className="code-block" dir="ltr">
      <button type="button" className="ccb" onClick={handleCopy}>
        {copied ? '✓' : lang === 'fa' ? 'کپی' : 'Copy'}
      </button>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}
