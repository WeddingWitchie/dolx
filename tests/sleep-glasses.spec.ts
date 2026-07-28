import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { navigateTo, assertNoErrors, waitForPassage, type Page } from "./helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_URL = `file://${path.resolve(__dirname, "../Degrees of Lewdity VERSION.html")}`;

async function openCompiledGame(page: Page) {
	await page.addInitScript(() => localStorage.setItem("verifiedAge", "true"));
	await page.goto(GAME_URL);
	await waitForPassage(page);
	await navigateTo(page, "Start2");
}

test("sleeping in glasses uses one 32% worn-only break check", async ({ page }) => {
	const source = fs.readFileSync(path.resolve(__dirname, "../game/base-system/sleep.twee"), "utf-8");
	expect(source).toContain("random(1, 100) lte 32");

	await openCompiledGame(page);

	const runChecks = (count: number, didSleep: boolean, cursed = false) =>
		page.evaluate(
			({ count, didSleep, cursed }) => {
				const SC = (window as any).SugarCube;
				const V = SC.State.variables;
				const glasses = SC.setup.clothes.face.find((item: any) => item.name === "glasses");
				const carried = SC.setup.clothes.face.find((item: any) => item.name === "teardrop glasses");
				V.clothingrebuy = 0;
				let breaks = 0;
				const failures: string[] = [];

				for (let i = 0; i < count; i++) {
					V.worn.face = Object.assign({}, glasses, { type: [...glasses.type], cursed: cursed ? 1 : 0 });
					V.carried.face = Object.assign({}, carried, { type: [...carried.type] });
					const output = document.createElement("div");
					const rendered = new SC.Wikifier(output, `<<sleepGlasses ${didSleep ? "true" : "false"}>>`);
					if (rendered == null) failures.push("widget did not render");
					if (V.worn.face.name === "naked") {
						breaks++;
						if (!output.textContent?.includes("Your glasses snapped while you slept.")) failures.push("missing text");
						if (V.carried.face.name !== "teardrop glasses") failures.push("carried item destroyed");
					}
				}

				return {
					breaks,
					failures,
				};
			},
			{ count, didSleep, cursed }
		);

	const normalSleep = await runChecks(200, true);
	expect(normalSleep.breaks).toBeGreaterThanOrEqual(40);
	expect(normalSleep.breaks).toBeLessThanOrEqual(90);
	expect(normalSleep.failures).toEqual([]);

	expect((await runChecks(50, false)).breaks).toBe(0);
	expect((await runChecks(50, true, true)).breaks).toBe(0);

	await assertNoErrors(page);
});
