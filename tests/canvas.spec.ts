import { test, expect } from "@playwright/test";
import * as path from "path";
import { fileURLToPath } from "url";
import { navigateTo, waitForPassage } from "./helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_URL = `file://${path.resolve(__dirname, "../Degrees of Lewdity VERSION.html")}`;

test.describe("sidebar canvas", () => {
	// Mimic the reporting player's device: a high-DPI phone, where the browser must upscale the
	// 256px canvas to device pixels. That upscale is exactly where `image-rendering: auto` produced blur.
	test.use({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.75 });

	test("keeps crisp pixel-art scaling on a high-DPI screen", async ({ page }) => {
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
});

/*
 * The doll popup used to stretch the 256x256 canvas to the overlay's full height, landing on ~3.9x at a
 * fractional offset. Pixel art only survives whole-number scaling on a whole pixel, otherwise nearest-neighbour
 * gives some source pixels one screen pixel more than their neighbours - enough to turn a square nostril into
 * a rectangle. Check it lands exactly, at several device pixel ratios (i.e. browser zoom levels).
 */
for (const deviceScaleFactor of [1, 1.5, 2.75]) {
	test.describe(`doll popup at devicePixelRatio ${deviceScaleFactor}`, () => {
		test.use({ viewport: { width: 1280, height: 900 }, deviceScaleFactor });

		test("scales the sprite by a whole number of device pixels, on a whole device pixel", async ({ page }) => {
			await page.addInitScript(() => localStorage.setItem("verifiedAge", "true"));
			await page.goto(GAME_URL);
			await waitForPassage(page);
			await navigateTo(page, "Start2");
			await page.locator(".doll-expand").click();
			await page.waitForTimeout(400);

			const canvases = await page.evaluate(() => {
				const dpr = window.devicePixelRatio || 1;
				const wrapper = document.querySelector(".doll-overlay-canvas") as HTMLElement;
				return Array.from(wrapper.querySelectorAll("canvas")).map(canvas => {
					const c = canvas as HTMLCanvasElement;
					const rect = c.getBoundingClientRect();
					return {
						devicePixelsPerSourcePixelX: (rect.width * dpr) / c.width,
						devicePixelsPerSourcePixelY: (rect.height * dpr) / c.height,
						deviceLeft: rect.left * dpr,
						deviceTop: rect.top * dpr,
						width: rect.width,
						height: rect.height,
					};
				});
			});

			expect(canvases.length).toBeGreaterThan(0);
			/*
			 * Chromium quantises CSS lengths to 1/64px, so at a fractional devicePixelRatio the requested size
			 * cannot be expressed exactly - dpr 1.5 asks for 682.666px and gets 682.65625px. The residual is
			 * ~0.016 of a device pixel, i.e. invisible; the bug this guards against was a whole device pixel of
			 * variation between neighbouring source pixels. Assert to well within one device pixel.
			 */
			const isWhole = (n: number) => Math.abs(n - Math.round(n)) < 0.05;

			for (const c of canvases) {
				// A whole number of device pixels per source pixel, and square pixels.
				expect(isWhole(c.devicePixelsPerSourcePixelX)).toBe(true);
				expect(isWhole(c.devicePixelsPerSourcePixelY)).toBe(true);
				expect(c.devicePixelsPerSourcePixelX).toBe(c.devicePixelsPerSourcePixelY);
				expect(c.devicePixelsPerSourcePixelX).toBeGreaterThanOrEqual(0.95);
				// Sitting on the device pixel grid, not straddling it.
				expect(isWhole(c.deviceLeft)).toBe(true);
				expect(isWhole(c.deviceTop)).toBe(true);
			}

			// Every layer (body + lighting) must land identically or they drift apart.
			for (const c of canvases) {
				expect(c.width).toBe(canvases[0].width);
				expect(c.height).toBe(canvases[0].height);
				expect(c.deviceLeft).toBe(canvases[0].deviceLeft);
				expect(c.deviceTop).toBe(canvases[0].deviceTop);
			}
		});
	});
}
