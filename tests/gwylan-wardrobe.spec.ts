import { test, expect } from "@playwright/test";
import { openGame, navigateTo, assertNoErrors, wikifyToText, type Page } from "./helpers.js";

async function setupGame(page: Page) {
	await openGame(page);
	await navigateTo(page, "Start2");
	await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		const V = SC.State.variables;
		const C = (window as any).C;
		V.gwylanSeen = ["request_intro", "request_tutorial"];
		V.gwylanTalked = [];
		V.gwylan = {
			progress: 5,
			stage: 0,
			sea: 0,
			wary: 0,
			robin: 0,
			purged: 0,
			timer: {},
			request: {},
			requestCount: 6,
			requestDone: false,
		};
		C.npc.Gwylan.init = 1;
		C.npc.Gwylan.love = 40;
		C.npc.Gwylan.lust = 20;
		C.npc.Gwylan.dom = 10;
		V.pronoun = "m";
		SC.Wikifier.wikifyEval('<<run statusCheck("Gwylan")>>');
	});
}

/** Put a known costume item into the main wardrobe and return its details. */
async function stockWardrobe(page: Page) {
	return page.evaluate(() => {
		const SC = (window as any).SugarCube;
		const V = SC.State.variables;
		const setup = (window as any).setup;
		const clone = (window as any).SugarCube.Scripting.evalJavaScript("clone");
		const gown = clone(setup.clothes.upper.find((c: any) => c.name === "gothic gown"));
		gown.colour = "red";
		if (gown.accessory_colour_options?.length) gown.accessory_colour = "black";
		V.wardrobe.upper.push(gown);
		const hat = clone(setup.clothes.head.find((c: any) => c.name === "cowboy hat"));
		hat.colour = "purple";
		V.wardrobe.head.push(hat);
		return { gownColour: gown.colour, gownAcc: gown.accessory_colour, hatColour: hat.colour };
	});
}

async function generate(page: Page, clothingRequestCount: number, seed: number) {
	return page.evaluate(
		({ count, seedValue }) => {
			const SC = (window as any).SugarCube;
			const V = SC.State.variables;
			V.gwylan.request = {};
			V.gwylan.clothingRequestCount = count;
			V.gwylan.requestSeed = seedValue;
			(window as any).gwylanRequest("clothing");
			return JSON.parse(JSON.stringify(V.gwylan.request));
		},
		{ count: clothingRequestCount, seedValue: seed }
	);
}

test.describe("Gwylan wardrobe clothing requests", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("first two clothing requests are shopping requests", async ({ page }) => {
		await setupGame(page);
		await stockWardrobe(page);

		for (const seed of [0.3, 0.44, 0.61, 0.77, 0.88]) {
			const request = await generate(page, 0, seed);
			expect(request.details.fromWardrobe, `seed ${seed}`).toBeFalsy();
			expect(request.details.shops.length, `seed ${seed}`).toBeGreaterThan(0);
		}
		const count = await page.evaluate(() => (window as any).SugarCube.State.variables.gwylan.clothingRequestCount);
		expect(count).toBe(1);
	});

	test("later requests use owned clothes, with the owned colours", async ({ page }) => {
		await setupGame(page);
		const owned = await stockWardrobe(page);

		const poolNames = await page.evaluate(() => (window as any).gwylanWardrobeRequestPool().map((entry: any) => entry.name));
		let wardrobeRequests = 0;
		const seeds = [0.26, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9];
		for (const seed of seeds) {
			const request = await generate(page, 5, seed);
			if (!request.details.fromWardrobe) continue;
			wardrobeRequests++;
			expect(request.details.shops).toEqual([]);
			expect(request.details.replacements).toBe("n/a");
			expect(request.items.some((item: any) => item.root)).toBe(true);
			for (const item of request.items.filter((i: any) => !i.skip && !i.alt)) {
				expect(poolNames).toContain(item.name);
				expect(item.integrity_requirement).toBe("any");
				if (item.name === "gothic gown") {
					expect(item.colour_requirement).toBe(owned.gownColour);
				}
				if (item.name === "cowboy hat") {
					expect(item.colour_requirement).toBe(owned.hatColour);
				}
			}
		}
		expect(wardrobeRequests).toBeGreaterThan(0);
	});

	test("request text, journal and completion check all render", async ({ page }) => {
		await setupGame(page);
		await stockWardrobe(page);

		// Force the wardrobe path.
		const request = await page.evaluate(() => {
			const SC = (window as any).SugarCube;
			const V = SC.State.variables;
			for (let i = 0; i < 40; i++) {
				V.gwylan.request = {};
				V.gwylan.clothingRequestCount = 5;
				V.gwylan.requestSeed = 0.26 + i * 0.015;
				(window as any).gwylanRequest("clothing");
				if (V.gwylan.request.details?.fromWardrobe) break;
			}
			return JSON.parse(JSON.stringify(V.gwylan.request));
		});
		expect(request.details.fromWardrobe).toBe(true);

		const requestText = await wikifyToText(page, "<<gwylanRequestText>>");
		expect(requestText).not.toContain("Error");
		expect(requestText).not.toContain("undefined");
		expect(requestText.toLowerCase()).toContain("wear");
		const itemName = request.items.find((i: any) => i.root).name;
		expect(requestText).toContain(itemName);

		const journalText = await wikifyToText(page, "<<gwylanJournalItems>>");
		expect(journalText).not.toContain("Error");

		// Not met while undressed, met once the requested clothes are worn.
		const before = await page.evaluate(() => (window as any).gwylanRequestMet());
		expect(before).toBe(false);

		const after = await page.evaluate(() => {
			const SC = (window as any).SugarCube;
			const V = SC.State.variables;
			const clone = (window as any).SugarCube.Scripting.evalJavaScript("clone");
			const setup = (window as any).setup;
			V.gwylan.request.items
				.filter((item: any) => !item.alt)
				.forEach((item: any) => {
					const base = clone(setup.clothes[item.slot].find((c: any) => c.name === item.name));
					if (item.colour_requirement !== "any") base.colour = item.colour_requirement;
					if (item.acc_colour_requirement !== "any") base.accessory_colour = item.acc_colour_requirement;
					if (item.pattern_requirement !== "any") base.pattern = item.pattern_requirement;
					V.worn[item.slot] = base;
				});
			if (V.worn.lower.name === "naked") V.worn.lower = clone(setup.clothes.lower.find((c: any) => c.name === "jeans"));
			return (window as any).gwylanRequestMet();
		});
		expect(after).toBe(true);
	});

	test("falls back to shopping when nothing suitable is owned", async ({ page }) => {
		await setupGame(page);
		const empty = await page.evaluate(() => {
			const SC = (window as any).SugarCube;
			const V = SC.State.variables;
			(window as any).setup.clothes_all_slots.forEach((slot: string) => {
				if (Array.isArray(V.wardrobe[slot])) V.wardrobe[slot] = [];
			});
			Object.values(V.wardrobes ?? {}).forEach((wardrobe: any) => {
				(window as any).setup.clothes_all_slots.forEach((slot: string) => {
					if (Array.isArray(wardrobe[slot])) wardrobe[slot] = [];
				});
			});
			return (window as any).gwylanWardrobeRequestPool().length;
		});
		expect(empty).toBe(0);

		for (const seed of [0.26, 0.4, 0.55, 0.7, 0.85]) {
			const request = await generate(page, 5, seed);
			expect(request.details.fromWardrobe, `seed ${seed}`).toBe(false);
			expect(request.details.shops.length, `seed ${seed}`).toBeGreaterThan(0);
		}
	});

	test("favourited, worn, cursed and school clothes are excluded", async ({ page }) => {
		await setupGame(page);
		await stockWardrobe(page);

		const result = await page.evaluate(() => {
			const SC = (window as any).SugarCube;
			const V = SC.State.variables;
			const pool = () => (window as any).gwylanWardrobeRequestPool();

			const beforeNames = pool().map((entry: any) => entry.name);
			// School uniform never offered
			const schoolInPool = pool().some((entry: any) => entry.name.includes("school"));

			// Favourite the gown
			const gown = V.wardrobe.upper.find((item: any) => item.name === "gothic gown");
			(window as any).toggleWardrobeFavorite("upper", gown);
			const afterFavourite = pool().map((entry: any) => entry.name);
			(window as any).toggleWardrobeFavorite("upper", gown);

			// Wearing it hides it too
			const clone = (window as any).SugarCube.Scripting.evalJavaScript("clone");
			V.worn.head = clone((window as any).setup.clothes.head.find((c: any) => c.name === "cowboy hat"));
			const afterWearing = pool().map((entry: any) => entry.name);

			return { beforeNames, schoolInPool, afterFavourite, afterWearing };
		});

		expect(result.beforeNames).toContain("gothic gown");
		expect(result.beforeNames).toContain("cowboy hat");
		expect(result.schoolInPool).toBe(false);
		expect(result.afterFavourite).not.toContain("gothic gown");
		expect(result.afterWearing).not.toContain("cowboy hat");
	});
});
