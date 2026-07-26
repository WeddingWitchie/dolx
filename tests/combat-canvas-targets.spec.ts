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
}

/**
 * Penetration target vars ($vaginatarget, $lefttarget, ...) do not always hold an $NPCList index:
 * tentacle encounters store the sentinel string "tentacles" (tentacle data lives in $tentacles),
 * and slots can be emptied mid-scene. Renderer code must treat a missing lookup as "nobody there"
 * instead of dereferencing undefined.
 */
test.describe("combat canvas handles non-NPC penetration targets", () => {
	test.beforeEach(async ({ page }) => {
		await openCompiledGame(page);
		await navigateTo(page, "Start2");
	});

	test("tentacle encounter maps and renders every canvas without dereferencing a missing NPC", async ({ page }) => {
		const result = await page.evaluate(() => {
			const W = window as any;
			const SC = W.SugarCube;
			const V = SC.State.variables;

			V.options.images = 1;
			V.options.combatImages = true;
			V.player.vaginaExist = true;

			SC.Wikifier.wikifyEval("<<tentaclestart 4 100>>");
			V.enemytype = "tentacles";
			V.vaginause = "tentacle";
			V.vaginastate = "tentacle";
			V.vaginatarget = "tentacles";
			V.tentacleVagina = V.tentacles[0].fullDesc;
			V.anususe = "tentacle";
			V.anusstate = "tentacle";
			V.anustarget = "tentacles";
			V.tentacleAnus = V.tentacles[1].fullDesc;
			V.lefttarget = "tentacles";
			V.righttarget = "tentacles";
			V.chesttarget = "tentacles";
			V.tentacleColour = "tentacles-purple";

			const errors: string[] = [];
			const attempt = (label: string, fn: () => unknown) => {
				try {
					return fn();
				} catch (e: any) {
					errors.push(`${label}: ${e && e.message}`);
					return undefined;
				}
			};

			const xrayOptions: any = attempt("mapXrayOptions", () => {
				const o = W.XrayCombatMapper.generateOptions();
				W.XrayCombatMapper.mapXrayOptions(o);
				return o;
			});
			const closeOptions: any = attempt("mapCloseOptions", () => {
				const o = W.CloseCombatMapper.generateOptions();
				W.CloseCombatMapper.mapCloseOptions(o);
				return o;
			});

			/* Layer visibility checks run per frame and are the ones that used to throw on "tentacles" */
			const condomLayers: Record<string, unknown> = {};
			const check = (model: string, layer: string, options: any) =>
				attempt(`${model}.${layer}`, () => {
					condomLayers[`${model}.${layer}`] = W.Renderer.CanvasModels[model].layers[layer].showfn(options);
				});
			check("combatXrayVagina", "condom", xrayOptions);
			check("combatXrayVagina", "condom2", xrayOptions);
			check("combatXrayArse", "condom", xrayOptions);
			check("combatXrayArse", "condom2", xrayOptions);
			check("combatCloseVagina", "npcCondom", closeOptions);
			check("combatCloseArse", "npcCondom", closeOptions);

			attempt("isLeftBestialHandjob", () => W.PlayerCanvasHelper.isLeftBestialHandjob());
			attempt("isRightBestialHandjob", () => W.PlayerCanvasHelper.isRightBestialHandjob());

			return {
				errors,
				vaginaType: xrayOptions?.vagina?.npcType,
				anusType: xrayOptions?.anus?.npcType,
				condomLayers,
			};
		});

		expect(result.errors).toEqual([]);
		expect(result.vaginaType).toBe("tentacle");
		expect(result.anusType).toBe("tentacle");
		/* A tentacle never wears a condom */
		expect(Object.values(result.condomLayers)).toEqual([false, false, false, false, false, false]);
	});

	test("emptied NPC slot behind a stale target does not break mapping or leak into $NPCList", async ({ page }) => {
		const result = await page.evaluate(() => {
			const W = window as any;
			const SC = W.SugarCube;
			const V = SC.State.variables;

			V.options.images = 1;
			V.options.combatImages = true;
			V.player.vaginaExist = true;

			/* Slot 0 empty, but combat vars still point at it - as happens between encounters */
			V.NPCList = [];
			V.active_enemy = 0;
			V.enemytype = "npc";
			V.vaginause = "penis";
			V.vaginastate = "penetrated";
			V.vaginatarget = 0;
			V.penisstate = "entrance";
			V.penistarget = 0;
			V.chesttarget = 0;

			const before = JSON.stringify(V.NPCList);
			const errors: string[] = [];
			const attempt = (label: string, fn: () => unknown) => {
				try {
					return fn();
				} catch (e: any) {
					errors.push(`${label}: ${e && e.message}`);
					return undefined;
				}
			};

			const xrayOptions: any = attempt("mapXrayOptions", () => {
				const o = W.XrayCombatMapper.generateOptions();
				W.XrayCombatMapper.mapXrayOptions(o);
				return o;
			});
			attempt("mapCloseOptions", () => {
				const o = W.CloseCombatMapper.generateOptions();
				W.CloseCombatMapper.mapCloseOptions(o);
				return o;
			});
			/* The sidebar player image renders on every passage - it must never touch NPC state */
			attempt("canvasimg", () => SC.Wikifier.wikifyEval("<<canvasimg>>"));

			return { errors, vaginaType: xrayOptions?.vagina?.npcType, before, after: JSON.stringify(V.NPCList) };
		});

		expect(result.errors).toEqual([]);
		expect(result.vaginaType).toBe("none");
		/* Rendering must never fabricate NPCs into persistent state */
		expect(result.after).toBe(result.before);
	});

	test("one-time scrub removes fabricated stubs already saved by the old renderer", async ({ page }) => {
		const result = await page.evaluate(() => {
			const W = window as any;
			const SC = W.SugarCube;
			const V = SC.State.variables;

			/* Verbatim shape the old animatemodel wrote, as found in a real affected save */
			const stub = {
				active: "inactive",
				anus: "none",
				breastsize: 0,
				condom: false,
				gender: "n",
				mouth: "none",
				penis: "none",
				pronoun: "i",
				type: "vine",
				vagina: "none",
			};

			/* Mid-conversation save: a named NPC the player is actively talking to */
			SC.Wikifier.wikifyEval("<<clearnpc>>");
			SC.Wikifier.wikifyEval("<<npc Robin>>");
			SC.Wikifier.wikifyEval("<<person1>>");
			const liveBefore = JSON.stringify(V.NPCList[0]);
			const narrate = () => {
				const div = document.createElement("div");
				new SC.Wikifier(div, "<<person1>><<person>>");
				return (div.textContent || "").trim();
			};
			const narrationBefore = narrate();

			/* slot 1: conjured out of nothing. slot 2: an empty padding clone the stub filled in. */
			V.NPCList[1] = Object.assign({}, stub);
			Object.assign(V.NPCList[2], stub);

			/* slot 3: an <<endnpc>> husk. It legitimately shares penis/vagina/mouth "none" and
			   breastsize 0 with the stub, so a per-key scrub would strip real fields off it. */
			V.NPCList[3] = Object.assign({}, V.NPCList[3], {
				penis: "none",
				vagina: "none",
				mouth: "none",
				chest: "none",
				breastsize: 0,
				condom: false,
				gender: 0,
				pronoun: 0,
				type: 0,
				fullDescription: 0,
			});
			const huskBefore = JSON.stringify(V.NPCList[3]);
			V.sexStats.vagina.pregnancy.stuckAtOne = 4;

			W.dolxScrubFabricatedNPCStubs();

			return {
				liveUntouched: JSON.stringify(V.NPCList[0]) === liveBefore,
				liveStillLive: W.isLiveNPC(V.NPCList[0]),
				narrationBefore,
				narrationAfter: narrate(),
				conjuredKeys: Object.keys(V.NPCList[1]).sort(),
				pollutedKeys: Object.keys(V.NPCList[2]).sort(),
				huskUntouched: JSON.stringify(V.NPCList[3]) === huskBefore,
				anyVine: V.NPCList.some((npc: any) => npc && npc.type === "vine"),
				anyLiveEmpty: V.NPCList.slice(1).some((npc: any) => W.isLiveNPC(npc)),
				stuckAtOne: V.sexStats.vagina.pregnancy.stuckAtOne,
			};
		});

		const baseKeys = ["chastity", "location", "pronouns", "skills", "traits"];
		/* An NPC the player is mid-conversation with must come through completely untouched */
		expect(result.liveUntouched).toBe(true);
		expect(result.liveStillLive).toBe(true);
		/* The scene still narrates exactly as it did before the migration touched the list */
		expect(result.narrationAfter).toBe(result.narrationBefore);
		expect(result.narrationAfter).toBeTruthy();
		expect(result.narrationAfter).not.toContain("undefined");
		/* "someone" is personselect's broken-slot fallback */
		expect(result.narrationAfter).not.toBe("someone");
		/* An <<endnpc>> husk shares several values with the stub but is not the stub */
		expect(result.huskUntouched).toBe(true);
		/* Both corrupted shapes end up as the standard empty slot, never a hole */
		expect(result.conjuredKeys).toEqual(baseKeys);
		expect(result.pollutedKeys).toEqual(baseKeys);
		expect(result.anyVine).toBe(false);
		expect(result.anyLiveEmpty).toBe(false);
		expect(result.stuckAtOne).toBeUndefined();
	});
});
