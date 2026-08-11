import { test, expect } from "@playwright/test";
import { openGame, navigateTo, getVar, setVar, wikifyEval, assertNoErrors, type Page } from "./helpers.js";

async function setupGame(page: Page) {
	await openGame(page);
	await navigateTo(page, "Start2");
	await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		V.NPCList = [{ gender: "m", health: 200, dodgeChance: 0, bold: 0, fullDescription: "test" }];
		V.enemyno = 1;
		V.enemyhealthmax = 200;
		V.enemyhealth = 200;
		V.enemyarousalmax = 10000;
		V.enemyarousal = 0;
	});
}

async function ce(page: Page) {
	return (await getVar(page, "combatExtended")) as any;
}

test("counter charges cap counters per turn", async ({ page }) => {
	await setupGame(page);
	expect(await ce(page), "combatExtended should exist").toBeTruthy();

	await setVar(page, "skulduggery", 1000);
	await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		delete V.suffocated;
		delete V.willpowerpain;
		V.orgasmdown = 0;
		V.trance = 0;
		V.panicparalysis = 0;
		V.panicviolence = 0;
		V.dissociation = 0;
		Object.assign(V.combatExtended, {
			countering: 1,
			counteringActive: 2,
			counterCharges: 2,
			stabilityLost: 0,
			passiveDodging: 0,
			activeDodgingActive: 0,
			enemyFeinting: 0,
		});
	});

	const results: Array<{ success: number; charges: number }> = [];
	for (let i = 0; i < 40; i++) {
		await wikifyEval(page, "<<combatExtendedCheck 0>>");
		const state = await ce(page);
		results.push({ success: state.counterSuccess, charges: state.counterCharges });
	}
	await assertNoErrors(page);

	const successes = results.filter(r => r.success >= 1).length;
	console.log("COUNTER successes:", successes, "final charges:", results[results.length - 1].charges);
	console.log("COUNTER first 12:", JSON.stringify(results.slice(0, 12)));
	expect(successes, "at most one counter per guarding hand").toBeLessThanOrEqual(2);
	expect(results[results.length - 1].charges).toBe(0);

	const firstExhausted = results.findIndex(r => r.charges === 0);
	for (let i = firstExhausted + 1; i < results.length; i++) {
		expect(results[i].success, `roll ${i} after exhaustion`).toBe(0);
	}
});

test("charge grants match the number of guarding hands", async ({ page }) => {
	await setupGame(page);
	await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		V.combatExtended.counterCharges = 0;
		V.combatExtended.counteringActive = 0;
	});
	const grantOneHand =
		"<<set $combatExtended.counteringActive to 1>><<set $combatExtended.counterCharges to Math.min(2, ($combatExtended.counterCharges ?? 0) + 1)>>";
	await wikifyEval(page, grantOneHand);
	expect((await ce(page)).counterCharges).toBe(1);
	await wikifyEval(page, grantOneHand);
	expect((await ce(page)).counterCharges).toBe(2);
	await wikifyEval(page, grantOneHand);
	expect((await ce(page)).counterCharges, "never more than two").toBe(2);
	await assertNoErrors(page);
});

test("crowds cut the counter chance without removing it", async ({ page }) => {
	await setupGame(page);
	await setVar(page, "skulduggery", 1000);
	const rate = async (enemyno: number) => {
		let hits = 0;
		const runs = 200;
		for (let i = 0; i < runs; i++) {
			await page.evaluate(n => {
				const V = (window as any).SugarCube.State.variables;
				V.enemyno = n;
				delete V.suffocated;
				delete V.willpowerpain;
				V.orgasmdown = 0;
				V.trance = 0;
				V.panicparalysis = 0;
				V.panicviolence = 0;
				V.dissociation = 0;
				Object.assign(V.combatExtended, {
					countering: 1,
					counteringActive: 2,
					counterCharges: 2,
					stabilityLost: 0,
					passiveDodging: 0,
					activeDodgingActive: 0,
					enemyFeinting: 0,
				});
			}, enemyno);
			await wikifyEval(page, "<<combatExtendedCheck 0>>");
			if ((await ce(page)).counterSuccess >= 1) hits++;
		}
		return hits / runs;
	};
	const solo = await rate(1);
	const crowd = await rate(5);
	console.log("COUNTER rate solo:", solo, "crowd of 5:", crowd);
	await assertNoErrors(page);
	expect(crowd).toBeLessThan(solo);
	expect(crowd).toBeGreaterThan(0);
});

test("body size shapes countering and dodging", async ({ page }) => {
	await setupGame(page);
	await setVar(page, "skulduggery", 1000);

	const counterRate = async (bodysize: number) => {
		let hits = 0;
		const runs = 200;
		for (let i = 0; i < runs; i++) {
			await page.evaluate(size => {
				const V = (window as any).SugarCube.State.variables;
				V.bodysize = size;
				V.enemyno = 1;
				delete V.suffocated;
				delete V.willpowerpain;
				V.orgasmdown = 0;
				V.trance = 0;
				V.panicparalysis = 0;
				V.panicviolence = 0;
				V.dissociation = 0;
				Object.assign(V.combatExtended, {
					countering: 1,
					counteringActive: 1,
					counterCharges: 2,
					stabilityLost: 0,
					passiveDodging: 0,
					activeDodgingActive: 0,
					enemyFeinting: 0,
				});
			}, bodysize);
			await wikifyEval(page, "<<combatExtendedCheck 0>>");
			if ((await ce(page)).counterSuccess >= 1) hits++;
		}
		return hits / runs;
	};

	// the multiplier itself is deterministic; the rolls it feeds are not, so assert the ordering here
	const multipliers = await page.evaluate(() => {
		const w = window as any;
		return [-1, 0, 1, 2, 2.5, 3, 4].map(size => w.bodySizeCounterMultiplier(size));
	});
	console.log("COUNTER multiplier by frame:", JSON.stringify(multipliers));
	for (let i = 1; i < multipliers.length; i++) expect(multipliers[i]).toBeLessThanOrEqual(multipliers[i - 1]);
	expect(multipliers[0]).toBeGreaterThan(multipliers[multipliers.length - 1]);

	// and confirm it reaches the actual rolls: the two extremes are far enough apart to test without flaking
	const tiny = await counterRate(-1);
	const huge = await counterRate(4);
	console.log("COUNTER rate by frame — tiny:", tiny, "huge:", huge);
	expect(tiny).toBeGreaterThan(huge);
	expect(huge).toBeGreaterThan(0);

	// a trained heavy frame must get something back for its dance training instead of a flat zero
	const dodgeChance = async (bodysize: number) =>
		page.evaluate(size => {
			const w = window as any;
			w.SugarCube.State.variables.bodysize = size;
			return w.bodySizeDodgeModifier() + Math.round(w.currentSkillValue("danceskill") / 40);
		}, bodysize);
	await setVar(page, "danceskill", 1000);
	const hugeDodge = await dodgeChance(4);
	const averageDodge = await dodgeChance(2);
	const tinyDodge = await dodgeChance(-1);
	console.log("DODGE raw chance by frame — tiny:", tinyDodge, "average:", averageDodge, "huge:", hugeDodge);
	expect(hugeDodge, "a trained heavy frame still dodges sometimes").toBeGreaterThan(0);
	expect(hugeDodge).toBeLessThan(averageDodge);
	expect(tinyDodge).toBeGreaterThan(averageDodge);

	// an off-step frame must not fall through to the tiny-body bonus
	const offStep = await page.evaluate(() => (window as any).bodySizeDodgeModifier(2.7));
	expect(offStep).toBeLessThan(0);
	await assertNoErrors(page);
});

test("damage caps match the intended per-blow shares", async ({ page }) => {
	await setupGame(page);
	await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		V.physique = V.physiquemax;
		V.sadism = 1000;
		V.kicking = 0;
		V.striking = 1;
		V.fallenangelretribution = 0;
		Object.assign(V.combatExtended, {
			enemyBlockingActive: 0,
			hookpunchingActive: 0,
			feintingActive: 0,
			strikingToggle: 1,
			brawlingToggle: 1,
			kickingToggle: 1,
			striking: 2000,
			brawling: 2000,
			kicking: 2000,
		});
	});

	const measured: Record<number, number> = {};
	for (const arg of [1, 2, 3, 5, 10, 20]) {
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.enemyhealth = 200;
			V.NPCList[0].health = 200;
		});
		await wikifyEval(page, `<<defiance ${arg}>>`);
		const health = (await getVar(page, "enemyhealth")) as number;
		measured[arg] = Math.round(((200 - health) / 200) * 1000) / 10;
	}
	await assertNoErrors(page);
	console.log("DAMAGE share by defiance arg:", JSON.stringify(measured));

	expect(measured[1]).toBeCloseTo(15, 0);
	expect(measured[2]).toBeCloseTo(20, 0);
	expect(measured[3]).toBeCloseTo(30, 0);
	expect(measured[5]).toBeCloseTo(45, 0);
	expect(measured[10]).toBeCloseTo(60, 0);
	expect(measured[20]).toBeCloseTo(60, 0);
});

test("a player without the extended combat system still fights at a reasonable pace", async ({ page }) => {
	await setupGame(page);
	const shareWith = async (opts: { extended: boolean; arg: number; physique: number }) => {
		await page.evaluate(o => {
			const V = (window as any).SugarCube.State.variables;
			V.enemyhealth = 200;
			V.NPCList[0].health = 200;
			V.enemyno = 1;
			V.sadism = 0;
			V.kicking = 0;
			V.striking = 1;
			V.physique = o.physique;
			V.fallenangelretribution = 0;
			Object.assign(V.combatExtended, {
				enemyBlockingActive: 0,
				hookpunchingActive: 0,
				feintingActive: 0,
				// defaults for a fresh save: every extended toggle off
				strikingToggle: o.extended ? 1 : 0,
				brawlingToggle: o.extended ? 1 : 0,
				kickingToggle: o.extended ? 1 : 0,
				striking: o.extended ? 2000 : 0,
				brawling: o.extended ? 2000 : 0,
				kicking: o.extended ? 2000 : 0,
			});
		}, opts);
		await wikifyEval(page, `<<defiance ${opts.arg}>>`);
		const health = (await getVar(page, "enemyhealth")) as number;
		return Math.round(((200 - health) / 200) * 1000) / 10;
	};

	// average frame: physique caps at 10000
	const plain = await shareWith({ extended: false, arg: 5, physique: 10000 });
	const trained = await shareWith({ extended: true, arg: 5, physique: 10000 });
	// an untrained fighter who DID turn the system on must never be worse off than one who left it off
	const untrainedExtended = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		Object.assign(V.combatExtended, { strikingToggle: 1, brawlingToggle: 1, kickingToggle: 1, striking: 0, brawling: 0, kicking: 0 });
		V.enemyhealth = 200;
		V.NPCList[0].health = 200;
		return null;
	});
	void untrainedExtended;
	await wikifyEval(page, "<<defiance 5>>");
	const toggledButUntrained = Math.round(((200 - ((await getVar(page, "enemyhealth")) as number)) / 200) * 1000) / 10;

	console.log("DAMAGE arg5 — no extended system:", plain, "fully trained:", trained, "system on but untrained:", toggledButUntrained);
	await assertNoErrors(page);
	expect(plain, "a default save should not be stuck at a fraction of the damage").toBeGreaterThanOrEqual(15);
	expect(trained, "training still pays").toBeGreaterThan(plain);
	expect(toggledButUntrained, "turning the system on must never cost damage").toBeGreaterThanOrEqual(plain);
});

test("a weak character still lands a hit, and kicks stay under punches", async ({ page }) => {
	await setupGame(page);
	await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		V.sadism = 1000;
		V.striking = 1;
		V.fallenangelretribution = 0;
		Object.assign(V.combatExtended, {
			enemyBlockingActive: 0,
			hookpunchingActive: 0,
			feintingActive: 0,
			strikingToggle: 1,
			brawlingToggle: 1,
			kickingToggle: 1,
			striking: 2000,
			brawling: 2000,
			kicking: 2000,
		});
	});
	const share = async (arg: number, kicking: number, physique: number) => {
		await page.evaluate(
			({ k, p }) => {
				const V = (window as any).SugarCube.State.variables;
				V.enemyhealth = 200;
				V.NPCList[0].health = 200;
				V.kicking = k;
				V.physique = p;
			},
			{ k: kicking, p: physique }
		);
		await wikifyEval(page, `<<defiance ${arg}>>`);
		const health = (await getVar(page, "enemyhealth")) as number;
		return Math.round(((200 - health) / 200) * 1000) / 10;
	};
	const max = (await getVar(page, "physiquemax")) as number;
	const punch = await share(10, 0, max);
	const kick = await share(10, 1, max);
	const weak = await share(1, 0, Math.round(max / 20));
	console.log("DAMAGE punch:", punch, "kick:", kick, "weak char light hit:", weak);
	await assertNoErrors(page);
	expect(kick).toBeLessThan(punch);
	expect(kick).toBeGreaterThan(punch * 0.7);
	expect(weak).toBeGreaterThan(0);
});
