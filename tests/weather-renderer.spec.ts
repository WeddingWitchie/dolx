import { expect, test, type Page } from "@playwright/test";
import * as path from "path";
import { fileURLToPath } from "url";
import { navigateTo, waitForPassage } from "./helpers.js";

// Sprites are loaded over file://, same as the other canvas tests.
test.use({ launchOptions: { args: ["--allow-file-access-from-files"] } });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_URL = `file://${path.resolve(__dirname, "../Degrees of Lewdity VERSION.html")}`;

/** Layers load asynchronously; give every one of them time to finish registering. */
const SETTLE_MS = 3500;

async function openInGame(page: Page) {
	await page.addInitScript(() => localStorage.setItem("verifiedAge", "true"));
	await page.goto(GAME_URL);
	await waitForPassage(page);
	await navigateTo(page, "Start2");
	await navigateTo(page, "Bedroom");
	await page.waitForTimeout(SETTLE_MS);
}

/** Every registered animation group, mapped back to the layer that owns it. */
const registeredGroups = () => {
	const W = (window as any).Weather;
	const driver = W.Renderer.AnimationGroup.Driver;
	const owners: { layer: string; inSidebar: boolean; inBanner: boolean }[] = [];
	W.Renderer.Layers.layers.forEach((layer: any, name: string) => {
		if (layer.animationGroup && driver.groups.has(layer.animationGroup)) {
			owners.push({ layer: name, inSidebar: W.sidebar.layers.has(name), inBanner: !!W.banner && W.banner.layers.has(name) });
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

test("no animation group outlives the sky that started it", async ({ page }) => {
	await openInGame(page);

	// The banner sky is torn down when leaving the title screen. A layer still loading at that
	// moment used to finish and start its animations anyway, leaving a group nothing could stop.
	const live = await page.evaluate(registeredGroups);
	const orphans = live.owners.filter(o => !o.inSidebar && !o.inBanner);
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
