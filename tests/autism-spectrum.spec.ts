import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { openGame, navigateTo, assertNoErrors, wikifyToText, type Page } from "./helpers.js";

const autismPassageSource = readFileSync(new URL("../game/base-system/kozmods/misc/autism-spectrum.twee", import.meta.url), "utf8");

async function setupAutismTrait(page: Page) {
	await openGame(page);
	await navigateTo(page, "Start2");
	await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		V.backgroundTraits ||= [];
		if (!V.backgroundTraits.includes("autism")) V.backgroundTraits.push("autism");
		delete V.autismSpectrum;
		(window as any).initAutismSpectrumState();
	});
}

test.describe("Autism Spectrum", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("keeps a current interest for several weeks without granting faster skill gains", async ({ page }) => {
		await setupAutismTrait(page);

		const result = await page.evaluate(() => {
			const state = (window as any).ensureAutismSpectrumState();
			state.hyperfixation = "science";
			state.load = 0;
			state.phase = "settled";
			return {
				days: state.hyperfixationEndsDay - (window as any).Time.days,
				interest: (window as any).autismStatGainMultiplier("science", 1, "training"),
				ordinary: (window as any).autismStatGainMultiplier("maths", 1, "training"),
			};
		});

		expect(result.days).toBeGreaterThanOrEqual(20);
		expect(result.days).toBeLessThanOrEqual(30);
		expect(result.interest).toBe(result.ordinary);
		expect(result.interest).toBeCloseTo(1.05, 8);
	});

	test("keeps the Autism-specific Character Talent allowance", async ({ page }) => {
		await setupAutismTrait(page);

		const limits = await page.evaluate(() => ({
			general: (window as any).autismTalentLimit("general"),
			sex: (window as any).autismTalentLimit("sex"),
		}));

		expect(limits).toEqual({ general: 5, sex: 3 });
	});

	test("repairs malformed old-save state without creating parallel state", async ({ page }) => {
		await setupAutismTrait(page);

		const repaired = await page.evaluate(() => {
			const W = window as any;
			const V = W.SugarCube.State.variables;
			V.autismSpectrum = {
				hyperfixation: "science",
				hyperfixationEndsDay: W.Time.days + 25,
				load: 90,
				phase: "settled",
				recoveredToday: 999,
				pendingStats: "science",
				trainingMinutes: -20,
				pendingMinutes: Number.NaN,
				kylarReturn: { location: "school", outside: "invalid" },
				sceneReturn: { passage: "Missing Autism Passage", location: "school", outside: 0 },
				stimReturn: "Missing Autism Passage",
			};
			const original = V.autismSpectrum;
			const state = W.ensureAutismSpectrumState();
			return {
				sameObject: state === original,
				focus: state.hyperfixation,
				phase: state.phase,
				recoveredToday: state.recoveredToday,
				pendingStats: state.pendingStats,
				trainingMinutes: state.trainingMinutes,
				pendingMinutes: state.pendingMinutes,
				hasKylarReturn: Object.hasOwn(state, "kylarReturn"),
				hasSceneReturn: Object.hasOwn(state, "sceneReturn"),
				hasStimReturn: Object.hasOwn(state, "stimReturn"),
			};
		});

		expect(repaired).toEqual({
			sameObject: true,
			focus: "science",
			phase: "burnout",
			recoveredToday: 12,
			pendingStats: [],
			trainingMinutes: 0,
			pendingMinutes: 0,
			hasKylarReturn: false,
			hasSceneReturn: false,
			hasStimReturn: false,
		});
	});

	test("keeps diagnosis, Kylar, and masking language consistent", async ({ page }) => {
		await setupAutismTrait(page);

		const passages = await page.evaluate(() => {
			const Story = (window as any).SugarCube.Story;
			return {
				harper: [
					Story.get("Doctor Harper Autism Check-up").text,
					Story.get("Doctor Harper Autism Check-up 1").text,
					Story.get("Doctor Harper Autism Check-up 2").text,
				].join(" "),
				kylar: [Story.get("Kylar Autism Documentation Kylar").text, Story.get("Kylar Autism Documentation Kylar 1").text].join(" "),
				kylarMask: Story.get("Kylar Autism Masking").text,
				hallways: Story.get("Hallways").text,
				hallwayMask: Story.get("Autism Hallway Overload Mask").text,
				highStreet: Story.get("High Street").text,
				overload: Story.get("Autism Overload").text,
				overloadMask: Story.get("Autism Overload Mask").text,
			};
		});

		expect(passages.harper).toContain("Autism and ADHD often occur together");
		expect(passages.harper).toContain("not something I can or should cure");
		expect(passages.harper).toContain("not the same as having a special talent");
		expect(passages.kylar).toContain("The report doesn't tell me to follow you. That's mine.");
		expect(passages.kylarMask).toContain("You were already doing it when I got here.");
		expect(passages.hallways).toContain('$schoolstate is "lunch"');
		expect(passages.hallways).toContain('<<include "Autism Hallway Overload">>');
		expect(passages.hallwayMask).toContain("noticed that something was wrong");
		expect(passages.hallwayMask).toContain("[[Next|Canteen]]");
		expect(passages.highStreet).toContain('<<include "Autism High Street Overload">>');
		expect(passages.overload).toContain("random(1, 3)");
		expect(passages.overloadMask).toContain("does not seem fooled");
	});

	test("registers the stimming widget used by room passages", async ({ page }) => {
		await setupAutismTrait(page);
		await wikifyToText(page, '<<autism-stim "Bedroom">>');
	});

	test("keeps the Bedroom privacy context after entering the stimming passage", async ({ page }) => {
		await setupAutismTrait(page);
		await page.evaluate(() => {
			const W = window as any;
			const V = W.SugarCube.State.variables;
			V.location = "home";
			W.ensureAutismSpectrumState().stimReturn = "Bedroom";
		});
		await navigateTo(page, "Autism Stim");
		const text = await page.locator("#passages").innerText();

		expect(text).toContain("With nobody around");
		expect(text).not.toContain("The people here have seen you");
	});

	test("has compiled passages for every static Autism scene link", async ({ page }) => {
		await setupAutismTrait(page);
		const targets = [...autismPassageSource.matchAll(/\[\[[^\]|]+\|([^\]]+)\]\]/g)].map(match => match[1]);
		const missing = await page.evaluate(names => {
			const Story = (window as any).SugarCube.Story;
			return [...new Set(names)].filter(name => !Story.has(name));
		}, targets);

		expect(missing).toEqual([]);
	});

	for (const passage of [
		"Doctor Harper Autism Check-up",
		"Autism Hallway Overload",
		"Autism High Street Overload",
		"Autism Overload",
		"Autism Stim",
		"Kylar Autism Masking",
		"Bedroom",
		"School Toilets",
	]) {
		test(`renders ${passage} without a passage error`, async ({ page }) => {
			await setupAutismTrait(page);
			await page.evaluate(name => {
				const W = window as any;
				const state = W.ensureAutismSpectrumState();
				if (name === "Autism Overload") {
					state.overloadForm = "shutdown";
					state.overloadPlace = "alone";
				}
				if (name === "Autism Stim") state.stimReturn = "Bedroom";
			}, passage);
			await navigateTo(page, passage);
			await assertNoErrors(page);
		});
	}

	test("keeps a narrow structured-work benefit without penalising other skills", async ({ page }) => {
		await setupAutismTrait(page);
		const rates = await page.evaluate(() => {
			const W = window as any;
			const V = W.SugarCube.State.variables;
			const read = () => ({
				housekeeping: W.autismJobPayMultiplier("housekeeping"),
				tending: W.autismJobPayMultiplier("tending"),
				dancing: W.autismJobPayMultiplier("dancing"),
				seduction: W.autismJobPayMultiplier("seductionskill"),
				unrelated: W.autismJobPayMultiplier("brawling"),
			});
			const withTrait = read();
			V.backgroundTraits = V.backgroundTraits.filter((t: string) => t !== "autism");
			const without = read();
			return { withTrait, without };
		});
		expect(rates.withTrait.housekeeping).toBeGreaterThan(1);
		expect(rates.withTrait.tending).toBeGreaterThan(1);
		expect(rates.withTrait.dancing).toBe(1);
		expect(rates.withTrait.seduction).toBe(1);
		/* Skills the trait has no opinion about must be untouched. */
		expect(rates.withTrait.unrelated).toBe(1);
		/* And none of it applies without the trait. */
		expect(Object.values(rates.without)).toEqual([1, 1, 1, 1, 1]);
	});

	test("does not impose a blanket dancing or seduction learning penalty", async ({ page }) => {
		await setupAutismTrait(page);
		const gains = await page.evaluate(() => {
			const W = window as any;
			const state = W.ensureAutismSpectrumState();
			state.load = 0;
			state.phase = "settled";
			return {
				dancing: W.autismStatGainMultiplier("dancing", 1, "training"),
				seduction: W.autismStatGainMultiplier("seductionskill", 1, "training"),
				brawling: W.autismStatGainMultiplier("brawling", 1, "training"),
			};
		});

		expect(gains.dancing).toBe(gains.brawling);
		expect(gains.seduction).toBe(gains.brawling);
	});

	test("applies the structured-work benefit through the wage widget", async ({ page }) => {
		await setupAutismTrait(page);
		const payouts = await page.evaluate(() => {
			const W = window as any;
			const V = W.SugarCube.State.variables;
			const earn = (macro: string) => {
				V.money = 0;
				W.SugarCube.Wikifier.wikifyEval(macro);
				return V.money;
			};
			V.housekeeping = 0;
			const structured = earn('<<wage 100 "housekeeping">>');
			const unrelated = earn('<<wage 100 "brawling">>');
			return { structured, unrelated };
		});

		expect(payouts.structured).toBe(11500);
		expect(payouts.unrelated).toBe(10000);
	});

	test("charges actual Load in loud places but recognises quiet school rooms", async ({ page }) => {
		await setupAutismTrait(page);
		const result = await page.evaluate(() => {
			const W = window as any;
			const V = W.SugarCube.State.variables;
			const state = W.ensureAutismSpectrumState();
			V.player ||= {};
			delete V.player.bodyliquid;
			V.location = "arcade";
			V.passage = "Arcade";
			V.outside = 0;
			state.load = 0;
			const stressBefore = V.stress;
			W.autismSensoryUpdate(60);
			const loud = { load: state.load, stress: V.stress - stressBefore };
			V.location = "school";
			V.passage = "School Toilets";
			return { loud, quietSchoolRoom: W.autismPlaceIsLoud() };
		});
		expect(result.loud.load).toBeGreaterThan(0);
		expect(result.loud.stress).toBeGreaterThan(0);
		expect(result.quietSchoolRoom).toBe(false);
	});

	test("treats a closed school toilet cubicle as private for stimming", async ({ page }) => {
		await setupAutismTrait(page);
		const privacy = await page.evaluate(() => {
			const W = window as any;
			const V = W.SugarCube.State.variables;
			V.location = "school";
			V.passage = "School Toilets";
			return W.autismPrivacyTier();
		});

		expect(privacy).toBe("alone");
	});
});
