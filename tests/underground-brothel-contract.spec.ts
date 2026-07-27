import { test, expect } from "@playwright/test";
import * as path from "path";
import { pathToFileURL } from "url";
import { assertNoErrors, navigateTo, waitForPassage } from "./helpers";

const openContractGame = async (page: import("@playwright/test").Page) => {
	await page.addInitScript(() => {
		localStorage.setItem("verifiedAge", "true");
	});
	await page.goto(pathToFileURL(path.resolve("Degrees of Lewdity VERSION.html")).href);
	await waitForPassage(page);
};

test.describe("underground brothel contract", () => {
	test("the storyline passages render with one shared contract state", async ({ page }) => {
		await openContractGame(page);
		await navigateTo(page, "Start2");

		await page.evaluate(() => {
			const SC = (window as any).SugarCube;
			SC.State.variables.undergroundbrothelcontract = {
				broker: "Bailey",
				end: (window as any).Time.days + 7,
				pay: 250000,
				penalty: 0,
				obedience: 2,
			};
			SC.State.variables.undergroundbrothel = {
				active: true,
				time: 0,
				timepass: false,
				water: 0,
				escape: 0,
			};
		});

		const passages = [
			"Underground Brothel Contract Terms",
			"Underground Brothel Contract Master Introduction",
			"Underground Brothel Contract Introduction Quiet",
			"Underground Brothel Contract Transport",
			"Underground Brothel Contract Transport Question",
			"Underground Brothel Contract Transport Quiet",
			"Underground Brothel Contract Transport Resist",
			"Underground Brothel Contract Transport Journey",
			"Underground Brothel Contract Arrival",
			"Underground Brothel Contract Rules",
			"Underground Brothel Contract Master",
			"Underground Brothel Contract Master Inspection",
			"Underground Brothel Contract Master Release",
			"Underground Brothel Contract Room",
			"Underground Brothel Contract Quarters",
			"Underground Brothel Contract Main Room",
			"Underground Brothel Contract Master Bedroom",
			"Underground Brothel Contract Bedroom Wardrobe",
			"Underground Brothel Contract Floor Rest",
			"Underground Brothel Contract Master Personal",
			"Underground Brothel Contract Work",
			"Underground Brothel Contract Show",
			"Underground Brothel Contract Bed",
			"Underground Brothel Contract Master Bed",
			"Underground Brothel Contract Sleep Master Wake",
			"Underground Brothel Contract Sleep Group Wake",
			"Underground Brothel Contract Sleep Trait Wake",
			"Underground Brothel Contract Sleep Punishment",
			"Underground Brothel Contract Corridor",
			"Underground Brothel Contract Exit Sneak",
			"Underground Brothel Contract Caught",
			"Underground Brothel Contract Punishment Refusal",
			/* Punishment Submit is a combat passage now, like Punishment Fight, so it needs its scene
			   armed first rather than a cold render. Both are covered further down. */
			"Underground Brothel Contract Hospital Return",
		];

		for (const passage of passages) {
			await navigateTo(page, passage);
			await assertNoErrors(page);
			await expect(page.locator("#passages")).not.toBeEmpty();
		}

		/* The handler lives in $per_npc; only its personality is stored on the contract. */
		const master = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			return { npc: V.per_npc.contract_master, trait: V.undergroundbrothelcontract.masterTrait };
		});
		expect(master.npc).toBeTruthy();
		expect(["relaxed", "sociable", "brooding", "lecher"]).toContain(master.trait);

		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.undergroundbrothelcontract.obedience = 0;
			V.leftarm = "bound";
			V.rightarm = "bound";
		});
		await navigateTo(page, "Underground Brothel Contract Quarters");
		await assertNoErrors(page);
		await expect(page.locator("#passages")).toContainText("Undo your bindings");
		await expect(page.locator("#passages")).toContainText("if your arms were free");

		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.skulduggerydifficulty = 0;
			V.temple_burden = 0;
		});
		await navigateTo(page, "Underground Brothel Contract Door Sneak");
		await assertNoErrors(page);
		await expect(page.locator("#passages")).toContainText("The lock gives");

		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.skulduggerydifficulty = 600;
			V.temple_burden = 100;
			(window as any).Time.setTime(12, 0);
		});
		await navigateTo(page, "Underground Brothel Contract Door Sneak");
		await assertNoErrors(page);
		await expect(page.locator("#passages")).toContainText("contract desk");

		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.skulduggerydifficulty = 0;
			V.temple_burden = 0;
		});
		await navigateTo(page, "Underground Brothel Contract Exit Sneak");
		await assertNoErrors(page);
		await expect(page.locator("#passages")).toContainText("Cold air spills");
		await expect(page.locator("#passages")).toContainText("payment is forfeit");

		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.skulduggerydifficulty = 1000;
			V.temple_burden = 100;
			(window as any).Time.setTime(12, 0);
		});
		await navigateTo(page, "Underground Brothel Contract Exit Sneak");
		await assertNoErrors(page);
		await expect(page.locator("#passages")).toContainText("performance corridor");
		await expect(page.locator("#passages")).toContainText("one unpaid day added");

		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.undergroundbrothelcontract.obedience = 4;
			V.leftarm = "free";
			V.rightarm = "free";
			V.temple_burden = 0;
			V.sleephour = 0;
		});
		for (const bedroomPassage of ["Underground Brothel Contract Master Bedroom", "Underground Brothel Contract Bedroom Wardrobe"]) {
			await navigateTo(page, bedroomPassage);
			await assertNoErrors(page);
			await expect(page.locator("#passages")).not.toBeEmpty();
		}
		for (const sleepPassage of ["Underground Brothel Contract Sleep", "Underground Brothel Contract Master Bed Sleep"]) {
			await navigateTo(page, sleepPassage);
			await assertNoErrors(page);
			await expect(page.locator("#passages")).not.toBeEmpty();
		}

		await navigateTo(page, "Underground Brothel Contract Sleep Group Wake");
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.molestationstart = 1;
			V.phase = 3;
		});
		await navigateTo(page, "Underground Brothel Contract Sleep Molestation");
		await assertNoErrors(page);
		await expect(page.locator("#passages")).not.toBeEmpty();

		for (const outcome of [
			{ enemyhealth: 0, enemypleasure: 0, enemypleasuremax: 100, phase: 3 },
			{ enemyhealth: 100, enemypleasure: 100, enemypleasuremax: 100, phase: 2 },
			{ enemyhealth: 100, enemypleasure: 0, enemypleasuremax: 100, phase: 1 },
		]) {
			await page.evaluate(values => {
				Object.assign((window as any).SugarCube.State.variables, values);
			}, outcome);
			await navigateTo(page, "Underground Brothel Contract Sleep Molestation Finish");
			await assertNoErrors(page);
			await expect(page.locator("#passages")).not.toBeEmpty();
		}

		await page.evaluate(() => {
			(window as any).SugarCube.State.variables.molestationstart = 1;
		});
		await navigateTo(page, "Underground Brothel Contract Punishment Fight");
		await assertNoErrors(page);
		await expect(page.locator("#passages")).not.toBeEmpty();

		const outcomes = [
			{ enemyhealth: 0, enemypleasure: 0, enemypleasuremax: 100, pain: 0, willpowerpain: 1, obedience: 0 },
			{ enemyhealth: 100, enemypleasure: 100, enemypleasuremax: 100, pain: 0, willpowerpain: 1, obedience: 0 },
			{ enemyhealth: 100, enemypleasure: 0, enemypleasuremax: 100, pain: 100, willpowerpain: 0, obedience: 0 },
			{ enemyhealth: 100, enemypleasure: 0, enemypleasuremax: 100, pain: 0, willpowerpain: 1, obedience: 2 },
		];
		for (const outcome of outcomes) {
			await page.evaluate(values => {
				const V = (window as any).SugarCube.State.variables;
				Object.assign(V, values);
				V.undergroundbrothelcontract.obedience = values.obedience;
			}, outcome);
			await navigateTo(page, "Underground Brothel Contract Punishment Fight Finish");
			await assertNoErrors(page);
			await expect(page.locator("#passages")).not.toBeEmpty();
		}

		const penalty = await page.evaluate(() => {
			const SC = (window as any).SugarCube;
			SC.Wikifier.wikifyEval("<<undergroundBrothelContractPenalty>>");
			return SC.State.variables.undergroundbrothelcontract;
		});
		expect(penalty).toMatchObject({
			penalty: 1,
			obedience: 1,
		});

		const moneyBeforeEscape = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.undergroundbrothelcontract = {
				broker: "Bailey",
				end: (window as any).Time.days + 7,
				pay: 250000,
				penalty: 0,
				obedience: 0,
			};
			V.undergroundbrothel = { active: true, escape: 4 };
			V.leftarm = "bound";
			V.rightarm = "bound";
			V.leftleg = "bound";
			V.rightleg = "bound";
			V.feetuse = "bound";
			return V.money;
		});
		await navigateTo(page, "Underground Brothel Contract Escape");
		await assertNoErrors(page);
		/* The forfeit notice is printed by <<dungeonescape>> so every escape route carries it. */
		await expect(page.locator("#passages")).toContainText("will not be paid");
		const escapeState = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			return {
				contract: V.undergroundbrothelcontract,
				underground: V.undergroundbrothel,
				leftarm: V.leftarm,
				rightarm: V.rightarm,
				leftleg: V.leftleg,
				rightleg: V.rightleg,
				feetuse: V.feetuse,
				money: V.money,
			};
		});
		/* Running for it does not undo anything the brothel put on you. The collar and cuffs leave with
		   you, and have to be dealt with in town (the police desk, and Winter at the museum). */
		expect(escapeState).toMatchObject({
			contract: undefined,
			underground: { escape: 4 },
			leftarm: "bound",
			rightarm: "bound",
			leftleg: "bound",
			rightleg: "bound",
			feetuse: "bound",
		});
		expect(escapeState.money).toBe(moneyBeforeEscape);
		await page.locator('#passages a[data-passage="Forest"]').click();
		await page.waitForFunction(() => (window as any).SugarCube.State.active.title === "Forest");
		await assertNoErrors(page);
		await expect
			.poll(() =>
				page.evaluate(() => ({
					forest: (window as any).SugarCube.State.variables.forest,
					outside: (window as any).SugarCube.State.variables.outside,
				}))
			)
			.toMatchObject({ forest: 40, outside: 1 });

		await page.evaluate(() => {
			const SC = (window as any).SugarCube;
			SC.State.variables.undergroundbrothelcontract = {
				broker: "Bailey",
				end: (window as any).Time.days,
				pay: 250000,
				penalty: 0,
				obedience: 2,
			};
			SC.State.variables.undergroundbrothel = {
				active: true,
				time: 0,
				timepass: false,
				water: 0,
				escape: 0,
			};
			SC.State.variables.undergroundbrothelcontract.end = (window as any).Time.days;
		});
		await navigateTo(page, "Underground Brothel Contract Quarters");
		await assertNoErrors(page);
		await expect(page.locator("#passages")).toContainText("Your time's up");
	});

	test("the hooded transport keeps the contract master and reacts to the player's behaviour", async ({ page }) => {
		await openContractGame(page);
		await navigateTo(page, "Start2");
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.undergroundbrothelcontract = {
				broker: "Bailey",
				end: (window as any).Time.days + 7,
				pay: 250000,
				penalty: 0,
				obedience: 0,
				masterTrait: "sociable",
			};
			V.undergroundbrothel = { active: false, time: 0, timepass: false, water: 0, escape: 0 };
			V.leftarm = 0;
			V.rightarm = 0;
		});

		await navigateTo(page, "Underground Brothel Contract Transport");
		await assertNoErrors(page);
		await expect(page.locator("#passages")).toContainText("hood smells of detergent");
		expect(await page.locator('#passages a[data-passage="Underground Brothel Contract Transport Question"]').count()).toBe(1);
		expect(await page.locator('#passages a[data-passage="Underground Brothel Contract Transport Quiet"]').count()).toBe(1);
		expect(await page.locator('#passages a[data-passage="Underground Brothel Contract Transport Resist"]').count()).toBe(1);
		expect(
			await page.evaluate(() => {
				const V = (window as any).SugarCube.State.variables;
				return { leftarm: V.leftarm, rightarm: V.rightarm, master: V.NPCList[0]?.per };
			})
		).toMatchObject({ leftarm: "bound", rightarm: "bound", master: "contract_master" });
		await page.evaluate(() => {
			(window as any).SugarCube.State.variables.undergroundbrothelcontract.masterTrait = "sociable";
		});

		await navigateTo(page, "Underground Brothel Contract Transport Question");
		await assertNoErrors(page);
		await expect(page.locator("#passages")).toContainText("You did read the paper");

		await navigateTo(page, "Underground Brothel Contract Transport Resist");
		await assertNoErrors(page);
		await expect(page.locator("#passages")).toContainText("Already putting on a show");
		expect(await page.evaluate(() => (window as any).SugarCube.State.variables.undergroundbrothelcontract.obedience)).toBe(-1);

		await navigateTo(page, "Underground Brothel Contract Transport Journey");
		await assertNoErrors(page);
		await expect(page.locator("#passages")).toContainText("passes through a gate");
		expect(await page.locator('#passages a[data-passage="Underground Brothel Contract Arrival"]').count()).toBe(1);
	});

	/** Walks the contract from signing to release and back out again, checking the state hand-offs
	 *  the storyline shares with the vanilla underground brothel. */
	test("signing, serving and leaving hand state back to the vanilla brothel cleanly", async ({ page }) => {
		await openContractGame(page);
		await navigateTo(page, "Start2");

		const sign = (broker: string) =>
			page.evaluate(b => {
				const V = (window as any).SugarCube.State.variables;
				V.undergroundbrothelescaped = true;
				V.undergroundbrothelcontract = { broker: b, end: (window as any).Time.days + 7, pay: 250000, penalty: 0, obedience: 0 };
				/* A previous captivity that was escaped, with dig progress banked. */
				V.undergroundbrothel = { active: false, escape: 17 };
				V.badEndStats = [];
			}, broker);

		/* The broker is still on screen after the contract is signed, for both offer routes. */
		for (const broker of ["Bailey", "Briar"]) {
			await sign(broker);
			await navigateTo(page, "Underground Brothel Contract Terms");
			await page.locator("#passages a", { hasText: "Sign the contract" }).first().click();
			await page.waitForFunction(() => (window as any).SugarCube.State.active.title === "Underground Brothel Contract Departure");
			await assertNoErrors(page);
			await expect(page.locator("#passages")).not.toContainText("undefined pronoun");
		}

		await navigateTo(page, "Underground Brothel Contract Arrival");
		await navigateTo(page, "Underground Brothel Contract Room");
		await expect
			.poll(() =>
				page.evaluate(() => {
					const V = (window as any).SugarCube.State.variables;
					return { escape: V.undergroundbrothel.escape, neck: V.worn.neck.name, badEnds: V.badEndStats.length };
				})
			)
			/* Dig progress survives the stay, and the bad end record the escape routes close is open. */
			.toMatchObject({ escape: 17, neck: "collar with leash", badEnds: 1 });

		/* Vanilla scenes that link straight to [[Underground Cell]] land in the contract quarters. */
		await page.evaluate(() => {
			(window as any).SugarCube.State.variables.eventskip = 1;
		});
		await navigateTo(page, "Underground Cell");
		await assertNoErrors(page);
		await expect(page.locator("#passages")).toContainText("room assigned to the brothel's contracted workers");
		expect(await page.evaluate(() => (window as any).SugarCube.State.variables.eventskip)).toBe(0);

		const moneyBefore = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.undergroundbrothelcontract.end = (window as any).Time.days;
			V.contractWake = "patron";
			V.baileySold = true;
			V.whitneyromance = 1;
			V.wraithUnderground = true;
			return V.money;
		});
		await navigateTo(page, "Underground Brothel Contract Complete");
		await assertNoErrors(page);
		await page.locator('#passages a[data-passage="Domus Street"]').first().click();
		await page.waitForFunction(() => (window as any).SugarCube.State.active.title === "Domus Street");
		await assertNoErrors(page);

		const released = await page.evaluate(mb => {
			const V = (window as any).SugarCube.State.variables;
			return {
				neck: V.worn.neck.name,
				contract: V.undergroundbrothelcontract,
				escape: V.undergroundbrothel.escape,
				active: V.undergroundbrothel.active,
				escaped: V.undergroundbrothelescaped,
				baileySold: V.baileySold,
				whitneyReunionScene: V.whitneyReunionScene,
				wraithUnderground: V.wraithUnderground,
				contractWake: V.contractWake,
				paid: V.money - mb,
				badEnd: V.badEndStats[0],
			};
		}, moneyBefore);

		expect(released).toMatchObject({
			/* The brothel's collar comes off, and <<dungeonescape>> owns the rest of the cleanup. */
			neck: "naked",
			contract: undefined,
			escape: 17,
			active: undefined,
			escaped: true,
			baileySold: undefined,
			whitneyReunionScene: "dungeon",
			wraithUnderground: undefined,
			contractWake: undefined,
			paid: 250000,
		});
		expect(released.badEnd.reasonStart).toBe("uDungeonContract");
		expect(released.badEnd.reasonEnd).toBe("uDungeonContractServed");

		/* Running out early forfeits the pay but still tidies up after itself. */
		await sign("Bailey");
		await navigateTo(page, "Underground Brothel Contract Arrival");
		await navigateTo(page, "Underground Brothel Contract Room");
		const moneyBeforeEscape = await page.evaluate(() => (window as any).SugarCube.State.variables.money);
		await navigateTo(page, "Underground Brothel Contract Escape");
		await assertNoErrors(page);
		expect(
			await page.evaluate(mb => {
				const V = (window as any).SugarCube.State.variables;
				return { neck: V.worn.neck.name, contract: V.undergroundbrothelcontract, gained: V.money - mb, badEnds: V.badEndStats.length };
			}, moneyBeforeEscape)
		).toMatchObject({ neck: "collar with leash", contract: undefined, gained: 0, badEnds: 1 });
	});

	test("every time-advancing contract route honours release and pregnancy boundaries", async ({ page }) => {
		await openContractGame(page);
		await navigateTo(page, "Start2");

		for (const passage of [
			"Underground Brothel Contract Work",
			"Underground Brothel Contract Washroom",
			"Underground Brothel Contract Door Sneak",
			"Underground Brothel Contract Exit Sneak",
		]) {
			await page.evaluate(() => {
				const V = (window as any).SugarCube.State.variables;
				V.undergroundbrothelcontract = {
					broker: "Bailey",
					end: (window as any).Time.days,
					pay: 250000,
					penalty: 0,
					obedience: 2,
					masterTrait: "relaxed",
				};
				V.undergroundbrothel = { active: true, time: 0, timepass: false, water: 0, escape: 0 };
			});
			await navigateTo(page, passage);
			await assertNoErrors(page);
			await expect(page.locator("#passages")).toContainText("Your time's up");
			await expect(page.locator('#passages a[data-passage="Domus Street"]')).toHaveCount(1);
		}
	});

	/** The handler is a persistent NPC, so its identity must survive the whole stay without the
	 *  encounter count creeping or its name leaking back into the random-NPC pool. */
	test("the handler stays one persistent NPC for the length of the contract", async ({ page }) => {
		await openContractGame(page);
		await navigateTo(page, "Start2");
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.undergroundbrothelescaped = true;
			V.undergroundbrothelcontract = { broker: "Bailey", end: (window as any).Time.days + 7, pay: 250000, penalty: 0, obedience: 2 };
			V.undergroundbrothel = { active: true, escape: 0 };
		});
		await navigateTo(page, "Underground Brothel Contract Master Introduction");

		const first = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			return {
				name: V.per_npc.contract_master.name,
				trait: V.undergroundbrothelcontract.masterTrait,
				per: V.NPCList[0].per,
				pooledM: V.NPC_names_m.includes(V.per_npc.contract_master.name),
				pooledF: V.NPC_names_f.includes(V.per_npc.contract_master.name),
			};
		});
		expect(first.per).toBe("contract_master");
		expect(["relaxed", "sociable", "brooding", "lecher"]).toContain(first.trait);
		/* saveNPC takes the name out of the pool so a patron can't turn up sharing it. */
		expect(first.pooledM).toBe(false);
		expect(first.pooledF).toBe(false);

		for (const passage of [
			"Underground Brothel Contract Arrival",
			"Underground Brothel Contract Room",
			"Underground Brothel Contract Quarters",
			"Underground Brothel Contract Master",
			"Underground Brothel Contract Master Inspection",
			"Underground Brothel Contract Main Room",
			"Underground Brothel Contract Quarters",
		]) {
			await navigateTo(page, passage);
			await assertNoErrors(page);
		}
		expect(
			await page.evaluate(() => {
				const V = (window as any).SugarCube.State.variables;
				return { name: V.per_npc.contract_master.name, trait: V.undergroundbrothelcontract.masterTrait, enemyno: V.enemyno };
			})
		).toMatchObject({ name: first.name, trait: first.trait, enemyno: 1 });

		/* Leaving releases the record and the name. */
		await navigateTo(page, "Underground Brothel Contract Escape");
		expect(await page.evaluate(() => (window as any).SugarCube.State.variables.per_npc.contract_master)).toBeUndefined();
	});

	/** The fee is quoted at current prices, then locked, and the envelope shows what actually lands. */
	test("the fee tracks inflation and the transformation income buff", async ({ page }) => {
		await openContractGame(page);
		await navigateTo(page, "Start2");
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.undergroundbrothelescaped = true;
			V.money = 500;
			V.undergroundbrothel = { active: false, escape: 0 };
		});
		await navigateTo(page, "Underground Brothel Contract Bailey");
		const baseMultiplier = await page.evaluate(() => (window as any).setup.inflation.multiplier());

		/* Wealth pushes the economy into a higher tier; the quote has to follow it. */
		await page.evaluate(() => {
			(window as any).SugarCube.State.variables.money = 500000000;
		});
		await navigateTo(page, "Underground Brothel Contract Bailey");
		expect(await page.evaluate(() => (window as any).setup.inflation.multiplier())).toBeGreaterThan(baseMultiplier);

		await page.locator("#passages a", { hasText: "Discuss one month" }).first().click();
		await page.waitForFunction(() => (window as any).SugarCube.State.active.title === "Underground Brothel Contract Terms");
		expect(
			await page.evaluate(() => {
				const V = (window as any).SugarCube.State.variables;
				return { pay: V.undergroundbrothelcontract.pay, quoted: (window as any).setup.inflation.price(1500000) };
			})
		).toMatchObject({ pay: await page.evaluate(() => (window as any).setup.inflation.price(1500000)) });

		/* The envelope prints the divineTfIncome-adjusted figure, which is what income() credits. */
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.money = 500;
			V.demon = 6;
			V.transformationParts.demon.core = "demon";
			V.undergroundbrothelcontract = { broker: "Bailey", end: (window as any).Time.days, pay: 1500000, penalty: 0, obedience: 0 };
			V.undergroundbrothel = { active: true, escape: 0 };
		});
		const before = await page.evaluate(() => (window as any).SugarCube.State.variables.money);
		await navigateTo(page, "Underground Brothel Contract Complete");
		const shown = (await page.locator("#passages").innerText()).match(/envelope contains £([\d,]+)/);
		await page.locator('#passages a[data-passage="Domus Street"]').first().click();
		await page.waitForFunction(() => (window as any).SugarCube.State.active.title === "Domus Street");
		const credited = await page.evaluate(b => (window as any).SugarCube.State.variables.money - b, before);
		expect(credited).toBe(await page.evaluate(() => (window as any).divineTfIncome(1500000, "undergroundBrothelContract")));
		expect(Number(shown![1].replace(/,/g, "")) * 100).toBe(credited);
	});

	/** Walking out early voids the contract on every route, not just the deliberate lock-picking one. */
	test("leaving early always says the payment is forfeit", async ({ page }) => {
		await openContractGame(page);
		await navigateTo(page, "Start2");
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.undergroundbrothelescaped = true;
			V.undergroundbrothelcontract = { broker: "Bailey", end: (window as any).Time.days + 7, pay: 250000, penalty: 0, obedience: 0 };
			V.undergroundbrothel = { active: true, escape: 0 };
		});
		await navigateTo(page, "Underground Brothel Contract Arrival");
		await navigateTo(page, "Underground Brothel Contract Escape");
		await expect(page.locator("#passages")).toContainText("will not be paid");

		/* The hunt shift leads above ground, so it warns before you take it. The shift is random,
		   so re-roll the passage until that one comes up. */
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.undergroundbrothelcontract = { broker: "Bailey", end: (window as any).Time.days + 7, pay: 250000, penalty: 0, obedience: 0 };
			V.undergroundbrothel = { active: true, escape: 0 };
		});
		let sawHuntWarning = false;
		for (let i = 0; i < 40 && !sawHuntWarning; i++) {
			await navigateTo(page, "Underground Brothel Contract Work");
			await assertNoErrors(page);
			const text = await page.locator("#passages").innerText();
			if (text.includes("sound of dogs")) {
				expect(text).toContain("void your contract");
				sawHuntWarning = true;
			}
		}
		expect(sawHuntWarning).toBe(true);

		/* Same notice when a vanilla scene calls <<dungeonescape>> on its own. */
		expect(
			await page.evaluate(() => {
				(window as any).SugarCube.Wikifier.wikifyEval("<<dungeonescape>>");
				return (window as any).SugarCube.State.variables.undergroundbrothelcontract;
			})
		).toBeUndefined();
	});

	/** Labour under contract goes to hospital and comes back, rather than ending the stay. */
	test("giving birth interrupts the contract instead of ending it", async ({ page }) => {
		await openContractGame(page);
		await navigateTo(page, "Start2");
		await page.evaluate(() => {
			const SC = (window as any).SugarCube;
			const V = SC.State.variables;
			V.undergroundbrothelescaped = true;
			V.undergroundbrothelcontract = { broker: "Bailey", end: (window as any).Time.days + 7, pay: 250000, penalty: 0, obedience: 0 };
			V.undergroundbrothel = { active: true, escape: 0 };
			V.player.vaginaExist = true;
			SC.Wikifier.wikifyEval('<<playerPregnancy "pc" "human" true "vagina" undefined true>>');
			const p = V.sexStats.vagina.pregnancy;
			p.timer = p.timerEnd;
			p.waterBreaking = true;
			p.gaveBirth = false;
		});
		await navigateTo(page, "Underground Brothel Contract Quarters");
		await assertNoErrors(page);
		/* The brothel handles it, rather than the vanilla "nobody comes" cell scene. */
		await expect(page.locator("#passages")).toContainText("Your contract doesn't stop for this");
		await expect(page.locator("#passages")).not.toContainText("barren room for an escape");
		expect(await page.evaluate(() => (window as any).SugarCube.State.variables.undergroundbrothelcontract)).toBeTruthy();
		await page.locator("#passages a[data-passage]").first().click();
		await page.waitForFunction(() => (window as any).SugarCube.State.active.title === "Pregnancy Birth Hospital Rescue");

		/* The hospital hands you back to the handler at the end of the birth chain. */
		await navigateTo(page, "Pregnancy Birth Hospital 5");
		await expect(page.locator('#passages a[data-passage="Underground Brothel Contract Hospital Return"]')).toHaveCount(1);
		await navigateTo(page, "Underground Brothel Contract Hospital Return");
		await assertNoErrors(page);
		await expect(page.locator('#passages a[data-passage="Underground Brothel Contract Quarters"]')).toHaveCount(1);
	});

	/** A wolf delivery normally ends in the wolf cave, which would strand a contract. */
	test("wolf births stay in the hospital under contract, with and without realistic childbirth", async ({ page }) => {
		await openContractGame(page);
		await navigateTo(page, "Start2");

		const setup = (contract: boolean, rcb: boolean) =>
			page.evaluate(
				([c, r]) => {
					const SC = (window as any).SugarCube;
					const V = SC.State.variables;
					V.settings.realisticChildbirthEnabled = r;
					if (c) {
						V.undergroundbrothelcontract = { broker: "Bailey", end: (window as any).Time.days + 7, pay: 250000, penalty: 0, obedience: 0 };
						V.undergroundbrothel = { active: true, escape: 0 };
					} else {
						delete V.undergroundbrothelcontract;
					}
					V.player.vaginaExist = true;
					SC.Wikifier.wikifyEval('<<playerPregnancy "pc" "human" true "vagina" undefined true>>');
					const p = V.sexStats.vagina.pregnancy;
					p.type = "wolf";
					p.fetus.forEach((f: any) => (f.type = "wolf"));
					p.timer = p.timerEnd;
					p.waterBreaking = true;
					p.gaveBirth = false;
				},
				[contract, rcb] as [boolean, boolean]
			);

		const target = async () => {
			await navigateTo(page, "Pregnancy Birth Hospital 2");
			await assertNoErrors(page);
			return page.evaluate(() => document.querySelector("#passages a[data-passage]")?.getAttribute("data-passage"));
		};

		await setup(true, false);
		expect(await target()).toBe("Pregnancy Birth Hospital 3");
		await setup(true, true);
		expect(await target()).toBe("Childbirth");
		/* Untouched when no contract is running. */
		await setup(false, false);
		expect(await target()).toBe("Pregnancy Birth Hospital Wolf");
	});

	/** Taking the punishment runs the same combat loop as fighting it, only consensually. */
	test("submitting to a punishment plays out as a consensual scene", async ({ page }) => {
		await openContractGame(page);
		await navigateTo(page, "Start2");
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.undergroundbrothelescaped = true;
			V.undergroundbrothelcontract = { broker: "Bailey", end: (window as any).Time.days + 7, pay: 250000, penalty: 0, obedience: 0 };
			V.undergroundbrothel = { active: true, time: 0, timepass: false, water: 0, escape: 0 };
		});
		await navigateTo(page, "Underground Brothel Contract Room");
		await navigateTo(page, "Underground Brothel Contract Punishment Refusal");

		/* Every caller has to arm $sexstart, the way the fight route arms $molestationstart. */
		await page.locator("#passages a", { hasText: "Submit" }).first().click();
		await page.waitForFunction(() => (window as any).SugarCube.State.active.title === "Underground Brothel Contract Punishment Submit");
		await assertNoErrors(page);
		expect(
			await page.evaluate(() => {
				const V = (window as any).SugarCube.State.variables;
				return { consensual: V.consensual, combat: V.combat, enemyanger: V.enemyanger, sexstart: V.sexstart };
			})
		).toMatchObject({ consensual: 1, combat: 1, enemyanger: 0, sexstart: 0 });
		/* Loops back onto itself rather than replaying the opening beat. */
		await expect(page.locator('#next a[data-passage="Underground Brothel Contract Punishment Submit"]')).toHaveCount(1);
		await expect(page.locator("#passages")).toContainText("bends you over a bench");
		await navigateTo(page, "Underground Brothel Contract Punishment Submit");
		await expect(page.locator("#passages")).not.toContainText("bends you over a bench");

		const outcomes = {
			/* Giving up mid-scene has to resolve, not dead-end. */
			giveup: { vals: { finish: 1, enemyhealth: 100, enemypleasure: 0, enemypleasuremax: 100 }, penalty: 0, obedience: -1 },
			/* Landing a blow is the same offence whether or not you meant to submit. */
			hurt: { vals: { finish: 0, enemyhealth: 0, enemypleasure: 0, enemypleasuremax: 100 }, penalty: 1, obedience: -1 },
			satisfied: { vals: { finish: 0, enemyhealth: 100, enemypleasure: 100, enemypleasuremax: 100 }, penalty: 0, obedience: 1 },
			plain: { vals: { finish: 0, enemyhealth: 100, enemypleasure: 0, enemypleasuremax: 100 }, penalty: 0, obedience: 1 },
		};
		for (const [, outcome] of Object.entries(outcomes)) {
			await page.evaluate(v => {
				const V = (window as any).SugarCube.State.variables;
				Object.assign(V, v);
				V.undergroundbrothelcontract.penalty = 0;
				V.undergroundbrothelcontract.obedience = 0;
			}, outcome.vals);
			await navigateTo(page, "Underground Brothel Contract Punishment Submit Finish");
			await assertNoErrors(page);
			expect(await page.locator("#passages a[data-passage]").count()).toBeGreaterThan(0);
			expect(
				await page.evaluate(() => {
					const c = (window as any).SugarCube.State.variables.undergroundbrothelcontract;
					return { penalty: c.penalty, obedience: c.obedience };
				})
			).toMatchObject({ penalty: outcome.penalty, obedience: outcome.obedience });
		}
	});

	/** A patron can buy the quiet hours, which is the one sleep event the handler isn't part of. */
	test("a night patron can be sold access while you sleep", async ({ page }) => {
		await openContractGame(page);
		await navigateTo(page, "Start2");
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.undergroundbrothelescaped = true;
			V.undergroundbrothelcontract = { broker: "Bailey", end: (window as any).Time.days + 7, pay: 250000, penalty: 0, obedience: 0 };
			V.undergroundbrothel = { active: true, time: 0, timepass: false, water: 0, escape: 0 };
		});
		await navigateTo(page, "Underground Brothel Contract Room");
		await navigateTo(page, "Underground Brothel Contract Sleep Patron");
		await assertNoErrors(page);
		/* The patron replaces the handler in slot 0 for the scene. */
		expect(await page.evaluate(() => (window as any).SugarCube.State.variables.NPCList[0].per)).toBeUndefined();

		await page.locator("#passages a[data-passage]").first().click();
		await page.waitForFunction(() => (window as any).SugarCube.State.active.title === "Underground Brothel Contract Sleep Patron Molestation");
		await assertNoErrors(page);
		/* Non-consensual, unlike the punishment scene. */
		expect(
			await page.evaluate(() => {
				const V = (window as any).SugarCube.State.variables;
				return { combat: V.combat, consensual: V.consensual };
			})
		).toMatchObject({ combat: 1, consensual: 0 });

		/* Shouting is answered differently depending on who runs your contract. */
		for (const trait of ["relaxed", "sociable", "brooding", "lecher"]) {
			await page.evaluate(t => {
				const V = (window as any).SugarCube.State.variables;
				V.undergroundbrothelcontract.masterTrait = t;
				V.alarm = 1;
			}, trait);
			await navigateTo(page, "Underground Brothel Contract Sleep Patron Molestation");
			await assertNoErrors(page);
			await expect(page.locator("#passages")).toContainText("Paid for");
		}

		for (const outcome of [
			{ vals: { finish: 0, enemyhealth: 0, enemypleasure: 0, enemypleasuremax: 100 }, penalty: 1, obedience: -1 },
			{ vals: { finish: 0, enemyhealth: 100, enemypleasure: 100, enemypleasuremax: 100 }, penalty: 0, obedience: 1 },
			{ vals: { finish: 1, enemyhealth: 100, enemypleasure: 0, enemypleasuremax: 100 }, penalty: 0, obedience: -1 },
			{ vals: { finish: 0, enemyhealth: 100, enemypleasure: 0, enemypleasuremax: 100 }, penalty: 0, obedience: 0 },
		]) {
			await page.evaluate(v => {
				const V = (window as any).SugarCube.State.variables;
				Object.assign(V, v);
				V.undergroundbrothelcontract.penalty = 0;
				V.undergroundbrothelcontract.obedience = 0;
			}, outcome.vals);
			await navigateTo(page, "Underground Brothel Contract Sleep Patron Finish");
			await assertNoErrors(page);
			expect(await page.locator("#passages a[data-passage]").count()).toBeGreaterThan(0);
			expect(
				await page.evaluate(() => {
					const c = (window as any).SugarCube.State.variables.undergroundbrothelcontract;
					return { penalty: c.penalty, obedience: c.obedience };
				})
			).toMatchObject({ penalty: outcome.penalty, obedience: outcome.obedience });
		}

		/* The handler comes back afterwards without the encounter count creeping. */
		await navigateTo(page, "Underground Brothel Contract Quarters");
		await assertNoErrors(page);
		expect(
			await page.evaluate(() => {
				const V = (window as any).SugarCube.State.variables;
				return { per: V.NPCList[0].per, enemyno: V.enemyno, stored: !!V.per_npc.contract_master };
			})
		).toMatchObject({ per: "contract_master", enemyno: 1, stored: true });

		/* And the event is actually reachable from the sleep rotation. */
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.undergroundbrothelcontract.masterTrait = "brooding";
			V.undergroundbrothelcontract.obedience = 0;
			V.sleephour = 0;
		});
		let reached = false;
		for (let i = 0; i < 60 && !reached; i++) {
			/* <<sleep>> picks the night's event, so it needs hours to sleep through. */
			await page.evaluate(() => {
				const V = (window as any).SugarCube.State.variables;
				V.sleephour = 8;
				V.tiredness = 4000;
				V.nightmares = 0;
				delete V.contractWake;
				V.undergroundbrothelcontract.end = (window as any).Time.days + 30;
			});
			await navigateTo(page, "Underground Brothel Contract Sleep");
			reached = (await page.locator("#passages").innerText()).includes("Bought the quiet hours");
		}
		expect(reached).toBe(true);
	});

	/** The night's event is chosen inside <<sleep>>, so being woken costs the rest of the night,
	 *  and the handler's regard shapes which event it is. */
	test("the handler's regard shapes the night, and being woken costs sleep", async ({ page }) => {
		test.setTimeout(180000);
		await openContractGame(page);
		await navigateTo(page, "Start2");
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.undergroundbrothelescaped = true;
			V.undergroundbrothelcontract = {
				broker: "Bailey",
				end: (window as any).Time.days + 30,
				pay: 250000,
				penalty: 0,
				obedience: 0,
				masterTrait: "brooding",
			};
			V.undergroundbrothel = { active: true, time: 0, timepass: false, water: 0, escape: 0 };
		});
		await navigateTo(page, "Underground Brothel Contract Room");

		const sample = async (obedience: number, trait: string, passage: string, runs: number) => {
			const tally: Record<string, number> = {};
			let wokenHours = 0;
			let woken = 0;
			for (let i = 0; i < runs; i++) {
				await page.evaluate(
					([o, t]) => {
						const V = (window as any).SugarCube.State.variables;
						V.undergroundbrothelcontract.obedience = o;
						V.undergroundbrothelcontract.masterTrait = t;
						V.undergroundbrothelcontract.end = (window as any).Time.days + 30;
						delete V.contractWake;
						V.sleephour = 8;
						V.tiredness = 4000;
						V.nightmares = 0;
						V.sleepHoursTotal = 0;
					},
					[obedience, trait] as [number, string]
				);
				await navigateTo(page, passage);
				await assertNoErrors(page);
				const r = await page.evaluate(() => {
					const txt = (document.querySelector("#passages") as HTMLElement).innerText;
					let kind = "rest";
					if (txt.includes("Bought the quiet hours")) kind = "patron";
					else if (txt.includes("climbed over you while you slept")) kind = "master";
					else if (txt.includes("two patrons close behind")) kind = "group";
					else if (txt.includes("nudging a tray") || txt.includes("You talk in your sleep")) kind = "trait";
					else if (txt.includes("previous shift's report")) kind = "punish";
					return { kind, hours: (window as any).SugarCube.State.variables.sleepHoursTotal };
				});
				tally[r.kind] = (tally[r.kind] || 0) + 1;
				if (r.kind !== "rest") {
					woken++;
					wokenHours += r.hours;
				}
			}
			return { tally, woken, avgWokenHours: woken ? wokenHours / woken : null };
		};

		/* A troublesome worker loses most nights; a reliable one is mostly left alone. */
		const troublesome = await sample(-3, "brooding", "Underground Brothel Contract Sleep", 30);
		const reliable = await sample(5, "brooding", "Underground Brothel Contract Sleep", 30);
		expect(troublesome.woken).toBeGreaterThan(reliable.woken);
		/* Punishment only reaches the badly behaved. */
		expect(troublesome.tally.punish ?? 0).toBeGreaterThan(0);
		expect(reliable.tally.punish ?? 0).toBe(0);
		/* Waking up mid-night has to actually cut the eight hours short. */
		expect(troublesome.avgWokenHours!).toBeLessThan(8);

		/* The handler's personality decides whether it is them or a crowd. */
		const lecher = await sample(0, "lecher", "Underground Brothel Contract Sleep", 30);
		expect(lecher.tally.group ?? 0).toBe(0);
		const sociable = await sample(0, "sociable", "Underground Brothel Contract Sleep", 30);
		expect(sociable.tally.master ?? 0).toBe(0);

		/* Chained in the staff bedroom, no patron can reach you - the point of earning the bed. */
		const staffBed = await sample(4, "lecher", "Underground Brothel Contract Master Bed Sleep", 30);
		expect(staffBed.tally.patron ?? 0).toBe(0);
		expect(staffBed.tally.master ?? 0).toBeGreaterThan(0);

		/* Nothing is left over to fire again on the next night. */
		expect(await page.evaluate(() => (window as any).SugarCube.State.variables.contractWake)).toBeUndefined();
	});

	/** The sleep fragments are includes, so a stray <<effects>> would process the turn twice. */
	test("included sleep fragments do not run effects a second time", async ({ page }) => {
		await openContractGame(page);
		await navigateTo(page, "Start2");
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.undergroundbrothelcontract = { broker: "Bailey", end: (window as any).Time.days + 7, pay: 250000, penalty: 0, obedience: 0 };
			V.undergroundbrothel = { active: true, time: 0, timepass: false, water: 0, escape: 0 };
		});
		await navigateTo(page, "Underground Brothel Contract Room");

		/* $speechcycle advances once per <<effects>> call, so it counts them. */
		for (const fragment of [
			"Underground Brothel Contract Sleep Master Wake",
			"Underground Brothel Contract Sleep Group Wake",
			"Underground Brothel Contract Sleep Trait Wake",
			"Underground Brothel Contract Sleep Punishment",
			"Underground Brothel Contract Sleep Patron",
		]) {
			await page.evaluate(() => {
				(window as any).SugarCube.State.variables.speechcycle = 0;
			});
			await navigateTo(page, fragment);
			expect(await page.evaluate(() => (window as any).SugarCube.State.variables.speechcycle), fragment).toBe(0);
		}
	});

	/** Every handler personality has to produce a renderable wake-up with a way out of the passage. */
	test("sleep wake-ups resolve for every handler trait", async ({ page }) => {
		await openContractGame(page);
		await navigateTo(page, "Start2");
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.undergroundbrothelcontract = { broker: "Bailey", end: (window as any).Time.days + 7, pay: 250000, penalty: 0, obedience: 2 };
			V.undergroundbrothel = { active: true, time: 0, timepass: false, water: 0, escape: 0 };
		});
		await navigateTo(page, "Underground Brothel Contract Quarters");

		for (const trait of ["relaxed", "brooding", "sociable", "lecher"]) {
			await page.evaluate(t => {
				(window as any).SugarCube.State.variables.undergroundbrothelcontract.masterTrait = t;
			}, trait);
			await navigateTo(page, "Underground Brothel Contract Sleep Trait Wake");
			await assertNoErrors(page);
			expect(await page.locator("#passages a[data-passage]").count()).toBeGreaterThan(0);
		}
	});

	/** The handler's own show is the shift where your standing is made public, so which version of it
	 *  you get, and how often it comes up at all, has to follow obedience rather than chance alone. */
	test("the handler's show is scheduled by obedience, and staged by it too", async ({ page }) => {
		await openContractGame(page);
		await navigateTo(page, "Start2");
		const setContract = (obedience: number) =>
			page.evaluate(o => {
				const V = (window as any).SugarCube.State.variables;
				V.undergroundbrothelcontract = {
					broker: "Bailey",
					end: (window as any).Time.days + 7,
					pay: 250000,
					penalty: 0,
					obedience: o,
					masterTrait: "brooding",
				};
				V.undergroundbrothel = { active: true, time: 0, timepass: false, water: 0, escape: 0 };
			}, obedience);

		/* Shift frequency: the worse your standing, the more of the schedule is the show. */
		const showShare = async (obedience: number) => {
			let shows = 0;
			for (let i = 0; i < 40; i++) {
				await setContract(obedience);
				await navigateTo(page, "Underground Brothel Contract Work");
				if (await page.locator('#passages a[data-passage="Underground Brothel Contract Show"]').count()) shows++;
			}
			return shows;
		};
		const reliable = await showShare(5);
		const troublesome = await showShare(-3);
		expect(troublesome).toBeGreaterThan(reliable);
		/* Still reachable at the top of the scale, or the trusted staging below would be dead content. */
		expect(reliable).toBeGreaterThan(0);

		/* Going quietly must not raise obedience before the show decides which version the master ordered. */
		let lowObedienceShowReached = false;
		for (let i = 0; i < 20; i++) {
			await setContract(-1);
			await page.evaluate(() => {
				(window as any).SugarCube.State.variables.settings.bestialityEnabled = true;
			});
			await navigateTo(page, "Underground Brothel Contract Work");
			const showLink = page.locator('#passages a[data-passage="Underground Brothel Contract Show"]');
			if (await showLink.count()) {
				await showLink.click();
				await page.waitForFunction(() => (window as any).SugarCube.State.active.title === "Underground Brothel Contract Show");
				await assertNoErrors(page);
				expect(await page.evaluate(() => (window as any).SugarCube.State.variables.undergroundbrothelcontract.obedience)).toBe(-1);
				await expect(page.locator("#passages")).toContainText("An animal party");
				lowObedienceShowReached = true;
				break;
			}
		}
		expect(lowObedienceShowReached).toBe(true);

		/* Staging: trusted workers perform, ordinary workers are displayed, and low obedience gets the animal party. */
		await setContract(5);
		await navigateTo(page, "Underground Brothel Contract Show");
		await assertNoErrors(page);
		expect(await page.locator('#passages a[data-passage="Underground Brothel Contract Show Perform"]').count()).toBeGreaterThan(0);

		await setContract(1);
		await navigateTo(page, "Underground Brothel Contract Show");
		await assertNoErrors(page);
		expect(await page.locator('#passages a[data-passage="Underground Brothel Contract Show Molestation"]').count()).toBeGreaterThan(0);

		await setContract(-2);
		await page.evaluate(() => {
			(window as any).SugarCube.State.variables.settings.bestialityEnabled = true;
		});
		await navigateTo(page, "Underground Brothel Contract Show");
		await assertNoErrors(page);
		await expect(page.locator("#passages")).toContainText("An animal party");
		await expect(page.locator("#passages")).toContainText("A dog");
		await expect(page.locator("#passages")).toContainText("A cat");
		await expect(page.locator("#passages")).toContainText("The pig");
	});

	/** A show must leave the brothel's own restraints exactly where it found them: the stage straps are
	 *  the only thing undone, and being made an example of leaves your arms tied afterwards. */
	test("shows never take the collar or cuffs off, and tips ride on the final payment", async ({ page }) => {
		await openContractGame(page);
		await navigateTo(page, "Start2");
		const stage = (obedience: number) =>
			page.evaluate(o => {
				const V = (window as any).SugarCube.State.variables;
				V.undergroundbrothelcontract = {
					broker: "Bailey",
					end: (window as any).Time.days + 7,
					pay: 250000,
					penalty: 0,
					obedience: o,
					masterTrait: "sociable",
				};
				V.undergroundbrothel = { active: true, time: 0, timepass: false, water: 0, escape: 0 };
				V.worn.neck = Object.assign({}, (window as any).setup.clothes.neck[21]);
				V.leftleg = "bound";
				V.rightleg = "bound";
				V.feetuse = "bound";
			}, obedience);

		const restraints = () =>
			page.evaluate(() => {
				const V = (window as any).SugarCube.State.variables;
				return {
					neck: V.worn.neck.name,
					feet: V.worn.feet.type.includes("shackle"),
					leftarm: V.leftarm,
					rightarm: V.rightarm,
					pay: V.undergroundbrothelcontract?.pay,
				};
			});

		/* Made an example of: unbuckled from the frame, then tied again by hand. */
		await stage(-2);
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.worn.feet.type.push("shackle");
			V.phase = 2;
		});
		await navigateTo(page, "Underground Brothel Contract Show Finish");
		await assertNoErrors(page);
		await page.locator('#passages a[data-passage="Underground Brothel Contract Quarters"]').first().click();
		await page.waitForFunction(() => (window as any).SugarCube.State.active.title === "Underground Brothel Contract Quarters");
		expect(await restraints()).toMatchObject({ neck: "collar with leash", feet: true, leftarm: "bound", rightarm: "bound" });

		/* An ordinary show: arms freed, but nothing the brothel locked on you is touched. */
		await stage(1);
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.worn.feet.type.push("shackle");
			V.phase = 0;
			V.leftarm = "bound";
			V.rightarm = "bound";
		});
		await navigateTo(page, "Underground Brothel Contract Show Finish");
		await assertNoErrors(page);
		await page.locator('#passages a[data-passage="Underground Brothel Contract Quarters"]').first().click();
		await page.waitForFunction(() => (window as any).SugarCube.State.active.title === "Underground Brothel Contract Quarters");
		expect(await restraints()).toMatchObject({ neck: "collar with leash", feet: true, leftarm: 0, rightarm: 0 });

		/* Tips are added to the agreed fee rather than paid out on the night, so they are forfeit too. */
		await stage(5);
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.enemypleasure = 999;
			V.enemypleasuremax = 1;
			V.enemyhealth = 100;
		});
		await navigateTo(page, "Underground Brothel Contract Show Perform Finish");
		await assertNoErrors(page);
		await expect(page.locator("#passages")).toContainText("final payment has risen");
		expect((await restraints()).pay).toBeGreaterThan(250000);
	});

	/** Being made an example of puts the kennel on the bill: one beast at a time, in front of the house,
	 *  fed in by the train. Where the settings forbid beasts entirely, the patrons take their place. */
	test("the worst standing is staged with the kennel, and falls back to patrons when it can't be", async ({ page }) => {
		await openContractGame(page);
		await navigateTo(page, "Start2");
		const setUp = (beasts: boolean) =>
			page.evaluate(b => {
				const V = (window as any).SugarCube.State.variables;
				V.undergroundbrothelcontract = {
					broker: "Bailey",
					end: (window as any).Time.days + 7,
					pay: 250000,
					penalty: 2,
					obedience: -3,
					masterTrait: "brooding",
				};
				V.undergroundbrothel = { active: true, time: 0, timepass: false, water: 0, escape: 0 };
				V.worn.neck = Object.assign({}, (window as any).setup.clothes.neck[21]);
				V.settings.bestialityEnabled = b;
				V.settings.monsterChance = b ? 100 : 0;
			}, beasts);

		/* Beasts off and no monster people to stand in for them: the show still happens, with people. */
		await setUp(false);
		await navigateTo(page, "Underground Brothel Contract Show");
		await assertNoErrors(page);
		expect(await page.locator('#passages a[data-passage="Underground Brothel Contract Show Beasts"]').count()).toBe(0);
		expect(await page.locator('#passages a[data-passage="Underground Brothel Contract Show Molestation"]').count()).toBeGreaterThan(0);

		await setUp(true);
		await navigateTo(page, "Underground Brothel Contract Show");
		await assertNoErrors(page);
		await page.locator('#passages a[data-passage="Underground Brothel Contract Show Beasts"]').first().click();
		await page.waitForFunction(() => (window as any).SugarCube.State.active.title === "Underground Brothel Contract Show Beasts");
		await assertNoErrors(page);
		/* The whole kennel is stored, and only the first of them is on the boards. */
		const train = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			return { type: V.enemytype, enemyno: V.enemyno, length: V.combatTrain.length, total: V.combatTrain.total_length };
		});
		expect(train).toMatchObject({ type: "beast", enemyno: 1, length: 2, total: 2 });
		expect(await page.evaluate(() => (window as any).SugarCube.State.variables.combatTrain.beastTypes)).toEqual(["dog", "cat", "pig"]);

		/* Drive the train to its end: each one that finishes is replaced until the cages are empty. */
		const trainLength = () => page.evaluate(() => (window as any).SugarCube.State.variables.combatTrain.length);
		const seeOffOneBeast = async () => {
			await page.evaluate(() => {
				(window as any).SugarCube.State.variables.enemyhealth = 0;
			});
			await navigateTo(page, "Underground Brothel Contract Show Beasts Finish");
			await assertNoErrors(page);
			await page.locator("#passages a[data-passage]").first().click();
			await page.waitForTimeout(50);
		};
		for (let i = 0; i < 8 && (await trainLength()) > 0; i++) await seeOffOneBeast();
		expect(await trainLength()).toBe(0);
		/* The last one leaves for good, which is what ends the show rather than another cage. */
		await seeOffOneBeast();
		await assertNoErrors(page);
		await expect(page.locator("#passages")).toContainText("unhooked from the ring");

		await page.locator('#passages a[data-passage="Underground Brothel Contract Quarters"]').first().click();
		await page.waitForFunction(() => (window as any).SugarCube.State.active.title === "Underground Brothel Contract Quarters");
		await assertNoErrors(page);
		expect(
			await page.evaluate(() => {
				const V = (window as any).SugarCube.State.variables;
				return { neck: V.worn.neck.name, leftarm: V.leftarm, enemyno: V.enemyno, slot0: V.NPCList[0]?.per };
			})
			/* Back in your room the only NPC is the handler again: no beast is left in the slots. */
		).toMatchObject({ neck: "collar with leash", leftarm: "bound", enemyno: 1, slot0: "contract_master" });
	});

	test("the animal party uses monster people when real beasts are disabled", async ({ page }) => {
		await openContractGame(page);
		await navigateTo(page, "Start2");
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.undergroundbrothelcontract = {
				broker: "Bailey",
				end: (window as any).Time.days + 7,
				pay: 250000,
				penalty: 0,
				obedience: -3,
				masterTrait: "brooding",
			};
			V.undergroundbrothel = { active: true, time: 0, timepass: false, water: 0, escape: 0 };
			V.settings.bestialityEnabled = false;
			V.settings.monsterChance = 100;
			V.settings.monsterHallucinationsOnly = false;
		});

		await navigateTo(page, "Underground Brothel Contract Show");
		await assertNoErrors(page);
		await page.locator('#passages a[data-passage="Underground Brothel Contract Show Beasts"]').first().click();
		await page.waitForFunction(() => (window as any).SugarCube.State.active.title === "Underground Brothel Contract Show Beasts");
		await assertNoErrors(page);
		expect(
			await page.evaluate(() => {
				const train = (window as any).SugarCube.State.variables.combatTrain;
				return {
					species: train.beastTypes.map((type: string) => type.replace(/(?:boy|girl)$/, "")),
					monsters: train.monsters,
				};
			})
		).toMatchObject({
			species: ["dog", "cat", "pig"],
			monsters: ["monster", "monster", "monster"],
		});
	});

	/** The staging is carried between the stage passages in $phase, and a plain <<endevent>> moves it
	 *  into $phaselast and zeroes it. That silently downgraded the harshest show to the mildest one:
	 *  one patron short, none of the anger, and the finish untying you as if you'd behaved. */
	test("the staging chosen on the stage survives into the scene and its ending", async ({ page }) => {
		await openContractGame(page);
		await navigateTo(page, "Start2");
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.undergroundbrothelcontract = {
				broker: "Bailey",
				end: (window as any).Time.days + 7,
				pay: 250000,
				penalty: 1,
				obedience: -2,
				masterTrait: "brooding",
			};
			V.undergroundbrothel = { active: true, time: 0, timepass: false, water: 0, escape: 0 };
			V.worn.neck = Object.assign({}, (window as any).setup.clothes.neck[21]);
			/* No kennel available, so the worst standing is staged with patrons instead. */
			V.settings.bestialityEnabled = false;
			V.settings.monsterChance = 0;
		});

		await navigateTo(page, "Underground Brothel Contract Show");
		await page.locator('#passages a[data-passage="Underground Brothel Contract Show Molestation"]').first().click();
		await page.waitForFunction(() => (window as any).SugarCube.State.active.title === "Underground Brothel Contract Show Molestation");
		await assertNoErrors(page);
		expect(
			await page.evaluate(() => {
				const V = (window as any).SugarCube.State.variables;
				return { phase: V.phase, enemyno: V.enemyno, angered: V.enemyanger > 0 };
			})
		).toMatchObject({ phase: 2, enemyno: 3, angered: true });

		await navigateTo(page, "Underground Brothel Contract Show Finish");
		await assertNoErrors(page);
		await expect(page.locator("#passages")).toContainText("tied behind you again");
		await page.locator('#passages a[data-passage="Underground Brothel Contract Quarters"]').first().click();
		await page.waitForFunction(() => (window as any).SugarCube.State.active.title === "Underground Brothel Contract Quarters");
		expect(await page.evaluate(() => (window as any).SugarCube.State.variables.leftarm)).toBe("bound");
	});
});
