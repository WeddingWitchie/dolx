import { test, expect } from "@playwright/test";
import { openGame, navigateTo, advanceHours, assertNoErrors, type Page } from "./helpers.js";

async function setupGame(page: Page) {
	await openGame(page);
	await navigateTo(page, "Start2");
}

async function probe(page: Page, setup: Record<string, unknown>) {
	return page.evaluate(s => {
		const V = (window as any).SugarCube.State.variables;
		V.transformationParts.waterdragon = { horns: "disabled", ears: "disabled", tail: "disabled" };
		V.waterdragon = 0;
		V.waterdragontf = 0;
		Object.entries(s).forEach(([k, v]) => {
			if (k.startsWith("part.")) V.transformationParts.waterdragon[k.slice(5)] = v;
			else (V as any)[k] = v;
		});
		return {
			effectiveLevel: (window as any).effectiveTransformationLevel("waterdragon"),
			isFull: (window as any).isFullWaterDragon(),
		};
	}, setup);
}

async function prepBody(page: Page, real: boolean) {
	await page.evaluate(isReal => {
		const V = (window as any).SugarCube.State.variables;
		V.transformationParts.waterdragon = { horns: isReal ? "default" : "disabled", ears: isReal ? "default" : "disabled", tail: isReal ? "default" : "purple" };
		V.waterdragon = isReal ? 7 : 0;
		V.waterdragontf = isReal ? 1 : 0;
		V.waterdragonCosmeticUnlocked = isReal ? 0 : 1;
		V.settings.playerPregnancyEggLayingEnabled = true;
		V.waterDragonLab = null;
		delete V.waterDragonEggs;
	}, real);
}

test.describe("water dragon egg biology gate", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("cosmetic parts read as a full level but are not a real water dragon", async ({ page }) => {
		await setupGame(page);

		const cosmeticTail = await probe(page, { "part.tail": "purple", waterdragonCosmeticUnlocked: 1 });
		expect(cosmeticTail.effectiveLevel).toBe(7);
		expect(cosmeticTail.isFull).toBe(false);

		const nothing = await probe(page, {});
		expect(nothing.effectiveLevel).toBe(0);
		expect(nothing.isFull).toBe(false);

		const cosmeticHorns = await probe(page, { "part.horns": "short", waterdragonCosmeticUnlocked: 1 });
		expect(cosmeticHorns.effectiveLevel).toBe(2);
		expect(cosmeticHorns.isFull).toBe(false);

		const stage6 = await probe(page, { "part.tail": "default", waterdragon: 6 });
		expect(stage6.effectiveLevel).toBe(7);
		expect(stage6.isFull).toBe(true);

		const stage7 = await probe(page, { "part.tail": "default", waterdragon: 7, waterdragontf: 1 });
		expect(stage7.isFull).toBe(true);

		const permanentOnly = await probe(page, { "part.tail": "default", waterdragontf: 1 });
		expect(permanentOnly.isFull).toBe(true);
	});

	test("cosmetic dragon grows no eggs and a stale egg is cleared", async ({ page }) => {
		await setupGame(page);
		await prepBody(page, false);

		await advanceHours(page, 25);
		expect(await page.evaluate(() => (window as any).SugarCube.State.variables.waterDragonEggs ?? null)).toBeNull();

		await page.evaluate(() => {
			(window as any).SugarCube.State.variables.waterDragonEggs = { count: 1, daysTillLaying: 0 };
		});
		await advanceHours(page, 25);
		expect(await page.evaluate(() => (window as any).SugarCube.State.variables.waterDragonEggs ?? null)).toBeNull();
	});

	test("real dragon still grows eggs on the daily tick", async ({ page }) => {
		await setupGame(page);
		await prepBody(page, true);

		await advanceHours(page, 25);
		const eggs = await page.evaluate(() => (window as any).SugarCube.State.variables.waterDragonEggs ?? null);
		expect(eggs).not.toBeNull();
		expect(eggs.count).toBe(1);
		expect(eggs.daysTillLaying).toBeGreaterThan(0);
	});

	test("hospital birth is not hijacked for a cosmetic dragon", async ({ page }) => {
		await setupGame(page);
		await prepBody(page, false);

		const text = await page.evaluate(() => {
			const SC = (window as any).SugarCube;
			SC.State.variables.phase = 1;
			SC.Engine.play("Pregnancy Birth Hospital");
			return document.querySelector("#passages")?.textContent ?? "";
		});
		expect(text).not.toContain("The eggs inside you shift");
		expect(text).not.toContain("return to the nest");
	});

	test("hospital birth is still hijacked for a real water dragon", async ({ page }) => {
		await setupGame(page);
		await prepBody(page, true);

		const text = await page.evaluate(() => {
			const SC = (window as any).SugarCube;
			SC.State.variables.phase = 1;
			SC.Engine.play("Pregnancy Birth Hospital");
			return document.querySelector("#passages")?.textContent ?? "";
		});
		expect(text).toContain("return to the nest");
	});
});
