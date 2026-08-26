import { test, expect } from "@playwright/test";
import * as path from "path";
import { fileURLToPath } from "url";
import { inflateSync } from "zlib";
import { assertNoErrors, navigateTo, waitForPassage } from "./helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_URL = `file://${path.resolve(__dirname, "../Degrees of Lewdity VERSION.html")}`;

function decodePngRgba(png: Buffer) {
	let offset = 8;
	let width = 0;
	let height = 0;
	let channels = 0;
	const idat: Buffer[] = [];
	while (offset < png.length) {
		const length = png.readUInt32BE(offset);
		const type = png.toString("ascii", offset + 4, offset + 8);
		const data = png.subarray(offset + 8, offset + 8 + length);
		if (type === "IHDR") {
			width = data.readUInt32BE(0);
			height = data.readUInt32BE(4);
			expect(data[8]).toBe(8);
			expect([2, 6]).toContain(data[9]);
			expect(data[12]).toBe(0);
			channels = data[9] === 6 ? 4 : 3;
		} else if (type === "IDAT") {
			idat.push(data);
		}
		offset += length + 12;
	}

	const packed = inflateSync(Buffer.concat(idat));
	const stride = width * channels;
	const decoded = Buffer.alloc(stride * height);
	const paeth = (a: number, b: number, c: number) => {
		const p = a + b - c;
		const pa = Math.abs(p - a);
		const pb = Math.abs(p - b);
		const pc = Math.abs(p - c);
		return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
	};

	for (let y = 0; y < height; y++) {
		const filter = packed[y * (stride + 1)];
		for (let x = 0; x < stride; x++) {
			const raw = packed[y * (stride + 1) + x + 1];
			const left = x >= channels ? decoded[y * stride + x - channels] : 0;
			const up = y ? decoded[(y - 1) * stride + x] : 0;
			const upperLeft = y && x >= channels ? decoded[(y - 1) * stride + x - channels] : 0;
			const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : paeth(left, up, upperLeft);
			decoded[y * stride + x] = (raw + predictor) & 0xff;
		}
	}
	const pixels = Buffer.alloc(width * height * 4);
	for (let source = 0, target = 0; source < decoded.length; source += channels, target += 4) {
		pixels[target] = decoded[source];
		pixels[target + 1] = decoded[source + 1];
		pixels[target + 2] = decoded[source + 2];
		pixels[target + 3] = channels === 4 ? decoded[source + 3] : 255;
	}
	return { width, height, pixels };
}

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

	test("pixelated produces only hard checkerboard edges at a fractional scale", async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem("verifiedAge", "true"));
		await page.goto(GAME_URL);
		await waitForPassage(page);

		const checkerboard = page.locator("canvas.rendering-probe");
		await page.evaluate(() => {
			const canvas = document.createElement("canvas");
			canvas.className = "rendering-probe";
			canvas.width = 8;
			canvas.height = 8;
			canvas.style.width = "220px";
			canvas.style.height = "220px";
			canvas.style.position = "fixed";
			canvas.style.inset = "0 auto auto 0";
			canvas.style.zIndex = "2147483647";
			const context = canvas.getContext("2d");
			for (let y = 0; y < 8; y++) {
				for (let x = 0; x < 8; x++) {
					context.fillStyle = (x + y) % 2 ? "#fff" : "#000";
					context.fillRect(x, y, 1, 1);
				}
			}
			document.body.append(canvas);
		});

		expect(await checkerboard.evaluate(canvas => getComputedStyle(canvas).imageRendering)).toBe("pixelated");
		const dpr = await page.evaluate(() => window.devicePixelRatio);
		const { width, pixels } = decodePngRgba(await page.screenshot({ scale: "device" }));
		const probeSize = Math.round(220 * dpr);
		const greyLevels = new Set<number>();
		let grayscale = true;
		let opaque = true;
		for (let y = 1; y < probeSize - 1; y++) {
			for (let x = 1; x < probeSize - 1; x++) {
				const i = (y * width + x) * 4;
				grayscale &&= pixels[i] === pixels[i + 1] && pixels[i] === pixels[i + 2];
				opaque &&= pixels[i + 3] === 255;
				greyLevels.add(pixels[i]);
			}
		}
		expect(grayscale).toBe(true);
		expect(opaque).toBe(true);
		expect([...greyLevels].sort((a, b) => a - b)).toEqual([0, 255]);
	});

	test("keeps body-size reductions and enlargements crisp", async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem("verifiedAge", "true"));
		await page.goto(GAME_URL);
		await waitForPassage(page);

		const levels = await page.evaluate(() => {
			const render = (renderScale: number) => {
				// Keep this source synthetic: loading an img/ sprite under file:// taints the canvas,
				// so getImageData() below would throw SecurityError instead of testing resampling.
				const source = document.createElement("canvas");
				source.width = 8;
				source.height = 8;
				const sourceContext = source.getContext("2d");
				for (let y = 0; y < 8; y++) {
					for (let x = 0; x < 8; x++) {
						sourceContext.fillStyle = (x + y) % 2 ? "#fff" : "#000";
						sourceContext.fillRect(x, y, 1, 1);
					}
				}

				const target = document.createElement("canvas");
				target.width = 16;
				target.height = 16;
				const targetContext = target.getContext("2d");
				(window as any).Renderer.composeProcessedLayer({ cachedImage: source, alpha: 1, renderScale }, targetContext, {
					frameWidth: 16,
					frameCount: 1,
					subspriteWidth: 8,
					subspriteHeight: 8,
					subspriteFrameCount: 1,
					dx: 2,
					dy: 2,
					height: 16,
				});

				const pixels = targetContext.getImageData(0, 0, 16, 16).data;
				const greyLevels = new Set<number>();
				for (let i = 0; i < pixels.length; i += 4) {
					if (pixels[i + 3] === 255) greyLevels.add(pixels[i]);
				}
				return [...greyLevels].sort((a, b) => a - b);
			};
			return { reduced: render(0.75), enlarged: render(1.25) };
		});

		expect(levels.reduced).toEqual([0, 255]);
		expect(levels.enlarged).toEqual([0, 255]);
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

	test("keeps body-size scaling consistent across render paths", async ({ page }) => {
		const pageErrors: string[] = [];
		page.on("pageerror", error => pageErrors.push(error.message));
		await page.addInitScript(() => localStorage.setItem("verifiedAge", "true"));
		await page.goto(GAME_URL);
		await waitForPassage(page);
		await navigateTo(page, "Start2");
		expect(await page.evaluate(() => (window as any).SugarCube.State.variables.options.bodySizeScaling)).toBe(false);

		const cases = [
			{ bodySize: 1, animations: true, enabled: true, scale: 1 },
			{ bodySize: 0, animations: true, enabled: true, scale: 0.985 },
			{ bodySize: -1, animations: true, enabled: true, scale: 0.97 },
			{ bodySize: 1, animations: false, enabled: true, scale: 1 },
			{ bodySize: 0, animations: false, enabled: true, scale: 0.985 },
			{ bodySize: -1, animations: false, enabled: true, scale: 0.97 },
			{ bodySize: 2, animations: true, enabled: true, scale: 1 },
			{ bodySize: 2.5, animations: true, enabled: true, scale: 1.01 },
			{ bodySize: 3, animations: true, enabled: true, scale: 1.02 },
			{ bodySize: 4, animations: true, enabled: true, scale: 1.03 },
			{ bodySize: -1, animations: true, enabled: false, scale: 1 },
		];

		for (const testCase of cases) {
			const result = await page.evaluate(async ({ bodySize, animations, enabled }) => {
				const W = window as any;
				W.SugarCube.State.variables.bodysize = bodySize;
				W.SugarCube.State.variables.options.sidebarAnimations = animations;
				W.SugarCube.State.variables.options.bodySizeScaling = enabled;
				W.SugarCube.Wikifier.wikifyEval('<<replace "#img">><<canvasimg "mainCanvas">><</replace>>');
				await new Promise(resolve => setTimeout(resolve, 100));
				const main = document.querySelector("canvas.mainCanvas") as HTMLCanvasElement;
				const lighting = document.querySelector("canvas.lighting") as HTMLCanvasElement;
				return {
					bodySizeScale: W.Renderer.CanvasModelCaches.main.sidebar.options.body_size_scale,
					mainCallerClass: main.classList.contains("mainCanvas"),
					mainRendering: getComputedStyle(main).imageRendering,
					lightingRendering: getComputedStyle(lighting).imageRendering,
				};
			}, testCase);

			expect(result.bodySizeScale).toBe(testCase.scale);
			expect(result.mainCallerClass).toBe(true);
			expect(result.mainRendering).toBe("pixelated");
			expect(result.lightingRendering).toBe("pixelated");
		}

		await assertNoErrors(page);
		expect(pageErrors).toEqual([]);
	});
});

test.describe("sidebar canvas at fractional device scale", () => {
	// Reproduce the supplied desktop recording: a 256px sidebar canvas viewed at 125% display scaling.
	test.use({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.25 });

	test("keeps one-pixel canvas edges crisp", async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem("verifiedAge", "true"));
		await page.goto(GAME_URL);
		await waitForPassage(page);

		const probe = page.locator("canvas.rendering-probe");
		await page.evaluate(() => {
			const canvas = document.createElement("canvas");
			canvas.className = "rendering-probe";
			canvas.width = 256;
			canvas.height = 256;
			canvas.style.width = "256px";
			canvas.style.height = "256px";
			canvas.style.position = "fixed";
			canvas.style.inset = "0 auto auto 0";
			canvas.style.zIndex = "2147483647";
			const context = canvas.getContext("2d");
			for (let y = 0; y < 256; y++) {
				for (let x = 0; x < 256; x++) {
					context.fillStyle = (x + y) % 2 ? "#fff" : "#000";
					context.fillRect(x, y, 1, 1);
				}
			}
			document.body.append(canvas);
		});

		expect(await probe.evaluate(canvas => getComputedStyle(canvas).imageRendering)).toBe("pixelated");
		const { pixels } = decodePngRgba(await probe.screenshot({ scale: "device" }));
		const greyLevels = new Set<number>();
		for (let i = 0; i < pixels.length; i += 4) {
			if (pixels[i + 3] === 255) greyLevels.add(pixels[i]);
		}
		expect([...greyLevels].sort((a, b) => a - b)).toEqual([0, 255]);
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
