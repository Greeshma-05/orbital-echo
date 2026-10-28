import { test, expect, type Page } from "@playwright/test";
const world = (page: Page) => page.locator(".first-person-game");
async function read(page: Page, key: string) {
  return Number(await world(page).getAttribute(`data-${key}`));
}
async function tick(page: Page, seconds: number) {
  await page.clock.runFor(seconds * 1000);
}
async function hold(page: Page, key: string, seconds: number) {
  await page.keyboard.down(key);
  await tick(page, seconds);
  await page.keyboard.up(key);
  await tick(page, 0.15);
}
async function look(page: Page, yaw: number, pitch = 0) {
  for (let i = 0; i < 2; i++) {
    let d = yaw - (await read(page, "yaw"));
    d = Math.atan2(Math.sin(d), Math.cos(d));
    if (Math.abs(d) > 0.01)
      await hold(page, d > 0 ? "ArrowLeft" : "ArrowRight", Math.abs(d) / 1.5);
    const dp = pitch - (await read(page, "pitch"));
    if (Math.abs(dp) > 0.01)
      await hold(page, dp > 0 ? "ArrowUp" : "ArrowDown", Math.abs(dp) / 1.1);
  }
}
async function walk(page: Page, x: number, z: number) {
  for (let i = 0; i < 3; i++) {
    const px = await read(page, "player-x"),
      pz = await read(page, "player-z"),
      distance = Math.hypot(x - px, z - pz);
    if (distance < 0.18) return;
    await look(page, Math.atan2(-(x - px), -(z - pz)));
    await hold(page, "w", distance / 2.8);
  }
  expect(
    Math.hypot(
      x - (await read(page, "player-x")),
      z - (await read(page, "player-z")),
    ),
  ).toBeLessThan(0.45);
}
async function aim(page: Page, x: number, y: number, z: number) {
  const px = await read(page, "player-x"),
    pz = await read(page, "player-z");
  await look(
    page,
    Math.atan2(-(x - px), -(z - pz)),
    Math.atan2(y - 1.68, Math.hypot(x - px, z - pz)),
  );
  await tick(page, 0.2);
}
async function use(page: Page, id: string, p: [number, number, number]) {
  await aim(page, ...p);
  await expect(world(page)).toHaveAttribute("data-focus", id);
  await page.keyboard.press("e");
  await tick(page, 0.2);
}
async function close(page: Page) {
  await page.getByRole("button", { name: "Close terminal" }).click();
  await tick(page, 0.2);
}

test("complete five chapters through first-person movement and physical consoles", async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.clock.install();
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await tick(page, 1);
  await expect(
    page.locator(".sidebar,.main-menu,.dashboard,.app-shell"),
  ).toHaveCount(0);
  await expect(world(page)).toHaveAttribute("data-region", "ground");
  await page.screenshot({ path: "artifacts/fps-01-preparation.png" });
  await page.locator("canvas").click({ position: { x: 720, y: 500 } });
  await tick(page, 0.2);
  await expect
    .poll(() => page.evaluate(() => !!document.pointerLockElement))
    .toBe(true);
  const yaw = await read(page, "yaw");
  await page.mouse.move(780, 500);
  await tick(page, 0.3);
  expect(await read(page, "yaw")).not.toBe(yaw);
  await page.keyboard.press("Escape");
  await tick(page, 0.3);
  await expect(
    page.getByRole("dialog", { name: "Mission paused" }),
  ).toBeVisible();
  const pos = await read(page, "player-z");
  await hold(page, "w", 1);
  expect(await read(page, "player-z")).toBe(pos);
  await page.getByRole("button", { name: "Resume exploration" }).click();
  await tick(page, 0.3);
  await walk(page, 2, 14.5);
  await use(page, "suit", [3.27, 1.55, 13.7]);
  await expect(world(page)).toHaveAttribute("data-suited", "true");
  await walk(page, 0, 14.5);
  await look(page, 0);
  await hold(page, "w", 4);
  expect(await read(page, "player-z")).toBeGreaterThan(8.43);
  await use(page, "door", [0, 1.55, 8]);
  await tick(page, 0.7);
  await expect(world(page)).toHaveAttribute("data-door", "1.000");
  await walk(page, 0, 0);
  await page.screenshot({ path: "artifacts/fps-02-rocket-hangar.png" });
  await walk(page, -3.6, -1);
  await use(page, "inspection", [-3.6, 1.35, -2.68]);
  await expect(
    page.getByRole("dialog", { name: "Vehicle inspection" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Inspect & delay/ }).click();
  await page
    .getByRole("button", { name: "Complete preflight inspection" })
    .click();
  await expect(
    page.getByText("Inspection complete. Walk through"),
  ).toBeVisible();
  await close(page);
  await walk(page, -5.2, -1);
  await walk(page, -5.2, -6);
  await walk(page, -13, -6);
  await walk(page, -15.2, -8);
  await use(page, "rollout", [-15.2, 1.45, -9.65]);
  await tick(page, 10);
  await expect(world(page)).toHaveAttribute("data-rollout", "1.000");
  await aim(page, 0, 10, -48);
  await page.screenshot({ path: "artifacts/fps-03-launchpad.png" });
  await walk(page, -13, -8);
  await use(page, "launch", [-13, 1.45, -9.65]);
  await expect(world(page)).toHaveAttribute("data-phase", "countdown");
  await tick(page, 1);
  await use(page, "launch", [-13, 1.45, -9.65]);
  await expect(world(page)).toHaveAttribute("data-phase", "preflight");
  await use(page, "launch", [-13, 1.45, -9.65]);
  await walk(page, -10.8, -8);
  await use(page, "hold", [-10.8, 1.45, -9.65]);
  await expect(world(page)).toHaveAttribute("data-paused", "true");
  const count = await read(page, "countdown");
  await tick(page, 2);
  expect(await read(page, "countdown")).toBe(count);
  await use(page, "hold", [-10.8, 1.45, -9.65]);
  await walk(page, -15.2, -8);
  await aim(page, 0, 14, -48);
  await page.screenshot({ path: "artifacts/fps-04-liftoff.png" });
  await tick(page, 8);
  expect(await read(page, "altitude")).toBeGreaterThan(0);
  await tick(page, 17);
  await expect(world(page)).toHaveAttribute("data-region", "flight");
  await page.screenshot({ path: "artifacts/fps-05-flight-deck.png" });
  await walk(page, 2.8, -3.3);
  await aim(page, 2.8, 1.4, -4.85);
  await page.keyboard.press("t");
  await tick(page, 0.2);
  await expect(world(page)).toHaveAttribute("data-speed", "10");
  for (let i = 0; i < 40; i++) {
    if ((await world(page).getAttribute("data-phase")) === "orbit") break;
    if ((await world(page).getAttribute("data-staging")) === "true") {
      await use(page, "staging", [2.8, 1.4, -4.85]);
    }
    await tick(page, 1);
  }
  await expect(world(page)).toHaveAttribute("data-phase", "orbit");
  await expect(world(page)).toHaveAttribute("data-region", "orbit");
  expect(await read(page, "altitude")).toBeGreaterThan(160000);
  await walk(page, -2.8, -3.3);
  await use(page, "navigation", [-2.8, 1.4, -4.85]);
  await expect(world(page)).toHaveAttribute("data-chapter", "2");
  await page.getByRole("button", { name: "Execute transfer" }).click();
  await page.getByRole("button", { name: "Match relative velocity" }).click();
  await page.getByRole("button", { name: "Approach Hubble" }).click();
  await expect(world(page)).toHaveAttribute("data-docked", "true");
  await close(page);
  await walk(page, 0, -2);
  await walk(page, 0, 2);
  await walk(page, 1, 2);
  await walk(page, 1, 5);
  await walk(page, 0, 7);
  await walk(page, 0, 12.4);
  await walk(page, 3, 12.4);
  await use(page, "telescope-repair", [4.48, 1.5, 12.4]);
  await page.keyboard.press("t");
  await page.keyboard.press("t");
  await page.keyboard.press("t");
  await tick(page, 5);
  await expect(world(page)).toHaveAttribute("data-repaired", "true");
  await walk(page, 2.5, 18.5);
  await use(page, "science", [3.72, 1.4, 18.5]);
  await page.getByRole("button", { name: /Deploy Echo observatory/ }).click();
  await expect(
    page.getByRole("button", { name: "Acquire observation" }),
  ).toBeDisabled();
  const scope = page.getByRole("application", {
    name: /Telescope aiming field/,
  });
  const bounds = (await scope.boundingBox())!;
  await scope.click({
    position: { x: bounds.width * 0.57, y: bounds.height * 0.43 },
  });
  await page.getByRole("button", { name: "Acquire observation" }).click();
  await tick(page, 5);
  await expect(world(page)).toHaveAttribute("data-observations", "1");
  await page.getByRole("button", { name: "Analyze", exact: true }).click();
  await page.screenshot({ path: "artifacts/fps-06-telescope.png" });
  await close(page);
  await walk(page, -3.8, 18.5);
  await use(page, "evidence", [-5.7, 1.65, 18.5]);
  await page
    .getByRole("button", { name: "Accept chapter debrief & begin chapter 3" })
    .click();
  await close(page);
  await walk(page, 2.5, 18.5);
  await use(page, "science", [3.72, 1.4, 18.5]);
  await page.getByLabel("Observation filter").selectOption("Infrared");
  let b = (await scope.boundingBox())!;
  await scope.click({ position: { x: b.width * 0.57, y: b.height * 0.43 } });
  await page.getByRole("button", { name: "Acquire observation" }).click();
  await tick(page, 1);
  await page.getByRole("button", { name: /Isolate the power bus/ }).click();
  await tick(page, 4);
  await page.getByRole("button", { name: "Analyze", exact: true }).click();
  await page.getByLabel("Observation target").selectOption("galaxy");
  await page.getByLabel("Observation filter").selectOption("Visible");
  b = (await scope.boundingBox())!;
  await scope.click({ position: { x: b.width * 0.42, y: b.height * 0.58 } });
  await page.getByRole("button", { name: "Acquire observation" }).click();
  await tick(page, 5);
  await page.getByRole("button", { name: "Analyze", exact: true }).click();
  await page.getByRole("button", { name: /Use relay satellite/ }).click();
  await close(page);
  await walk(page, -3.8, 18.5);
  await use(page, "evidence", [-5.7, 1.65, 18.5]);
  await page.getByRole("button", { name: /Request comparison/ }).click();
  await page
    .getByRole("button", { name: "Accept chapter debrief & begin chapter 4" })
    .click();
  await close(page);
  await walk(page, -3, 12.5);
  await use(page, "life", [-4.25, 1.55, 12.5]);
  await page
    .getByRole("button", { name: /Install emergency cartridge/ })
    .click();
  await page
    .getByRole("button", { name: /Replace scrubber controller/ })
    .click();
  await page.screenshot({ path: "artifacts/fps-07-life-support.png" });
  await close(page);
  await walk(page, 0, 20.5);
  await walk(page, 3, 21.2);
  await use(page, "bunk", [3, 1.2, 22.65]);
  await tick(page, 7);
  await walk(page, -3.8, 20.5);
  await walk(page, -3.8, 18.5);
  await use(page, "evidence", [-5.7, 1.65, 18.5]);
  await page
    .getByRole("button", { name: "Accept chapter debrief & begin chapter 5" })
    .click();
  await page.getByRole("button", { name: /Shelter the crew/ }).click();
  await page
    .locator(".hypothesis-grid .panel")
    .filter({
      has: page.getByRole("heading", { name: "Unusual stellar variability" }),
    })
    .getByRole("button", {
      name: /Choose interpretation|Current interpretation/,
    })
    .click();
  await page.screenshot({ path: "artifacts/fps-08-evidence.png" });
  await page
    .getByRole("button", { name: "Return to Earth", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm deorbit & recovery" })
    .click();
  await expect(
    page.getByRole("heading", { name: "the greatest discovery", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/fps-09-debrief.png" });
  expect(errors).toEqual([]);
});

test("restores first-person position, settings, pause state and chapter checkpoint", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await tick(page, 1);
  await walk(page, 2, 14.5);
  await use(page, "suit", [3.27, 1.55, 13.7]);
  await walk(page, 1, 12.5);
  await page.keyboard.press("Escape");
  await tick(page, 0.3);
  await page.getByRole("button", { name: "Save mission", exact: true }).click();
  const x = await read(page, "player-x"),
    z = await read(page, "player-z");
  await page.reload();
  await tick(page, 1);
  expect(await read(page, "player-x")).toBeCloseTo(x, 1);
  expect(await read(page, "player-z")).toBeCloseTo(z, 1);
  await expect(world(page)).toHaveAttribute("data-suited", "true");
  await expect(page.locator(".sidebar,.main-menu")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await tick(page, 0.3);
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page.getByLabel("Graphics quality").selectOption("Low");
  await page.getByLabel("Larger interface text").check();
  await expect(page.locator(".game-root")).toHaveClass(/large-text/);
  await page.screenshot({ path: "artifacts/fps-settings.png" });
  await close(page);
  await expect(
    page.getByRole("dialog", { name: "Mission paused" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Restore chapter checkpoint", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restore checkpoint", exact: true })
    .click();
  await tick(page, 0.5);
  expect(await read(page, "player-x")).toBeCloseTo(0, 1);
  expect(await read(page, "player-z")).toBeCloseTo(14.5, 1);
  await expect(world(page)).toHaveAttribute("data-paused", "false");
});

test.describe("small touch screen", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  test("touch movement, drag look, handbook and pause fit the screen", async ({
    page,
  }) => {
    await page.clock.install();
    await page.goto("/");
    await tick(page, 1);
    await expect(page.locator(".touch-controls")).toBeVisible();
    const z = await read(page, "player-z");
    const up = page.getByRole("button", { name: "Move forward", exact: true });
    const box = (await up.boundingBox())!;
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await tick(page, 1);
    await page.mouse.up();
    await tick(page, 0.3);
    expect(await read(page, "player-z")).toBeLessThan(z - 2);
    const yaw = await read(page, "yaw");
    await page.mouse.move(150, 400);
    await page.mouse.down();
    await page.mouse.move(230, 400, { steps: 5 });
    await page.mouse.up();
    await tick(page, 0.3);
    expect(await read(page, "yaw")).toBeLessThan(yaw - 0.2);
    await page.screenshot({ path: "artifacts/fps-mobile.png" });
    await page.getByRole("button", { name: "Pause mission" }).click();
    await page
      .getByRole("button", { name: "Field handbook", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "You are the commander." }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    await close(page);
    await page.getByRole("button", { name: "Resume exploration" }).click();
    await expect(world(page)).toHaveAttribute("data-paused", "false");
  });
});
