import { test, expect } from "@playwright/test";
import * as path from "path";
import { fileURLToPath } from "url";
import { navigateTo, waitForPassage, type Page } from "./helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_URL = `file://${path.resolve(__dirname, "../Degrees of Lewdity VERSION.html")}`;

async function openCompiledGame(page: Page) {
	await page.addInitScript(() => localStorage.setItem("verifiedAge", "true"));
	await page.goto(GAME_URL);
	await waitForPassage(page);
	await navigateTo(page, "Start2");
}

test("Chastity Acclimated keeps the frustration reduction it promises after the device comes off", async ({ page }) => {
	await openCompiledGame(page);

	const out = await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		const V = SC.State.variables;
		const Time = (window as any).Time;

		V.chastityAcclimation = 14400;
		V.chastityAcclimatedTrait = 1;
		V.backgroundTraits = V.backgroundTraits.filter((t: string) => t !== "lustful");

		const atPeak = V.chastityAcclimation;
		// A full month with nothing locked on - far longer than the old decay needed to wipe it out entirely.
		Time.pass(30 * 24 * 60 * 60);
		const afterAMonthFree = V.chastityAcclimation;

		return { atPeak, afterAMonthFree, traitStillHeld: V.chastityAcclimatedTrait };
	});

	expect(out.atPeak).toBe(14400);
	expect(out.traitStillHeld).toBe(1);
	// The habit dulls but never washes out, so the trait card isn't lying about a permanent reduction.
	expect(out.afterAMonthFree).toBe(7200);
});

test("without the trait, chastity acclimation still decays away to nothing", async ({ page }) => {
	await openCompiledGame(page);

	const remaining = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		V.chastityAcclimation = 5000;
		V.chastityAcclimatedTrait = 0;
		(window as any).Time.pass(30 * 24 * 60 * 60);
		return V.chastityAcclimation;
	});

	expect(remaining).toBe(0);
});

test("Arousal Acclimated comes back when the setting is re-enabled, as its tooltip promises", async ({ page }) => {
	await openCompiledGame(page);

	const out = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		const Time = (window as any).Time;

		// Earned the hard way: two straight weeks Lustful, no chastity involved.
		V.xchange.arousalAcclimatedTraitEnabled = 1;
		V.chastityAcclimatedTrait = 0;
		V.backgroundTraits.pushUnique("lustful");
		V.lustfulAcclimation = 20160;
		V.arousalDesensitizedTrait = 0;
		Time.pass(60);
		const earned = V.arousalDesensitizedTrait;

		// Lose Lustful and let the counter decay right down, so the requirement is no longer met.
		V.backgroundTraits = V.backgroundTraits.filter((t: string) => t !== "lustful");
		Time.pass(30 * 24 * 60 * 60);
		const decayed = V.lustfulAcclimation;

		V.xchange.arousalAcclimatedTraitEnabled = 0;
		Time.pass(60);
		const whileDisabled = V.arousalDesensitizedTrait;

		V.xchange.arousalAcclimatedTraitEnabled = 1;
		Time.pass(60);
		return { earned, decayed, whileDisabled, afterReEnable: V.arousalDesensitizedTrait };
	});

	expect(out.earned).toBe(1);
	expect(out.decayed).toBe(0);
	// Suppressed, not erased - and inert, since every gate tests `is 1`.
	expect(out.whileDisabled).not.toBe(1);
	expect(out.afterReEnable).toBe(1);
});

test("a player who never earned Arousal Acclimated does not get it from toggling the setting", async ({ page }) => {
	await openCompiledGame(page);

	const trait = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		V.xchange.arousalAcclimatedTraitEnabled = 1;
		V.chastityAcclimatedTrait = 0;
		V.lustfulAcclimation = 0;
		V.arousalDesensitizedTrait = 0;
		V.backgroundTraits = V.backgroundTraits.filter((t: string) => t !== "lustful");
		(window as any).Time.pass(60);
		V.xchange.arousalAcclimatedTraitEnabled = 0;
		(window as any).Time.pass(60);
		V.xchange.arousalAcclimatedTraitEnabled = 1;
		(window as any).Time.pass(60);
		return V.arousalDesensitizedTrait;
	});

	expect(trait).toBe(0);
});

test("trait descriptions are wikified on the way out, so the Lustful chastity clause resolves", async ({ page }) => {
	await openCompiledGame(page);

	// The traits overlay emits each description through <<print $_text>>. That only renders the
	// <<= ... >> the Lustful entry embeds if <<print>> wikifies its output rather than escaping it.
	const out = await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		const V = SC.State.variables;
		const render = (macro: string) => {
			const div = document.createElement("div");
			div.append(SC.Wikifier.wikifyEval(macro));
			return (div.textContent || "").trim();
		};

		V.worn.genitals.type = ["chastity"];
		V.worn.genitals.name = "chastity belt";
		const lustful = (window as any).setup ? null : null;
		return {
			printWikifies: render(`<<set _t to "a<<= 1 + 1>>b">><<print _t>>`),
			clauseWhenLocked: render(`<<print "<<= playerChastity() ? 'locked' : 'free'>>">>`),
			lustful,
		};
	});

	expect(out.printWikifies).toBe("a2b");
	expect(out.clauseWhenLocked).toBe("locked");
});
