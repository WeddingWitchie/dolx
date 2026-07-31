import { test, expect } from "@playwright/test";
import { openGame, navigateTo, assertNoErrors, advanceHours, setDay, wikifyEval, type Page, type WeekDay } from "./helpers.js";

const gifts = ["brush", "camera", "perfume", "tuxedo"] as const;

/** Scope to the rendered passage: the raw twee source lives in tw-passagedata elements too. */
function passage(page: Page) {
	return page.locator("#passages");
}

function giftLink(page: Page) {
	return passage(page).getByText("Give Poppy Christmas gift");
}

/**
 * Bring Poppy to the point where the flat and lake menus are reachable, with a wrapped Christmas gift in hand.
 *
 * The clock is positioned before the Christmas flags are set:
 * yearlyEventChecks() clears V.christmas outside 18-25 December, and it runs on any day-pass.
 */
async function setupPoppy(page: Page, gift: string, pronoun: "m" | "f", opts: { patience?: number; day?: WeekDay; hour?: number } = {}) {
	const { patience = 100, day = "Saturday", hour = 16 } = opts;

	await navigateTo(page, "Start2");
	await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		V.modLIUnlocks = { Poppy: true };
	});
	await wikifyEval(page, "<<poppyFirstMeetingInit>>");
	await page.evaluate(
		({ p, pat }) => {
			const V = (window as any).SugarCube.State.variables;
			const C = (window as any).C;
			V.poppyromance = 0;
			V.poppySafeHouse = 1;
			C.npc.Poppy.pronoun = p;
			C.npc.Poppy.patience = pat;
		},
		{ p: pronoun, pat: patience }
	);
	await wikifyEval(page, "<<poppyFlatInit>>");
	await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		V.poppyFlat.bedroomUnlocked = true;
	});

	await setDay(page, day, hour, 30);

	await page.evaluate(g => {
		const V = (window as any).SugarCube.State.variables;
		V.christmas = 1;
		V.christmas_gift_poppy = g;
		V.christmas_gift_poppy_wrapped = 1;
		delete V.christmas_gift_poppy_given;
		delete V.poppyGiftVenue;
	}, gift);
}

/** Roll the gift back to its just-bought, unwrapped state. */
async function makeUnwrapped(page: Page, gift: string) {
	await page.evaluate(g => {
		const V = (window as any).SugarCube.State.variables;
		V.christmas_wrap = 1;
		V.christmas_gift_poppy = `${g}_unwrapped`;
		delete V.christmas_gift_poppy_wrapped;
	}, gift);
}

/** Poppy only shows up at the lake in clear weather; Weather.precipitation is getter-only. */
async function forceClearWeather(page: Page) {
	await page.evaluate(() => {
		Object.defineProperty((window as any).Weather, "precipitation", {
			get: () => "none",
			configurable: true,
		});
	});
}

/** The lake menu is reached from Lake Shore, which loads Poppy as person1 on the way in. */
async function openLakeMenu(page: Page) {
	await forceClearWeather(page);
	await wikifyEval(page, "<<npc Poppy>><<person1>>");
	await navigateTo(page, "Lake Poppy");
}

test.beforeEach(async ({ page }) => {
	await openGame(page);
});

test.afterEach(async ({ page }) => {
	await assertNoErrors(page);
});

test("the gift option appears in the flat menu only while a wrapped gift is unspent", async ({ page }) => {
	await setupPoppy(page, "camera", "f");
	await navigateTo(page, "Flats Poppy Social");

	await expect(passage(page)).toContainText("You see Poppy adjusting some Christmas ornaments.");
	await expect(giftLink(page)).toBeVisible();

	// Once given, the option must not come back.
	await page.evaluate(() => {
		(window as any).SugarCube.State.variables.christmas_gift_poppy_given = 1;
	});
	await navigateTo(page, "Flats Poppy Social");
	await expect(giftLink(page)).toHaveCount(0);
});

test("the gift option appears in the lake menu without the flat's flavour line", async ({ page }) => {
	await setupPoppy(page, "camera", "f", { hour: 10 });
	await openLakeMenu(page);

	await expect(giftLink(page)).toBeVisible();
	await expect(passage(page)).not.toContainText("adjusting some Christmas ornaments");
});

for (const pronoun of ["m", "f"] as const) {
	for (const gift of gifts) {
		test(`${gift} handover resolves at the flat (${pronoun})`, async ({ page }) => {
			await setupPoppy(page, gift, pronoun);
			await navigateTo(page, "Flats Poppy Social");
			await giftLink(page).click();

			await expect(passage(page)).toContainText("Merry Christmas");
			// Every branch must leave the player a way out.
			expect(await passage(page).locator("a").count()).toBeGreaterThan(0);
		});

		test(`${gift} handover resolves at the lake (${pronoun})`, async ({ page }) => {
			await setupPoppy(page, gift, pronoun, { hour: 10 });
			await openLakeMenu(page);
			await giftLink(page).click();

			await expect(passage(page)).toContainText("Merry Christmas");
			expect(await passage(page).locator("a").count()).toBeGreaterThan(0);
			// The lake has no try-on, so the suit resolves in a single step.
			if (gift === "tuxedo") {
				await expect(passage(page)).toContainText("I will try it on when I get back home");
				await expect(passage(page)).not.toContainText("What do you think?");
			}
		});
	}
}

test("the tuxedo try-on branches both resolve at the flat", async ({ page }) => {
	for (const choice of ["Compliment", "Insult"]) {
		await setupPoppy(page, "tuxedo", "m");
		await navigateTo(page, "Flats Poppy Social");
		await giftLink(page).click();
		await expect(passage(page)).toContainText("What do you think?");

		// DoL prefixes link text with keyboard numbering, e.g. "(1) Compliment".
		await passage(page).getByRole("link", { name: choice }).click();
		expect(await passage(page).locator("a").count(), choice).toBeGreaterThan(0);
	}
});

test("a low-patience fem Poppy rejects the tuxedo instead of trying it on", async ({ page }) => {
	// LowPatience is the positive patience side <= 33.
	await setupPoppy(page, "tuxedo", "f", { patience: 10 });
	await navigateTo(page, "Flats Poppy Social");
	await giftLink(page).click();

	await expect(passage(page)).toContainText("get my gift mixed up with someone else's");
	await expect(passage(page)).not.toContainText("What do you think?");
});

test("giving the gift marks it spent and clears the venue stamp", async ({ page }) => {
	await setupPoppy(page, "perfume", "f");
	await navigateTo(page, "Flats Poppy Social");
	await giftLink(page).click();

	const state = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		return { given: V.christmas_gift_poppy_given, venue: V.poppyGiftVenue };
	});
	expect(state.given).toBe(1);
	expect(state.venue).toBeUndefined();
});

test("the gift is wrapped in Poppy's flat, in a room Poppy isn't in", async ({ page }) => {
	await setupPoppy(page, "perfume", "f");
	await makeUnwrapped(page, "perfume");

	// Poppy lounges in the living room at this hour, so the option hides there...
	await navigateTo(page, "Flats Poppy Living Room");
	await expect(passage(page).getByText("Wrap Poppy's gift")).toHaveCount(0);

	// ...and shows in a room Poppy is not occupying.
	await navigateTo(page, "Flats Poppy Bathroom");
	await passage(page).getByText("Wrap Poppy's gift").click();

	await expect(passage(page)).toContainText("Poppy's name scrawled across one surface");
	const state = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		return { gift: V.christmas_gift_poppy, wrapped: V.christmas_gift_poppy_wrapped };
	});
	expect(state).toEqual({ gift: "perfume", wrapped: 1 });
});

test("the orphanage desk only offers Poppy's gift when the flat is out of reach", async ({ page }) => {
	await setupPoppy(page, "camera", "f");
	await makeUnwrapped(page, "camera");

	// With flat access the orphanage must not duplicate the option.
	let accessible = await page.evaluate(() => (window as any).poppyFlatAccessible());
	expect(accessible).toBe(true);
	let options = await page.evaluate(() => {
		const div = document.createElement("div");
		new (window as any).SugarCube.Wikifier(div, "<<christmas_options>>");
		return div.textContent || "";
	});
	expect(options).not.toContain("Wrap Poppy's gift");

	// Close the door and the fallback appears.
	await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		V.poppySafeHouse = 0;
		V.poppySeen = V.poppySeen.filter((s: string) => s !== "lake_postclaim_intro");
	});
	accessible = await page.evaluate(() => (window as any).poppyFlatAccessible());
	expect(accessible).toBe(false);
	options = await page.evaluate(() => {
		const div = document.createElement("div");
		new (window as any).SugarCube.Wikifier(div, "<<christmas_options>>");
		return div.textContent || "";
	});
	expect(options).toContain("Wrap Poppy's gift");
});

test("Poppy's Christmas gift state clears for the next year", async ({ page }) => {
	await navigateTo(page, "Start2");
	await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		V.christmas = 1;
		V.christmas_gift_poppy = "tuxedo";
		V.christmas_gift_poppy_wrapped = 1;
		V.christmas_gift_poppy_given = 1;
		V.poppyGiftVenue = "flat";
	});
	await advanceHours(page, 24);

	const state = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		return {
			christmas: V.christmas,
			gift: V.christmas_gift_poppy,
			wrapped: V.christmas_gift_poppy_wrapped,
			given: V.christmas_gift_poppy_given,
			venue: V.poppyGiftVenue,
		};
	});

	expect(state).toEqual({
		christmas: undefined,
		gift: undefined,
		wrapped: undefined,
		given: undefined,
		venue: undefined,
	});
});
