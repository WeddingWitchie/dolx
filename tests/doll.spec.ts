import { test, expect } from "@playwright/test";
import * as path from "path";
import { fileURLToPath } from "url";
import { navigateTo, waitForPassage, type Page } from "./helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_URL = `file://${path.resolve(__dirname, "../Degrees of Lewdity VERSION.html")}`;

async function openCompiledGame(page: Page) {
	await page.addInitScript(() => localStorage.setItem("verifiedAge", "true"));
	await page.goto(GAME_URL);
	await waitForPassage(page);
	await navigateTo(page, "Start2");
}

test.describe("Doll native integration", () => {
	test.beforeEach(async ({ page }) => {
		await openCompiledGame(page);
	});

	test("sidebar doll opens and closes an independently cached full-size overlay", async ({ page }) => {
		await page.locator(".doll-expand").click();

		const overlay = page.locator('#customOverlay[data-overlay="dollCanvas"]');
		await expect(overlay).toBeVisible();
		await expect(overlay.locator(".doll-overlay-canvas canvas")).toHaveCount(2);

		const cacheSlots = await page.evaluate(() => {
			const W = window as any;
			return {
				main: Object.keys(W.Renderer.CanvasModelCaches.main || {}),
				lighting: Object.keys(W.Renderer.CanvasModelCaches.lighting || {}),
			};
		});
		expect(cacheSlots.main).toContain("sidebar");
		expect(cacheSlots.main).toContain("dollOverlay");
		expect(cacheSlots.lighting).toContain("sidebar");
		expect(cacheSlots.lighting).toContain("dollOverlay");

		await page.evaluate(() => (window as any).closeOverlay());
		await expect(overlay).toBeHidden();
	});

	test("highlight style compiles supported side and fringe layers with real assets", async ({ page }) => {
		const result = await page.evaluate(async () => {
			const W = window as any;
			const SC = W.SugarCube;
			const V = SC.State.variables;

			V.hairtype = "default";
			V.fringetype = "default";
			V.hairColourStyle = "highlights";
			V.hairFringeColourStyle = "highlights";
			V.hairColourGradient = { style: "highlights", colours: ["red", "blue"] };
			V.hairFringeColourGradient = { style: "highlights", colours: ["red", "blue"] };

			const output = document.createElement("div");
			// eslint-disable-next-line no-new
			new SC.Wikifier(output, '<<canvasimg "dollTest" "dollHighlightTest">>');
			document.body.append(output);
			await new Promise(resolve => setTimeout(resolve, 500));

			const model = W.Renderer.CanvasModelCaches.main.dollHighlightTest;
			const layers = model.compile(model.options);
			const sides = layers.find((layer: any) => layer.name === "hair_sides_highlights");
			const fringe = layers.find((layer: any) => layer.name === "hair_fringe_highlights");
			const imageErrors = Object.keys(W.Renderer.ImageErrors).filter((src: string) => src.includes("color2_highlights"));
			output.remove();

			return {
				sides: { show: sides.show, src: sides.src },
				fringe: { show: fringe.show, src: fringe.src },
				imageErrors,
			};
		});

		expect(result.sides).toEqual({
			show: true,
			src: "img/hair/sides/default/color2_highlights.png",
		});
		expect(result.fringe).toEqual({
			show: true,
			src: "img/hair/fringe/default/color2_highlights.png",
		});
		expect(result.imageErrors).toEqual([]);
	});
});
