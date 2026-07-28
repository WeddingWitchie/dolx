import { test, expect } from "@playwright/test";
import { openGame, navigateTo, getVar, wikifyEval, wikifyToText, assertNoErrors, advanceHours } from "./helpers.js";

async function setupGame(page: import("@playwright/test").Page) {
	await openGame(page);
	await navigateTo(page, "Start2");
}

test.describe("Critter Magnet", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("backfills old saves and unlocks after 50 critter rapes", async ({ page }) => {
		await setupGame(page);
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			delete V.crittermagnettrait;
			delete V.critterrapestat;
			delete V.xchange.critterMagnetTraitEnabled;
		});
		await wikifyEval(page, "<<modupdate>><<xchange-init>>");
		expect(await getVar(page, "crittermagnettrait")).toBe(0);
		expect(await getVar(page, "critterrapestat")).toBe(0);
		expect((await getVar(page, "xchange")).critterMagnetTraitEnabled).toBe(1);

		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.critterrapestat = 50;
			V.crittermagnettrait = 0;
		});
		await advanceHours(page, 24);
		expect(await getVar(page, "crittermagnettrait")).toBe(1);
		expect(await getVar(page, "critter_magnet_trait_message")).toBe(1);
	});

	test("can be suppressed and regained through its player setting", async ({ page }) => {
		await setupGame(page);
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.critterrapestat = 50;
			V.crittermagnettrait = 1;
			V.xchange.critterMagnetTraitEnabled = 0;
		});
		await advanceHours(page, 24);
		expect(await getVar(page, "crittermagnettrait")).toBe(0);

		await page.evaluate(() => {
			(window as any).SugarCube.State.variables.xchange.critterMagnetTraitEnabled = 1;
		});
		await advanceHours(page, 24);
		expect(await getVar(page, "crittermagnettrait")).toBe(1);
	});

	test("regains a purchased starting trait after its setting is re-enabled", async ({ page }) => {
		await setupGame(page);
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.critterrapestat = 0;
			V.crittermagnettrait = 0;
			V.featsBoosts.upgrades.critterMagnetTrait = 1;
			V.xchange.critterMagnetTraitEnabled = 1;
		});
		await advanceHours(page, 24);
		expect(await getVar(page, "crittermagnettrait")).toBe(1);
	});

	test("appears as an interactive toggle under X-Change Appearance & Traits", async ({ page }) => {
		await setupGame(page);
		await page.evaluate(() => {
			const container = document.createElement("div");
			container.id = "critter-magnet-settings-test";
			document.body.append(container);
			new (window as any).SugarCube.Wikifier(container, "<<xchangeSettings>>");
		});
		const label = page.locator("#critter-magnet-settings-test label", { hasText: "Enable Critter Magnet trait" });
		await expect(label).toHaveCount(1);
		const checkbox = label.locator('input[type="checkbox"]');
		await expect(checkbox).toBeChecked();
		await checkbox.evaluate(element => (element as HTMLInputElement).click());
		expect((await getVar(page, "xchange")).critterMagnetTraitEnabled).toBe(0);
	});

	test("counts swarm and struggle rape once through the normal rape hook", async ({ page }) => {
		await setupGame(page);
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.critterrapestat = 0;
			V.rapeavoid = 1;
			V.consensual = 0;
			V.gamemode = "normal";
			V.enemytype = "swarm";
		});
		await wikifyEval(page, "<<raped>>");
		expect(await getVar(page, "critterrapestat")).toBe(1);

		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.rapeavoid = 1;
			V.enemytype = "struggle";
		});
		await wikifyEval(page, "<<raped>>");
		expect(await getVar(page, "critterrapestat")).toBe(2);
	});

	test("strips for swarms and locks swarm controls to submission", async ({ page }) => {
		await setupGame(page);
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.crittermagnettrait = 1;
			V.enemytype = "swarm";
			V.combat = 1;
		});
		await wikifyEval(page, '<<swarminit "spiders" "sac" "slipping" "break" "steady" 1 2>>');
		expect(await getVar(page, "critterMagnetStripped")).toBe(1);
		expect((await getVar(page, "worn")).upper.name).toBe("naked");

		const text = await wikifyToText(page, "<<swarmactions>>");
		expect(text).toContain("smothers any thought of resistance");
		expect(await getVar(page, "leftaction")).toBe("swarmrest");
		expect(await getVar(page, "rightaction")).toBe("swarmrest");
		expect(await getVar(page, "feetaction")).toBe("swarmrest");
	});

	test("locks critter-targeted actions in mixed combat action generation", async ({ page }) => {
		await setupGame(page);
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.crittermagnettrait = 1;
			V.lefttarget = "swarm";
			V.righttarget = "swarm";
			V.feettarget = "swarm";
		});
		await wikifyEval(
			page,
			'<<swarminit "slimes" "sac" "slipping" "break" "steady" 1 2>><<set _swarmamounts to $swarm.amount; _swarmsteady to "Welcome"; _leftOptions to "free"; _rightOptions to "free"; _feetOptions to "free">><<leftActionsSwarm>><<set $critterMagnetLeftActions to clone(_leftaction)>><<rightActionsSwarm>><<set $critterMagnetRightActions to clone(_rightaction)>><<feetActionsSwarm>><<set $critterMagnetFeetActions to clone(_feetaction)>>'
		);
		expect(Object.values(await getVar(page, "critterMagnetLeftActions"))).toEqual(["swarmrest"]);
		expect(Object.values(await getVar(page, "critterMagnetRightActions"))).toEqual(["swarmrest"]);
		expect(Object.values(await getVar(page, "critterMagnetFeetActions"))).toEqual(["swarmrest"]);
	});

	test("locks individual critter controls and willingly opens the mouth", async ({ page }) => {
		await setupGame(page);
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.crittermagnettrait = 1;
			V.combat = 1;
		});
		await wikifyEval(page, "<<struggle_init>><<struggle_creatures 1 2>>");
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.mouthuse = "struggle";
			V.mouthstate = "struggle";
			V.struggle.mouth.creature = "lurker";
			V.struggle.enemy[0].location = "mouth";
		});
		const text = await wikifyToText(page, "<<struggle_actions>>");
		expect(text).toContain("smothers any thought of resistance");
		expect(await getVar(page, "leftaction")).toBe("rest");
		expect(await getVar(page, "rightaction")).toBe("rest");
		expect(await getVar(page, "feetaction")).toBe("rest");
		expect(await getVar(page, "mouthaction")).toBe("open");
	});

	test("restores self-stripped clothing and clears its encounter marker", async ({ page }) => {
		await setupGame(page);
		const originalUpper = (await getVar(page, "worn")).upper.name;
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.crittermagnettrait = 1;
			V.enemytype = "swarm";
			V.combat = 0;
			V.rapeavoid = 1;
			V.sexavoid = 1;
		});
		await wikifyEval(page, '<<swarminit "spiders" "sac" "slipping" "break" "steady" 1 2>><<endcombat>>');
		expect(await getVar(page, "critterMagnetStripped")).toBeUndefined();
		expect((await getVar(page, "worn")).upper.name).toBe(originalUpper);
	});

	test("reduces stress and trauma gained during critter sex", async ({ page }) => {
		await setupGame(page);
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.crittermagnettrait = 1;
			V.enemytype = "struggle";
			V.rapeavoid = 0;
			V.sexavoid = 1;
			V.drunk = 0;
			V.stress = 0;
			V.trauma = 0;
			V.innocencestate = 0;
			V.rapetrait = 0;
			V.control = V.controlmax;
		});
		await wikifyEval(page, "<<stress 1>><<trauma 4>>");
		expect(await getVar(page, "stress")).toBe(10);
		expect(await getVar(page, "trauma")).toBe(1.5);
	});

	test("makes other partnered sex stressful and traumatic", async ({ page }) => {
		await setupGame(page);
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.crittermagnettrait = 1;
			V.enemytype = "man";
			V.rapeavoid = 0;
			V.sexavoid = 1;
			V.combat = 0;
			V.innocencestate = 0;
			V.stress = 0;
			V.trauma = 0;
			V.control = V.controlmax;
		});
		const text = await wikifyToText(page, "<<endcombat>>");
		expect(text).toContain("Sex without critters leaves you tense and unfulfilled");
		expect(await getVar(page, "stress")).toBeGreaterThan(0);
		expect(await getVar(page, "trauma")).toBeGreaterThan(0);
	});
});
