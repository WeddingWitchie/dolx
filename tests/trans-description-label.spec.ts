import { test, expect } from "@playwright/test";
import { openGame, navigateTo, assertNoErrors, wikifyToText } from "./helpers";

/**
 * The character description labels a player with the Transgender background, and reports which way an
 * X-Change genderflip moved their body. Both read gender identity, not the body: a nonbinary player is
 * not a "trans girl" for having been born male, and a trans girl handed a male body has been pushed away
 * from her gender no matter what body the pill started from.
 */
test.describe("transgender description label", () => {
	test.beforeEach(async ({ page }) => {
		await openGame(page);
		// Start2 completes character setup; <<characteristics>> reads body state that "Start" hasn't built yet.
		await navigateTo(page, "Start2");
	});

	/** Park gender identity at an absolute value and stop the meter from recomputing it from preferences. */
	async function setIdentity(page: import("@playwright/test").Page, value: number) {
		await page.evaluate(v => {
			const W = window as any;
			const V = W.SugarCube.State.variables;
			V.background.transgender = true;
			V.xchange.giRange = 1500;
			V.xchange.giTarget = v;
			V.xchange.giInitialized = true;
			V.genderidentity = v;
		}, value);
	}

	test("the label follows gender identity, not the body being worn", async ({ page }) => {
		for (const [identity, sex, expected] of [
			[1500, "m", "trans girl"],
			[1500, "f", "trans girl"],
			[0, "m", "trans boy"],
			[0, "f", "trans boy"],
			[750, "m", "trans enby"],
			[750, "f", "trans enby"],
		] as const) {
			await setIdentity(page, identity);
			await page.evaluate(s => {
				(window as any).SugarCube.State.variables.player.sex = s;
			}, sex);

			const label = await page.evaluate(() => (window as any).playerTransLabel());
			// <<pcGender>> and the trans label must agree; they are built from the same word.
			const plain = await page.evaluate(() => (window as any).playerGenderWord());
			expect(label).toBe(`trans ${plain}`);
			expect(label, `identity ${identity} in a ${sex} body`).toBe(expected);
		}

		await assertNoErrors(page);
	});

	test("a premium pill's presentation override still reaches the printed gender word", async ({ page }) => {
		// xchange-premium.js wraps playerFeelsManlike/Girllike on window. Anything reading the identity bands
		// from JS has to call through window or it quietly serves the unwrapped answer to half the game.
		await setIdentity(page, 1500);

		const out = await page.evaluate(() => {
			const W = window as any;
			const V = W.SugarCube.State.variables;
			V.xchange.pill.active = true;
			V.xchange.pill.presentationGenderOverride = "m";
			return { felt: W.playerFeltGender(), word: W.playerGenderWord(), label: W.playerTransLabel() };
		});

		expect(out.felt).toBe("m");
		expect(out.word).toBe("boy");
		expect(out.label).toBe("trans boy");
		expect(await wikifyToText(page, "<<pcGender>>/<<pcGenderher>>")).toBe("boy/his");

		await assertNoErrors(page);
	});

	test("a genderflip toward the player's gender reads as a match, away from it as a push", async ({ page }) => {
		/** Put an active genderflip pill on the player, flipping baseSex -> sex. */
		async function flipTo(page: import("@playwright/test").Page, baseSex: string, sex: string) {
			await page.evaluate(
				({ b, s }) => {
					const V = (window as any).SugarCube.State.variables;
					V.player.sex = s;
					V.xchange.pill.active = true;
					V.xchange.pill.genderflipEffect = true;
					V.xchange.pill.hermEffect = false;
					V.xchange.pill.genderificationEffect = false;
					V.xchange.pill.baseSex = b;
				},
				{ b: baseSex, s: sex }
			);
		}

		// A trans girl. The male body is wrong for her whichever body the pill started from.
		await setIdentity(page, 1500);

		await flipTo(page, "m", "f");
		expect(await wikifyToText(page, "<<characteristics>>")).toContain("feminised to match your gender");

		await flipTo(page, "f", "m");
		expect(await wikifyToText(page, "<<characteristics>>")).toContain("forced further from your gender");

		// A trans boy gets the exact inverse relationship.
		await setIdentity(page, 0);

		await flipTo(page, "f", "m");
		expect(await wikifyToText(page, "<<characteristics>>")).toContain("masculinised to match your gender");

		await flipTo(page, "m", "f");
		expect(await wikifyToText(page, "<<characteristics>>")).toContain("forced further from your gender");

		// A nonbinary player: the body moved, but neither sex is closer to or further from their gender.
		await setIdentity(page, 750);

		for (const [baseSex, sex, direction] of [
			["m", "f", "feminised"],
			["f", "m", "masculinised"],
		] as const) {
			await flipTo(page, baseSex, sex);
			const enbyText = await wikifyToText(page, "<<characteristics>>");
			expect(enbyText).toContain(`whose body has been ${direction}`);
			expect(enbyText).not.toContain("to match your gender");
			expect(enbyText).not.toContain("forced further from your gender");
		}

		await assertNoErrors(page);
	});
});
