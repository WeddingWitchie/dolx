import { expect, test, type Page } from "@playwright/test";
import * as path from "path";
import { fileURLToPath } from "url";
import { inflateSync } from "zlib";
import { navigateTo, openGame, waitForPassage } from "./helpers.js";

// Canvas and weather tests use file:// sprites; pixel-readback tests also need direct file access.
// Playwright requires launch options at file scope because they create a new worker.
test.use({ launchOptions: { args: ["--allow-file-access-from-files"] } });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_URL = `file://${path.resolve(__dirname, "../Degrees of Lewdity VERSION.html")}`;

const CANVAS_SIZE = 256;
const PROBE_CLASS = "rendering-probe";

async function openCanvasTestGame(page: Page, navigateToStart = false) {
	await page.addInitScript(() => localStorage.setItem("verifiedAge", "true"));
	await page.goto(GAME_URL);
	await waitForPassage(page);

	if (navigateToStart) {
		await navigateTo(page, "Start2");
	}
}

async function addCheckerboardProbe(page: Page, sourceSize: number, displaySize: number) {
	await page.evaluate(
		({ probeClass, sourceSize, displaySize }) => {
			const canvas = document.createElement("canvas");
			canvas.className = probeClass;
			canvas.width = sourceSize;
			canvas.height = sourceSize;
			canvas.style.width = `${displaySize}px`;
			canvas.style.height = `${displaySize}px`;
			canvas.style.position = "fixed";
			canvas.style.inset = "0 auto auto 0";
			canvas.style.zIndex = "2147483647";

			const context = canvas.getContext("2d")!;
			for (let y = 0; y < sourceSize; y++) {
				for (let x = 0; x < sourceSize; x++) {
					context.fillStyle = (x + y) % 2 ? "#fff" : "#000";
					context.fillRect(x, y, 1, 1);
				}
			}

			document.body.append(canvas);
		},
		{ probeClass: PROBE_CLASS, sourceSize, displaySize }
	);
}

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

function getOpaqueGreyLevels(pixels: Buffer | Uint8ClampedArray) {
	const greyLevels = new Set<number>();

	for (let i = 0; i < pixels.length; i += 4) {
		if (pixels[i + 3] === 255) {
			greyLevels.add(pixels[i]);
		}
	}

	return [...greyLevels].sort((a, b) => a - b);
}

/** Layers load asynchronously; give every one of them time to finish registering. */
const SETTLE_MS = 3500;

async function openInGame(page: Page) {
	await openCanvasTestGame(page, true);
	await navigateTo(page, "Bedroom");
	await page.waitForTimeout(SETTLE_MS);
}

/** Every registered animation group, mapped back to the layer that owns it. */
const registeredGroups = () => {
	const W = (window as any).Weather;
	const driver = W.Renderer.AnimationGroup.Driver;
	const owners: { layer: string; inSidebar: boolean }[] = [];
	W.Renderer.Layers.layers.forEach((layer: any, name: string) => {
		if (layer.animationGroup && driver.groups.has(layer.animationGroup)) {
			owners.push({ layer: name, inSidebar: W.sidebar.layers.has(name) });
		}
	});
	return { total: driver.groups.size, running: driver.frameId !== null, owners };
};

const skyState = () => ({
	groups: (window as any).Weather.Renderer.AnimationGroup.Driver.groups.size,
	running: (window as any).Weather.Renderer.AnimationGroup.Driver.frameId !== null,
	loaded: (window as any).Weather.sidebar.loaded.value,
	pendingFrame: (window as any).Weather.sidebar.pendingFrameId !== null,
	pendingLayers: (window as any).Weather.sidebar.pendingLayers.size,
});

test.describe("sidebar canvas", () => {
	// Mimic the reporting player's device: a high-DPI phone, where the browser must upscale the
	// 256px canvas to device pixels. That upscale is exactly where `image-rendering: auto` produced blur.
	test.use({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.75 });

	test("keeps crisp pixel-art scaling on a high-DPI screen", async ({ page }) => {
		await openCanvasTestGame(page, true);

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
		expect(result.mainBufferWidth).toBe(CANVAS_SIZE);
		expect(result.mainBufferHeight).toBe(CANVAS_SIZE);
	});

	test("pixelated produces only hard checkerboard edges at a fractional scale", async ({ page }) => {
		await openCanvasTestGame(page);
		await addCheckerboardProbe(page, 8, 220);

		const checkerboard = page.locator(`canvas.${PROBE_CLASS}`);
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
		await openCanvasTestGame(page);

		const levels = await page.evaluate(() => {
			const render = (renderScale: number) => {
				// Keep this source synthetic: loading an img/sprite under file:// taints the canvas,
				// so getImageData() below would throw SecurityError instead of testing resampling.
				const source = document.createElement("canvas");
				source.width = 8;
				source.height = 8;
				const sourceContext = source.getContext("2d")!;

				for (let y = 0; y < 8; y++) {
					for (let x = 0; x < 8; x++) {
						sourceContext.fillStyle = (x + y) % 2 ? "#fff" : "#000";
						sourceContext.fillRect(x, y, 1, 1);
					}
				}

				const target = document.createElement("canvas");
				target.width = 16;
				target.height = 16;
				const targetContext = target.getContext("2d")!;

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
					if (pixels[i + 3] === 255) {
						greyLevels.add(pixels[i]);
					}
				}

				return [...greyLevels].sort((a, b) => a - b);
			};

			return { reduced: render(0.75), enlarged: render(1.25) };
		});

		expect(levels.reduced).toEqual([0, 255]);
		expect(levels.enlarged).toEqual([0, 255]);
	});

	test("canvas model size is deterministic and never mutated asynchronously after load", async ({ page }) => {
		await openCanvasTestGame(page, true);

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

		expect(immediate).toEqual({ w: CANVAS_SIZE, h: CANVAS_SIZE });
		expect(settled).toEqual(immediate);
	});
});

test.describe("sidebar canvas at fractional device scale", () => {
	// Reproduce the supplied desktop recording: a 256px sidebar canvas viewed at 125% display scaling.
	test.use({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.25 });

	test("keeps one-pixel canvas edges crisp", async ({ page }) => {
		await openCanvasTestGame(page);
		await addCheckerboardProbe(page, CANVAS_SIZE, CANVAS_SIZE);

		const probe = page.locator(`canvas.${PROBE_CLASS}`);
		expect(await probe.evaluate(canvas => getComputedStyle(canvas).imageRendering)).toBe("pixelated");

		const { pixels } = decodePngRgba(await probe.screenshot({ scale: "device" }));
		expect(getOpaqueGreyLevels(pixels)).toEqual([0, 255]);
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
			await openCanvasTestGame(page, true);
			await page.locator(".doll-expand").click();
			await page.waitForTimeout(400);

			const canvases = await page.evaluate(() => {
				const dpr = window.devicePixelRatio || 1;
				const wrapper = document.querySelector(".doll-overlay-canvas") as HTMLElement;

				return Array.from(wrapper.querySelectorAll("canvas")).map(canvas => {
					const rect = canvas.getBoundingClientRect();
					return {
						devicePixelsPerSourcePixelX: (rect.width * dpr) / canvas.width,
						devicePixelsPerSourcePixelY: (rect.height * dpr) / canvas.height,
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

			for (const canvas of canvases) {
				// A whole number of device pixels per source pixel, and square pixels.
				expect(isWhole(canvas.devicePixelsPerSourcePixelX)).toBe(true);
				expect(isWhole(canvas.devicePixelsPerSourcePixelY)).toBe(true);
				expect(canvas.devicePixelsPerSourcePixelX).toBe(canvas.devicePixelsPerSourcePixelY);
				expect(canvas.devicePixelsPerSourcePixelX).toBeGreaterThanOrEqual(0.95);

				// Sitting on the device pixel grid, not straddling it.
				expect(isWhole(canvas.deviceLeft)).toBe(true);
				expect(isWhole(canvas.deviceTop)).toBe(true);
			}

			// Every layer (body + lighting) must land identically or they drift apart.
			const firstCanvas = canvases[0];
			for (const canvas of canvases) {
				expect(canvas.width).toBe(firstCanvas.width);
				expect(canvas.height).toBe(firstCanvas.height);
				expect(canvas.deviceLeft).toBe(firstCanvas.deviceLeft);
				expect(canvas.deviceTop).toBe(firstCanvas.deviceTop);
			}
		});
	});
}

/*
 * An image pack that draws finer than the doll's stock 256-pixel model makes the model render at
 * the pack's resolution (Renderer.artScale). These check that raising it changes only the pixel
 * density: same sprite, same place, same layout.
 *
 * The art here is still the stock art, so the 2x doll is a magnified copy rather than a more
 * detailed one - which is exactly what makes it comparable.
 */

/** Average alpha over a 32x32 grid, so canvases of different sizes can be compared. */
async function silhouette(page: Page) {
	return page.evaluate(() => {
		const canvas = document.querySelector("#img canvas.mainCanvas") as HTMLCanvasElement;
		const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
		const cell = canvas.width / 32;
		const grid: number[] = [];
		for (let gridY = 0; gridY < 32; gridY++) {
			for (let gridX = 0; gridX < 32; gridX++) {
				let sum = 0;
				let count = 0;
				for (let y = Math.floor(gridY * cell); y < Math.floor((gridY + 1) * cell); y++) {
					for (let x = Math.floor(gridX * cell); x < Math.floor((gridX + 1) * cell); x++) {
						sum += data[(y * canvas.width + x) * 4 + 3];
						count++;
					}
				}
				grid.push(count ? sum / count : 0);
			}
		}
		return { size: `${canvas.width}x${canvas.height}`, grid };
	});
}

test.describe("doll rendered at an image pack's resolution", () => {
	test("draws the same sprite in the same place, at twice the pixel density", async ({ page }) => {
		await openGame(page);
		await navigateTo(page, "Start2");
		await page.waitForTimeout(1500);
		const stock = await silhouette(page);

		await page.evaluate(() => (window as any).Renderer.setArtScale(2));
		await navigateTo(page, "Start2");
		await page.waitForTimeout(2500);
		const scaled = await silhouette(page);

		expect(stock.size).toBe("256x256");
		expect(scaled.size).toBe("512x512");

		// Layer offsets, sub-sprite frames and masks are all authored in the stock space; if any of
		// them failed to scale the sprite would land somewhere else, or be drawn doubled or halved.
		const diffs = stock.grid.map((value, i) => Math.abs(value - scaled.grid[i]));
		const meanDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
		expect(meanDiff).toBeLessThan(6);
	});

	test("keeps the sidebar box the same size and stops using nearest-neighbour", async ({ page }) => {
		await openGame(page);
		await navigateTo(page, "Start2");
		await page.evaluate(() => (window as any).Renderer.setArtScale(2));
		await navigateTo(page, "Start2");
		await page.waitForTimeout(1500);

		const sidebar = await page.evaluate(() => {
			const canvas = document.querySelector("#img canvas.mainCanvas") as HTMLCanvasElement;
			const rect = canvas.getBoundingClientRect();
			return { bitmap: canvas.width, css: rect.width, rendering: getComputedStyle(canvas).imageRendering };
		});

		expect(sidebar.bitmap).toBe(512);
		expect(sidebar.css).toBe(256);
		expect(sidebar.rendering).toBe("auto");
	});

	test("leaves lighting layers outside the sidebar alone", async ({ page }) => {
		/*
		 * The shop mannequin, hairdresser, mirror and options preview each draw a lighting layer
		 * beside a doll that the sidebar sizer knows nothing about. While that sizer matched the
		 * `lighting` class anywhere on the page, it stretched those to the sidebar's size - 358px
		 * under the enlarged-canvas option - while the doll beside them stayed put, leaving the
		 * light offset from the body.
		 */
		await openGame(page);
		await navigateTo(page, "Start2");
		await page.waitForTimeout(1000);

		const sizes = await page.evaluate(() => {
			const w = window as any;
			const elsewhere = document.createElement("div");
			const light = document.createElement("canvas");
			light.className = "lighting";
			light.width = 256;
			light.height = 256;
			elsewhere.append(light);
			document.body.append(elsewhere);

			w.sizeSidebarDollCanvases(358);
			const outside = light.style.width;
			const inside = (document.querySelector("#img canvas.lighting") as HTMLElement)?.style.width;
			elsewhere.remove();
			return { outside, inside };
		});

		expect(sizes.outside).toBe("");
		expect(sizes.inside).toBe("358px");
	});

	test("gives the popup's doll and lighting layers one box and one scaling mode", async ({ page }) => {
		await openGame(page);
		await navigateTo(page, "Start2");
		await page.evaluate(() => (window as any).Renderer.setArtScale(2));
		await navigateTo(page, "Start2");
		await page.waitForTimeout(1500);
		await page.evaluate(() => document.querySelector<HTMLElement>(".doll-expand")?.click());
		await page.waitForTimeout(1500);

		const layers = await page.evaluate(() =>
			[...document.querySelectorAll(".doll-overlay-canvas canvas")].map(canvas => {
				const rect = canvas.getBoundingClientRect();
				return {
					bitmap: (canvas as HTMLCanvasElement).width,
					box: `${rect.width}x${rect.height}@${rect.left},${rect.top}`,
					rendering: getComputedStyle(canvas).imageRendering,
				};
			})
		);

		expect(layers.length).toBeGreaterThan(1);
		// The lighting layer stays at the stock size, so it only lines up if the box is shared.
		expect(new Set(layers.map(layer => layer.bitmap)).size).toBe(2);
		expect(new Set(layers.map(layer => layer.box)).size).toBe(1);
		expect(layers.every(layer => layer.rendering === "auto")).toBe(true);
	});
});

test("no animation group outlives the sky that started it", async ({ page }) => {
	await openInGame(page);

	// A layer still loading when its sky was torn down used to finish and start its animations
	// anyway, leaving a group nothing could stop.
	const live = await page.evaluate(registeredGroups);
	const orphans = live.owners.filter(o => !o.inSidebar);
	expect(orphans, `orphaned animation groups: ${JSON.stringify(orphans)}`).toEqual([]);
	expect(live.owners.length).toBe(live.total);
	expect(live.total).toBeGreaterThan(0);
});

test("stopAll deregisters every group and stops the shared driver", async ({ page }) => {
	await openInGame(page);
	expect((await page.evaluate(skyState)).groups).toBeGreaterThan(0);

	await page.evaluate(() => {
		const AG = (window as any).Weather.Renderer.AnimationGroup;
		(window as any).__updates = 0;
		const original = AG.prototype.updateAnimations;
		AG.prototype.updateAnimations = function (...args: any[]) {
			(window as any).__updates++;
			return original.apply(this, args);
		};
	});
	await page.evaluate(() => (window as any).Weather.sidebar.stopAll());
	await page.waitForTimeout(300);
	const before = await page.evaluate(() => (window as any).__updates);
	await page.waitForTimeout(700);

	const after = await page.evaluate(skyState);
	expect(after.groups, "stopAll must leave no registered group").toBe(0);
	expect(after.running, "the shared rAF loop must stop when nothing is registered").toBe(false);
	expect(after.pendingFrame).toBe(false);
	expect(after.pendingLayers, "the batch queue must drain on teardown").toBe(0);
	expect(await page.evaluate(() => (window as any).__updates), "nothing may animate after stopAll").toBe(before);
});

test("turning the sidebar renderer off halts it, and back on restores it", async ({ page }) => {
	await openInGame(page);

	await page.evaluate(() => {
		(window as any).SugarCube.State.variables.options.weatherUpdate = false;
		(window as any).Weather.Observables.checkForUpdate(true);
	});
	await page.waitForTimeout(400);
	const off = await page.evaluate(skyState);
	expect(off, "the lag workaround must actually stop the renderer").toMatchObject({ groups: 0, running: false, loaded: false });

	await page.evaluate(() => {
		(window as any).SugarCube.State.variables.options.weatherUpdate = true;
		(window as any).Weather.Observables.checkForUpdate(true);
	});
	await page.waitForTimeout(SETTLE_MS);
	const on = await page.evaluate(skyState);
	expect(on.loaded).toBe(true);
	expect(on.groups).toBeGreaterThan(0);
});

test("composites never overlap on the shared scratch canvas", async ({ page }) => {
	await openInGame(page);

	// Compositing is async and every pass shares one canvas, so two passes running at once
	// would draw over each other.
	await page.evaluate(() => {
		const sky = (window as any).Weather.sidebar;
		const metrics: any = ((window as any).__c = { inFlight: 0, overlaps: 0, composites: 0 });
		const original = sky.composite.bind(sky);
		sky.composite = async (...args: any[]) => {
			if (metrics.inFlight > 0) metrics.overlaps++;
			metrics.inFlight++;
			metrics.composites++;
			try {
				return await original(...args);
			} finally {
				metrics.inFlight--;
			}
		};
	});

	await page.waitForTimeout(1500);
	await page.evaluate(() => {
		const sky = (window as any).Weather.sidebar;
		for (let i = 0; i < 40; i++) {
			sky.drawLayers("clouds");
			sky.requestDrawLayers("sky");
			sky.drawLayers();
		}
	});
	await page.waitForTimeout(800);

	const metrics = await page.evaluate(() => ({ ...(window as any).__c }));
	expect(metrics.composites, "the sky should still be compositing").toBeGreaterThan(0);
	expect(metrics.overlaps, "two composite passes must never run at once").toBe(0);
	// The queue is a Set of layer names, so it is bounded by the layer count no matter how hard
	// the draw path is hammered. It drains to empty once the sky stops (asserted in the stopAll test).
	const layerCount = await page.evaluate(() => (window as any).Weather.sidebar.layers.size);
	expect((await page.evaluate(skyState)).pendingLayers, "the batch queue must stay bounded").toBeLessThanOrEqual(layerCount);
});
