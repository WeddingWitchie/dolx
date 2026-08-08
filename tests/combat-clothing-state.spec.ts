import { test, expect } from "@playwright/test";
import { navigateTo, openGame, wikifyEval } from "./helpers.js";

test.beforeEach(async ({ page }) => {
	await openGame(page);
	await navigateTo(page, "Start2");
});

test("NPC pulling treats a modded skirt as lower clothing even when it has stale upper-clothing state", async ({ page }) => {
	await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		const V = SC.State.variables;
		const skirt = structuredClone(SC.setup.clothes.lower.find((item: any) => item.name === "plaid school skirt"));
		skirt.state = "midriff";
		skirt.state_top = "midriff";
		V.worn.lower = skirt;
	});

	await wikifyEval(page, '<<combat-pull-clothing-state "lower" "down" "left">>');
	await wikifyEval(page, '<<combat-pull-clothing-state "lower" "down" "left">>');

	const state = await page.evaluate(() => {
		const worn = (window as any).SugarCube.State.variables.worn.lower;
		return { state: worn.state, stateTop: worn.state_top };
	});

	expect(state).toEqual({ state: "thighs", stateTop: "midriff" });
});

test("re-equipping stored modded clothing clears incompatible state", async ({ page }) => {
	await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		const V = SC.State.variables;
		const skirt = structuredClone(SC.setup.clothes.lower.find((item: any) => item.name === "plaid school skirt"));
		skirt.location = "test";
		skirt.state = "midriff";
		skirt.state_top = "midriff";
		V.store.lower.push(skirt);
	});

	await wikifyEval(page, '<<generalStoreon "test" "lower">>');

	const state = await page.evaluate(() => {
		const worn = (window as any).SugarCube.State.variables.worn.lower;
		return { name: worn.name, state: worn.state, hasStateTop: Object.hasOwn(worn, "state_top") };
	});

	expect(state).toEqual({ name: "plaid school skirt", state: "waist", hasStateTop: false });
});
