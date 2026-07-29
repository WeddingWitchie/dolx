import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { openGame, navigateTo, setTime, wikifyEval, wikifyToText, assertNoErrors } from "./helpers.js";

async function setupBlackmailDelivery(page: Page, intro = 1, courier = "home") {
	await openGame(page);
	await navigateTo(page, "Start2");
	await page.evaluate(
		({ firstLetterRead, courierValue }) => {
			const V = (window as any).SugarCube.State.variables;
			Object.assign(V.xchange.blackmail, {
				intro: firstLetterRead,
				activeQuest: undefined,
				hasMaterial: true,
				hasNewMaterial: true,
				hasReadLetter: false,
				cooldown: 0,
				conclusionPending: false,
				courier: courierValue,
				courierAfk: false,
				courierReady: false,
			});
			V.xchange.blackmailHalt = 0;
			V.possessed = 0;
			V.exposed = 0;
			V.stress = 0;
		},
		{ firstLetterRead: intro, courierValue: courier }
	);
	await setTime(page, 12, 0);
}

/**
 * Force the next <<rng min max>> roll(s) to a fixed value via the game's own
 * debug override seam (base.js' <<rng>> macro: V.debug === 1 && typeof
 * V.rngOverride === "number"). Math.random can't be monkeypatched for this —
 * DoL's RNG is seeded, not backed by Math.random. The override ignores the
 * macro's min/max entirely, so when a single passage render rolls more than
 * one <<rng>> (e.g. a courier's destroy roll followed by blackmail-newquest's
 * own quest-index roll), pick a value valid for every roll in that render —
 * 0 always is (0 <= 25 for a destroy roll, and index 0 always exists in a
 * non-empty quest list).
 */
async function forceRng(page: Page, value: number) {
	await page.evaluate(v => {
		const V = (window as any).SugarCube.State.variables;
		V.debug = 1;
		V.rngOverride = v;
	}, value);
}

async function clearRngOverride(page: Page) {
	await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		V.debug = 0;
		delete V.rngOverride;
	});
}

test.describe("Gentleman's Club letter deliveries", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("backfills both feats only for saves already at the unpaid stage", async ({ page }) => {
		await setupBlackmailDelivery(page);
		let feats = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			delete V.xchange.backComp.gentlemansClubFeats;
			delete V.xchange.blackmail.paymentsRemoved;
			delete V.feats.currentSave["How They Get You"];
			delete V.feats.currentSave["They Got You"];
			V.xchange.blackmail.questsCompleted = 10;
			(window as any).SugarCube.Wikifier.wikifyEval("<<xchange-modupdate>>");
			return {
				backfillRan: V.xchange.backComp.gentlemansClubFeats,
				howTheyGetYou: V.feats.currentSave["How They Get You"],
				theyGotYou: V.feats.currentSave["They Got You"],
			};
		});
		expect(feats).toEqual({
			backfillRan: true,
			howTheyGetYou: undefined,
			theyGotYou: undefined,
		});

		feats = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			delete V.xchange.backComp.gentlemansClubFeats;
			V.xchange.blackmail.paymentsRemoved = 1;
			(window as any).SugarCube.Wikifier.wikifyEval("<<xchange-modupdate>>");
			return {
				backfillRan: V.xchange.backComp.gentlemansClubFeats,
				howTheyGetYou: V.feats.currentSave["How They Get You"] instanceof Date,
				theyGotYou: V.feats.currentSave["They Got You"] instanceof Date,
			};
		});
		expect(feats).toEqual({
			backfillRan: true,
			howTheyGetYou: true,
			theyGotYou: true,
		});
	});

	test("reaching the unpaid stage awards both Club feats", async ({ page }) => {
		await setupBlackmailDelivery(page);
		await wikifyEval(page, "<<blackmail-newquest>>");
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			delete V.feats.currentSave["How They Get You"];
			delete V.feats.currentSave["They Got You"];
			delete V.xchange.blackmail.paymentsRemoved;
			V.xchange.blackmail.questsCompleted = 5;
			V.xchange.blackmail.penaltyThreat.exhibitionism = 1000;
			V.xchange.blackmail.activeQuest.cleared = true;
			V.xchange.blackmail.activeQuest.failed = false;
		});

		await navigateTo(page, "Blackmail Conclusion Letter");
		const feats = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			return {
				howTheyGetYou: V.feats.currentSave["How They Get You"] instanceof Date,
				theyGotYou: V.feats.currentSave["They Got You"] instanceof Date,
				paymentsRemoved: V.xchange.blackmail.paymentsRemoved,
			};
		});
		expect(feats).toEqual({
			howTheyGetYou: true,
			theyGotYou: true,
			paymentsRemoved: 1,
		});
	});

	test("Great Hawk brings the letter and it returns to the tower after reading", async ({ page }) => {
		await setupBlackmailDelivery(page, 0, "greathawk");
		await wikifyEval(page, "<<bird_init>>");
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.bird.state = "home";
			V.bird.activity = "rest";
		});
		await forceRng(page, 100);

		await navigateTo(page, "Bird Tower");
		await clearRngOverride(page);
		await expect(page.locator("#passages")).toContainText("A stranger is picking their way towards the tower");
		await page.getByRole("link", { name: "Open it" }).click();
		await expect(page.locator("#passages")).toContainText("Greetings");
		await page.getByRole("link", { name: "Look inside" }).click();
		await expect(page.locator('#passages a[data-passage="Bird Tower"]')).toHaveCount(1);
		await page.locator('#passages a[data-passage="Bird Tower"]').click();
		await expect.poll(() => page.evaluate(() => (window as any).SugarCube.State.passage)).toBe("Bird Tower");
	});

	test("Great Hawk destroys a first letter without starting blackmail", async ({ page }) => {
		await setupBlackmailDelivery(page, 0, "greathawk");
		await wikifyEval(page, "<<bird_init>>");
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.bird.state = "home";
			V.bird.activity = "rest";
		});
		await forceRng(page, 0);

		await navigateTo(page, "Bird Tower");
		await expect(page.locator("#passages")).toContainText("The Great Hawk has saved you from it for now");

		const result = await page.evaluate(() => {
			const blackmail = (window as any).SugarCube.State.variables.xchange.blackmail;
			return {
				activeQuest: blackmail.activeQuest,
				hasMaterial: blackmail.hasMaterial,
				courier: blackmail.courier,
			};
		});
		expect(result).toEqual({
			activeQuest: undefined,
			hasMaterial: false,
			courier: undefined,
		});
		await clearRngOverride(page);
	});

	test("wolf pack delivery is readable and returns to the cave", async ({ page }) => {
		await setupBlackmailDelivery(page, 1, "wolves");
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.wolfstate = "cave";
		});
		await forceRng(page, 100);

		await navigateTo(page, "Wolf Cave");
		await clearRngOverride(page);
		await expect(page.locator("#passages")).toContainText("wolf saliva");
		await page.getByRole("link", { name: "Open it" }).click();
		await expect(page.locator('#passages a[data-passage="Wolf Cave"]')).toHaveCount(1);
	});

	test("wolf pack destroys a repeat letter and immediately fails its hidden task", async ({ page }) => {
		await setupBlackmailDelivery(page, 1, "wolves");
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.wolfstate = "cave";
		});
		await forceRng(page, 0);

		await navigateTo(page, "Wolf Cave");
		await expect(page.locator("#passages")).toContainText("You have no way to know what they demanded");

		const quest = await page.evaluate(() => {
			const blackmail = (window as any).SugarCube.State.variables.xchange.blackmail;
			return {
				failed: blackmail.activeQuest?.failed,
				letterDestroyed: blackmail.activeQuest?.letterDestroyed,
				courier: blackmail.courier,
			};
		});
		expect(quest).toEqual({
			failed: true,
			letterDestroyed: true,
			courier: "wolves",
		});
		await clearRngOverride(page);
	});

	test("wolf pack destroys a first letter without starting blackmail", async ({ page }) => {
		await setupBlackmailDelivery(page, 0, "wolves");
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.wolfstate = "cave";
		});
		await forceRng(page, 0);

		await navigateTo(page, "Wolf Cave");
		await expect(page.locator("#passages")).toContainText("the pack has saved you from it for now");

		const result = await page.evaluate(() => {
			const blackmail = (window as any).SugarCube.State.variables.xchange.blackmail;
			return {
				activeQuest: blackmail.activeQuest,
				hasMaterial: blackmail.hasMaterial,
				courier: blackmail.courier,
			};
		});
		expect(result).toEqual({
			activeQuest: undefined,
			hasMaterial: false,
			courier: undefined,
		});
		await clearRngOverride(page);
	});

	test("Jordan receives the suited stranger's letter and it returns to the temple", async ({ page }) => {
		await setupBlackmailDelivery(page, 1, "jordan");

		await navigateTo(page, "Temple");
		await expect(page.locator("#passages")).toContainText("Jordan is speaking with");
		await expect(page.locator("#passages")).toContainText("Remember your composure");
		await page.getByRole("link", { name: "Open it" }).click();
		await expect(page.locator('#passages a[data-passage="Temple"]')).toHaveCount(1);
	});

	test("Eden destroys a first letter without starting blackmail", async ({ page }) => {
		await setupBlackmailDelivery(page, 0, "eden");

		await navigateTo(page, "Eden Cabin");
		await expect(page.locator("#passages")).toContainText("Eden has saved you from it for now");

		const result = await page.evaluate(() => {
			const blackmail = (window as any).SugarCube.State.variables.xchange.blackmail;
			return {
				activeQuest: blackmail.activeQuest,
				cooldown: blackmail.cooldown,
				hasMaterial: blackmail.hasMaterial,
				hasNewMaterial: blackmail.hasNewMaterial,
				intro: blackmail.intro,
			};
		});
		expect(result).toEqual({
			activeQuest: undefined,
			cooldown: 7,
			hasMaterial: false,
			hasNewMaterial: false,
			intro: 0,
		});
	});

	test("Eden destroys a repeat letter, immediately fails its hidden task, and survives save restoration", async ({ page }) => {
		await setupBlackmailDelivery(page, 1, "eden");

		await navigateTo(page, "Eden Cabin");
		await expect(page.locator("#passages")).toContainText("You have no way to know what they demanded");

		let quest = await page.evaluate(() => {
			const blackmail = (window as any).SugarCube.State.variables.xchange.blackmail;
			return {
				failed: blackmail.activeQuest?.failed,
				letterDestroyed: blackmail.activeQuest?.letterDestroyed,
				hasNewMaterial: blackmail.hasNewMaterial,
				hasReadLetter: blackmail.hasReadLetter,
			};
		});
		expect(quest).toEqual({
			failed: true,
			letterDestroyed: true,
			hasNewMaterial: false,
			hasReadLetter: false,
		});

		const journal = await wikifyToText(page, "<<journal>>");
		expect(journal).toContain("destroyed before you could read their demand");
		expect(journal).not.toContain("Your blackmailer has assigned you this task");

		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.xchange.blackmail.activeQuest = JSON.parse(JSON.stringify(V.xchange.blackmail.activeQuest));
			(window as any).restoreActiveBlackmailQuest();
		});
		quest = await page.evaluate(() => {
			const activeQuest = (window as any).SugarCube.State.variables.xchange.blackmail.activeQuest;
			return {
				failed: activeQuest?.failed,
				letterDestroyed: activeQuest?.letterDestroyed,
				methodsRestored: typeof activeQuest?.failCheck === "function",
			};
		});
		expect(quest).toEqual({
			failed: true,
			letterDestroyed: true,
			methodsRestored: true,
		});

		await wikifyEval(page, "<<blackmail-daypassed>>");
		const conclusion = await page.evaluate(() => {
			const blackmail = (window as any).SugarCube.State.variables.xchange.blackmail;
			return {
				conclusionPending: blackmail.conclusionPending,
				hasMaterial: blackmail.hasMaterial,
			};
		});
		expect(conclusion).toEqual({
			conclusionPending: true,
			hasMaterial: false,
		});
	});

	test("an animal courier gives up after a day and drops the letter off at home", async ({ page }) => {
		await setupBlackmailDelivery(page, 1, "greathawk");

		await wikifyEval(page, "<<blackmail-daypassed>>");
		let blackmail = await page.evaluate(() => (window as any).SugarCube.State.variables.xchange.blackmail);
		expect(blackmail.courier).toBe("greathawk");
		expect(blackmail.courierReady).toBe(true);
		expect(blackmail.courierAfk).toBe(false);

		await wikifyEval(page, "<<blackmail-daypassed>>");
		blackmail = await page.evaluate(() => (window as any).SugarCube.State.variables.xchange.blackmail);
		expect(blackmail.courier).toBe("home");
		expect(blackmail.courierAfk).toBe(true);
	});

	test("Jordan never gives up on a letter, even after several days", async ({ page }) => {
		await setupBlackmailDelivery(page, 1, "jordan");

		await wikifyEval(page, "<<blackmail-daypassed>>");
		await wikifyEval(page, "<<blackmail-daypassed>>");
		await wikifyEval(page, "<<blackmail-daypassed>>");
		const blackmail = await page.evaluate(() => (window as any).SugarCube.State.variables.xchange.blackmail);
		expect(blackmail.courier).toBe("jordan");
		expect(blackmail.courierAfk).toBe(false);
	});

	test("saves from before the courier system backfill an undefined courier to home", async ({ page }) => {
		await setupBlackmailDelivery(page);
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			delete V.xchange.blackmail.courier;
			delete V.xchange.blackmail.courierAfk;
			delete V.xchange.blackmail.courierReady;
		});

		await wikifyEval(page, "<<xchange-modupdate>>");
		const blackmail = await page.evaluate(() => (window as any).SugarCube.State.variables.xchange.blackmail);
		expect(blackmail.courier).toBe("home");
		expect(blackmail.courierAfk).toBe(false);
		expect(blackmail.courierReady).toBe(false);
	});

	test("picking a courier never selects a location before it's actually unlocked on the map", async ({ page }) => {
		await setupBlackmailDelivery(page);
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			const C = (window as any).C;
			// Simulate "met the NPC mid-encounter but never unlocked their location":
			// Great Hawk/Black Wolf/Eden all .init, but none of the map-unlock flags set.
			C.npc["Great Hawk"].init = 1;
			C.npc["Black Wolf"].init = 1;
			C.npc.Eden.init = 1;
			C.npc.Jordan.init = 0;
			V.moor = 0;
			V.syndromewolves = 0;
			V.edenfreedom = 0;
			V.syndromeeden = 0;
			V.xchange.blackmail.hasMaterial = false;
			V.xchange.blackmail.courier = undefined;
		});

		for (let i = 0; i < 20; i++) {
			await wikifyEval(page, '<<blackmail-newmaterial "sex">>');
			const courier = await page.evaluate(() => (window as any).SugarCube.State.variables.xchange.blackmail.courier);
			expect(courier).toBe("home");
			await page.evaluate(() => {
				const V = (window as any).SugarCube.State.variables;
				V.xchange.blackmail.hasMaterial = false;
				V.xchange.blackmail.courier = undefined;
			});
		}
	});

	test("Jordan isn't picked as courier until reaching monk or priest rank", async ({ page }) => {
		await setupBlackmailDelivery(page);
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			const C = (window as any).C;
			// Jordan can be met (and .init set) well before joining the cloister, e.g. via the
			// Dance Job storyline or the initiate-level vigil enquiry — long before $temple_rank
			// reaches "monk"/"priest" and the cloister itself unlocks.
			C.npc.Jordan.init = 1;
			V.temple_rank = "initiate";
			V.xchange.blackmail.hasMaterial = false;
			V.xchange.blackmail.courier = undefined;
		});

		for (let i = 0; i < 20; i++) {
			await wikifyEval(page, '<<blackmail-newmaterial "sex">>');
			const courier = await page.evaluate(() => (window as any).SugarCube.State.variables.xchange.blackmail.courier);
			expect(courier).toBe("home");
			await page.evaluate(() => {
				const V = (window as any).SugarCube.State.variables;
				V.xchange.blackmail.hasMaterial = false;
				V.xchange.blackmail.courier = undefined;
			});
		}

		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.temple_rank = "monk";
		});
		await forceRng(page, 1);
		await wikifyEval(page, '<<blackmail-newmaterial "sex">>');
		const courier = await page.evaluate(() => (window as any).SugarCube.State.variables.xchange.blackmail.courier);
		expect(courier).toBe("jordan");
		await clearRngOverride(page);
	});

	test("mansion residents don't also see the blackmail notice at the orphanage", async ({ page }) => {
		await setupBlackmailDelivery(page, 1, "home");
		await wikifyEval(page, "<<avery_mansion_init>>");

		await navigateTo(page, "Bedroom");
		await expect(page.locator('#passages a[data-passage="Blackmail Letter"]')).toHaveCount(0);
	});

	test("mansion residents see the blackmail notice in Mansion Bedroom instead", async ({ page }) => {
		await setupBlackmailDelivery(page, 1, "home");
		await wikifyEval(page, "<<avery_mansion_init>>");
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.avery_mansion.schedule = "work";
		});

		await navigateTo(page, "Mansion Bedroom");
		await expect(page.locator('#passages a[data-passage="Blackmail Letter"]')).toHaveCount(1);
	});

	test("Avery secretly destroys the letter and saves you while their temper is low", async ({ page }) => {
		await setupBlackmailDelivery(page, 1, "home");
		await wikifyEval(page, "<<avery_mansion_init>>");
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			const C = (window as any).C;
			V.loveInterest.primary = "Avery";
			C.npc.Avery.rage = 0;
		});

		await navigateTo(page, "Mansion Bedroom");
		await expect(page.locator("#passages")).toContainText("Avery has saved you from it, for now.");
		await expect(page.locator('#passages a[data-passage="Blackmail Letter"]')).toHaveCount(0);

		const blackmail = await page.evaluate(() => (window as any).SugarCube.State.variables.xchange.blackmail);
		expect(blackmail.hasMaterial).toBe(false);
		expect(blackmail.hasNewMaterial).toBe(false);
		expect(blackmail.courier).toBeUndefined();
		expect(blackmail.cooldown).toBe(7);
	});

	test("Avery leaves a high-temper letter alone and it delivers normally", async ({ page }) => {
		await setupBlackmailDelivery(page, 1, "home");
		await wikifyEval(page, "<<avery_mansion_init>>");
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			const C = (window as any).C;
			V.loveInterest.primary = "Avery";
			C.npc.Avery.rage = 50;
		});

		await navigateTo(page, "Mansion Bedroom");
		await expect(page.locator("#passages")).toContainText("I'd rather not know");
		await expect(page.locator('#passages a[data-passage="Blackmail Letter"]')).toHaveCount(1);

		const blackmail = await page.evaluate(() => (window as any).SugarCube.State.variables.xchange.blackmail);
		expect(blackmail.hasMaterial).toBe(true);
		expect(blackmail.courier).toBe("home");
	});
});
