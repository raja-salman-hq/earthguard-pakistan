"use client";

import { useState } from "react";
import { isDemoMode } from "@/lib/api/client";
import { useMessages } from "@/hooks/use-messages";
import {
  downloadChartPng,
  downloadSeriesCsv,
  type ExportMetadata,
  type ExportSeries,
} from "@/lib/utils/data-export";

type ExportMenuProps = {
  metadata: Omit<ExportMetadata, "isDemo">;
  series: ExportSeries[];
};

type ExportStatus = "png" | "csv" | "link" | "error" | null;

export function ExportMenu({ metadata, series }: ExportMenuProps) {
  const messages = useMessages();
  const [status, setStatus] = useState<ExportStatus>(null);
  const hasData = series.some((item) => item.points.length > 0);
  const exportMetadata: ExportMetadata = { ...metadata, isDemo: isDemoMode };

  async function exportPng() {
    try {
      const charts = Array.from(
        document.querySelectorAll<SVGSVGElement>("[data-export-chart] svg"),
      );
      const visibleChart = charts.find((chart) => {
        const bounds = chart.getBoundingClientRect();
        return (
          bounds.width > 0 &&
          bounds.height > 0 &&
          getComputedStyle(chart).visibility !== "hidden"
        );
      });
      if (!visibleChart) {
        throw new Error("No visible chart is available to export.");
      }

      await downloadChartPng(visibleChart, exportMetadata, series, {
        dataCredit: messages.exportDataCredit,
        demoLabel: messages.demoBadge,
        period: messages.exportPeriod,
        region: messages.exportRegion,
        unit: messages.exportUnit,
        variable: messages.exportVariable,
      });
      setStatus("png");
    } catch (error) {
      console.error("Could not export chart as PNG.", error);
      setStatus("error");
    }
  }

  function exportCsv() {
    try {
      downloadSeriesCsv(
        {
          ...exportMetadata,
        },
        series,
        {
          metadata: messages.exportMetadata,
          source: messages.exportDataCredit,
          variable: messages.exportVariable,
          region: messages.exportRegion,
          unit: messages.exportUnit,
          yearRange: messages.exportPeriod,
          date: messages.trendTableDate,
        },
      );
      setStatus("csv");
    } catch (error) {
      console.error("Could not export visible data as CSV.", error);
      setStatus("error");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus("link");
    } catch (error) {
      console.error("Could not copy the shareable comparison link.", error);
      setStatus("error");
    }
  }

  const statusText = {
    png: messages.exportPngSuccess,
    csv: messages.exportCsvSuccess,
    link: messages.filterLinkCopied,
    error: messages.exportError,
  } as const;

  return (
    <div className="export-menu">
      <details>
        <summary>{messages.exportMenu}</summary>
        <div className="export-menu-items">
          <button type="button" onClick={() => void exportPng()} disabled={!hasData}>
            {messages.exportPng}
          </button>
          <button type="button" onClick={exportCsv} disabled={!hasData}>
            {messages.exportCsv}
          </button>
          <button type="button" onClick={() => void copyLink()}>
            {messages.filterCopyLink}
          </button>
        </div>
      </details>
      {status && (
        <p className={status === "error" ? "export-status is-error" : "export-status"} role={status === "error" ? "alert" : "status"}>
          {statusText[status]}
        </p>
      )}
    </div>
  );
}
