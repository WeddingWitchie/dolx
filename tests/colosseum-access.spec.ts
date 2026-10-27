import { expect, test } from "@playwright/test";
import { assertNoErrors, getVar, navigateTo, openGame, wikifyEval, type Page } from "./helpers.js";

async function setupWin(page: Page, rank = 0) {
	await openGame(page);
	await navigateTo(page, "Start2");
	await wikifyEval(
		page,
		`<<generate1>><<set $enemyhealth to 0>><<set $finish to 0>><<set $xchange.colosseum.joined to 1>><<set $xchange.colosseum.mock to 0>><<set $xchange.colosseum.rank to ${rank}>><<set $xchange.colosseum.matchRank to ${rank}>><<set $xchange.colosseum.breed to "skip">><<set $daily.colosseumPostfightEvent to 1>>`
	);
}

test("a winner can collect a reduced purse without taking a pill or losing access", async ({ page }) => {
	await openGame(page);
	await navigateTo(page, "Start2");
	await wikifyEval(
		page,
		"<<generate1>><<set $enemyhealth to 0>><<set $finish to 0>><<set $xchange.colosseum.joined to 1>><<set $xchange.colosseum.mock to 0>><<set $xchange.colosseum.matchRank to 0>><<set $daily.colosseumPostfightEvent to 1>>"
	);
	await navigateTo(page, "Underground Colosseum Breed Offer");
	const before = await getVar(page, "player");
	const moneyBefore = await getVar(page, "money");
	await page.getByRole("link", { name: "Take the reduced fight purse" }).click();
	await expect(page.locator("#passages")).toContainText("You won the bout.");
	const col = (await getVar(page, "xchange")).colosseum;
	expect(col.wins).toBe(1);
	expect(col.rankPoints).toBe(12);
	expect(await getVar(page, "money")).toBe(moneyBefore + 10000);
	expect(col.ending).toBe("");
	expect(col.banReason).toBeUndefined();
	const after = await getVar(page, "player");
	expect(after.penisExist).toBe(before.penisExist);
	expect(after.vaginaExist).toBe(before.vaginaExist);
	await expect(page.locator('#passages a[data-passage="Underground Colosseum Pit"]')).toBeVisible();
	await assertNoErrors(page);
	await page.locator('#passages a[data-passage="Underground Colosseum Pit"]').click();
	await page.locator('#passages a[data-passage="Underground Colosseum Match Board"]').click();
	await expect(page.getByRole("link", { name: /Challenge a F-rank opponent/ })).toBeVisible();
	await assertNoErrors(page);
});

for (const width of [1280, 390]) {
	test(`stopping a post-win encounter preserves access and cleans up combat at width ${width}`, async ({ page }) => {
		await page.setViewportSize({ width, height: 800 });
		await openGame(page);
		await navigateTo(page, "Start2");
		await wikifyEval(page, '<<generate1>><<saveNPC 0 "colosseum_opponent">><<set $sexstart to 1>><<set $xchange.colosseum.breedCtx to "contestant">>');
		await navigateTo(page, "Underground Colosseum Breeding Sex");
		await page.getByRole("link", { name: /Stop here$/ }).click();
		const col = (await getVar(page, "xchange")).colosseum;
		expect(col.ending).toBe("");
		expect(col.banReason).toBeUndefined();
		expect(col.breedCtx).toBeUndefined();
		expect(col.storedBefore).toBeUndefined();
		await expect(page.locator('#passages a[data-passage="Underground Colosseum Pit"]')).toBeVisible();
		await assertNoErrors(page);
	});
}

for (const [rank, reward] of [10000, 17500, 27500, 40000, 60000, 85000, 120000].entries()) {
	test(`reduced purse and bout cleanup at rank ${rank}`, async ({ page }) => {
		await setupWin(page, rank);
		const before = await getVar(page, "money");
		await wikifyEval(page, "<<colosseumBeltOn>>");
		await navigateTo(page, "Underground Colosseum Result");
		expect(await getVar(page, "money")).toBe(before + reward);
		const col = (await getVar(page, "xchange")).colosseum;
		for (const key of ["breed", "matchRank", "opponentRank", "promotion", "fightStart", "lashOuts", "beltFitted"]) {
			expect(col[key], key).toBeUndefined();
		}
		expect((await getVar(page, "worn")).genitals.origin).not.toBe("Colosseum");
		expect(await getVar(page, "combat")).toBe(0);
		await assertNoErrors(page);
	});
}

test("reduced purse respects repeat opponents, debt and a winning wager", async ({ page }) => {
	await setupWin(page);
	await wikifyEval(
		page,
		"<<set $xchange.colosseum.lastOpponentRank to 0>><<set $xchange.colosseum.opponentStreak to 1>><<set $xchange.colosseum.debt to 20000>><<set $xchange.colosseum.debtDeferred to 1>><<set $xchange.colosseum.wager to 10000>>"
	);
	const before = await getVar(page, "money");
	await navigateTo(page, "Underground Colosseum Result");
	const col = (await getVar(page, "xchange")).colosseum;
	expect(col.rankPoints).toBe(9);
	expect(col.debt).toBe(12500);
	expect(col.wager).toBeUndefined();
	expect(await getVar(page, "money")).toBe(before + 20000);
	await assertNoErrors(page);
});

test("an existing device from another source survives the reduced-purse exit", async ({ page }) => {
	await setupWin(page);
	await wikifyEval(page, '<<forceChastityFit "Whitney">><<colosseumBeltOn>>');
	const before = (await getVar(page, "worn")).genitals;
	await navigateTo(page, "Underground Colosseum Result");
	expect((await getVar(page, "worn")).genitals).toEqual(before);
	await assertNoErrors(page);
});

test("stopping the trial encounter does not trigger its completed-scene aftermath", async ({ page }) => {
	await openGame(page);
	await navigateTo(page, "Start2");
	await wikifyEval(page, '<<generate1>><<saveNPC 0 "colosseum_opponent">><<set $sexstart to 1>><<set $xchange.colosseum.breedCtx to "goon">>');
	await navigateTo(page, "Underground Colosseum Breeding Sex");
	await page.getByRole("link", { name: /Stop here$/ }).click();
	await expect(page.locator('#passages a[data-passage="Underground Colosseum Pit"]')).toBeVisible();
	await expect(page.locator('#passages a[data-passage="Underground Colosseum Goon Breeding End"]')).toHaveCount(0);
	await assertNoErrors(page);
});

test("older encounter state without a snapshot does not claim unrelated pregnancies", async ({ page }) => {
	await openGame(page);
	await navigateTo(page, "Start2");
	const result = await page.evaluate(() => {
		const w = window as any;
		const v = w.SugarCube.State.variables;
		v.storedNPCs.auditUnrelated = {};
		v.pregnancies.push({ pregnancyId: 0, carrier: "auditUnrelated", deliveredDate: null });
		v.speechorgasmcount = 0;
		delete v.xchange.colosseum.storedBefore;
		const settled = w.colosseumSettleBreeding(0);
		return { settled, claimed: v.pregnancies[0].colosseum, sired: v.xchange.colosseum.sired };
	});
	expect(result).toEqual({ settled: false, claimed: undefined, sired: undefined });
});

test("settlement tags only records added during this encounter and clears its snapshot", async ({ page }) => {
	await openGame(page);
	await navigateTo(page, "Start2");
	const result = await page.evaluate(() => {
		const w = window as any;
		const v = w.SugarCube.State.variables;
		v.storedNPCs = { previous: {}, current: {} };
		v.pregnancies = [
			{ pregnancyId: 0, carrier: "previous", deliveredDate: null },
			{ pregnancyId: 1, carrier: "current", deliveredDate: null },
		];
		v.speechorgasmcount = 0;
		v.xchange.colosseum.storedBefore = ["previous"];
		const first = w.colosseumSettleBreeding(0);
		const second = w.colosseumSettleBreeding(0);
		return {
			first,
			second,
			previous: v.pregnancies[0].colosseum,
			current: v.pregnancies[1].colosseum,
			sired: v.xchange.colosseum.sired,
			snapshot: v.xchange.colosseum.storedBefore,
		};
	});
	expect(result).toEqual({ first: true, second: false, previous: undefined, current: 1, sired: 1, snapshot: undefined });
});

test("the post-win encounter still ends automatically when either participant finishes", async ({ page }) => {
	await openGame(page);
	await navigateTo(page, "Start2");
	await wikifyEval(page, '<<generate1>><<saveNPC 0 "colosseum_opponent">><<set $sexstart to 1>><<set $xchange.colosseum.breedCtx to "contestant">>');
	await navigateTo(page, "Underground Colosseum Breeding Sex");
	await wikifyEval(page, '<<recapStat "npcOrgasm">>');
	await page.locator("#next a").click();
	await expect(page.locator("#next a")).toHaveAttribute("data-passage", "Underground Colosseum Breeding Finish");
	await expect(page.getByRole("link", { name: /Stop here$/ })).toHaveCount(0);
	await page.locator("#next a").click();
	expect(await getVar(page, "combat")).toBe(0);
	await expect(page.locator('#passages a[data-passage="Underground Colosseum Pit"]')).toBeVisible();
	await assertNoErrors(page);
});

test("repeated turns and save/load keep the same opponent and do not restart combat", async ({ page }) => {
	await openGame(page);
	await navigateTo(page, "Start2");
	await wikifyEval(page, '<<generate1>><<saveNPC 0 "colosseum_opponent">><<set $sexstart to 1>><<set $xchange.colosseum.breedCtx to "contestant">>');
	await navigateTo(page, "Underground Colosseum Breeding Sex");
	const opponent = (await getVar(page, "NPCList"))[0].fullDescription;
	await wikifyEval(page, "<<set $enemyhealth to 123>><<set $speechorgasmcount to 0>>");
	await page.locator("#next a").click();
	expect((await getVar(page, "NPCList"))[0].fullDescription).toBe(opponent);
	expect(await getVar(page, "enemyhealth")).toBe(123);
	expect(await getVar(page, "sexstart")).toBe(0);
	await expect(page.locator("#passages")).not.toContainText("Your partner is submissive.");
	await page.evaluate(() => {
		const sc = (window as any).SugarCube;
		const saved = sc.Save.serialize();
		if (typeof saved !== "string") throw new Error("Encounter save failed");
		sc.Save.deserialize(saved);
	});
	await expect(page.getByRole("link", { name: /Stop here$/ })).toBeVisible();
	expect((await getVar(page, "NPCList"))[0].fullDescription).toBe(opponent);
	expect(await getVar(page, "enemyhealth")).toBe(123);
	await page.getByRole("link", { name: /Stop here$/ }).click();
	for (const key of ["setupMidOrgasm", "combatRecap"]) expect(await getVar(page, key), key).toBeUndefined();
	expect((await getVar(page, "combatExtended")).consensualStart).toBeUndefined();
	expect(await getVar(page, "consensual")).toBe(0);
	await page.locator('#passages a[data-passage="Underground Colosseum Pit"]').click();
	await expect(page.getByRole("link", { name: /Stop here$/ })).toHaveCount(0);
	await navigateTo(page, "Bedroom");
	await expect(page.locator('#stop, #cbtToggleMenu a[data-passage="Underground Colosseum Breeding Finish"]')).toHaveCount(0);
	await assertNoErrors(page);
});

for (const [choice, points, purse] of [
	["skip", 37, 27500],
	["", 75, 55000],
] as const) {
	test(`promotion rewards remain correct for choice '${choice}'`, async ({ page }) => {
		await openGame(page);
		await navigateTo(page, "Start2");
		await wikifyEval(
			page,
			`<<generate1>><<set $enemyhealth to 0>><<set $finish to 0>><<set $xchange.colosseum.mock to 0>><<set $xchange.colosseum.matchRank to 2>><<set $xchange.colosseum.promotion to 1>><<set $xchange.colosseum.breed to "${choice}">><<set $daily.colosseumPostfightEvent to 1>>`
		);
		const moneyBefore = await getVar(page, "money");
		await navigateTo(page, "Underground Colosseum Result");
		const col = (await getVar(page, "xchange")).colosseum;
		expect(col.rank).toBe(1);
		expect(col.rankPoints).toBe(points);
		expect(await getVar(page, "money")).toBe(moneyBefore + purse);
		await assertNoErrors(page);
	});
}
