"use client";

import { useState } from "react";
import { isDemoMode } from "@/lib/api/client";
import { useMessages } from "@/hooks/use-messages";
import {
  downloadChartPng,
  downloadChartsPng,
  downloadSeriesCsv,
  type ExportMetadata,
  type ExportSeries,
  downloadComparisonCsv,
  downloadImagePng,
  downloadIndicatorOverTimeCsv,
  downloadMapStatsCsv,
  downloadMapsPng,
  type ComparisonExportRow,
} from "@/lib/utils/data-export";
import type { AreaMaps } from "@/types/area-data";

type ExportMenuProps = {
  metadata: Omit<ExportMetadata, "isDemo">;
  series: ExportSeries[];
  chartId?: string;
  comparisonRows?: ComparisonExportRow[];
  imageSrc?: string;
  mapData?: AreaMaps;
  exportMode?: "year" | "indicators" | "maps" | "regions" | "explore";
  disabledReason?: string;
};

type ExportStatus = "png" | "csv" | "link" | "error" | null;

export function ExportMenu({
  metadata,
  series,
  chartId,
  comparisonRows,
  imageSrc,
  mapData,
  exportMode = "explore",
  disabledReason,
}: ExportMenuProps) {
  const messages = useMessages();
  const [status, setStatus] = useState<ExportStatus>(null);
  const hasData =
    disabledReason == null &&
    exportMode !== "regions" &&
    (exportMode !== "maps" || mapData !== undefined) &&
    (exportMode !== "explore" || series.length > 0);
  const exportMetadata: ExportMetadata = { ...metadata, isDemo: isDemoMode };

  async function exportPng() {
    try {
      const chartCandidates = Array.from(
        document.querySelectorAll<SVGSVGElement>("[data-export-chart] svg"),
      ).filter((chart) => !chartId || chart.closest("[data-export-chart]")?.getAttribute("data-export-chart") === chartId);
      const availableCharts = chartCandidates.filter((chart) => {
        const bounds = chart.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0;
      });
      const visibleCharts = availableCharts.filter(
        (candidate) => getComputedStyle(candidate).visibility !== "hidden",
      );
      const charts = (visibleCharts.length > 0 ? visibleCharts : availableCharts).sort(
        (left, right) => {
          const leftBounds = left.getBoundingClientRect();
          const rightBounds = right.getBoundingClientRect();
          return rightBounds.width * rightBounds.height - leftBounds.width * leftBounds.height;
        },
      );
      if (exportMode === "maps" && mapData) {
        await downloadMapsPng(mapData, exportMetadata, metadata.statusLabel ?? "");
        setStatus("png");
        return;
      }
      if (charts.length === 0) {
        if (!imageSrc) {
          throw new Error("No rendered chart is available to export.");
        }
        await downloadImagePng(imageSrc, metadata.fileName);
        setStatus("png");
        return;
      }

      const labels = {
        dataCredit: messages.exportDataCredit,
        demoLabel: messages.demoBadge,
        period: messages.exportPeriod,
        region: messages.exportRegion,
        unit: messages.exportUnit,
        variable: messages.exportVariable,
        area: messages.exportArea,
        status: messages.exportStatus,
      };
      if (charts.length > 1) {
        await downloadChartsPng(charts, exportMetadata, labels);
      } else {
        await downloadChartPng(charts[0], exportMetadata, series, labels);
      }
      setStatus("png");
    } catch (error) {
      console.error("Could not export chart as PNG.", error);
      setStatus("error");
    }
  }

  function exportCsv() {
    try {
      if (comparisonRows) {
        downloadComparisonCsv(comparisonRows, metadata.fileName);
        setStatus("csv");
        return;
      }
      if (exportMode === "maps" && mapData) {
        downloadMapStatsCsv(mapData, metadata.fileName, metadata.areaLabel ?? metadata.regionLabel, metadata.statusLabel ?? "");
        setStatus("csv");
        return;
      }
      if (exportMode === "indicators") {
        downloadIndicatorOverTimeCsv(
          series,
          metadata.fileName,
          metadata.source,
          metadata.statusLabel ?? "",
          metadata.areaLabel ?? metadata.regionLabel,
        );
        setStatus("csv");
        return;
      }
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
          validMonths: messages.validMonths,
          status: messages.exportStatus,
          area: messages.exportArea,
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
          <button type="button" onClick={() => void exportPng()} disabled={!hasData} title={disabledReason}>
            {messages.exportPng}
          </button>
          <button type="button" onClick={exportCsv} disabled={!hasData} title={disabledReason}>
            {messages.exportCsv}
          </button>
          <button type="button" onClick={() => void copyLink()}>
            {messages.filterCopyLink}
          </button>
        </div>
      </details>
      {status && (
        <div className={`export-toast${status === "error" ? " is-error" : ""}`}>
          <p className="export-status" role={status === "error" ? "alert" : "status"} aria-live="polite">
            {statusText[status]}
          </p>
          <button type="button" aria-label="Dismiss export notification" onClick={() => setStatus(null)}>×</button>
        </div>
      )}
    </div>
  );
}
