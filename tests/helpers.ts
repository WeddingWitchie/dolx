import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML_PATH = path.resolve(__dirname, "../Degrees of Lewdity.html");
export const FILE_URL = `file://${HTML_PATH}`;

export type Page = import("@playwright/test").Page;

/**
 * Wait for SugarCube to finish rendering the current passage.
 */
export async function waitForPassage(page: Page) {
	await page.waitForFunction(() => {
		const passages = document.querySelector("#passages");
		return passages && passages.children.length > 0;
	});
}

/**
 * Navigate to a fresh Start passage, bypassing the age gate.
 */
export async function openGame(page: Page) {
	await page.addInitScript(() => {
		localStorage.setItem("verifiedAge", "true");
	});
	await page.goto(FILE_URL);
	await waitForPassage(page);
}

/**
 * Navigate to the named passage and wait for it to render.
 */
export async function navigateTo(page: Page, passageName: string) {
	await page.evaluate(name => {
		(window as any).SugarCube.Engine.play(name);
	}, passageName);
	await page.waitForFunction(name => {
		const SC = (window as any).SugarCube;
		if (!SC?.State?.active?.title) return false;
		return SC.State.active.title === name && !!document.querySelector("#passages")?.children.length;
	}, passageName);
}

/**
 * Get a SugarCube state variable value.
 */
export async function getVar(page: Page, varName: string) {
	return page.evaluate(name => {
		return (window as any).SugarCube.State.variables[name];
	}, varName);
}

/**
 * Evaluate a twee macro string via Wikifier.wikifyEval.
 */
export async function wikifyEval(page: Page, macroString: string) {
	await page.evaluate(macro => {
		(window as any).SugarCube.Wikifier.wikifyEval(macro);
	}, macroString);
}

/**
 * Assert that no SugarCube errors are present on the page.
 * Throws with the error text if any `.error-view` elements are found.
 */
/**
 * Set a SugarCube state variable.
 */
export async function setVar(page: Page, varName: string, value: unknown) {
	await page.evaluate(
		({ n, v }) => {
			(window as any).SugarCube.State.variables[n] = v;
		},
		{ n: varName, v: value }
	);
}

/**
 * Set the game clock to a specific hour and minute within the current day.
 * Uses Time.setTime() — does not trigger hourPassed side effects.
 */
export async function setTime(page: Page, hour: number, minute = 0) {
	await page.evaluate(
		({ h, m }) => {
			(window as any).Time.setTime(h, m);
		},
		{ h: hour, m: minute }
	);
}

export type WeekDay = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

const DAY_INDEX: Record<WeekDay, number> = {
	Sunday: 0,
	Monday: 1,
	Tuesday: 2,
	Wednesday: 3,
	Thursday: 4,
	Friday: 5,
	Saturday: 6,
};

/** Game starts on Sunday 7:00 AM (2022-09-04 07:00) */
const GAME_START_HOUR = 7;

/**
 * Set the game clock to a specific weekday and time from game start (Sunday 7:00 AM).
 * Uses Time.set() — does not trigger hourPassed/dayPassed side effects.
 *
 * setDay("Tuesday", 15, 30) always resolves to the same absolute timestamp regardless
 * of where the clock currently is, making test setup deterministic.
 *
 * Note: Sunday before 07:00 is before game start — behavior is undefined.
 */
export async function setDay(page: Page, day: WeekDay, hour = GAME_START_HOUR, minute = 0) {
	const timestamp = DAY_INDEX[day] * 86400 + hour * 3600 + minute * 60 - GAME_START_HOUR * 3600;
	await page.evaluate(ts => {
		(window as any).Time.set(ts);
	}, timestamp);
}

/**
 * Advance the game clock by N hours, triggering hourPassed/dayPassed side effects.
 * Use when tests depend on reactive game state (pain decay, Robin watering, exam decay, etc.).
 * For simple time positioning without side effects, prefer setDay() or setTime().
 */
export async function advanceHours(page: Page, hours: number) {
	await page.evaluate(h => {
		(window as any).Time.pass(h * 60 * 60);
	}, hours);
}

/**
 * Advance the game clock by N minutes, triggering minutePassed/hourPassed side effects.
 */
export async function advanceMinutes(page: Page, minutes: number) {
	await page.evaluate(m => {
		(window as any).Time.pass(m * 60);
	}, minutes);
}

/**
 * Render a twee macro into a scratch div and return its text content.
 * Useful for testing widgets without navigating to a passage.
 */
export async function wikifyToText(page: Page, macroString: string): Promise<string> {
	return page.evaluate(macro => {
		const div = document.createElement("div");
		new (window as any).SugarCube.Wikifier(div, macro);
		return div.textContent || "";
	}, macroString);
}

export async function assertNoErrors(page: Page) {
	const errorCount = await page.locator(".error-view").count();
	if (errorCount > 0) {
		const errors = await page.locator(".error-view").allTextContents();
		throw new Error(`Found ${errorCount} SugarCube error(s):\n${errors.join("\n")}`);
	}
}
