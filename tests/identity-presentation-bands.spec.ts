import { test, expect } from "@playwright/test";
import { openGame, navigateTo, assertNoErrors } from "./helpers";

/**
 * Appearance and clothing are each a single three-way band (masculine / androgynous / feminine).
 * The identity system charges dysphoria and grants tolerance once per hour for every characteristic the
 * player "has", so two bands reading true at once means two flares an hour off one body and one outfit.
 */
test.describe("presentation identity bands", () => {
	test.beforeEach(async ({ page }) => {
		await openGame(page);
		await navigateTo(page, "Start");
	});

	test("exactly one appearance band applies at any femininity score", async ({ page }) => {
		const rows = await page.evaluate(() => {
			const W = window as any;
			const V = W.SugarCube.State.variables;
			const scores = [-2000, -500, -101, -100, -50, 0, 50, 100, 101, 500, 2000];

			return scores.map(femininity => {
				V.player.femininity = femininity;
				V.player.gender_appearance = femininity < 0 ? "m" : "f";
				return {
					femininity,
					band: W.currentAppearanceBand(),
					m: W.playerHasCharacteristic("Masculine Appearance"),
					n: W.playerHasCharacteristic("Androgynous Appearance"),
					f: W.playerHasCharacteristic("Feminine Appearance"),
				};
			});
		});

		for (const row of rows) {
			const active = [row.m, row.n, row.f].filter(value => value > 0);
			expect(active, `femininity ${row.femininity} matched ${active.length} appearance bands`).toHaveLength(1);
		}

		// The deadzone is inclusive at its edges and the bands sit where they should.
		expect(rows.find(r => r.femininity === -2000)!.band).toBe("m");
		expect(rows.find(r => r.femininity === -100)!.band).toBe("n");
		expect(rows.find(r => r.femininity === 0)!.band).toBe("n");
		expect(rows.find(r => r.femininity === 100)!.band).toBe("n");
		expect(rows.find(r => r.femininity === 101)!.band).toBe("f");

		await assertNoErrors(page);
	});

	test("a clearly feminine player never counts as androgynous", async ({ page }) => {
		test.setTimeout(60_000);
		const result = await page.evaluate(() => {
			const W = window as any;
			const SC = W.SugarCube;
			const V = SC.State.variables;

			// A plain cis girl: feminine preferred, everything accepted, nothing rejected - carried over from a
			// save made before the androgynous axes existed, which is where the reported dysphoria spam came from.
			V.xchange.genderIdentityEnabled = 1;
			V.xchange.disregardGender = 0;
			V.identity.presentation.appearance.preferred = "f";
			SC.Wikifier.wikifyEval("<<lockInIdentity>>");
			delete V.identity.presentation.appearance.neutral;
			delete V.identity.presentation.clothing.neutral;
			delete V.dolxIdentityPresentationReworked;
			SC.Wikifier.wikifyEval("<<xchange-init>>");

			/**
			 * Her first day runs before anything has written an appearance score - exactly the state a freshly
			 * loaded save sits in until the first exposedcheck. After that she's plainly, consistently feminine
			 * for two months. One inconclusive day must not leave her carrying an androgyny preference.
			 */
			const beFeminine = (day: number) => {
				if (day === 0) return;
				V.player.femininity = 500;
				V.player.gender_appearance = "f";
			};
			delete V.player.femininity;

			const reasons: string[] = [];
			for (let day = 0; day < 60; day++) {
				for (let hour = 0; hour < 24; hour++) {
					delete V.dysphoriaReasonMessage;
					SC.Wikifier.wikifyEval("<<hourlyIdentityEffects>>");
					// The hourly tick recomputes appearance from live state; keep her looking the same all month.
					beFeminine(day);
					if (V.dysphoriaReasonMessage) reasons.push(V.dysphoriaReasonMessage);
				}
				SC.Wikifier.wikifyEval("<<dailyIdentityEffects>>");
			}

			return { reasons, neutral: V.identity.presentation.appearance.neutral };
		});

		// She has no androgyny stake at all, so nothing about looking "in between" should ever fire.
		expect(result.reasons.filter(reason => /neither masculine nor feminine/i.test(reason))).toHaveLength(0);
		expect(result.neutral.dysphoria).toBe(0);

		await assertNoErrors(page);
	});

	test("clothing bands are exclusive and a bare body isn't an outfit", async ({ page }) => {
		const out = await page.evaluate(() => {
			const W = window as any;
			const SC = W.SugarCube;
			const V = SC.State.variables;

			const read = () => ({
				worn: W.getCurrentWornFemininity(),
				band: W.currentClothingBand(),
				m: W.playerHasCharacteristic("Masculine Clothing"),
				n: W.playerHasCharacteristic("Neutral Clothing"),
				f: W.playerHasCharacteristic("Feminine Clothing"),
			});

			SC.Wikifier.wikifyEval("<<clothinginit>>");
			V.makeup.lipstick = 0;
			V.makeup.mascara = 0;
			V.makeup.eyeshadow = 0;
			const bare = read();
			V.makeup.lipstick = 1;
			V.makeup.mascara = 1;
			V.makeup.eyeshadow = 1;
			const bareWithMakeup = read();
			V.makeup.lipstick = 0;
			V.makeup.mascara = 0;
			V.makeup.eyeshadow = 0;

			V.identity.presentation.clothing.preferred = "f";
			SC.Wikifier.wikifyEval("<<clothinginit>><<givestartclothing>>");
			const feminine = read();

			V.identity.presentation.clothing.preferred = "m";
			SC.Wikifier.wikifyEval("<<clothinginit>><<givestartclothing>>");
			const masculine = read();

			return { bare, bareWithMakeup, feminine, masculine };
		});

		// Naked scores 0, which sits inside the androgynous deadzone - but it's not a clothing choice.
		expect(out.bare.worn).toBe(0);
		expect(out.bare.band).toBe("");
		expect([out.bare.m, out.bare.n, out.bare.f]).toEqual([0, 0, 0]);
		expect(out.bareWithMakeup.band).toBe("");
		expect([out.bareWithMakeup.m, out.bareWithMakeup.n, out.bareWithMakeup.f]).toEqual([0, 0, 0]);

		expect(out.feminine.band).toBe("f");
		expect([out.feminine.m, out.feminine.n]).toEqual([0, 0]);

		expect(out.masculine.band).toBe("m");
		expect([out.masculine.n, out.masculine.f]).toEqual([0, 0]);

		await assertNoErrors(page);
	});

	test("a save from before the androgynous axes existed gets them seeded, not broken on the first daily tick", async ({ page }) => {
		const out = await page.evaluate(() => {
			const W = window as any;
			const SC = W.SugarCube;
			const V = SC.State.variables;

			// Rewind to what an older save looks like: identity already locked, no neutral tracks at all.
			delete V.identity.presentation.appearance.neutral;
			delete V.identity.presentation.clothing.neutral;
			delete V.dolxIdentityPresentationReworked;
			V.identity.init = 2;
			V.identity.presentation.appearance.preferred = "f";
			V.identity.presentation.clothing.preferred = "f";

			SC.Wikifier.wikifyEval("<<xchange-init>>");
			const seeded = JSON.parse(JSON.stringify(V.identity.presentation.appearance.neutral));

			// A day she doesn't read androgynous shaves tolerance, but must not flip her straight to unaccepted.
			V.player.femininity = 500;
			V.player.gender_appearance = "f";
			SC.Wikifier.wikifyEval("<<dailyIdentityEffects>>");

			return { seeded, afterOneDay: JSON.parse(JSON.stringify(V.identity.presentation.appearance.neutral)) };
		});

		expect(out.seeded.acceptance).toBe(true);
		expect(out.seeded.tolerance).toBe(100);
		expect(out.afterOneDay.acceptance).toBe(true);
		expect(out.afterOneDay.tolerance).toBe(97);

		await assertNoErrors(page);
	});

	test("an older transgender save gets the same neutral-trait repair while identity remains unlocked", async ({ page }) => {
		const out = await page.evaluate(() => {
			const W = window as any;
			const SC = W.SugarCube;
			const V = SC.State.variables;

			delete V.identity.presentation.appearance.neutral;
			delete V.identity.presentation.clothing.neutral;
			delete V.dolxIdentityPresentationReworked;
			V.background.transgender = true;
			V.identity.init = 0;
			V.identity.presentation.appearance.preferred = "f";
			V.identity.presentation.clothing.preferred = "f";

			SC.Wikifier.wikifyEval("<<xchange-init>>");
			const seeded = JSON.parse(JSON.stringify(V.identity.presentation.appearance.neutral));
			V.player.femininity = 500;
			V.player.gender_appearance = "f";
			SC.Wikifier.wikifyEval("<<dailyIdentityEffects>>");

			return { seeded, afterOneDay: JSON.parse(JSON.stringify(V.identity.presentation.appearance.neutral)) };
		});

		expect(out.seeded.acceptance).toBe(true);
		expect(out.seeded.tolerance).toBe(100);
		expect(out.afterOneDay.acceptance).toBe(true);
		expect(out.afterOneDay.tolerance).toBe(97);

		await assertNoErrors(page);
	});
});
