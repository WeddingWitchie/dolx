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

/**
 * Reproduces an existing save that predates the kaiju/Whitney entries being added to
 * specialClothesUpdate()'s backfill list: those names are simply absent from $specialClothes,
 * and the save's objectVersion is whatever the last bump set.
 */
async function simulateOldSave(page: Page, objectVersion: number) {
	await page.evaluate(version => {
		const V = (window as any).SugarCube.State.variables;
		const missing = ["kaiju costume", "kaiju bottoms", "kaiju hood", "Whitney's collar", "Whitney's collar with leash"];
		V.specialClothes = V.specialClothes.filter((i: any) => !missing.includes(i.name));
		V.objectVersion.specialClothes = version;
		V.whitneycollar = 1; // earned the collar the honest way
	}, objectVersion);
}

function readState(page: Page) {
	return page.evaluate(() => {
		const W = window as any;
		const V = W.SugarCube.State.variables;
		const names = ["kaiju costume", "kaiju bottoms", "kaiju hood", "Whitney's collar", "Whitney's collar with leash"];
		return {
			entries: names.map(n => V.specialClothes.find((i: any) => i.name === n)?.unlocked ?? "ABSENT"),
			whitneyEarned: W.getUnlockedSpecialSets().includes("whitney_collar"),
			kaijuEarned: W.getUnlockedSpecialSets().includes("kaiju"),
			// The shop only hides an item when its entry says exactly 0; a missing entry reads undefined and slips through.
			shopWouldHideWhitney: V.specialClothes.find((i: any) => i.name === "Whitney's collar")?.unlocked === 0,
		};
	});
}

test("an old save missing the newer special-clothes entries is repaired on load", async ({ page }) => {
	await openCompiledGame(page);
	await simulateOldSave(page, 21);

	const before = await readState(page);
	// The bug: entries absent, so the set can never complete, yet the shop still offers the item.
	expect(before.entries).toEqual(["ABSENT", "ABSENT", "ABSENT", "ABSENT", "ABSENT"]);
	expect(before.whitneyEarned).toBe(false);
	expect(before.shopWouldHideWhitney).toBe(false);

	await page.evaluate(() => (window as any).SugarCube.Wikifier.wikifyEval("<<backComp>>"));

	const after = await readState(page);
	expect(after.entries).not.toContain("ABSENT");
	// Whitney's collar was genuinely earned, so it must come back at the full story level.
	expect(after.whitneyEarned).toBe(true);
	// The kaiju job was never done, so it stays locked rather than being handed over.
	expect(after.kaijuEarned).toBe(false);
	expect(after.entries[0]).toBe(0);
});

test("a set the player never earned stays locked and hidden from the shop after repair", async ({ page }) => {
	await openCompiledGame(page);
	await simulateOldSave(page, 21);
	await page.evaluate(() => (window as any).SugarCube.Wikifier.wikifyEval("<<backComp>>"));

	const hidden = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		return ["kaiju costume", "kaiju bottoms", "kaiju hood"].map((n: string) => V.specialClothes.find((i: any) => i.name === n).unlocked === 0);
	});

	// A real 0 is what makes the shop's availability filter hide it again.
	expect(hidden).toEqual([true, true, true]);
});
