"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useMessages } from "@/hooks/use-messages";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const messages = useMessages();

  useEffect(() => {
    console.error("Unhandled application error.", error);
  }, [error]);

  return (
    <main className="feedback-page page-shell" aria-labelledby="app-error-title">
      <section className="feedback-card">
        <span className="feedback-code" aria-hidden="true">!</span>
        <h1 id="app-error-title">{messages.errorTitle}</h1>
        <p>{messages.errorDescription}</p>
        <div className="feedback-actions">
          <button type="button" className="primary-button" onClick={retry}>
            {messages.errorRetry}
          </button>
          <Link className="secondary-button" href="/explore">
            {messages.errorExplore}
          </Link>
        </div>
      </section>
    </main>
  );
}
