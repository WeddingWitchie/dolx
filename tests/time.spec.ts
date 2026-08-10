import { test, expect } from "@playwright/test";
import { openGame, navigateTo, assertNoErrors, advanceHours, advanceMinutes, setDay, type Page } from "./helpers.js";

async function setupGame(page: Page) {
	await openGame(page);
	await navigateTo(page, "Start2");
}

test.describe("Time", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("has expected hour and minute after 30 minutes", async ({ page }) => {
		await setupGame(page);

		const timeBefore = await page.evaluate(() => {
			const Time = (window as any).Time;
			return { hour: Time.hour, minute: Time.minute };
		});
		await advanceMinutes(page, 30);
		const timeAfter = await page.evaluate(() => {
			const Time = (window as any).Time;
			return { hour: Time.hour, minute: Time.minute };
		});

		// Time should have advanced by 30 minutes
		const totalMinsBefore = timeBefore.hour * 60 + timeBefore.minute;
		const totalMinsAfter = timeAfter.hour * 60 + timeAfter.minute;
		const elapsed = (totalMinsAfter - totalMinsBefore + 24 * 60) % (24 * 60);
		expect(elapsed).toBe(30);
	});

	test("decays fresh pain at -0.3 per minute (acclimation model)", async ({ page }) => {
		await setupGame(page);

		await page.evaluate(() => {
			(window as any).SugarCube.State.variables.pain = 80;
			(window as any).SugarCube.State.variables.painDuration = 0;
		});
		await advanceMinutes(page, 10);
		const painDecrease = await page.evaluate(() => {
			return 80 - (window as any).SugarCube.State.variables.pain;
		});

		// setup.painChangeByTime: decay starts at PAIN_DECAY_MIN (-0.3/min) and ramps toward PAIN_DECAY_MAX (-0.5/min) as painDuration accumulates.
		// Fresh pain: 10 * 0.3 = 3.
		expect(painDecrease).toBe(3);
	});

	test("decays school exam meters using trait-based formula after a week", async ({ page }) => {
		await setupGame(page);

		// Game starts on Sunday. Advance to Saturday so the next day-crossing triggers weekPassed().
		// weekPassed fires when prevDate.weekDay===7 && currentDate.weekDay===1.
		await setDay(page, "Saturday");

		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.science_exam = 100;
			V.sciencetrait = 4; // decay = 7 - max(4-2, 0) = 5
			V.maths_exam = 100;
			V.mathstrait = 0; // decay = 7 - max(0-2, 0) = 7
			V.english_exam = 100;
			V.englishtrait = 2; // decay = 7 - max(2-2, 0) = 7
			V.history_exam = 100;
			V.historytrait = 6; // decay = 7 - max(6-2, 0) = 3
		});

		// Advance 1 day to cross Saturday→Sunday and trigger weekPassed()
		await advanceHours(page, 24);

		const result = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			return {
				science: V.science_exam,
				maths: V.maths_exam,
				english: V.english_exam,
				history: V.history_exam,
			};
		});

		// Trait 4: 100 - 5 = 95
		expect(result.science).toBe(95);
		// Trait 0: 100 - 7 = 93
		expect(result.maths).toBe(93);
		// Trait 2: 100 - 7 = 93
		expect(result.english).toBe(93);
		// Trait 6: 100 - 3 = 97
		expect(result.history).toBe(97);
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
		page.on("console", msg => {
			if (msg.type() === "error") consoleErrors.push(msg.text());
		});
		await setDay(page, "Wednesday", 22, 30);

		await advanceMinutes(page, 74 * 60); // three days and two hours -> Sunday 00:30

		const result = await page.evaluate(() => {
			const Time = (window as any).Time;
			return { day: Time.weekDayName, hour: Time.hour, minute: Time.minute };
		});
		expect(result).toEqual({ day: "Sunday", hour: 0, minute: 30 });
		expect(consoleErrors.filter(text => /failed/.test(text))).toHaveLength(0);
	});

	test("restores godClothes clothing integrity after 1 minute", async ({ page }) => {
		await setupGame(page);

		const upperName = await page.evaluate(() => (window as any).SugarCube.State.variables.worn.upper.name);
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.godClothes = 1;
			V.worn.upper.integrity = 100;
		});
		await advanceMinutes(page, 1);
		const upperIntegrity = await page.evaluate(() => (window as any).SugarCube.State.variables.worn.upper.integrity);

		// Player should be wearing something at game start
		expect(upperName).not.toBe("naked");
		expect(upperIntegrity).toBe(2000);
	});
});

test.describe("openinghours", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("is enabled at 7:00", async ({ page }) => {
		await setupGame(page);

		const result = await page.evaluate(() => {
			const Time = (window as any).Time;
			return { openinghours: Time.openingHours(), hour: Time.hour };
		});

		expect(result.hour).toBe(7);
		expect(result.openinghours).toBe(true);
	});

	test("is disabled at 21:00", async ({ page }) => {
		await setupGame(page);

		// Game starts at 7:00. Advance 14 hours to 21:00.
		await advanceHours(page, 14);
		const result = await page.evaluate(() => {
			const Time = (window as any).Time;
			return { openinghours: Time.openingHours(), hour: Time.hour };
		});

		expect(result.hour).toBe(21);
		expect(result.openinghours).toBe(false);
	});
});
