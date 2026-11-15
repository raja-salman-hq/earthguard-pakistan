import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { areaIndicatorsSchema } from "@/types/area-data";

const routes = [
  { path: "/", name: "home", status: 200 },
  { path: "/explore", name: "explore", status: 200 },
  { path: "/compare", name: "compare", status: 200 },
  { path: "/about", name: "about", status: 200 },
  { path: "/team", name: "team", status: 200 },
  { path: "/quality-check-404", name: "404", status: 404 },
] as const;
const realDataMode = process.env.NEXT_PUBLIC_USE_MOCK !== "true";

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function stubBasemap(page: Page): Promise<void> {
  await page.route(
    "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({
          version: 8,
          sources: {},
          layers: [
            {
              id: "test-background",
              type: "background",
              paint: { "background-color": "#0b1220" },
            },
          ],
        }),
      }),
  );
}

async function stubWeather(page: Page): Promise<void> {
  await page.route("https://api.open-meteo.com/v1/forecast**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        timezone_abbreviation: "GMT+5",
        current: {
          temperature_2m: 31.4,
          apparent_temperature: 34.2,
        },
      }),
    }),
  );
}

async function dismissCoverageDialog(page: Page, expectToOpen = true): Promise<void> {
  const dialog = page.locator(".data-coverage-dialog");
  const pathname = new URL(page.url()).pathname;
  const shouldAutoOpen = pathname === "/" || pathname === "/explore";
  if (expectToOpen && shouldAutoOpen) {
    await expect(dialog).toBeVisible();
  }
  if (await dialog.isVisible()) {
    await dialog.locator(".coverage-dialog-actions .control-button").click();
  }
}

test.describe("production route smoke checks", () => {
  for (const route of routes) {
    test(route.name + " loads without browser errors", async ({ page }) => {
      const errors = collectConsoleErrors(page);
      if (route.path === "/explore") {
        await stubBasemap(page);
      }
      if (route.path === "/" || route.path === "/compare") {
        await stubWeather(page);
      }
      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await dismissCoverageDialog(page);

      expect(response?.status()).toBe(route.status);
      await expect(page.locator("main h1").first()).toBeVisible();
      const unexpectedErrors =
        route.status === 404
          ? errors.filter((error) => !error.includes("Failed to load resource: the server responded with a status of 404 (Not Found)"))
          : errors;
      expect(unexpectedErrors).toEqual([]);
    });
  }

  test("explore controls and chart remain responsive", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await stubBasemap(page);
    await page.goto("/explore", { waitUntil: "domcontentloaded" });
    await dismissCoverageDialog(page);

    const regionSelect = page.locator("details.map-region-panel select");
    await expect(regionSelect).toBeVisible();
    const selectedLocation = realDataMode ? "faisalabad" : "sindh";
    await regionSelect.selectOption(selectedLocation);
    await expect(regionSelect).toHaveValue(selectedLocation);
    await expect(page.locator(".trend-chart-content h3")).toContainText(
      realDataMode ? "Faisalabad" : "Sindh",
    );

    await page.getByLabel("Environmental variable").selectOption("precipitation");
    if (realDataMode) {
      await expect(page.locator(".map-legend strong")).toContainText("Faisalabad District");
      await expect(page.locator(".data-status-badge")).toContainText("Draft data");
    } else {
      await expect(page.locator(".map-legend strong")).toContainText("Precipitation");
    }
    await expect(page.locator(".trend-chart-plot svg").first()).toBeVisible();

    const playButton = page.locator(".timeline-play-button");
    await playButton.click();
    await expect(playButton).toHaveAttribute("aria-label", "Pause timeline");
    await playButton.click();
    await expect(playButton).toHaveAttribute("aria-label", "Play timeline");

    const themeButton = page.locator(
      ".header-actions .control-button:not(.data-coverage-button):not(.language-button)",
    );
    await themeButton.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await themeButton.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    const languageButton = page.locator(".language-button");
    await languageButton.click();
    await expect(page.locator("html")).toHaveAttribute("lang", "ur");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await languageButton.click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

    expect(errors).toEqual([]);
  });

  test("landing variable cards open Explore with the selected variable", async ({ page }) => {
    await stubBasemap(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await dismissCoverageDialog(page);
    const variableCard = page.locator(".home-variable-card").filter({ hasText: "Precipitation" });
    await expect(variableCard).toBeVisible();
    await variableCard.click();
    await expect(page).toHaveURL(/\/explore\?variable=precipitation/);
    await expect(page.getByLabel("Environmental variable")).toHaveValue("precipitation");
  });

  test("landing language and theme toggles update the static page copy", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await dismissCoverageDialog(page);
    const title = page.locator(".home-hero-copy h1");
    await expect(title).toContainText(
      realDataMode ? "Explore the Faisalabad data pilot" : "See how Pakistan's environment has changed",
    );
    await page.locator(".language-button").click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(title).toContainText(
      realDataMode
        ? "فیصل آباد ڈیٹا پائلٹ دیکھیں"
        : "دیکھیں پاکستان کا ماحول وقت کے ساتھ کیسے بدلا ہے",
    );

    const themeButton = page.locator(
      ".header-actions .control-button:not(.data-coverage-button):not(.language-button)",
    );
    await themeButton.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await themeButton.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("landing shows real indicator cards and mocked live weather", async ({ page }) => {
    test.skip(!realDataMode, "Real landing data is exercised with NEXT_PUBLIC_USE_MOCK=false.");
    await stubWeather(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await dismissCoverageDialog(page);
    await expect(page.locator(".home-real-fact-card")).toHaveCount(3);
    await expect(page.locator(".home-real-fact-card").first()).toContainText("2024");
    await expect(page.locator(".live-now-card")).toContainText("31.4°C");
    await expect(page.locator(".home-page .demo-badge")).toHaveCount(0);
  });

  test("data coverage dialog opens on direct entry, is dismissible once, and reopens from the header", async ({ page }) => {
    await stubWeather(page);
    await page.goto("/explore", { waitUntil: "domcontentloaded" });
    const dialog = page.getByRole("dialog", { name: "Data coverage" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Faisalabad District");
    await expect(dialog.locator(".data-coverage-location")).toContainText("Punjab");
    await expect(dialog).toHaveCSS("border-radius", "20px");
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(Math.abs((dialogBox?.x ?? 0) + (dialogBox?.width ?? 0) / 2 - page.viewportSize()!.width / 2)).toBeLessThanOrEqual(2);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await page.goto("/team", { waitUntil: "domcontentloaded" });
    await expect(dialog).not.toBeVisible();
    await page.getByRole("button", { name: "Data coverage" }).click();
    await expect(dialog).toBeVisible();
    await dialog.locator(".coverage-dialog-secondary").click();
    await expect(dialog).not.toBeVisible();
  });

  test("real coverage hierarchy opens Punjab cities and Faisalabad study area", async ({ page }) => {
    test.skip(!realDataMode, "Coverage hierarchy is specific to real mode.");
    await stubBasemap(page);
    await page.goto("/explore", { waitUntil: "domcontentloaded" });
    await dismissCoverageDialog(page);

    await page.locator("details.map-region-panel select").selectOption("punjab");
    await expect(page.getByRole("heading", { name: "Punjab areas" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Lahore.*No data yet/ })).toBeVisible();
    await page.getByRole("button", { name: /Open Faisalabad/ }).click();
    await expect(page.locator(".map-breadcrumb")).toContainText("Faisalabad");
    await expect(page.locator(".map-coverage-legend, .map-legend")).toBeVisible();
  });

  test("real mode shows no-data dialog for a coming-soon city", async ({ page }) => {
    test.skip(!realDataMode, "Coverage hierarchy is specific to real mode.");
    await stubBasemap(page);
    await page.goto("/explore", { waitUntil: "domcontentloaded" });
    await dismissCoverageDialog(page);
    await page.getByRole("button", { name: "Data coverage" }).click();
    await page.locator(".coverage-dialog-secondary").click();
    await page.locator("details.map-region-panel select").selectOption("punjab");
    await page.getByRole("button", { name: /Lahore.*No data yet/ }).click();
    const noDataDialog = page.getByRole("dialog", { name: "Data not available yet" });
    await expect(noDataDialog).toContainText("Lahore has no data yet");
    const noDataBox = await noDataDialog.boundingBox();
    expect(noDataBox).not.toBeNull();
    expect(Math.abs((noDataBox?.x ?? 0) + (noDataBox?.width ?? 0) / 2 - page.viewportSize()!.width / 2)).toBeLessThanOrEqual(2);
  });

  test("team cards open and close profile dialogs and protect external links", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/team", { waitUntil: "domcontentloaded" });
    await dismissCoverageDialog(page);

    for (const name of [
      "Ayesha Mazhar",
      "Muhammad Hasnain",
      "Muhammad Faheem",
      "Sharjeel Ahmed Siddiqui",
      "Raja Salman",
      "Syed Ali Hasnain Zaidi",
    ]) {
      await expect(page.getByRole("heading", { name, level: 3 })).toBeVisible();
    }

    const trigger = page.getByRole("button", { name: "View profile" }).first();
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Ayesha Mazhar's profile" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();

    const salmanCard = page.locator(".team-member-card").filter({
      has: page.getByRole("heading", { name: "Salman", level: 3 }),
    });
    const cardLink = salmanCard.locator(
      '.team-card-actions a[href="https://github.com/raja-salman-hq"]',
    );
    await expect(cardLink).toHaveCount(1);
    await expect(cardLink).toHaveAttribute("href", "https://github.com/raja-salman-hq");
    await expect(cardLink).toHaveAttribute("target", "_blank");
    await expect(cardLink).toHaveAttribute("rel", "noopener noreferrer");

    await salmanCard.getByRole("button", { name: "View profile" }).click();
    const dialogLink = page
      .getByRole("dialog")
      .locator('a[href="https://github.com/raja-salman-hq"]');
    await expect(dialogLink).toHaveCount(1);
    await expect(dialogLink).toHaveAttribute("target", "_blank");
    await expect(dialogLink).toHaveAttribute("rel", "noopener noreferrer");
    await page.getByRole("dialog").getByRole("button", { name: "Close profile" }).click();
    expect(errors).toEqual([]);
  });

  test("primary navigation reaches each main page", async ({ page }) => {
    await stubBasemap(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await dismissCoverageDialog(page);

    for (const route of [
      { name: "Explore", path: "/explore" },
      { name: "Compare", path: "/compare" },
      { name: "About", path: "/about" },
      { name: "Team", path: "/team" },
    ]) {
      await page.getByRole("navigation", { name: "Main navigation" })
        .getByRole("link", { name: route.name })
        .click();
      await expect(page).toHaveURL(new RegExp(route.path.replace("/", "\\/") + "$"));
      await expect(page.locator("main h1").first()).toBeVisible();
    }

    await page.getByRole("link", { name: "EarthGuard PAKISTAN" }).first().click();
    await expect(page).toHaveURL("/");
  });

  test("team layout has no horizontal overflow and keeps controls touch-sized", async ({ page }) => {
    const viewports = [320, 390, 768, 1024, 1440, 1920];
    for (const width of viewports) {
      await page.setViewportSize({ width, height: 1000 });
      for (const language of ["en", "ur"] as const) {
        await page.goto("/team?language=" + language, { waitUntil: "domcontentloaded" });
        await expect(page.locator("main h1")).toBeVisible();

        const layout = await page.evaluate(() => ({
          viewportWidth: window.innerWidth,
          pageWidth: document.documentElement.scrollWidth,
          columns: getComputedStyle(document.querySelector(".team-member-grid")!)
            .gridTemplateColumns.split(" ").length,
        }));
        expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
        const expectedColumns = width < 640 ? 1 : width < 960 ? 2 : 3;
        expect(layout.columns).toBe(expectedColumns);

        const undersizedTargets = await page.locator(
          ".team-page button, .team-page a, .primary-nav a, .header-actions button, .footer-credit-links a",
        ).evaluateAll((targets) =>
          targets
            .filter((target) => target.getBoundingClientRect().height > 0)
            .map((target) => ({
              label: target.textContent?.trim() || target.getAttribute("aria-label") || target.className,
              height: Math.round(target.getBoundingClientRect().height),
              display: getComputedStyle(target).display,
            }))
            .filter(({ height }) => height < 44),
        );
        expect(undersizedTargets).toEqual([]);
      }
    }
  });

  test("hotspot selection updates the selected region on desktop and mobile", async ({ page }) => {
    await stubBasemap(page);
    const exploreUrl = realDataMode
      ? "/explore?variable=land_surface_temperature&province=punjab&area=faisalabad"
      : "/explore?variable=air_temperature&region=punjab";
    await page.goto(exploreUrl, {
      waitUntil: "domcontentloaded",
    });
    await dismissCoverageDialog(page);
    const hotspot = page.locator('.hotspot-item:not([aria-current="true"])').first();
    await expect(hotspot).toBeVisible();
    const regionLabel = await hotspot.locator(".hotspot-main strong").textContent();
    await hotspot.click();
    const selectedHotspot = page.locator('.hotspot-item[aria-current="true"]');
    await expect(selectedHotspot).toContainText(regionLabel ?? "");
    await expect(page.locator(".trend-chart-content h3")).toContainText(regionLabel ?? "");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(exploreUrl, {
      waitUntil: "domcontentloaded",
    });
    await dismissCoverageDialog(page, false);
    await page.getByRole("button", { name: "Filters" }).click();
    const mobileSelect = page.locator(".mobile-insights-heading select");
    const previousRegion = await mobileSelect.inputValue();
    const mobileHotspot = page.locator('.explore-filters-panel .hotspot-item:not([aria-current="true"])').first();
    await expect(mobileHotspot).toBeVisible();
    const mobileRegionLabel = await mobileHotspot.locator(".hotspot-main strong").textContent();
    await mobileHotspot.click();
    const selectedMobileHotspot = page.locator('.explore-filters-panel .hotspot-item[aria-current="true"]');
    await expect(selectedMobileHotspot).toContainText(mobileRegionLabel ?? "");
    if (realDataMode) {
      await expect(page.getByLabel("Environmental variable")).toHaveValue("precipitation");
    } else {
      await expect(mobileSelect).not.toHaveValue(previousRegion);
    }
    expect(mobileRegionLabel).toBeTruthy();
  });

  test("preferred annual sources, monthly coverage and trends match the data contract", async ({ page }) => {
    test.skip(!realDataMode, "This data contract is exercised in real mode.");
    await page.goto("/explore", { waitUntil: "domcontentloaded" });
    await dismissCoverageDialog(page);
    const response = await page.request.get(
      new URL("/data/areas/faisalabad/indicators.json", page.url()).toString(),
    );
    expect(response.ok()).toBe(true);
    const data = areaIndicatorsSchema.parse(await response.json());
    const sourceFile =
      "data/annual/gee2024/Faisalabad_LST_Rainfall_NDVI_Annual_2001_2024.csv";

    expect(data.meta.status).toBe("draft");
    expect(data.meta.warnings.length).toBeGreaterThan(0);
    expect(data.indicators.map((indicator) => indicator.id)).toEqual([
      "land_surface_temperature",
      "precipitation",
      "vegetation_index",
    ]);
    expect(data.indicators.every((indicator) => indicator.source === sourceFile)).toBe(true);
    expect(data.indicators[0].monthly_series).toHaveLength(288);
    expect(data.indicators[1].monthly_series).toHaveLength(288);
    expect(data.indicators[2].monthly_series).toBeUndefined();
    expect(data.indicators.every((indicator) => indicator.trend === null)).toBe(true);
  });

  test("legacy Faisalabad region URL resolves to its Punjab area and other regions show no data", async ({ page }) => {
    test.skip(!realDataMode, "This area URL flow is exercised in real mode.");
    await stubBasemap(page);
    await page.goto(
      "/explore?region=faisalabad&variable=land_surface_temperature&start=2001&end=2024",
      { waitUntil: "domcontentloaded" },
    );
    await dismissCoverageDialog(page);
    await expect(page).toHaveURL(/region=punjab/);
    await expect(page).toHaveURL(/province=punjab/);
    await expect(page).toHaveURL(/area=faisalabad/);
    await expect(page.locator("details.map-region-panel select")).toHaveValue("faisalabad");
    await expect(page.locator(".trend-chart-content h3")).toContainText("Faisalabad");

    await page.goto("/explore?province=sindh&variable=land_surface_temperature", {
      waitUntil: "domcontentloaded",
    });
    const noDataNotice = page.locator(".no-data-notice:visible");
    await expect(noDataNotice).toHaveCount(1);
    await noDataNotice.getByRole("button").click();
    await expect(page.locator("details.map-region-panel select")).toHaveValue("faisalabad");
  });

  test("real pilot map, indicators, compare, exports, Urdu and mobile flow", async ({ page }) => {
    test.skip(!realDataMode, "This flow is exercised with NEXT_PUBLIC_USE_MOCK=false.");
    await stubBasemap(page);
    await stubWeather(page);
    await page.goto("/explore?province=pakistan", { waitUntil: "domcontentloaded" });
    await dismissCoverageDialog(page);
    await expect(page.locator(".data-status-badge")).toContainText("Draft data");
    await expect(page.locator(".indicator-card")).toHaveCount(3);
    await expect(page.locator(".indicator-card").first()).toContainText("2024");

    const regionSelect = page.locator("details.map-region-panel select");
    await regionSelect.selectOption("punjab");
    await expect(regionSelect).toHaveValue("punjab");
    await expect(page).not.toHaveURL(/area=punjab/);
    const marker = page.getByRole("button", { name: "Faisalabad, data available" });
    await expect(marker).toBeVisible();
    await marker.click({ force: true });
    await expect(page.locator(".map-breadcrumb")).toContainText("Faisalabad");

    await page.locator(".map-breadcrumb").getByRole("button", { name: "Punjab" }).click();
    await regionSelect.selectOption("faisalabad");
    await expect(regionSelect).toHaveValue("faisalabad");
    await expect(page.locator(".trend-chart-content h3").first()).toContainText("Faisalabad");
    await expect(page.locator(".trend-summary-card").first()).toContainText("Study-area LST change");

    for (const variable of ["land_surface_temperature", "precipitation", "vegetation_index"]) {
      await page.getByLabel("Environmental variable").selectOption(variable);
      await expect(page.locator(".trend-chart-plot svg").first()).toBeVisible();
      if (variable === "land_surface_temperature" || variable === "precipitation") {
        await expect(page.locator(".trend-resolution-control select")).toBeVisible();
      } else {
        await expect(page.locator(".trend-resolution-control")).toHaveCount(0);
      }
      if (variable === "land_surface_temperature" || variable === "precipitation") {
        await page.locator(".trend-view-toggle button").nth(1).click();
        await expect(page.locator(".trend-data-table tbody tr")).toHaveCount(24);
        await expect(page.locator(".trend-data-table thead")).toContainText("Valid months");
        await page.locator(".trend-resolution-control select").selectOption("monthly");
        await expect(page.locator(".trend-data-table tbody tr")).toHaveCount(288);
        await page.locator(".trend-resolution-control select").selectOption("yearly");
        await page.locator(".trend-view-toggle button").first().click();
      }
    }

    await page.getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Compare" })
      .click();
    await expect(page.locator(".area-small-multiple-card")).toHaveCount(3);
    await expect(page.locator(".compare-heading .eyebrow")).toContainText("Faisalabad");
    await expect(page.locator(".area-small-multiple-heading h2")).toHaveText([
      "Land surface temperature",
      "Rainfall",
      "NDVI",
    ]);
    const firstValueBeforeYearChange = await page.locator(".compare-year-card").first().locator(".compare-value-grid").innerText();
    await page.locator(".compare-year-controls select").selectOption("2023");
    await expect(page.locator(".compare-year-card").first().locator(".compare-value-grid")).not.toHaveText(firstValueBeforeYearChange);
    await page.locator(".compare-year-card").first().getByRole("button", { name: /view table/i }).click();
    await expect(page.locator(".compare-year-card").first().locator(".compare-year-table")).toBeVisible();
    await page.locator(".compare-add-region").click();
    await expect(page.getByRole("dialog")).toContainText(
      "Region comparison is not available yet. Real data exists only for Faisalabad.",
    );
    await page.getByRole("dialog").locator(".coverage-dialog-secondary").click();

    await page.getByRole("tab", { name: "Indicators over time" }).click();
    await expect(page.locator(".compare-over-time-card")).toHaveCount(3);
    await expect(page.getByText("Any relationship between indicators is exploratory; correlation is not causation.")).toBeVisible();
    const indicatorPayload = areaIndicatorsSchema.parse(
      JSON.parse(await readFile("public/data/areas/faisalabad/indicators.json", "utf8")),
    );
    const lst2024 = indicatorPayload.indicators.find((indicator) => indicator.id === "land_surface_temperature")?.series.find((point) => point.year === 2024)?.value;
    const compareExport = page.locator(".compare-heading .export-menu");
    const openExportMenu = async () => {
      if (await compareExport.locator("details").getAttribute("open") === null) {
        await compareExport.locator("summary").click();
      }
    };
    await openExportMenu();
    const [indicatorCsvDownload] = await Promise.all([
      page.waitForEvent("download"),
      compareExport.getByRole("button", { name: "Download visible data as CSV" }).click(),
    ]);
    const indicatorCsv = await readFile((await indicatorCsvDownload.path())!, "utf8");
    expect(indicatorCsv.charCodeAt(0)).toBe(0xfeff);
    expect(indicatorCsv).toContain('"year","LST"');
    expect(indicatorCsv).toContain(String(lst2024));
    await openExportMenu();
    const [indicatorPngDownload] = await Promise.all([
      page.waitForEvent("download"),
      compareExport.getByRole("button", { name: "Download chart as PNG" }).click(),
    ]);
    const indicatorPng = await readFile((await indicatorPngDownload.path())!);
    expect([...indicatorPng.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(indicatorPng.readUInt32BE(16)).toBeGreaterThanOrEqual(1200);
    expect(indicatorPng.length).toBeGreaterThan(20_000);
    await page.getByRole("tab", { name: "Maps" }).click();
    await expect(page.locator(".compare-maps-view")).toBeVisible();
    await expect(page.locator(".compare-maps-view img")).toHaveCount(3);
    await openExportMenu();
    const [mapCsvDownload] = await Promise.all([
      page.waitForEvent("download"),
      compareExport.getByRole("button", { name: "Download visible data as CSV" }).click(),
    ]);
    const mapCsv = await readFile((await mapCsvDownload.path())!, "utf8");
    expect(mapCsv.charCodeAt(0)).toBe(0xfeff);
    expect(mapCsv).toContain('"min","mean","max"');
    await openExportMenu();
    const [mapPngDownload] = await Promise.all([
      page.waitForEvent("download"),
      compareExport.getByRole("button", { name: "Download chart as PNG" }).click(),
    ]);
    const mapPng = await readFile((await mapPngDownload.path())!);
    expect([...mapPng.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(mapPng.readUInt32BE(16)).toBeGreaterThanOrEqual(1200);
    expect(mapPng.length).toBeGreaterThan(20_000);
    if (await compareExport.locator("details").getAttribute("open") !== null) {
      await compareExport.locator("summary").click();
    }
    await page.getByRole("tab", { name: "Regions" }).click();
    await expect(page.locator(".compare-locked-card")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await page.getByRole("dialog").locator(".coverage-dialog-secondary").click();
    await page.getByRole("tab", { name: "Year vs year" }).click();

    const firstExport = compareExport;
    await openExportMenu();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      firstExport.getByRole("button", { name: "Download visible data as CSV" }).click(),
    ]);
    expect(download.suggestedFilename()).toContain("faisalabad");
    const csvPath = await download.path();
    expect(csvPath).not.toBeNull();
    const csv = await readFile(csvPath!, "utf8");
    expect(csv).toContain(
      "\uFEFF\"area\",\"indicator\",\"previous_year\",\"previous_value\",\"year\",\"value\",\"difference\",\"percent_difference\",\"unit\",\"source file\",\"status\"",
    );
    expect(csv).toContain("2022");
    expect(csv).toContain("2023");
    const [pngDownload] = await Promise.all([
      page.waitForEvent("download"),
      firstExport.getByRole("button", { name: "Download chart as PNG" }).click(),
    ]);
    expect(pngDownload.suggestedFilename()).toContain("faisalabad");

    await page.locator(".language-button").click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.setViewportSize({ width: 390, height: 844 });
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth).toBeLessThanOrEqual(391);
  });

  test("landing stays within mobile and desktop viewports in English and Urdu", async ({ page }) => {
    const viewports = [320, 390, 768, 1024, 1440, 1920];
    await stubWeather(page);
    for (const width of viewports) {
      await page.setViewportSize({ width, height: 1000 });
      for (const language of ["en", "ur"] as const) {
        await page.goto("/?language=" + language, { waitUntil: "domcontentloaded" });
        await dismissCoverageDialog(page, width === viewports[0] && language === "en");
        await expect(
          page.locator('.home-section[aria-labelledby="home-variables-title"] .home-variable-card'),
        ).toHaveCount(realDataMode ? 3 : 7);
        await expect(page.locator("html")).toHaveAttribute("dir", language === "ur" ? "rtl" : "ltr");

        const layout = await page.evaluate(() => ({
          viewportWidth: window.innerWidth,
          pageWidth: document.documentElement.scrollWidth,
          variableColumns: getComputedStyle(document.querySelector(".home-variable-grid")!).gridTemplateColumns
            .split(" ").length,
        }));
        expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
        const expectedColumns = width < 560 ? 1 : width < 840 ? 2 : width < 1120 ? 3 : 4;
        expect(layout.variableColumns).toBe(expectedColumns);

        const smallTargets = await page.locator(
          ".home-page a, .site-header .primary-nav a, .site-header .header-actions .control-button, .site-footer .footer-credit-links a",
        ).evaluateAll((links) =>
          links
            .filter((link) => link.getBoundingClientRect().height > 0)
            .map((link) => Math.round(link.getBoundingClientRect().height))
            .filter((height) => height < 44),
        );
        expect(smallTargets).toEqual([]);
      }
    }
  });

  test("dialogs and live cards stay contained across responsive states", async ({ page }) => {
    test.skip(!realDataMode, "This flow is exercised with NEXT_PUBLIC_USE_MOCK=false.");
    test.setTimeout(120_000);
    await stubWeather(page);
    const widths = [320, 390, 768, 1440];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/compare", { waitUntil: "domcontentloaded" });
      await page.evaluate(() => window.sessionStorage.clear());
      await page.goto("/", { waitUntil: "domcontentloaded" });
      const welcome = page.locator(".data-coverage-dialog");
      await expect(welcome).toBeVisible();
      await page.waitForTimeout(300);
      const welcomeGeometry = await welcome.evaluate((element) => {
        const dialog = element.getBoundingClientRect();
        const content = getComputedStyle(element.querySelector(".coverage-dialog-content")!);
        return {
          left: Math.abs(dialog.left - (window.innerWidth - dialog.width) / 2),
          top: Math.abs(dialog.top - (window.innerHeight - dialog.height) / 2),
          width: dialog.width,
          height: dialog.height,
          contentLeft: Number.parseFloat(content.paddingLeft),
          contentRight: Number.parseFloat(content.paddingRight),
          viewportHeight: window.innerHeight,
        };
      });
      expect(welcomeGeometry.left).toBeLessThanOrEqual(2);
      expect(welcomeGeometry.top).toBeLessThanOrEqual(2);
      expect(welcomeGeometry.contentLeft).toBeGreaterThanOrEqual(20);
      expect(welcomeGeometry.contentRight).toBeGreaterThanOrEqual(20);
      expect(welcomeGeometry.height).toBeLessThanOrEqual(welcomeGeometry.viewportHeight - 32 + 2);
      await expect(welcome.locator(".coverage-dialog-actions > button").nth(0)).toHaveCSS("height", "44px");
      await expect(welcome.locator(".coverage-dialog-actions > button").nth(1)).toHaveCSS("height", "44px");
      expect(await page.evaluate(() => document.activeElement?.tagName)).toBe("DIV");
      await welcome.screenshot({ path: `test-results/dialog-welcome-en-dark-${width}.png` });
      await welcome.locator(".coverage-dialog-actions .control-button").click();
      await page.getByRole("button", { name: /switch theme/i }).click();
      await page.locator(".data-coverage-button").click();
      await expect(welcome).toBeVisible();
      await welcome.screenshot({ path: `test-results/dialog-welcome-en-light-${width}.png` });
      await welcome.locator(".coverage-dialog-actions .control-button").click();
      await page.locator(".language-button").click();
      await page.locator(".data-coverage-button").click();
      await expect(welcome).toBeVisible();
      await welcome.screenshot({ path: `test-results/dialog-welcome-ur-light-${width}.png` });
      await welcome.locator(".coverage-dialog-actions .control-button").click();
      await page.locator(".header-actions .control-button").nth(-2).click();
      await page.locator(".data-coverage-button").click();
      await expect(welcome).toBeVisible();
      await welcome.screenshot({ path: `test-results/dialog-welcome-ur-dark-${width}.png` });
      await welcome.locator(".coverage-dialog-actions .control-button").click();

      await page.goto("/compare", { waitUntil: "domcontentloaded" });
      await expect(page.locator(".compare-heading .live-now-card")).toBeVisible();
      const liveCard = page.locator(".compare-heading .live-now-card");
      const compareAdd = page.locator(".compare-add-region");
      const assertNoIntersection = async (other: ReturnType<typeof page.locator>) => {
        const otherHandle = await other.elementHandle();
        if (!otherHandle) throw new Error("Expected responsive comparison control to exist.");
        const intersects = await liveCard.evaluate((card, target) => {
          const first = card.getBoundingClientRect();
          const second = (target as HTMLElement).getBoundingClientRect();
          return !(first.right <= second.left || first.left >= second.right || first.bottom <= second.top || first.top >= second.bottom);
        }, otherHandle);
        expect(intersects).toBe(false);
      };
      await assertNoIntersection(compareAdd);
      if (await liveCard.getByRole("button", { name: "Collapse live card" }).count() === 0) {
        await liveCard.getByRole("button", { name: "Expand live card" }).click();
      }
      await page.screenshot({ path: `test-results/compare-live-expanded-${width}.png`, fullPage: false });
      await liveCard.getByRole("button", { name: "Collapse live card" }).click();
      await page.screenshot({ path: `test-results/compare-live-collapsed-${width}.png`, fullPage: false });
      await liveCard.getByRole("button", { name: "Expand live card" }).click();
      await page.locator(".compare-add-region").click();
      const noData = page.locator(".data-coverage-dialog");
      await expect(noData).toContainText("Region comparison is not available yet");
      await noData.screenshot({ path: `test-results/dialog-no-data-ur-dark-${width}.png` });
      await noData.locator(".coverage-dialog-actions .control-button").click();
      await page.locator(".language-button").click();
      await page.locator(".compare-add-region").click();
      await noData.screenshot({ path: `test-results/dialog-no-data-en-dark-${width}.png` });
      await noData.locator(".coverage-dialog-actions .control-button").click();
      await page.locator(".header-actions .control-button").nth(-2).click();
      await page.locator(".compare-add-region").click();
      await noData.screenshot({ path: `test-results/dialog-no-data-en-light-${width}.png` });
      await noData.locator(".coverage-dialog-actions .control-button").click();
      await page.locator(".language-button").click();
      await page.locator(".compare-add-region").click();
      await noData.screenshot({ path: `test-results/dialog-no-data-ur-light-${width}.png` });
      await noData.locator(".coverage-dialog-actions .control-button").click();
      await page.locator(".header-actions .control-button").nth(-2).click();
      if (await liveCard.getByRole("button", { name: "Collapse live card" }).count() === 0) {
        await liveCard.getByRole("button", { name: "Expand live card" }).click();
      }
      await liveCard.getByRole("button", { name: "Collapse live card" }).click();
      await expect(liveCard).toHaveAttribute("aria-label", /Live Faisalabad/);
      await expect(liveCard.getByRole("button", { name: /expand/i })).toBeVisible();
      await liveCard.getByRole("button", { name: /expand/i }).click();
      await expect(liveCard.getByRole("button", { name: "Collapse live card" })).toBeVisible();
      await page.locator(".language-button").click();
    }
  });
});

test.describe("WCAG 2.1 AA accessibility scans", () => {
  for (const route of routes) {
    for (const language of ["en", "ur"] as const) {
      for (const theme of ["dark", "light"] as const) {
        test(route.name + " (" + language + ", " + theme + ")", async ({ page }) => {
          if (route.path === "/explore") {
            await stubBasemap(page);
          }
          if (route.path === "/" || route.path === "/compare") {
            await stubWeather(page);
          }
          await page.goto(route.path + "?language=" + language + "&theme=" + theme, {
            waitUntil: "domcontentloaded",
          });
          await dismissCoverageDialog(page);
          await expect(page.locator("main h1").first()).toBeVisible();
          await expect(page.locator("html")).toHaveAttribute("lang", language);
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          await expect(page.locator(
            ".header-actions .control-button:not(.data-coverage-button):not(.language-button)",
          )).toHaveCSS(
            "background-color",
            theme === "light" ? "rgb(255, 255, 255)" : "rgb(18, 27, 46)",
          );

          const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .analyze();

          expect(
            results.violations.map((violation) => ({
              id: violation.id,
              impact: violation.impact,
              description: violation.description,
              nodes: violation.nodes.map((node) => ({
                target: node.target,
                failureSummary: node.failureSummary,
              })),
            })),
          ).toEqual([]);
        });
      }
    }
  }
});
