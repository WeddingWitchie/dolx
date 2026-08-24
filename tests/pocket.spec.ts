import { test, expect } from "@playwright/test";
import { openGame, navigateTo, waitForPassage, Page } from "./helpers";

async function newGame(page: Page) {
	await openGame(page);
	await navigateTo(page, "Start2");
	await waitForPassage(page);
	await navigateTo(page, "Bedroom");
	await waitForPassage(page);
}

test("pocket state initialises and gates correctly", async ({ page }) => {
	await newGame(page);

	const result = await page.evaluate(() => {
		const w = window as any;
		const SC = w.SugarCube;
		const V = SC.State.variables;
		w.pocketEnsure();
		/* Spoilage is an opt-in Rebalancing setting, then explicitly enabled for the checks below. */
		const defaultSpoilage = w.foodSpoilageEnabled();
		V.foodSpoilage = 1;
		return {
			mirror: V.pocket.mirror,
			defaultSpoilage,
			slots: V.pocket.bag.slots.length,
			lock: w.pocketLockReason(),
			spoilage: w.foodSpoilageEnabled(),
			biscuitLife: w.foodShelfLife("rich_biscuit"),
			steakLife: w.foodShelfLife("steak"),
			biscuitEffects: w.foodEffects("rich_biscuit"),
		};
	});

	expect(result.mirror).toBe(false);
	expect(result.defaultSpoilage).toBe(false);
	expect(result.slots).toBe(0);
	expect(result.lock).toBe("");
	expect(result.spoilage).toBe(true);
	expect(result.biscuitLife).toBe(21);
	expect(result.steakLife).toBe(4);
	expect(Object.keys(result.biscuitEffects).length).toBeGreaterThan(0);
});

test("pre-POCKET saves initialise cleanly and preserve existing cooked food", async ({ page }) => {
	await newGame(page);

	const result = await page.evaluate(() => {
		const w = window as any;
		const SC = w.SugarCube;
		const V = SC.State.variables;
		const setup = w.setup || SC.setup;

		/* A released save has kitchen stock but none of the new POCKET state. */
		V.worn.handheld = JSON.parse(JSON.stringify(setup.clothes.handheld[8]));
		V.foodstuff.rich_biscuit.amount = 2;
		delete V.pocket;
		delete V.foodBatches;
		delete V.foodSatiety;
		delete V.homeCookedEaten;

		w.pocketEnsure();
		const batches = w.foodBatchReconcile("rich_biscuit");

		return {
			mirror: V.pocket.mirror,
			sourceMatches: V.pocket.bag.source === w.pocketBagSource(),
			slots: V.pocket.bag.slots.length,
			fullness: V.pocket.foodFullness,
			bloated: V.pocket.bloated,
			satiety: V.foodSatiety,
			homeCookedEaten: V.homeCookedEaten,
			batch: batches[0],
			stock: V.foodstuff.rich_biscuit.amount,
		};
	});

	expect(result).toMatchObject({
		mirror: false,
		sourceMatches: true,
		slots: 0,
		fullness: 0,
		bloated: 0,
		satiety: 0,
		homeCookedEaten: 0,
		stock: 2,
	});
	expect(result.batch).toEqual({ n: 2, day: expect.any(Number), own: false });
});

test("opening a locked POCKET does not initialise or rewrite frozen scene state", async ({ page }) => {
	await newGame(page);

	const result = await page.evaluate(() => {
		const w = window as any;
		const V = w.SugarCube.State.variables;
		delete V.pocket;
		V.statFreeze = true;
		const host = document.createElement("div");
		host.appendChild(w.SugarCube.Wikifier.wikifyEval("<<pocketMain>>"));
		return { pocket: V.pocket, text: host.textContent };
	});

	expect(result.pocket).toBeUndefined();
	expect(result.text).toContain("can't reach for anything now");
});

test("an active NPC locks POCKET so Bailey's rent demand cannot be escaped by eating", async ({ page }) => {
	await newGame(page);

	const result = await page.evaluate(() => {
		const w = window as any;
		const SC = w.SugarCube;
		const V = SC.State.variables;
		const unlockedReason = w.pocketLockReason();

		SC.Wikifier.wikifyEval("<<npc Bailey>>");
		V.foodSpoilage = 0;
		V.foodstuff.rich_biscuit.amount = 1;
		V.foodBatches.rich_biscuit = [{ n: 1, day: w.Time.days, own: true }];
		const eaten = w.pocketEatFood("rich_biscuit");

		return {
			unlockedReason,
			bailey: V.NPCList[0].fullDescription,
			lockedReason: w.pocketLockReason(),
			eatingBlocked: eaten === undefined,
			foodLeft: V.foodstuff.rich_biscuit.amount,
		};
	});

	expect(result).toEqual({
		unlockedReason: "",
		bailey: "Bailey",
		lockedReason: "Not while someone is dealing with you.",
		eatingBlocked: true,
		foodLeft: 1,
	});
});

test("cooked batches expire oldest-first and feed the well-fed trait", async ({ page }) => {
	await newGame(page);

	const result = await page.evaluate(() => {
		const w = window as any;
		const SC = w.SugarCube;
		const V = SC.State.variables;
		w.pocketEnsure();
		V.foodSpoilage = 1;

		/* Two batches of the same dish, cooked a fortnight apart. */
		V.foodstuff.rich_biscuit.amount = 4;
		V.foodBatches.rich_biscuit = [
			{ n: 2, day: w.Time.days - 14, own: true },
			{ n: 2, day: w.Time.days, own: true },
		];

		const daysLeftBefore = w.foodDaysLeft("rich_biscuit");
		const firstEaten = w.foodNextBatch("rich_biscuit").day;

		w.pocketEatFood("rich_biscuit");
		w.pocketHourPassed();
		w.pocketHourPassed();
		w.pocketEatFood("rich_biscuit");
		const afterOldGone = w.foodNextBatch("rich_biscuit").day;

		return {
			daysLeftBefore,
			firstEaten,
			afterOldGone,
			today: w.Time.days,
			stock: V.foodstuff.rich_biscuit.amount,
			satiety: V.foodSatiety,
			wellFed: w.wellFedActive(),
			mod: w.wellFedMod(),
			homeCooked: V.homeCookedEaten,
		};
	});

	expect(result.daysLeftBefore).toBe(7);
	expect(result.firstEaten).toBe(result.today - 14);
	expect(result.afterOldGone).toBe(result.today);
	expect(result.stock).toBe(2);
	expect(result.satiety).toBe(54);
	expect(result.wellFed).toBe(true);
	expect(result.mod).toBeCloseTo(0.95);
	expect(result.homeCooked).toBe(2);
});

test("disabling spoilage keeps old food but lets its stat effects decay naturally", async ({ page }) => {
	await newGame(page);

	const result = await page.evaluate(() => {
		const w = window as any;
		const SC = w.SugarCube;
		const V = w.SugarCube.State.variables;
		w.pocketEnsure();
		V.foodSpoilage = 1;

		V.foodstuff.rich_biscuit.amount = 5;
		V.foodBatches.rich_biscuit = [{ n: 5, day: w.Time.days - 30, own: true }];
		const spoiled = w.foodExpirySweep();
		const afterSweep = V.foodstuff.rich_biscuit.amount;

		V.foodSpoilage = 0;
		V.foodstuff.rich_biscuit.amount = 2;
		V.foodBatches.rich_biscuit = [
			{ n: 1, day: w.Time.days - 30, own: true },
			{ n: 1, day: w.Time.days, own: true },
		];
		const datedDay = V.foodBatches.rich_biscuit[0].day;
		w.pocketDayPassed();
		const spoiledOff = w.foodExpirySweep();
		const rows = w.foodExpiryRows("rich_biscuit");
		const staleMeal = w.pocketEatFood("rich_biscuit");
		w.T.eatReport = staleMeal;
		const staleReport = SC.Wikifier.wikifyEval("<<pocketEatReport _eatReport>>").textContent;
		const freshMeal = w.pocketEatFood("rich_biscuit");
		w.T.eatReport = freshMeal;
		const freshReport = SC.Wikifier.wikifyEval("<<pocketEatReport _eatReport>>").textContent;

		return {
			spoiledCount: spoiled.length,
			spoiledAmount: spoiled[0] ? spoiled[0].amount : 0,
			afterSweep,
			spoiledOffCount: spoiledOff.length,
			stockBeforeEating: 2,
			rows,
			staleEffects: staleMeal.effects,
			freshEffects: freshMeal.effects,
			staleFlag: staleMeal.stale,
			freshFlag: freshMeal.stale,
			staleReport,
			freshReport,
			agedBy: w.Time.days - datedDay,
			wellFed: w.wellFedActive(),
			fullness: V.pocket.foodFullness,
		};
	});

	expect(result.spoiledCount).toBe(1);
	expect(result.spoiledAmount).toBe(5);
	expect(result.afterSweep).toBe(0);
	expect(result.spoiledOffCount).toBe(0);
	expect(result.stockBeforeEating).toBe(2);
	expect(result.rows).toEqual([
		{ amount: 1, daysLeft: -9 },
		{ amount: 1, daysLeft: 21 },
	]);
	expect(result.staleEffects).toEqual({});
	expect(result.freshEffects.stress).toBeLessThan(0);
	expect(result.staleFlag).toBe(true);
	expect(result.freshFlag).toBe(false);
	expect(result.staleReport).toContain("past its date, so it only fills you up");
	expect(result.freshReport).toContain("The sugar cheers you up");
	expect(result.agedBy).toBe(30);
	expect(result.wellFed).toBe(true);
	expect(result.fullness).toBe(4);
});

test("the personal slot stays alongside a bag and only bag slots reset when it comes off", async ({ page }) => {
	await newGame(page);

	const result = await page.evaluate(() => {
		const w = window as any;
		const SC = w.SugarCube;
		const V = SC.State.variables;
		w.pocketEnsure();

		V.worn.handheld = JSON.parse(JSON.stringify((w.setup || w.SugarCube.setup).clothes.handheld[0]));
		w.pocketSyncBag();
		const noBagCapacity = w.pocketBagCapacity();
		const noBagCarryCapacity = w.pocketCarryCapacity();
		V.foodstuff.rich_biscuit.amount = 3;
		V.foodBatches.rich_biscuit = [{ n: 3, day: w.Time.days, own: true }];
		const packedWithoutBag = w.pocketSlotToggle("food", "rich_biscuit");
		const personalLocation = V.pocket.bag.slots[0].location;
		V.sexStats.pills.pills.painkillers.owned = 1;
		const secondSlotWithoutBag = w.pocketSlotToggle("pill", "painkillers");
		const noBagName = w.pocketBagName();
		const pillCellWithoutBag = w.pillBagActionCell((w.setup || w.SugarCube.setup).pills.find((pill: any) => pill.name === "painkillers"));
		const toyPackingWithoutBag = w.toyBagAvailable();

		/* Put a backpack in hand. */
		const backpack = JSON.parse(JSON.stringify((w.setup || w.SugarCube.setup).clothes.handheld[8]));
		V.worn.handheld = backpack;
		w.pocketSyncBag();
		const withBagCapacity = w.pocketBagCapacity();
		const withBagCarryCapacity = w.pocketCarryCapacity();

		const packed = w.pocketSlotToggle("pill", "painkillers");
		const slotsPacked = V.pocket.bag.slots.length;
		const locationsPacked = V.pocket.bag.slots.map((slot: any) => slot.location);

		/* Even another backpack is a swap when it is a different wardrobe copy/appearance. */
		const otherBackpack = JSON.parse(JSON.stringify(backpack));
		otherBackpack.colour = backpack.colour === "blue" ? "purple" : "blue";
		V.worn.handheld = otherBackpack;
		w.pocketSyncBag();
		const slotsAfterSameKindSwap = V.pocket.bag.slots.length;
		const locationsAfterSameKindSwap = V.pocket.bag.slots.map((slot: any) => slot.location);

		/* Take the bag off; only its slots empty and the personal pocket stays packed. */
		V.worn.handheld = JSON.parse(JSON.stringify((w.setup || w.SugarCube.setup).clothes.handheld[0]));
		w.pocketSyncBag();
		const slotsAfterRemoval = V.pocket.bag.slots.length;
		const locationsAfterRemoval = V.pocket.bag.slots.map((slot: any) => slot.location);

		return {
			noBagCapacity,
			noBagCarryCapacity,
			packedWithoutBag,
			personalLocation,
			secondSlotWithoutBag,
			noBagName,
			pillCellWithoutBag,
			toyPackingWithoutBag,
			withBagCapacity,
			withBagCarryCapacity,
			packed,
			slotsPacked,
			locationsPacked,
			slotsAfterSameKindSwap,
			locationsAfterSameKindSwap,
			slotsAfterRemoval,
			locationsAfterRemoval,
		};
	});

	expect(result.noBagCapacity).toBe(0);
	expect(result.noBagCarryCapacity).toBe(1);
	expect(result.packedWithoutBag).toBe(true);
	expect(result.personalLocation).toBe("pocket");
	expect(result.secondSlotWithoutBag).toBe(false);
	expect(result.noBagName).toBe("pocket");
	expect(result.pillCellWithoutBag).toContain("Put in bag");
	expect(result.toyPackingWithoutBag).toBe(true);
	expect(result.withBagCapacity).toBe(8);
	expect(result.withBagCarryCapacity).toBe(9);
	expect(result.packed).toBe(true);
	expect(result.slotsPacked).toBe(2);
	expect(result.locationsPacked).toEqual(["pocket", "bag"]);
	expect(result.slotsAfterSameKindSwap).toBe(1);
	expect(result.locationsAfterSameKindSwap).toEqual(["pocket"]);
	expect(result.slotsAfterRemoval).toBe(1);
	expect(result.locationsAfterRemoval).toEqual(["pocket"]);
});

test("the POCKET overlay opens and renders both tabs", async ({ page }) => {
	await newGame(page);

	await page.evaluate(() => {
		const w = window as any;
		w.SugarCube.State.variables.pocket = undefined;
		w.pocketEnsure();
		w.SugarCube.State.variables.pocket.mirror = true;
		w.SugarCube.Wikifier.wikifyEval('<<overlayReplace "pocket">>');
	});

	const slow = { timeout: 20000 };
	await expect(page.locator("#customOverlay")).toBeVisible(slow);
	const tabs = page.locator("#overlayTabs button:not(.tab-close)");
	await expect(tabs).toHaveCount(2);
	await expect(tabs.nth(0)).toContainText("Bag");
	await expect(tabs.nth(1)).toContainText("Hand Mirror");
	expect(await tabs.nth(0).getAttribute("data-dolx-tab-icon")).toBeTruthy();
	expect(await tabs.nth(1).getAttribute("data-dolx-tab-icon")).toBeTruthy();

	const errors = await page.evaluate(() => document.querySelectorAll("#customOverlayContent .error").length);
	expect(errors).toBe(0);

	/* Bag is the first and default tab. */
	await expect(page.locator("#customOverlayContent")).toContainText("Pocket", slow);
	await expect(page.locator(".dolx-pocket-section-header").first()).toContainText("Pocket");

	/* The mirror tab is still the real mirror, with all of its normal menus. */
	await page.locator("#overlayTabs button", { hasText: "Hand Mirror" }).click();
	await expect(page.locator("#customOverlayContent")).toContainText("DecoMod", slow);
	await expect(page.locator("#customOverlayContent #mirror")).toBeVisible(slow);
	expect(await page.evaluate(() => document.querySelectorAll("#customOverlayContent .error").length)).toBe(0);
});

test("the mixed POCKET inventory fits an older phone-sized viewport", async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 640 });
	await newGame(page);

	await page.evaluate(() => {
		const w = window as any;
		const SC = w.SugarCube;
		const V = SC.State.variables;
		const setup = w.setup || SC.setup;
		w.pocketEnsure();
		V.options.images = 1;
		V.worn.handheld = JSON.parse(JSON.stringify(setup.clothes.handheld[7]));
		V.foodstuff.beef_wellington.amount = 2;
		V.foodBatches.beef_wellington = [{ n: 2, day: w.Time.days, own: true }];
		V.sexStats.pills.pills.painkillers.owned = 2;
		const dildoIdx = setup.sextoys.findIndex((toy: any) => toy.name === "dildo");
		V.player.inventory.sextoys.dildo = [{ index: dildoIdx, name: "dildo", carried: false, worn: false, colour: "pink", type: ["dildo"] }];
		w.pocketSyncBag();
		w.pocketSlotToggle("food", "beef_wellington");
		w.pocketSlotToggle("pill", "painkillers");
		w.pocketToyPack("dildo", 0, true);
		SC.Wikifier.wikifyEval('<<overlayReplace "pocket">>');
	});

	const rows = page.locator("#customOverlayContent .dolx-pocket-item-row");
	await expect(rows).toHaveCount(3, { timeout: 20000 });
	const fit = await page.evaluate(() => {
		const content = document.querySelector("#customOverlayContent") as HTMLElement;
		const boundary = content.getBoundingClientRect();
		const children = Array.from(content.querySelectorAll(".dolx-pocket-item-row, .dolx-pocket-item-actions")) as HTMLElement[];
		return {
			overflow: content.scrollWidth - content.clientWidth,
			inside: children.every(child => {
				const rect = child.getBoundingClientRect();
				return rect.left >= boundary.left - 1 && rect.right <= boundary.right + 1;
			}),
		};
	});
	expect(fit.overflow).toBeLessThanOrEqual(1);
	expect(fit.inside).toBe(true);
});

test("packing happens where the things are kept", async ({ page }) => {
	await newGame(page);

	const result = await page.evaluate(() => {
		const w = window as any;
		const SC = w.SugarCube;
		const V = SC.State.variables;
		w.pocketEnsure();

		const setup = w.setup || SC.setup;
		V.worn.handheld = JSON.parse(JSON.stringify(setup.clothes.handheld[8]));
		w.pocketSyncBag();

		const bagName = w.pocketBagName();

		/* The kitchen's packing panel. */
		V.foodstuff.rich_biscuit.amount = 3;
		V.foodBatches.rich_biscuit = [{ n: 3, day: w.Time.days, own: true }];
		const host = document.createElement("div");
		host.appendChild(SC.Wikifier.wikifyEval("<<pocketPackFood>>"));
		const kitchenPanel = host.innerHTML;

		/* The medicine drawer's per-med row. */
		const painkillers = setup.pills.find((pill: any) => pill.name === "painkillers");
		V.sexStats.pills.pills.painkillers.owned = 4;
		const pillCell = w.pillBagActionCell(painkillers);
		const pillLabelBefore = w.pillBagActionLabel(painkillers);
		w.pocketSlotToggle("pill", "painkillers");
		const pillLabelAfter = w.pillBagActionLabel(painkillers);
		const bagHost = document.createElement("div");
		bagHost.appendChild(SC.Wikifier.wikifyEval("<<pocketBagContents>>"));
		const bagContents = bagHost.innerHTML;

		/* The toy cupboard's per-copy row. */
		V.player.inventory.sextoys["small dildo"] = [{ index: 0, name: "small dildo", carried: false, worn: false }];
		const toyLabelBefore = w.toyBagButtonText(0, "small dildo");
		w.pocketToyPack("small dildo", 0, true);
		const toyLabelAfter = w.toyBagButtonText(0, "small dildo");
		const toyCarried = V.player.inventory.sextoys["small dildo"][0].carried;

		return {
			bagName,
			kitchenPanel,
			pillCell,
			pillLabelBefore,
			pillLabelAfter,
			bagContents,
			painkillerIcon: painkillers.icon,
			toyLabelBefore,
			toyLabelAfter,
			toyCarried,
			slots: V.pocket.bag.slots.length,
		};
	});

	expect(result.bagName).toBe("backpack");
	expect(result.kitchenPanel).toContain("Pack food to your pocket or backpack");
	expect(result.kitchenPanel).toContain("Rich biscuit");
	expect(result.kitchenPanel).not.toContain('class="error');
	expect(result.pillCell).toContain("hpi_pocket_bag");
	expect(result.pillLabelBefore).toBe("Put in bag");
	expect(result.pillLabelAfter).toBe("Remove from bag");
	expect(result.bagContents).toContain("dolx-pocket-pill-icon");
	expect(result.bagContents).toContain(result.painkillerIcon);
	expect(result.toyLabelBefore).toBe("Put in bag");
	expect(result.toyLabelAfter).toBe("Take out of bag");
	expect(result.toyCarried).toBe(true);
	expect(result.slots).toBe(2);
});

test("the pocket locks during combat and stat-frozen scenes", async ({ page }) => {
	await newGame(page);

	const result = await page.evaluate(() => {
		const w = window as any;
		const V = w.SugarCube.State.variables;
		w.pocketEnsure();

		const open = w.pocketLockReason();
		V.combat = 1;
		const inCombat = w.pocketLockReason();
		V.combat = 0;
		V.statFreeze = true;
		const frozen = w.pocketLockReason();
		V.statFreeze = false;
		V.hc = { daysPassed: 1 };
		const hopeless = w.pocketLockReason();
		delete V.hc;
		V.dancing = 1;
		const dancing = w.pocketLockReason();
		V.dancing = 0;
		V.captured = 1;
		const captured = w.pocketLockReason();
		V.captured = 0;
		V.trance = 1;
		const trance = w.pocketLockReason();
		V.trance = 0;
		V.replayScene = "test";
		const replay = w.pocketLockReason();
		delete V.replayScene;
		V.frozenValues = {};
		const flashback = w.pocketLockReason();
		delete V.frozenValues;
		const oldBadEnds = V.badEndStats;
		V.badEndStats = [{ trackedStart: 1 }];
		const badEnd = w.pocketLockReason();
		V.badEndStats = oldBadEnds;

		return { open, inCombat, frozen, hopeless, dancing, captured, trance, replay, flashback, badEnd };
	});

	expect(result.open).toBe("");
	expect(result.inCombat).not.toBe("");
	expect(result.frozen).not.toBe("");
	expect(result.hopeless).not.toBe("");
	expect(result.dancing).not.toBe("");
	expect(result.captured).not.toBe("");
	expect(result.trance).not.toBe("");
	expect(result.replay).not.toBe("");
	expect(result.flashback).not.toBe("");
	expect(result.badEnd).not.toBe("");
});

test("the cosmetics store sells the hand mirror for its displayed price", async ({ page }) => {
	await newGame(page);
	await navigateTo(page, "Cosmetics Store");
	await waitForPassage(page);

	const before = await page.evaluate(() => {
		const w = window as any;
		const V = w.SugarCube.State.variables;
		V.money = 100000;
		return { money: V.money, price: w.setup.inflation.spendPrice(1500, "cosmetics") };
	});
	/* Re-render after giving the test enough money. */
	await navigateTo(page, "Cosmetics Store");
	await waitForPassage(page);
	await page.locator("#passages a", { hasText: "Buy a hand mirror" }).click();
	await waitForPassage(page);

	const after = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		return { mirror: V.pocket.mirror, money: V.money, passage: V.passage };
	});
	expect(after.mirror).toBe(true);
	expect(after.money).toBe(before.money - before.price);
	expect(after.passage).toBe("Cosmetics Hand Mirror");
});

test("mirror tab drives its own submenus inside the overlay", async ({ page }) => {
	await newGame(page);

	await page.evaluate(() => {
		const w = window as any;
		w.pocketEnsure();
		w.SugarCube.State.variables.pocket.mirror = true;
		w.SugarCube.Wikifier.wikifyEval('<<overlayReplace "pocket">>');
	});

	await page.locator("#overlayTabs button", { hasText: "Hand Mirror" }).click();
	await expect(page.locator("#customOverlayContent #mirror")).toContainText("DecoMod");

	await page.locator("#mirror a", { hasText: "Beautify your inner self" }).click();
	await expect(page.locator("#mirror")).toContainText(/Foreground|Background/);
	expect(await page.evaluate(() => document.querySelectorAll("#customOverlayContent .error").length)).toBe(0);

	await page.locator("#mirror a", { hasText: "Back" }).first().click();
	await expect(page.locator("#mirror")).toContainText("DecoMod");

	await page.locator("#mirror a", { hasText: "Change your hair style" }).first().click();
	await expect(page.locator("#mirror")).toContainText(/Hair|hair/);
	expect(await page.evaluate(() => document.querySelectorAll("#customOverlayContent .error").length)).toBe(0);
});

test("every dish reads as a real meal, and eating shows it in the game's notation", async ({ page }) => {
	await newGame(page);

	const result = await page.evaluate(() => {
		const w = window as any;
		const SC = w.SugarCube;
		const V = SC.State.variables;
		const setup = w.setup || SC.setup;
		w.pocketEnsure();
		V.foodSpoilage = 1;

		/* No dish may be blank, and the two tags most dishes share must not cancel out. */
		const blank: string[] = [];
		const blankFlavour: string[] = [];
		const withCost: string[] = [];
		Object.keys(setup.foodstuff).forEach(key => {
			if (!w.foodIsDish(key)) return;
			const effects = w.foodEffects(key);
			const values = Object.values(effects) as number[];
			if (!values.length) blank.push(key);
			if (!w.foodEffectText(key)) blankFlavour.push(key);
			if (values.some(v => v > 0)) withCost.push(key);
		});

		V.foodstuff.beef_wellington.amount = 1;
		V.foodBatches.beef_wellington = [{ n: 1, day: w.Time.days, own: true }];
		const eaten = w.pocketEatFood("beef_wellington");
		T.eatReport = eaten;
		const host = document.createElement("div");
		host.appendChild(SC.Wikifier.wikifyEval("<<pocketEatReport _eatReport>>"));

		const inedibleCookables = Object.keys(setup.foodstuff)
			.filter(key => setup.foodstuff[key].recipe && setup.foodstuff[key].category !== "dish")
			.map(key => {
				w.foodBatchAdd(key, 1, true);
				return {
					key,
					dish: w.foodIsDish(key),
					life: w.foodShelfLife(key),
					effects: w.foodEffects(key),
					batchRecorded: Object.hasOwn(V.foodBatches, key),
				};
			});

		return {
			blank,
			blankFlavour,
			withCostCount: withCost.length,
			sweetVeg: w.foodEffects("rich_biscuit"),
			untagged: w.foodEffects("beef_wellington"),
			light: w.foodEffects("salad"),
			macaroni: { flavour: w.foodFlavour("macaroni_cheese"), text: w.foodEffectText("macaroni_cheese") },
			richBiscuitText: w.foodEffectText("rich_biscuit"),
			roastText: w.foodEffectText("roast_dinner"),
			salmonFlavour: w.foodFlavour("salmon_wellington"),
			inedibleCookables,
			report: host.innerHTML,
		};
	});

	expect(result.blank).toEqual([]);
	expect(result.blankFlavour).toEqual([]);
	/* The untagged mains, sweets, spices, seafood and drink all carry a cost. */
	expect(result.withCostCount).toBeGreaterThan(50);
	/* "vegetarian" + "sweet" used to sum to nothing at all. */
	expect(result.sweetVeg.stress).toBeLessThan(0);
	expect(result.sweetVeg.tiredness).toBeGreaterThan(0);
	expect(result.untagged.pain).toBeLessThan(0);
	expect(result.untagged.tiredness).toBeGreaterThan(0);
	expect(result.untagged).toEqual({ stress: -6, pain: -6, tiredness: 6 });
	expect(result.light.tiredness).toBeLessThan(0);
	expect(result.macaroni.flavour).toBe("light");
	expect(result.macaroni.text).toContain("light meal");
	expect(result.richBiscuitText).toContain("small snack");
	expect(result.roastText).toContain("very big meal");
	expect(result.salmonFlavour).toBe("hearty");
	expect(result.inedibleCookables.map(item => item.key).sort()).toEqual(["butter", "cheese", "flour", "honey", "jam", "pastry"]);
	expect(result.inedibleCookables.every(item => !item.dish && item.life === Infinity && !Object.keys(item.effects).length && !item.batchRecorded)).toBe(true);

	/* The report uses the game's compact one-to-three-sign notation. */
	expect(result.report).toContain("Stress");
	expect(result.report).toContain("Fatigue");
	expect(result.report).toContain("Pain");
	expect(result.report).toContain("filling meal");
	expect(result.report).toContain("- - Stress");
	expect(result.report).toContain("- - Pain");
	expect(result.report).toContain("+ + Fatigue");
	expect(result.report).toContain("| ");
	expect(result.report).not.toContain("small-description");
	expect(result.report).not.toContain("refreshing");
});

test("eating from POCKET opens a meal passage and returns to the original passage", async ({ page }) => {
	await newGame(page);

	const started = await page.evaluate(() => {
		const w = window as any;
		const SC = w.SugarCube;
		const V = SC.State.variables;
		w.pocketEnsure();
		V.foodSpoilage = 1;
		V.foodstuff.beef_wellington.amount = 1;
		V.foodBatches.beef_wellington = [{ n: 1, day: w.Time.days, own: true }];
		w.pocketSlotToggle("food", "beef_wellington");
		const origin = V.passage;
		SC.Wikifier.wikifyEval('<<overlayReplace "pocket">>');
		return { origin };
	});

	expect(started.origin).toBe("Bedroom");
	await page.locator("#customOverlayContent a", { hasText: "Eat" }).click();
	await page.waitForFunction(() => (window as any).SugarCube.State.passage === "Pocket Eat Food");
	expect(await page.evaluate(() => (window as any).SugarCube.State.variables.pocketFoodReturn)).toBe("Bedroom");
	await expect(page.locator("#passages")).toContainText("You eat a serving of beef wellington");
	await expect(page.locator("#passages")).toContainText("filling meal");
	await expect(page.locator("#passages")).toContainText("Stress");
	await expect(page.locator("#passages")).toContainText("Pain");
	await expect(page.locator("#passages")).toContainText("Fatigue");
	expect(await page.locator("#passages .error").count()).toBe(0);
	await expect(page.locator("#passages")).not.toContainText("has no usable links");

	await page.locator("#passages a", { hasText: "Continue" }).click();
	await page.waitForFunction(() => (window as any).SugarCube.State.passage === "Bedroom");
	const returned = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		return { passage: V.passage, result: V.pocketFoodResult, destination: V.pocketFoodReturn };
	});
	expect(returned.passage).toBe("Bedroom");
	expect(returned.result).toBeUndefined();
	expect(returned.destination).toBeUndefined();
});

test("going back one step from a meal restores food and stats like a normal passage", async ({ page }) => {
	await newGame(page);

	const before = await page.evaluate(() => {
		const w = window as any;
		const SC = w.SugarCube;
		const V = SC.State.variables;
		w.pocketEnsure();
		V.foodSpoilage = 1;
		V.foodstuff.beef_wellington.amount = 1;
		V.foodBatches.beef_wellington = [{ n: 1, day: w.Time.days, own: true }];
		V.stress = 1000;
		V.pain = 1000;
		V.tiredness = 1000;
		w.pocketSlotToggle("food", "beef_wellington");
		const state = {
			passage: V.passage,
			stress: V.stress,
			pain: V.pain,
			tiredness: V.tiredness,
			amount: V.foodstuff.beef_wellington.amount,
			batch: V.foodBatches.beef_wellington[0].n,
			satiety: V.foodSatiety,
			fullness: V.pocket.foodFullness,
			bloated: V.pocket.bloated,
			homeCooked: V.homeCookedEaten,
			slots: V.pocket.bag.slots.length,
		};
		SC.Wikifier.wikifyEval('<<overlayReplace "pocket">>');
		return state;
	});

	await page.locator("#customOverlayContent a", { hasText: "Eat" }).click();
	await page.waitForFunction(() => (window as any).SugarCube.State.passage === "Pocket Eat Food");
	const eaten = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		return {
			stress: V.stress,
			pain: V.pain,
			tiredness: V.tiredness,
			amount: V.foodstuff.beef_wellington.amount,
			satiety: V.foodSatiety,
			fullness: V.pocket.foodFullness,
			bloated: V.pocket.bloated,
			homeCooked: V.homeCookedEaten,
			slots: V.pocket.bag.slots.length,
		};
	});
	expect(eaten.stress).toBeLessThan(before.stress);
	expect(eaten.pain).toBeLessThan(before.pain);
	expect(eaten.tiredness).toBeGreaterThan(before.tiredness);
	expect(eaten.amount).toBe(0);
	expect(eaten.satiety).toBeGreaterThan(before.satiety);
	expect(eaten.homeCooked).toBe(before.homeCooked + 1);
	expect(eaten.slots).toBe(0);

	await page.evaluate(() => (window as any).SugarCube.Engine.backward());
	await page.waitForFunction(passage => (window as any).SugarCube.State.passage === passage, before.passage);
	const restored = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		return {
			passage: V.passage,
			stress: V.stress,
			pain: V.pain,
			tiredness: V.tiredness,
			amount: V.foodstuff.beef_wellington.amount,
			batch: V.foodBatches.beef_wellington[0].n,
			satiety: V.foodSatiety,
			fullness: V.pocket.foodFullness,
			bloated: V.pocket.bloated,
			homeCooked: V.homeCookedEaten,
			slots: V.pocket.bag.slots.length,
			result: V.pocketFoodResult,
			destination: V.pocketFoodReturn,
		};
	});
	expect(restored).toEqual({ ...before, result: undefined, destination: undefined });
});

test("Well Fed softens pain as well as stress, trauma and fatigue", async ({ page }) => {
	await newGame(page);

	const result = await page.evaluate(() => {
		const w = window as any;
		const V = w.SugarCube.State.variables;
		w.pocketEnsure();

		/* trauma() scales by control, and traumaClamp diverts every point into innocencetrauma
		   while the PC is still innocent, so both have to be pinned before measuring. */
		V.control = 0;
		V.controlmax = 1000;
		V.innocencestate = 0;

		const measure = () => {
			V.pain = 0;
			V.stress = 0;
			V.trauma = 0;
			V.tiredness = 0;
			w.statChange.pain(10, 1);
			w.statChange.stress(10);
			w.statChange.trauma(10);
			w.statChange.tiredness(10);
			return { pain: V.pain, stress: V.stress, trauma: V.trauma, tiredness: V.tiredness };
		};

		V.foodSatiety = 0;
		const hungry = measure();
		V.foodSatiety = 60;
		const fed = measure();
		return { hungry, fed, active: w.wellFedActive() };
	});

	expect(result.active).toBe(true);
	expect(result.fed.pain).toBeLessThan(result.hungry.pain);
	expect(result.fed.stress).toBeLessThan(result.hungry.stress);
	expect(result.fed.trauma).toBeLessThan(result.hungry.trauma);
	expect(result.fed.tiredness).toBeLessThan(result.hungry.tiredness);
});

test("meal size sets a two-to-five-hour Well Fed duration and Own Two Hands unlocks on serving 100", async ({ page }) => {
	await newGame(page);

	const result = await page.evaluate(() => {
		const w = window as any;
		const V = w.SugarCube.State.variables;
		w.pocketEnsure();
		V.foodSpoilage = 1;
		V.homeCookedEaten = 98;
		V.foodstuff.rich_biscuit.amount = 1;
		V.foodBatches.rich_biscuit = [{ n: 1, day: w.Time.days, own: true }];
		w.pocketEatFood("rich_biscuit");
		const snackStart = { satiety: V.foodSatiety, active: w.wellFedActive() };
		w.pocketHourPassed();
		const snackAfterOneHour = { satiety: V.foodSatiety, active: w.wellFedActive() };
		w.pocketHourPassed();
		const snackAfterTwoHours = { satiety: V.foodSatiety, active: w.wellFedActive() };

		V.foodstuff.roast_dinner.amount = 1;
		V.foodBatches.roast_dinner = [{ n: 1, day: w.Time.days, own: true }];
		w.pocketEatFood("roast_dinner");
		const fillingStart = { satiety: V.foodSatiety, active: w.wellFedActive() };
		for (let i = 0; i < 4; i++) w.pocketHourPassed();
		const fillingAfterFourHours = { satiety: V.foodSatiety, active: w.wellFedActive() };
		w.pocketHourPassed();
		const fillingAfterFiveHours = { satiety: V.foodSatiety, active: w.wellFedActive() };
		return {
			snackStart,
			snackAfterOneHour,
			snackAfterTwoHours,
			fillingStart,
			fillingAfterFourHours,
			fillingAfterFiveHours,
			count: V.homeCookedEaten,
			feat: !!V.feats.currentSave["Own Two Hands"],
		};
	});

	expect(result.snackStart).toEqual({ satiety: 54, active: true });
	expect(result.snackAfterOneHour).toEqual({ satiety: 52, active: true });
	expect(result.snackAfterTwoHours).toEqual({ satiety: 50, active: false });
	expect(result.fillingStart).toEqual({ satiety: 60, active: true });
	expect(result.fillingAfterFourHours).toEqual({ satiety: 52, active: true });
	expect(result.fillingAfterFiveHours).toEqual({ satiety: 50, active: false });
	expect(result.count).toBe(100);
	expect(result.feat).toBe(true);
});

test("overeating crosses a six-point fullness budget and Bloated refreshes for ten hours", async ({ page }) => {
	await newGame(page);

	const result = await page.evaluate(() => {
		const w = window as any;
		const SC = w.SugarCube;
		const V = SC.State.variables;
		w.pocketEnsure();
		V.foodSpoilage = 1;
		V.foodSatiety = 0;
		V.foodstuff.rich_biscuit.amount = 4;
		V.foodBatches.rich_biscuit = [{ n: 4, day: w.Time.days, own: true }];
		const effectText = () => SC.Wikifier.wikifyEval("<<effects>>").textContent;

		const first = w.pocketEatFood("rich_biscuit");
		const gained = { fullness: V.pocket.foodFullness, active: w.wellFedActive(), notice: effectText() };
		const repeatedGainNotice = effectText();
		const second = w.pocketEatFood("rich_biscuit");
		const third = w.pocketEatFood("rich_biscuit");
		const warning = {
			fullness: V.pocket.foodFullness,
			bloated: w.bloatedActive(),
			wouldBloat: w.foodWouldBloat("rich_biscuit"),
		};
		const fourth = w.pocketEatFood("rich_biscuit");
		const bloated = {
			hours: V.pocket.bloated,
			active: w.bloatedActive(),
			penalty: w.bloatedSkillPenalty(),
			notice: effectText(),
		};

		w.pocketHourPassed();
		const afterOneHour = V.pocket.bloated;
		V.foodstuff.roast_dinner.amount = 1;
		V.foodBatches.roast_dinner = [{ n: 1, day: w.Time.days, own: true }];
		const refreshedMeal = w.pocketEatFood("roast_dinner");
		const refreshed = V.pocket.bloated;
		for (let i = 0; i < 10; i++) w.pocketHourPassed();
		const lost = { satiety: V.foodSatiety, active: w.wellFedActive(), notice: effectText() };
		const repeatedLossNotice = effectText();

		return {
			points: { snack: w.foodFullnessPoints("rich_biscuit"), meal: w.foodFullnessPoints("roast_dinner") },
			first,
			second,
			third,
			fourth,
			gained,
			repeatedGainNotice,
			warning,
			bloated,
			afterOneHour,
			refreshedMeal,
			refreshed,
			lost,
			repeatedLossNotice,
			fullnessAfter: V.pocket.foodFullness,
		};
	});

	expect(result.points).toEqual({ snack: 2, meal: 3 });
	expect(result.first.fullness).toBe(2);
	expect(result.second.fullness).toBe(4);
	expect(result.third.fullness).toBe(6);
	expect(result.fourth.fullness).toBe(8);
	expect(result.fourth.becameBloated).toBe(true);
	expect(result.gained.active).toBe(true);
	expect(result.gained.notice).toContain("You feel comfortably full and well fed.");
	expect(result.repeatedGainNotice).not.toContain("comfortably full");
	expect(result.warning).toEqual({ fullness: 6, bloated: false, wouldBloat: true });
	expect(result.bloated).toMatchObject({ hours: 10, active: true, penalty: 5 });
	expect(result.bloated.notice).toContain("Your stomach feels painfully bloated.");
	expect(result.afterOneHour).toBe(9);
	expect(result.refreshedMeal.bloatedRefreshed).toBe(true);
	expect(result.refreshed).toBe(10);
	expect(result.lost).toMatchObject({ satiety: 40, active: false });
	expect(result.lost.notice).toContain("Your stomach feels empty again. You are no longer well fed.");
	expect(result.lost.notice).toContain("The bloated feeling finally passes.");
	expect(result.repeatedLossNotice).not.toContain("stomach feels empty");
	expect(result.fullnessAfter).toBe(0);
});

test("cafe food shares Well Fed, fullness warnings and Bloated without counting as home cooking", async ({ page }) => {
	await newGame(page);

	const result = await page.evaluate(() => {
		const w = window as any;
		const SC = w.SugarCube;
		const V = SC.State.variables;
		w.pocketEnsure();
		V.foodSatiety = 0;
		V.pocket.foodFullness = 0;
		V.pocket.bloated = 0;
		V.homeCookedEaten = 0;

		const salad = w.foodApplyFullness(2, 3);
		const pancakes = w.foodApplyFullness(3, 4);
		const bunWarning = w.foodWouldBloat(2);
		const bun = w.foodApplyFullness(2, 3);
		w.pocketHourPassed();
		const mealWhileBloated = w.foodApplyFullness(3, 4);

		const cafe = SC.Story.get("Ocean Breeze").text;
		return {
			salad,
			pancakes,
			bunWarning,
			bun,
			mealWhileBloated,
			satiety: V.foodSatiety,
			bloatedHours: V.pocket.bloated,
			homeCooked: V.homeCookedEaten,
			mainCalls: (cafe.match(/foodApplyFullness\(/g) || []).length,
		};
	});

	expect(result.salad).toMatchObject({ fullness: 2, becameBloated: false });
	expect(result.pancakes).toMatchObject({ fullness: 5, becameBloated: false });
	expect(result.bunWarning).toBe(true);
	expect(result.bun).toMatchObject({ fullness: 7, becameBloated: true });
	expect(result.mealWhileBloated).toMatchObject({ fullness: 7, bloatedRefreshed: true });
	expect(result.satiety).toBe(58);
	expect(result.bloatedHours).toBe(10);
	expect(result.homeCooked).toBe(0);
	expect(result.mainCalls).toBe(6);

	const earSlimeResult = await page.evaluate(() => {
		const w = window as any;
		const V = w.SugarCube.State.variables;
		V.foodSatiety = 0;
		V.pocket.foodFullness = 0;
		V.pocket.bloated = 0;
		V.homeCookedEaten = 0;
		V.daily.earSlimeOceanBreezeCafeEat = "fruit salad";
		const host = document.createElement("div");
		host.id = "earSlimeCafeFullnessTest";
		host.appendChild(w.SugarCube.Wikifier.wikifyEval('<<earSlimeCafeLinks "Obey">>'));
		(host.querySelector("a") as HTMLElement).click();
		return { fullness: V.pocket.foodFullness, wellFed: w.wellFedActive(), homeCooked: V.homeCookedEaten };
	});
	expect(earSlimeResult).toEqual({ fullness: 2, wellFed: true, homeCooked: 0 });
});

test("POCKET warns before the selected food would make the player bloated", async ({ page }) => {
	await newGame(page);

	await page.evaluate(() => {
		const w = window as any;
		const V = w.SugarCube.State.variables;
		w.pocketEnsure();
		V.foodSpoilage = 1;
		V.foodSatiety = 54;
		V.pocket.foodFullness = 4;
		V.foodstuff.roast_dinner.amount = 1;
		V.foodBatches.roast_dinner = [{ n: 1, day: w.Time.days, own: true }];
		w.pocketSlotToggle("food", "roast_dinner");
		w.SugarCube.Wikifier.wikifyEval('<<overlayReplace "pocket">>');
	});

	await expect(page.locator("#customOverlayContent")).toContainText("Will make you bloated");
	await expect(page.locator("#customOverlayContent")).not.toContainText("You're feeling quite full.");

	await page.evaluate(() => {
		const w = window as any;
		w.SugarCube.State.variables.pocket.foodFullness = 5;
		w.SugarCube.Wikifier.wikifyEval('<<replace "#pocketPane">><<pocketBagContents>><</replace>>');
	});
	await expect(page.locator("#customOverlayContent")).toContainText("You're feeling quite full.");
});

test("Bloated adds five points to both Temple Burden skill-failure paths", async ({ page }) => {
	await newGame(page);

	const result = await page.evaluate(() => {
		const w = window as any;
		const SC = w.SugarCube;
		const V = SC.State.variables;
		w.pocketEnsure();
		V.pocket.bloated = 10;
		V.temple_burden = 95;

		SC.Wikifier.wikifyEval('<<skill_difficulty 1000 "Physique" 1 1000 "combat">>');
		V.skulduggerydifficulty = 0;
		SC.Wikifier.wikifyEval('<<skulduggerycheck "silent">>');
		const traitText = SC.Wikifier.wikifyEval("<<traits>>").textContent;

		return {
			penalty: w.bloatedSkillPenalty(),
			physique: V.physiqueSuccess,
			skulduggery: V.skulduggerysuccess,
			traitText,
		};
	});

	expect(result.penalty).toBe(5);
	expect(result.physique).toBe(0);
	expect(result.skulduggery).toBe(0);
	expect(result.traitText).toContain("Bloated");
	expect(result.traitText).toContain("extra 5% chance to fail");
});

test("a mirror submenu can always get back to the mirror", async ({ page }) => {
	await newGame(page);

	await page.evaluate(() => {
		const w = window as any;
		w.pocketEnsure();
		w.SugarCube.State.variables.pocket.mirror = true;
		w.SugarCube.Wikifier.wikifyEval('<<overlayReplace "pocket">>');
	});

	await page.locator("#overlayTabs button", { hasText: "Hand Mirror" }).click();
	await page.locator("#mirror a", { hasText: "Beautify your inner self" }).click();
	await expect(page.locator("#mirror .dolx-mirror-back a", { hasText: "Back" })).toBeVisible();
	await page.locator("#mirror .dolx-mirror-back a", { hasText: "Back" }).click();
	await expect(page.locator("#mirror")).toContainText("DecoMod");
});

test("packing survives a save and reload", async ({ page }) => {
	await newGame(page);

	/* Everything here is done from the overlay, without navigating - the exact flow that used to
	   lose the whole bag, because SugarCube only folds variable changes into the save at a passage. */
	const saved = await page.evaluate(() => {
		const w = window as any;
		const SC = w.SugarCube;
		const V = SC.State.variables;
		const setup = w.setup || SC.setup;
		w.pocketEnsure();
		V.worn.handheld = JSON.parse(JSON.stringify(setup.clothes.handheld[7]));
		V.player.inventory.sextoys.dildo = [{ index: 0, name: "dildo", carried: false, worn: false, type: ["dildo"] }];
		V.foodstuff.rich_biscuit.amount = 3;
		V.foodBatches.rich_biscuit = [{ n: 3, day: w.Time.days, own: true }];
		w.pocketToyPack("dildo", 0, true);
		w.pocketSlotToggle("food", "rich_biscuit");
		return JSON.stringify(SC.Save.serialize());
	});

	const after = await page.evaluate(blob => {
		const w = window as any;
		const SC = w.SugarCube;
		SC.Save.deserialize(JSON.parse(blob));
		const V = SC.State.variables;
		return {
			source: V.pocket?.bag?.source,
			slots: V.pocket?.bag?.slots,
			handheld: V.worn?.handheld?.name,
		};
	}, saved);

	expect(after.handheld).toBe("messenger bag");
	expect(after.source).toBeTruthy();
	expect(after.slots).toHaveLength(2);
});

test("taking a bagged pill uses its real passage and returns to where it was taken", async ({ page }) => {
	await newGame(page);

	const before = await page.evaluate(() => {
		const w = window as any;
		const SC = w.SugarCube;
		const V = SC.State.variables;
		const setup = w.setup || SC.setup;
		w.pocketEnsure();
		V.worn.handheld = JSON.parse(JSON.stringify(setup.clothes.handheld[8]));
		V.sexStats.pills.pills.painkillers.owned = 1;
		V.sexStats.pills.pills.painkillers.doseTaken = 0;
		w.pocketSyncBag();
		w.pocketSlotToggle("pill", "painkillers");
		const origin = V.passage;
		w.pocketTakePill("painkillers");
		return { origin, passage: SC.State.passage, owned: V.sexStats.pills.pills.painkillers.owned };
	});

	expect(before.origin).toBe("Bedroom");
	expect(before.passage).toBe("Take Pill From Medicine Drawer");
	expect(before.owned).toBe(0);
	await expect(page.locator("#passages")).toContainText("You swallow");
	await page.locator("#passages a", { hasText: "Return" }).click();
	await waitForPassage(page);

	const after = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		return { passage: V.passage, returnState: V.pocketPillReturn, slots: V.pocket.bag.slots };
	});
	expect(after.passage).toBe("Bedroom");
	expect(after.returnState).toBeUndefined();
	expect(after.slots).toEqual([]);
});

test("a POCKET medicine return uses links and preserves passage history", async ({ page }) => {
	await newGame(page);

	await page.evaluate(() => {
		const w = window as any;
		const V = w.SugarCube.State.variables;
		V.pocketPillReturn = V.passage;
		w.SugarCube.Engine.play("PillCollection");
	});
	await page.waitForFunction(() => (window as any).SugarCube.State.passage === "PillCollection");
	await expect(page.locator("#passages a", { hasText: "Return" })).toBeVisible();
	expect(
		await page.evaluate(() =>
			["Take Pill From Medicine Drawer", "PillCollection", "Pocket Eat Food"].some(name => (window as any).SugarCube.Story.get(name).text.includes("<<goto"))
		)
	).toBe(false);

	await page.locator("#passages a", { hasText: "Return" }).click();
	await page.waitForFunction(() => (window as any).SugarCube.State.passage === "Bedroom");
	await page.evaluate(() => (window as any).SugarCube.Engine.backward());
	await page.waitForFunction(() => (window as any).SugarCube.State.passage === "PillCollection");
	await expect(page.locator("#passages")).toContainText("Return");
});

test("the bag works as a portable toy cupboard", async ({ page }) => {
	await newGame(page);

	await page.evaluate(() => {
		const w = window as any;
		const SC = w.SugarCube;
		const V = SC.State.variables;
		const setup = w.setup || SC.setup;
		w.pocketEnsure();
		V.options.images = 1;
		V.player.vaginaExist = true;
		V.worn.handheld = JSON.parse(JSON.stringify(setup.clothes.handheld[7]));
		const dildoIdx = setup.sextoys.findIndex((t: any) => t.name === "dildo");
		const plugIdx = setup.sextoys.findIndex((t: any) => t.name === "butt plug");
		V.player.inventory.sextoys.dildo = [
			{ index: dildoIdx, name: "dildo", carried: false, worn: false, colour: "pink", type: ["dildo"] },
			{ index: dildoIdx, name: "dildo", carried: false, worn: false, colour: "pink", type: ["dildo"] },
		];
		V.player.inventory.sextoys["butt plug"] = [{ index: plugIdx, name: "butt plug", carried: false, worn: false, colour: "pink", type: ["anal"] }];
		/* Two dildos owned, but only one goes in the bag - the other stays in the cupboard. */
		w.pocketToyPack("dildo", 0, true);
		w.pocketToyPack("butt plug", 0, true);
		SC.Wikifier.wikifyEval('<<overlayReplace "pocket">>');
	});

	await page.locator("#overlayTabs button", { hasText: "Bag" }).click();

	/* One row per PACKED copy - the second dildo is still in the cupboard and must not appear here. */
	await expect(page.locator(".dolx-pocket-toy-row")).toHaveCount(2, { timeout: 20000 });
	const icons = await page.evaluate(() =>
		Array.from(document.querySelectorAll(".dolx-pocket-toy-row img")).map(i => (i as HTMLImageElement).getAttribute("src"))
	);
	expect(icons).toEqual(["img/misc/icon/sex-toys/dildo.png", "img/misc/icon/sex-toys/buttplug.png"]);
	await expect(page.locator(".dolx-pocket-toy-row").first()).toContainText("Insert it");
	await expect(page.locator(".dolx-pocket-toy-row").last()).toContainText("Wear it");

	/* Inserting from the bag has to actually fill the worn slot, not just relabel a button. */
	await page.locator(".dolx-pocket-toy-row a").first().click();
	await expect(page.locator(".dolx-pocket-toy-row").first()).toContainText("Remove it");
	const worn = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		return { slot: V.worn.vaginal_dildo?.name, flags: V.player.inventory.sextoys.dildo.map((t: any) => t.worn) };
	});
	expect(worn.slot).toBe("dildo");
	expect(worn.flags).toEqual([true, false]);
});

test("a toy is either in your hands or in your bag, never both", async ({ page }) => {
	await newGame(page);

	const result = await page.evaluate(() => {
		const w = window as any;
		const SC = w.SugarCube;
		const V = SC.State.variables;
		const setup = w.setup || SC.setup;
		w.pocketEnsure();
		V.worn.handheld = JSON.parse(JSON.stringify(setup.clothes.handheld[7]));
		const d = setup.sextoys.findIndex((t: any) => t.name === "dildo");
		V.player.inventory.sextoys.dildo = [
			{ index: d, name: "dildo", carried: false, worn: false, type: ["dildo"] },
			{ index: d, name: "dildo", carried: false, worn: false, type: ["dildo"] },
		];
		w.pocketSyncBag();

		w.pocketToyPack("dildo", 0, true);
		const packed = {
			flags: V.player.inventory.sextoys.dildo.map((t: any) => ({ packed: !!t.packed, carried: !!t.carried })),
			/* A bagged toy is carried, but the bag holds it - it must not eat the hand-carry limit. */
			handCarried: w.countCarriedSextoys(),
			bagRows: w.pocketToyItems("dildo").length,
			slots: V.pocket.bag.slots.length,
		};

		w.pocketToyPack("dildo", 0, false);
		const unpacked = {
			flags: V.player.inventory.sextoys.dildo.map((t: any) => ({ packed: !!t.packed, carried: !!t.carried })),
			slots: V.pocket.bag.slots.length,
		};

		/* Fill the personal slot first, so this toy goes into the worn bag. Taking that bag off must
		   drop the toy flags but leave the personal food slot alone. */
		V.foodstuff.rich_biscuit.amount = 1;
		V.foodBatches.rich_biscuit = [{ n: 1, day: w.Time.days, own: true }];
		w.pocketSlotToggle("food", "rich_biscuit");
		w.pocketToyPack("dildo", 1, true);
		V.worn.handheld = JSON.parse(JSON.stringify(setup.clothes.handheld[0]));
		w.pocketSyncBag();
		const stripped = {
			flags: V.player.inventory.sextoys.dildo.map((t: any) => ({ packed: !!t.packed, carried: !!t.carried })),
			slots: V.pocket.bag.slots.length,
			remaining: V.pocket.bag.slots.map((slot: any) => ({ kind: slot.kind, location: slot.location })),
		};

		return { packed, unpacked, stripped };
	});

	expect(result.packed.flags).toEqual([
		{ packed: true, carried: true },
		{ packed: false, carried: false },
	]);
	expect(result.packed.handCarried).toBe(0);
	expect(result.packed.bagRows).toBe(1);
	expect(result.packed.slots).toBe(1);

	expect(result.unpacked.flags).toEqual([
		{ packed: false, carried: false },
		{ packed: false, carried: false },
	]);
	expect(result.unpacked.slots).toBe(0);

	expect(result.stripped.flags.every(f => !f.packed && !f.carried)).toBe(true);
	expect(result.stripped.slots).toBe(1);
	expect(result.stripped.remaining).toEqual([{ kind: "food", location: "pocket" }]);
});

test("food notation uses the intended three display bands", async ({ page }) => {
	await newGame(page);

	const result = await page.evaluate(() => {
		const w = window as any;
		/* 1-3 points is one sign, 4-6 is two, and 7-12 is three. */
		const cases: Array<[string, number, number]> = [
			["stress", -1, 1],
			["stress", -3, 1],
			["trauma", -4, 2],
			["trauma", -6, 2],
			["pain", -7, 3],
			["pain", -12, 3],
			["tiredness", 9, 3],
		];
		return cases.map(([stat, amount, want]) => ({
			stat,
			amount,
			want,
			got: w.pocketEffectMagnitude(amount, stat),
		}));
	});

	const wrong = result.filter(r => r.got !== r.want);
	expect(wrong).toEqual([]);
});

test("what a serving is worth decides how much of a meal it is", async ({ page }) => {
	await newGame(page);

	const result = await page.evaluate(() => {
		const w = window as any;
		const SC = w.SugarCube;
		const setup = w.setup || SC.setup;
		SC.State.variables.foodSpoilage = 1;
		w.pocketEnsure();

		const dishes = Object.keys(setup.foodstuff).filter(k => w.foodIsDish(k));
		const scales = dishes.map(k => w.foodValueScale(k));

		/* Same flavour row, different price: the expensive one has to be the bigger meal. */
		const cheapSweet = w.foodEffects("rich_biscuit");
		const dearSweet = w.foodEffects("souffle");
		const cheapHearty = w.foodEffects("sausage_roll");
		const dearHearty = w.foodEffects("roast_dinner");

		/* Nothing may be rounded out of existence at the cheap end. */
		const blank = dishes.filter(k => Object.keys(w.foodEffects(k)).length === 0);
		const excessiveBenefit = dishes.filter(k => Object.values(w.foodEffects(k)).some((amount: any) => amount < -6));
		const lostStat = dishes.filter(k => {
			const base = setup.foodEffectsByTag.base;
			const flavour = setup.foodEffectsByTag[w.foodFlavour(k)] || {};
			const unscaled: Record<string, number> = {};
			[base, flavour].forEach(row => Object.keys(row).forEach(stat => (unscaled[stat] = (unscaled[stat] || 0) + row[stat])));
			const effects = w.foodEffects(k);
			/* Anything the rows asked for must survive being scaled down for a cheap dish. */
			return Object.keys(unscaled).some(stat => unscaled[stat] !== 0 && !effects[stat]);
		});

		return {
			min: Math.min(...scales),
			max: Math.max(...scales),
			distinctScales: new Set(scales.map(v => v.toFixed(2))).size,
			cheapSweet,
			dearSweet,
			cheapHearty,
			dearHearty,
			blank,
			excessiveBenefit,
			lostStat,
		};
	});

	/* A real spread, not two or three bands. */
	expect(result.min).toBeLessThan(0.5);
	expect(result.max).toBeGreaterThan(2);
	expect(result.distinctScales).toBeGreaterThan(20);

	expect(Math.abs(result.dearSweet.stress)).toBeGreaterThan(Math.abs(result.cheapSweet.stress));
	expect(Math.abs(result.dearHearty.pain)).toBeGreaterThan(Math.abs(result.cheapHearty.pain));
	expect(result.dearSweet.stress).toBe(-6);
	expect(result.dearHearty).toEqual({ stress: -6, pain: -6, tiredness: 9 });
	expect(result.blank).toEqual([]);
	expect(result.excessiveBenefit).toEqual([]);
	expect(result.lostStat).toEqual([]);
});

test("no edible dish is worth less than the ingredients it is made from", async ({ page }) => {
	await newGame(page);

	const result = await page.evaluate(() => {
		const w = window as any;
		const setup = w.setup || w.SugarCube.setup;

		/* One unit of each listed ingredient is consumed per batch, and a batch yields `servings`. */
		const perServingCost = (key: string) => {
			const recipe = setup.foodstuff[key].recipe;
			const batch = recipe.ingredients.reduce((sum: number, i: string) => sum + (setup.foodstuff[i]?.shop?.sell_price || 0), 0);
			return batch / (recipe.servings || 1);
		};

		const dishes = Object.keys(setup.foodstuff).filter(k => w.foodIsDish(k));
		const underCost = dishes
			.filter(k => setup.foodstuff[k].shop.sell_price < perServingCost(k))
			.map(k => `${k}: ${setup.foodstuff[k].shop.sell_price} < ${Math.round(perServingCost(k))}`);

		/* Profit per minute of cooking, to catch a price that makes one dish the only sane thing to cook. */
		const perMinute = dishes.map(k => {
			const recipe = setup.foodstuff[k].recipe;
			const batch = recipe.ingredients.reduce((sum: number, i: string) => sum + (setup.foodstuff[i]?.shop?.sell_price || 0), 0);
			const profit = setup.foodstuff[k].shop.sell_price * (recipe.servings || 1) - batch;
			return { key: k, ppm: profit / (recipe.cook_minutes || 1) };
		});
		perMinute.sort((a, b) => b.ppm - a.ppm);

		return { underCost, best: perMinute[0], second: perMinute[1] };
	});

	expect(result.underCost).toEqual([]);
	/* No single dish may be wildly better to cook than everything else - belgian bun was 20x the field. */
	expect(result.best.ppm).toBeLessThan(result.second.ppm * 2);
});

test("the mirror stays in the bag under a blood moon", async ({ page }) => {
	await newGame(page);

	const result = await page.evaluate(() => {
		const w = window as any;
		const SC = w.SugarCube;
		const V = SC.State.variables;
		w.pocketEnsure();
		V.pocket.mirror = true;
		V.daily = V.daily || {};
		delete V.daily.pocketMirrorBloodMoon;
		/* Blood moon is a computed getter, so the test states the sky it wants. */
		Object.defineProperty(w.Weather, "bloodMoon", { configurable: true, get: () => true });

		const render = () => {
			const host = document.createElement("div");
			host.appendChild(SC.Wikifier.wikifyEval("<<pocketMirrorTab>>"));
			return host.textContent || "";
		};

		const before = V.awareness;
		const first = render();
		const gained = V.awareness - before;
		const second = render();
		const flagged = V.daily.pocketMirrorBloodMoon === true;

		Object.defineProperty(w.Weather, "bloodMoon", { configurable: true, get: () => false });
		const clear = render();

		return { first, second, clear, gained, flagged };
	});

	expect(result.first).toContain("something bad will happen");
	/* The warning is worth learning from, but only the once a day. */
	expect(result.gained).toBeGreaterThan(0);
	expect(result.flagged).toBe(true);
	expect(result.second).toContain("something bad will happen");
	expect(result.second).not.toContain("Awareness");
	expect(result.second).not.toContain("Innocence");
	/* With the sky clear the mirror works again. */
	expect(result.clear).not.toContain("something bad will happen");
});

test("the Journal lists every food batch and keeps today's spoilage notice all day", async ({ page }) => {
	await newGame(page);

	const result = await page.evaluate(() => {
		const w = window as any;
		const SC = w.SugarCube;
		const V = SC.State.variables;
		w.pocketEnsure();
		V.foodSpoilage = 1;

		/* One serving cooked well past its shelf life. */
		V.foodstuff.chips = { amount: 1 };
		V.foodBatches.chips = [{ n: 1, day: w.Time.days - 30, own: true }];
		V.foodstuff.rich_biscuit.amount = 3;
		V.foodBatches.rich_biscuit = [
			{ n: 1, day: w.Time.days - 10, own: true },
			{ n: 2, day: w.Time.days, own: true },
		];

		const swept = w.pocketDayPassed();
		const pending = V.daily.foodSpoiled.length;

		const host = document.createElement("div");
		host.appendChild(SC.Wikifier.wikifyEval("<<pocketFoodJournal>>"));
		const first = host.textContent || "";

		/* Reading the Journal must not consume a notice that should last all day. */
		const second = document.createElement("div");
		second.appendChild(SC.Wikifier.wikifyEval("<<pocketFoodJournal>>"));

		const journal = document.createElement("div");
		journal.appendChild(SC.Wikifier.wikifyEval("<<journal>>"));
		const summaries = Array.from(journal.querySelectorAll("summary"));
		const productsSummary = summaries.find(summary => summary.textContent?.trim() === "Products");
		const foodsSummary = summaries.find(summary => summary.textContent?.trim() === "Foods");
		const productDetails = productsSummary?.closest("details");
		const foodDetails = foodsSummary?.closest("details");
		const sameLevel = !!productDetails && !!foodDetails && productDetails.parentElement === foodDetails.parentElement;
		const foodsNested = !!foodDetails?.parentElement?.closest("details");

		const pocket = document.createElement("div");
		pocket.appendChild(SC.Wikifier.wikifyEval("<<pocketBagContents>>"));

		return {
			swept,
			pending,
			first,
			again: second.textContent || "",
			sameLevel,
			foodsNested,
			pocket: pocket.textContent || "",
			left: V.foodstuff.chips.amount,
			dailyStillThere: V.daily.foodSpoiled.length,
		};
	});

	expect(result.swept.length).toBe(1);
	expect(result.pending).toBe(1);
	expect(result.left).toBe(0);
	expect(result.first).toContain("thrown away today");
	expect(result.first).toContain("Rich biscuit (3)");
	expect(result.first).toContain("1 serving");
	expect(result.first).toContain("2 servings");
	expect(result.first).toContain("11 days left");
	expect(result.first).toContain("21 days left");
	expect(result.again).toContain("thrown away today");
	expect(result.sameLevel).toBe(true);
	expect(result.foodsNested).toBe(false);
	expect(result.pocket).not.toContain("thrown away today");
	expect(result.dailyStillThere).toBe(1);
});

test("every bag capacity names a bag that exists", async ({ page }) => {
	await newGame(page);

	const result = await page.evaluate(() => {
		const w = window as any;
		const setup = w.setup || w.SugarCube.setup;

		/* Every garment that counts as a bag, by the same test pocketBagItem uses. */
		const bags: { variable: string; name: string }[] = [];
		Object.values(setup.clothes.handheld || {}).forEach((item: any) => {
			if (Array.isArray(item.type) && item.type.includes("bookbag")) bags.push({ variable: item.variable, name: item.name });
		});

		const known = new Set(bags.flatMap(b => [b.variable, b.name]));
		const dead = Object.keys(setup.pocketBagCapacity).filter(key => !known.has(key));
		const sized = bags.map(b => ({
			name: b.name,
			slots: setup.pocketBagCapacity[b.variable] ?? setup.pocketBagCapacity[b.name] ?? setup.pocketBagCapacityDefault,
		}));

		return { dead, sized, bagCount: bags.length };
	});

	expect(result.bagCount).toBeGreaterThan(0);
	/* A table entry for a bag that doesn't exist is a capacity nobody will ever get. */
	expect(result.dead).toEqual([]);
	/* A purse must never hold as much as a backpack. */
	const purse = result.sized.find(b => b.name === "purse");
	const backpack = result.sized.find(b => b.name === "backpack");
	expect(purse!.slots).toBeLessThan(backpack!.slots);
	expect(backpack!.slots).toBe(8);
	expect(result.sized.find(b => b.name === "messenger bag")!.slots).toBe(5);
	expect(result.sized.find(b => b.name === "gym bag")!.slots).toBe(6);
	expect(result.sized.find(b => b.name === "tote bag")!.slots).toBe(6);
	expect(result.sized.find(b => b.name === "vintage suitcase")!.slots).toBe(10);
});
