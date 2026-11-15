"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isDemoMode } from "@/lib/api/client";
import { getAreaIndicators } from "@/lib/api";
import { useMessages } from "@/hooks/use-messages";
import { useUiStore } from "@/store/ui-store";
import { LocalizedMetadataSync } from "@/components/layout/localized-metadata-sync";
import { CoverageDialog, type CoverageRequest } from "@/components/ui/CoverageDialog";

export function SiteFrame({ children }: Readonly<{ children: React.ReactNode }>) {
  const messages = useMessages();
  const pathname = usePathname();
  const router = useRouter();
  const [coverageRequest, setCoverageRequest] = useState<CoverageRequest>({ variant: "welcome" });
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
  function showCoverageDialog() {
    const dialog = document.querySelector<HTMLDialogElement>(".data-coverage-dialog");
    if (dialog && !dialog.open) dialog.showModal();
  }
  useEffect(() => {
    const handleCoverageRequest = (event: Event) => {
      const request = (event as CustomEvent<CoverageRequest>).detail;
      setCoverageRequest(request);
      showCoverageDialog();
    };
    window.addEventListener("earthguard:coverage", handleCoverageRequest);
    return () => window.removeEventListener("earthguard:coverage", handleCoverageRequest);
  }, []);

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

    if (!alreadyShown) {
      showCoverageDialog();
    }
  }, [pathname]);

  function openCoverageDialog() {
    const dialog = document.querySelector<HTMLDialogElement>(".data-coverage-dialog");
    if (dialog && !dialog.open) {
      setCoverageRequest({ variant: "welcome" });
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
                <span className="data-status-dot" aria-hidden="true" />
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

      <CoverageDialog
        variant={coverageRequest.variant}
        region={coverageRequest.region}
        message={coverageRequest.message}
        onExplore={() => {
          router.push("/explore?area=faisalabad&province=punjab&region=punjab");
        }}
        onClose={() => undefined}
      />

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
