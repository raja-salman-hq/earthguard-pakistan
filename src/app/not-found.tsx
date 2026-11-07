"use client";

import Link from "next/link";
import { useMessages } from "@/hooks/use-messages";

export default function NotFound() {
  const messages = useMessages();

  return (
    <main className="feedback-page page-shell" aria-labelledby="not-found-title">
      <section className="feedback-card">
        <span className="feedback-code">404</span>
        <h1 id="not-found-title">{messages.notFoundTitle}</h1>
        <p>{messages.notFoundDescription}</p>
        <Link className="primary-button" href="/explore">
          {messages.notFoundExplore}
        </Link>
      </section>
    </main>
  );
}
