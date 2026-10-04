import { expect, test } from "@playwright/test";
import * as path from "path";

test.beforeEach(async ({ page }) => {
	await page.evaluate(() => {
		(window as any).Weather = {
			Renderer: {
				Effects: {
					effects: new Map(),
					add(effect: any) {
						this.effects.set(effect.name, effect);
					},
				},
			},
		};
		(window as any).V = { weatherObj: {} };
		(window as any).T = {};
		(window as any).resolveValue = (value: any, fallback: any) => (typeof value === "function" ? value() : value ?? fallback);
		(window as any).BaseCanvas = class {
			element = document.createElement("canvas");
			ctx: CanvasRenderingContext2D;
			constructor(width: number, height: number) {
				this.element.width = width;
				this.element.height = height;
				this.ctx = this.element.getContext("2d")!;
			}
			clear() {
				this.ctx.clearRect(0, 0, this.element.width, this.element.height);
			}
		};
	});
	for (const file of ["weather-Animation", "weather-AnimationGroup", "weather-Particle", "weather-ParticleEmitter"]) {
		await page.addScriptTag({ path: path.resolve(`game/03-JavaScript/weather/03-canvas/01-src/00-classes/${file}.js`) });
	}
	await page.addScriptTag({ path: path.resolve("game/03-JavaScript/weather/03-canvas/02-lib/00-effects/effects-precipitation.js") });
});

test("rain splashes finish instead of continuously replacing their particles", async ({ page }) => {
	const result = await page.evaluate(async () => {
		const w = window as any;
		const rain = w.Weather.Renderer.Effects.effects.get("particleRain");
		const group = new w.Weather.Renderer.AnimationGroup({ updateRate: 30 }, () => {});
		const effect = {
			...rain.defaultParameters,
			canvas: new w.BaseCanvas(32, 32),
			parentLayer: { animationGroup: group },
			topColor: "#ffffff",
			bottomColor: "#ffffff",
		} as any;
		await rain.init.call(effect);
		effect.particleEmitter.update = () => {};
		effect.particleEmitter.onCollision({ position: { x: 10, y: 30 }, velocity: { x: 0, y: 10 }, age: 1, collisionTime: 1, length: 3 });
		group.onUpdate();
		await Promise.resolve();
		const splash = effect.splashEmitters[0];
		const initialCount = splash.particles.length;
		for (let i = 0; i < 625; i++) splash.update(0.016);
		return { initialCount, active: splash.active, count: splash.particles.length };
	});
	expect(result).toEqual({ initialCount: 2, active: false, count: 0 });
});

test("destroyed emitters cannot prewarm after asynchronous initialization", async ({ page }) => {
	const count = await page.evaluate(async () => {
		const w = window as any;
		let finish!: () => void;
		w.Image = class extends Image {
			decode() {
				return new Promise<void>(resolve => {
					finish = resolve;
				});
			}
		};
		const emitter = new w.Weather.Renderer.ParticleEmitter(new w.BaseCanvas(32, 32).ctx, {
			maxParticles: 100,
			preWarm: true,
			initialSettings: { shape: "image", src: "missing.png" },
		});
		emitter.destroy();
		finish();
		await Promise.resolve();
		return emitter.particles.length;
	});
	expect(count).toBe(0);
});

test("group teardown restores its callback and repeated initialization does not stack updates", async ({ page }) => {
	const result = await page.evaluate(async () => {
		const w = window as any;
		let draws = 0;
		const original = () => draws++;
		const group = new w.Weather.Renderer.AnimationGroup({ updateRate: 30 }, original);
		let updates = 0;
		for (let i = 0; i < 100; i++) {
			const emitter = new w.Weather.Renderer.ParticleEmitter(new w.BaseCanvas(8, 8).ctx, { animationGroup: group, preWarm: true });
			emitter.update = () => updates++;
			group.onUpdate();
			w.Weather.Renderer.ParticleEmitter.destroyGroup(group);
			await Promise.resolve();
			if (emitter.particles.length || group.animations.size || group.onUpdate !== original) throw new Error("Emitter teardown left stale state");
		}
		return { draws, updates };
	});
	expect(result).toEqual({ draws: 100, updates: 100 });
});
