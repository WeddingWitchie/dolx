import { expect, test, type Page } from "@playwright/test";
import { assertNoErrors, navigateTo, openGame } from "./helpers.js";

/**
 * <<girlfriend>> / <<partnerfriend>> / <<friend>> print the player's side of a relationship.
 * With a speaker name they follow how that NPC addresses the player; without one they follow
 * the player's own pronouns.
 */

async function setupGame(page: Page) {
	await openGame(page);
	await navigateTo(page, "Start2");
}

/** Render a widget string and return its text, with no state side effects to clean up. */
async function render(page: Page, macro: string) {
	return page.evaluate(m => {
		const SC = (window as any).SugarCube;
		const holder = document.createElement("div");
		new SC.Wikifier(holder, m);
		return holder.textContent.trim();
	}, macro);
}

/**
 * Feminine body and appearance, feminine gender identity, both pronoun sets accepted and
 * preferred — the case from the Robin note report.
 */
async function femalePlayer(page: Page, options: { appearance: "m" | "f" } = { appearance: "f" }) {
	await page.evaluate(app => {
		const V = (window as any).SugarCube.State.variables;
		V.player.sex = "f";
		V.player.gender = "f";
		V.player.gender_appearance = app;
		V.player.femininity = app === "f" ? 800 : 200;
		V.identity.presentation.pronouns.preferredMasculine = true;
		V.identity.presentation.pronouns.preferredFeminine = true;
		V.identity.presentation.pronouns.preferredNeutral = false;
		V.identity.presentation.pronouns.pronounDynamicMode = "";
		V.genderidentity = 1400; // strongly feminine identity (meter runs 0-1500)
	}, options.appearance);
}

test.afterEach(async ({ page }) => {
	await assertNoErrors(page);
});

test.describe("Partner terms", () => {
	test("a partner who knows the player uses their identity, not their outfit", async ({ page }) => {
		await setupGame(page);
		await femalePlayer(page, { appearance: "m" });
		await page.evaluate(() => {
			(window as any).C.npc.Robin.love = 70; // note fires at love 60
		});

		expect(await render(page, '<<girlfriend "Robin">>')).toBe("girlfriend");
		expect(await render(page, '<<partnerfriend "Robin">>')).toBe("boyfriend");
	});

	test("a stranger goes by appearance", async ({ page }) => {
		await setupGame(page);
		await femalePlayer(page, { appearance: "m" });

		expect(await render(page, '<<girlfriend "stranger">>')).toBe("boyfriend");
	});

	test('<<friend>> matches <<girlfriend "Robin">> during a Robin romance', async ({ page }) => {
		await setupGame(page);
		await femalePlayer(page, { appearance: "m" });
		await page.evaluate(() => {
			(window as any).SugarCube.State.variables.robinromance = 1;
			(window as any).C.npc.Robin.love = 70;
		});

		expect(await render(page, "<<friend>>")).toBe(await render(page, '<<girlfriend "Robin">>'));
	});

	test("<<friend>> still prints friendship terms outside a romance", async ({ page }) => {
		await setupGame(page);
		await page.evaluate(() => {
			(window as any).SugarCube.State.variables.robinromance = 0;
		});

		expect(await render(page, "<<friend>>")).toBe("friend");
		expect(await render(page, '<<friend "bff">>')).toBe("best friend");
	});

	test("the Robin note renders without errors and asks the right question", async ({ page }) => {
		await setupGame(page);
		await femalePlayer(page);
		await page.evaluate(() => {
			(window as any).C.npc.Robin.love = 70;
		});
		await navigateTo(page, "Robin Note");

		const text = await page.evaluate(() => document.querySelector("#passages")?.textContent ?? "");
		expect(text).toContain("girlfriend");
		expect(text).not.toContain("boyfriend");
	});
});
