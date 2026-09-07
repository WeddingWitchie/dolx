import { expect, test, type Page } from "@playwright/test";
import { advanceHours, advanceMinutes, assertNoErrors, getVar, navigateTo, openGame, setDay, setVar, wikifyEval } from "./helpers.js";

const MINUTES_PER_DAY = 24 * 60;

async function setupGame(page: Page) {
	await openGame(page);
	await navigateTo(page, "Start2");
}

async function getTime(page: Page) {
	return page.evaluate(() => {
		const Time = (window as any).Time;
		return { hour: Time.hour, minute: Time.minute };
	});
}

test.afterEach(async ({ page }) => {
	await assertNoErrors(page);
});

test.describe("Time", () => {
	test("has expected hour and minute after 30 minutes", async ({ page }) => {
		await setupGame(page);

		const timeBefore = await getTime(page);
		await advanceMinutes(page, 30);
		const timeAfter = await getTime(page);

		const totalMinutesBefore = timeBefore.hour * 60 + timeBefore.minute;
		const totalMinutesAfter = timeAfter.hour * 60 + timeAfter.minute;
		const elapsed = (totalMinutesAfter - totalMinutesBefore + MINUTES_PER_DAY) % MINUTES_PER_DAY;

		expect(elapsed).toBe(30);
	});

	test("decays fresh pain at -0.3 per minute (acclimation model)", async ({ page }) => {
		await setupGame(page);

		await page.evaluate(() => {
			(window as any).SugarCube.State.variables.pain = 80;
			(window as any).SugarCube.State.variables.painDuration = 0;
		});

		await advanceMinutes(page, 10);
		const painDecrease = await page.evaluate(() => 80 - (window as any).SugarCube.State.variables.pain);

		// setup.painChangeByTime starts at PAIN_DECAY_MIN (-0.3/min) and ramps toward
		// PAIN_DECAY_MAX (-0.5/min) as painDuration accumulates. Fresh pain: 10 * 0.3 = 3.
		expect(painDecrease).toBe(3);
	});

	test("runs the noon check when a multi-hour activity ends inside the noon hour", async ({ page }) => {
		await setupGame(page);
		await setDay(page, "Wednesday", 10, 30);
		await page.evaluate(() => ((window as any).SugarCube.State.variables.robinwakeday = 7));

		// Lands at 12:30. The hour loop used to process 11:00 twice and never reach 12:00.
		await advanceMinutes(page, 120);

		const result = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			return { hour: (window as any).Time.hour, robinwakeday: V.robinwakeday };
		});

		expect(result.hour).toBe(12);
		expect(result.robinwakeday).toBe(0);
	});

	test("runs the noon check when an overnight sleep ends after noon", async ({ page }) => {
		await setupGame(page);
		await setDay(page, "Wednesday", 22, 30);
		await page.evaluate(() => ((window as any).SugarCube.State.variables.robinwakeday = 7));

		// 22:30 -> 12:30 the next day, crossing midnight. The hours after midnight are passed by a second call
		// that used to re-process hour 0 and stop an hour short of the hour it landed on.
		await advanceMinutes(page, 14 * 60);

		const result = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			return { hour: (window as any).Time.hour, robinwakeday: V.robinwakeday };
		});

		expect(result.hour).toBe(12);
		expect(result.robinwakeday).toBe(0);
	});

	test("runs the dawn check when a multi-hour activity ends inside the dawn hour", async ({ page }) => {
		await setupGame(page);
		await setDay(page, "Wednesday", 4, 30);
		await page.evaluate(() => ((window as any).SugarCube.State.variables.wolfwake = 5));

		await advanceMinutes(page, 120); // -> 06:30

		const result = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			return { hour: (window as any).Time.hour, wolfwake: V.wolfwake };
		});

		expect(result.hour).toBe(6);
		expect(result.wolfwake).toBe(0);
	});

	test("runs the noon check only once when the clock crosses noon", async ({ page }) => {
		await setupGame(page);
		await setDay(page, "Wednesday", 11, 50);
		await page.evaluate(() => ((window as any).SugarCube.State.variables.lake_ice_broken = 5));

		// 11:50 -> 13:00. noonCheck decrements lake_ice_broken; the loop used to run the first hour of the
		// range twice, which double-ticked everything noonCheck does (including pregnancy progress).
		await advanceMinutes(page, 70);

		const iceBroken = await page.evaluate(() => (window as any).SugarCube.State.variables.lake_ice_broken);
		expect(iceBroken).toBe(4);
	});

	test("passes several days at once without losing an hour or a day tick", async ({ page }) => {
		await setupGame(page);

		const consoleErrors: string[] = [];
		page.on("console", message => {
			if (message.type() === "error") {
				consoleErrors.push(message.text());
			}
		});

		await setDay(page, "Wednesday", 22, 30);
		await advanceMinutes(page, 74 * 60); // three days and two hours -> Sunday 00:30

		const result = await page.evaluate(() => {
			const Time = (window as any).Time;
			return { day: Time.weekDayName, hour: Time.hour, minute: Time.minute };
		});

		expect(result).toEqual({ day: "Sunday", hour: 0, minute: 30 });
		expect(consoleErrors.filter(text => text.includes("failed"))).toHaveLength(0);
	});

	test("clears a leaked $statFreeze so daily flags reset again", async ({ page }) => {
		await setupGame(page);

		// A save that left a frozen scene without its teardown: the flag is set, with no snapshot to restore.
		await setVar(page, "statFreeze", true);
		await setVar(page, "daily", { confessed: true });
		await navigateTo(page, "Bedroom");

		expect(await getVar(page, "statFreeze")).toBeUndefined();

		await advanceHours(page, 24);
		const daily = await getVar(page, "daily");
		expect(daily.confessed).toBeUndefined();
	});

	test("leaves a frozen scene alone until the player is back in the world", async ({ page }) => {
		await setupGame(page);

		// $frozenValues holds a copy of every variable, so only ever ask the page whether it is there.
		const frozenState = () =>
			page.evaluate(() => {
				const V = (window as any).SugarCube.State.variables;
				return { statFreeze: V.statFreeze, hasSnapshot: V.frozenValues !== undefined };
			});

		await wikifyEval(page, "<<freezePlayerStats>>");
		expect(await frozenState()).toEqual({ statFreeze: true, hasSnapshot: true });

		// Still inside the scene: the Temple is not one of setup.majorAreas, so the freeze must survive.
		await navigateTo(page, "Temple");
		expect(await frozenState()).toEqual({ statFreeze: true, hasSnapshot: true });

		// Back at a modern-day hub while still frozen: the scene's teardown was missed, so run it.
		await navigateTo(page, "Bedroom");
		expect(await frozenState()).toEqual({ statFreeze: undefined, hasSnapshot: false });
	});
});

test.describe("openinghours", () => {
	test("is enabled at 7:00", async ({ page }) => {
		await setupGame(page);

		const result = await page.evaluate(() => {
			const Time = (window as any).Time;
			return { openingHours: Time.openingHours(), hour: Time.hour };
		});

		expect(result.hour).toBe(7);
		expect(result.openingHours).toBe(true);
	});

	test("is disabled at 21:00", async ({ page }) => {
		await setupGame(page);

		// Game starts at 7:00. Advance 14 hours to 21:00.
		await advanceHours(page, 14);

		const result = await page.evaluate(() => {
			const Time = (window as any).Time;
			return { openingHours: Time.openingHours(), hour: Time.hour };
		});

		expect(result.hour).toBe(21);
		expect(result.openingHours).toBe(false);
	});
});
