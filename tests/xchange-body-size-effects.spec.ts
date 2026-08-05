import { test, expect } from "@playwright/test";
import { openGame, navigateTo, type Page } from "./helpers.js";

async function setupGame(page: Page) {
	await openGame(page);
	await navigateTo(page, "Start2");
	await navigateTo(page, "Bedroom");
}

/**
 * Swell inflates $player directly and keeps the pre-effect size in $xchange.*. save-body used to snapshot the
 * inflated value, permanently baking a temporary size into the body: you came back to a body that stayed
 * swollen long after the pill ended.
 */
test("swell is applied live and never baked into a body snapshot", async ({ page }) => {
	await setupGame(page);

	const r = await page.evaluate(() => {
		const W = window as any;
		const V = W.SugarCube.State.variables;
		V.player.breastsize = 3;
		V.player.bottomsize = 3;

		W.SugarCube.Wikifier.wikifyEval('<<xchange-addeffect "swell">>');
		const swollen = { breast: V.player.breastsize, bottom: V.player.bottomsize };

		W.SugarCube.Wikifier.wikifyEval("<<save-body>>");
		const snapshot = { breast: V.xchange.pill.originalBody.breastsize, bottom: V.xchange.pill.originalBody.bottomsize };

		// Swapping back into that body while the swell still runs re-applies it and remembers the natural size.
		W.SugarCube.Wikifier.wikifyEval("<<load-body>>");
		const reloaded = { breast: V.player.breastsize, bottom: V.player.bottomsize, remembered: V.xchange.breastsize };

		W.SugarCube.Wikifier.wikifyEval("<<xchange-restore>>");
		const ended = { breast: V.player.breastsize, bottom: V.player.bottomsize };

		return { swollen, snapshot, reloaded, ended, max: { breast: V.breastsizemax, bottom: V.bottomsizemax } };
	});

	// The effect does apply while it runs...
	expect(r.swollen.breast).toBe(r.max.breast);
	expect(r.swollen.bottom).toBe(r.max.bottom);
	// ...but the body records its natural size.
	expect(r.snapshot).toEqual({ breast: 3, bottom: 3 });
	// Reloading that body mid-swell re-inflates it and keeps the natural size to give back.
	expect(r.reloaded.breast).toBe(r.max.breast);
	expect(r.reloaded.remembered).toBe(3);
	// When the pill ends, the natural size returns.
	expect(r.ended).toEqual({ breast: 3, bottom: 3 });
});

/** The Alpha penis boost uses the same "inflate $player, stash the old value" shape. */
test("the alpha penis boost is not baked into a body snapshot", async ({ page }) => {
	await setupGame(page);

	const snapshot = await page.evaluate(() => {
		const W = window as any;
		const V = W.SugarCube.State.variables;
		V.player.penisExist = true;
		V.player.penissize = 2;
		V.xchange.pill.alphaPenisSizeBoost = true;
		V.xchange.pill.alphaPenisSizePrevious = 2;
		V.player.penissize = 5; // what the boost leaves behind
		W.SugarCube.Wikifier.wikifyEval("<<save-body>>");
		return V.xchange.pill.originalBody.penissize;
	});

	expect(snapshot).toBe(2);
});

/**
 * The slow body-change meter halts while a pregnancy or ear slime runs, and on days you drift away from your
 * target. Halting used to zero the accumulator, so one day of either threw away weeks of progress.
 */
test("slow body change progress is held, not wiped, while the shift is halted", async ({ page }) => {
	await setupGame(page);

	const r = await page.evaluate(() => {
		const W = window as any;
		const V = W.SugarCube.State.variables;
		V.attitudesControl = V.attitudesControl || {};
		V.attitudesControl.unlockGender = true;
		Object.assign(V.xchange, {
			genderIdentityEnabled: true,
			giAutoEnabled: true,
			giTransformEnabled: true,
			giTransformConsent: true,
			giTransformThreshold: 120,
			giShiftMode: "f",
			giShiftStage: 1,
			giTarget: 1200,
			giRange: 1500,
		});
		const run = (delta: number, pregnant: boolean) => {
			V.xchange.giDrift = 90;
			V.sexStats.vagina.pregnancy.type = pregnant ? "wolf" : null;
			W.SugarCube.Wikifier.wikifyEval(`<<gi-transform-from-drift ${delta}>>`);
			return V.xchange.giDrift;
		};
		return { accumulating: run(5, false), whilePregnant: run(5, true), driftingAway: run(-5, false) };
	});

	expect(r.accumulating).toBe(95); // normal days still count
	expect(r.whilePregnant).toBe(90); // paused by the pregnancy, progress kept
	expect(r.driftingAway).toBe(90); // one day the wrong way costs nothing
});
