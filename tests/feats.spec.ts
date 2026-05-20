import { test, expect } from "@playwright/test";
import { navigateTo, waitForPassage, getVar, wikifyEval, assertNoErrors, FILE_URL, type Page } from "./helpers.js";

async function openGameWithFeats(page: Page, dolFeats?: object) {
	await page.addInitScript(
		featsJson => {
			localStorage.setItem("verifiedAge", "true");
			if (featsJson) {
				localStorage.setItem("dolFeats", featsJson);
			} else {
				localStorage.removeItem("dolFeats");
			}
		},
		dolFeats ? JSON.stringify(dolFeats) : null
	);
	await page.goto(FILE_URL);
	await waitForPassage(page);
}

test.describe("Feats Boosts", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("are all locked when no feats earned (0 Vrelcoins)", async ({ page }) => {
		await openGameWithFeats(page);
		await navigateTo(page, "Start2");

		const featsBoosts = await getVar(page, "featsBoosts");
		expect(featsBoosts).not.toBeNull();
		expect(typeof featsBoosts).toBe("object");

		// Boosts should be unavailable with no feats unlocked (max 0)
		const details = featsBoosts.upgradeDetails;
		for (const [key, detail] of Object.entries(details) as [string, any][]) {
			// randomClothing is an exception (max 20)
			if (key === "randomClothing") {
				expect(detail.max).toBe(20);
			} else {
				expect(detail.max).toBe(0);
			}
		}

		const feats = await getVar(page, "feats");
		expect(feats.allSaves.points).toBe(0);
	});
});

test.describe("Starting Money Boost", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("has max upgrades corresponding to acquired money feats", async ({ page }) => {
		const now = new Date().toJSON();
		// 4 money feats earned
		const dolFeats = {
			"Pocket Change": now,
			"Money Maker": now,
			Tycoon: now,
			Millionaire: now,
			points: 0,
		};
		await openGameWithFeats(page, dolFeats);
		await navigateTo(page, "Start2");
		await wikifyEval(page, "<<setupFeatBoosts true>>");

		const result = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			return {
				moneyMax: V.featsBoosts.upgradeDetails.money.max,
				moneyName: V.featsBoosts.name.money,
			};
		});

		// 4 money feats earned, maxMultiplier 2, max = 2*4 = 8
		expect(result.moneyMax).toBe(8);
		expect(result.moneyName).toBe("Starting Money");
	});

	test("purchase increases starting money", async ({ page }) => {
		// max money boosts = 4
		// (2 money feats earned, maxMultiplier 2, and 2*2 = 4)
		const dolFeats = {
			"Pocket Change": new Date().toJSON(),
			"Money Maker": new Date().toJSON(),
			points: 0,
		};

		await openGameWithFeats(page, dolFeats);
		await navigateTo(page, "Start2");

		const startMoney = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			const Wikifier = (window as any).SugarCube.Wikifier;

			Wikifier.wikifyEval("<<setupFeatBoosts true>>");
			const moneyBefore = V.money;

			// purchase 1 money boost for 5 coins.
			V.featsBoosts.upgrades.money = 1 * 5;
			V.featsBoosts.upgradeDetails.money.purchased = 1;
			Wikifier.wikifyEval("<<applyFeatBoosts>>");

			return { before: moneyBefore, after: V.money };
		});

		// 1 (purchased) * max money boosts (4) * 2500 = 10000
		expect(startMoney.after - startMoney.before).toBe(10000);
	});
});

test.describe("Physique boost", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("increases physique", async ({ page }) => {
		const now = new Date().toJSON();
		// 2 physique boosts earned
		const dolFeats = {
			Powerful: now,
			"Unstoppable Force": now,
			points: 0,
		};
		await openGameWithFeats(page, dolFeats);
		await navigateTo(page, "Start2");

		const result = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			const Wikifier = (window as any).SugarCube.Wikifier;

			Wikifier.wikifyEval("<<setupFeatBoosts true>>");
			const physiqueBefore = V.physique;

			// purchase 1 money boost for 10 coins.
			V.featsBoosts.upgrades.physique = 10;
			V.featsBoosts.upgradeDetails.physique.purchased = 1;
			Wikifier.wikifyEval("<<applyFeatBoosts>>");

			return { before: physiqueBefore, after: V.physique };
		});

		// total gain = 1 (purchased) * 1500 (gain per purchase) = 1500
		expect(result.after - result.before).toBe(1500);
	});
});
