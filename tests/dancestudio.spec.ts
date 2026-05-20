import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { openGame, navigateTo, getVar, setVar, wikifyEval, wikifyToText, assertNoErrors } from "./helpers.js";

/** Set a block of flat old-save vars to simulate a pre-0.5.8.10 save. */
async function setOldFlatVars(page: Page, vars: Record<string, unknown>) {
	await page.evaluate(v => {
		const V = (window as any).SugarCube.State.variables;
		for (const [key, val] of Object.entries(v)) V[key] = val;
	}, vars);
}

/** Unset $danceStudio to simulate a save that predates the object. */
async function unsetDanceStudio(page: Page) {
	await page.evaluate(() => {
		delete (window as any).SugarCube.State.variables.danceStudio;
	});
}

test.describe("Dance Studio", () => {
	test.beforeEach(async ({ page }) => {
		await openGame(page);
		await navigateTo(page, "Start2");
	});

	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test.describe("variables", () => {
		test("have correct default values after Start2", async ({ page }) => {
			const ds = (await getVar(page, "danceStudio")) as any;

			expect(ds.intro).toBe(false);
			expect(ds.jobOffered).toBe(false);
			expect(ds.anger).toBe(0);
			expect(ds.handVirginProtected).toBe(false);
			expect(ds.job).toBeUndefined();
		});
	});

	test.describe("legacy variables", () => {
		test("are absent on new game", async ({ page }) => {
			expect(await getVar(page, "dancestudiointro")).toBeUndefined();
			expect(await getVar(page, "dance_job_intro")).toBeUndefined();
			expect(await getVar(page, "dancestudioanger")).toBeUndefined();
			expect(await getVar(page, "dancestage")).toBeUndefined();
			expect(await getVar(page, "dancelesson")).toBeUndefined();
		});

		test("are migrated from old save", async ({ page }) => {
			await unsetDanceStudio(page);
			await setOldFlatVars(page, {
				dancestudiointro: 1,
				dancestudioanger: 3,
				dancestage: 1,
				dancelesson: "barre",
				dance_job_intro: 1,
			});

			await wikifyEval(page, "<<backComp>>");

			const ds = (await getVar(page, "danceStudio")) as any;
			expect(ds.intro).toBe(true);
			expect(ds.jobOffered).toBe(true);
			expect(ds.anger).toBe(3);
			expect(ds.stage).toBe(1);
			expect(ds.lesson).toBe("barre");
			expect(ds.handVirginProtected).toBe(false);
		});

		test("are cleaned up after migration", async ({ page }) => {
			await unsetDanceStudio(page);
			await setOldFlatVars(page, {
				dancestudiointro: 1,
				dancestudioanger: 2,
				dancestage: 0,
				dancelesson: "noinstructor",
				dance_job_intro: 0,
				dance_love: 5,
			});

			await wikifyEval(page, "<<backComp>>");

			expect(await getVar(page, "dancestudiointro")).toBeUndefined();
			expect(await getVar(page, "dancestudioanger")).toBeUndefined();
			expect(await getVar(page, "dancestage")).toBeUndefined();
			expect(await getVar(page, "dancelesson")).toBeUndefined();
			expect(await getVar(page, "dance_job_intro")).toBeUndefined();
			expect(await getVar(page, "dance_love")).toBeUndefined();
		});

		test("migrates active dance job from old save", async ({ page }) => {
			await unsetDanceStudio(page);
			const fakeTime = 1000000;
			await setOldFlatVars(page, {
				dance_job_time: fakeTime,
				dance_job_interest: 75,
				dance_job_stage: 2,
				dance_job_stage_explore: 300,
				dance_job_bunny: 1,
				dance_job_exhib: true,
				dance_job_exposed: 0,
			});

			await wikifyEval(page, "<<backComp>>");

			const ds = (await getVar(page, "danceStudio")) as any;
			expect(ds.job).toBeDefined();
			expect(ds.job.time).toBe(fakeTime);
			expect(ds.job.interest).toBe(75);
			expect(ds.job.stage).toBe(true); // 2 → true
			expect(ds.job.stageExplore).toBe(300);
			expect(ds.job.bunny).toBe(true); // 1 → true
			expect(ds.job.exhibitionism).toBe(true);
			expect(ds.job.exposed).toBe(false); // 0 → false

			// old vars cleaned up
			expect(await getVar(page, "dance_job_time")).toBeUndefined();
			expect(await getVar(page, "dance_job_interest")).toBeUndefined();
			expect(await getVar(page, "dance_job_stage")).toBeUndefined();
		});
	});

	test.describe("<<dance_job_init>> widget", () => {
		test("creates $danceStudio.job with specified interest", async ({ page }) => {
			await wikifyEval(page, "<<dance_job_init 180 70>>");

			const ds = (await getVar(page, "danceStudio")) as any;
			expect(ds.job).toBeDefined();
			expect(ds.job.interest).toBe(70);
			expect(ds.job.stage).toBe(false);
			expect(ds.job.stageExplore).toBe(0);
			expect(ds.job.bunny).toBe(false);
			expect(ds.job.exhibitionism).toBe(false);
			expect(ds.job.exposed).toBe(false);
			expect(typeof ds.job.time).toBe("number");
			expect(ds.job.time).toBeGreaterThan(0);
		});

		test("defaults interest to 50 when no second argument", async ({ page }) => {
			await wikifyEval(page, "<<dance_job_init 180>>");
			const ds = (await getVar(page, "danceStudio")) as any;
			expect(ds.job.interest).toBe(50);
		});
	});

	test.describe("<<dance_job_end>> widget", () => {
		test("unsets $danceStudio.job and marks danceJob done", async ({ page }) => {
			await wikifyEval(page, "<<dance_job_init 180 60>>");
			expect((await getVar(page, "danceStudio")) as any).toHaveProperty("job");

			await wikifyEval(page, "<<dance_job_end>>");

			const ds = (await getVar(page, "danceStudio")) as any;
			expect(ds.job).toBeUndefined();

			const weekly = (await getVar(page, "weekly")) as any;
			expect(weekly.danceJob).toBe("done");
		});
	});

	test.describe("<<dance_job_text>> widget", () => {
		const tiers = [
			{ interest: 100, text: "enthralled", cssClass: "green" },
			{ interest: 80, text: "captivated", cssClass: "teal" },
			{ interest: 60, text: "eager", cssClass: "lblue" },
			{ interest: 40, text: "interested", cssClass: "blue" },
			{ interest: 20, text: "bored", cssClass: "purple" },
			{ interest: 1, text: "upset", cssClass: "pink" },
			{ interest: 0, text: "angry", cssClass: "red" },
		];

		for (const { interest, text, cssClass } of tiers) {
			test(`displays "${text}" at interest ${interest}`, async ({ page }) => {
				await wikifyEval(page, "<<dance_job_init 180 50>>");
				const result = await page.evaluate(
					({ i, cls }) => {
						const V = (window as any).SugarCube.State.variables;
						V.danceStudio.job.interest = i;
						const div = document.createElement("div");
						new (window as any).SugarCube.Wikifier(div, "<<dance_job_text>>");
						const span = div.querySelector(`span.${cls}`);
						return { fullText: div.textContent ?? "", hasSpan: !!span };
					},
					{ i: interest, cls: cssClass }
				);
				expect(result.fullText).toContain(text);
				expect(result.hasSpan).toBe(true);
			});
		}
	});

	test.describe("<<dance_job_interest>> widget", () => {
		test("increments $danceStudio.job.interest by the argument", async ({ page }) => {
			await wikifyEval(page, "<<dance_job_init 180 50>>");
			await wikifyEval(page, "<<dance_job_interest 15>>");
			const ds = (await getVar(page, "danceStudio")) as any;
			expect(ds.job.interest).toBe(65);
		});

		test("decrements $danceStudio.job.interest with negative argument", async ({ page }) => {
			await wikifyEval(page, "<<dance_job_init 180 50>>");
			await wikifyEval(page, "<<dance_job_interest -20>>");
			const ds = (await getVar(page, "danceStudio")) as any;
			expect(ds.job.interest).toBe(30);
		});

		test("is a no-op with no argument", async ({ page }) => {
			await wikifyEval(page, "<<dance_job_init 180 50>>");
			await wikifyEval(page, "<<dance_job_interest>>");
			const ds = (await getVar(page, "danceStudio")) as any;
			expect(ds.job.interest).toBe(50);
		});
	});

	test("passage renders without errors", async ({ page }) => {
		await setVar(page, "outside", 0);
		await setVar(page, "location", "dance_studio");
		await setVar(page, "exposed", 0);
		await setVar(page, "openinghours", 1);
		await setVar(page, "money", 5000);
		await navigateTo(page, "Dance Studio");
		await expect(page.locator("#passages")).toContainText("dance lesson");
	});
});
