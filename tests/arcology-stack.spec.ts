import { test, expect } from "@playwright/test";
import { openGame, navigateTo, wikifyEval, assertNoErrors, setTime, type Page } from "./helpers.js";
test.setTimeout(120000);
async function start(page: Page) {
	await openGame(page);
	await navigateTo(page, "Start2");
	await wikifyEval(
		page,
		'<<arcologyInit>><<set $xchange.arcology.arrived to true>><<set $xchange.arcology.handle to "test-worker">><<arcologyStackStart "arcologyAbduction">>'
	);
	await page.evaluate(() => {
		const v = (window as any).SugarCube.State.variables;
		v.location = "arcology_stack";
		v.outside = 0;
		v.stress = 0;
		v.tiredness = 0;
		v.xchange.arcology.stack.job = "belt";
	});
}
test("Stack work, release, rescue, daily reset and cleanup", async ({ page }) => {
	await start(page);
	await setTime(page, 12);
	for (const job of ["Belt", "Reclamation", "Loading"]) {
		await navigateTo(page, "Arcology Stack " + job);
		await assertNoErrors(page);
		await expect(page.locator("#passages")).toContainText("Focus on the work");
	}
	await page.evaluate(() => ((window as any).SugarCube.State.variables.xchange.arcology.stack.debt = 0));
	await navigateTo(page, "Arcology Stack Belt");
	await expect(page.locator('#passages a[data-passage="Arcology Stack Release"]')).toHaveText(/Next/);
	await assertNoErrors(page);
	await page.evaluate(() => {
		const w = window as any;
		const v = w.SugarCube.State.variables;
		v.xchange.arcology.stack.debt = 75000;
		v.xchange.arcology.stack.day = 3;
		w.C.npc.Luchifen.love = 60;
	});
	await navigateTo(page, "Arcology Stack Loading");
	await expect(page.locator('#passages a[data-passage="Arcology Stack Rescue"]')).toHaveText(/Next/);
	await assertNoErrors(page);
	await navigateTo(page, "Arcology Stack Rescue");
	await assertNoErrors(page);
	await navigateTo(page, "Arcology Stack Rescue Stay");
	await assertNoErrors(page);
	await navigateTo(page, "Arcology Stack Belt");
	await expect(page.locator("#passages")).toContainText("Focus on the work");
	await wikifyEval(
		page,
		'<<set $daily.arcologyStackShift to true>><<set $daily.arcologyStackBand to true>><<arcologyStackEnd>><<arcologyStackStart "arcologyFine">>'
	);
	expect(await page.evaluate(() => (window as any).SugarCube.State.variables.daily.arcologyStackShift)).toBeUndefined();
	await assertNoErrors(page);
});
test("Stack legacy entry and all work event outcomes render", async ({ page }) => {
	await start(page);
	await page.evaluate(() => {
		const s = (window as any).SugarCube.State.variables.xchange.arcology.stack;
		for (const k of ["day", "jobs", "crew", "chips", "net", "favor", "revolt"]) delete s[k];
	});
	await navigateTo(page, "Arcology Stack");
	await assertNoErrors(page);
	const outcomes = {
		"Belt Ring": ["give", "kept", "caught"],
		Chip: [1, 0],
		"Belt Crate": [1, 0, 2],
		"Belt Collapse": [0, 1],
		"Belt Drone": [1, 0],
		"Reclamation Grip": [1, 2, 0],
		"Reclamation Lights": [1, 0],
		"Reclamation Core": [1, 0],
		"Loading Crane": [1, 0],
		"Loading Decoy": [1, 0],
		"Loading Message": [0],
		"Loading Smuggler": [1, 0],
		Rewire: [1, 0],
		Band: [1, 0],
		"Recondition 2": [1, 0, 2],
	};
	for (const [suffix, phases] of Object.entries(outcomes))
		for (const phase of phases) {
			await setTime(page, 12);
			await page.evaluate(p => {
				const v = (window as any).SugarCube.State.variables;
				v.phase = p;
				v.stress = 0;
				v.xchange.arcology.stack.fixer = { task: "drone", owed: false };
			}, phase);
			await wikifyEval(page, '<<arcologyNPC 0 "staff" "guard">><<person1>>');
			await navigateTo(page, "Arcology Stack " + suffix);
			await assertNoErrors(page);
		}
});
test("Stack swim outcomes and revolt exits render", async ({ page }) => {
	await start(page);
	await setTime(page, 23);
	for (const suffix of ["Swim Grate", "Swim Hull", "Swim Wake"])
		for (const phase of [0, 1, 2]) {
			await page.evaluate(p => {
				const v = (window as any).SugarCube.State.variables;
				v.phase = p;
				v.xchange.arcology.stack.swim = { air: 3 };
			}, phase);
			await navigateTo(page, "Arcology Stack " + suffix);
			await assertNoErrors(page);
		}
	for (const n of [0, 1, 2, 3]) {
		await page.evaluate(n => {
			const s = (window as any).SugarCube.State.variables.xchange.arcology.stack;
			(window as any).SugarCube.State.variables.phase = n;
			s.revolt = { lights: n > 0, decoy: n > 1, drones: n > 2 };
		}, n);
		await navigateTo(page, "Arcology Stack Revolt");
		await assertNoErrors(page);
	}
	for (const suffix of ["Revolt Victory", "Revolt Free", "Release", "Release 2", "Rescue Go"]) {
		await navigateTo(page, "Arcology Stack " + suffix);
		await assertNoErrors(page);
	}
});

test("Stack event pools expose every authored event without errors", async ({ page }) => {
	await start(page);
	const pools = {
		"Belt Events": ["quiet", "ring", "chip", "crate", "collapse", "visitor", "drone", "grope", "offer"],
		"Reclamation Events": ["quiet", "grip", "memory", "lights", "core", "tech", "assault", "offer"],
		"Loading Events": ["quiet", "schedule", "crane", "swimmer", "decoy", "message", "smuggler", "crew", "offer"],
		Talk: ["debt", "fixer", "flirt", "plan", "eavesdrop", "song", "grope", "nothing"],
	};
	for (const [suffix, names] of Object.entries(pools))
		for (const name of names) {
			await page.evaluate(
				({ name, suffix }) => {
					const v = (window as any).SugarCube.State.variables;
					v.phase = 0;
					v.stress = 0;
					v.eventPoolOverride = name;
					v.daily = {};
					v.weekly = {};
					Object.assign(v.xchange.arcology.stack, {
						debt: 75000,
						crew: 0,
						chips: 3,
						route: 0,
						buyerSeen: false,
						smuggler: false,
						revolt: { plan: name !== "plan" },
						fixer: name === "fixer" ? undefined : { task: suffix.startsWith("Loading") ? "message" : "drone", owed: false },
					});
				},
				{ name, suffix }
			);
			await setTime(page, suffix === "Talk" ? 23 : 12);
			await navigateTo(page, "Arcology Stack " + suffix);
			await assertNoErrors(page);
			expect(await page.evaluate(n => (window as any).SugarCube.State.temporary.eventpool.some(e => e.name === n), name)).toBe(true);
		}
});
test("Stack combat starts and resolves through native cleanup", async ({ page }) => {
	await start(page);
	await setTime(page, 12);
	const scenes = {
		"Barge Fight": "Barge Fight Finish",
		"Revolt Fight": "Revolt Fight Finish",
		"Belt Grope Rape": "Belt Grope Finish",
		"Reclamation Rape": "Reclamation Rape Finish",
		"Loading Rape": "Loading Rape Finish",
		"Grope Rape": "Grope Finish",
		"Passout Rape": "Passout Rape Finish",
		Favor: "Favor Finish",
		"Tech Sex": "Tech Sex Finish",
		"Buyer Sex": "Buyer Finish",
		"Buyer Rape": "Buyer Finish",
	};
	for (const [scene, finish] of Object.entries(scenes))
		for (const result of ["win", "orgasm", "loss"]) {
			await wikifyEval(page, '<<endevent>><<arcologyNPC 0 "staff" "guard">><<arcologyNPC 1 "staff" "guard">><<arcologyNPC 2 "staff" "guard">>');
			await page.evaluate(scene => {
				const v = (window as any).SugarCube.State.variables;
				v.fightstart = scene.includes("Fight") ? 1 : 0;
				v.sexstart = ["Favor", "Tech Sex", "Buyer Sex"].includes(scene) ? 1 : 0;
				v.molestationstart = scene.endsWith("Rape") ? 1 : 0;
				v.phase = scene === "Revolt Fight" ? 3 : 0;
				v.stress = 0;
				v.pain = 0;
				v.finish = 0;
				v.xchange.arcology.stack.job = "belt";
			}, scene);
			await navigateTo(page, "Arcology Stack " + scene);
			await assertNoErrors(page);
			await page.evaluate(r => {
				const v = (window as any).SugarCube.State.variables;
				v.enemyhealth = r === "win" ? 0 : 100;
				v.enemypleasure = r === "orgasm" ? v.enemypleasuremax : 0;
			}, result);
			await navigateTo(page, "Arcology Stack " + finish);
			await assertNoErrors(page);
			expect(await page.evaluate(() => (window as any).SugarCube.State.variables.combat)).toBe(0);
		}
	for (const scene of ["Tendrils", "Culture"]) {
		await page.evaluate(() => {
			const v = (window as any).SugarCube.State.variables;
			v.molestationstart = 1;
			v.stress = 0;
		});
		await navigateTo(page, "Arcology Stack Compactor " + scene);
		await assertNoErrors(page);
		await navigateTo(page, "Arcology Stack Compactor " + scene + " Finish");
		await assertNoErrors(page);
		expect(await page.evaluate(() => (window as any).SugarCube.State.variables.combat)).toBe(0);
	}
});
test("Stack shift charges once, legacy loads keep progress, sleep and travel advance the clock", async ({ page }) => {
	await start(page);
	await setTime(page, 12);
	await page.evaluate(() => {
		const v = (window as any).SugarCube.State.variables;
		v.xchange.arcology.stack.day = 1;
	});
	await navigateTo(page, "Arcology Stack Shift");
	await assertNoErrors(page);
	const initial = await page.evaluate(() => {
		const s = (window as any).SugarCube.State.variables.xchange.arcology.stack;
		return { day: s.day, debt: s.debt, job: s.job, jobs: s.jobs };
	});
	await navigateTo(page, "Arcology Stack Shift");
	await assertNoErrors(page);
	expect(
		await page.evaluate(() => {
			const s = (window as any).SugarCube.State.variables.xchange.arcology.stack;
			return { day: s.day, debt: s.debt, job: s.job, jobs: s.jobs };
		})
	).toEqual(initial);
	await page.evaluate(() => {
		const w = window as any;
		const s = w.SugarCube.State.variables.xchange.arcology.stack;
		delete s.day;
		delete s.revolt;
		s.band = 4;
		s.route = 3;
		w.SugarCube.State.history[w.SugarCube.State.activeIndex].variables.xchange.arcology.stack = structuredClone(s);
		const saved = w.SugarCube.Save.serialize();
		w.SugarCube.Save.deserialize(saved);
	});
	await navigateTo(page, "Arcology Stack Bunks");
	await assertNoErrors(page);
	expect(
		await page.evaluate(() => {
			const s = (window as any).SugarCube.State.variables.xchange.arcology.stack;
			return [s.band, s.route, s.debt, s.day];
		})
	).toEqual([4, 3, initial.debt, 0]);
	await navigateTo(page, "Arcology Stack Work");
	await assertNoErrors(page);
	await setTime(page, 23);
	await page.evaluate(() => {
		const v = (window as any).SugarCube.State.variables;
		v.sleephour = 12;
		v.tiredness = 1000;
		v.stress = 0;
	});
	await navigateTo(page, "Arcology Stack Sleep");
	await assertNoErrors(page);
	expect(await page.evaluate(() => (window as any).Time.hour)).toBe(6);
	await page.evaluate(() => {
		const v = (window as any).SugarCube.State.variables;
		v.phase = "hidden";
	});
	await navigateTo(page, "Arcology Stack Free");
	await assertNoErrors(page);
	const departed = await page.evaluate(() => (window as any).Time.date.timeStamp);
	await page.locator('#passages a[data-passage="Arcology Stack Barge Landing"]').click();
	await assertNoErrors(page);
	const elapsed = (await page.evaluate(() => (window as any).Time.date.timeStamp)) - departed;
	expect(elapsed).toBeGreaterThanOrEqual(48 * 3600);
	expect(elapsed).toBeLessThanOrEqual(120 * 3600);
});
test("Stack births use native records and restore stored clothes", async ({ page }) => {
	await start(page);
	await setTime(page, 12);
	for (const species of ["human", "wolf"]) {
		const id = await page.evaluate(species => {
			const w = window as any;
			const v = w.SugarCube.State.variables;
			v.stress = 0;
			const id = w.createPregnancy("pc", "human", species === "human" ? "Robin" : "Black Wolf", species, [], w.Time.date.timeStamp, "vagina", "arcology_stack");
			v.pregnancies[id].waterBreaking = true;
			return id;
		}, species);
		await navigateTo(page, "Arcology Stack Birth");
		await assertNoErrors(page);
		await navigateTo(page, "Arcology Stack Birth 2");
		await assertNoErrors(page);
		await page.locator("#passages a").filter({ hasText: "Next" }).last().click();
		await assertNoErrors(page);
		await page.locator("#passages a").filter({ hasText: "Next" }).last().click();
		expect(await page.evaluate(id => (window as any).SugarCube.State.variables.pregnancies[id].deliveredDate, id)).not.toBeNull();
		await assertNoErrors(page);
		expect(await page.evaluate(id => (window as any).SugarCube.State.variables.pregnancies[id].deliveredLocation, id)).toBe(
			species === "human" ? "home" : "wolf_cave"
		);
	}
});
test("Stack location assets, motion preference and holo cleanup follow passage changes", async ({ page }) => {
	await start(page);
	await setTime(page, 23);
	const images = {
		Belt: "arcology_stack",
		Reclamation: "arcology_stack_reclamation",
		Loading: "arcology_stack_loading",
		Bunks: "arcology_stack_bunks",
		Swim: "arcology_stack_hull",
		Pod: "arcology_stack_cells",
	};
	for (const [suffix, image] of Object.entries(images)) {
		await page.evaluate(() => {
			const v = (window as any).SugarCube.State.variables;
			v.stress = 0;
			v.xchange.arcology.stack.swim = { air: 3 };
		});
		await navigateTo(page, "Arcology Stack " + suffix);
		await assertNoErrors(page);
		expect(await page.evaluate(() => (window as any).SugarCube.setup.Locations.get())).toBe(image);
	}
	await page.emulateMedia({ reducedMotion: "reduce" });
	expect(await page.evaluate(() => (window as any).SugarCube.setup.arcology.sceneMotion())).toBe(false);
	await page.evaluate(() => {
		const a = (window as any).SugarCube.setup.arcology;
		a.holoTimers.push(
			setTimeout(() => {
				throw Error("stale holo timer");
			}, 60000)
		);
	});
	await navigateTo(page, "Arcology Stack Bunks");
	await assertNoErrors(page);
	expect(
		await page.evaluate(() => {
			const a = (window as any).SugarCube.setup.arcology;
			return [a.holoTimers.length, a.composeJobs.length, a.composeFrame];
		})
	).toEqual([0, 0, 0]);
	await wikifyEval(page, "<<arcologyStackEnd>>");
	expect(await page.evaluate(() => (window as any).SugarCube.State.variables.xchange.arcology.stack)).toBeUndefined();
	expect(
		await page.evaluate(() => {
			const s = (window as any).SugarCube.State.variables.storedNPCs;
			return ["stack_fixer", "stack_medic", "stack_buyer"].filter(k => s[k]);
		})
	).toEqual([]);
});
test("Stack keeps the generated NPC through the encounter and uses plain sole continuations", async ({ page }) => {
	await start(page);
	await setTime(page, 12);
	await page.evaluate(() => {
		const v = (window as any).SugarCube.State.variables;
		v.eventPoolOverride = "grope";
		v.phase = 0;
	});
	await navigateTo(page, "Arcology Stack Belt Events");
	await assertNoErrors(page);
	await page.evaluate(() => {
		(window as any).SugarCube.State.variables.NPCList[0].stackAuditIdentity = "supervisor";
	});
	await page.locator('#passages a[data-passage="Arcology Stack Belt Grope"]').filter({ hasText: "Keep sorting" }).click();
	expect(await page.evaluate(() => (window as any).SugarCube.State.variables.NPCList[0].stackAuditIdentity)).toBe("supervisor");
	await expect(page.locator("#passages a[data-passage]")).toHaveCount(1);
	await expect(page.locator("#passages a[data-passage]")).toHaveText(/^(?:\(\d+\)\s*)?Next$/);
	await page.locator("#passages a[data-passage]").click();
	await assertNoErrors(page);
	expect(await page.evaluate(() => (window as any).SugarCube.State.variables.NPCList[0].stackAuditIdentity)).toBe("supervisor");
	expect(await page.evaluate(() => (window as any).SugarCube.State.variables.bugNoticesShown?.dolx_personselect_missing)).not.toBe(true);
});
test("Stack narration links hide unavoidable time and distinguish Luchifen from the supervisor", async ({ page }) => {
	await start(page);
	await setTime(page, 12);
	await wikifyEval(page, "<<silverStrangerInit>><<set $xchange.silverStranger.nameKnown to true>>");
	await navigateTo(page, "Arcology Stack Intro 3");
	const markup = await page.locator("#passages .passage").last().innerHTML();
	const afterNarration = markup.slice(markup.indexOf("opening is too small.") + "opening is too small.".length);
	expect(afterNarration).toContain("Stress");
	expect(afterNarration.split("Stress")[0]).not.toMatch(/<br\b/);
	await navigateTo(page, "Arcology Stack Rescue");
	await navigateTo(page, "Arcology Stack Rescue Stay");
	await assertNoErrors(page);
	await expect(page.locator("#passages")).toContainText("The supervisor waits beside the doors for Luchifen to step inside");
	await expect(page.locator("#passages a[data-passage]")).toHaveCount(1);
	await expect(page.locator("#passages a[data-passage]")).toHaveText(/^(?:\(\d+\)\s*)?Next$/);
	await page.evaluate(() => {
		const v = (window as any).SugarCube.State.variables;
		v.phase = "hidden";
	});
	await navigateTo(page, "Arcology Stack Free");
	await expect(page.locator("#passages a[data-passage]")).toHaveCount(1);
	await expect(page.locator("#passages a[data-passage]")).toHaveText(/^(?:\(\d+\)\s*)?Next$/);
	await navigateTo(page, "Arcology Stack Bunks");
	expect(
		await page
			.locator("#passages a[data-passage]")
			.filter({ hasText: /\(\d+:\d+\)/ })
			.count()
	).toBe(0);
	await setTime(page, 23);
	await navigateTo(page, "Arcology Stack Bunks");
	expect(await page.locator("#passages a[data-passage]").count()).toBeGreaterThan(2);
	expect(
		await page
			.locator("#passages a[data-passage]")
			.filter({ hasText: /\(\d+:\d+\)/ })
			.count()
	).toBeGreaterThan(0);
	await page.evaluate(() => {
		const s = (window as any).SugarCube.State.variables.xchange.arcology.stack;
		s.band = s.bandMax;
		s.route = s.routeMax;
	});
	await setTime(page, 12);
	await navigateTo(page, "Arcology Stack Way Out");
	await expect(page.locator("#passages a[data-passage]")).toHaveCount(1);
	await expect(page.locator("#passages a[data-passage]")).toHaveText(/^(?:\(\d+\)\s*)?Next$/);
	await setTime(page, 23);
	await navigateTo(page, "Arcology Stack Way Out");
	await expect(page.locator("#passages a[data-passage]")).toHaveCount(2);
	await expect(page.locator('#passages a[data-passage="Arcology Stack Bunks"]')).toContainText("Back to the bunks");
});
test("Stack presentation preserves the Cry eligibility gate and separate trauma effects", async ({ page }) => {
	await start(page);
	await setTime(page, 23);
	await page.evaluate(() => {
		const v = (window as any).SugarCube.State.variables;
		v.innocencestate = 0;
		v.control = 0;
		v.trauma = 0;
		v.stress = 0;
	});
	await navigateTo(page, "Arcology Stack Pod");
	await assertNoErrors(page);
	await expect(page.locator('#passages a[data-passage="Arcology Stack Pod Cry"]')).toHaveCount(0);
	await expect(page.locator('#passages a[data-passage="Arcology Stack Pod End"]')).toHaveText(/^(?:\(\d+\)\s*)?Next$/);
	await navigateTo(page, "Arcology Stack Bunks");
	await page.evaluate(() => {
		const v = (window as any).SugarCube.State.variables;
		v.trauma = 3000;
		v.stress = 0;
	});
	await navigateTo(page, "Arcology Stack Pod");
	await assertNoErrors(page);
	await expect(page.locator('#passages a[data-passage="Arcology Stack Pod Cry"]')).toHaveCount(1);
	await expect(page.locator('#passages a[data-passage="Arcology Stack Pod End"]')).toContainText("Wait (2:00)");
	const eligible = await page.evaluate(() => (window as any).SugarCube.State.variables.trauma);
	await page.locator('#passages a[data-passage="Arcology Stack Pod Cry"]').click();
	await assertNoErrors(page);
	expect(await page.evaluate(() => (window as any).SugarCube.State.variables.trauma)).toBe(eligible - (100 + 50) * 1.5);
	await navigateTo(page, "Arcology Stack Bunks");
	await page.evaluate(() => {
		const v = (window as any).SugarCube.State.variables;
		v.trauma = 2000;
		v.stress = 0;
	});
	await navigateTo(page, "Arcology Stack Pod Cry");
	await assertNoErrors(page);
	expect(await page.evaluate(() => (window as any).SugarCube.State.variables.trauma)).toBe(1925);
});
