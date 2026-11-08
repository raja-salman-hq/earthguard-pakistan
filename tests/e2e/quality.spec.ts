import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const routes = [
  { path: "/", name: "home", status: 200 },
  { path: "/explore", name: "explore", status: 200 },
  { path: "/compare", name: "compare", status: 200 },
  { path: "/about", name: "about", status: 200 },
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
