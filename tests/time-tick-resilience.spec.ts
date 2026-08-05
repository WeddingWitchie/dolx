import { test, expect } from "@playwright/test";
import { openGame, navigateTo, type Page } from "./helpers.js";

async function setupGame(page: Page) {
	await openGame(page);
	await navigateTo(page, "Start2");
}

/** Failure reports raised by reportTickFailure(). Evaluated inside the page. */
async function tickFailures(page: Page): Promise<string[]> {
	return page.evaluate(() => (window as any).Errors.log.map((e: any) => String(e.message)).filter((m: string) => m.includes("failed and was skipped")));
}

/**
 * A subsystem throwing inside a time tick used to cancel everything below it, including
 * V.daily.clearProperties() and the localStorage reset. Time.pass() still advanced the clock in its
 * `finally`, and a <<pass>> inside a <<link>> payload has its error discarded along with the payload's
 * fragment, so the only in-game symptom was daily flags that never reset again — "can't gift Gwylan
 * food any more", "Gwylan wants to hear more stories another day", forever.
 */
test("daily flags still reset when a subsystem in dayPassed throws", async ({ page }) => {
	await setupGame(page);

	const result = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		// V.bird.clean is dereferenced unguarded partway through dayPassed, well above the flag resets.
		delete V.bird;
		V.daily.giftedFood.Gwylan = "plum_pudding";
		V.daily.gwylan.enoughTalk = true;
		localStorage.setItem("gwylanTalk", "3");

		const before = (window as any).Time.days;
		let threwOut = false;
		try {
			// mimics <<pass>> running inside a <<link>> payload
			(window as any).SugarCube.Wikifier.wikifyEval("<<pass 24 hours>>");
		} catch {
			threwOut = true;
		}
		return {
			daysAdvanced: (window as any).Time.days - before,
			giftedFood: V.daily.giftedFood.Gwylan ?? null,
			enoughTalk: V.daily.gwylan.enoughTalk ?? null,
			savescumCounter: localStorage.getItem("gwylanTalk"),
			threwOut,
		};
	});

	expect(result.daysAdvanced).toBe(1);
	expect(result.threwOut).toBe(false);
	expect(result.giftedFood).toBeNull();
	expect(result.enoughTalk).toBeNull();
	expect(result.savescumCounter).toBeNull();
	// Errors.report unhides the in-game error reporter, so the real cause stays findable.
	expect((await tickFailures(page)).join("\n")).toContain("dayPassed failed and was skipped");
});

/** An earlier stage of the pyramid throwing must not stop dayPassed() from running at all. */
test("dayPassed still runs when an earlier tick stage throws", async ({ page }) => {
	await setupGame(page);

	const result = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		// V.pillory.tenant is dereferenced unguarded in hourPassed, before dayPassed is ever reached.
		delete V.pillory;
		V.daily.giftedFood.Gwylan = "plum_pudding";

		const before = (window as any).Time.days;
		(window as any).SugarCube.Wikifier.wikifyEval("<<pass 24 hours>>");
		return {
			daysAdvanced: (window as any).Time.days - before,
			giftedFood: V.daily.giftedFood.Gwylan ?? null,
		};
	});

	expect(result.daysAdvanced).toBe(1);
	expect((await tickFailures(page)).join("\n")).toContain("hourPassed failed and was skipped");
	// The day still turned over, so the daily flags reset.
	expect(result.giftedFood).toBeNull();
});

/** A subsystem that breaks every hour should be reported once, not once per hour. */
test("a repeating tick failure is reported once per Time.pass", async ({ page }) => {
	await setupGame(page);

	await page.evaluate(() => {
		delete (window as any).SugarCube.State.variables.pillory;
		(window as any).SugarCube.Wikifier.wikifyEval("<<pass 24 hours>>");
	});

	const hourly = (await tickFailures(page)).filter(m => m.startsWith("hourPassed"));
	expect(hourly).toHaveLength(1);
});

test("daily flags reset normally across a day boundary", async ({ page }) => {
	await setupGame(page);

	const result = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		V.daily.giftedFood.Gwylan = "plum_pudding";
		V.daily.gwylan.enoughTalk = true;
		(window as any).Time.pass(24 * 60 * 60);
		return {
			giftedFood: V.daily.giftedFood.Gwylan ?? null,
			enoughTalk: V.daily.gwylan.enoughTalk ?? null,
			canGiftAgain: (window as any).canGiftFood("Gwylan"),
		};
	});

	expect(result.giftedFood).toBeNull();
	expect(result.enoughTalk).toBeNull();
	expect(result.canGiftAgain).toBe(false); // no cooked dishes on a fresh save, but the flag is clear
	// A healthy save must not report anything.
	expect(await tickFailures(page)).toEqual([]);
});
