"use client";

import Link from "next/link";
import { isDemoMode } from "@/lib/api/client";
import { useMessages } from "@/hooks/use-messages";
import { useUiStore } from "@/store/ui-store";

export function SiteFrame({ children }: Readonly<{ children: React.ReactNode }>) {
  const messages = useMessages();
  const theme = useUiStore((state) => state.theme);
  const language = useUiStore((state) => state.language);
  const setTheme = useUiStore((state) => state.setTheme);
  const setLanguage = useUiStore((state) => state.setLanguage);

  return (
    <div className="site-frame">
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" href="/" aria-label={`${messages.brand} ${messages.country}`}>
            <span className="brand-mark" aria-hidden="true">
              E
            </span>
            <span className="brand-name">
              <strong>{messages.brand}</strong>
              <span>{messages.country}</span>
            </span>
          </Link>

          <nav className="primary-nav" aria-label={messages.mainNavigation}>
            <Link href="/explore">{messages.explore}</Link>
            <Link href="/compare">{messages.compare}</Link>
            <Link href="/about">{messages.about}</Link>
          </nav>

          <div className="header-actions">
            {isDemoMode && <span className="demo-badge">{messages.demoBadge}</span>}
            <button
              className="control-button"
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={messages.switchTheme}
              title={messages.switchTheme}
            >
              {theme === "dark" ? messages.lightTheme : messages.darkTheme}
            </button>
            <button
              className="control-button language-button"
              type="button"
              onClick={() => setLanguage(language === "en" ? "ur" : "en")}
              aria-label={messages.switchLanguage}
              title={messages.switchLanguage}
            >
              {language === "en" ? "EN | UR" : "UR | EN"}
            </button>
          </div>
        </div>
      </header>

      <div className="site-content">{children}</div>

      <footer className="site-footer">
        <div className="footer-inner">
          <p>{messages.nasaCredit}</p>
          <p className="footer-note">{messages.syntheticNotice}</p>
        </div>
      </footer>
    </div>
  );
}
