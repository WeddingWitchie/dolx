import { test, expect } from "@playwright/test";
import { openGame, navigateTo, wikifyEval, assertNoErrors } from "./helpers.js";

test.describe("Divine transformation priority", () => {
	test.beforeEach(async ({ page }) => {
		await openGame(page);
		await navigateTo(page, "Start2");
	});

	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("uses Demon, Fallen Angel, Angel priority without removing mixed limbs", async ({ page }) => {
		const result = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			const Transformations = (window as any).Transformations;
			V.demon = 0;
			V.fallenangel = 0;
			V.angel = 0;
			V.transformationParts.demon.wings = "default";
			V.transformationParts.fallenAngel.halo = "default";
			V.transformationParts.angel.halo = "default";

			return {
				levels: ["demon", "fallen", "angel"].map(name => Transformations.effectiveLevel(name)),
				parts: {
					demonWings: V.transformationParts.demon.wings,
					fallenHalo: V.transformationParts.fallenAngel.halo,
					angelHalo: V.transformationParts.angel.halo,
				},
			};
		});

		expect(result.levels).toEqual([6, 0, 0]);
		expect(result.parts).toEqual({ demonWings: "default", fallenHalo: "default", angelHalo: "default" });
	});

	test("applies only the highest-priority divine income effect", async ({ page }) => {
		const income = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.demon = 6;
			V.fallenangel = 4;
			V.angel = 6;
			return {
				normal: (window as any).divineTfIncome(100, "docksWage"),
				sexual: (window as any).divineTfIncome(100, "prostitution"),
			};
		});

		expect(income).toEqual({ normal: 100, sexual: 150 });
	});

	test("shows only the active divine combat skill while preserving unlocked skills", async ({ page }) => {
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.angeltf = 1;
			V.fallenangeltf = 1;
			V.fallenangelplustf = 1;
			V.demontf = 1;
			V.angelforgive = 0;
			V.fallenangelretribution = 0;
			V.demonseduce = 0;
			V.transformationParts.demon.wings = "default";
			V.transformationParts.fallenAngel.halo = "default";
			V.transformationParts.angel.halo = "default";
		});

		await wikifyEval(page, "<<sexDefaults false>>");
		const demonActions = await page.evaluate(() => Object.keys((window as any).SugarCube.State.temporary.mouth));
		expect(demonActions).toContain("Seduce");
		expect(demonActions).not.toContain("Retribution");
		expect(demonActions).not.toContain("Forgive");

		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.transformationParts.demon.wings = "disabled";
		});
		await wikifyEval(page, "<<sexDefaults false>>");
		const fallenActions = await page.evaluate(() => Object.keys((window as any).SugarCube.State.temporary.mouth));
		expect(fallenActions).toContain("Retribution");
		expect(fallenActions).not.toContain("Seduce");
		expect(fallenActions).not.toContain("Forgive");

		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.transformationParts.fallenAngel.halo = "disabled";
		});
		await wikifyEval(page, "<<sexDefaults false>>");
		const angelActions = await page.evaluate(() => Object.keys((window as any).SugarCube.State.temporary.mouth));
		expect(angelActions).toContain("Forgive");
		expect(angelActions).not.toContain("Seduce");
		expect(angelActions).not.toContain("Retribution");
	});
});
