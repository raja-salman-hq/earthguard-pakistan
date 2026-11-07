"use client";

import Link from "next/link";
import { useMessages } from "@/hooks/use-messages";

function HeroGlobe() {
  return (
    <svg
      className="hero-globe"
      viewBox="0 0 420 420"
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="globe-fill" cx="38%" cy="34%" r="70%">
          <stop offset="0" stopColor="var(--primary)" stopOpacity=".25" />
          <stop offset=".58" stopColor="var(--accent)" stopOpacity=".09" />
          <stop offset="1" stopColor="var(--background)" stopOpacity=".1" />
        </radialGradient>
        <clipPath id="globe-clip">
          <circle cx="210" cy="198" r="132" />
        </clipPath>
      </defs>
      <circle className="globe-halo" cx="210" cy="198" r="158" />
      <circle cx="210" cy="198" r="132" fill="url(#globe-fill)" />
      <g className="globe-grid" clipPath="url(#globe-clip)">
        <ellipse cx="210" cy="198" rx="60" ry="132" />
        <ellipse cx="210" cy="198" rx="112" ry="132" />
        <ellipse cx="210" cy="198" rx="132" ry="47" />
        <ellipse cx="210" cy="198" rx="132" ry="91" />
        <path d="M75 198h270M91 141h238M91 255h238" />
      </g>
      <circle className="globe-edge" cx="210" cy="198" r="132" />
      <path className="globe-trend-glow" d="m99 235 58-26 39 13 43-59 35 17 51-55" />
      <path className="globe-trend" d="m99 235 58-26 39 13 43-59 35 17 51-55" />
      <circle className="globe-data-point" cx="274" cy="163" r="5" />
      <circle className="globe-data-point" cx="325" cy="125" r="5" />
      <path className="globe-orbit" d="M53 210c22-103 119-174 226-154 54 10 95 39 121 79" />
      <path className="globe-orbit globe-orbit-secondary" d="M47 196c17 101 109 175 217 162 56-7 102-34 132-77" />
    </svg>
  );
}

export default function HomeContent() {
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
          <HeroGlobe />
          <div className="art-caption">
            <span>{messages.heroArtLabel}</span>
            <bdi dir="ltr">{messages.demoPeriod}</bdi>
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
            <span className="stat-demo-label">{messages.demoBadge}</span>
          </article>
          <article className="stat-card">
            <span className="stat-value">7</span>
            <span className="stat-label">{messages.statRegions}</span>
            <span className="stat-demo-label">{messages.demoBadge}</span>
          </article>
          <article className="stat-card">
            <span className="stat-value">7</span>
            <span className="stat-label">{messages.statVariables}</span>
            <span className="stat-demo-label">{messages.demoBadge}</span>
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
