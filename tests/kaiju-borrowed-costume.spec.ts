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

function countStranded(page: Page) {
	return page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		const names = ["kaiju costume", "kaiju bottoms", "kaiju hood"];
		let n = 0;
		for (const slot of ["over_upper", "over_lower", "over_head"]) {
			n += (V.wardrobe[slot] || []).filter((i: any) => names.includes(i?.name)).length;
		}
		return n;
	});
}

test("borrowed kaiju costume is never rebought into the wardrobe", async ({ page }) => {
	await openCompiledGame(page);

	const out = await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		const V = SC.State.variables;
		V.clothingrebuy = 1;
		V.money = 100000000;
		SC.Wikifier.wikifyEval("<<wearBorrowedKaiju>>");
		const worn = {
			over_upper: V.worn.over_upper.name,
			over_lower: V.worn.over_lower.name,
			over_head: V.worn.over_head.name,
			borrowedFlags: [V.worn.over_upper.borrowed, V.worn.over_lower.borrowed, V.worn.over_head.borrowed],
		};
		const moneyBefore = V.money;
		SC.Wikifier.wikifyEval("<<overupperruined>>");
		return { worn, moneySpent: moneyBefore - V.money };
	});

	expect(out.worn.over_upper).toBe("kaiju costume");
	expect(out.worn.borrowedFlags).toEqual([true, true, true]);
	expect(out.moneySpent).toBe(0);
	expect(await countStranded(page)).toBe(0);
});

test("borrowed kaiju costume is never banked by undressing into a wardrobe", async ({ page }) => {
	await openCompiledGame(page);

	await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		SC.Wikifier.wikifyEval("<<wearBorrowedKaiju>>");
		SC.Wikifier.wikifyEval("<<overupperundress 'wardrobe'>>");
	});

	expect(await countStranded(page)).toBe(0);
});

test("merely owning a costume never launders a bypassed unlock into an earned one", async ({ page }) => {
	await openCompiledGame(page);

	const out = await page.evaluate(() => {
		const W = window as any;
		const SC = W.SugarCube;
		const V = SC.State.variables;

		// A feat-boosted (rank 1-2) unlock sits at level 2: the shop sells it, but Gwylan
		// deliberately refuses the story - see the "Gwylan Talk Clothes Bypassed" scene.
		for (const name of ["kaiju costume", "kaiju bottoms", "kaiju hood"]) {
			V.specialClothes.find((i: any) => i.name === name).unlocked = 2;
		}
		for (const [slot, name] of [
			["over_upper", "kaiju costume"],
			["over_lower", "kaiju bottoms"],
			["over_head", "kaiju hood"],
		] as [string, string][]) {
			V.wardrobe[slot].push(JSON.parse(JSON.stringify(W.setup.clothes[slot].find((i: any) => i?.name === name))));
		}

		W.specialClothesRefresh();
		return {
			levels: ["kaiju costume", "kaiju bottoms", "kaiju hood"].map((n: string) => V.specialClothes.find((i: any) => i.name === n).unlocked),
			earned: W.getUnlockedSpecialSets().includes("kaiju"),
		};
	});

	// Buying the costume must not promote it to a genuine unlock.
	expect(out.levels).toEqual([2, 2, 2]);
	expect(out.earned).toBe(false);
});

test("actually doing the flyer job is what earns the story unlock", async ({ page }) => {
	await openCompiledGame(page);

	const earned = await page.evaluate(() => {
		const W = window as any;
		const V = W.SugarCube.State.variables;
		V.photo = V.photo || {};
		V.photo.job = "kaiju";
		W.specialClothesRefresh();
		return W.getUnlockedSpecialSets().includes("kaiju");
	});

	expect(earned).toBe(true);
});
