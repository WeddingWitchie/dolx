import { test, expect } from "@playwright/test";
import { navigateTo, openGame } from "./helpers.js";

test.beforeEach(async ({ page }) => {
	await openGame(page);
	await navigateTo(page, "Start2");
});

test("malformed saved clothing is pruned without deleting valid temporary storage", async ({ page }) => {
	const result = await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		const V = SC.State.variables;
		const setup = SC.setup;
		const malformed = { state: 0, state_top: 0, exposed: 2 };
		const shirt = structuredClone(setup.clothes.upper.find((item: any) => item.name === "school shirt"));
		const naked = structuredClone(setup.clothes.upper[0]);
		const temporary = { name: "naked", temp: 1, location: "test" };

		V.worn.upper = structuredClone(malformed);
		V.carried.upper = structuredClone(temporary);
		V.wardrobe.upper = [structuredClone(malformed), structuredClone(shirt), structuredClone(naked), structuredClone(temporary)];
		V.wardrobes.avery_mansion.upper = [structuredClone(malformed), structuredClone(shirt), structuredClone(naked), structuredClone(temporary)];
		V.store.upper = [structuredClone(malformed), structuredClone(shirt), structuredClone(temporary)];

		const clothesIndexErrors: string[] = [];
		const originalReport = (window as any).Errors.report;
		(window as any).Errors.report = (message: string) => clothesIndexErrors.push(message);
		try {
			new SC.Wikifier(document.createElement("div"), "<<updateClothes>>");
		} finally {
			(window as any).Errors.report = originalReport;
		}
		(window as any).pruneClothes();

		return {
			clothesIndexErrors,
			worn: V.worn.upper.name,
			carried: V.carried.upper.name,
			wardrobe: V.wardrobe.upper.map((item: any) => ({ name: item.name, temp: item.temp })),
			mansion: V.wardrobes.avery_mansion.upper.map((item: any) => ({ name: item.name, temp: item.temp })),
			store: V.store.upper.map((item: any) => ({ name: item.name, temp: item.temp })),
		};
	});

	expect(result.clothesIndexErrors).toEqual([]);
	expect(result.worn).toBe("naked");
	expect(result.carried).toBe("naked");
	expect(result.wardrobe).toEqual([{ name: "school shirt", temp: undefined }]);
	expect(result.mansion).toEqual([{ name: "school shirt", temp: undefined }]);
	expect(result.store).toEqual([
		{ name: "school shirt", temp: undefined },
		{ name: "naked", temp: 1 },
	]);
});

test("Mansion Wardrobe ignores location metadata during clothing repair scans", async ({ page }) => {
	const clothesIndexErrors: string[] = [];
	page.on("console", message => {
		if (message.text().includes("[clothesIndex]")) clothesIndexErrors.push(message.text());
	});

	await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		const V = SC.State.variables;
		const shirt = structuredClone(SC.setup.clothes.upper.find((item: any) => item.name === "school shirt"));
		shirt.integrity = Math.max(1, shirt.integrity_max - 25);
		V.settings.multipleWardrobes = "all";
		V.location = "avery_mansion";
		V.wardrobe_location = "avery_mansion";
		V.wardrobes.avery_mansion.unlocked = true;
		V.wardrobes.avery_mansion.locationRequirement = ["avery_mansion", "alley"];
		V.wardrobes.avery_mansion.upper = [shirt];
	});

	await navigateTo(page, "Mansion Wardrobe");

	expect(await page.locator(".error-view").count()).toBe(0);
	expect(clothesIndexErrors).toEqual([]);
	expect(await page.locator("#wardrobeList").count()).toBe(1);
});
