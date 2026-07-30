import { test, expect } from "@playwright/test";
import * as path from "path";
import { pathToFileURL } from "url";
import { assertNoErrors, navigateTo, waitForPassage } from "./helpers";

const openBrothelGame = async (page: import("@playwright/test").Page) => {
	await page.addInitScript(() => {
		localStorage.setItem("verifiedAge", "true");
	});
	await page.goto(pathToFileURL(path.resolve("Degrees of Lewdity VERSION.html")).href);
	await waitForPassage(page);
	await navigateTo(page, "Start2");
	await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		V.brotheljob = 1;
		V.uncomfortable.prostituting = false;
		V.tiredness = 0;
	});
};

test.describe("ordinary brothel client balance", () => {
	test("floor work adds fatigue and applies the reduced client rates", async ({ page }) => {
		await openBrothelGame(page);

		await navigateTo(page, "Brothel Client Floor");
		const fatigueBeforeTalk = await page.evaluate(() => (window as any).SugarCube.State.variables.tiredness);
		await page.locator('#passages a[data-passage="Brothel Client Talk"]').click();
		await page.waitForFunction(() => (window as any).SugarCube.State.active.title === "Brothel Client Talk");
		await assertNoErrors(page);
		const talkBalance = await page.evaluate(before => {
			const V = (window as any).SugarCube.State.variables;
			const legacyRate = Math.clamp(0.5 + (window as any).currentSkillValue("english") / 500 + V.fame.good / 2000, 0.5, 3);
			return { fatigue: V.tiredness - before, tipmod: V.tipmod, legacyRate };
		}, fatigueBeforeTalk);
		expect(talkBalance.fatigue).toBeGreaterThanOrEqual(30);
		expect(talkBalance.tipmod).toBeCloseTo(talkBalance.legacyRate * 0.75, 1);

		await navigateTo(page, "Brothel Client Floor");
		const fatigueBeforeOffer = await page.evaluate(() => (window as any).SugarCube.State.variables.tiredness);
		await page.locator('#passages a[data-passage="Brothel Private"]', { hasText: "Show off your best assets" }).click();
		await page.waitForFunction(() => (window as any).SugarCube.State.active.title === "Brothel Private");
		await assertNoErrors(page);
		const privateBalance = await page.evaluate(before => {
			const V = (window as any).SugarCube.State.variables;
			const legacyRate =
				1.25 +
				Math.min((window as any).currentSkillValue("seductionskill"), 1000) / 500 +
				Math.min(V.brothelClientSkill, 1000) / 300 +
				V.brothelClientBonus +
				0.2 * ((window as any).C.npc.Briar.love / 100);
			return { fatigue: V.tiredness - before, tipmod: V.tipmod, legacyRate };
		}, fatigueBeforeOffer);
		expect(privateBalance.fatigue).toBeGreaterThanOrEqual(30);
		expect(privateBalance.tipmod).toBeCloseTo(privateBalance.legacyRate * 0.75, 5);

		const fatigueBeforeAppointment = await page.evaluate(() => (window as any).SugarCube.State.variables.tiredness);
		await page.locator('#passages a[data-passage="Brothel Private Sex"]').first().click();
		await page.waitForFunction(() => (window as any).SugarCube.State.active.title === "Brothel Private Sex");
		await assertNoErrors(page);
		expect(
			await page.evaluate(before => {
				const V = (window as any).SugarCube.State.variables;
				return {
					fatigue: V.tiredness - before,
					validStart: V.consensual === 1 || V.brothelClientComplaint === true,
				};
			}, fatigueBeforeAppointment)
		).toMatchObject({ fatigue: expect.any(Number), validStart: true });
		expect(await page.evaluate(before => (window as any).SugarCube.State.variables.tiredness - before, fatigueBeforeAppointment)).toBeGreaterThanOrEqual(60);
		await page.evaluate(() => {
			(window as any).SugarCube.Wikifier.wikifyEval("<<endcombat>>");
		});

		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.phase = 0;
			V.brothelAuctionDanceBonus = 0;
		});
		await navigateTo(page, "Brothel Client Auction");
		await assertNoErrors(page);
		const auction = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			const legacy = 5000 + V.fame.prostitution * 20 + (window as any).currentSkillValue("seductionskill") * 15 + V.brothelClientSkill * 20;
			return { actual: V.brothelAuctionTip, expected: Math.round((legacy * 0.75) / 500) * 500 };
		});
		expect(auction.actual).toBe(auction.expected);
	});

	test("hostile rolls include groups, never pay, and leave one report for Briar", async ({ page }) => {
		await openBrothelGame(page);

		const sampled = await page.evaluate(() => {
			const SC = (window as any).SugarCube;
			const V = SC.State.variables;
			let hostile = 0;
			let groups = 0;
			for (let i = 0; i < 1000; i++) {
				delete V.molestationstart;
				delete V.sexstart;
				V.enemyno = 1;
				SC.Wikifier.wikifyEval("<<brothelClientSexStart>>");
				if (V.molestationstart === 1) {
					hostile++;
					if (V.enemyno > 1) groups++;
				}
			}
			const result = {
				hostile,
				groups,
				savedRoll: V.brothelClientRisk,
			};
			delete V.molestationstart;
			delete V.sexstart;
			return result;
		});
		expect(sampled.hostile).toBeGreaterThanOrEqual(40);
		expect(sampled.hostile).toBeLessThanOrEqual(120);
		expect(sampled.groups).toBeGreaterThanOrEqual(5);
		expect(sampled.groups).toBeLessThanOrEqual(60);
		expect(sampled.savedRoll).toBeUndefined();

		await navigateTo(page, "Brothel Client Floor");
		const moneyBefore = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.phase = 0;
			V.enemyno = 3;
			V.molestationstart = 1;
			V.consensual = 0;
			return V.money;
		});
		await navigateTo(page, "Brothel Private Sex");
		await assertNoErrors(page);
		await expect(page.locator("#passages")).toContainText("2 more patrons enter");
		expect(await page.evaluate(() => (window as any).SugarCube.State.variables.brothelClientComplaint)).toBe(true);

		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.enemyhealth = 100;
			V.enemypleasure = V.enemypleasuremax;
			V.finish = 0;
		});
		await navigateTo(page, "Brothel Private Sex Finish");
		await assertNoErrors(page);
		await expect(page.locator("#passages")).toContainText("without paying");
		expect(await page.evaluate(money => (window as any).SugarCube.State.variables.money - money, moneyBefore)).toBe(0);

		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			(window as any).SugarCube.Wikifier.wikifyEval("<<generate1>><<person1>>");
			V.enemyno = 3;
			V.molestationstart = 1;
			V.consensual = 0;
		});
		await navigateTo(page, "Brothel Private Sex");
		await assertNoErrors(page);
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.enemyhealth = 100;
			V.enemypleasure = 0;
			V.finish = 1;
		});
		await navigateTo(page, "Brothel Private Sex Finish");
		await assertNoErrors(page);
		await expect(page.locator("#passages")).toContainText("The patrons turn on you");
		expect(await page.evaluate(money => (window as any).SugarCube.State.variables.money - money, moneyBefore)).toBe(0);

		await navigateTo(page, "Brothel");
		expect(await page.evaluate(() => (window as any).SugarCube.State.variables.brothelClientComplaint)).toBe(true);
		await navigateTo(page, "Briar's Office");
		await assertNoErrors(page);
		await page.locator('#passages a[data-passage="Briar Client Complaint"]').click();
		await page.waitForFunction(() => (window as any).SugarCube.State.active.title === "Briar Client Complaint");
		await assertNoErrors(page);
		await expect(page.locator("#passages")).toContainText("They will regret using our services without paying");
		expect(await page.evaluate(() => (window as any).SugarCube.State.variables.brothelClientComplaint)).toBeUndefined();
	});

	test("flirting can turn into a public single or group assault with an audience", async ({ page }) => {
		await openBrothelGame(page);
		await navigateTo(page, "Brothel Client Floor");

		let foundRisk = false;
		for (let i = 0; i < 100 && !foundRisk; i++) {
			await navigateTo(page, "Brothel Client Flirt");
			await assertNoErrors(page);
			foundRisk = (await page.locator('#passages a[data-passage="Brothel Client Assault"]').count()) === 1;
		}
		expect(foundRisk).toBe(true);

		await page.locator('#passages a[data-passage="Brothel Client Assault"]').click();
		await page.waitForFunction(() => (window as any).SugarCube.State.active.title === "Brothel Client Assault");
		await assertNoErrors(page);
		await expect(page.locator("#passages")).toContainText(/audience (watches|crowds)/i);
		expect(await page.locator('#passages a[data-passage="Brothel Client Assault"]').count()).toBe(1);

		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.enemyhealth = 0;
		});
		await navigateTo(page, "Brothel Client Assault Finish");
		await assertNoErrors(page);
		await expect(page.locator("#passages")).toContainText("tell Briar");
		expect(await page.evaluate(() => (window as any).SugarCube.State.variables.brothelClientComplaint)).toBe(true);
	});
});
