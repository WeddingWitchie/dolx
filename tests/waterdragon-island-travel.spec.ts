import { test, expect } from "@playwright/test";
import * as path from "path";
import { fileURLToPath } from "url";
import { assertNoErrors, getVar, navigateTo, setVar, waitForPassage, wikifyEval } from "./helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_URL = `file://${path.resolve(__dirname, "../Degrees of Lewdity VERSION.html")}`;

test.describe("Water Dragon island travel", () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem("verifiedAge", "true"));
		await page.goto(GAME_URL);
		await waitForPassage(page);
		await navigateTo(page, "Start2");
	});

	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("the return crossing unlocks below all camp actions after the spear event", async ({ page }) => {
		await wikifyEval(page, "<<island_init>>");
		await setVar(page, "waterdragon", 7);
		await page.evaluate(() => {
			(window as any).SugarCube.State.variables.island.home = "rocky_hillock";
		});

		await navigateTo(page, "Island");
		const returnLink = page.locator('#passages a[data-passage="Water Dragon Town Travel"]');
		await expect(returnLink).toHaveCount(0);

		await setVar(page, "spear_vessel", "sea");
		await setVar(page, "waterdragon", 0);
		await navigateTo(page, "Island");
		await expect(returnLink).toHaveCount(0);

		await setVar(page, "waterdragon", 7);
		await navigateTo(page, "Island");
		await expect(returnLink).toContainText("Swim back to town");
		await expect(page.locator("#passages a[data-passage]").last()).toHaveAttribute("data-passage", "Water Dragon Town Travel");
		await setVar(page, "petIslandAbsence", undefined);
		await returnLink.click();

		expect(await getVar(page, "waterdragonJourneyDay")).toBe(-1);
		expect(await getVar(page, "sea")).toBe(100);
		expect(await getVar(page, "location")).toBe("sea");
		expect(await getVar(page, "sublocation")).toBe("sea");
		expect(await getVar(page, "outside")).toBe(1);
		expect(
			await page.evaluate(() => {
				return (window as any).SugarCube.State.temporary.inWater;
			})
		).toBe(true);
		expect(await getVar(page, "petIslandAbsence")).toEqual(
			expect.objectContaining({
				start: expect.any(Number),
				last: expect.any(Number),
			})
		);
	});

	test("the shared continuation widget preserves both travel directions", async ({ page }) => {
		const destinationFor = async (day: number) => {
			await setVar(page, "waterdragonJourneyDay", day);
			return page.evaluate(() => {
				const div = document.createElement("div");
				new (window as any).SugarCube.Wikifier(div, "<<waterdragonTravelContinue>>");
				return div.querySelector("a")?.getAttribute("data-passage");
			});
		};

		expect(await destinationFor(7)).toBe("Water Dragon Island Arrival 1");
		expect(await destinationFor(-7)).toBe("Water Dragon Town Arrival 1");
		expect(await destinationFor(-3)).toBe("Water Dragon Island Travel Day");

		await setVar(page, "location", "sea");
		await setVar(page, "sublocation", "sea");
		await navigateTo(page, "Water Dragon Travel Ruins");
		await page.locator('#passages a[data-passage="Water Dragon Island Travel Day"]').click();
		expect(await getVar(page, "waterdragonJourneyDay")).toBe(-4);
		await expect(page.locator("#passages")).toContainText("Day 4 of your crossing");
	});

	test("the ruins event does not recognise islander writing before the first visit", async ({ page }) => {
		await setVar(page, "waterdragonJourneyDay", 3);
		await setVar(page, "location", "sea");
		await page.evaluate(() => {
			delete (window as any).SugarCube.State.variables.islander_language;
		});
		await navigateTo(page, "Water Dragon Travel Ruins");

		await expect(page.locator("#passages")).toContainText("carved with unfamiliar marks");
		await expect(page.locator("#passages")).not.toContainText("used by the islanders");

		await setVar(page, "islander_language", 0);
		await navigateTo(page, "Water Dragon Travel Ruins");
		await expect(page.locator("#passages")).toContainText("marks like those used by the islanders");
		expect(await getVar(page, "islander_language")).toBe(15);
	});

	test("a stale signed journey counter is cleared after reaching unrelated land", async ({ page }) => {
		await setVar(page, "waterdragonJourneyDay", -4);
		await setVar(page, "location", "town");
		await navigateTo(page, "Bedroom");

		expect(await getVar(page, "waterdragonJourneyDay")).toBe(0);
	});

	test("all shared crossing scenes render without runtime errors", async ({ page }) => {
		const passages = [
			"Water Dragon Travel Whale 1",
			"Water Dragon Travel Whale 2",
			"Water Dragon Travel Whale 3",
			"Water Dragon Travel Dolphins",
			"Water Dragon Travel Dolphins Friendly",
			"Water Dragon Travel Sea Eye",
			"Water Dragon Travel Rest",
			"Water Dragon Travel Trash",
			"Water Dragon Travel Shoal",
			"Water Dragon Travel Current",
			"Water Dragon Travel Storm",
			"Water Dragon Travel Song",
			"Water Dragon Travel Black Moon",
			"Water Dragon Travel Black Moon 2",
			"Water Dragon Travel Black Moon 3",
			"Water Dragon Travel Blood Moon",
			"Water Dragon Travel Blood Moon 2",
			"Water Dragon Travel Blood Moon 3",
			"Water Dragon Travel Jellyfish",
			"Water Dragon Travel Kelp Forest",
			"Water Dragon Travel Ruins",
			"Water Dragon Island Arrival 1",
			"Water Dragon Island Arrival 2",
			"Water Dragon Island Arrival 3",
			"Water Dragon Island Arrival 4",
			"Water Dragon Town Arrival 1",
			"Water Dragon Town Arrival 2",
			"Water Dragon Town Arrival 3",
		];

		await setVar(page, "waterdragonJourneyDay", -3);
		await setVar(page, "location", "sea");
		await setVar(page, "sublocation", "sea");
		for (const passage of passages) {
			await navigateTo(page, passage);
			await assertNoErrors(page);
		}
	});

	for (const event of ["Jellyfish", "Kelp Forest", "Ruins"]) {
		test(`the ${event.toLowerCase()} encounter renders during either crossing`, async ({ page }) => {
			await setVar(page, "waterdragonJourneyDay", -3);
			await navigateTo(page, `Water Dragon Travel ${event}`);

			await expect(page.locator('#passages a[data-passage="Water Dragon Island Travel Day"]')).toContainText("Continue onward");
		});
	}

	test("town arrival clears journey and island-only state before landing at the beach", async ({ page }) => {
		await wikifyEval(page, "<<island_init>>");
		await setVar(page, "waterdragonJourneyDay", -7);
		await setVar(page, "sea", 100);
		await setVar(page, "hunger", 600);
		await navigateTo(page, "Water Dragon Town Arrival 3");

		const beachLink = page.locator('#passages a[data-passage="Sea Beach"]');
		await expect(beachLink).toContainText("Swim along the beach");
		await beachLink.click();

		expect(await getVar(page, "waterdragonJourneyDay")).toBe(0);
		expect(await getVar(page, "sea")).toBe(0);
		expect(await getVar(page, "hunger")).toBe(0);
		await expect(page.locator("#passages")).toContainText("You are swimming in the sea along the beach.");
	});
});
