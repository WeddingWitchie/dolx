import { test, expect } from "@playwright/test";
import { navigateTo, waitForPassage, type Page } from "./helpers.js";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_URL = `file://${path.resolve(__dirname, "../Degrees of Lewdity VERSION.html")}`;

async function openCompiledGame(page: Page) {
	await page.addInitScript(() => localStorage.setItem("verifiedAge", "true"));
	await page.goto(GAME_URL);
	await waitForPassage(page);
	await navigateTo(page, "Start2");
}

/**
 * Give the player two strap-ons, wear one of them, and add a clothing set that can be
 * worn/overwritten/deleted. `setUnderLower` is what the set records for the under_lower slot.
 */
async function setupStrapon(page: Page, setUnderLower: string, setColour: string | 0 = 0) {
	return page.evaluate(
		({ setUnderLower, setColour }) => {
			const SC = (window as any).SugarCube;
			const V = SC.State.variables;
			const setup = SC.setup;

			const strapSetup = setup.sextoys.find((t: any) => t.name === "strap-on");
			const strapClothes = setup.clothes.under_lower[strapSetup.clothes_index];

			V.player.inventory.sextoys = {
				"strap-on": [
					{ index: strapSetup.index, name: "strap-on", type: [...strapSetup.type], colour: "black", worn: true, carried: true },
					{ index: strapSetup.index, name: "strap-on", type: [...strapSetup.type], colour: "pink", worn: false, carried: true },
				],
			};
			V.worn.under_lower = Object.assign({}, strapClothes, { type: [...strapClothes.type], colour: "black" });

			const outfit: any = { index: V.outfit.length, name: "Test Set", type: ["normal"], colors: false };
			for (const slot of setup.clothingLayer.all) outfit[slot] = "naked";
			outfit.under_lower = setUnderLower;
			if (setColour !== 0) {
				outfit.colors = {};
				for (const slot of setup.clothingLayer.all) outfit.colors[slot] = [0, 0];
				outfit.colors.under_lower = [setColour, 0];
			}
			V.outfit.push(outfit);

			V.wardrobe_location = "wardrobe";
			return V.outfit.length - 1;
		},
		{ setUnderLower, setColour }
	);
}

async function runWearOutfit(page: Page, outfitIndex: number, mode: "wear" | 1 | 2) {
	return page.evaluate(
		({ outfitIndex, mode }) => {
			const SC = (window as any).SugarCube;
			const V = SC.State.variables;
			V.delete_outfit = mode === "wear" ? "none" : mode;
			V.wear_outfit = outfitIndex;

			const output = document.createElement("div");
			new SC.Wikifier(output, "<<wearoutfit>>");

			const straps = V.player.inventory.sextoys["strap-on"];
			return {
				text: output.textContent ?? "",
				error: output.querySelector(".error, .error-view") !== null,
				wornName: V.worn.under_lower.name,
				wornColour: V.worn.under_lower.colour,
				wornFlags: straps.map((s: any) => `${s.colour}:${s.worn ? "worn" : "off"}`),
				outfitCount: V.outfit.length,
				savedUnderLower: V.outfit[outfitIndex]?.under_lower,
				wardrobeUnderLower: V.wardrobe.under_lower.map((i: any) => i.name),
			};
		},
		{ outfitIndex, mode }
	);
}

test("overwriting a set while wearing a strap-on keeps it on and records it", async ({ page }) => {
	await openCompiledGame(page);
	const index = await setupStrapon(page, "naked");

	const result = await runWearOutfit(page, index, 2);

	expect(result.error).toBe(false);
	// The strap-on stays on: overwrite saves clothing, it does not undress you.
	expect(result.wornName).toBe("strap-on");
	expect(result.wornFlags).toEqual(["black:worn", "pink:off"]);
	// ...and the set records the strap-on rather than "naked".
	expect(result.savedUnderLower).toBe("strap-on");
	// It is a sex toy, not a garment - no copy is filed in the wardrobe.
	expect(result.wardrobeUnderLower).not.toContain("strap-on");
});

test("deleting a set while wearing a strap-on keeps it on", async ({ page }) => {
	await openCompiledGame(page);
	const index = await setupStrapon(page, "naked");
	const before = await page.evaluate(() => (window as any).SugarCube.State.variables.outfit.length);

	const result = await runWearOutfit(page, index, 1);

	expect(result.error).toBe(false);
	expect(result.outfitCount).toBe(before - 1);
	expect(result.wornName).toBe("strap-on");
	expect(result.wornFlags).toEqual(["black:worn", "pink:off"]);
});

test("wearing a set equips the strap-on colour the set saved", async ({ page }) => {
	await openCompiledGame(page);
	const index = await setupStrapon(page, "strap-on", "pink");

	const result = await runWearOutfit(page, index, "wear");

	expect(result.error).toBe(false);
	expect(result.wornName).toBe("strap-on");
	expect(result.wornColour).toBe("pink");
	// Exactly one strap-on is flagged as worn, and it is the one on display.
	expect(result.wornFlags).toEqual(["black:off", "pink:worn"]);
	expect(result.wardrobeUnderLower).not.toContain("strap-on");
});

test("wearing a set with no underwear keeps the strap-on on", async ({ page }) => {
	await openCompiledGame(page);
	const index = await setupStrapon(page, "naked");

	const result = await runWearOutfit(page, index, "wear");

	expect(result.error).toBe(false);
	expect(result.wornName).toBe("strap-on");
	expect(result.wornFlags).toEqual(["black:worn", "pink:off"]);
});

test("undressing in a wardrobe returns the strap-on to the toy inventory", async ({ page }) => {
	await openCompiledGame(page);
	await setupStrapon(page, "naked");

	const result = await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		const V = SC.State.variables;
		const output = document.createElement("div");
		new SC.Wikifier(output, '<<generalUndress "wardrobe" "under_lower">>');
		return {
			error: output.querySelector(".error, .error-view") !== null,
			wornName: V.worn.under_lower.name,
			wornFlags: V.player.inventory.sextoys["strap-on"].map((s: any) => `${s.colour}:${s.worn ? "worn" : "off"}`),
			wardrobeUnderLower: V.wardrobe.under_lower.map((i: any) => i.name),
		};
	});

	expect(result.error).toBe(false);
	expect(result.wornName).toBe("naked");
	// No phantom garment left behind, and nothing still claiming to be worn.
	expect(result.wardrobeUnderLower).not.toContain("strap-on");
	expect(result.wornFlags).toEqual(["black:off", "pink:off"]);
});

test("stripping a worn strap-on in combat does not leave a phantom carried garment", async ({ page }) => {
	await openCompiledGame(page);
	await setupStrapon(page, "naked");

	const result = await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		const V = SC.State.variables;
		const output = document.createElement("div");
		new SC.Wikifier(output, "<<underlowerstrip>>");
		return {
			error: output.querySelector(".error, .error-view") !== null,
			wornName: V.worn.under_lower.name,
			carriedName: V.carried.under_lower.name,
			wornFlags: V.player.inventory.sextoys["strap-on"].map((s: any) => `${s.colour}:${s.worn ? "worn" : "off"}`),
		};
	});

	expect(result.error).toBe(false);
	expect(result.wornName).toBe("naked");
	// No phantom garment clone left in $carried for a later returnCarried/carriedSend to file into the wardrobe.
	expect(result.carriedName).toBe("naked");
	expect(result.wornFlags).toEqual(["black:off", "pink:off"]);
});

test("undressing a worn strap-on to non-wardrobe scene storage does not leave a phantom stored garment", async ({ page }) => {
	await openCompiledGame(page);
	await setupStrapon(page, "naked");

	const result = await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		const V = SC.State.variables;
		const output = document.createElement("div");
		new SC.Wikifier(output, '<<generalUndress "lockers" "under_lower">>');
		return {
			error: output.querySelector(".error, .error-view") !== null,
			wornName: V.worn.under_lower.name,
			storedUnderLower: V.store.under_lower.map((i: any) => i.name),
			wornFlags: V.player.inventory.sextoys["strap-on"].map((s: any) => `${s.colour}:${s.worn ? "worn" : "off"}`),
		};
	});

	expect(result.error).toBe(false);
	expect(result.wornName).toBe("naked");
	// No phantom garment filed into scene storage, and the toy inventory's worn flag is synced.
	expect(result.storedUnderLower).not.toContain("strap-on");
	expect(result.wornFlags).toEqual(["black:off", "pink:off"]);
});
