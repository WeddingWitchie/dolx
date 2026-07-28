import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { openGame, navigateTo, wikifyEval, wikifyToText, assertNoErrors } from "./helpers.js";

async function setupBlackmailDelivery(page: Page, intro = 1) {
	await openGame(page);
	await navigateTo(page, "Start2");
	await page.evaluate(firstLetterRead => {
		const V = (window as any).SugarCube.State.variables;
		Object.assign(V.xchange.blackmail, {
			intro: firstLetterRead,
			activeQuest: undefined,
			hasMaterial: true,
			hasNewMaterial: true,
			hasReadLetter: false,
			cooldown: 0,
			conclusionPending: false,
		});
		V.xchange.blackmailHalt = 0;
		V.possessed = 0;
		V.exposed = 0;
		V.stress = 0;
	}, intro);
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
		await setupBlackmailDelivery(page, 0);
		await wikifyEval(page, "<<bird_init>>");
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.bird.state = "home";
			V.bird.activity = "rest";
		});

		await navigateTo(page, "Bird Tower");
		await expect(page.locator("#passages")).toContainText("A stranger is picking their way towards the tower");
		await page.getByRole("link", { name: "Open it" }).click();
		await expect(page.locator("#passages")).toContainText("Greetings");
		await page.getByRole("link", { name: "Look inside" }).click();
		await expect(page.locator('#passages a[data-passage="Bird Tower"]')).toHaveCount(1);
		await page.locator('#passages a[data-passage="Bird Tower"]').click();
		await expect.poll(() => page.evaluate(() => (window as any).SugarCube.State.passage)).toBe("Bird Tower");
	});

	test("wolf pack delivery is readable and returns to the cave", async ({ page }) => {
		await setupBlackmailDelivery(page);

		await navigateTo(page, "Wolf Cave");
		await expect(page.locator("#passages")).toContainText("wolf saliva");
		await page.getByRole("link", { name: "Open it" }).click();
		await expect(page.locator('#passages a[data-passage="Wolf Cave"]')).toHaveCount(1);
	});

	test("Jordan receives the suited stranger's letter and it returns to the temple", async ({ page }) => {
		await setupBlackmailDelivery(page);

		await navigateTo(page, "Temple");
		await expect(page.locator("#passages")).toContainText("Jordan is speaking with");
		await expect(page.locator("#passages")).toContainText("Remember your composure");
		await page.getByRole("link", { name: "Open it" }).click();
		await expect(page.locator('#passages a[data-passage="Temple"]')).toHaveCount(1);
	});

	test("Eden destroys a first letter without starting blackmail", async ({ page }) => {
		await setupBlackmailDelivery(page, 0);

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
		await setupBlackmailDelivery(page);

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
});
