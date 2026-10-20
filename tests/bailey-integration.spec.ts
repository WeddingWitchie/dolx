import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { openGame, navigateTo, wikifyToText, assertNoErrors } from "./helpers.js";

test.beforeEach(async ({ page }) => {
	await openGame(page);
	await navigateTo(page, "Start2");
	await navigateTo(page, "Bedroom");
	await page.evaluate(() => {
		const w = window as any;
		w.SugarCube.Wikifier.wikifyEval("<<npc Bailey>><<person1>><<neutral 1>><<maninit>>");
	});
});

test("Bailey combat dialogue renders with the native speech state", async ({ page }) => {
	const text = await wikifyToText(page, "<<set $speechmoan to 1>><<speech-bailey>>");
	expect(text).not.toMatch(/Error\s*[:(]/);
	expect(text.trim().length).toBeGreaterThan(0);
	await assertNoErrors(page);
});

test("Bailey pill reveal reacts once and keeps its combat effects", async ({ page }) => {
	const result = await page.evaluate(() => {
		const w = window as any;
		const v = w.SugarCube.State.variables;
		v.speechpillreveal = 1;
		const anger = v.enemyanger;
		const trust = v.enemytrust;
		const div = document.createElement("div");
		new w.SugarCube.Wikifier(div, "<<speech-bailey>>");
		return { text: div.textContent, flag: v.speechpillreveal, anger: v.enemyanger - anger, trust: v.enemytrust - trust };
	});
	expect(result.text).not.toMatch(/Error\s*[:(]/);
	expect(result.text).toContain("X-Change");
	expect(result.flag).toBe(0);
	expect(result.anger).toBe(20);
	expect(result.trust).toBe(-20);
});

test("native speech flags select their intended dialogue categories", async ({ page }) => {
	const failures = await page.evaluate(() => {
		const w = window as any;
		const v = w.SugarCube.State.variables;
		const t = w.SugarCube.State.temporary;
		const cases = {
			speechmoan: "moan",
			speechplead: "plead",
			speechdemand: "demand",
			speechscream: "screamForHelp",
			speechspray: "pepperSpray",
			speechgenitals: "expose",
			speechbreasts: "expose",
			speechpregnant: "pregnant",
			speechsextoy: "sexToy",
			speechhit: "playerHits",
			speechbeat: "playerBeaten",
			speechstruggle: "struggle",
			speechwheeze: "choked",
			speechwheezelewd: "choked",
			speechwheezeaskchokerough: "choked",
			speechvaginapenetrated: "penetrated",
			speechotheranusentrance: "imminent",
			speechpenisentrance: "imminent",
			speechmouthotheranus: "oral",
			speechvaginamouth: "oral",
			speechfallentransform: "virginity",
		};
		v.settings.pregnancySpeechEnabled = true;
		const errors: string[] = [];
		for (const [flag, category] of Object.entries(cases)) {
			for (const key of Object.keys(v)) if (key.startsWith("speech") && key !== "speech_attitude") delete v[key];
			delete t.speechPool;
			v[flag] = 1;
			const div = document.createElement("div");
			new w.SugarCube.Wikifier(div, "<<speech-bailey>>");
			if (/Error\s*[:(]/.test(div.textContent || "")) errors.push(`${flag}: ${div.textContent}`);
			if (v.speechSaidLines?.Bailey?.at(-1)?.category !== category) errors.push(`${flag}: expected ${category}, got ${JSON.stringify(v.speechSaidLines)}`);
		}
		return errors;
	});
	expect(failures).toEqual([]);
});

test("all eligible Bailey lines render across relationship and anatomy branches", async ({ page }) => {
	const flags = [...new Set(readFileSync(new URL("../game/base-combat/speech/speech-bailey.twee", import.meta.url), "utf8").match(/\$speech\w+/g))];
	const result = await page.evaluate(flags => {
		const w = window as any,
			sc = w.SugarCube,
			v = sc.State.variables,
			t = sc.State.temporary;
		const errors: string[] = [];
		let rendered = 0;
		for (const dom of [10, 50, 90])
			for (const sex of ["m", "f"])
				for (const fight of [false, true]) {
					for (const flag of flags) if (!["$speech_attitude", "$speechpill", "$speechpillreveal", "$speechorgasmcount"].includes(flag)) v[flag.slice(1)] = 1;
					v.speechpill = 0;
					v.speechpillreveal = 0;
					v.baileyUniqueComments = [];
					v.consensual = fight ? 0 : 1;
					v.syndromebailey = dom >= 70;
					w.C.npc.Bailey.dom = dom;
					w.C.npc.Bailey.gender = sex;
					w.C.npc.Bailey.pronoun = sex;
					v.encounterDialogue = fight ? "baileyFlatFight" : undefined;
					t.loveInterest = "Robin";
					for (const key of ["penile", "vaginal", "oral", "anal", "kiss"]) v.player.virginity[key] = "Bailey";
					delete t.speechPool;
					const outer = document.createElement("div");
					new sc.Wikifier(outer, "<<speech-bailey>>");
					if (/Error\s*[:(]/.test(outer.textContent || "")) errors.push(`${dom}/${sex}/${fight}: ${outer.textContent}`);
					for (const line of t.speechPool?.Bailey?.lines || []) {
						const div = document.createElement("div");
						new sc.Wikifier(div, line.content);
						rendered++;
						if (/Error\s*[:(]/.test(div.textContent || "")) errors.push(`${dom}/${sex}/${fight}: ${div.textContent}`);
					}
				}
		return { rendered, errors };
	}, flags);
	expect(result.errors).toEqual([]);
	expect(result.rendered).toBeGreaterThan(300);
});

test("Bailey's paired moan reply follows the player's actual line", async ({ page }) => {
	const result = await page.evaluate(() => {
		const w = window as any,
			sc = w.SugarCube,
			v = sc.State.variables;
		v.loveInterest = { primary: "Bailey", secondary: "None" };
		v.syndromebailey = true;
		v.speechmoan = 1;
		const pc = document.createElement("div"),
			npc = document.createElement("div");
		for (let attempt = 0; attempt < 100 && !v.speechSaidLines?.pc?.length; attempt++) new sc.Wikifier(pc, "<<actionsmoan>>");
		new sc.Wikifier(npc, "<<speech-bailey>>");
		return { pc: pc.textContent, npc: npc.textContent, category: v.speechSaidLines?.Bailey?.at(-1)?.category };
	});
	expect(result.pc).not.toMatch(/Error\s*[:(]/);
	expect(result.npc).not.toMatch(/Error\s*[:(]/);
	expect(result.category).toBe("pairedReply");
});

for (const fight of [false, true])
	test(`pill transformation still reacts during ${fight ? "flat fights" : "ordinary encounters"}`, async ({ page }) => {
		const text = await wikifyToText(
			page,
			`<<set $encounterDialogue to ${fight ? '"baileyFlatFight"' : "undefined"}>><<set $speechpill to "herm">><<speech-bailey>>`
		);
		expect(text).not.toMatch(/Error\s*[:(]/);
		expect(text).toContain("mismatched new anatomy");
	});

for (const pain of [20, 70])
	test(`safe word exits a flat fight at pain ${pain} and cleans combat state`, async ({ page }) => {
		await page.evaluate(p => {
			const v = (window as any).SugarCube.State.variables;
			v.baileySafeWord = "Marshmallow";
			v.safeWordEncounter = "baileyFlatFight";
			v.mouthaction = "safeword";
			v.pain = p;
			v.bailey_weekend_visits = 3;
		}, pain);
		await navigateTo(page, "Bailey Flat Fight Combat");
		await assertNoErrors(page);
		const state = await page.evaluate(() => {
			const v = (window as any).SugarCube.State.variables;
			return {
				combat: v.combat,
				marker: v.safeWordEncounter,
				action: v.mouthaction,
				visits: v.bailey_weekend_visits,
				bed: v.bailey_sleep_config,
				history: v.speechSaidLines,
			};
		});
		expect(state.combat).toBe(0);
		expect(state.marker).toBeUndefined();
		expect(state.history).toBeUndefined();
		expect(state.action).toBe(0);
		expect(state.visits).toBe(4);
		expect(state.bed).toBe(pain >= 60 ? "alone_bed" : "alone_couch");
	});

for (const consensual of [0, 1])
	test(`ordinary safe word response respects consent ${consensual}`, async ({ page }) => {
		const text = await wikifyToText(
			page,
			`<<set $baileySafeWord to "Marshmallow">><<set $mouthaction to "safeword">><<set $consensual to ${consensual}>><<effectsman>>`
		);
		expect(text).not.toMatch(/Error\s*[:(]/);
		expect(text).toContain("Marshmallow");
		const finish = await page.evaluate(() => (window as any).SugarCube.State.variables.finish);
		if (consensual) expect(finish).toBe(1);
		else expect(text).toContain("word has no effect");
	});

for (const ingredients of [[], ["milk", "honey"]])
	test(`coffee preference ${JSON.stringify(ingredients)} survives a return visit`, async ({ page }) => {
		await page.evaluate(coffee => {
			const v = (window as any).SugarCube.State.variables;
			v.baileyCoffee = coffee;
			v.bailey_weekend_visits = 4;
		}, ingredients);
		await navigateTo(page, "Bailey Date All Night Coffee");
		await assertNoErrors(page);
		await page.getByRole("link", { name: /Drink the coffee$/ }).click();
		await assertNoErrors(page);
		expect(await page.locator("#passages").innerText()).toContain(ingredients.length ? "Milk and honey" : "Black");
	});

test("first coffee choice offers each ingredient only once", async ({ page }) => {
	await page.evaluate(() => {
		const v = (window as any).SugarCube.State.variables;
		v.baileyCoffee = [];
		v.phase = 0;
	});
	await navigateTo(page, "Bailey Date All Night Coffee Ingredients");
	for (const item of ["milk", "cream", "sugar", "honey"]) {
		await page.getByRole("link", { name: new RegExp(`Add the ${item}$`) }).click();
		await assertNoErrors(page);
		await expect(page.getByRole("link", { name: new RegExp(`Add the ${item}$`) })).toHaveCount(0);
	}
	await page.getByRole("link", { name: /That's enough$/ }).click();
	await assertNoErrors(page);
});

test("sale settlement collects HBSC debt and advances rent once", async ({ page }) => {
	const state = await page.evaluate(() => {
		const w = window as any,
			sc = w.SugarCube,
			v = sc.State.variables;
		v.rentmoney = 10000;
		v.rentstage = 1;
		v.money = 200000;
		v.babyRent = 2000;
		v.bailey_brat = { points: 2, reasons: [] };
		v.baileyDeposit = 5000;
		const loan = w.setup.hbsc.ensureLoanState();
		loan.owed = 80000;
		loan.autoRepay = true;
		v.settings.inflationLoanRentSurcharge = 50000;
		let advanced = 0;
		const advance = w.setup.inflation.advanceRentPressure;
		w.setup.inflation.advanceRentPressure = () => {
			advanced++;
			advance();
		};
		const div = document.createElement("div");
		new sc.Wikifier(div, "<<baileyOfferSettleRent>>");
		w.setup.inflation.advanceRentPressure = advance;
		return { text: div.textContent, money: v.money, owed: loan.owed, stage: v.rentstage, advanced, deposit: v.baileyDeposit, tax: v.bratTax };
	});
	expect(state.text).not.toMatch(/Error\s*[:(]/);
	expect(state.money).toBe(141000);
	expect(state.owed).toBe(30000);
	expect(state.stage).toBe(2);
	expect(state.advanced).toBe(1);
	expect(state.deposit).toBe(0);
	expect(state.tax).toBe(0);
});

test("combat speech history is cleared when ending an event", async ({ page }) => {
	await wikifyToText(page, "<<speech-bailey>><<endevent>>");
	expect(await page.evaluate(() => (window as any).SugarCube.State.variables.speechSaidLines)).toBeUndefined();
});

for (const controls of ["radio", "lists"])
	test(`safe word can be used with ${controls} combat controls`, async ({ page }) => {
		await page.evaluate(controls => {
			const v = (window as any).SugarCube.State.variables;
			v.baileySafeWord = "Marshmallow";
			v.fightstart = 1;
			v.bailey_weekend_visits = 3;
			v.options.combatControls = controls;
		}, controls);
		await navigateTo(page, "Bailey Flat Fight Combat");
		await assertNoErrors(page);
		if (controls === "lists") {
			await page.locator("#listbox-mouthaction").selectOption({ label: "Use your safe word" });
			await expect(page.locator("#mouthactionSelect")).toHaveClass(/bailey-redList/);
		} else await page.getByRole("radio", { name: /Use your safe word/ }).check();
		await page.locator("#next a").click();
		await assertNoErrors(page);
		expect(await page.locator("#passages").innerText()).toContain("stops immediately");
		expect(await page.evaluate(() => (window as any).SugarCube.State.variables.combat)).toBe(0);
	});

for (const flag of ["speechsextoy", "speechpenissmall"])
	test(`${flag} is consumed after Bailey reacts`, async ({ page }) => {
		await wikifyToText(page, `<<set $${flag} to 1>><<speech-bailey>>`);
		expect(await page.evaluate(flag => (window as any).SugarCube.State.variables[flag], flag)).toBe(0);
	});

test("safe word input rejects NPC names and cleans markup", async ({ page }) => {
	for (const word of ["Bailey", "Robin", "Kylar"]) {
		const text = await wikifyToText(page, `<<set $baileySafeWord to "${word}">><<include "Bailey Safe Word Reaction">>`);
		expect(text).not.toMatch(/Error\s*[:(]/);
		expect(text).toContain("Pick a different one");
		expect(await page.evaluate(() => (window as any).SugarCube.State.variables.baileySafeWord)).toBeUndefined();
	}
	const text = await wikifyToText(page, '<<set $baileySafeWord to "<<script>>">><<baileySafeWordClean>><<BaileySafeWord>>');
	expect(text).toBe("Script");
});

test("Robin rent payment checks recompute tax and include HBSC debt", async ({ page }) => {
	const state = await page.evaluate(() => {
		const w = window as any,
			sc = w.SugarCube,
			v = sc.State.variables;
		v.rentmoney = 10000;
		v.babyRent = 0;
		v.baileyDeposit = 0;
		v.money = 10000;
		v.bailey_brat = { points: 2, reasons: [] };
		v.bratTax = 0;
		const loan = w.setup.hbsc.ensureLoanState();
		loan.owed = 50000;
		loan.autoRepay = true;
		v.settings.inflationLoanRentSurcharge = 50000;
		v.mouthaction = "pay";
		const div = document.createElement("div");
		new sc.Wikifier(div, "<<effectsman>>");
		return { text: div.textContent, result: v.speechpay, tax: v.bratTax };
	});
	expect(state.text).not.toMatch(/Error\s*[:(]/);
	expect(state.result).toBe(-1);
	expect(state.tax).toBe(2000);
});

test("reclaim quote includes the debt surcharge and deducts rent paid in advance", async ({ page }) => {
	const text = await page.evaluate(() => {
		const w = window as any,
			sc = w.SugarCube,
			v = sc.State.variables;
		v.rentmoney = 10000;
		v.bailey_brat = { points: 2, reasons: [] };
		v.bailey_confiscation = {};
		v.baileyDeposit = 5000;
		v.money = 50000;
		const loan = w.setup.hbsc.ensureLoanState();
		loan.owed = 50000;
		loan.autoRepay = true;
		v.settings.inflationLoanRentSurcharge = 50000;
		const div = document.createElement("div");
		new sc.Wikifier(div, "<<baileyRentReclaimOption>>");
		return div.textContent;
	});
	expect(text).not.toMatch(/Error\s*[:(]/);
	expect(text).toContain("570");
	expect(text).toContain("can't afford it");
});

test("Bailey notices a newly revealed toy through native combat", async ({ page }) => {
	const text = await wikifyToText(page, "<<set $dildoreveal to 1>><<man>><<speech-bailey>>");
	expect(text).not.toMatch(/Error\s*[:(]/);
	expect(await page.evaluate(() => (window as any).SugarCube.State.variables.speechSaidLines?.Bailey?.at(-1)?.category)).toBe("sexToy");
});

test("Avery reacts when the player calls for Bailey", async ({ page }) => {
	const text = await wikifyToText(
		page,
		'<<endevent>><<npc Avery>><<person1>><<neutral 1>><<maninit>><<set _loveInterest to "Bailey">><<set $speechnamedrop to 1>><<speech-avery>>'
	);
	expect(text).not.toMatch(/Error\s*[:(]/);
	expect(text).toContain("How dare you bring");
});

test("older saves enter the new scenes without initializing preferences prematurely", async ({ page }) => {
	await page.evaluate(() => {
		const v = (window as any).SugarCube.State.variables;
		delete v.baileySafeWord;
		delete v.baileyCoffee;
		delete v.speechSaidLines;
		v.bailey_weekend_visits = 0;
	});
	await navigateTo(page, "Bailey Flat Fight");
	await assertNoErrors(page);
	await expect(page.getByRole("link", { name: /Agree to fight/ })).toHaveCount(1);
	await navigateTo(page, "Bailey Date All Night Coffee");
	await assertNoErrors(page);
	expect(
		await page.evaluate(() => {
			const v = (window as any).SugarCube.State.variables;
			return { word: v.baileySafeWord, coffee: v.baileyCoffee };
		})
	).toEqual({ word: undefined, coffee: undefined });
});

test("safe word and coffee preferences survive a normal save round trip", async ({ page }) => {
	await page.evaluate(() => {
		const v = (window as any).SugarCube.State.variables;
		v.baileySafeWord = "Lotus";
		v.baileyCoffee = ["milk", "honey"];
	});
	await navigateTo(page, "Bedroom");
	const restored = await page.evaluate(() => {
		const w = window as any,
			v = w.SugarCube.State.variables;
		const save = w.SerializeGame();
		v.baileySafeWord = "Changed";
		v.baileyCoffee = [];
		return w.DeserializeGame(save);
	});
	expect(restored).not.toBeNull();
	await assertNoErrors(page);
	expect(
		await page.evaluate(() => {
			const v = (window as any).SugarCube.State.variables;
			return { word: v.baileySafeWord, coffee: v.baileyCoffee };
		})
	).toEqual({ word: "Lotus", coffee: ["milk", "honey"] });
});

test("failed sale settlement preserves unpaid tax, deposit, and rent stage", async ({ page }) => {
	const state = await page.evaluate(() => {
		const w = window as any,
			sc = w.SugarCube,
			v = sc.State.variables;
		v.rentmoney = 10000;
		v.babyRent = 0;
		v.money = 0;
		v.baileyDeposit = 1000;
		v.rentstage = 1;
		v.bailey_brat = { points: 2, reasons: ["pounce"] };
		new sc.Wikifier(document.createElement("div"), "<<baileyOfferSettleRent>>");
		return { tax: v.bratTax, points: v.bailey_brat.points, deposit: v.baileyDeposit, stage: v.rentstage };
	});
	expect(state).toEqual({ tax: 2000, points: 2, deposit: 1000, stage: 1 });
});
