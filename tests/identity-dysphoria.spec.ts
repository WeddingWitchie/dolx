import { test, expect } from "@playwright/test";
import { openGame, navigateTo, assertNoErrors } from "./helpers.js";

test.describe("identity dysphoria stat handling", () => {
	test.beforeEach(async ({ page }) => {
		await openGame(page);
		await navigateTo(page, "Start2");
	});

	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("rejected dysphoria spends current willpower without training the permanent stat", async ({ page }) => {
		const result = await page.evaluate(() => {
			const SC = (window as any).SugarCube;
			const V = SC.State.variables;
			const option = V.identity.body.bodysize.large;
			Object.assign(option, { acceptance: false, reject: true, dysphoria: 0, tolerance: 0 });
			V.xchange.giBodySizeEnabled = true;
			V.xchange.willpowerSystemEnabled = 1;
			V.xchange.willpowerPoints = 200;
			V.willpower = 200;
			V.stress = 1000;
			V.innocencestate = 0;
			V.trauma = 500;

			SC.Wikifier.wikifyEval('<<identitySelector "Large Body">><<dysphoria 3>>');
			const enabled = {
				willpower: V.willpower,
				willpowerPoints: V.xchange.willpowerPoints,
				stress: V.stress,
				trauma: V.trauma,
				dysphoria: option.dysphoria,
			};

			Object.assign(option, { acceptance: false, reject: true, dysphoria: 0, tolerance: 0 });
			V.xchange.willpowerSystemEnabled = 0;
			V.xchange.willpowerPoints = 200;
			V.stress = 1000;
			SC.Wikifier.wikifyEval('<<identitySelector "Large Body">><<dysphoria 3>>');

			return { enabled, disabledPoints: V.xchange.willpowerPoints };
		});

		expect(result.enabled).toEqual({ willpower: 200, willpowerPoints: 199, stress: 1080, trauma: 500, dysphoria: 3 });
		expect(result.disabledPoints).toBe(200);
	});

	test("begrudged flares raise stress and trauma without receiving preferred relief", async ({ page }) => {
		const result = await page.evaluate(() => {
			const W = window as any;
			const SC = W.SugarCube;
			const V = SC.State.variables;

			V.identity.presentation.pronouns.preferredMasculine = false;
			V.identity.presentation.pronouns.preferredFeminine = false;
			V.identity.presentation.pronouns.preferredNeutral = false;
			V.identity.presentation.appearance.preferred = "";
			V.identity.presentation.clothing.preferred = "n";
			V.identity.body.chest.preferred = "";
			V.identity.body.bottom.preferred = "";
			V.identity.body.genitals.preferredVagina = false;
			V.identity.body.genitals.preferredPenis = false;
			V.identity.body.hairlength.preferred = "";
			V.identity.body.bodysize.preferred = "large";
			V.identity.body.lactation.preferred = "none";
			V.identity.body.pregnancy.preferred = "none";

			for (const category of Object.values(W.setup.identityIndex) as any[]) {
				for (const characteristic of Object.keys(category)) {
					const option = W.selectIdentityCharacteristic(characteristic).option;
					if (option) Object.assign(option, { acceptance: true, reject: false, dysphoria: 0, tolerance: 100 });
				}
			}

			const option = V.identity.body.bodysize.large;
			Object.assign(option, { acceptance: true, reject: true, dysphoria: 0, tolerance: 100 });
			V.xchange.giBodySizeEnabled = true;
			V.xchange.willpowerSystemEnabled = 1;
			V.xchange.willpowerPoints = 200;
			V.bodysize = 3;
			V.stress = 1000;
			V.innocencestate = 0;
			V.trauma = 500;

			SC.Wikifier.wikifyEval("<<hourlyIdentityEffects>>");
			return {
				stress: V.stress,
				trauma: V.trauma,
				willpowerPoints: V.xchange.willpowerPoints,
				dysphoria: option.dysphoria,
			};
		});

		expect(result.stress).toBe(1040);
		expect(result.trauma).toBeGreaterThan(500);
		expect(result.willpowerPoints).toBe(200);
		expect(result.dysphoria).toBe(1);
	});

	test("rejected dysphoria recovery uses the requested one-to-one stress reduction", async ({ page }) => {
		const result = await page.evaluate(() => {
			const SC = (window as any).SugarCube;
			const V = SC.State.variables;
			const option = V.identity.body.bodysize.large;
			Object.assign(option, { acceptance: false, reject: true, dysphoria: 10, tolerance: 0 });
			V.xchange.giBodySizeEnabled = true;
			V.stress = 1000;
			V.innocencestate = 0;
			V.trauma = 500;
			V.control = 500;

			SC.Wikifier.wikifyEval('<<identitySelector "Large Body">><<dysphoria -5>>');
			return { stress: V.stress, trauma: V.trauma, control: V.control, dysphoria: option.dysphoria };
		});

		expect(result.stress).toBe(995);
		expect(result.trauma).toBeLessThan(500);
		expect(result.control).toBeGreaterThan(500);
		expect(result.dysphoria).toBe(5);
	});

	test("androgynous appearance builds dysphoria from reading as clearly gendered, mirroring how misgendering hurts a neutral-pronoun preference", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			const W = window as any;
			const SC = W.SugarCube;
			const V = SC.State.variables;

			V.identity.presentation.appearance.preferred = "n";
			Object.assign(V.identity.presentation.appearance.neutral, { acceptance: false, reject: false, dysphoria: 0, tolerance: 0 });
			V.player.femininity = 500; // clearly gendered, outside the androgynous deadzone
			V.xchange.genderIdentityEnabled = 1;
			V.xchange.disregardGender = 0;

			SC.Wikifier.wikifyEval("<<hourlyIdentityEffects>>");
			const gendered = {
				has: W.playerHasCharacteristic("Androgynous Appearance"),
				dysphoria: V.identity.presentation.appearance.neutral.dysphoria,
			};

			// Balanced femininity (inside the deadzone) shouldn't register as "having" the trait at all.
			V.player.femininity = 0;
			const balancedHas = W.playerHasCharacteristic("Androgynous Appearance");

			return { gendered, balancedHas };
		});

		expect(result.gendered.has).toBeGreaterThan(0);
		expect(result.gendered.dysphoria).toBeGreaterThan(0);
		expect(result.balancedHas).toBe(0);
	});
});
