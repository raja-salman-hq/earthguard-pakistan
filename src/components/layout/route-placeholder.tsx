"use client";

import { useMessages } from "@/hooks/use-messages";
import type { MessageKey } from "@/lib/i18n";

type PlaceholderVariant = "explore" | "compare" | "about";

type RoutePlaceholderProps = {
  title: MessageKey;
  description: MessageKey;
  variant: PlaceholderVariant;
};

const placeholderKeys: Record<PlaceholderVariant, MessageKey[]> = {
  explore: ["controlsPlaceholder", "workspacePlaceholder", "insightsPlaceholder"],
  compare: ["controlsPlaceholder", "comparisonPlaceholder", "insightsPlaceholder"],
  about: ["aboutPlaceholder"],
};

export function RoutePlaceholder({
  title,
  description,
  variant,
}: RoutePlaceholderProps) {
  const messages = useMessages();

  return (
    <main className="route-page page-shell">
      <div className="page-heading">
        <span className="eyebrow">{messages.demoBadge}</span>
        <h1>{messages[title]}</h1>
        <p>{messages[description]}</p>
      </div>
      <section
        className={`placeholder-grid placeholder-grid-${variant}`}
        aria-label={messages[title]}
      >
        {placeholderKeys[variant].map((key, index) => (
          <div className="placeholder-panel" key={key}>
            <span className="placeholder-label">{messages[key]}</span>
            <div className="skeleton skeleton-heading" aria-hidden="true" />
            <div className="skeleton skeleton-line" aria-hidden="true" />
            <div className="skeleton skeleton-block" aria-hidden="true" />
            {index === 0 && (
              <div className="skeleton skeleton-line skeleton-line-short" aria-hidden="true" />
            )}
          </div>
        ))}
      </section>
    </main>
  );
}
