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

/*
 * The "special vanilla two-tone" (highlights) dye is an overlay-art feature with no gradient prototype.
 */
test.describe("two-tone hair dye stays independent of the highlights dye", () => {
	test.beforeEach(async ({ page }) => {
		await openCompiledGame(page);
	});

	test("highlights is never a valid normal two-tone style", async ({ page }) => {
		const result = await page.evaluate(() => {
			const W = window as any;
			const prototypes = W.setup.colours.hairgradients_prototypes;
			return {
				hasHighlightsPrototype: !!prototypes.sides.highlights || !!prototypes.fringe.highlights,
				clamped: W.vanillaTwoToneStyle("highlights"),
				validPassesThrough: W.vanillaTwoToneStyle("split"),
			};
		});

		expect(result.hasHighlightsPrototype).toBe(false);
		expect(result.clamped).not.toBe("highlights");
		expect(result.validPassesThrough).toBe("split");
	});

	test("sitting in the hairdresser chair with highlighted hair does not poison the two-tone style", async ({ page }) => {
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.hairColourStyle = "highlights";
			V.hairFringeColourStyle = "highlights";
			V.hairColourGradient = { style: "highlights", colours: ["red", "blue"] };
			V.hairFringeColourGradient = { style: "highlights", colours: ["red", "blue"] };
			V.twoToneStyle = "highlights";
		});

		await navigateTo(page, "Hairdressers Seat");

		const result = await page.evaluate(() => {
			const W = window as any;
			const style = W.SugarCube.State.variables.twoToneStyle;
			return { style, isRealGradient: !!W.setup.colours.hairgradients_prototypes.sides[style] };
		});

		expect(result.style).not.toBe("highlights");
		expect(result.isRealGradient).toBe(true);
	});

	test("a save already poisoned by 0.20.15 is repaired instead of failing to render", async ({ page }) => {
		const result = await page.evaluate(async () => {
			const W = window as any;
			const SC = W.SugarCube;
			const V = SC.State.variables;

			// Exactly the state 0.20.15 could persist:
			// an ordinary two-tone dye stored with the highlights style, which has no gradient prototype.
			V.hairtype = "default";
			V.fringetype = "default";
			V.hairColourStyle = "gradient";
			V.hairFringeColourStyle = "gradient";
			V.hairColourGradient = { style: "highlights", colours: ["red", "blue"] };
			V.hairFringeColourGradient = { style: "highlights", colours: ["red", "blue"] };
			V.twoToneStyle = "highlights";
			delete V.dolxTwoToneStyleRepaired;

			new SC.Wikifier(document.createElement("div"), "<<xchange-modupdate>>");
			await new Promise(resolve => setTimeout(resolve, 300));

			let renderError = null;
			try {
				const output = document.createElement("div");
				document.body.append(output);
				new SC.Wikifier(output, '<<canvasimg "repairTest" "repairTest">>');
				await new Promise(resolve => setTimeout(resolve, 200));
				const model = W.Renderer.CanvasModelCaches.main.repairTest;
				model.compile(model.options);
				output.remove();
			} catch (e: any) {
				renderError = e.message;
			}

			return {
				hair: V.hairColourGradient.style,
				fringe: V.hairFringeColourGradient.style,
				twoToneStyle: V.twoToneStyle,
				renderError,
			};
		});

		expect(result.hair).not.toBe("highlights");
		expect(result.fringe).not.toBe("highlights");
		expect(result.twoToneStyle).not.toBe("highlights");
		expect(result.renderError).toBeNull();
	});

	test("the repair leaves a genuinely highlighted player alone", async ({ page }) => {
		const result = await page.evaluate(async () => {
			const SC = (window as any).SugarCube;
			const V = SC.State.variables;

			// Consistent highlights state - the player actually chose the special dye.
			V.hairColourStyle = "highlights";
			V.hairFringeColourStyle = "highlights";
			V.hairColourGradient = { style: "highlights", colours: ["red", "blue"] };
			V.hairFringeColourGradient = { style: "highlights", colours: ["red", "blue"] };
			delete V.dolxTwoToneStyleRepaired;

			new SC.Wikifier(document.createElement("div"), "<<xchange-modupdate>>");
			await new Promise(resolve => setTimeout(resolve, 300));

			return { hair: V.hairColourGradient.style, fringe: V.hairFringeColourGradient.style };
		});

		expect(result.hair).toBe("highlights");
		expect(result.fringe).toBe("highlights");
	});

	test("a normal two-tone gradient still renders for every selectable style", async ({ page }) => {
		const result = await page.evaluate(async () => {
			const W = window as any;
			const SC = W.SugarCube;
			const V = SC.State.variables;
			const styles = ["low-ombre", "high-ombre", "split", "face-frame"];
			const errors: string[] = [];

			for (const style of styles) {
				V.hairtype = "default";
				V.fringetype = "default";
				V.hairColourStyle = "gradient";
				V.hairFringeColourStyle = "gradient";
				V.hairColourGradient = { style, colours: ["red", "blue"] };
				V.hairFringeColourGradient = { style, colours: ["red", "blue"] };

				const output = document.createElement("div");
				document.body.append(output);
				try {
					// Goes through the real filter pipeline, which is what calls createHairColourGradient.
					new SC.Wikifier(output, `<<canvasimg "twoToneTest" "twoToneTest_${style}">>`);
					await new Promise(resolve => setTimeout(resolve, 200));
					const model = W.Renderer.CanvasModelCaches.main[`twoToneTest_${style}`];
					model.compile(model.options);
				} catch (e: any) {
					errors.push(`${style}: ${e.message}`);
				}
				output.remove();
			}
			return errors;
		});

		expect(result).toEqual([]);
	});
});
