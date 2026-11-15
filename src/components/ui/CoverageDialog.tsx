"use client";

import { CloudRain, Info, Leaf, MapPinOff, Thermometer } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useMessages } from "@/hooks/use-messages";
import { useUiStore } from "@/store/ui-store";

export type CoverageDialogVariant = "welcome" | "no-data";

type CoverageDialogProps = {
  variant: CoverageDialogVariant;
  region?: string;
  message?: string;
  onExplore: () => void;
  onClose: () => void;
};

const indicators = [
  ["landSurfaceTemperature", Thermometer],
  ["rainfall", CloudRain],
  ["ndvi", Leaf],
] as const;

export const CoverageDialog = forwardRef<HTMLDialogElement, CoverageDialogProps>(function CoverageDialog(
  { variant, region = "This area", message, onExplore, onClose },
  forwardedRef,
) {
  const messages = useMessages();
  const language = useUiStore((state) => state.language);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);

  useImperativeHandle(forwardedRef, () => dialogRef.current as HTMLDialogElement, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleBeforeToggle = (event: Event) => {
      const newState = (event as Event & { newState?: string }).newState;
      if (newState === "open" && document.activeElement instanceof HTMLElement) {
        lastTrigger.current = document.activeElement;
      }
    };
    const handleToggle = () => {
      if (dialog.open) {
        dialog.querySelector<HTMLElement>(".coverage-dialog-content")?.focus({ preventScroll: true });
      }
    };
    const handleClose = () => {
      onClose();
      lastTrigger.current?.focus();
    };
    dialog.addEventListener("beforetoggle", handleBeforeToggle);
    dialog.addEventListener("toggle", handleToggle);
    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("beforetoggle", handleBeforeToggle);
      dialog.removeEventListener("toggle", handleToggle);
      dialog.removeEventListener("close", handleClose);
    };
  }, [onClose]);

  function close() {
    dialogRef.current?.close();
  }

  function explore() {
    onExplore();
    close();
  }

  return (
    <dialog
      ref={dialogRef}
      className={`coverage-dialog data-coverage-dialog coverage-dialog-${variant}`}
      aria-labelledby="coverage-dialog-title"
      aria-describedby="coverage-dialog-description"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div
        className="coverage-dialog-content"
        lang={language}
        dir={language === "ur" ? "rtl" : "ltr"}
        tabIndex={-1}
        autoFocus
      >
        <div className="coverage-dialog-header">
          <div className="coverage-dialog-icon" aria-hidden="true">
            {variant === "welcome" ? <Info size={20} /> : <MapPinOff size={20} />}
          </div>
          <h2 id="coverage-dialog-title">
            {variant === "welcome" ? messages.dataCoverageTitle : messages.noDataDialogTitle}
          </h2>
          <button
            className="coverage-dialog-close"
            type="button"
            aria-label="Close"
            onClick={close}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <p id="coverage-dialog-description">
          {variant === "welcome"
            ? messages.dataCoverageText
            : message ?? messages.noDataDialogText.replace("{region}", region)}
        </p>
        {variant === "welcome" && (
          <div className="data-coverage-location">{messages.dataCoverageArea}</div>
        )}
        {variant === "welcome" && (
          <div className="coverage-indicator-chips" aria-label={messages.dataCoverageIndicators}>
            {indicators.map(([key, Icon]) => (
              <span className="coverage-indicator-chip" key={key}>
                <Icon aria-hidden="true" size={15} />
                {messages[key]}
              </span>
            ))}
          </div>
        )}
        <div className="coverage-dialog-actions">
          {variant === "welcome" ? (
            <button className="primary-button" type="button" onClick={explore}>
              {messages.dataCoverageExplore}
            </button>
          ) : (
            <button className="primary-button" type="button" onClick={explore}>
              {messages.noDataDialogExplore}
            </button>
          )}
          <button className="control-button coverage-dialog-secondary" type="button" onClick={close}>
            {messages.dataCoverageClose}
          </button>
        </div>
      </div>
    </dialog>
  );
});

export function requestCoverageDialog(variant: CoverageDialogVariant, region?: string, message?: string) {
  window.dispatchEvent(new CustomEvent("earthguard:coverage", { detail: { variant, region, message } }));
}

export type CoverageRequest = { variant: CoverageDialogVariant; region?: string; message?: string };
