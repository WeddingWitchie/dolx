import { test, expect } from "@playwright/test";
import { navigateTo, openGame, wikifyEval, type Page } from "./helpers.js";

test.beforeEach(async ({ page }) => {
	await openGame(page);
	await navigateTo(page, "Start2");
});

type NPCState = { penis?: unknown; vagina?: unknown; chest?: unknown; upper?: string; lower?: string };

/**
 * Put a single school-uniformed NPC in slot 0 with the given genital/chest states, then run the left hand's
 * undress-option builder over it and return which halves it offered.
 */
async function undressOptionsFor(page: Page, state: NPCState): Promise<string[]> {
	await page.evaluate(npcState => {
		const SC = (window as any).SugarCube;
		const V = SC.State.variables;
		const T = SC.State.temporary;

		V.NPCList = [
			{
				fullDescription: "test man",
				description: "test man",
				pronoun: "m",
				pronouns: { his: "his", him: "him", he: "he" },
				gender: "m",
				traits: [],
				penis: npcState.penis,
				vagina: npcState.vagina ?? "none",
				chest: npcState.chest,
				clothes: {
					set: "maleSchool",
					upper: { name: npcState.upper ?? "school shirt", integrity: 100 },
					lower: { name: npcState.lower ?? "school shorts", integrity: 100 },
				},
			},
		];
		V.lefttarget = 0;
		V.enemytype = "man";
		V.consensual = 1;
		V.promiscuity = 100;
		V.combat = 1;
		V.index = 0;
		T.leftaction = {};
	}, state);

	await wikifyEval(page, "<<leftUndressOther>>");

	return page.evaluate(() => {
		const T = (window as any).SugarCube.State.temporary;
		if (!T.leftaction["Undress:"]) return [];
		return Object.values(T.undressLeftTargets ?? {}).filter(target => target !== "rest") as string[];
	});
}

test("a fully dressed NPC can have either half undressed", async ({ page }) => {
	expect(await undressOptionsFor(page, { penis: "clothed", chest: "clothed" })).toEqual(expect.arrayContaining(["lower", "upper"]));
});

test("an NPC whose penis is held between your feet is not offered for undressing below the waist", async ({ page }) => {
	const options = await undressOptionsFor(page, { penis: "feet", chest: "clothed" });

	expect(options).toContain("upper");
	expect(options).not.toContain("lower");
});

test("a half the NPC already bared is not offered again", async ({ page }) => {
	const options = await undressOptionsFor(page, { penis: "clothed", chest: 0 });

	expect(options).toContain("lower");
	expect(options).not.toContain("upper");
});

test("halves benched by npcidlegenitals stay undressable", async ({ page }) => {
	expect(await undressOptionsFor(page, { penis: "idle", chest: "idle" })).toEqual(expect.arrayContaining(["lower", "upper"]));
});

test("a busy penis still leaves a covered pussy worth undressing", async ({ page }) => {
	expect(await undressOptionsFor(page, { penis: "feet", vagina: "clothed", chest: 0 })).toContain("lower");
});

test("nothing is offered when both halves are bare", async ({ page }) => {
	expect(await undressOptionsFor(page, { penis: 0, chest: 0 })).toEqual([]);
});

test("nothing is offered when the NPC wears nothing", async ({ page }) => {
	expect(await undressOptionsFor(page, { penis: "clothed", chest: "clothed", upper: "naked", lower: "naked" })).toEqual([]);
});

test("coming off idle restores the cover state rather than stripping the NPC", async ({ page }) => {
	await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		const V = SC.State.variables;
		const npc = (penis: unknown, upper: string, lower: string) => ({
			fullDescription: "test man",
			pronoun: "m",
			traits: [],
			penis,
			vagina: "none",
			chest: "idle",
			clothes: { set: "maleSchool", upper: { name: upper, integrity: 100 }, lower: { name: lower, integrity: 100 } },
		});
		V.NPCList = [npc("idle", "school shirt", "school shorts"), npc("idle", "naked", "naked")];
	});

	await wikifyEval(page, "<<reversenpcidlegenitals>>");

	const states = await page.evaluate(() => (window as any).SugarCube.State.variables.NPCList.map((npc: any) => ({ penis: npc.penis, chest: npc.chest })));

	expect(states).toEqual([
		{ penis: "clothed", chest: "clothed" },
		{ penis: 0, chest: 0 },
	]);
});
