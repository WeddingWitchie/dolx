import { test, expect } from "@playwright/test";
import { openGame, navigateTo, getVar, setVar, wikifyEval, assertNoErrors } from "./helpers.js";

/**
 * Set up a lone enemy with a known health pool, then throw one blow at it and report
 * how much health it lost. $striking / $kicking mark what kind of blow it was, the same
 * way the combat actions do.
 */
async function hit(page: import("@playwright/test").Page, defiance: number, kind: "punch" | "kick" | "hook" | "feint" = "punch") {
	await setVar(page, "enemyhealth", 200);
	await setVar(page, "enemyhealthmax", 200);
	await setVar(page, "enemyno", 1);
	await setVar(page, "striking", kind === "kick" ? 0 : 1);
	await setVar(page, "kicking", kind === "kick" ? 1 : 0);
	const ce = (await getVar(page, "combatExtended")) as Record<string, unknown>;
	await setVar(page, "combatExtended", {
		...ce,
		hookpunchingActive: kind === "hook" ? 2 : 0,
		feintingActive: kind === "feint" ? 1 : 0,
		enemyBlockingActive: 0,
	});
	await wikifyEval(page, `<<defiance ${defiance} 0>>`);
	return 200 - ((await getVar(page, "enemyhealth")) as number);
}

/** A physically strong PC with both combat skills at the SSS grade. */
async function makeMaxedFighter(page: import("@playwright/test").Page) {
	await setVar(page, "physiquesize", 15000);
	await setVar(page, "physique", 15000);
	const ce = (await getVar(page, "combatExtended")) as Record<string, unknown>;
	await setVar(page, "combatExtended", { ...ce, brawling: 2000, striking: 2000, kicking: 2000, footwork: 2000 });
}

test.describe("Combat damage balance", () => {
	test.beforeEach(async ({ page }) => {
		await openGame(page);
		await navigateTo(page, "Start2");
		await setVar(page, "sadism", 0);
	});

	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("no single blow can flatten a full-health opponent", async ({ page }) => {
		/* Physique alone, so no mastery trait applies and the cap is the only limit. */
		await setVar(page, "physiquesize", 15000);
		await setVar(page, "physique", 15000);
		const hook = await hit(page, 10, "hook");
		expect(hook).toBeGreaterThan(0);
		expect(hook).toBeLessThanOrEqual(200 * 0.4);
	});

	test("a maxed fighter hits harder than a new one, but not absurdly so", async ({ page }) => {
		await setVar(page, "physiquesize", 3000);
		await setVar(page, "physique", 3000);
		const weak = await hit(page, 10);

		await makeMaxedFighter(page);
		const strong = await hit(page, 10);

		expect(strong).toBeGreaterThan(weak);
		expect(strong / weak).toBeLessThan(8);
	});

	test("sadism no longer increases damage", async ({ page }) => {
		await makeMaxedFighter(page);
		await setVar(page, "sadism", 0);
		const calm = await hit(page, 2);
		await setVar(page, "sadism", 1000);
		const cruel = await hit(page, 2);

		expect(cruel).toBe(calm);
	});

	test("a kick lands for less than the same blow thrown by hand", async ({ page }) => {
		await makeMaxedFighter(page);
		const punch = await hit(page, 10);
		const kick = await hit(page, 10, "kick");

		expect(kick).toBeLessThan(punch);
	});

	test("striking and kicking markers do not leak into the next turn", async ({ page }) => {
		await setVar(page, "kicking", 1);
		await setVar(page, "striking", 1);
		await wikifyEval(page, "<<effectsman>>");

		expect(await getVar(page, "kicking")).toBe(0);
		expect(await getVar(page, "striking")).toBe(0);
		expect(((await getVar(page, "combatExtended")) as Record<string, number>).hookpunchingActive).toBe(0);
	});
});

test.describe("Mastery traits", () => {
	test.beforeEach(async ({ page }) => {
		await openGame(page);
		await navigateTo(page, "Start2");
		await setVar(page, "sadism", 0);
	});

	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("none are held by a starting character", async ({ page }) => {
		const held = await page.evaluate(() => (window as any).masteryTraitsHeld().map((t: any) => t.id));
		expect(held).toEqual([]);
	});

	test("Rock 'Em, Sock 'Em needs maxed physique as well as SSS brawling", async ({ page }) => {
		await setVar(page, "physiquesize", 15000);
		await setVar(page, "physique", 15000);
		const ce = (await getVar(page, "combatExtended")) as Record<string, unknown>;

		await setVar(page, "combatExtended", { ...ce, brawling: 1500 });
		expect(await page.evaluate(() => (window as any).masteryTrait("rockEmSockEm"))).toBe(false);

		await setVar(page, "combatExtended", { ...ce, brawling: 2000 });
		expect(await page.evaluate(() => (window as any).masteryTrait("rockEmSockEm"))).toBe(true);
		expect(await page.evaluate(() => (window as any).masteryDamageMultiplier("hook"))).toBe(1.1);
	});

	test("Happy Feet replaces Sleek and Steady rather than stacking with it", async ({ page }) => {
		const ce = (await getVar(page, "combatExtended")) as Record<string, unknown>;
		await setVar(page, "combatExtended", { ...ce, footwork: 2000, kicking: 2000 });

		expect(await page.evaluate(() => (window as any).masteryDamageMultiplier("kick"))).toBe(1.1);
		expect(await page.evaluate(() => (window as any).masteryDodgeBonus())).toBe(6);
		let held = await page.evaluate(() => (window as any).masteryTraitsHeld().map((t: any) => t.id));
		expect(held).toContain("sleekAndSteady");
		expect(held).not.toContain("happyFeet");

		await setVar(page, "feetskill", 2000);
		expect(await page.evaluate(() => (window as any).masteryDamageMultiplier("kick"))).toBe(1.25);
		expect(await page.evaluate(() => (window as any).masteryDodgeBonus())).toBe(15);
		held = await page.evaluate(() => (window as any).masteryTraitsHeld().map((t: any) => t.id));
		expect(held).toContain("happyFeet");
		expect(held).not.toContain("sleekAndSteady");
	});

	test("a mastered kick lands harder than an unmastered one", async ({ page }) => {
		/* No footwork or kicking grade, so this kick carries no mastery bonus at all. */
		await setVar(page, "physiquesize", 15000);
		await setVar(page, "physique", 15000);
		const plain = await hit(page, 10, "kick");

		/* Sleek and Steady: +10%. */
		await makeMaxedFighter(page);
		const sleek = await hit(page, 10, "kick");

		/* Happy Feet, Wombo Combo!: +25%, replacing the +10%. */
		await setVar(page, "feetskill", 2000);
		const wombo = await hit(page, 10, "kick");

		expect(sleek / plain).toBeCloseTo(1.1, 1);
		expect(wombo / plain).toBeCloseTo(1.25, 1);
		expect(wombo).toBeGreaterThan(sleek);
	});

	test("body part traits raise enemy arousal only for the part they cover", async ({ page }) => {
		await setVar(page, "oralskill", 2000);
		await setVar(page, "swimmingskill", 2000);

		expect(await page.evaluate(() => (window as any).masterySexMultiplier("oralskill"))).toBe(1.25);
		expect(await page.evaluate(() => (window as any).masterySexMultiplier("handskill"))).toBe(1);
	});

	test("Sweet Pleasure covers both the vagina and the thighs", async ({ page }) => {
		await setVar(page, "vaginalskill", 2000);
		await setVar(page, "thighskill", 2000);

		expect(await page.evaluate(() => (window as any).masterySexMultiplier("vaginalskill"))).toBe(1.25);
		expect(await page.evaluate(() => (window as any).masterySexMultiplier("thighskill"))).toBe(1.25);
	});

	test("That Cannot Fit! is reachable at the largest semen capacity available in play", async ({ page }) => {
		await setVar(page, "penileskill", 2000);
		await setVar(page, "semen_max", 4000);

		expect(await page.evaluate(() => (window as any).masteryTrait("thatCannotFit"))).toBe(true);
	});

	test("a held trait is listed in the traits overlay", async ({ page }) => {
		await setVar(page, "tending", 2000);
		await setVar(page, "handskill", 2000);

		const text = await page.evaluate(() => {
			const SC = (window as any).SugarCube;
			return SC.Wikifier.wikifyEval("<<traits>>").textContent;
		});
		expect(text).toContain("Mastery Traits");
		expect(text).toContain("Tender Hands");
	});
});
