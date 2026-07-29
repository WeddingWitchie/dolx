import { test, expect } from "@playwright/test";
import { openGame, navigateTo, assertNoErrors, advanceHours } from "./helpers.js";

const gifts = {
	shirt: "robinGiftShirt",
	sundress: "robinGiftSundress",
	kimono: "robinGiftKimono",
	tuxedo: "robinGiftTux",
	"gothic gown": "robinGiftGown",
	christmas: "robinGiftChristmas",
};

test.beforeEach(async ({ page }) => {
	await openGame(page);
	await navigateTo(page, "Start2");
});

test.afterEach(async ({ page }) => {
	await assertNoErrors(page);
});

test("every gift keeps Robin's pronouns and unlocks its matching outfit", async ({ page }) => {
	for (const pronoun of ["m", "f"]) {
		for (const [gift, outfit] of Object.entries(gifts)) {
			const result = await page.evaluate(
				({ giftName, outfitName, robinPronoun }) => {
					const SC = (window as any).SugarCube;
					const V = SC.State.variables;
					const robin = (window as any).C.npc.Robin;
					robin.pronoun = robinPronoun;
					robin.outfits = [];
					delete robin.crossdress;
					delete robin.cdstart;
					V.christmas_gift_robin = giftName;
					V.robinromance = 0;
					V.robinsexfriend = 0;
					V.NPCList = [];

					const div = document.createElement("div");
					new SC.Wikifier(div, "<<christmas_robin>>"); // eslint-disable-line no-new
					return {
						text: div.textContent || "",
						errors: Array.from(div.querySelectorAll(".error-view")).map(error => error.textContent),
						unlocked: robin.outfits.includes(outfitName),
					};
				},
				{ giftName: gift, outfitName: outfit, robinPronoun: pronoun }
			);

			expect(result.errors, `${gift}/${pronoun}`).toEqual([]);
			expect(result.unlocked, `${gift}/${pronoun}`).toBe(true);
			expect(result.text, `${gift}/${pronoun}`).toMatch(new RegExp(`Excited, ${pronoun === "m" ? "he" : "she"} `));
		}
	}
});

test("Christmas state, including Robin's visit, clears for the next year", async ({ page }) => {
	await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		V.christmas = 1;
		V.christmas_gift_robin = "gothic gown";
		V.christmas_gift_robin_wrapped = 1;
		V.christmas_gift_robin_given = true;
		V.christmas_robin_visit = true;
		V.christmas_robin_gift_received = true;
	});
	await advanceHours(page, 24);
	const state = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		return {
			christmas: V.christmas,
			gift: V.christmas_gift_robin,
			wrapped: V.christmas_gift_robin_wrapped,
			given: V.christmas_gift_robin_given,
			visit: V.christmas_robin_visit,
			received: V.christmas_robin_gift_received,
		};
	});

	expect(state).toEqual({
		christmas: undefined,
		gift: undefined,
		wrapped: undefined,
		given: undefined,
		visit: undefined,
		received: undefined,
	});
});
