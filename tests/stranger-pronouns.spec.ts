import { test, expect } from "@playwright/test";
import { openGame, navigateTo, assertNoErrors, wikifyToText, Page } from "./helpers";

/**
 * Player pronoun widgets (<<phim>>, <<pshe>>, ...) print the player's own pronouns for narration, but take
 * an optional speaker argument so words put in an NPC's mouth follow what that NPC actually knows. A stranger
 * who has never met you has to guess from appearance, the same way <<girl>> and <<slut>> already do.
 */
test.describe("stranger pronouns", () => {
	test.beforeEach(async ({ page }) => {
		await openGame(page);
		await navigateTo(page, "Start2");
	});

	/** A body and identity that disagree: feminine to look at, masculine pronouns of their own. */
	async function feminineBodyMasculineIdentity(page: Page) {
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.player.sex = "f";
			V.player.penisExist = false;
			V.player.vaginaExist = true;
			V.player.gender_appearance = "f";
			V.player.femininity = 1000;
			V.settings.nudeGenderPerception = 0;
			V.identity.presentation.pronouns.pronounDynamicMode = "";
			V.identity.presentation.pronouns.preferred = "m";
			V.identity.presentation.pronouns.preferredMasculine = true;
			V.identity.presentation.pronouns.preferredFeminine = false;
			V.identity.presentation.pronouns.preferredNeutral = false;
			V.genderknown = [];
		});
	}

	test("narration keeps the player's pronouns, a stranger goes by what they can see", async ({ page }) => {
		await feminineBodyMasculineIdentity(page);

		expect(await wikifyToText(page, "<<phim>>")).toBe("him");
		expect(await wikifyToText(page, "<<pshe>>")).toBe("he");
		expect(await wikifyToText(page, "<<pher>>")).toBe("his");

		expect(await wikifyToText(page, "<<phim stranger>>")).toBe("her");
		expect(await wikifyToText(page, "<<pshe stranger>>")).toBe("she");
		expect(await wikifyToText(page, "<<pShes stranger>>")).toBe("She's");
		expect(await wikifyToText(page, "<<pherself stranger>>")).toBe("herself");
		// The verb has to agree with the pronoun beside it, so it takes the speaker as a third argument.
		expect(await wikifyToText(page, "<<pverb 'is' 'are' stranger>>")).toBe("is");

		// This is the whole point: the noun and the pronoun in one sentence now agree.
		expect(await wikifyToText(page, "<<girl>> ... <<phim stranger>>")).toBe("girl ... her");

		await assertNoErrors(page);
	});

	test("an NPC who knows you uses your pronouns, one who does not guesses", async ({ page }) => {
		await feminineBodyMasculineIdentity(page);

		expect(await wikifyToText(page, "<<phim Robin>>")).toBe("her");
		await page.evaluate(() => {
			(window as any).SugarCube.State.variables.genderknown = ["Robin"];
		});
		expect(await wikifyToText(page, "<<phim Robin>>")).toBe("him");
		// A name nobody is registered under can never "know" you, which is what makes the stranger idiom work.
		expect(await wikifyToText(page, "<<phim stranger>>")).toBe("her");

		await assertNoErrors(page);
	});

	test("being misgendered repeatedly in one breath counts as one remark", async ({ page }) => {
		await feminineBodyMasculineIdentity(page);
		// Reject feminine pronouns so every use of them is a dysphoria hit.
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.identity.presentation.pronouns.feminine.acceptance = false;
			V.identity.presentation.pronouns.feminine.reject = false;
			V.identity.presentation.pronouns.feminine.dysphoria = 0;
			V.stress = 0;
		});

		const dysphoriaNow = () => page.evaluate(() => (window as any).SugarCube.State.variables.identity.presentation.pronouns.feminine.dysphoria);

		// A crowd line with four feminine pronouns in it should land once, not four times over.
		await wikifyToText(page, "<<pShe stranger>> dropped <<pher stranger>>. Look at <<phim stranger>> hide <<pherself stranger>>.");
		const afterOneLine = await dysphoriaNow();
		expect(afterOneLine).toBe(10);

		await assertNoErrors(page);
	});
});
