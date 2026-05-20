import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { openGame, navigateTo, getVar, setVar, setTime, wikifyEval, wikifyToText, assertNoErrors, waitForPassage } from "./helpers.js";

/**
 * Set up common docks prerequisites without navigating.
 * Deep-merges overrides into $docks. Sets $outside, $location, $exposed,
 * and clears $daily.docksLeftEarly.
 */
async function setupDocks(page: Page, overrides: Record<string, unknown> = {}) {
	await page.evaluate(o => {
		const V = (window as any).SugarCube.State.variables;
		V.outside = 1;
		V.location = "docks";
		V.exposed = 0;
		if (!V.daily) V.daily = {};
		V.daily.docksLeftEarly = false;

		function merge(target: any, source: any) {
			for (const key of Object.keys(source)) {
				if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
					if (!target[key] || typeof target[key] !== "object") target[key] = {};
					merge(target[key], source[key]);
				} else {
					target[key] = source[key];
				}
			}
		}
		merge(V.docks, o);
	}, overrides);
}

/**
 * Set up state for pay calculation tests.
 */
async function setupForPay(
	page: Page,
	overrides: {
		wage?: number;
		dayType?: string;
		shift?: { total: number; workedHard: number; slacked: number; unpaid: number };
		overtime?: { total: number; workedHard: number; slacked: number; unpaid: number };
	} = {}
) {
	const shift = overrides.shift ?? { total: 8, workedHard: 8, slacked: 0, unpaid: 0 };
	const overtime = overrides.overtime ?? { total: 0, workedHard: 0, slacked: 0, unpaid: 0 };

	await setupDocks(page, {
		hired: true,
		wage: overrides.wage ?? 1500,
		dayType: overrides.dayType ?? "normal",
		status: 60,
		bonus: 0,
		pub: { count: 0, cooldown: 1 }, // cooldown > 0 to skip pub crawl invite
		dailyHours: { shift, overtime },
	});
	await setTime(page, 19, 0); // end of day — triggers pay branch in <<dockleave>>
	await setVar(page, "christmas", 0);
}

test.describe("Docks", () => {
	test.beforeEach(async ({ page }) => {
		await openGame(page);
		await navigateTo(page, "Start2");
	});

	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("variables have correct initial values after Start2", async ({ page }) => {
		const docks = (await getVar(page, "docks")) as any;

		expect(docks.askedForWork).toBe(false);
		expect(docks.hired).toBe(false);
		expect(docks.wage).toBe(1500);
		expect(docks.status).toBe(30);
		expect(docks.firstDay).toBe(true);
		expect(docks.dayType).toBe("normal");
		expect(docks.suspicion).toBe(0);
		expect(docks.fakeID).toBe("not considered");
		expect(docks.bonus).toBe(0);

		expect(docks.dailyHours.shift).toEqual({ total: 0, workedHard: 0, slacked: 0, unpaid: 0 });
		expect(docks.dailyHours.overtime).toEqual({ total: 0, workedHard: 0, slacked: 0, unpaid: 0 });

		expect(docks.slave).toEqual({ seen: false, money: 0 });
		expect(docks.pub).toEqual({ count: 0, cooldown: 0 });
		expect(docks.quiz).toEqual({ bet: "nothing", home: 0, away: 0 });
	});

	test.describe("widget", () => {
		test("<<dockstatustext>> displays status tier at each boundary", async ({ page }) => {
			await setupDocks(page);

			const tiers = [
				{ status: 100, text: "admire", cssClass: "green" },
				{ status: 80, text: "respect", cssClass: "teal" },
				{ status: 60, text: "accept", cssClass: "lblue" },
				{ status: 40, text: "tolerate", cssClass: "blue" },
				{ status: 20, text: "suspicion", cssClass: "purple" },
				{ status: 0, text: "contempt", cssClass: "red" },
			];

			for (const { status, text, cssClass } of tiers) {
				const result = await page.evaluate(
					({ s, cls }) => {
						const V = (window as any).SugarCube.State.variables;
						V.docks.status = s;
						const div = document.createElement("div");
						new (window as any).SugarCube.Wikifier(div, "<<dockstatustext>>");
						const span = div.querySelector(`span.${cls}`);
						return {
							fullText: div.textContent || "",
							hasSpan: !!span,
						};
					},
					{ s: status, cls: cssClass }
				);

				expect(result.fullText, `status=${status} should mention "${text}"`).toContain(text);
				expect(result.hasSpan, `status=${status} should use span.${cssClass}`).toBe(true);
			}
		});

		test("<<dockstatus>> doubles input and clamps 0-100", async ({ page }) => {
			await setupDocks(page);

			const cases = [
				{ initial: 50, arg: 10, expected: 70 },
				{ initial: 50, arg: -10, expected: 30 },
				{ initial: 95, arg: 10, expected: 100 }, // clamped high
				{ initial: 5, arg: -10, expected: 0 }, // clamped low
			];

			for (const { initial, arg, expected } of cases) {
				await page.evaluate(
					({ init, a }) => {
						const V = (window as any).SugarCube.State.variables;
						V.docks.status = init;
						V.docks.bonus = 0; // reset bonus between cases
						const div = document.createElement("div");
						new (window as any).SugarCube.Wikifier(div, `<<dockstatus ${a}>>`);
					},
					{ init: initial, a: arg }
				);

				const status = await page.evaluate(() => (window as any).SugarCube.State.variables.docks.status);
				expect(status, `dockstatus ${arg} from ${initial}`).toBe(expected);
			}
		});

		test("<<dockstatus>> accumulates bonus on status increase (DoLP)", async ({ page }) => {
			await setupDocks(page, { status: 50, bonus: 0 });

			await wikifyEval(page, "<<dockstatus 1>>");
			expect(await page.evaluate(() => (window as any).SugarCube.State.variables.docks.bonus)).toBe(500);
			expect(await page.evaluate(() => (window as any).SugarCube.State.variables.docks.status)).toBe(52);

			// Second call accumulates
			await wikifyEval(page, "<<dockstatus 2>>");
			expect(await page.evaluate(() => (window as any).SugarCube.State.variables.docks.bonus)).toBe(1500);
		});

		test("<<dockstatus>> does not add bonus on status decrease", async ({ page }) => {
			await setupDocks(page, { status: 50, bonus: 0 });

			await wikifyEval(page, "<<dockstatus -1>>");
			expect(await page.evaluate(() => (window as any).SugarCube.State.variables.docks.bonus)).toBe(0);
			expect(await page.evaluate(() => (window as any).SugarCube.State.variables.docks.status)).toBe(48);
		});
	});

	test('shows "Ask for work" when not yet asked, hidden after', async ({ page }) => {
		await setupDocks(page, { askedForWork: false, hired: false });
		await setTime(page, 10, 0);
		await navigateTo(page, "Docks");

		await expect(page.locator("#passages").getByText("Ask for work")).toBeVisible();

		await setupDocks(page, { askedForWork: true });
		await navigateTo(page, "Docks");

		await expect(page.locator("#passages").getByText("Ask for work")).not.toBeVisible();
	});

	test('shows "Take job" visible when asked but not hired', async ({ page }) => {
		await setupDocks(page, { askedForWork: true, hired: false });
		await setTime(page, 10, 0);
		await navigateTo(page, "Docks");

		await expect(page.locator("#passages").getByText("Take job")).toBeVisible();

		await setupDocks(page, { hired: true });
		await navigateTo(page, "Docks");

		await expect(page.locator("#passages").getByText("Take job")).not.toBeVisible();
	});

	test('shows "Work as a docker" at 7am (when hired)', async ({ page }) => {
		await setupDocks(page, { hired: true, fakeID: "shown" });
		await setTime(page, 7, 0);
		await navigateTo(page, "Docks");

		await expect(page.locator("#passages").getByText("Work as a docker")).toBeVisible();
	});

	test('shows "Work as a docker" hidden outside arrival window', async ({ page }) => {
		await setupDocks(page, { hired: true, fakeID: "shown" });
		await setTime(page, 10, 0);
		await navigateTo(page, "Docks");

		await expect(page.locator("#passages").getByText("Work as a docker")).not.toBeVisible();
	});

	test('has "Work as a docker" hidden after leaving early', async ({ page }) => {
		await setupDocks(page, { hired: true, fakeID: "shown" });
		await setTime(page, 8, 0);
		await setVar(page, "daily", { ...((await getVar(page, "daily")) as any), docksLeftEarly: true });
		await navigateTo(page, "Docks");

		await expect(page.locator("#passages").getByText("Work as a docker")).not.toBeVisible();
	});

	test('shows "Ask for raise" at status >= 80 and wage < 3000 cap (DoLP)', async ({ page }) => {
		await setupDocks(page, { hired: true, status: 80, wage: 1500 });
		await setTime(page, 10, 0);
		await navigateTo(page, "Docks");

		await expect(page.locator("#passages").getByText("Ask for raise")).toBeVisible();

		// Hidden when wage is at cap
		await setupDocks(page, { wage: 3000 });
		await navigateTo(page, "Docks");

		await expect(page.locator("#passages").getByText("Ask for raise")).not.toBeVisible();

		// Hidden when status is below threshold
		await setupDocks(page, { status: 79, wage: 1500 });
		await navigateTo(page, "Docks");

		await expect(page.locator("#passages").getByText("Ask for raise")).not.toBeVisible();
	});

	test("raise increases wage by 150 and decreases dock status", async ({ page }) => {
		await setupDocks(page, { hired: true, status: 80, wage: 1500 });
		await setTime(page, 10, 0);
		await navigateTo(page, "Docks");

		const link = page.locator("#passages a").filter({ hasText: "Ask for raise" });
		await expect(link).toBeVisible();
		await link.click();

		await page.waitForFunction(() => {
			return (window as any).SugarCube.State.passage === "Docks Raise";
		});

		// wage: 1500 + 150 = 1650; status: 80 - (20 * 2) = 40
		const docks = (await getVar(page, "docks")) as any;
		expect(docks.wage).toBe(1650);
		expect(docks.status).toBe(40);
	});

	test("raise clamps wage to 3000 cap (DoLP)", async ({ page }) => {
		await setupDocks(page, { hired: true, status: 80, wage: 2900 });
		await setTime(page, 10, 0);
		await navigateTo(page, "Docks");

		const link = page.locator("#passages a").filter({ hasText: "Ask for raise" });
		await expect(link).toBeVisible();
		await link.click();

		await page.waitForFunction(() => {
			return (window as any).SugarCube.State.passage === "Docks Raise";
		});

		// wage: 2900 + 150 = 3050, clamped to 3000
		const docks = (await getVar(page, "docks")) as any;
		expect(docks.wage).toBe(3000);
	});

	test.describe("work schedule", () => {
		test("arriving at hour 6 routes through early start", async ({ page }) => {
			await setupDocks(page, { hired: true, fakeID: "shown" });
			await setTime(page, 6, 0);
			await navigateTo(page, "Docks");

			const link = page.locator("#passages a").filter({ hasText: "Work as a docker" });
			await expect(link).toBeVisible();

			await link.click();
			await page.waitForFunction(() => {
				return (window as any).SugarCube.State.passage === "Docks Start Early";
			});

			const passage = await page.evaluate(() => (window as any).SugarCube.State.passage);
			expect(passage).toBe("Docks Start Early");
		});

		test("first day forces dayType to normal and clears firstDay", async ({ page }) => {
			await setupDocks(page, { hired: true, firstDay: true, fakeID: "shown" });
			await setTime(page, 7, 0);
			await setVar(page, "phase", 1);

			await navigateTo(page, "Docks Start");

			const docks = (await getVar(page, "docks")) as any;
			expect(docks.dayType).toBe("normal");
			expect(docks.firstDay).toBe(false);
		});

		test("non-first-day with rng=90 sets dayType to busy", async ({ page }) => {
			await setupDocks(page, { hired: true, firstDay: false, fakeID: "shown" });
			await setTime(page, 7, 0);
			await setVar(page, "phase", 1);
			await setVar(page, "rng", 90); // >= 86 triggers "busy"

			await navigateTo(page, "Docks Start");

			const docks = (await getVar(page, "docks")) as any;
			expect(docks.dayType).toBe("busy");
		});
	});

	test.describe("pay calculation", () => {
		test("shift-only pay: wage * paid hours", async ({ page }) => {
			await setupForPay(page, {
				wage: 1500,
				shift: { total: 8, workedHard: 8, slacked: 0, unpaid: 0 },
			});

			const moneyBefore = (await getVar(page, "money")) as number;
			await wikifyEval(page, "<<dockleave>>");
			const moneyAfter = (await getVar(page, "money")) as number;

			// 1500 pennies/hr * 8 hours = 12000 pennies = £120
			expect(moneyAfter - moneyBefore).toBe(12000);
		});

		test("overtime uses 1.5x multiplier on normal day", async ({ page }) => {
			await setupForPay(page, {
				wage: 1500,
				shift: { total: 8, workedHard: 8, slacked: 0, unpaid: 0 },
				overtime: { total: 3, workedHard: 3, slacked: 0, unpaid: 0 },
			});

			const moneyBefore = (await getVar(page, "money")) as number;
			await wikifyEval(page, "<<dockleave>>");
			const moneyAfter = (await getVar(page, "money")) as number;

			// Shift: 1500 * 8 = 12000
			// Overtime: 1500 * 3 * 1.5 = 6750
			expect(moneyAfter - moneyBefore).toBe(18750);
		});

		test("busy day uses 2.0x overtime multiplier", async ({ page }) => {
			await setupForPay(page, {
				wage: 1500,
				dayType: "busy",
				shift: { total: 8, workedHard: 8, slacked: 0, unpaid: 0 },
				overtime: { total: 3, workedHard: 3, slacked: 0, unpaid: 0 },
			});

			const moneyBefore = (await getVar(page, "money")) as number;
			await wikifyEval(page, "<<dockleave>>");
			const moneyAfter = (await getVar(page, "money")) as number;

			// Shift: 1500 * 8 = 12000
			// Overtime: 1500 * 3 * 2.0 = 9000
			expect(moneyAfter - moneyBefore).toBe(21000);
		});

		test("no pay when all hours are unpaid", async ({ page }) => {
			await setupForPay(page, {
				shift: { total: 8, workedHard: 0, slacked: 8, unpaid: 8 },
				overtime: { total: 0, workedHard: 0, slacked: 0, unpaid: 0 },
			});

			const moneyBefore = (await getVar(page, "money")) as number;
			const text = await wikifyToText(page, "<<dockleave>>");
			const moneyAfter = (await getVar(page, "money")) as number;

			expect(moneyAfter - moneyBefore).toBe(0);
			expect(text).toContain("not given an envelope");
		});

		test("bonus is paid out and reset at end of day (DoLP)", async ({ page }) => {
			await setupForPay(page, {
				wage: 1500,
				shift: { total: 8, workedHard: 8, slacked: 0, unpaid: 0 },
			});
			// Set accumulated bonus from dockstatus calls during the day
			await page.evaluate(() => {
				(window as any).SugarCube.State.variables.docks.bonus = 1500; // 3 positive dockstatus calls
			});

			const moneyBefore = (await getVar(page, "money")) as number;
			await wikifyEval(page, "<<dockleave>>");
			const moneyAfter = (await getVar(page, "money")) as number;

			// Shift: 1500 * 8 = 12000, plus 1500 bonus = 13500
			expect(moneyAfter - moneyBefore).toBe(13500);
			// Bonus is reset after payout
			expect(await page.evaluate(() => (window as any).SugarCube.State.variables.docks.bonus)).toBe(0);
		});
	});
});

test.describe("Docks Work", () => {
	test.beforeEach(async ({ page }) => {
		await openGame(page);
		await navigateTo(page, "Start2");
	});

	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	/**
	 * Wikify the Docks Work phase-specific text block directly, avoiding
	 * the <<dockwork>> widget chain which navigates away. Returns the
	 * rendered HTML from a detached div so we can inspect text + CSS classes.
	 */
	async function renderDocksWorkPhase(page: Page, phase: number, overrides: Record<string, unknown> = {}): Promise<{ text: string; html: string }> {
		await setupDocks(page, { hired: true, ...overrides });
		await setVar(page, "phase", phase);
		await setVar(page, "arousal", 0);
		await setVar(page, "arousalmax", 10000);
		await wikifyEval(page, "<<generate1>><<person1>>");

		return page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			const passage = (window as any).SugarCube.Story.get("Docks Work");
			// Extract the passage source and render it in a detached div,
			// but stop before <<dockwork>> to avoid navigation
			const src = passage.text.replace(/<<pass \d+>>\s*\n\s*<<dockwork>>/, "");
			const div = document.createElement("div");
			new (window as any).SugarCube.Wikifier(div, src);
			return { text: div.textContent || "", html: div.innerHTML };
		});
	}

	test("phase 0 shows day-type-specific work text", async ({ page }) => {
		const cases = [
			{ dayType: "busy", keyword: "exhausting" },
			{ dayType: "slow", keyword: "slow day" },
			{ dayType: "lewd", keyword: "strangely heated" },
			{ dayType: "normal", keyword: "tiring" },
		];

		for (const { dayType, keyword } of cases) {
			const { text } = await renderDocksWorkPhase(page, 0, { dayType });
			expect(text, `dayType="${dayType}" should contain "${keyword}"`).toContain(keyword);
		}
	});

	test("phase 1 shows status-tiered colleague reactions when slacking", async ({ page }) => {
		// High status, first slack → green "don't mind"
		let result = await renderDocksWorkPhase(page, 1, {
			status: 80,
			dayType: "normal",
			dailyHours: {
				shift: { total: 1, workedHard: 0, slacked: 1, unpaid: 0 },
				overtime: { total: 0, workedHard: 0, slacked: 0, unpaid: 0 },
			},
		});
		expect(result.html).toContain('class="green"');
		expect(result.text).toContain("don't mind");

		// Status 40, first slack → blue "let it slide"
		result = await renderDocksWorkPhase(page, 1, {
			status: 40,
			dayType: "normal",
			dailyHours: {
				shift: { total: 1, workedHard: 0, slacked: 1, unpaid: 0 },
				overtime: { total: 0, workedHard: 0, slacked: 0, unpaid: 0 },
			},
		});
		expect(result.html).toContain('class="blue"');
		expect(result.text).toContain("let it slide");

		// Status 0, normal day → red "grumble"
		result = await renderDocksWorkPhase(page, 1, {
			status: 0,
			dayType: "normal",
			dailyHours: {
				shift: { total: 1, workedHard: 0, slacked: 1, unpaid: 0 },
				overtime: { total: 0, workedHard: 0, slacked: 0, unpaid: 0 },
			},
		});
		expect(result.html).toContain('class="red"');
		expect(result.text).toContain("grumble");
	});

	test("phase 1 on slow day shows teal 'don't mind' regardless of status", async ({ page }) => {
		const result = await renderDocksWorkPhase(page, 1, {
			status: 0,
			dayType: "slow",
			dailyHours: {
				shift: { total: 1, workedHard: 0, slacked: 1, unpaid: 0 },
				overtime: { total: 0, workedHard: 0, slacked: 0, unpaid: 0 },
			},
		});
		expect(result.html).toContain('class="teal"');
		expect(result.text).toContain("don't mind you slacking today");
	});

	test("supervisor confrontation at suspicion >= 4", async ({ page }) => {
		await setTime(page, 14, 0); // during shift hours (< 17)
		const result = await renderDocksWorkPhase(page, 1, {
			suspicion: 4,
			status: 30,
			dayType: "normal",
			dailyHours: {
				shift: { total: 1, workedHard: 0, slacked: 1, unpaid: 0 },
				overtime: { total: 0, workedHard: 0, slacked: 0, unpaid: 0 },
			},
		});

		// Supervisor should appear — the exact dialogue varies by $rng
		expect(result.text).toContain("A supervisor follows you and");

		// Shift unpaid should have incremented (hour < 17 → shift.unpaid)
		const docks = (await getVar(page, "docks")) as any;
		expect(docks.dailyHours.shift.unpaid).toBe(1);
	});

	test("supervisor confrontation during overtime marks overtime.unpaid", async ({ page }) => {
		await setVar(page, "rng", 50);
		await setTime(page, 18, 0); // overtime hours (>= 17)
		await renderDocksWorkPhase(page, 1, {
			suspicion: 4,
			status: 30,
			dayType: "normal",
			dailyHours: {
				shift: { total: 8, workedHard: 7, slacked: 1, unpaid: 0 },
				overtime: { total: 1, workedHard: 0, slacked: 1, unpaid: 0 },
			},
		});

		const docks = (await getVar(page, "docks")) as any;
		expect(docks.dailyHours.overtime.unpaid).toBe(1);
	});

	test("suspicion decreases when working (phase 0)", async ({ page }) => {
		await renderDocksWorkPhase(page, 0, { suspicion: 3, dayType: "normal" });

		const docks = (await getVar(page, "docks")) as any;
		expect(docks.suspicion).toBe(2);
	});

	test("suspicion increases when slacking (phase 1)", async ({ page }) => {
		await renderDocksWorkPhase(page, 1, {
			suspicion: 2,
			status: 80,
			dayType: "normal",
			dailyHours: {
				shift: { total: 1, workedHard: 0, slacked: 1, unpaid: 0 },
				overtime: { total: 0, workedHard: 0, slacked: 0, unpaid: 0 },
			},
		});

		const docks = (await getVar(page, "docks")) as any;
		expect(docks.suspicion).toBe(3);
	});

	test("suspicion does not exceed 4 when slacking", async ({ page }) => {
		await renderDocksWorkPhase(page, 1, {
			suspicion: 4,
			status: 80,
			dayType: "normal",
			dailyHours: {
				shift: { total: 1, workedHard: 0, slacked: 1, unpaid: 0 },
				overtime: { total: 0, workedHard: 0, slacked: 0, unpaid: 0 },
			},
		});

		const docks = (await getVar(page, "docks")) as any;
		expect(docks.suspicion).toBe(4); // clamped, not 5
	});
});

test.describe("Docks Pub Crawl", () => {
	test.beforeEach(async ({ page }) => {
		await openGame(page);
		await navigateTo(page, "Start2");
	});

	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("increments $docks.pub.count when entering pub crawl passage", async ({ page }) => {
		await page.evaluate(() => {
			(window as any).SugarCube.State.variables.docks.pub.count = 0;
		});

		await navigateTo(page, "Docks Pub Crawl");

		expect(((await getVar(page, "docks")) as any).pub.count).toBe(1);
	});
});

test.describe("Docks Pub Crawl Quiz", () => {
	test.beforeEach(async ({ page }) => {
		await openGame(page);
		await navigateTo(page, "Start2");
	});

	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	/**
	 * Navigate to Docks Pub Crawl with rng=100 and evening time so the sailor
	 * branch fires and <<person1>> is set. Then manually set quiz state and
	 * jump straight to the results screen (phase >= 5).
	 */
	async function setupQuizResult(page: Page, opts: { bet: string; home: number; away: number }) {
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.rng = 100;
			V.dockpubcount = 0;
		});
		await setTime(page, 20, 0);
		await navigateTo(page, "Docks Pub Crawl");

		await page.evaluate(({ bet, home, away }) => {
			const V = (window as any).SugarCube.State.variables;
			V.docks.quiz.bet = bet;
			V.docks.quiz.home = home;
			V.docks.quiz.away = away;
			V.phase = 5; // past all 5 question phases → results branch
		}, opts);
	}

	test("announces home team victory when dockquizhome > dockquizaway", async ({ page }) => {
		await setupQuizResult(page, { bet: "money", home: 3, away: 0 });
		await navigateTo(page, "Docks Pub Crawl Quiz");

		const text = await page.locator("#passages .passage").innerText();
		expect(text).toContain("The dockers!");
	});

	test("announces away team victory when dockquizaway > dockquizhome", async ({ page }) => {
		await setupQuizResult(page, { bet: "nothing", home: 0, away: 3 });
		await navigateTo(page, "Docks Pub Crawl Quiz");

		const text = await page.locator("#passages .passage").innerText();
		expect(text).toContain("The sailors!");
	});

	test("quiz variables are cleaned up after resolution", async ({ page }) => {
		await setupQuizResult(page, { bet: "money", home: 3, away: 0 });

		// Render the quiz passage directly to ensure <<unset>> executes
		const quiz = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			const passage = (window as any).SugarCube.Story.get("Docks Pub Crawl Quiz");
			const div = document.createElement("div");
			new (window as any).SugarCube.Wikifier(div, passage.text);
			return { bet: V.docks.quiz.bet, home: V.docks.quiz.home, away: V.docks.quiz.away };
		});
		expect(quiz.bet, "quiz.bet should be unset").toBeUndefined();
		expect(quiz.home, "quiz.home should be unset").toBeUndefined();
		expect(quiz.away, "quiz.away should be unset").toBeUndefined();
	});
});

test.describe("Docks Variable Migration", () => {
	test.beforeEach(async ({ page }) => {
		await openGame(page);
		await navigateTo(page, "Start2");
	});

	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("migrates legacy flat docks variables via backComp", async ({ page }) => {
		// Simulate a pre-0.5.8.0 save: delete $docks and set legacy flat variables
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			delete V.docks;
			V.dockwork = 2; // hired
			V.dockwage = 1200; // migrates to 1200 + 500 = 1700
			V.dockstatus = 55;
			V.idDocksReveal = 2; // "shown"
			V.dockslave = 1;
			V.dockslavemoney = 300;
			V.dockpubcount = 5;
			V.dockquiz = "money";
			V.dockquizhome = 2;
			V.dockquizaway = 1;
			V.dockbonus = 750;
			if (!V.timeStats) V.timeStats = {};
			V.timeStats.docks = { total: 10 };
			if (!V.daily) V.daily = {};
			V.daily.dockExhibitionism = false;
		});

		await wikifyEval(page, "<<backComp>>");

		const docks = (await getVar(page, "docks")) as any;
		expect(docks).toBeDefined();
		expect(docks.askedForWork).toBe(true);
		expect(docks.hired).toBe(true);
		expect(docks.wage).toBe(1700);
		expect(docks.status).toBe(55);
		expect(docks.firstDay).toBe(false);
		expect(docks.fakeID).toBe("shown");
		expect(docks.slave.seen).toBe(true);
		expect(docks.slave.money).toBe(300);
		expect(docks.pub.count).toBe(5);
		expect(docks.quiz.bet).toBe("money");
		expect(docks.quiz.home).toBe(2);
		expect(docks.quiz.away).toBe(1);
		expect(docks.bonus).toBe(750);
		expect(docks.dailyHours.shift).toEqual({ total: 0, workedHard: 0, slacked: 0, unpaid: 0 });
		expect(docks.dailyHours.overtime).toEqual({ total: 0, workedHard: 0, slacked: 0, unpaid: 0 });

		// Legacy variables should be cleaned up
		const legacyVars = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			return {
				dockwork: V.dockwork,
				dockwage: V.dockwage,
				dockstatus: V.dockstatus,
				idDocksReveal: V.idDocksReveal,
				dockslave: V.dockslave,
				dockslavemoney: V.dockslavemoney,
				dockpubcount: V.dockpubcount,
				dockquiz: V.dockquiz,
				dockquizhome: V.dockquizhome,
				dockquizaway: V.dockquizaway,
				dockbonus: V.dockbonus,
			};
		});
		for (const [key, val] of Object.entries(legacyVars)) {
			expect(val, `legacy variable $${key} should be deleted`).toBeUndefined();
		}

		// Daily variables should be set
		const daily = (await getVar(page, "daily")) as any;
		expect(daily.docksLeftEarly).toBe(false);
		expect(daily.docksExhibitionism).toBe(false);
	});

	test("status baseline correction: sets status to 30 when wage is default and status is low", async ({ page }) => {
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			delete V.docks;
			// No dockwage set → defaults to 1500; dockstatus = 10 (below 30)
			V.dockstatus = 10;
			if (!V.timeStats) V.timeStats = {};
			if (!V.daily) V.daily = {};
		});

		await wikifyEval(page, "<<backComp>>");

		const docks = (await getVar(page, "docks")) as any;
		expect(docks.wage).toBe(1500);
		expect(docks.status).toBe(30); // corrected from 10 to 30
	});
});

test.describe("Docks Slave Station", () => {
	test.beforeEach(async ({ page }) => {
		await openGame(page);
		await navigateTo(page, "Start2");
	});

	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("shows give links when player has sufficient money", async ({ page }) => {
		await wikifyEval(page, "<<generateyv1>><<person1>>");
		await setVar(page, "money", 1000000);
		await navigateTo(page, "Docks Slave Station");

		const passages = page.locator("#passages");
		await expect(passages.locator("a").filter({ hasText: /Give £100$/ })).toBeVisible();
		await expect(passages.locator("a").filter({ hasText: /Give £300$/ })).toBeVisible();
		await expect(passages.locator("a").filter({ hasText: /Give £1000$/ })).toBeVisible();
	});

	test("shows only Wave goodbye when player cannot afford the ticket", async ({ page }) => {
		await wikifyEval(page, "<<generateyv1>><<person1>>");
		await setVar(page, "money", 5000); // £50 — below the £100 ticket cost
		await navigateTo(page, "Docks Slave Station");

		const passages = page.locator("#passages");
		await expect(passages.getByText("Wave goodbye")).toBeVisible();
		await expect(passages.getByText("Give £100")).not.toBeVisible();
	});

	test("station 2 displays the gift amount and sets $docks.slave.money", async ({ page }) => {
		await wikifyEval(page, "<<generateyv1>><<person1>>");
		await setVar(page, "money", 1000000);
		await navigateTo(page, "Docks Slave Station");

		await page
			.locator("#passages a")
			.filter({ hasText: /Give £100$/ })
			.click();
		await waitForPassage(page);

		const text = await page.locator("#passages .passage").innerText();
		expect(text).toContain("£100");
		expect(((await getVar(page, "docks")) as any).slave.money).toBe(100);
	});
});
