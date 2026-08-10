import { test, expect } from "@playwright/test";
import { navigateTo, openGame, wikifyEval, type Page } from "./helpers.js";

test.beforeEach(async ({ page }) => {
	await openGame(page);
	await navigateTo(page, "Start2");
});

test("NPC pulling treats a modded skirt as lower clothing even when it has stale upper-clothing state", async ({ page }) => {
	await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		const V = SC.State.variables;
		const skirt = structuredClone(SC.setup.clothes.lower.find((item: any) => item.name === "plaid school skirt"));
		skirt.state = "midriff";
		skirt.state_top = "midriff";
		V.worn.lower = skirt;
	});

	await wikifyEval(page, '<<combat-pull-clothing-state "lower" "down" "left">>');
	await wikifyEval(page, '<<combat-pull-clothing-state "lower" "down" "left">>');

	const state = await page.evaluate(() => {
		const worn = (window as any).SugarCube.State.variables.worn.lower;
		return { state: worn.state, stateTop: worn.state_top };
	});

	expect(state).toEqual({ state: "thighs", stateTop: "midriff" });
});

test("re-equipping stored modded clothing clears incompatible state", async ({ page }) => {
	await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		const V = SC.State.variables;
		const skirt = structuredClone(SC.setup.clothes.lower.find((item: any) => item.name === "plaid school skirt"));
		skirt.location = "test";
		skirt.state = "midriff";
		skirt.state_top = "midriff";
		V.store.lower.push(skirt);
	});

	await wikifyEval(page, '<<generalStoreon "test" "lower">>');

	const state = await page.evaluate(() => {
		const worn = (window as any).SugarCube.State.variables.worn.lower;
		return { name: worn.name, state: worn.state, hasStateTop: Object.hasOwn(worn, "state_top") };
	});

	expect(state).toEqual({ name: "plaid school skirt", state: "waist", hasStateTop: false });
});

/**
 * Adds a mod-style catalogue entry written the way mods usually write one: a plain object copied from an existing
 * item, with none of the fields `new ClothesItem` would have filled in.
 */
async function addPlainObjectModSkirt(page: Page) {
	await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		const source = SC.setup.clothes.lower.find((item: any) => item.name === "plaid school skirt");
		const skirt = structuredClone(source);
		skirt.index = SC.setup.clothes.lower.length;
		skirt.name = "local mod dress skirt";
		skirt.name_cap = "Local mod dress skirt";
		skirt.variable = "local_mod_dress";
		skirt.modder = "local-test";
		skirt.state = "waist";
		skirt.exposed = 0;
		skirt.vagina_exposed = 0;
		skirt.anus_exposed = 0;
		delete skirt.state_base;
		delete skirt.exposed_base;
		delete skirt.vagina_exposed_base;
		delete skirt.anus_exposed_base;
		SC.setup.clothes.lower.push(skirt);
	});
}

test("clothing a mod added as a plain object gets the base-state fields it left out", async ({ page }) => {
	await addPlainObjectModSkirt(page);

	const item = await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		(window as any).normaliseClothesCatalogue();
		const skirt = SC.setup.clothes.lower.find((entry: any) => entry.variable === "local_mod_dress");
		return {
			stateBase: skirt.state_base,
			exposedBase: skirt.exposed_base,
			vaginaExposedBase: skirt.vagina_exposed_base,
			anusExposedBase: skirt.anus_exposed_base,
			hasStateTopBase: Object.hasOwn(skirt, "state_top_base"),
		};
	});

	expect(item).toEqual({ stateBase: "waist", exposedBase: 0, vaginaExposedBase: 0, anusExposedBase: 0, hasStateTopBase: false });
});

test("re-equipping a stored garment a mod added as a plain object keeps it on the body", async ({ page }) => {
	await addPlainObjectModSkirt(page);

	await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		const V = SC.State.variables;
		(window as any).normaliseClothesCatalogue();
		const stored = structuredClone(SC.setup.clothes.lower.find((entry: any) => entry.variable === "local_mod_dress"));
		stored.location = "test";
		stored.state = "thighs";
		stored.exposed = 1;
		stored.vagina_exposed = 1;
		stored.anus_exposed = 1;
		V.store.lower.push(stored);
	});

	await wikifyEval(page, '<<generalStoreon "test" "lower">>');

	const state = await page.evaluate(() => {
		const worn = (window as any).SugarCube.State.variables.worn.lower;
		return {
			name: worn.name,
			state: worn.state,
			exposed: worn.exposed,
			vaginaExposed: worn.vagina_exposed,
			anusExposed: worn.anus_exposed,
		};
	});

	expect(state).toEqual({
		name: "local mod dress skirt",
		state: "waist",
		exposed: 0,
		vaginaExposed: 0,
		anusExposed: 0,
	});
});

test("wearing a two-piece mod dress out of the wardrobe puts both halves back on", async ({ page }) => {
	const worn = await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		const V = SC.State.variables;

		// A two-piece dress written as a mod would write it: plain objects copied from the sundress, with none of the
		// fields `new ClothesItem` fills in.
		const makePiece = (slot: string, source: any, name: string) => {
			const piece = structuredClone(source);
			piece.index = SC.setup.clothes[slot].length;
			piece.name = name;
			piece.name_cap = name;
			piece.variable = "local_mod_dress";
			piece.modder = "local-test";
			piece.set = "local mod dress";
			piece.colour = "white";
			delete piece.state_base;
			delete piece.state_top_base;
			delete piece.exposed_base;
			delete piece.vagina_exposed_base;
			delete piece.anus_exposed_base;
			SC.setup.clothes[slot].push(piece);
			return piece;
		};
		const top = makePiece(
			"upper",
			SC.setup.clothes.upper.find((item: any) => item.name === "sundress"),
			"local mod dress"
		);
		const skirt = makePiece(
			"lower",
			SC.setup.clothes.lower.find((item: any) => item.name === "sundress skirt"),
			"local mod dress skirt"
		);
		top.outfitPrimary = { lower: "local mod dress skirt" };
		skirt.outfitSecondary = ["upper", "local mod dress"];
		delete skirt.outfitPrimary;
		delete top.outfitSecondary;

		(window as any).normaliseClothesCatalogue();

		V.wardrobe_location = "wardrobe";
		V.wardrobe.upper.push(structuredClone(top));
		V.wardrobe.lower.push(structuredClone(skirt));
		return V.wardrobe.upper.length - 1;
	});

	await wikifyEval(page, `<<generalWearFromWardrobe "upper" ${worn}>>`);

	const state = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		return {
			upper: V.worn.upper.name,
			lower: V.worn.lower.name,
			upperState: V.worn.upper.state,
			lowerState: V.worn.lower.state,
		};
	});

	expect(state).toEqual({
		upper: "local mod dress",
		lower: "local mod dress skirt",
		upperState: "waist",
		lowerState: "waist",
	});
});
