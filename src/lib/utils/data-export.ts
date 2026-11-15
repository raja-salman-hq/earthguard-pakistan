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
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil((height + headerHeight) * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("The browser could not prepare a canvas for chart export.");
    }

    context.scale(scale, scale);
    context.fillStyle = rootStyle.getPropertyValue("--surface").trim();
    context.fillRect(0, 0, width, height + headerHeight);
    context.fillStyle = rootStyle.getPropertyValue("--text").trim();
    context.font = `600 18px ${getComputedStyle(document.body).fontFamily}`;
    context.fillText(metadata.title, 20, 27, width - 40);

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
      context.fillText(line, 20, 51 + index * 18, width - 40);
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
      const badgeWidth = Math.min(width - 40, context.measureText(labels.demoLabel).width + 20);
      context.fillStyle = rootStyle.getPropertyValue("--primary").trim();
      context.fillRect(width - badgeWidth - 20, 10, badgeWidth, 24);
      context.fillStyle = rootStyle.getPropertyValue("--background").trim();
      context.font = `600 10px ${getComputedStyle(document.body).fontFamily}`;
      context.fillText(labels.demoLabel, width - badgeWidth - 10, 26, badgeWidth - 10);
    }

    context.drawImage(image, 0, headerHeight, width, height);
    const blob = await canvasToBlob(canvas);
    const suffix = metadata.isDemo ? "-demo.png" : ".png";
    downloadBlob(blob, `${safeFileName(metadata.fileName)}${suffix}`);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
