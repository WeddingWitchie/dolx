import { test, expect } from "@playwright/test";
import * as path from "path";
import { fileURLToPath } from "url";
import { navigateTo, waitForPassage, type Page } from "./helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_URL = `file://${path.resolve(__dirname, "../Degrees of Lewdity VERSION.html")}`;

async function openCompiledGame(page: Page) {
	await page.addInitScript(() => localStorage.setItem("verifiedAge", "true"));
	await page.goto(GAME_URL);
	await waitForPassage(page);
	await navigateTo(page, "Start2");
}

/** Render a twee fragment in an offscreen element and return its text. */
async function renderMacro(page: Page, macro: string) {
	return page.evaluate(m => {
		const SC = (window as any).SugarCube;
		const out = document.createElement("div");
		new SC.Wikifier(out, m);
		return out.textContent ?? "";
	}, macro);
}

test("Bailey's Office keeps its NPC through the town-project reaction", async ({ page }) => {
	await openCompiledGame(page);

	// Force a town-project reaction to be eligible on every roll.
	await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		V.town_projects = { bridge: 3, road: 3, diving: 3, thicket: 3, green: 3 };
		V.bailey_town = {};
		V.renttime = 7;
	});

	const text = await renderMacro(page, "<<npc Bailey>><<person1>><<baileyTownReaction>>[<<He>>|<<his>>]");

	expect(text).not.toContain("ERROR");
	// Bailey survives the widget: the trailing pronouns still resolve.
	expect(text).toMatch(/\[(He|She) \| ?(his|her)\]|\[(He|She)\|(his|her)\]/);

	const state = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		return { pronoun: V.pronoun, slot0: V.NPCList[0]?.fullDescription, npcCount: V.npc.length };
	});
	expect(state.slot0).toBe("Bailey");
	expect(["m", "f"]).toContain(state.pronoun);
	// A second <<npc Bailey>> inside the widget would register him twice and force "they".
	expect(state.npcCount).toBe(1);
});

test("Bailey's Office and the passages reached from it render no pronoun errors", async ({ page }) => {
	await openCompiledGame(page);

	await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		V.town_projects = { bridge: 3, road: 3, diving: 3, thicket: 3, green: 3 };
		V.bailey_town = {};
		V.renttime = 7;
		V.hacker_tasks = [];
		(window as any).Time.setTime(8, 0);
	});

	await navigateTo(page, "Bailey's Office");
	const office = await page.locator("#passages").innerText();
	expect(office).not.toContain("ERROR");

	// The hacker-device scene inherits Bailey from the office.
	await navigateTo(page, "Bailey's Office Hack");
	const hack = await page.locator("#passages").innerText();
	expect(hack).not.toContain("ERROR");
	expect(hack).not.toContain("Personselect is missing");
});

test("<<npc>> recovers when $NPCNameList and $NPCName drift apart", async ({ page }) => {
	await openCompiledGame(page);

	// Simulate the desync: the name list no longer lines up with the records.
	const drifted = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		V.NPCNameList = V.NPCName.map((row: any) => row?.nam);
		V.NPCNameList.unshift("__ghost__"); // every index now points one row early
		const baileyRow = V.NPCName.findIndex((row: any) => row?.nam === "Bailey");
		V.NPCName[baileyRow].pronoun = "m";
		return { misresolved: V.NPCNameList.indexOf("Bailey") !== baileyRow };
	});
	expect(drifted.misresolved).toBe(true);

	const text = await renderMacro(page, "<<npc Bailey>><<person1>><<He>>");
	expect(text).not.toContain("ERROR");
	expect(text).toContain("He");

	const realigned = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		const i = V.NPCNameList.indexOf("Bailey");
		return { pronoun: V.pronoun, aligned: V.NPCName[i]?.nam === "Bailey" };
	});
	expect(realigned.aligned).toBe(true);
	expect(realigned.pronoun).toBe("m");
});

test("<<npc>> re-rolls a named NPC left without a pronoun", async ({ page }) => {
	await openCompiledGame(page);

	await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		const i = V.NPCNameList.indexOf("Bailey");
		delete V.NPCName[i].pronoun;
	});

	const text = await renderMacro(page, "<<npc Bailey>><<person1>><<He>> <<his>>");
	expect(text).not.toContain("ERROR");

	const pronoun = await page.evaluate(() => (window as any).SugarCube.State.variables.pronoun);
	expect(["m", "f"]).toContain(pronoun);
});

test("<<npc>> repairs a named NPC stuck on a non-human pronoun", async ({ page }) => {
	await openCompiledGame(page);

	await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		const row = V.NPCName[V.NPCNameList.indexOf("Bailey")];
		row.pronoun = "i";
		// A herm / X-Changed body: repairing the pronoun must not rebuild the genitals.
		row.gender = "m";
		row.penis = "clothed";
		row.vagina = "clothed";
		row.breastsize = 5;
	});

	const text = await renderMacro(page, "<<npc Bailey>><<person1>><<He>> is already dressed.");
	expect(text).not.toContain("It is already dressed");
	expect(text).not.toContain("ERROR");

	const repaired = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		const row = V.NPCName[V.NPCNameList.indexOf("Bailey")];
		return { record: row.pronoun, active: V.pronoun, penis: row.penis, vagina: row.vagina, breastsize: row.breastsize };
	});
	expect(["m", "f"]).toContain(repaired.record);
	expect(["m", "f"]).toContain(repaired.active);
	expect(repaired.penis).toBe("clothed");
	expect(repaired.vagina).toBe("clothed");
	expect(repaired.breastsize).toBe(5);

	// The Ivory Wraith legitimately uses "it" and must not be re-rolled.
	const wraith = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		const SC = (window as any).SugarCube;
		const out = document.createElement("div");
		new SC.Wikifier(out, "<<endevent>><<npc Ivory Wraith>><<person1>>");
		return V.NPCName[V.NPCNameList.indexOf("Ivory Wraith")].pronoun;
	});
	expect(wraith).toBe("i");
});
