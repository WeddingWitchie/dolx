import { test, expect } from "@playwright/test";
import { openGame, navigateTo, getVar, setVar, setTime, wikifyEval, assertNoErrors, type Page } from "./helpers.js";

/*
 * Smoke tests for formerly-empty passages brought back to life:
 * - Mines miner route (low flats-auction result): hub, mining, canteen, sleeping quarters, escape dig
 * - Dance Job Docks (Mer Street student party)
 * - Watching the Forest Kiss (Black Wolf, monster people)
 */

async function start(page: Page) {
	await openGame(page);
	await navigateTo(page, "Start2");
}

test.describe("Mines miner route", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("miner intro leads to the Mines hub with work links", async ({ page }) => {
		await start(page);
		await wikifyEval(page, "<<generate1>><<generate2>><<person1>>");
		await navigateTo(page, "Mines Intro Miner");
		const passages = page.locator("#passages");
		await expect(passages.getByText("We expect each prisoner to find 10 a day")).toBeVisible();

		await passages.locator("a").filter({ hasText: "Next" }).first().click();
		await expect(passages.getByText("warren of tunnels")).toBeVisible();
		expect(await getVar(page, "mines_crystals")).toBe(0);
		await expect(passages.locator("a").filter({ hasText: "Mine crystals" })).toBeVisible();
		await expect(passages.locator("a").filter({ hasText: "Canteen" })).toBeVisible();
		await expect(passages.locator("a").filter({ hasText: "Sleeping Quarters" })).toBeVisible();
	});

	test("mining crystals increases the count and pickaxe proficiency", async ({ page }) => {
		await start(page);
		await wikifyEval(page, "<<mines_init>><<set $mines_crystals to 0>>");
		await navigateTo(page, "Mines");
		const passages = page.locator("#passages");
		await passages.locator("a").filter({ hasText: "Mine crystals" }).click();
		await expect(passages.getByText(/from the stone/)).toBeVisible();

		const crystals = (await getVar(page, "mines_crystals")) as number;
		expect(crystals).toBeGreaterThanOrEqual(1);
		const prof = (await getVar(page, "prof")) as any;
		expect(prof.pickaxe).toBeGreaterThanOrEqual(1);
	});

	test("canteen serves a meal for 10 crystals at 18:00", async ({ page }) => {
		await start(page);
		await wikifyEval(page, "<<mines_init>><<set $mines_crystals to 12>>");
		await setTime(page, 18, 0);
		await navigateTo(page, "Mines Canteen");
		const passages = page.locator("#passages");
		await passages.locator("a").filter({ hasText: "Hand over 10 crystals" }).click();
		await expect(passages.getByText(/stew, bread/)).toBeVisible();
		expect(await getVar(page, "mines_crystals")).toBe(2);
	});

	test("canteen turns you away without quota, and is shuttered off-hours", async ({ page }) => {
		await start(page);
		await wikifyEval(page, "<<mines_init>><<set $mines_crystals to 3>>");
		await setTime(page, 18, 0);
		await navigateTo(page, "Mines Canteen");
		const passages = page.locator("#passages");
		await expect(passages.locator("a").filter({ hasText: "Join the queue anyway" })).toBeVisible();

		await setTime(page, 12, 0);
		await navigateTo(page, "Mines Canteen");
		await expect(passages.locator("a").filter({ hasText: "Drink from the tap" })).toBeVisible();
	});

	test("dig shows percent progress and advances at least half a point per dig", async ({ page }) => {
		await start(page);
		await wikifyEval(page, "<<mines_init>>");
		await setVar(page, "mines_guards_dig", 10);
		// Max pain and tiredness — the old un-floored formula would advance ~0.05/dig here
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.pain = 200;
			V.tiredness = (window as any).C.tiredness.max;
		});
		await navigateTo(page, "Mines Dig");
		const passages = page.locator("#passages");
		await expect(passages.getByText(/% complete/)).toBeVisible();
		const progress = (await getVar(page, "mines_guards_dig")) as number;
		expect(progress).toBeGreaterThanOrEqual(10.5);
	});

	test("escape dig at full progress leads to the flood escape", async ({ page }) => {
		await start(page);
		await wikifyEval(page, "<<mines_init>>");
		await setVar(page, "mines_guards_dig", 20);
		await navigateTo(page, "Mines Dig");
		const passages = page.locator("#passages");
		await expect(passages.getByText("A great torrent bursts into the tunnel")).toBeVisible();
		await expect(passages.locator("a").filter({ hasText: "Escape" })).toBeVisible();
	});

	test("sleeping-quarters bunk opens the standard sleep menu and wakes back in the quarters", async ({ page }) => {
		await start(page);
		await wikifyEval(page, "<<mines_init>>");
		await navigateTo(page, "Mines Sleeping Quarters");
		const passages = page.locator("#passages");
		await passages.locator("a").filter({ hasText: "Lie on a bunk" }).click();
		await expect(passages.locator("a").filter({ hasText: "Sleep for 8 hours" })).toBeVisible();
		await expect(passages.locator("a").filter({ hasText: "Climb off the bunk" })).toBeVisible();

		await passages.locator("a").filter({ hasText: "Sleep for 1 hour" }).click();
		await expect(passages.locator("a").filter({ hasText: "Get up" })).toBeVisible();
		await passages.locator("a").filter({ hasText: "Get up" }).click();
		await expect(passages.getByText("Rows of bunks")).toBeVisible();
	});

	test("guard-route storeroom cot opens the sleep menu and wakes back in the staff room", async ({ page }) => {
		await start(page);
		await wikifyEval(page, "<<mines_init>>");
		await navigateTo(page, "Mines Cot");
		const passages = page.locator("#passages");
		await page.evaluate(() => {
			(window as any).SugarCube.State.variables.mines_bed = "guards";
		});
		await expect(passages.locator("a").filter({ hasText: "Sleep for 8 hours" })).toBeVisible();
		await passages.locator("a").filter({ hasText: "Sleep for 1 hour" }).click();
		await passages.locator("a").filter({ hasText: "Get up" }).click();
		await expect(passages.getByText("staff room in the old mines")).toBeVisible();
	});

	test("giving up in the guard rape combat still ends combat cleanly", async ({ page }) => {
		await start(page);
		await wikifyEval(page, "<<mines_init>>");
		// Simulate reaching the finish passage via give-up: combat flag set, neither enemy pleasure maxed nor health zero
		await wikifyEval(page, "<<generate1>><<person1>><<maninit>>");
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.enemypleasure = 0;
			V.enemyhealth = 100;
			V.finish = 1;
		});
		await navigateTo(page, "Mines Guards Rape Finish");
		const passages = page.locator("#passages");
		await expect(passages.getByText(/unresponsiveness soon bores/)).toBeVisible();
		await expect(passages.locator("a").filter({ hasText: "Next" })).toBeVisible();
		expect(await page.evaluate(() => (window as any).SugarCube.State.variables.combat)).toBe(0);
	});

	test("mines location resolves to the underground background image", async ({ page }) => {
		await start(page);
		const image = await page.evaluate(() => {
			(window as any).SugarCube.State.variables.location = "mines";
			return (window as any).SugarCube.setup.Locations.get();
		});
		expect(image).toBe("underground");
	});

	test("hub hides the side-tunnel option at high suspicion", async ({ page }) => {
		await start(page);
		await wikifyEval(page, "<<mines_init>>");
		await setVar(page, "mines_suspicion", 80);
		await navigateTo(page, "Mines");
		const passages = page.locator("#passages");
		await expect(passages.locator("a").filter({ hasText: "Slip into the side tunnels" })).not.toBeVisible();

		await setVar(page, "mines_suspicion", 10);
		await navigateTo(page, "Mines");
		await expect(passages.locator("a").filter({ hasText: "Slip into the side tunnels" })).toBeVisible();
	});
});

test.describe("Dance Job Docks", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("arrival and party mingling render with all option links", async ({ page }) => {
		await start(page);
		await wikifyEval(page, "<<npc Charlie>><<person1>><<dance_job_init 180 50>>");
		await navigateTo(page, "Dance Job Docks");
		const passages = page.locator("#passages");
		await expect(passages.getByText("Mer Street")).toBeVisible();

		await navigateTo(page, "Dance Job Docks 2");
		await expect(passages.locator("a").filter({ hasText: "Socialise" })).toBeVisible();
		await expect(passages.locator("a").filter({ hasText: "Raid the snack table" })).toBeVisible();
	});

	test("break passage pays out when the job time has elapsed", async ({ page }) => {
		await start(page);
		await wikifyEval(page, "<<dance_job_init 180 50>>");
		// Force the job window to be over
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.danceStudio.job.time = V.timeStamp - 60;
			V.phase = 0;
		});
		const moneyBefore = (await getVar(page, "money")) as number;
		await navigateTo(page, "Dance Job Docks Break");
		const passages = page.locator("#passages");
		await expect(passages.getByText(/rolled wad of notes/)).toBeVisible();
		const moneyAfter = (await getVar(page, "money")) as number;
		expect(moneyAfter).toBeGreaterThan(moneyBefore);
		await expect(passages.locator("a").filter({ hasText: "Next" })).toBeVisible();
	});

	test("break passage offers return to stage while time remains", async ({ page }) => {
		await start(page);
		await wikifyEval(page, "<<dance_job_init 180 50>>");
		await page.evaluate(() => {
			(window as any).SugarCube.State.variables.phase = 0;
		});
		await navigateTo(page, "Dance Job Docks Break");
		const passages = page.locator("#passages");
		await expect(passages.locator("a").filter({ hasText: "Return to the stage" })).toBeVisible();
		await expect(passages.locator("a").filter({ hasText: "Call it a night" })).toBeVisible();
	});

	test("mid-tier Charlie love offers the docks job in Dance Job Ask", async ({ page }) => {
		await start(page);
		await wikifyEval(page, "<<npc Charlie>><<person1>>");
		await page.evaluate(() => {
			const C = (window as any).C;
			C.npc.Charlie.love = 5;
		});
		await navigateTo(page, "Dance Job Ask");
		const passages = page.locator("#passages");
		await expect(passages.getByText(/rented out a building on Mer Street/)).toBeVisible();
		expect(await page.evaluate(() => (window as any).SugarCube.State.variables.weekly.danceJob)).toBe("docks");
	});
});

test.describe("Watching the Forest Kiss", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("kiss scene renders and returns to the watch", async ({ page }) => {
		await start(page);
		await navigateTo(page, "Watching the Forest Kiss");
		const passages = page.locator("#passages");
		await expect(passages.getByText(/press a soft kiss/)).toBeVisible();
		await expect(passages.locator("a").filter({ hasText: "Settle back down" })).toBeVisible();
		await expect(passages.locator("a").filter({ hasText: "Return to the cave" })).toBeVisible();
	});
});
