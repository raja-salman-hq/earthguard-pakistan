"use client";

import Link from "next/link";
import { useMessages } from "@/hooks/use-messages";

export default function HomePage() {
  const messages = useMessages();

  return (
    <main>
      <section className="hero page-shell">
        <div className="hero-copy">
          <span className="eyebrow">{messages.heroEyebrow}</span>
          <h1>{messages.heroTitle}</h1>
          <p>{messages.heroSubtitle}</p>
          <Link className="primary-button" href="/explore">
            {messages.startExploring}
            <span aria-hidden="true" className="ms-2 start-exploring-arrow">
              →
            </span>
          </Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="orbital-ring" />
          <span className="hero-glow" />
          <div className="art-caption">
            <span>{messages.heroArtLabel}</span>
            <span>{messages.demoPeriod}</span>
          </div>
        </div>
      </section>

      <section className="page-shell" aria-labelledby="demo-stats-title">
        <div className="section-heading">
          <h2 id="demo-stats-title">{messages.demoNumbers}</h2>
          <span className="demo-badge">{messages.demoBadge}</span>
        </div>
        <div className="stats-grid">
          <article className="stat-card">
            <span className="stat-value">312</span>
            <span className="stat-label">{messages.statMonthly}</span>
          </article>
          <article className="stat-card">
            <span className="stat-value">7</span>
            <span className="stat-label">{messages.statRegions}</span>
          </article>
          <article className="stat-card">
            <span className="stat-value">7</span>
            <span className="stat-label">{messages.statVariables}</span>
          </article>
        </div>
      </section>

      <section className="page-shell how-section" aria-labelledby="how-title">
        <div className="section-heading">
          <h2 id="how-title">{messages.howTitle}</h2>
          <p>{messages.howSubtitle}</p>
        </div>
        <div className="steps-grid">
          <article className="step-card">
            <span className="step-index">{messages.stepOneLabel}</span>
            <h3>{messages.stepOneTitle}</h3>
            <p>{messages.stepOneText}</p>
          </article>
          <article className="step-card">
            <span className="step-index">{messages.stepTwoLabel}</span>
            <h3>{messages.stepTwoTitle}</h3>
            <p>{messages.stepTwoText}</p>
          </article>
          <article className="step-card">
            <span className="step-index">{messages.stepThreeLabel}</span>
            <h3>{messages.stepThreeTitle}</h3>
            <p>{messages.stepThreeText}</p>
          </article>
        </div>
      </section>
    </main>
  );
}
