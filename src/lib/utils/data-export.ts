import type { AreaMaps } from "@/types/area-data";

export type ExportPoint = {
  date: string;
  value: number | null;
  valid_months?: number | null;
};

export type ExportSeries = {
  label: string;
  unit: string;
  points: ExportPoint[];
  resolution?: "monthly" | "yearly";
};

export type ComparisonExportRow = {
  area: string;
  indicator: string;
  previousYear: number;
  previousValue: number | null;
  year: number;
  value: number | null;
  difference: number | null;
  percentDifference: number | null;
  unit: string;
  source: string;
  status: string;
};

export type ExportMetadata = {
  fileName: string;
  title: string;
  variableLabel: string;
  regionLabel: string;
  unitLabel: string;
  yearRangeLabel: string;
  source: string;
  demoLabel: string;
  areaLabel?: string;
  statusLabel?: string;
  isDemo: boolean;
};

function safeFileName(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "earthguard-export";
}

function quoteCsvCell(value: string | number): string {
  const text = String(value).replace(/[\r\n]+/g, " ");
  const safeText = typeof value === "string" && /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
}

export function downloadSeriesCsv(
  metadata: ExportMetadata,
  series: ExportSeries[],
  labels: {
    metadata: string;
    source: string;
    variable: string;
    region: string;
    unit: string;
    yearRange: string;
    date: string;
    validMonths: string;
    status: string;
    area: string;
  },
): void {
  if (!metadata.isDemo) {
    const source = metadata.source;
    const area = metadata.areaLabel ?? metadata.regionLabel;
    const status = metadata.statusLabel ?? "";
    const rows: Array<Array<string | number>> = [
      ["area", "indicator", "year", "month", "value", "unit", "valid_months", "source file", "status"],
    ];
    for (const item of series) {
      for (const point of item.points) {
        const [year, month] = point.date.split("-");
        rows.push([
          area,
          item.label,
          Number(year),
          item.resolution === "monthly" ? Number(month) : "",
          point.value ?? "",
          item.unit,
          point.valid_months ?? "",
          source,
          status,
        ]);
      }

    }

    const content = `\uFEFF${rows.map((row) => row.map(quoteCsvCell).join(",")).join("\r\n")}`;
    downloadBlob(
      new Blob([content], { type: "text/csv;charset=utf-8" }),
      `${safeFileName(metadata.fileName)}.csv`,
    );
    return;
  }

  const validityColumns = series.map((item) =>
    item.points.some((point) => point.valid_months !== undefined),
  );
  const columnOffsets = validityColumns.map((_, index) =>
    validityColumns.slice(0, index).reduce((count, hasValidity) => count + (hasValidity ? 2 : 1), 0),
  );
  const valueColumnCount = validityColumns.reduce(
    (count, hasValidity) => count + (hasValidity ? 2 : 1),
    0,
  );
  const valuesByDate = new Map<string, Array<number | string>>();

  for (const [seriesIndex, item] of series.entries()) {
    for (const point of item.points) {
      const values =
        valuesByDate.get(point.date) ?? Array.from({ length: valueColumnCount }, () => "");
      const offset = columnOffsets[seriesIndex] ?? 0;
      values[offset] = point.value ?? "";
      if (validityColumns[seriesIndex]) {
        values[offset + 1] = point.valid_months ?? "";
      }
      valuesByDate.set(point.date, values);
    }
  }

  const source = metadata.isDemo ? metadata.demoLabel : metadata.source;
  const rows: Array<Array<string | number>> = [
    [labels.metadata, metadata.title],
    [labels.source, source],
    ...(metadata.areaLabel ? [[labels.area, metadata.areaLabel]] : []),
    ...(metadata.statusLabel ? [[labels.status, metadata.statusLabel]] : []),
    [labels.variable, metadata.variableLabel],
    [labels.region, metadata.regionLabel],
    [labels.unit, metadata.unitLabel],
    [labels.yearRange, metadata.yearRangeLabel],
    [],
    [
      labels.date,
      ...series.flatMap((item, index) => [
        `${item.label} (${item.unit})`,
        ...(validityColumns[index] ? [`${item.label} — ${labels.validMonths}`] : []),
      ]),
    ],
    ...Array.from(valuesByDate.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, values]) => [date, ...values]),
  ];
  const content = `\uFEFF${rows.map((row) => row.map(quoteCsvCell).join(",")).join("\r\n")}`;
  const suffix = metadata.isDemo ? "-demo-synthetic" : "";
  downloadBlob(
    new Blob([content], { type: "text/csv;charset=utf-8" }),
    `${safeFileName(metadata.fileName)}${suffix}.csv`,
  );
}

function waitForImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The chart SVG could not be rendered for export."));
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("The browser could not create the PNG image."));
      }
    }, "image/png");
  });
}

export function downloadComparisonCsv(rows: ComparisonExportRow[], fileName: string): void {
  const header = [
    "area",
    "indicator",
    "previous_year",
    "previous_value",
    "year",
    "value",
    "difference",
    "percent_difference",
    "unit",
    "source file",
    "status",
  ];
  const content = `\uFEFF${[
    header,
    ...rows.map((row) => [
      row.area,
      row.indicator,
      row.previousYear,
      row.previousValue ?? "",
      row.year,
      row.value ?? "",
      row.difference ?? "",
      row.percentDifference ?? "",
      row.unit,
      row.source,
      row.status,
    ]),
  ].map((row) => row.map(quoteCsvCell).join(",")).join("\r\n")}`;
  downloadBlob(new Blob([content], { type: "text/csv;charset=utf-8" }), `${safeFileName(fileName)}.csv`);
}

export function downloadIndicatorOverTimeCsv(
  series: ExportSeries[],
  fileName: string,
  source: string,
  status: string,
  area: string,
): void {
  const byYear = new Map<number, Array<number | string>>();
  for (const [index, item] of series.entries()) {
    for (const point of item.points) {
      const year = Number(point.date.slice(0, 4));
      const values = byYear.get(year) ?? Array.from({ length: 9 }, () => "");
      values[index] = point.value ?? "";
      values[index + 3] = item.unit;
      values[index + 6] = point.valid_months ?? "";
      byYear.set(year, values);
    }
  }
  const rows: Array<Array<string | number>> = [
    ["year", "LST", "rainfall", "NDVI", "LST_unit", "rainfall_unit", "NDVI_unit", "LST_valid_months", "rainfall_valid_months", "NDVI_valid_months", "area", "source", "status"],
    ...Array.from(byYear.entries()).sort(([left], [right]) => left - right).map(([year, values]) => [year, ...values, area, source, status]),
  ];
  const content = `\uFEFF${rows.map((row) => row.map(quoteCsvCell).join(",")).join("\r\n")}`;
  downloadBlob(new Blob([content], { type: "text/csv;charset=utf-8" }), `${safeFileName(fileName)}.csv`);
}

export function downloadMapStatsCsv(maps: AreaMaps, fileName: string, area: string, status: string): void {
  const rows: Array<Array<string | number>> = [
    ["area", "map", "year", "min", "mean", "max", "unit", "source file", "status"],
    ["Faisalabad", "Land surface temperature", 2001, maps.images.lst_2001.stats.min, maps.images.lst_2001.stats.mean, maps.images.lst_2001.stats.max, maps.images.lst_2001.unit, maps.images.lst_2001.source_file, status],
    ["Faisalabad", "Land surface temperature", 2024, maps.images.lst_2024.stats.min, maps.images.lst_2024.stats.mean, maps.images.lst_2024.stats.max, maps.images.lst_2024.unit, maps.images.lst_2024.source_file, status],
    [area, "Land surface temperature change", "2001-2024", maps.images.lst_change.stats.min, maps.images.lst_change.stats.mean, maps.images.lst_change.stats.max, maps.images.lst_change.unit, maps.images.lst_change.source_file, status],
  ];
  const content = `\uFEFF${rows.map((row) => row.map(quoteCsvCell).join(",")).join("\r\n")}`;
  downloadBlob(new Blob([content], { type: "text/csv;charset=utf-8" }), `${safeFileName(fileName)}.csv`);
}

async function loadMapImage(file: string): Promise<HTMLImageElement> {
  return waitForImage(`/data/areas/faisalabad/maps/${file}`);
}

export async function downloadMapsPng(
  maps: AreaMaps,
  metadata: ExportMetadata,
  status: string,
): Promise<void> {
  const [start, end, change] = await Promise.all([
    loadMapImage(maps.images.lst_2001.file),
    loadMapImage(maps.images.lst_2024.file),
    loadMapImage(maps.images.lst_change.file),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = 2400;
  canvas.height = 1500;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The browser could not prepare a canvas for map export.");
  const rootStyle = getComputedStyle(document.documentElement);
  context.fillStyle = rootStyle.getPropertyValue("--surface").trim();
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = rootStyle.getPropertyValue("--text").trim();
  context.font = `600 42px ${getComputedStyle(document.body).fontFamily}`;
  context.fillText(metadata.title, 60, 70);
  context.font = `24px ${getComputedStyle(document.body).fontFamily}`;
  context.fillStyle = rootStyle.getPropertyValue("--muted").trim();
  context.fillText(`Faisalabad · 2001 vs 2024 · ${maps.images.lst_2001.unit} · ${status}`, 60, 112);
  context.fillText(`Same color scale in both maps · ${maps.images.lst_2001.source_file}`, 60, 150);
  const drawWidth = 680;
  const drawHeight = 720;
  context.drawImage(start, 60, 210, drawWidth, drawHeight);
  context.drawImage(end, 860, 210, drawWidth, drawHeight);
  context.drawImage(change, 1660, 210, drawWidth, drawHeight);
  context.fillStyle = rootStyle.getPropertyValue("--text").trim();
  context.font = `600 28px ${getComputedStyle(document.body).fontFamily}`;
  context.fillText("2001", 60, 970);
  context.fillText("2024", 860, 970);
  context.fillText("Change, 2001 to 2024", 1660, 970);
  const gradient = context.createLinearGradient(60, 1040, 1260, 1040);
  maps.images.lst_2001.legend_stops.forEach((stop, index, stops) => {
    gradient.addColorStop(index / (stops.length - 1), stop);
  });
  context.fillStyle = gradient;
  context.fillRect(60, 1040, 1200, 28);
  context.fillStyle = rootStyle.getPropertyValue("--muted").trim();
  context.font = `22px ${getComputedStyle(document.body).fontFamily}`;
  context.fillText(`${maps.images.lst_2001.vmin.toFixed(1)} ${maps.images.lst_2001.unit}`, 60, 1105);
  context.fillText(`${maps.images.lst_2001.vmax.toFixed(1)} ${maps.images.lst_2001.unit}`, 1010, 1105);
  context.fillText(`Source: ${maps.images.lst_change.source_file} · Status: ${status}`, 60, 1190);
  const blob = await canvasToBlob(canvas);
  downloadBlob(blob, `${safeFileName(metadata.fileName)}.png`);
}

export async function downloadImagePng(imageSource: string, fileName: string): Promise<void> {
  const image = await waitForImage(imageSource);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("The browser could not create an image canvas.");
  }
  context.drawImage(image, 0, 0);
  const blob = await canvasToBlob(canvas);
  downloadBlob(blob, `${safeFileName(fileName)}.png`);
}

export async function downloadChartsPng(
  charts: SVGSVGElement[],
  metadata: ExportMetadata,
  labels: {
    dataCredit: string;
    period: string;
    region: string;
    status?: string;
  },
): Promise<void> {
  if (charts.length === 0) throw new Error("No rendered charts are available to export.");
  const imageUrls: string[] = [];
  const images = await Promise.all(
    charts.map(async (svg) => {
      const clone = svg.cloneNode(true) as SVGSVGElement;
      const bounds = svg.getBoundingClientRect();
      const width = Number(svg.getAttribute("width")) || bounds.width;
      const height = Number(svg.getAttribute("height")) || bounds.height;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("width", String(width));
      clone.setAttribute("height", String(height));
      clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
      const rootStyle = getComputedStyle(document.documentElement);
      for (const token of ["accent", "border", "heat", "muted", "text"]) {
        clone.style.setProperty(`--${token}`, rootStyle.getPropertyValue(`--${token}`).trim());
      }
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" }));
      imageUrls.push(url);
      return { image: await waitForImage(url), width, height };
    }),
  );
  const logicalWidth = Math.max(600, images.reduce((total, item) => total + item.width, 0));
  const logicalHeight = Math.max(...images.map((item) => item.height), 300) + 100;
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1200, Math.ceil(logicalWidth * scale));
  canvas.height = Math.ceil(logicalHeight * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The browser could not prepare a canvas for chart export.");
  const rootStyle = getComputedStyle(document.documentElement);
  context.scale(scale, scale);
  context.fillStyle = rootStyle.getPropertyValue("--surface").trim();
  context.fillRect(0, 0, logicalWidth, logicalHeight);
  context.fillStyle = rootStyle.getPropertyValue("--text").trim();
  context.font = `600 18px ${getComputedStyle(document.body).fontFamily}`;
  context.fillText(metadata.title, 20, 27);
  context.font = `12px ${getComputedStyle(document.body).fontFamily}`;
  context.fillStyle = rootStyle.getPropertyValue("--muted").trim();
  context.fillText(`${labels.region}: ${metadata.regionLabel} · ${labels.period}: ${metadata.yearRangeLabel} · ${labels.dataCredit}: ${metadata.source} · ${labels.status ?? "Status"}: ${metadata.statusLabel ?? ""}`, 20, 52);
  let x = 0;
  for (const item of images) {
    context.drawImage(item.image, x, 80, item.width, item.height);
    x += item.width;
  }
  const blob = await canvasToBlob(canvas);
  imageUrls.forEach((url) => URL.revokeObjectURL(url));
  downloadBlob(blob, `${safeFileName(metadata.fileName)}.png`);
}

export async function downloadChartPng(
  svg: SVGSVGElement,
  metadata: ExportMetadata,
  series: ExportSeries[],
  labels: {
    dataCredit: string;
    demoLabel: string;
    period: string;
    region: string;
    unit: string;
    variable: string;
    area?: string;
    status?: string;
  },
): Promise<void> {
  const bounds = svg.getBoundingClientRect();
  const width = Number(svg.getAttribute("width")) || bounds.width;
  const height = Number(svg.getAttribute("height")) || bounds.height;
  if (width <= 0 || height <= 0) {
    throw new Error("The visible chart has no drawable size.");
  }

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  if (!clone.hasAttribute("viewBox")) {
    clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }

  const rootStyle = getComputedStyle(document.documentElement);
  for (const token of ["accent", "border", "heat", "muted", "text"]) {
    clone.style.setProperty(`--${token}`, rootStyle.getPropertyValue(`--${token}`).trim());
  }
  const sourceText = svg.querySelectorAll("text");
  const clonedText = clone.querySelectorAll("text");
  sourceText.forEach((element, index) => {
    const copy = clonedText[index];
    if (!copy) {
      return;
    }
    const style = getComputedStyle(element);
    copy.setAttribute("fill", style.fill);
    copy.setAttribute("font-family", style.fontFamily);
    copy.setAttribute("font-size", style.fontSize);
    copy.setAttribute("font-weight", style.fontWeight);
    copy.setAttribute("text-anchor", style.textAnchor);
    copy.setAttribute("direction", style.direction);
  });

  const svgUrl = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(clone)], {
      type: "image/svg+xml;charset=utf-8",
    }),
  );

  try {
    const image = await waitForImage(svgUrl);
    const scale = 2;
    const headerHeight = 256;
    const canvas = document.createElement("canvas");
    const exportWidth = Math.max(width, 600);
    canvas.width = Math.ceil(exportWidth * scale);
    canvas.height = Math.ceil((height + headerHeight) * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("The browser could not prepare a canvas for chart export.");
    }

    context.scale(scale, scale);
    context.fillStyle = rootStyle.getPropertyValue("--surface").trim();
    context.fillRect(0, 0, exportWidth, height + headerHeight);
    context.fillStyle = rootStyle.getPropertyValue("--text").trim();
    context.font = `600 18px ${getComputedStyle(document.body).fontFamily}`;
    context.fillText(metadata.title, 20, 27, exportWidth - 40);

    const details = [
      `${labels.variable}: ${metadata.variableLabel}`,
      `${labels.region}: ${metadata.regionLabel}`,
      ...(metadata.areaLabel ? [`${labels.area ?? "Area"}: ${metadata.areaLabel}`] : []),
      `${labels.unit}: ${metadata.unitLabel}`,
      `${labels.period}: ${metadata.yearRangeLabel}`,
      `${labels.dataCredit}: ${metadata.isDemo ? metadata.demoLabel : metadata.source}`,
      ...(metadata.statusLabel ? [`${labels.status ?? "Data status"}: ${metadata.statusLabel}`] : []),
    ];
    context.font = `12px ${getComputedStyle(document.body).fontFamily}`;
    context.fillStyle = rootStyle.getPropertyValue("--muted").trim();
    details.forEach((line, index) => {
      context.fillText(line, 20, 51 + index * 18, exportWidth - 40);
    });
    const dashPatterns: number[][] = [[], [6, 4], [2, 3], [8, 3, 2, 3]];
    series.forEach((item, index) => {
      const y = 180 + index * 16;
      context.beginPath();
      context.strokeStyle = rootStyle
        .getPropertyValue(`--chart-series-${(index % 4) + 1}`)
        .trim();
      context.lineWidth = 2;
      context.setLineDash(dashPatterns[index % dashPatterns.length] ?? []);
      context.moveTo(20, y);
      context.lineTo(42, y);
      context.stroke();
      context.setLineDash([]);
      context.fillStyle = rootStyle.getPropertyValue("--text").trim();
      context.fillText(`${item.label} (${item.unit})`, 50, y + 4, width - 70);
    });

    if (metadata.isDemo) {
      const badgeWidth = Math.min(exportWidth - 40, context.measureText(labels.demoLabel).width + 20);
      context.fillStyle = rootStyle.getPropertyValue("--primary").trim();
      context.fillRect(exportWidth - badgeWidth - 20, 10, badgeWidth, 24);
      context.fillStyle = rootStyle.getPropertyValue("--background").trim();
      context.font = `600 10px ${getComputedStyle(document.body).fontFamily}`;
      context.fillText(labels.demoLabel, exportWidth - badgeWidth - 10, 26, badgeWidth - 10);
    }

    context.drawImage(image, 0, headerHeight, width, height);
    const blob = await canvasToBlob(canvas);
    const suffix = metadata.isDemo ? "-demo.png" : ".png";
    downloadBlob(blob, `${safeFileName(metadata.fileName)}${suffix}`);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
