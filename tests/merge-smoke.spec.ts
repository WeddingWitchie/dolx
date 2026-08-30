import { test, expect } from "@playwright/test";
import { openGame, navigateTo, assertNoErrors, type Page } from "./helpers";

/**
 * Runtime smoke cover for the vanilla 0.5.12 pregnancy-records merge.
 *
 * The merge replaced $sexStats[orifice].pregnancy and $children with the flat $pregnancies /
 * $childRecords model. Most of the damage that survives a compile is a silent runtime throw or a
 * read that quietly returns nothing, so these drive the real entry points and watch for both.
 */

/** Boot a new game and collect anything the page throws while it runs. */
async function boot(page: Page) {
	const pageErrors: string[] = [];
	const consoleErrors: string[] = [];
	page.on("pageerror", error => pageErrors.push(error.message));
	page.on("console", message => {
		// Missing image/asset fetches are pre-existing console noise under file://, not merge signal.
		if (message.type() === "error" && !message.text().includes("Failed to load resource")) consoleErrors.push(message.text());
	});
	await openGame(page);
	await navigateTo(page, "Start2");
	return { pageErrors, consoleErrors };
}

/** Render a widget into a scratch div and report any SugarCube error it produced. */
async function renderWidget(page: Page, macro: string) {
	return page.evaluate(source => {
		const div = document.createElement("div");
		document.body.appendChild(div);
		try {
			new (window as any).SugarCube.Wikifier(div, source);
		} catch (e) {
			div.remove();
			return { errors: ["threw: " + (e as Error).message], text: "" };
		}
		const errors = Array.from(div.querySelectorAll(".error, .error-view")).map(node => node.textContent || "");
		const text = div.textContent || "";
		div.remove();
		return { errors, text };
	}, macro);
}

/** Give the player a fertile female body, so eligibility is not what fails a test. */
async function makeFertile(page: Page) {
	await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		V.player.vaginaExist = 1;
		V.player.penisExist = 0;
		V.player.virginity.vaginal = false;
		V.settings.pregnancyType = "realistic";
		V.sexStats.vagina.menstruation.currentState = "fertile";
	});
}

/** Conceive a plain human pregnancy in the given orifice and return its id. */
async function conceive(page: Page, orifice: "vagina" | "anus" = "vagina") {
	return page.evaluate(hole => {
		const W = window as any;
		return W.createPregnancy("pc", "human", "Whitney", "human", [{ name: "Whitney", species: "human" }], W.Time.date.timeStamp, hole, "town");
	}, orifice);
}

test.describe("merge smoke: boot", () => {
	test("a new game starts with the records model initialised and nothing thrown", async ({ page }) => {
		const { pageErrors, consoleErrors } = await boot(page);

		const state = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			return {
				pregnancies: V.pregnancies,
				childRecords: V.childRecords,
				pendingPregnancies: V.pendingPregnancies,
				cumLoads: V.cumLoads,
				children: V.children,
				vaginaSperm: V.sexStats?.vagina?.sperm,
				analPregnancy: V.settings.analPregnancy,
				drunkSensitivity: V.drunkSensitivity,
				recordsVersion: V.objectVersion?.pregnancyRecords,
			};
		});

		expect(state.pregnancies).toEqual([]);
		expect(state.childRecords).toEqual([]);
		expect(state.pendingPregnancies).toEqual({ vagina: null, anus: null });
		expect(state.cumLoads).toEqual({ vagina: [], anus: [] });
		// the legacy containers must not be recreated by a fresh start
		expect(state.children).toBeUndefined();
		expect(state.vaginaSperm).toBeUndefined();
		expect(state.analPregnancy).toBe(false);
		expect(Number.isFinite(state.drunkSensitivity)).toBe(true);
		expect(state.recordsVersion).toBeGreaterThanOrEqual(1);

		await assertNoErrors(page);
		expect(pageErrors).toEqual([]);
		expect(consoleErrors).toEqual([]);
	});

	test("the renamed macros and helpers all resolve", async ({ page }) => {
		await boot(page);
		// vanilla 0.5.12 renamed <<alcohol>>/<<galcohol>>/<<ggalcohol>> and deleted recordSperm.
		for (const macro of ["<<drunk 10>>", "<<gdrunk>>", "<<ggdrunk>>", '<<sceneInseminate "vagina" "Whitney" "human" "deep">>']) {
			const result = await renderWidget(page, macro);
			expect(result.errors, macro + " errored").toEqual([]);
		}
		const helpers = await page.evaluate(() => {
			const W = window as any;
			const gone = ["recordSperm", "recordVaginalSperm", "recordAnusSperm", "getPregnancyObject"];
			const wanted = [
				"getPlayerPregnancy",
				"getActivePregnancies",
				"getChildrenOf",
				"getPregnancyOf",
				"getPlayerPregnancyLitter",
				"childIsUnhatchedEgg",
				"getHatchDate",
				"addEggCare",
				"nestEggCount",
				"combatInseminate",
				"sceneInseminate",
				"npcPregnancyRoll",
				"playerCanCarryAnally",
				"canBeMPregnant",
				"hasOmegaAnalPregnancy",
				"playerAwareTheyArePregnant",
			];
			return {
				resurrected: gone.filter(name => typeof W[name] === "function"),
				absent: wanted.filter(name => typeof W[name] !== "function"),
			};
		});
		expect(helpers.absent).toEqual([]);
		expect(helpers.resurrected).toEqual([]);
	});
});

test.describe("merge smoke: pregnancy lifecycle", () => {
	test("carries a vaginal pregnancy from conception through to birth", async ({ page }) => {
		const { pageErrors } = await boot(page);
		await makeFertile(page);
		const id = await conceive(page, "vagina");

		const conceived = await page.evaluate(pregnancyId => {
			const W = window as any;
			return {
				isPregnant: W.playerIsPregnant(),
				litter: W.getPlayerPregnancyLitter().length,
				orifice: W.getPlayerPregnancy().orifice,
				donor: W.getPlayerPregnancy().donor,
				childPregnancyIds: W.getChildrenOf(pregnancyId).map((c: any) => c.pregnancyId),
				born: W.getChildrenOf(pregnancyId).filter((c: any) => W.childIsBorn(c)).length,
				menstruation: W.SugarCube.State.variables.sexStats.vagina.menstruation.currentState,
			};
		}, id);
		expect(id).toBe(0);
		expect(conceived.isPregnant).toBe(true);
		expect(conceived.litter).toBeGreaterThan(0);
		expect(conceived.orifice).toBe("vagina");
		expect(conceived.donor).toBe("Whitney");
		expect(conceived.childPregnancyIds.every((each: number) => each === 0)).toBe(true);
		expect(conceived.born).toBe(0);
		expect(conceived.menstruation).toBe("pregnant");

		// walk it to term, then deliver through the record helpers the birth passages use
		const delivered = await page.evaluate(() => {
			const W = window as any;
			const V = W.SugarCube.State.variables;
			const pregnancy = W.getPlayerPregnancy();
			pregnancy.conceivedDate = W.Time.date.timeStamp - W.gestationSeconds("human") * 2;
			const progress = W.pregnancyProgress(pregnancy);
			// checkLabour is what actually starts labour; getLabouringPregnancy just picks the record
			W.checkLabour();
			const labouring = W.getLabouringPregnancy("pc")?.waterBreaking === true;
			W.beginPlayerBirth();
			const orifice = W.playerBirthOrifice();
			W.getChildrenOf(pregnancy.pregnancyId).forEach((child: any) => {
				W.recordBirth(child.childId);
				W.beginRearing(child, "home", "home");
			});
			W.recordDelivery(pregnancy.pregnancyId, "home");
			return {
				progress,
				labouring,
				orifice,
				stillPregnant: W.playerIsPregnant(),
				bornChildren: W.getBornChildren().length,
				atHome: W.getChildrenAt("home").length,
				deliveredLocation: V.pregnancies[0].deliveredLocation,
			};
		});
		expect(delivered.progress).toBeGreaterThanOrEqual(1);
		expect(delivered.labouring).toBe(true);
		expect(delivered.orifice).toBe("vagina");
		expect(delivered.bornChildren).toBeGreaterThan(0);
		expect(delivered.atHome).toBe(delivered.bornChildren);
		expect(delivered.deliveredLocation).toBe("home");
		expect(delivered.stillPregnant).toBe(false);

		await assertNoErrors(page);
		expect(pageErrors).toEqual([]);
	});

	test("Omega grants anal carry with the vanilla anal setting off", async ({ page }) => {
		await boot(page);

		const table = await page.evaluate(() => {
			const W = window as any;
			const V = W.SugarCube.State.variables;
			V.player.vaginaExist = 0;
			const probe = (omega: boolean, setting: any, earSlime: boolean) => {
				V.xchange.pill.active = omega;
				V.xchange.pill.omegaEffect = omega;
				V.settings.analPregnancy = setting;
				V.earSlime.growth = earSlime ? 100 : 0;
				V.earSlime.focus = earSlime ? "pregnancy" : "none";
				return { omega, setting, earSlime, canCarry: W.playerCanCarryAnally() };
			};
			return [
				probe(true, false, false),
				probe(true, "exceptional", false),
				probe(true, "always", false),
				probe(false, false, false),
				probe(false, false, true),
				probe(false, "exceptional", true),
				probe(false, "exceptional", false),
				probe(false, "always", false),
			];
		});

		// Omega is its own eligibility source: it carries regardless of the vanilla setting.
		expect(table[0].canCarry).toBe(true);
		expect(table[1].canCarry).toBe(true);
		expect(table[2].canCarry).toBe(true);
		// without Omega the vanilla setting governs, and "off" means off even for ear slime
		expect(table[3].canCarry).toBe(false);
		expect(table[4].canCarry).toBe(false);
		// "exceptional" is the ear slime case
		expect(table[5].canCarry).toBe(true);
		expect(table[6].canCarry).toBe(false);
		// "always" carries unconditionally
		expect(table[7].canCarry).toBe(true);
	});

	test("an Omega anal pregnancy uses the same records path as a vaginal one", async ({ page }) => {
		const { pageErrors } = await boot(page);

		const result = await page.evaluate(() => {
			const W = window as any;
			const V = W.SugarCube.State.variables;
			V.xchange.pill.active = true;
			V.xchange.pill.omegaEffect = true;
			V.settings.analPregnancy = false;
			V.player.vaginaExist = 0;
			V.player.penisExist = 1;
			V.settings.pregnancyType = "realistic";
			const id = W.createPregnancy("pc", "human", "Robin", "human", [{ name: "Robin", species: "human" }], W.Time.date.timeStamp, "anus", "home");
			const pregnancy = W.getPlayerPregnancy();
			return {
				canCarry: W.playerCanCarryAnally(),
				isPregnant: W.playerIsPregnant(),
				orifice: pregnancy.orifice,
				litter: W.getChildrenOf(id).length,
				birthOrifice: W.playerBirthOrifice(),
				bellySize: W.playerBellySize(),
				active: !!W.getActivePregnancy("pc", "anus"),
			};
		});

		expect(result.canCarry).toBe(true);
		expect(result.isPregnant).toBe(true);
		expect(result.orifice).toBe("anus");
		expect(result.litter).toBeGreaterThan(0);
		expect(result.birthOrifice).toBe("anus");
		expect(result.active).toBe(true);
		expect(Number.isFinite(result.bellySize)).toBe(true);

		await assertNoErrors(page);
		expect(pageErrors).toEqual([]);
	});
});

test.describe("merge smoke: legacy save migration", () => {
	test("converts an in-flight legacy pregnancy and legacy children into records", async ({ page }) => {
		const { pageErrors } = await boot(page);

		const migrated = await page.evaluate(() => {
			const W = window as any;
			const V = W.SugarCube.State.variables;
			const day = { year: 2022, month: "September", day: 4, hour: 7, minute: 0 };

			// wind the state back to the pre-records shape
			delete V.objectVersion.pregnancyRecords;
			V.pregnancies = [];
			V.childRecords = [];
			V.sexStats.vagina.sperm = [{ date: day, type: "human" }];
			V.sexStats.vagina.pregnancy = {
				type: "human",
				timer: 100000,
				timerEnd: 200000,
				awareOf: true,
				waterBreaking: false,
				potentialFathers: [{ source: "Whitney", type: "human" }],
				fetus: [
					{ type: "human", gender: "f", father: "Whitney", birthId: 3, motherKnown: true, fatherKnown: true, features: {} },
					{ type: "human", gender: "m", father: "Whitney", birthId: 3, motherKnown: true, fatherKnown: true, features: {} },
				],
			};
			V.children = {
				"pc|1|0": {
					type: "human",
					gender: "f",
					mother: "pc",
					father: "Robin",
					birthId: 1,
					conceived: day,
					born: day,
					// Some old non-hawk records incorrectly retained this hawk-only field.
					eggTimer: 123,
					birthLocation: "hospital",
					location: "home",
					name: "Ada",
					motherKnown: true,
					fatherKnown: true,
					features: {},
					localVariables: {},
				},
			};

			W.migratePregnancyData();

			const active = W.getPlayerPregnancy();
			return {
				pregnancyCount: V.pregnancies.length,
				childCount: V.childRecords.length,
				legacyChildrenGone: V.children === undefined,
				legacySpermGone: V.sexStats.vagina.sperm === undefined,
				legacyFetusCleared: V.sexStats.vagina.pregnancy.fetus.length,
				version: V.objectVersion.pregnancyRecords,
				activeOrifice: active ? active.orifice : null,
				activeDonor: active ? active.donor : null,
				activeLitter: active ? W.getChildrenOf(active.pregnancyId).length : 0,
				possibleDonors: active ? active.possibleDonors.map((d: any) => d.name) : [],
				awareOfPregnancy: active ? active.awareOfPregnancy : [],
				bornNamed: W.getBornChildren().map((c: any) => c.name),
				bornAtHome: W.getChildrenAt("home").length,
				progress: active ? W.pregnancyProgress(active) : null,
			};
		});

		expect(migrated.pregnancyCount).toBe(2); // one delivered legacy litter, one in flight
		expect(migrated.childCount).toBe(3); // one born child, two fetuses
		expect(migrated.legacyChildrenGone).toBe(true);
		expect(migrated.legacySpermGone).toBe(true);
		expect(migrated.legacyFetusCleared).toBe(0);
		expect(migrated.version).toBe(1);
		expect(migrated.activeOrifice).toBe("vagina");
		expect(migrated.activeDonor).toBe("Whitney");
		expect(migrated.activeLitter).toBe(2);
		expect(migrated.possibleDonors).toEqual(["Whitney"]);
		expect(migrated.awareOfPregnancy).toContain("pc");
		expect(migrated.bornNamed).toEqual(["Ada"]);
		expect(migrated.bornAtHome).toBe(1);
		// the in-flight pregnancy kept its progress instead of restarting at day one
		expect(migrated.progress).toBeGreaterThan(0.3);
		expect(migrated.progress).toBeLessThan(0.7);

		await assertNoErrors(page);
		expect(pageErrors).toEqual([]);
	});

	test("a failed migration rolls the save back instead of half-writing it", async ({ page }) => {
		await boot(page);

		const rolledBack = await page.evaluate(() => {
			const W = window as any;
			const V = W.SugarCube.State.variables;
			delete V.objectVersion.pregnancyRecords;
			V.pregnancies = [];
			V.childRecords = [];
			V.children = {
				"pc|1|0": { type: "unicorn", gender: "f", mother: "pc", father: "Robin", birthId: 1, features: {}, localVariables: {} },
			};
			let threw = false;
			try {
				W.migratePregnancyData();
			} catch (e) {
				threw = true;
			}
			return {
				threw,
				childrenKept: !!V.children,
				pregnancies: V.pregnancies.length,
				childRecords: V.childRecords.length,
				version: V.objectVersion.pregnancyRecords,
			};
		});

		expect(rolledBack.threw).toBe(true);
		expect(rolledBack.childrenKept).toBe(true); // the legacy data is still there to retry from
		expect(rolledBack.pregnancies).toBe(0);
		expect(rolledBack.childRecords).toBe(0);
		expect(rolledBack.version).toBeUndefined();
	});
});

test.describe("merge smoke: overlays", () => {
	const overlays = ["characteristics", "traits", "cheats", "statistics", "extraStatistics", "social", "journal", "feats"];

	for (const widget of overlays) {
		test("the " + widget + " overlay renders while pregnant", async ({ page }) => {
			const { pageErrors } = await boot(page);
			await makeFertile(page);
			await conceive(page, "vagina");
			await page.evaluate(() => {
				const W = window as any;
				W.setKnowsPregnancy(0, "pc");
				W.setPlayerLearnedFrom(0, "test");
			});
			const result = await renderWidget(page, "<<" + widget + ">>");
			expect(result.errors).toEqual([]);
			expect(result.text.length).toBeGreaterThan(0);
			expect(pageErrors).toEqual([]);
		});
	}

	test("the characteristics pregnancy risk meter reads the right way round", async ({ page }) => {
		await boot(page);
		const labels = await page.evaluate(() => {
			const W = window as any;
			return W.PregnancyConstants.riskMeterLabels.map((entry: any) => entry.text);
		});
		// index 0 is the safe end, the last index is the dangerous end
		expect(labels.length).toBeGreaterThan(1);
		expect(labels[0].toLowerCase()).toContain("safe");
		expect(labels[labels.length - 1].toLowerCase()).toContain("danger");
	});
});

test.describe("merge smoke: pocket food", () => {
	test("eating again before Next keeps the original return passage", async ({ page }) => {
		const { pageErrors } = await boot(page);

		const state = await page.evaluate(() => {
			const W = window as any;
			const V = W.SugarCube.State.variables;
			const key = "choc_chip_cookie";
			V.passage = "Orphanage";
			V.foodstuff[key].amount = 2;
			V.foodBatches[key] = [{ n: 2, day: W.Time.days, own: false }];
			delete V.pocketFoodResult;
			delete V.pocketFoodReturn;

			const first = W.pocketEatFoodFromMenu(key);
			V.passage = "Pocket Eat Food";
			const second = W.pocketEatFoodFromMenu(key);
			return {
				first,
				second,
				amount: V.foodstuff[key].amount,
				returnPassage: V.pocketFoodReturn,
				resultKey: V.pocketFoodResult?.key,
			};
		});

		expect(state).toEqual({
			first: true,
			second: true,
			amount: 0,
			returnPassage: "Orphanage",
			resultKey: "choc_chip_cookie",
		});

		await navigateTo(page, "Pocket Eat Food");
		expect(await page.locator("#passages").innerText()).toContain("You eat a chocolate chip cookie.");
		expect(await page.locator('#passages a[data-passage="Orphanage"]').count()).toBe(1);
		await assertNoErrors(page);
		expect(pageErrors).toEqual([]);
	});
});

test.describe("merge smoke: water dragon eggs", () => {
	test("an egg clutch stays a hawk egg until it hatches", async ({ page }) => {
		const { pageErrors } = await boot(page);

		const laid = await page.evaluate(() => {
			const W = window as any;
			const id = W.createPregnancy("pc", "human", "water dragon", "hawk", [{ name: "water dragon", species: "hawk" }], W.Time.date.timeStamp, "vagina", "lake");
			const litter = W.getChildrenOf(id);
			litter.forEach((child: any) => W.beginRearing(child, "waterdragon_nest", "waterdragon_nest"));
			W.recordDelivery(id, "waterdragon_nest");
			return {
				id,
				eggs: litter.length,
				species: litter.map((c: any) => c.species),
				unhatched: litter.filter((c: any) => W.childIsUnhatchedEgg(c)).length,
				hatchDate: W.getHatchDate(W.SugarCube.State.variables.pregnancies[id]),
			};
		});
		expect(laid.eggs).toBeGreaterThan(0);
		expect(laid.species.every((each: string) => each === "hawk")).toBe(true);
		expect(laid.unhatched).toBe(laid.eggs);
		expect(Number.isFinite(laid.hatchDate)).toBe(true);

		// brooding brings the hatch date forward
		const brooded = await page.evaluate(id => {
			const W = window as any;
			const before = W.getHatchDate(W.SugarCube.State.variables.pregnancies[id]);
			W.addEggCare(id, 6 * W.TimeConstants.secondsPerHour);
			return { before, after: W.getHatchDate(W.SugarCube.State.variables.pregnancies[id]) };
		}, laid.id);
		expect(brooded.after).toBeLessThan(brooded.before);

		// at hatch the shell opens on a dragon-blooded child
		const hatched = await page.evaluate(id => {
			const W = window as any;
			const V = W.SugarCube.State.variables;
			V.pregnancies[id].deliveredDate -= W.PregnancyConstants.birdNestTime + W.PregnancyConstants.birdHatchDelay;
			const ready = W.getChildrenOf(id).filter((c: any) => W.childIsUnhatchedEgg(c) && W.Time.date.timeStamp >= W.getHatchDate(W.getPregnancyOf(c)));
			ready.forEach((child: any) => {
				child.species = "human";
				child.features.beastTransform = "waterdragon";
				W.recordBirth(child.childId);
			});
			return {
				ready: ready.length,
				stillEggs: W.getChildrenOf(id).filter((c: any) => W.childIsUnhatchedEgg(c)).length,
				born: W.getChildrenOf(id).filter((c: any) => W.childIsBorn(c)).length,
			};
		}, laid.id);
		expect(hatched.ready).toBe(laid.eggs);
		expect(hatched.stillEggs).toBe(0);
		expect(hatched.born).toBe(laid.eggs);

		await assertNoErrors(page);
		expect(pageErrors).toEqual([]);
	});
});

test.describe("merge smoke: the cycle and the clock", () => {
	test("a fresh save has a working fertility cycle", async ({ page }) => {
		await boot(page);
		const cycle = await page.evaluate(() => {
			const W = window as any;
			const V = W.SugarCube.State.variables;
			V.player.vaginaExist = 1;
			const menstruation = V.sexStats.vagina.menstruation;
			return {
				fertileLeadDays: menstruation.fertileLeadDays,
				sperm: V.sexStats.vagina.sperm,
				lastDaysMax: menstruation.lastDaysMax,
				stages: menstruation.stages,
				risk: W.playerPregnancyRisk(),
				outlook: W.menstrualOutlook(),
				dates: W.menstrualFertileDates(),
			};
		});
		// vanilla 0.5.12 added fertileLeadDays and dropped the sperm array. A new game has to build
		// the cycle vanilla's way, or every fertility number downstream comes out NaN or null.
		expect(Number.isFinite(cycle.fertileLeadDays)).toBe(true);
		expect(cycle.sperm).toBeUndefined();
		expect(cycle.lastDaysMax).toBeUndefined();
		expect(cycle.stages.every((stage: number) => Number.isFinite(stage))).toBe(true);
		expect(Number.isFinite(cycle.outlook)).toBe(true);
		expect(Number.isFinite(cycle.risk)).toBe(true);
		if (cycle.dates.passed) {
			expect(cycle.dates.risky).toBeNull();
			expect(cycle.dates.nextWindow).not.toBeNull();
			expect(Number.isFinite(cycle.dates.nextWindow.min)).toBe(true);
			expect(Number.isFinite(cycle.dates.nextWindow.max)).toBe(true);
		} else {
			expect(cycle.dates.risky).not.toBeNull();
			expect(cycle.dates.nextWindow).toBeNull();
		}
	});

	test("a pregnancy runs its whole course through real game time", async ({ page }) => {
		test.setTimeout(180000);
		const { pageErrors } = await boot(page);

		const seeded = await page.evaluate(() => {
			const W = window as any;
			const V = W.SugarCube.State.variables;
			V.player.vaginaExist = 1;
			V.player.penisExist = 0;
			V.settings.pregnancyType = "realistic";
			V.settings.humanPregnancyMonths = 1; // keeps the test's wall clock sane
			V.sexStats.vagina.menstruation.currentState = "fertile";
			V.settings.basePlayerPregnancyChance = 100;
			// Alex is on setup.pregnancy.canImpregnatePlayer, so eligibility is not what is under test
			const load = W.sceneInseminate("vagina", "Alex", "human", "deep");
			W.rollAndRecordConception("vagina");
			if (!V.pendingPregnancies.vagina && !W.getActivePregnancies("pc").length) {
				W.recordPendingPregnancy("vagina", V.cumLoads.vagina[0]);
			}
			W.startDuePregnancies();
			return { load: !!load, loads: V.cumLoads.vagina.length };
		});
		expect(seeded.load).toBe(true);
		expect(seeded.loads).toBeGreaterThan(0);

		// live it a day at a time: every daily tick runs the whole pregnancy pipeline
		const timeline = await page.evaluate(() => {
			const W = window as any;
			const V = W.SugarCube.State.variables;
			const log: any = { ticks: 0, throws: [], sawPregnant: false, sawLabour: false, progress: [] };
			for (let day = 0; day < 60; day++) {
				try {
					W.Time.pass(24 * 60 * 60);
				} catch (e) {
					log.throws.push("day " + day + ": " + (e as Error).message);
					break;
				}
				log.ticks++;
				const pregnancy = W.getPlayerPregnancy();
				if (pregnancy) {
					log.sawPregnant = true;
					log.progress.push(W.pregnancyProgress(pregnancy));
					if (pregnancy.waterBreaking) {
						log.sawLabour = true;
						break;
					}
				}
			}
			log.pregnancies = V.pregnancies.length;
			log.childRecords = V.childRecords.length;
			return log;
		});

		expect(timeline.throws).toEqual([]);
		expect(timeline.sawPregnant).toBe(true);
		expect(timeline.pregnancies).toBeGreaterThan(0);
		expect(timeline.childRecords).toBeGreaterThan(0);
		// progress climbs, never stalls at NaN, and reaches term
		const climbing = timeline.progress.every((value: number, i: number) => Number.isFinite(value) && (i === 0 || value >= timeline.progress[i - 1]));
		expect(climbing).toBe(true);
		expect(timeline.progress[timeline.progress.length - 1]).toBeGreaterThanOrEqual(1);
		expect(timeline.sawLabour).toBe(true);
		expect(pageErrors).toEqual([]);
	});
});

test.describe("merge smoke: combat", () => {
	test("a man combat runs many turns without a single widget error", async ({ page }) => {
		test.setTimeout(180000);
		const { pageErrors } = await boot(page);

		const result = await page.evaluate(() => {
			const W = window as any;
			const SC = W.SugarCube;
			const V = SC.State.variables;
			const errors: string[] = [];

			const render = (source: string, label: string) => {
				const div = document.createElement("div");
				document.body.appendChild(div);
				try {
					new SC.Wikifier(div, source);
				} catch (e) {
					errors.push(label + " THREW: " + (e as Error).message);
				}
				div.querySelectorAll(".error, .error-view").forEach(node => {
					errors.push(label + ": " + (node.textContent || "").replace(/\s+/g, " ").slice(0, 220));
				});
				const text = div.textContent || "";
				div.remove();
				return text;
			};

			V.player.vaginaExist = 1;
			V.player.penisExist = 0;
			render("<<generate1>><<person1>>", "generate");
			V.sexstart = 0;
			V.consensual = 0;
			render("<<maninit>>", "maninit");

			const turns: any[] = [];
			for (let turn = 0; turn < 18; turn++) {
				V.leftaction = turn % 2 === 0 ? "guard" : "rest";
				V.rightaction = "rest";
				V.enemyarousal = Math.min(V.enemyarousalmax, V.enemyarousal + V.enemyarousalmax / 6);
				const text = render("<<effects>><<effectsman>><<man>><<stateman>><<actionsman>>", "turn " + turn);
				turns.push({ turn, length: text.length });
				if (V.finish || SC.State.temporary.combatend) break;
			}

			return {
				errors,
				turns: turns.length,
				rendered: turns.every(t => t.length > 0),
				npcs: V.NPCList.length,
				healthFinite: Number.isFinite(V.enemyhealth),
				playerFinite: Number.isFinite(V.pain) && Number.isFinite(V.arousal),
			};
		});

		expect(result.errors).toEqual([]);
		expect(result.turns).toBeGreaterThan(5);
		expect(result.rendered).toBe(true);
		expect(result.npcs).toBeGreaterThan(0);
		expect(result.healthFinite).toBe(true);
		expect(result.playerFinite).toBe(true);
		expect(pageErrors).toEqual([]);
	});
});
