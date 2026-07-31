import { test, expect } from "@playwright/test";
import { openGame, navigateTo, assertNoErrors, waitForPassage } from "./helpers";

/**
 * X-Change Antidote / Antidote Forte.
 *
 * The antidote shortens the remaining duration of the pill you are already under, so an active pill is a
 * requirement rather than a blocker. When the pill timer cannot move - permanent transformation, pregnancy,
 * or a genital parasite - the dose is swallowed and simply does nothing: no duration change, no pain, no stress.
 * The reason is deliberately never named, because a pregnancy the player has not noticed yet must not be
 * given away by the medicine drawer.
 */

type PillProbe = {
	duration: number;
	pain: number;
	stress: number;
	fizzleFlag: unknown;
	text: string;
};

async function startTransformed(page: import("@playwright/test").Page) {
	await openGame(page);
	await navigateTo(page, "Start2");
	await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		const V = SC.State.variables;
		/* Start2 stops short of the full new-game pill inventory, so give the drawer the buckets it writes into. */
		V.sexStats.pills.lastTaken ??= {};
		V.sexStats.pills.mostTaken ??= {};
		V.xchange.nonconEnabled = 1;
		SC.Wikifier.wikifyEval('<<take-xchange 7 "genderflip">>');
		V.pain = 0;
		V.stress = 0;
	});
}

/** Take a named antidote through the medicine drawer exactly as the player does, and report what happened. */
async function takeAntidote(page: import("@playwright/test").Page, name = "X-Change Antidote"): Promise<PillProbe> {
	const before = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		return { duration: V.xchange.pill.duration, pain: V.pain, stress: V.stress };
	});

	await page.evaluate(pillName => {
		const V = (window as any).SugarCube.State.variables;
		V.sexStats.pills.pills[pillName].owned = 1;
		(window as any).onTakeClick(pillName);
	}, name);
	await waitForPassage(page);

	const after = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		return {
			duration: V.xchange.pill.duration,
			pain: V.pain,
			stress: V.stress,
			fizzleFlag: V.xchangeAntidoteFizzle,
			text: document.querySelector("#passages")?.textContent ?? "",
		};
	});

	return {
		duration: after.duration - before.duration,
		pain: after.pain - before.pain,
		stress: after.stress - before.stress,
		fizzleFlag: after.fizzleFlag,
		text: after.text,
	};
}

test.describe("X-Change Antidote", () => {
	test("shortens the running pill and hurts for it", async ({ page }) => {
		await startTransformed(page);
		const result = await takeAntidote(page);

		expect(result.duration).toBe(-24);
		expect(result.pain).toBeGreaterThan(0);
		expect(result.stress).toBeGreaterThan(0);
		expect(result.text).toContain("searing pain");
		expect(result.text).not.toContain("This doesn't feel right");
		await assertNoErrors(page);
	});

	test("Forte shortens the running pill by a week", async ({ page }) => {
		await startTransformed(page);
		/* Well clear of a week, so the week comes off in full instead of hitting the zero clamp. */
		await page.evaluate(() => {
			(window as any).SugarCube.State.variables.xchange.pill.duration = 500;
		});
		const result = await takeAntidote(page, "X-Change Antidote Forte");

		expect(result.duration).toBe(-168);
		expect(result.pain).toBeGreaterThan(0);
		await assertNoErrors(page);
	});

	test("is swallowed to no effect at all while a pregnancy holds the timer", async ({ page }) => {
		await startTransformed(page);
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.sexStats.vagina.pregnancy.type = "human";
		});

		const result = await takeAntidote(page);

		expect(result.duration).toBe(0);
		expect(result.pain).toBe(0);
		expect(result.stress).toBe(0);
		expect(result.text).toContain("This doesn't feel right");
		expect(result.text).toContain("You wonder what could be making the pill have no effect");
		// The agony message must not appear, and neither must the reason for the failure.
		expect(result.text).not.toContain("searing pain");
		expect(result.text).not.toContain("pregnan");
		// The flag is display-only and must never survive the passage that renders it.
		expect(result.fizzleFlag).toBeUndefined();
		await assertNoErrors(page);
	});

	test("is swallowed to no effect at all while the transformation is permanent", async ({ page }) => {
		await startTransformed(page);
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.xchange.pill.duration = -1;
		});

		const result = await takeAntidote(page);

		expect(result.duration).toBe(0);
		expect(result.pain).toBe(0);
		expect(result.text).toContain("This doesn't feel right");
		await assertNoErrors(page);
	});

	test("still works, and does not claim to dissolve, while pill protection is active", async ({ page }) => {
		await startTransformed(page);
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.xchange.pillPurityTrait = true;
		});

		const result = await takeAntidote(page);

		expect(result.duration).toBe(-24);
		expect(result.text).not.toContain("dissolves to nothing");
		await assertNoErrors(page);
	});

	test("is greyed out with an explanation when no pill is running", async ({ page }) => {
		await openGame(page);
		await navigateTo(page, "Start2");

		const gate = await page.evaluate(() => {
			const SC = (window as any).SugarCube;
			const antidote = SC.setup.pills.find((pill: any) => pill.name === "X-Change Antidote");
			return {
				xchanged: (window as any).playerIsXChanged(),
				takeable: antidote.take_condition(),
				reason: antidote.take_blocked_reason(),
			};
		});

		expect(gate.xchanged).toBeFalsy();
		expect(gate.takeable).toBe(0);
		expect(gate.reason).toContain("aren't under the effects of any X-Change pill");
	});
});
