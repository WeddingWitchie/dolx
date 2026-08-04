import { test, expect } from "@playwright/test";
import * as path from "path";
import { fileURLToPath } from "url";
import { navigateTo, assertNoErrors, waitForPassage, type Page } from "./helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_URL = `file://${path.resolve(__dirname, "../Degrees of Lewdity VERSION.html")}`;

async function openCompiledGame(page: Page) {
	await page.addInitScript(() => localStorage.setItem("verifiedAge", "true"));
	await page.goto(GAME_URL);
	await waitForPassage(page);
	await navigateTo(page, "Start2");
}

/** Re-roll the starting wardrobe for a given clothing preference and body sex. */
function giveStartClothing(page: Page, preferred: string, sex: string) {
	return page.evaluate(
		({ preferred, sex }) => {
			const SC = (window as any).SugarCube;
			const V = SC.State.variables;
			V.identity.presentation.clothing.preferred = preferred;
			V.player.sex = sex;
			V.player.gender_body = sex === "h" ? "a" : sex;
			V.player.breastsize = sex === "m" ? 0 : 5;
			SC.Wikifier.wikifyEval("<<clothinginit>><<givestartclothing>>");
			return {
				upper: V.worn.upper.name,
				lower: V.worn.lower.name,
				legs: V.worn.legs.name,
				feet: V.worn.feet.name,
				underLower: V.worn.under_lower.name,
				everyday: V.outfit.find((o: any) => o.name === "Everyday"),
				school: V.outfit.find((o: any) => o.name === "School"),
			};
		},
		{ preferred, sex }
	);
}

test("neutral clothing preference starts the player in overalls", async ({ page }) => {
	await openCompiledGame(page);

	const neutralFem = await giveStartClothing(page, "n", "f");
	expect(neutralFem.upper).toBe("overalls");
	expect(neutralFem.lower).toBe("overall bottoms");
	expect(neutralFem.legs).toBe("ankle socks");
	expect(neutralFem.feet).toBe("school shoes");
	expect(neutralFem.underLower).toBe("plain panties");
	expect(neutralFem.everyday.upper).toBe("overalls");
	expect(neutralFem.school.lower).toBe("school skirt");

	const neutralMasc = await giveStartClothing(page, "n", "m");
	expect(neutralMasc.upper).toBe("overalls");
	expect(neutralMasc.underLower).toBe("briefs");
	expect(neutralMasc.school.lower).toBe("school shorts");

	// The gendered preferences are untouched.
	expect((await giveStartClothing(page, "f", "f")).upper).toBe("sundress");
	expect((await giveStartClothing(page, "m", "m")).upper).toBe("t-shirt");

	await assertNoErrors(page);
});

test("neutral clothing preference removes clothing from the identity system entirely", async ({ page }) => {
	await openCompiledGame(page);

	const readClothingState = () =>
		page.evaluate(() => {
			const W = window as any;
			const V = W.SugarCube.State.variables;
			return {
				neutral: W.clothingIdentityIsNeutral(),
				mascOption: W.selectIdentityCharacteristic("Masculine Clothing").option,
				femOption: W.selectIdentityCharacteristic("Feminine Clothing").option,
				mascEnabled: W.isIdentityMeterCharacteristicEnabled("Masculine Clothing"),
				femEnabled: W.isIdentityMeterCharacteristicEnabled("Feminine Clothing"),
				mascFemininity: W.getFemininityContribution("Masculine Clothing"),
				breakdownHasClothing: "clothing" in (V.xchange.giBreakdown || {}),
			};
		});

	// Baseline: a gendered preference keeps the clothing topic live.
	await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		SC.State.variables.identity.presentation.clothing.preferred = "f";
		(window as any).mapToLegacyGenderIdentity();
	});
	const gendered = await readClothingState();
	expect(gendered.neutral).toBe(false);
	expect(gendered.femOption).toBeTruthy();
	expect(gendered.femEnabled).toBe(true);
	expect(gendered.breakdownHasClothing).toBe(true);

	// Neutral switches the whole topic off.
	await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		SC.State.variables.identity.presentation.clothing.preferred = "n";
		(window as any).mapToLegacyGenderIdentity();
	});
	const neutral = await readClothingState();
	expect(neutral.neutral).toBe(true);
	expect(neutral.mascOption).toBeUndefined();
	expect(neutral.femOption).toBeUndefined();
	expect(neutral.mascEnabled).toBe(false);
	expect(neutral.femEnabled).toBe(false);
	expect(neutral.mascFemininity).toBe(0);
	expect(neutral.breakdownHasClothing).toBe(false);

	await assertNoErrors(page);
});

test("neutral survives a settings export/import round-trip", async ({ page }) => {
	await openCompiledGame(page);

	const out = await page.evaluate(() => {
		const W = window as any;
		const V = W.SugarCube.State.variables;
		const clothingCfg = W.settingsObjects("general").identity.presentation.clothing;

		V.identity.presentation.clothing.preferred = "n";
		const exported: any = {};
		W.exportSettingsWalk(clothingCfg, V.identity.presentation.clothing, exported);
		V.identity.presentation.clothing.preferred = "f";
		W.importSettingsWalk(clothingCfg, exported, V.identity.presentation.clothing);

		return {
			exported: exported.preferred,
			imported: V.identity.presentation.clothing.preferred,
			rejectsBogus: W.validateValue(clothingCfg.preferred, "z"),
		};
	});

	// The export schema validates against its own `strings` list, so an unlisted value is silently dropped.
	expect(out.exported).toBe("n");
	expect(out.imported).toBe("n");
	expect(out.rejectsBogus).toBe(false);

	await assertNoErrors(page);
});

test("androgynous clothing/appearance preference and stance survive a settings export/import round-trip", async ({ page }) => {
	await openCompiledGame(page);

	const out = await page.evaluate(() => {
		const W = window as any;
		const V = W.SugarCube.State.variables;
		const clothingCfg = W.settingsObjects("general").identity.presentation.clothing;
		const appearanceCfg = W.settingsObjects("general").identity.presentation.appearance;

		V.identity.presentation.clothing.preferred = "u";
		V.identity.presentation.clothing.neutral.reject = true;
		const exportedClothing: any = {};
		W.exportSettingsWalk(clothingCfg, V.identity.presentation.clothing, exportedClothing);
		V.identity.presentation.clothing.preferred = "f";
		V.identity.presentation.clothing.neutral.reject = false;
		W.importSettingsWalk(clothingCfg, exportedClothing, V.identity.presentation.clothing);

		const exportedAppearance: any = {};
		W.exportSettingsWalk(appearanceCfg, V.identity.presentation.appearance, exportedAppearance);

		return {
			exportedClothingPreferred: exportedClothing.preferred,
			importedClothingPreferred: V.identity.presentation.clothing.preferred,
			importedClothingNeutralReject: V.identity.presentation.clothing.neutral.reject,
			appearanceSchemaHasNeutral: "neutral" in exportedAppearance,
			acceptsClothingU: W.validateValue(clothingCfg.preferred, "u"),
			acceptsAppearanceN: W.validateValue(appearanceCfg.preferred, "n"),
		};
	});

	expect(out.exportedClothingPreferred).toBe("u");
	expect(out.importedClothingPreferred).toBe("u");
	expect(out.importedClothingNeutralReject).toBe(true);
	expect(out.appearanceSchemaHasNeutral).toBe(true);
	expect(out.acceptsClothingU).toBe(true);
	expect(out.acceptsAppearanceN).toBe(true);

	await assertNoErrors(page);
});

test("picking neutral in the settings leaves a way back out", async ({ page }) => {
	await openCompiledGame(page);

	const result = await page.evaluate(async () => {
		const SC = (window as any).SugarCube;
		SC.State.variables.identity.presentation.clothing.preferred = "f";
		// Start from a rejected masculine stance: without normalisation this is what would spring back on exit.
		SC.State.variables.identity.presentation.clothing.masculine.acceptance = false;
		SC.State.variables.identity.presentation.clothing.masculine.reject = true;

		const host = document.querySelector("#passages") as HTMLElement;
		host.innerHTML = "";
		new SC.Wikifier(host, "<<identitySettings>>");
		(window as any).settingsDisableElement();
		await new Promise(r => setTimeout(r, 300));

		const inputs = Array.from(host.querySelectorAll("input")).filter(i => /clothing/.test((i as HTMLInputElement).name)) as HTMLInputElement[];
		const preferredRadios = inputs.filter(i => /clothingpreferred/.test(i.name));
		const labelOf = (i: HTMLInputElement) => (i.closest("label")?.textContent || "").trim();

		preferredRadios[preferredRadios.length - 1].click(); // "Don't care"
		await new Promise(r => setTimeout(r, 400));
		const afterNeutral = {
			preferred: SC.State.variables.identity.presentation.clothing.preferred,
			enabled: inputs.filter(i => !i.disabled).map(labelOf),
		};

		preferredRadios[0].click(); // masculine "Preferred"
		await new Promise(r => setTimeout(r, 400));
		const clothing = SC.State.variables.identity.presentation.clothing;
		return {
			afterNeutral,
			afterExit: { preferred: clothing.preferred, acceptance: clothing.masculine.acceptance, reject: clothing.masculine.reject },
		};
	});

	// Neutral must never be a one-way door: all three "Preferred" radios (masculine/feminine/androgynous) stay live as the exit.
	expect(result.afterNeutral.preferred).toBe("n");
	expect(result.afterNeutral.enabled.filter(l => l === "Preferred")).toHaveLength(3);
	expect(result.afterNeutral.enabled).toContain("Don't care");

	// Leaving neutral lands on a valid stance rather than "preferred but unaccepted/rejected".
	expect(result.afterExit).toEqual({ preferred: "m", acceptance: true, reject: false });

	await assertNoErrors(page);
});

test("neutral clothing preference causes no dysphoria or stress from what the player wears", async ({ page }) => {
	await openCompiledGame(page);

	const runHourlyTick = (preferred: string) =>
		page.evaluate(preferred => {
			const SC = (window as any).SugarCube;
			const V = SC.State.variables;
			const clothing = V.identity.presentation.clothing;
			clothing.preferred = preferred;
			// Reject both sides so any surviving clothing dysphoria would be unmistakable.
			for (const side of ["masculine", "feminine"]) {
				clothing[side].acceptance = false;
				clothing[side].reject = true;
				clothing[side].dysphoria = 0;
				clothing[side].tolerance = 0;
			}
			V.xchange.genderIdentityEnabled = 1;
			V.xchange.disregardGender = 0;
			V.stress = 0;

			SC.Wikifier.wikifyEval("<<hourlyIdentityEffects>>");
			(window as any).hourlyClothingFemininityCheck(1);

			return {
				mascDysphoria: clothing.masculine.dysphoria,
				femDysphoria: clothing.feminine.dysphoria,
				mascRejected: clothing.masculine.reject,
				stress: V.stress,
			};
		}, preferred);

	const neutral = await runHourlyTick("n");
	expect(neutral.mascDysphoria).toBe(0);
	expect(neutral.femDysphoria).toBe(0);
	// normaliseNeutralClothing parks the topic in a benign state instead of leaving the rejection frozen.
	expect(neutral.mascRejected).toBe(false);
	expect(neutral.stress).toBe(0);

	await assertNoErrors(page);
});

test("masculine/feminine/androgynous clothing dysphoria all key off the outfit's net femininity, not a single garment", async ({ page }) => {
	await openCompiledGame(page);

	/**
	 * Dresses the player in a real outfit (via the actual wardrobe-generation macros, not a stub), then sets the
	 * clothing identity preference independently of which outfit is worn - e.g. a real feminine outfit while
	 * "preferred" is masculine - exactly like a real player wearing something that doesn't match their stated
	 * preference. `wardrobe` picks which real starting outfit to dress in ("m"/"f" outfit, or "bare" for no
	 * clothes at all, which nets to 0 femininity and is the most reliable way to land inside the deadzone).
	 */
	const readForOutfit = (preferred: string, wardrobe: "m" | "f" | "bare") =>
		page.evaluate(
			({ preferred, wardrobe }) => {
				const W = window as any;
				const SC = W.SugarCube;
				const V = SC.State.variables;
				const clothing = V.identity.presentation.clothing;

				if (wardrobe === "bare") {
					SC.Wikifier.wikifyEval("<<clothinginit>>");
				} else {
					V.identity.presentation.clothing.preferred = wardrobe;
					SC.Wikifier.wikifyEval("<<clothinginit>><<givestartclothing>>");
				}

				clothing.preferred = preferred;
				for (const side of ["masculine", "feminine", "neutral"]) {
					clothing[side].acceptance = false;
					clothing[side].reject = false;
					clothing[side].dysphoria = 0;
					clothing[side].tolerance = 0;
				}
				V.xchange.genderIdentityEnabled = 1;
				V.xchange.disregardGender = 0;
				V.stress = 0;
				delete V.genderStressMessage;

				SC.Wikifier.wikifyEval("<<hourlyIdentityEffects>>");
				W.hourlyClothingFemininityCheck(1);

				return {
					wornFemininity: W.getCurrentWornFemininity(),
					mascHas: W.playerHasCharacteristic("Masculine Clothing"),
					femHas: W.playerHasCharacteristic("Feminine Clothing"),
					neutralHas: W.playerHasCharacteristic("Neutral Clothing"),
					mascDysphoria: clothing.masculine.dysphoria,
					femDysphoria: clothing.feminine.dysphoria,
					neutralDysphoria: clothing.neutral.dysphoria,
					stress: V.stress,
					genderStressMessage: V.genderStressMessage,
				};
			},
			{ preferred, wardrobe }
		);

	// Real feminine starting outfit, worn while "preferred" is masculine: the "Feminine Clothing" trait is the one
	// actually present, so it (not "Masculine Clothing") is what racks up dysphoria while it's unaccepted -
	// independent of what's marked "preferred". The flavor message follows the same trait.
	const stronglyFeminine = await readForOutfit("m", "f");
	expect(stronglyFeminine.wornFemininity).toBeGreaterThan(100);
	expect(stronglyFeminine.femHas).toBeGreaterThan(0);
	expect(stronglyFeminine.mascHas).toBe(0);
	expect(stronglyFeminine.femDysphoria).toBeGreaterThan(0);
	expect(stronglyFeminine.mascDysphoria).toBe(0);
	expect(stronglyFeminine.stress).toBeGreaterThan(0);
	expect(stronglyFeminine.genderStressMessage).toBe(1); // "awkward dressed up girly" (unaccepted, not rejected)

	// Same real feminine outfit, but the player's preference is Androgynous this time.
	const androgynousFeelsIt = await readForOutfit("u", "f");
	expect(androgynousFeelsIt.neutralHas).toBeGreaterThan(0);
	expect(androgynousFeelsIt.neutralDysphoria).toBeGreaterThan(0);

	// Real masculine starting outfit: mirrors the feminine case in the other direction.
	const stronglyMasculine = await readForOutfit("f", "m");
	expect(stronglyMasculine.wornFemininity).toBeLessThan(-100);
	expect(stronglyMasculine.mascHas).toBeGreaterThan(0);
	expect(stronglyMasculine.femHas).toBe(0);
	expect(stronglyMasculine.mascDysphoria).toBeGreaterThan(0);
	expect(stronglyMasculine.femDysphoria).toBe(0);
	expect(stronglyMasculine.stress).toBeGreaterThan(0);
	expect(stronglyMasculine.genderStressMessage).toBe(3); // "awkward dressed up boyish"

	// No clothes at all nets to 0 (well inside the deadzone), so nothing should trip regardless of preference.
	const bare = await readForOutfit("m", "bare");
	expect(bare.wornFemininity).toBe(0);
	expect(bare.mascHas).toBe(0);
	expect(bare.femHas).toBe(0);
	expect(bare.neutralHas).toBe(0);
	expect(bare.mascDysphoria).toBe(0);
	expect(bare.stress).toBe(0);
	expect(bare.genderStressMessage).toBeUndefined();

	await assertNoErrors(page);
});
