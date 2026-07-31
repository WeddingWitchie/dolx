import { test, expect } from "@playwright/test";
import * as path from "path";
import { fileURLToPath } from "url";
import { navigateTo, waitForPassage } from "./helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_URL = `file://${path.resolve(__dirname, "../Degrees of Lewdity VERSION.html")}`;

// Mimic the reporting player's device: a high-DPI phone, where the browser must upscale the 256px canvas to device pixels.
// That upscale is exactly where `image-rendering: auto` produced blur.
test.use({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.75 });

test("sidebar character canvas keeps crisp pixel-art scaling on a high-DPI screen", async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem("verifiedAge", "true"));
	await page.goto(GAME_URL);
	await waitForPassage(page);
	await navigateTo(page, "Start2");

	const result = await page.evaluate(() => {
		const main = document.querySelector("canvas.mainCanvas") as HTMLCanvasElement;
		const lighting = document.querySelector("canvas.lighting") as HTMLCanvasElement;
		const mainStyle = getComputedStyle(main);
		const lightingStyle = getComputedStyle(lighting);
		return {
			mainRendering: mainStyle.imageRendering,
			lightingRendering: lightingStyle.imageRendering,
			// Displayed size must equal the intrinsic buffer size (1:1, no CSS pin fighting the buffer).
			mainCssWidth: mainStyle.width,
			mainBufferWidth: main.width,
			mainBufferHeight: main.height,
		};
	});

	expect(result.mainRendering).toBe("pixelated");
	expect(result.lightingRendering).toBe("pixelated");
	expect(result.mainCssWidth).toBe("256px");
	expect(result.mainBufferWidth).toBe(256);
	expect(result.mainBufferHeight).toBe(256);
});

test("canvas model size is deterministic and never mutated asynchronously after load", async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem("verifiedAge", "true"));
	await page.goto(GAME_URL);
	await waitForPassage(page);
	await navigateTo(page, "Start2");

	const immediate = await page.evaluate(() => {
		const W = window as any;
		return { w: W.Renderer.CanvasModels.main.width, h: W.Renderer.CanvasModels.main.height };
	});

	// Wait well past any image load that a probe would have raced against.
	await page.waitForTimeout(2000);

	const settled = await page.evaluate(() => {
		const W = window as any;
		return { w: W.Renderer.CanvasModels.main.width, h: W.Renderer.CanvasModels.main.height };
	});

	expect(immediate).toEqual({ w: 256, h: 256 });
	expect(settled).toEqual(immediate);
});
