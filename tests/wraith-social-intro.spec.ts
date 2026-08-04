import { test, expect } from "@playwright/test";
import { openGame, navigateTo, getVar, setVar, wikifyEval, assertNoErrors, type Page } from "./helpers.js";

/*
 * Breaking free of the Ivory Wraith's possession on the first encounter used to leave
 * $wraithIntro unset, so the wraith never unlocked its card in the social tab.
 * Covers every half of the fix:
 *  - the Wraith Resisted passages set the flag as they narrate the first sighting
 *  - <<wraithPossess>> registers the named NPC, which the social tab also requires
 *  - xchange-modupdate backfills both for saves that already hit the bug
 *  - the body roll stays keyed to $wraith.bodyGenerated, not the NPC's init flag
 */

async function start(page: Page) {
	await openGame(page);
	await navigateTo(page, "Start2");
}

async function wraithBody(page: Page) {
	return page.evaluate(() => {
		const n = (window as any).C.npc["Ivory Wraith"];
		return { init: n.init, gender: n.gender, penis: n.penis, vagina: n.vagina, breastsize: n.breastsize };
	});
}

/** Put the player mid-possession so the resist passages render their first-encounter branch. */
async function setUpFirstPossession(page: Page) {
	await wikifyEval(page, "<<set $wraith.state to 'active'>><<set $wraith.exit to 'forest'>><<generateWraith 1>>");
	await setVar(page, "wraithIntro", undefined);
	await setVar(page, "possessed", true);
}

test.describe("resisting the wraith's first possession", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	for (const passage of ["Wraith Resisted", "Wraith Resisted Lake"]) {
		test(`${passage} marks the wraith as met`, async ({ page }) => {
			await start(page);
			await setUpFirstPossession(page);
			expect(await getVar(page, "wraithIntro")).toBeFalsy();

			await navigateTo(page, passage);

			// The first-encounter branch is the one that used to skip the flag.
			await expect(page.locator("#passages").getByText("Your will is strong")).toBeVisible();
			expect(await getVar(page, "wraithIntro")).toBe(true);
		});
	}
});

test.describe("social tab card", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("backfills wraithIntro on load for saves that already resisted", async ({ page }) => {
		await start(page);
		// A save that met the wraith but never got the flag set.
		await wikifyEval(page, "<<set $wraith.state to 'active'>><<generateWraith 1>><<set $wraith.seen to 2>>");
		await setVar(page, "wraithIntro", undefined);
		await page.evaluate(() => {
			delete (window as any).SugarCube.State.variables.xchange.backComp.wraithIntroSocial;
		});

		await wikifyEval(page, "<<xchange-modupdate>>");

		expect(await getVar(page, "wraithIntro")).toBe(true);
	});

	test("wraith appears in Primary Relationships once met", async ({ page }) => {
		await start(page);
		await wikifyEval(page, "<<set $wraith.state to 'active'>><<generateWraith 1>><<set $wraith.seen to 2>>");
		await setVar(page, "wraithIntro", true);
		await page.evaluate(() => {
			(window as any).SugarCube.State.variables.wli.cfg.nosocialrng = true;
		});

		const rendered = await page.evaluate(() => {
			const div = document.createElement("div");
			new (window as any).SugarCube.Wikifier(div, "<<social>>");
			return div.textContent || "";
		});

		expect(rendered).toContain("Ivory Wraith");
	});
});

test.describe("possession without a generated wraith NPC", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	// Sleep/bed possession calls <<wraithPossess>> with no <<generateWraith>>, so the
	// named NPC is never initialised even though the player has met the wraith.
	test("card still shows after resisting a possession that never generated the NPC", async ({ page }) => {
		await start(page);
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.wraith.state = "active";
			V.wraith.possessCount = 1;
			V.wli.cfg.nosocialrng = true;
			delete V.xchange.backComp.wraithIntroSocial;
		});
		await setVar(page, "wraithIntro", undefined);
		const initBefore = await page.evaluate(() => (window as any).C.npc["Ivory Wraith"].init);
		expect(initBefore).not.toBe(1);

		await wikifyEval(page, "<<xchange-modupdate>>");

		expect(await getVar(page, "wraithIntro")).toBe(true);
		const rendered = await page.evaluate(() => {
			const div = document.createElement("div");
			new (window as any).SugarCube.Wikifier(div, "<<social>>");
			return div.textContent || "";
		});
		expect(rendered).toContain("Ivory Wraith");
	});
});

test.describe("wraith body generation", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	// Registering the NPC during possession must not be mistaken for "body already rolled",
	// or the wraith would be stuck on the bare default shape for the rest of the save.
	test("body still rolls after a possession pre-registered the NPC", async ({ page }) => {
		await start(page);
		await wikifyEval(page, "<<set $wraith.state to 'active'>><<wraithPossess 'home'>>");
		expect((await wraithBody(page)).init).toBe(1);

		await wikifyEval(page, "<<generateWraith 1>>");
		const after = await wraithBody(page);
		expect(after.vagina === "clothed" || after.penis === "clothed").toBe(true);
		expect(await getVar(page, "wraith")).toMatchObject({ bodyGenerated: true });
	});

	test("an established wraith is never rerolled by the load-time backfill", async ({ page }) => {
		await start(page);
		await wikifyEval(page, "<<set $wraith.state to 'active'>><<generateWraith 1>>");
		const before = await wraithBody(page);

		// An older save: body already rolled, marker not yet recorded.
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			delete V.wraith.bodyGenerated;
			delete V.xchange.backComp.wraithIntroSocial;
		});
		await wikifyEval(page, "<<xchange-modupdate>>");
		expect(await getVar(page, "wraith")).toMatchObject({ bodyGenerated: true });

		await wikifyEval(page, "<<generateWraith 1>>");
		expect(await wraithBody(page)).toEqual(before);
	});
});
