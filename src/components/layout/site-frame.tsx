"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { isDemoMode } from "@/lib/api/client";
import { getAreaIndicators } from "@/lib/api";
import { useMessages } from "@/hooks/use-messages";
import { useUiStore } from "@/store/ui-store";
import { LocalizedMetadataSync } from "@/components/layout/localized-metadata-sync";

export function SiteFrame({ children }: Readonly<{ children: React.ReactNode }>) {
  const messages = useMessages();
  const pathname = usePathname();
  const coverageDialogRef = useRef<HTMLDialogElement>(null);
  const coverageAutoShown = useRef(false);
  const dataQuery = useQuery({
    queryKey: ["area-indicators", "faisalabad"],
    queryFn: () => getAreaIndicators("faisalabad"),
    enabled: !isDemoMode,
    staleTime: Infinity,
  });
  const theme = useUiStore((state) => state.theme);
  const language = useUiStore((state) => state.language);
  const themeButtonLabel = theme === "dark" ? messages.lightTheme : messages.darkTheme;
  const languageButtonLabel =
    language === "en" ? messages.languageToggleEnglish : messages.languageToggleUrdu;
  const setTheme = useUiStore((state) => state.setTheme);
  const setLanguage = useUiStore((state) => state.setLanguage);
  useEffect(() => {
    if (
      coverageAutoShown.current ||
      (pathname !== "/" && pathname !== "/explore")
    ) {
      return;
    }

    coverageAutoShown.current = true;
    let alreadyShown = false;
    try {
      alreadyShown = window.sessionStorage.getItem("earthguard-data-coverage-shown") === "1";
      if (!alreadyShown) {
        window.sessionStorage.setItem("earthguard-data-coverage-shown", "1");
      }
    } catch {
      alreadyShown = false;
    }

    if (!alreadyShown && coverageDialogRef.current && !coverageDialogRef.current.open) {
      coverageDialogRef.current.showModal();
    }
  }, [pathname]);

  function openCoverageDialog() {
    const dialog = coverageDialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }

  const statusLabel =
    dataQuery.data?.meta.status === "verified"
      ? messages.verifiedDataBadge
      : dataQuery.data?.meta.status === "draft"
        ? messages.draftDataBadge
        : dataQuery.data?.meta.status === "placeholder"
          ? messages.placeholderDataBadge
          : undefined;
  const logoSrc =
    theme === "dark"
      ? "/brand/earthguard-horizontal.svg"
      : "/brand/earthguard-horizontal-light.svg";

  return (
    <div className="site-frame">
      <LocalizedMetadataSync />
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" href="/" aria-label={`${messages.brand} ${messages.country}`}>
            <Image
              className="brand-logo"
              src={logoSrc}
              width={292}
              height={56}
              alt=""
              priority
            />
          </Link>

          <nav className="primary-nav" aria-label={messages.mainNavigation}>
            <Link href="/explore">{messages.explore}</Link>
            <Link href="/compare">{messages.compare}</Link>
            <Link href="/about">{messages.about}</Link>
            <Link href="/team">{messages.team}</Link>
          </nav>

          <div className="header-actions">
            {isDemoMode && <span className="demo-badge">{messages.demoBadge}</span>}
            {!isDemoMode && statusLabel && (
              <span className={`data-status-badge is-${dataQuery.data?.meta.status}`}>
                {statusLabel}
              </span>
            )}
            {!isDemoMode && dataQuery.isError && (
              <span className="data-status-badge is-error" role="status">
                {dataQuery.error.message}
              </span>
            )}
            <button
              className="control-button data-coverage-button"
              type="button"
              onClick={openCoverageDialog}
            >
              {messages.dataCoverageButton}
            </button>
            <button
              className="control-button"
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={themeButtonLabel + ", " + messages.switchTheme}
              title={messages.switchTheme}
            >
              {themeButtonLabel}
            </button>
            <button
              className="control-button language-button"
              type="button"
              onClick={() => setLanguage(language === "en" ? "ur" : "en")}
              aria-label={languageButtonLabel + ", " + messages.switchLanguage}
              title={messages.switchLanguage}
            >
              {languageButtonLabel}
            </button>
          </div>
        </div>
      </header>

      <dialog
        className="data-coverage-dialog"
        ref={coverageDialogRef}
        aria-labelledby="data-coverage-title"
        aria-describedby="data-coverage-description"
      >
        <div className="data-coverage-dialog-content" lang={language} dir={language === "ur" ? "rtl" : "ltr"}>
          <div className="data-coverage-eyebrow">
            <MapPin aria-hidden="true" size={16} />
            <span>{messages.dataCoverageEyebrow}</span>
          </div>
          <h2 id="data-coverage-title">{messages.dataCoverageTitle}</h2>
          <p id="data-coverage-description">{messages.dataCoverageText}</p>
          <div className="data-coverage-location">
            {messages.dataCoverageArea}
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() => coverageDialogRef.current?.close()}
          >
            {messages.dataCoverageClose}
          </button>
        </div>
      </dialog>

      <div className="site-content">{children}</div>

      <footer className="site-footer">
        <div className="footer-inner">
          <Link className="footer-brand" href="/" aria-label={`${messages.brand} ${messages.country}`}>
            <Image
              className="brand-logo"
              src={logoSrc}
              width={292}
              height={56}
              alt=""
            />
          </Link>
          <div className="footer-credits">
            <div className="footer-credit-links">
              <a href="https://www.geoboundaries.org" target="_blank" rel="noopener noreferrer">
                {messages.footerBoundaries}
              </a>
              <Link href="/about">{messages.footerAbout}</Link>
              <Link href="/team">{messages.team}</Link>
            </div>
            {isDemoMode && <p className="footer-note">{messages.syntheticNotice}</p>}
          </div>
        </div>
      </footer>
    </div>
  );
}
