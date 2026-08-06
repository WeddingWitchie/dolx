import { test, expect } from "@playwright/test";
import { openGame, navigateTo, assertNoErrors } from "./helpers";

/**
 * Body wording for an NPC whose body was changed mid-fight.
 *
 * Pilling an enemy rewrites their body, and every body swap has to leave the live combat slot with
 * wording that matches the body it now has. When it did not, the missing words reached the player
 * inside the scene text: "his bare undefined", "the undefined undefined whimpers", or the raw
 * variable name printed as-is where the breast description should have been.
 *
 * These tests drive the pill widgets directly against a deliberately gappy combat slot, which is
 * the state the old copy loop could leave behind, and assert the wording always comes out readable.
 */

type SlotProbe = {
	breastsize: unknown;
	breastdesc: unknown;
	breastsdesc: unknown;
	description: unknown;
	role: unknown;
	fullDescription: unknown;
};

/** Puts a generic enemy in slot 0, then strips the fields a broken swap used to leave behind. */
async function combatWithGappyEnemy(page: import("@playwright/test").Page) {
	await openGame(page);
	await navigateTo(page, "Start2");
	await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		SC.Wikifier.wikifyEval("<<generate1>><<person1>>");
		const slot = SC.State.variables.NPCList[0];
		delete slot.breastdesc;
		delete slot.breastsdesc;
		delete slot.description;
		delete slot.role;
		delete slot.fullDescription;
		slot.breastsize = 8;
		slot.chest = 0;
	});
}

/** Runs one pill widget against slot 0 and reports what the slot ended up holding. */
async function pill(page: import("@playwright/test").Page, widget: string): Promise<SlotProbe> {
	return page.evaluate(name => {
		const SC = (window as any).SugarCube;
		SC.State.temporary.targetNo = 0;
		SC.Wikifier.wikifyEval(`<<${name}>>`);
		const slot = SC.State.variables.NPCList[0];
		return {
			breastsize: slot.breastsize,
			breastdesc: slot.breastdesc,
			breastsdesc: slot.breastsdesc,
			description: slot.description,
			role: slot.role,
			fullDescription: slot.fullDescription,
		};
	}, widget);
}

for (const widget of ["npc-become-girl", "npc-become-boy", "npc-sissify", "npc-butchify", "npc-hermify"]) {
	test(`${widget} leaves the combat slot with usable body and identity wording`, async ({ page }) => {
		await combatWithGappyEnemy(page);
		const slot = await pill(page, widget);

		for (const [field, value] of Object.entries(slot)) {
			expect(value, `${widget} left ${field} unset`).toBeDefined();
			expect(String(value), `${widget} left "undefined" in ${field}`).not.toContain("undefined");
		}
		expect(Number.isFinite(Number(slot.breastsize))).toBe(true);
		await assertNoErrors(page);
	});
}

test("breast wording follows the size the pill gave the NPC", async ({ page }) => {
	await combatWithGappyEnemy(page);
	const slot = await pill(page, "npc-become-girl");

	const expected = await page.evaluate(size => (window as any).npcBreastText(size), slot.breastsize as number);
	expect(slot.breastsdesc).toBe(expected.breastsdesc);
	expect(slot.breastdesc).toBe(expected.breastdesc);
});

test("chest narration never prints a raw variable name or 'undefined'", async ({ page }) => {
	await combatWithGappyEnemy(page);
	await pill(page, "npc-become-girl");

	const text = await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		const V = SC.State.variables;
		/* The moment from the bug report: the player moves their mouth to the enemy's chest. */
		V.mouthtarget = 0;
		V.mouthaction = "movetochest";
		V.combatExtended.reverseRapeStart = 1;
		V.breastbitten = 0;
		V.NPCList[0].chest = 0;
		return SC.Wikifier.wikifyEval === undefined
			? ""
			: (() => {
					const holder = document.createElement("div");
					new SC.Wikifier(holder, "<<npcChest 0>>");
					return holder.textContent ?? "";
			  })();
	});

	expect(text).not.toContain("undefined");
	expect(text).not.toContain("$NPCList");
	expect(text.trim().length).toBeGreaterThan(0);
});
