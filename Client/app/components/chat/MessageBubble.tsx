'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '~/types/chat';
import { LOGO_URL } from '~/lib/constants';
import { CodeBlock } from '~/components/ui/CodeBlock';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end fade-in-up" data-msg-id={message.id}>
        <div className="msg-user max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-3 sm:max-w-[70%]">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 fade-in-up" data-msg-id={message.id}>
      <img
        src={LOGO_URL}
        alt="Rastinax"
        className="logo-img-sm mt-1 flex-shrink-0"
      />
      <div className="msg-ai max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3 sm:max-w-[80%]">
        <div className="msg-content text-sm leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, ...props }: any) {
                const code = String(children).replace(/\n$/, '');
                const isBlock =
                  Boolean(className) || String(children).includes('\n');

                if (isBlock) {
                  return <CodeBlock code={code} />;
                }

                return (
                  <code
                    className="rounded bg-[var(--bg-t)] px-1.5 py-0.5 font-mono text-[0.9em] text-brand-600 dark:text-brand-400"
                    dir="ltr"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              p({ children }: any) {
                return <p className="my-1.5 whitespace-pre-wrap">{children}</p>;
              },
              ul({ children }: any) {
                return (
                  <ul className="my-2 list-disc space-y-1 ps-5">{children}</ul>
                );
              },
              ol({ children }: any) {
                return (
                  <ol className="my-2 list-decimal space-y-1 ps-5">{children}</ol>
                );
              },
              strong({ children }: any) {
                return <strong className="font-semibold">{children}</strong>;
              },
              a({ children, href }: any) {
                return (
                  <a
                    className="text-brand-500 hover:underline"
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {children}
                  </a>
                );
              },
              table({ children }: any) {
                return (
                  <div className="my-3 overflow-x-auto rounded-lg border border-[var(--bc)]">
                    <table className="w-full border-collapse text-sm">
                      {children}
                    </table>
                  </div>
                );
              },
              th({ children }: any) {
                return (
                  <th className="border-b border-[var(--bc)] bg-[var(--bg-t)] px-4 py-2 text-start font-semibold">
                    {children}
                  </th>
                );
              },
              td({ children }: any) {
                return (
                  <td className="border-b border-[var(--bc)] px-4 py-2">
                    {children}
                  </td>
                );
              },
              hr() {
                return <hr className="my-4 border-[var(--bc)]" />;
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
