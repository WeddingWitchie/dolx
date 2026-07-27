import { test, expect } from "@playwright/test";
import { openGame, navigateTo, getVar, setVar, wikifyEval, wikifyToText, assertNoErrors } from "./helpers.js";

test.describe("Transformation income", () => {
	test.beforeEach(async ({ page }) => {
		await openGame(page);
		await navigateTo(page, "Start2");
	});

	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("full Harpy transformation adds 45% to configured job wages", async ({ page }) => {
		await setVar(page, "harpy", 6);

		const moneyBefore = (await getVar(page, "money")) as number;
		await wikifyEval(page, '<<wage 100 "housekeeping" "bird" 0.45>>');
		const moneyAfter = (await getVar(page, "money")) as number;

		expect(moneyAfter - moneyBefore).toBe(14500);
	});

	test("partial Harpy transformation does not receive the full-form bonus", async ({ page }) => {
		await setVar(page, "harpy", 5);

		const moneyBefore = (await getVar(page, "money")) as number;
		await wikifyEval(page, '<<wage 100 "housekeeping" "bird" 0.45>>');
		const moneyAfter = (await getVar(page, "money")) as number;

		expect(moneyAfter - moneyBefore).toBe(10000);
	});

	test("Bear no longer boosts Harpy-configured job wages", async ({ page }) => {
		await setVar(page, "bear", 6);

		const moneyBefore = (await getVar(page, "money")) as number;
		await wikifyEval(page, '<<wage 100 "housekeeping" "bird" 0.45>>');
		const moneyAfter = (await getVar(page, "money")) as number;

		expect(moneyAfter - moneyBefore).toBe(10000);
	});

	test("Avery office wage applies the same 45% Harpy bonus", async ({ page }) => {
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			const Avery = (window as any).C.npc.Avery;
			Avery.love = 100;
			Avery.rage = 0;
			V.endear = 0;
			V.beauty = 0;
			V.beautymax = 100;
			V.fame.model = 0;
		});

		const basePay = Number(await wikifyToText(page, "<<averyofficewage>><<= _averyPay>>"));
		await setVar(page, "harpy", 6);
		const harpyPay = Number(await wikifyToText(page, "<<averyofficewage>><<= _averyPay>>"));

		expect(basePay).toBe(50);
		expect(harpyPay).toBe(73);
	});

	test("transformation trait text matches both income mechanics", async ({ page }) => {
		await setVar(page, "harpy", 6);
		await setVar(page, "bear", 6);

		const traits = await wikifyToText(page, "<<traits>>");

		expect(traits).toContain("Office work earnings and chalet and pound wages are increased by 45%.");
		expect(traits).toContain("Docker shift and overtime wages are doubled.");
	});
});
