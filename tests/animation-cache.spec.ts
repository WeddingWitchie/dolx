import { expect, test } from "@playwright/test";
import * as path from "path";

for (const size of [8, 512]) {
	test(`animation cache reuses canvas buffers within its budget at size ${size}`, async ({ page }) => {
		await page.addScriptTag({ path: path.resolve("game/03-JavaScript/00-libs/renderer.js") });
		const result = await page.evaluate(async size => {
			const renderer = (window as any).Renderer;
			const timers: Function[] = [];
			const frames: FrameRequestCallback[] = [];
			window.setTimeout = ((fn: Function) => {
				timers.push(fn);
				return timers.length;
			}) as any;
			window.requestAnimationFrame = fn => {
				frames.push(fn);
				return frames.length;
			};
			renderer.Animations.cacheProbe = { frames: 160, duration: 100 };
			const target = renderer.createCanvas(size, size);
			const source = document.createElement("canvas");
			source.width = 160 * 8;
			source.height = 8;
			const ctx = source.getContext("2d")!;
			for (let i = 0; i < 160; i++) {
				ctx.fillStyle = `rgb(${i}, 0, 0)`;
				ctx.fillRect(i * 8, 0, 1, 1);
			}
			const animation = renderer.animateLayers(target, [{ src: source, animation: "cacheProbe", width: 8, z: 0 }], null, false);
			const buffers = new Set<HTMLCanvasElement>();
			let wrongPixels = 0;
			let overBudget = false;
			for (let i = 0; i < 320; i++) {
				if (i === 160 && size === 8) {
					target.canvas.width = size / 2;
					target.canvas.height = size / 2;
				}
				frames.shift()!(i * 100);
				await Promise.resolve();
				for (const cached of Object.values(animation.keyframeCaches) as CanvasRenderingContext2D[]) buffers.add(cached.canvas);
				const cachedFrames = Object.values(animation.keyframeCaches) as CanvasRenderingContext2D[];
				overBudget ||= cachedFrames.length > 64 || cachedFrames.reduce((bytes, ctx) => bytes + ctx.canvas.width * ctx.canvas.height * 4, 0) > 16 * 1024 * 1024;
				const pixels = target.getImageData(0, 0, 8, 8).data;
				if (pixels[0] !== i % 160 || pixels[3] !== 255 || pixels[7] !== 0) wrongPixels++;
				timers.shift()!();
			}
			const cached = Object.keys(animation.keyframeCaches).length;
			const finalSize = size === 8 ? size / 2 : size;
			const wrongSizes = (Object.values(animation.keyframeCaches) as CanvasRenderingContext2D[]).filter(
				ctx => ctx.canvas.width !== finalSize || ctx.canvas.height !== finalSize
			).length;
			animation.stop();
			return { allocated: buffers.size, cached, wrongPixels, wrongSizes, overBudget, afterStop: Object.keys(animation.keyframeCaches).length };
		}, size);
		const limit = size === 8 ? 64 : 16;
		expect(result).toEqual({ allocated: limit, cached: limit, wrongPixels: 0, wrongSizes: 0, overBudget: false, afterStop: 0 });
	});
}
