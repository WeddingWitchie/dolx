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

		expect(scales).toEqual({ base: 0.955, prop: 0.955, nnpc: 1, follower: 1, weather: 1 });
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

test.describe("Gender Identity preference-driven body changes", () => {
	test.beforeEach(async ({ page }) => {
		await openCompiledGame(page);
	});

	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("moves height one valid step toward the preference and respects the topic toggle", async ({ page }) => {
		const result = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.xchange = V.xchange || {};
			V.identity = V.identity || {};
			V.identity.body = V.identity.body || {};
			V.identity.body.bodysize = { preferred: "normal" };
			V.identity.body.genitals = {};
			V.identity.body.chest = {};
			V.identity.body.bottom = {};
			V.identity.body.hairlength = {};
			Object.assign(V.xchange, {
				giShiftMode: "m",
				giShiftStage: 2,
				giBodySizeEnabled: true,
				giGenitalsEnabled: false,
				giBreastSizeEnabled: false,
				giAssSizeEnabled: false,
				giHairLengthEnabled: false,
			});
			V.bodysize = 2.5;
			V.xchange.baseStats = { physique: 6000, physiquesize: 12000 };
			V.xchange.physiqueChangePercent = 100;
			(window as any).SugarCube.Wikifier.wikifyEval("<<gi-masculinise-step>>");
			const enabled = {
				bodysize: V.bodysize,
				physiquesize: V.physiquesize,
				physique: V.physique,
			};

			V.xchange.giBodySizeEnabled = false;
			V.xchange.giShiftStage = 2;
			V.identity.body.bodysize.preferred = "miniature";
			(window as any).SugarCube.Wikifier.wikifyEval("<<gi-masculinise-step>>");
			const disabledBodySize = V.bodysize;

			V.xchange.giBodySizeEnabled = true;
			V.xchange.giShiftMode = "f";
			V.xchange.giShiftStage = 2;
			V.identity.body.bodysize.preferred = "giant";
			V.bodysize = "invalid-old-save";
			(window as any).SugarCube.Wikifier.wikifyEval("<<gi-feminise-step>>");
			return { enabled, disabledBodySize, repairedBodySize: V.bodysize };
		});

		expect(result.enabled).toEqual({ bodysize: 2, physiquesize: 10000, physique: 5000 });
		expect(result.disabledBodySize).toBe(2);
		expect(result.repairedBodySize).toBe(2.5);
	});

	test("repairs legacy genital preferences and safely disarms disabled transformation state", async ({ page }) => {
		const result = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			const setup = (window as any).setup;
			V.identity = { body: { genitals: { preferred: "smallpenis" } } };
			V.attitudesControl = { unlockGender: true };
			V.xchange = {
				genderIdentityEnabled: true,
				giAutoEnabled: "true",
				giTransformEnabled: "true",
				giDrift: 90,
				giShiftStage: 2,
				giShiftMode: "m",
			};
			setup.xchangeEnsureGiSafety();
			const migrated = {
				vagina: V.identity.body.genitals.preferredVagina,
				penis: V.identity.body.genitals.preferredPenis,
				consent: V.xchange.giTransformConsent,
				drift: V.xchange.giDrift,
			};

			V.xchange.giTransformEnabled = false;
			setup.xchangeEnsureGiSafety();
			return {
				migrated,
				disarmed: {
					consent: V.xchange.giTransformConsent,
					drift: V.xchange.giDrift,
					stage: V.xchange.giShiftStage,
					mode: V.xchange.giShiftMode,
				},
			};
		});

		expect(result.migrated).toEqual({ vagina: false, penis: "smallpenis", consent: true, drift: 90 });
		expect(result.disarmed).toEqual({ consent: false, drift: 0, stage: 0, mode: "" });
	});

	test("both identity directions converge hair, chest, and ass toward explicit preferences", async ({ page }) => {
		const result = await page.evaluate(() => {
			const SC = (window as any).SugarCube;
			const V = SC.State.variables;
			V.xchange = V.xchange || {};
			Object.assign(V.xchange, {
				giShiftMode: "f",
				giShiftStage: 2,
				giGenitalsEnabled: false,
				giBodySizeEnabled: false,
				giBreastSizeEnabled: true,
				giAssSizeEnabled: true,
				giHairLengthEnabled: true,
			});
			V.identity = V.identity || {};
			V.identity.body = {
				bodysize: {},
				genitals: {},
				chest: { preferred: "flat" },
				bottom: { preferred: "small" },
				hairlength: { preferred: "short" },
			};
			Object.assign(V.player, { breastsize: 8, bottomsize: 7 });
			V.hairlength = 700;
			for (let i = 0; i < 30; i++) SC.Wikifier.wikifyEval("<<gi-feminise-step>>");
			const feminising = { hair: V.hairlength, breasts: V.player.breastsize, bottom: V.player.bottomsize };

			V.identity.body.chest.preferred = "big";
			V.identity.body.bottom.preferred = "big";
			V.identity.body.hairlength.preferred = "long";
			for (let i = 0; i < 30; i++) SC.Wikifier.wikifyEval("<<gi-masculinise-step>>");
			return {
				feminising,
				masculinising: { hair: V.hairlength, breasts: V.player.breastsize, bottom: V.player.bottomsize },
			};
		});

		expect(result.feminising).toEqual({ hair: 100, breasts: 0, bottom: 2 });
		expect(result.masculinising).toEqual({ hair: 601, breasts: 8, bottom: 7 });
	});

	test("keeps dual genitals when both are preferred and removes only an unpreferred genital", async ({ page }) => {
		const result = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.xchange = V.xchange || {};
			V.identity = V.identity || {};
			V.identity.body = V.identity.body || {};
			V.identity.body.bodysize = {};
			V.identity.body.chest = {};
			V.identity.body.bottom = {};
			V.identity.body.hairlength = {};
			V.identity.body.genitals = {
				preferredVagina: true,
				preferredPenis: "tinypenis",
				preferred: "vagina",
			};
			V.sexStats = V.sexStats || {};
			V.sexStats.vagina = V.sexStats.vagina || { menstruation: { running: false } };
			Object.assign(V.xchange, {
				giShiftMode: "m",
				giShiftStage: 1,
				giGenitalsEnabled: true,
				giBodySizeEnabled: false,
				giBreastSizeEnabled: false,
				giAssSizeEnabled: false,
				giHairLengthEnabled: false,
			});
			Object.assign(V.player, {
				sex: "f",
				gender: "f",
				vaginaExist: true,
				penisExist: false,
				ballsExist: false,
				penissize: 0,
			});
			(window as any).SugarCube.Wikifier.wikifyEval("<<gi-masculinise-step>><<gi-masculinise-step>><<gi-masculinise-step>>");
			const dual = {
				vagina: V.player.vaginaExist,
				penis: V.player.penisExist,
				penissize: V.player.penissize,
				sex: V.player.sex,
			};

			V.identity.body.genitals.preferredVagina = false;
			V.identity.body.genitals.preferred = "tinypenis";
			V.xchange.giShiftStage = 1;
			(window as any).SugarCube.Wikifier.wikifyEval("<<gi-masculinise-step>>");
			const penisOnly = {
				vagina: V.player.vaginaExist,
				penis: V.player.penisExist,
				sex: V.player.sex,
			};

			V.xchange.giGenitalsEnabled = false;
			V.xchange.giShiftStage = 1;
			Object.assign(V.player, { sex: "f", vaginaExist: true, penisExist: false, ballsExist: false, penissize: 0 });
			(window as any).SugarCube.Wikifier.wikifyEval("<<gi-masculinise-step>>");
			return {
				dual,
				penisOnly,
				disabled: {
					vagina: V.player.vaginaExist,
					penis: V.player.penisExist,
					sex: V.player.sex,
					stage: V.xchange.giShiftStage,
				},
			};
		});

		expect(result.dual).toEqual({ vagina: true, penis: true, penissize: 2, sex: "f" });
		expect(result.penisOnly).toEqual({ vagina: false, penis: true, sex: "m" });
		expect(result.disabled).toEqual({ vagina: true, penis: false, sex: "f", stage: 2 });
	});
});
