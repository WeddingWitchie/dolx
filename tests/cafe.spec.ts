import { test, expect } from "@playwright/test";
import { openGame, navigateTo, assertNoErrors, advanceHours, setDay, wikifyEval, type Page } from "./helpers.js";

async function setupGame(page: Page) {
	await openGame(page);
	await navigateTo(page, "Start2");
}

test.describe("Ocean Breeze Cafe", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("shows open description during business hours", async ({ page }) => {
		await setupGame(page);
		// Game starts at 7:00 — openinghours is 1
		await navigateTo(page, "Ocean Breeze");

		// Scope to #passages to avoid matching raw tw-passagedata source nodes
		const passages = page.locator("#passages");
		await expect(passages.getByText("You are in the Ocean Breeze Cafe.")).toBeVisible();
		await expect(passages.getByText("You are alone in the darkness.")).not.toBeVisible();
		await expect(passages.getByText("It's closing time.", { exact: false })).not.toBeVisible();
	});

	test("shows darkness message when closed outside business hours", async ({ page }) => {
		await setupGame(page);
		// Advance 16 hours: 7:00 → 23:00 (openinghours = 0, hour ≠ closinghour)
		await advanceHours(page, 16);
		await navigateTo(page, "Ocean Breeze");

		await expect(page.locator("#passages").getByText("You are alone in the darkness.")).toBeVisible();
	});

	test("shows closing time message at hour 21", async ({ page }) => {
		await setupGame(page);
		// Advance 14 hours: 7:00 → 21:00 (openinghours = 0, hour === closinghour)
		await advanceHours(page, 14);
		await navigateTo(page, "Ocean Breeze");

		const passages = page.locator("#passages");
		await expect(passages.getByText("It's closing time.", { exact: false })).toBeVisible();
		await expect(passages.getByText("You are alone in the darkness.")).not.toBeVisible();
	});

	test("shows cash register theft link when closed outside business hours", async ({ page }) => {
		await setupGame(page);
		// Advance 16 hours: 7:00 → 23:00 (openinghours = 0, hour ≠ closinghour)
		await advanceHours(page, 16);
		await navigateTo(page, "Ocean Breeze");

		await expect(page.getByRole("link", { name: "Examine the cash register" })).toBeVisible();
	});

	test("hides cash register theft link at closing time", async ({ page }) => {
		await setupGame(page);
		// Advance 14 hours: 7:00 → 21:00 (hour === closinghour — theft unavailable)
		await advanceHours(page, 14);
		await navigateTo(page, "Ocean Breeze");

		await expect(page.getByRole("link", { name: "Examine the cash register" })).not.toBeVisible();
	});

	test("keeps unlocked Gwylan cafe walks available on both streets", async ({ page }) => {
		await setupGame(page);
		await wikifyEval(page, '<<initnpc "Gwylan">>');
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.gwylanSeen.pushUnique("cafe_walk");
			V.gwylan.sea = 0;
			V.daily.gwylan = {};
			V.avery_mansion = 0;
			V.chef_state = 0;
			V.chef_rework = 0;
			V.tutorial = 1;
			V.exposed = 0;
			V.stress = 0;
			V.possessed = false;
			V.eventskip = 1;
		});
		await setDay(page, "Monday", 7, 7);

		await navigateTo(page, "Danube Street");
		await expect(page.getByRole("link", { name: "Walk with Gwylan (0:05)" })).toBeVisible();
		await page.getByRole("link", { name: "Walk with Gwylan (0:05)" }).click();
		await page.waitForFunction(() => (window as any).SugarCube.State.active.title === "Gwylan Walk Cafe Solo");
		await page.getByRole("link", { name: "Next" }).click();
		await page.waitForFunction(() => (window as any).SugarCube.State.active.title === "Gwylan Ocean Breeze");
		await expect.poll(() => page.evaluate(() => (window as any).SugarCube.State.variables.daily.gwylan.cafe)).toBe(true);

		await page.evaluate(() => ((window as any).SugarCube.State.variables.daily.gwylan = {}));
		await navigateTo(page, "Domus Street");
		await expect(page.getByRole("link", { name: "Walk with Gwylan (0:05)" })).toBeVisible();

		await page.evaluate(() => ((window as any).SugarCube.State.variables.daily.gwylan = {}));
		await setDay(page, "Monday", 7, 20);
		await navigateTo(page, "Danube Street");
		await expect(page.getByRole("link", { name: "Walk with Gwylan (0:05)" })).not.toBeVisible();
	});

	test("routes shared Gwylan walks around cafe renovations", async ({ page }) => {
		await setupGame(page);
		await wikifyEval(page, '<<initnpc "Gwylan">>');
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.gwylanSeen.pushUnique("cafe_walk");
			V.daily.gwylan = {};
			V.location = "forest_shop";
			V.phase = 0;
			V.chef_state = 7;
			V.chef_rework = 10;
		});

		await navigateTo(page, "Gwylan Walk Cafe Solo");
		await page.getByRole("link", { name: "Next" }).click();
		await page.waitForFunction(() => (window as any).SugarCube.State.active.title === "Gwylan Cliff");
		await expect.poll(() => page.evaluate(() => (window as any).SugarCube.State.variables.daily.gwylan.cafe)).toBe(true);
	});
});
