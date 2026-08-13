import { test, expect } from "@playwright/test";
import { openGame, navigateTo, getVar, setVar, assertNoErrors, Page } from "./helpers";

/**
 * The herm school rumour ($schoolrep.herm, 0-5) fades when the player stops having both sets of
 * genitals. How much survives is scaled by X-Change fame: if nobody knows you use the pills, the
 * rumour dies outright; if the town knows, it sticks even while your body doesn't match it.
 *
 * The check runs on the passage cycle (hermRumourBodyCheck, xchange.js), so every test here has to
 * take a passage step for the body change to register.
 */

/** Put the player in a body with both sets of parts and let the watcher record that as the baseline. */
async function startHerm(page: Page, rumour: number, xchangeFame: number) {
	await page.evaluate(
		({ r, f }) => {
			const V = (window as any).SugarCube.State.variables;
			V.player.penisExist = true;
			V.player.vaginaExist = true;
			V.schoolrep.herm = r;
			V.xchange_fame = f;
			delete V.schoolrep.hermBody;
		},
		{ r: rumour, f: xchangeFame }
	);
	await navigateTo(page, "Bedroom");
	expect(await getVar(page, "schoolrep")).toMatchObject({ hermBody: true });
}

/** Take the penis away and step a passage, so the watcher sees the body stop being herm. */
async function loseHermBody(page: Page) {
	await setVar(page, "player", { ...((await getVar(page, "player")) as any), penisExist: false });
	await navigateTo(page, "Bedroom");
}

test.describe("herm rumour decay across body changes", () => {
	test.beforeEach(async ({ page }) => {
		await openGame(page);
		// Start2 builds the starting body and room data. Every later step goes through Bedroom instead:
		// revisiting Start2 would rebuild the genitals from $player.sex and undo the test's body setup.
		await navigateTo(page, "Start2");
	});

	// The bands come straight from hermRumourDecayLevels().
	const bands: Array<{ fame: number; rumour: number; expected: number; label: string }> = [
		{ fame: 0, rumour: 5, expected: 0, label: "unknown pill user loses the rumour entirely" },
		{ fame: 100, rumour: 5, expected: 0, label: "band edge 100 still wipes it" },
		{ fame: 101, rumour: 5, expected: 2, label: "101-200 drops three levels" },
		{ fame: 200, rumour: 4, expected: 1, label: "band edge 200 drops three levels" },
		{ fame: 201, rumour: 5, expected: 3, label: "201-300 drops two levels" },
		{ fame: 301, rumour: 5, expected: 4, label: "301-499 drops one level" },
		{ fame: 499, rumour: 3, expected: 2, label: "band edge 499 drops one level" },
		{ fame: 500, rumour: 5, expected: 5, label: "500+ keeps the rumour intact" },
		{ fame: 1000, rumour: 5, expected: 5, label: "max fame keeps the rumour intact" },
	];

	// One session walks the whole table: booting the game per band would be nine more browser
	// sessions for nine reads of the same function.
	test("how much of the rumour survives is set by X-Change fame", async ({ page }) => {
		for (const { fame, rumour, expected, label } of bands) {
			await startHerm(page, rumour, fame);
			await loseHermBody(page);

			expect(await getVar(page, "schoolrep"), label).toMatchObject({ herm: expected, hermBody: false });
			await assertNoErrors(page);
		}
	});

	test("the drop is reported in the effects panel", async ({ page }) => {
		// The player has to be told, or the fame just quietly disappears between passages.
		await startHerm(page, 5, 0);
		await loseHermBody(page);

		// Both vars are consumed by the effects panel as it renders, so the proof is the text on screen.
		await expect(page.locator("#passages")).toContainText("rumours about your genitalia die out");
		expect(await getVar(page, "school_herm_fade_message")).toBeUndefined();
	});

	test("the rumour never goes below zero", async ({ page }) => {
		await startHerm(page, 1, 0);
		await loseHermBody(page);

		expect(await getVar(page, "schoolrep")).toMatchObject({ herm: 0 });
	});

	test("swapping one herm body for another keeps the rumour", async ({ page }) => {
		await startHerm(page, 5, 0);

		// A herm-to-herm pill swap: the body changes shape, but the parts never go away,
		// so there is nothing for the school to disprove.
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.player.breastsize = V.player.breastsize > 3 ? 1 : 6;
			V.player.bottomsize = V.player.bottomsize > 2 ? 1 : 4;
		});
		await navigateTo(page, "Bedroom");

		expect(await getVar(page, "schoolrep")).toMatchObject({ herm: 5, hermBody: true });
	});

	test("getting the parts back costs nothing", async ({ page }) => {
		await startHerm(page, 5, 500);
		await loseHermBody(page);
		expect(await getVar(page, "schoolrep")).toMatchObject({ herm: 5, hermBody: false });

		await setVar(page, "player", { ...((await getVar(page, "player")) as any), penisExist: true });
		await navigateTo(page, "Bedroom");

		expect(await getVar(page, "schoolrep")).toMatchObject({ herm: 5, hermBody: true });
	});

	test("a save with no baseline records one instead of decaying", async ({ page }) => {
		// Old saves have no $schoolrep.hermBody. The first passage after loading must not charge them.
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.player.penisExist = false;
			V.player.vaginaExist = true;
			V.schoolrep.herm = 5;
			V.xchange_fame = 0;
			delete V.schoolrep.hermBody;
		});
		await navigateTo(page, "Bedroom");

		expect(await getVar(page, "schoolrep")).toMatchObject({ herm: 5, hermBody: false });
	});

	test("a non-herm body changing shape leaves the rumour alone", async ({ page }) => {
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.player.penisExist = true;
			V.player.vaginaExist = false;
			V.schoolrep.herm = 4;
			V.xchange_fame = 0;
			V.schoolrep.hermBody = false;
		});
		// A plain genderflip: penis out, vagina in. Never herm at any passage boundary.
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.player.penisExist = false;
			V.player.vaginaExist = true;
		});
		await navigateTo(page, "Bedroom");

		expect(await getVar(page, "schoolrep")).toMatchObject({ herm: 4, hermBody: false });
	});
});
