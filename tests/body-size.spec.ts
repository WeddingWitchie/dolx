import { test, expect } from "@playwright/test";
import * as path from "path";
import { fileURLToPath } from "url";
import { navigateTo, assertNoErrors, setVar, getVar, wikifyToText, waitForPassage, type Page } from "./helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_URL = `file://${path.resolve(__dirname, "../Degrees of Lewdity VERSION.html")}`;

async function openCompiledGame(page: Page) {
	await page.addInitScript(() => localStorage.setItem("verifiedAge", "true"));
	await page.goto(GAME_URL);
	await waitForPassage(page);
}

test.describe("body size gameplay and sidebar integration", () => {
	test.beforeEach(async ({ page }) => {
		await openCompiledGame(page);
		await navigateTo(page, "Start2");
	});

	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("body-size helpers cover every valid size and invalid saves safely", async ({ page }) => {
		const values = await page.evaluate(() => {
			const setup = (window as any).setup;
			return {
				stealth: setup.bodySizeSteps.map((size: number) => setup.bodySizeStealthModifier(size)),
				intimidation: setup.bodySizeSteps.map((size: number) => setup.bodySizeIntimidationRange(size, 1000)),
				dominantSmall: setup.bodySizeIntimidationRange(1, 850),
				invalidStealth: setup.bodySizeStealthModifier("invalid"),
			};
		});

		expect(values.stealth).toEqual([150, 100, 50, 0, -50, -100, -150]);
		expect(values.intimidation).toEqual([700, 800, 900, 1000, 1100, 1200, 1300]);
		expect(values.dominantSmall).toBe(1150);
		expect(values.invalidStealth).toBe(0);
	});

	test("sidebar scaling changes player layers without scaling scene layers", async ({ page }) => {
		const scales = await page.evaluate(() => {
			const SC = (window as any).SugarCube;
			const Renderer = (window as any).Renderer;
			SC.State.variables.bodysize = -1;
			SC.State.variables.options.sidebarAnimations = false;
			SC.Wikifier.wikifyEval("<<canvasimg>>");
			const model = Renderer.locateModel("main", "sidebar");
			return {
				base: model.layers.base.renderScale,
				prop: model.layers.prop.renderScale,
				nnpc: model.layers.nnpc.renderScale,
				follower: model.layers.follower_base.renderScale,
				weather: model.layers.precipitation_front.renderScale,
			};
		});

		expect(scales).toEqual({ base: 0.92, prop: 0.92, nnpc: 1, follower: 1, weather: 1 });
	});

	test("scaled composition keeps the player centred near the feet", async ({ page }) => {
		const draw = await page.evaluate(() => {
			const calls: any[][] = [];
			const target = {
				filter: "",
				globalAlpha: 1,
				globalCompositeOperation: "source-over",
				save() {},
				restore() {},
				drawImage(...args: any[]) {
					calls.push(args);
				},
			};
			(window as any).Renderer.composeProcessedLayer({ cachedImage: {}, renderScale: 1.05 }, target, {
				frameWidth: 256,
				frameCount: 1,
				subspriteWidth: 256,
				subspriteHeight: 256,
				subspriteFrameCount: 1,
				dx: 0,
				dy: 0,
				height: 256,
			});
			return calls[0].slice(5);
		});

		// Destination rect is snapped to whole pixels so stacked layers share the same pixel grid
		expect(draw[0]).toBe(-6);
		expect(draw[1]).toBe(-10);
		expect(draw[2]).toBe(269);
		expect(draw[3]).toBe(269);
	});

	test("Domus door entry persists through the scene and clears on return", async ({ page }) => {
		await setVar(page, "rng", 90);
		await setVar(page, "domusWindowDoorEntry", true);
		await navigateTo(page, "Domus Window");
		expect(await page.locator("#passages").innerText()).toContain("A curtain hangs across a bedroom doorway.");
		expect(await getVar(page, "domusWindowDoorEntry")).toBe(true);

		await navigateTo(page, "Domus Window Curtain");
		const curtainText = await page.locator("#passages").innerText();
		expect(curtainText).toContain("You slip through the curtain.");
		expect(curtainText).not.toContain("You open the window");

		await navigateTo(page, "Domus Window Curtain Leave");
		expect(await page.locator("#passages").innerText()).toContain("return to the back door");

		await navigateTo(page, "Domus Street");
		expect(await getVar(page, "domusWindowDoorEntry")).toBeUndefined();
	});

	test("new travel events render without SugarCube errors", async ({ page }) => {
		await setVar(page, "bus", "farmroad4");
		await navigateTo(page, "Farm Road Wind Gate");
		expect(await page.locator("#passages").innerText()).toContain("You grab the gate");
		expect(await page.getByRole("link", { name: "Next" }).count()).toBe(1);

		const doorway = await wikifyToText(page, "<<streetBodySizeDoorway>>");
		expect(doorway).toContain("You hit the top of the doorframe");
	});
});
