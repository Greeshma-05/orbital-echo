import { test, expect, type Page } from "@playwright/test";
async function go(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Mission navigation" })
    .getByRole("button", { name, exact: true })
    .click();
}
async function tick(page: Page, seconds: number) {
  await page.clock.runFor(seconds * 1000);
}
test("complete five-chapter mission through actual controls", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("WebGL context"))
      errors.push(m.text());
  });
  await page.clock.install();
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "New mission", exact: true }),
  ).toBeVisible();
  await tick(page, 0.5);
  await page.screenshot({ path: "artifacts/01-main-menu.png" });
  await page.getByRole("button", { name: "New mission", exact: true }).click();
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(
    page.getByRole("heading", { name: "Mission overview." }),
  ).toBeVisible();
  await tick(page, 0.5);
  await page.screenshot({ path: "artifacts/02-mission-overview.png" });
  await page.getByRole("button", { name: "Open launch control" }).click();
  await page.getByRole("button", { name: /Inspect & delay/ }).click();
  await page.getByRole("button", { name: "Run preflight checks" }).click();
  await expect(
    page.getByRole("button", { name: "Start countdown" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Start countdown" }).click();
  await tick(page, 2);
  await page.getByRole("button", { name: "Abort launch" }).click();
  await expect(
    page.getByRole("button", { name: "Start countdown" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start countdown" }).click();
  await page
    .getByRole("button", { name: "Simulation speed 10x", exact: true })
    .click();
  await tick(page, 14);
  await expect(
    page.getByRole("button", { name: "Separate stage 1" }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/03-stage-separation.png" });
  await page.getByRole("button", { name: "Separate stage 1" }).click();
  await tick(page, 24);
  await expect(
    page.getByText("Stable orbit confirmed", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Begin chapter 2" }).click();
  await go(page, "Orbit & navigation");
  await page.getByRole("button", { name: "Execute transfer" }).click();
  await page.getByRole("button", { name: "Match velocity" }).click();
  await page.getByRole("button", { name: "Approach Hubble" }).click();
  await page.screenshot({ path: "artifacts/04-rendezvous.png" });
  await go(page, "Crew & health");
  await page.getByLabel("Assign Eli Okafor").selectOption("Telescope repair");
  await tick(page, 5);
  await go(page, "Telescope & science");
  await page.getByRole("button", { name: /Deploy Echo observatory/ }).click();
  await page.getByRole("button", { name: "Start observation" }).click();
  await tick(page, 4.5);
  await page.getByRole("button", { name: "Analyze", exact: true }).click();
  await page.getByRole("button", { name: "Begin chapter 3" }).click();
  await go(page, "Telescope & science");
  await page.getByLabel("Observation filter").selectOption("Infrared");
  await page.getByRole("button", { name: "Start observation" }).click();
  await tick(page, 1);
  await page.getByRole("button", { name: /Isolate the power bus/ }).click();
  await tick(page, 3.5);
  await page.getByRole("button", { name: "Analyze", exact: true }).click();
  await page.getByLabel("Observation target").selectOption("galaxy");
  await page.getByLabel("Observation filter").selectOption("Visible");
  await page.getByRole("button", { name: "Start observation" }).click();
  await tick(page, 4.5);
  await page.getByRole("button", { name: "Analyze", exact: true }).click();
  await page.getByRole("button", { name: /Use relay satellite/ }).click();
  await page.screenshot({ path: "artifacts/05-telescope-science.png" });
  await go(page, "Investigation");
  await page.getByRole("button", { name: /Request comparison/ }).click();
  await page.getByRole("button", { name: "Begin chapter 4" }).click();
  await go(page, "Life support");
  await page.screenshot({ path: "artifacts/06-life-support-emergency.png" });
  await page
    .getByRole("button", { name: /Install emergency cartridge/ })
    .click();
  await go(page, "Crew & health");
  await page
    .getByLabel("Assign Eli Okafor")
    .selectOption("Life-support repair");
  await page.getByLabel("Assign Maya Chen").selectOption("Rest");
  await tick(page, 6.5);
  await expect(
    page.getByRole("button", { name: "Begin chapter 5" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Begin chapter 5" }).click();
  await page.getByRole("button", { name: /Shelter the crew/ }).click();
  await go(page, "Orbit & navigation");
  await page.getByRole("button", { name: "Deploy relay probe" }).click();
  await go(page, "Investigation");
  await page.screenshot({ path: "artifacts/07-investigation.png" });
  await page
    .getByRole("button", { name: "Return to Earth", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm deorbit & recovery" })
    .click();
  await expect(
    page.getByRole("heading", { name: "the greatest discovery", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/08-greatest-discovery.png" });
  await page.getByRole("button", { name: "Main menu", exact: true }).click();
  await page.getByRole("button", { name: /Mission archive/ }).click();
  await expect(
    page.getByRole("heading", { name: "THE GREATEST DISCOVERY", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.reload();
  await page.getByRole("button", { name: /Continue mission/ }).click();
  await expect(
    page.getByRole("heading", { name: "the greatest discovery", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("mobile navigation, reduced motion, pause, invalid save and chapter recovery", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "Open settings" }).click();
  await page.getByLabel("Animated space visuals").uncheck();
  await page.getByLabel("Larger interface text").check();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.screenshot({ path: "artifacts/09-mobile-menu.png" });
  await page.getByRole("button", { name: "New mission", exact: true }).click();
  await page.getByRole("button", { name: "Skip intro" }).click();
  await page
    .getByRole("button", { name: "Pause simulation", exact: true })
    .click();
  const before = await page.locator(".mission-clock b").textContent();
  await tick(page, 10);
  expect(await page.locator(".mission-clock b").textContent()).toBe(before);
  await page.screenshot({
    path: "artifacts/10-mobile-overview.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await go(page, "Rocket & launch");
  await expect(
    page.getByRole("heading", { name: "Rocket & launch." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: /Inspect & delay/ }).click();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("button", { name: "Restart chapter", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm restart" }).click();
  await expect(
    page.getByText("Chapter checkpoint restored.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(
    page.getByRole("button", { name: /Inspect & delay/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version": 99}'),
  });
  await expect(page.getByRole("status")).toContainText(
    "Unsupported save format",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
});

test("real-time rendering, mid-mission save restore, settings and offline controls", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/", { waitUntil: "networkidle" });
  await page.screenshot({ path: "artifacts/11-desktop-live.png" });
  await page.getByRole("button", { name: "New mission", exact: true }).click();
  await page.getByRole("button", { name: "Receive mission briefing" }).click();
  await page.getByRole("button", { name: "Enter mission control" }).click();
  await page
    .getByRole("button", { name: "Pause simulation", exact: true })
    .click();
  await go(page, "Rocket & launch");
  await page.getByRole("button", { name: /Inspect & delay/ }).click();
  await page.getByLabel("Primary engine").selectOption("Vega");
  await page.getByRole("button", { name: "Run preflight checks" }).click();
  await expect(page.getByRole("status")).toContainText("thrust-to-weight");
  await page.getByLabel("Primary engine").selectOption("Meridian");
  await page.getByRole("button", { name: "Save mission", exact: true }).click();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Continue mission/ }).click();
  await go(page, "Rocket & launch");
  await expect(page.getByLabel("Primary engine")).toHaveValue("Meridian");
  await expect(page.getByText("inspected", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Resume simulation", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Graphics quality").selectOption("Low");
  await page.getByLabel("High contrast").check();
  await page.getByLabel("Science Mode", { exact: false }).uncheck();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.locator(".science-note")).toHaveCount(0);
  await context.setOffline(true);
  await go(page, "Telescope & science");
  await page.getByLabel("Observation target").selectOption("nebula");
  await expect(
    page.getByRole("heading", { name: "Orion nebula", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Zoom in image" }).click();
  await expect(page.getByText("1.25×", { exact: true })).toBeVisible();
  await go(page, "Resources");
  await expect(
    page.getByRole("heading", { name: "Mission budget" }),
  ).toBeVisible();
  await go(page, "Mission log");
  await page.getByLabel("Search mission log").fill("vibration");
  await expect(page.locator(".log-row")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("WebGL unavailable keeps a usable 2D game", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (type === "webgl" || type === "webgl2") return null;
      return (original as Function).apply(this, [type, ...args]);
    } as typeof original;
  });
  await page.goto("/");
  await expect(
    page.getByText("2D navigation display · all flight controls available"),
  ).toBeVisible();
  await page.getByRole("button", { name: "New mission", exact: true }).click();
  await page.getByRole("button", { name: "Skip intro" }).click();
  await page.getByRole("button", { name: "Open launch control" }).click();
  await page.getByRole("button", { name: /Inspect & delay/ }).click();
  await page.getByRole("button", { name: "Run preflight checks" }).click();
  await expect(
    page.getByRole("button", { name: "Start countdown" }),
  ).toBeEnabled();
  await page.screenshot({ path: "artifacts/12-fallback-launch.png" });
});
