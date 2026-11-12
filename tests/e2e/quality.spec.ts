import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const routes = [
  { path: "/", name: "home", status: 200 },
  { path: "/explore", name: "explore", status: 200 },
  { path: "/compare", name: "compare", status: 200 },
  { path: "/about", name: "about", status: 200 },
  { path: "/team", name: "team", status: 200 },
  { path: "/quality-check-404", name: "404", status: 404 },
] as const;

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

test.describe("production route smoke checks", () => {
  for (const route of routes) {
    test(route.name + " loads without browser errors", async ({ page }) => {
      const errors = collectConsoleErrors(page);
      if (route.path === "/explore") {
        await stubBasemap(page);
      }
      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });

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

    const regionSelect = page.locator("details.map-region-panel select");
    await expect(regionSelect).toBeVisible();
    await regionSelect.selectOption("sindh");
    await expect(regionSelect).toHaveValue("sindh");
    await expect(page.locator(".trend-chart-content h3")).toContainText("Sindh");

    await page.getByLabel("Environmental variable").selectOption("precipitation");
    await expect(page.locator(".map-legend strong")).toContainText("Precipitation");
    await expect(page.locator(".trend-chart-plot svg").first()).toBeVisible();

    const playButton = page.locator(".timeline-play-button");
    await playButton.click();
    await expect(playButton).toHaveAttribute("aria-label", "Pause timeline");
    await playButton.click();
    await expect(playButton).toHaveAttribute("aria-label", "Play timeline");

    const themeButton = page.locator(".header-actions .control-button").first();
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
    const variableCard = page.locator(".home-variable-card").filter({ hasText: "Precipitation" });
    await expect(variableCard).toBeVisible();
    await variableCard.click();
    await expect(page).toHaveURL(/\/explore\?variable=precipitation/);
    await expect(page.getByLabel("Environmental variable")).toHaveValue("precipitation");
  });

  test("landing language and theme toggles update the static page copy", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const title = page.locator(".home-hero-copy h1");
    await expect(title).toContainText("See how Pakistan's environment has changed");
    await page.locator(".language-button").click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(title).toContainText("دیکھیں پاکستان کا ماحول وقت کے ساتھ کیسے بدلا ہے");

    const themeButton = page.locator(".header-actions .control-button").first();
    await themeButton.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await themeButton.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("team cards open and close profile dialogs and protect external links", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/team", { waitUntil: "domcontentloaded" });

    for (const name of ["Ayesha", "Hasnain", "Wani", "Sharjeel", "Salman", "Ali"]) {
      await expect(page.getByRole("heading", { name, level: 3 })).toBeVisible();
    }

    const trigger = page.getByRole("button", { name: "View profile" }).first();
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Ayesha's profile" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();

    const salmanCard = page.locator(".team-member-card").filter({
      has: page.getByRole("heading", { name: "Salman", level: 3 }),
    });
    const cardLink = salmanCard.locator(".team-card-actions a");
    await expect(cardLink).toHaveCount(1);
    await expect(cardLink).toHaveAttribute("href", "https://github.com/raja-salman-hq");
    await expect(cardLink).toHaveAttribute("target", "_blank");
    await expect(cardLink).toHaveAttribute("rel", "noopener noreferrer");

    await salmanCard.getByRole("button", { name: "View profile" }).click();
    const dialogLink = page.getByRole("dialog").locator("a[href^='https://']");
    await expect(dialogLink).toHaveCount(1);
    await expect(dialogLink).toHaveAttribute("target", "_blank");
    await expect(dialogLink).toHaveAttribute("rel", "noopener noreferrer");
    await page.getByRole("dialog").getByRole("button", { name: "Close profile" }).click();
    expect(errors).toEqual([]);
  });

  test("primary navigation reaches each main page", async ({ page }) => {
    await stubBasemap(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });

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
    await page.goto("/explore?variable=air_temperature&region=punjab", {
      waitUntil: "domcontentloaded",
    });
    const hotspot = page.locator('.hotspot-item:not([aria-current="true"])').first();
    await expect(hotspot).toBeVisible();
    const regionLabel = await hotspot.locator(".hotspot-main strong").textContent();
    await hotspot.click();
    const selectedHotspot = page.locator('.hotspot-item[aria-current="true"]');
    await expect(selectedHotspot).toContainText(regionLabel ?? "");
    await expect(page.locator(".trend-chart-content h3")).toContainText(regionLabel ?? "");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/explore?variable=air_temperature&region=punjab", {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("button", { name: "Filters" }).click();
    const mobileSelect = page.locator(".mobile-insights-heading select");
    const previousRegion = await mobileSelect.inputValue();
    const mobileHotspot = page.locator('.explore-filters-panel .hotspot-item:not([aria-current="true"])').first();
    await expect(mobileHotspot).toBeVisible();
    const mobileRegionLabel = await mobileHotspot.locator(".hotspot-main strong").textContent();
    await mobileHotspot.click();
    const selectedMobileHotspot = page.locator('.explore-filters-panel .hotspot-item[aria-current="true"]');
    await expect(selectedMobileHotspot).toContainText(mobileRegionLabel ?? "");
    await expect(mobileSelect).not.toHaveValue(previousRegion);
    expect(mobileRegionLabel).toBeTruthy();
  });

  test("landing stays within mobile and desktop viewports in English and Urdu", async ({ page }) => {
    const viewports = [320, 390, 768, 1024, 1440, 1920];
    for (const width of viewports) {
      await page.setViewportSize({ width, height: 1000 });
      for (const language of ["en", "ur"] as const) {
        await page.goto("/?language=" + language, { waitUntil: "domcontentloaded" });
        await expect(page.locator(".home-variable-card")).toHaveCount(7);
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
});

test.describe("WCAG 2.1 AA accessibility scans", () => {
  for (const route of routes) {
    for (const language of ["en", "ur"] as const) {
      for (const theme of ["dark", "light"] as const) {
        test(route.name + " (" + language + ", " + theme + ")", async ({ page }) => {
          if (route.path === "/explore") {
            await stubBasemap(page);
          }
          await page.goto(route.path + "?language=" + language + "&theme=" + theme, {
            waitUntil: "domcontentloaded",
          });
          await expect(page.locator("main h1").first()).toBeVisible();
          await expect(page.locator("html")).toHaveAttribute("lang", language);
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          await expect(page.locator(".header-actions .control-button").first()).toHaveCSS(
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
