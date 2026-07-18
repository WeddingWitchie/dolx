import { test, expect } from "@playwright/test";
import { openGame, navigateTo, assertNoErrors, advanceHours, type Page } from "./helpers.js";

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
});
