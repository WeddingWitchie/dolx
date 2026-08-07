import { test, expect } from "@playwright/test";
import { openGame, assertNoErrors } from "./helpers";

test("decoMod page buttons switch panels", async ({ page }) => {
	await openGame(page);

	await page.evaluate(() => {
		const host = document.createElement("div");
		host.id = "decoModTestHost";
		document.querySelector("#passages")!.appendChild(host);
		new (window as any).SugarCube.Wikifier(host, "<<mirrorMood>>");
	});

	await assertNoErrors(page);

	const page1 = page.locator("#fg-bg1");
	const page2 = page.locator("#fg-bg2");

	await expect(page1).toBeVisible();
	await expect(page2).toBeHidden();

	await page.locator("#nextButton button").click();
	await expect(page1).toBeHidden();
	await expect(page2).toBeVisible();

	await page.locator("#backButton button").click();
	await expect(page1).toBeVisible();
	await expect(page2).toBeHidden();

	await assertNoErrors(page);
});
