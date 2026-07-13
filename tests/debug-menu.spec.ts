import { test, expect } from "@playwright/test";
import { openGame, navigateTo, assertNoErrors, type Page } from "./helpers.js";

/**
 * Sweep every debug-menu event entry: run its widgets and redirect exactly like window.debugCreateLinkAndRedirect does,
 * then verify no SugarCube errors, no thrown exceptions, and no error dialog.
 */

test.describe.configure({ timeout: 600000 });

async function setupGame(page: Page) {
	await openGame(page);
	await navigateTo(page, "Start2");
	await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		SC.State.variables.debug = 1;
		SC.State.variables.cheatsEnabled = true;
	});
	await navigateTo(page, "Bedroom");
}

interface EntryResult {
	skipped?: string | boolean;
	errors: string[];
	passage?: string;
}

/** Runs one debug entry inside the page and reports errors. */
async function runEntry(page: Page, section: string, index: number): Promise<EntryResult> {
	return page.evaluate(
		({ section, index }) => {
			const SC = (window as any).SugarCube;
			const errors: string[] = [];
			const ev = SC.setup.debugMenu.eventList[section][index];
			if (ev == null || ev.link == null) return { skipped: "text_only", errors };
			if (Object.hasOwn(ev, "condition")) {
				const cond = typeof ev.condition === "function" ? ev.condition() : ev.condition;
				if (!cond) return { skipped: "condition", errors };
			}
			try {
				for (const widget of ev.widgets) {
					const code = typeof widget === "function" ? widget() : widget;
					if (typeof code === "string" && code.length > 0) SC.Wikifier.wikifyEval(code);
				}
				const passageName = typeof ev.link[1] === "function" ? ev.link[1]() : ev.link[1];
				if (passageName) SC.Engine.play(passageName);
			} catch (e: any) {
				errors.push(`threw: ${e && e.message ? e.message : e}`);
			}
			// SugarCube inline macro errors rendered into the passage
			for (const el of Array.from(document.querySelectorAll("#passages .error-view, #passages .error"))) {
				errors.push(`error-view: ${(el as HTMLElement).innerText.slice(0, 300)}`);
			}
			// "no usable links" style error boxes render with .error class too; also catch dialog errors
			if (SC.Dialog.isOpen && SC.Dialog.isOpen()) {
				const body = document.getElementById("ui-dialog-body");
				if (body && body.textContent) errors.push(`dialog: ${body.textContent.slice(0, 300)}`);
				SC.Dialog.close();
			}
			return { errors, passage: SC.State.active.title };
		},
		{ section, index }
	);
}

test("debug menu full sweep", async ({ page }) => {
	const pageErrors: string[] = [];
	page.on("pageerror", err => pageErrors.push(err.message));

	await setupGame(page);

	// Snapshot the fresh state so each entry runs from a clean slate.
	const snapshot = await page.evaluate(() => (window as any).SugarCube.Save.serialize());
	expect(snapshot).not.toBeNull();

	const entries: { section: string; index: number; name: string }[] = await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		const out: { section: string; index: number; name: string }[] = [];
		for (const section of ["Main", "Character", "Events"]) {
			const list = SC.setup.debugMenu.eventList[section];
			for (let i = 0; i < list.length; i++) {
				if (list[i].link == null) continue;
				const raw = list[i].link[0];
				out.push({ section, index: i, name: typeof raw === "function" ? "(dynamic)" : String(raw) });
			}
		}
		return out;
	});
	expect(entries.length).toBeGreaterThan(100);

	const failures: string[] = [];
	for (const entry of entries) {
		pageErrors.length = 0;
		const result = await runEntry(page, entry.section, entry.index);
		// allow async errors (rendering, timeouts) to surface
		await page.waitForTimeout(25);
		const all = [...result.errors, ...pageErrors.map(e => `pageerror: ${e}`)];
		if (!result.skipped && all.length > 0) {
			failures.push(`[${entry.section}#${entry.index}] "${entry.name}" -> ${result.passage}\n\t${all.join("\n\t")}`);
		}
		// restore clean state
		await page.evaluate(snap => (window as any).SugarCube.Save.deserialize(snap), snapshot);
	}

	expect(failures, `Broken debug entries (${failures.length}):\n${failures.join("\n")}`).toEqual([]);
});

test("Gang Rape Me w/ Audience (The Pod) plays through", async ({ page }) => {
	const pageErrors: string[] = [];
	page.on("pageerror", err => pageErrors.push(err.message));
	await setupGame(page);

	const idx = await page.evaluate(() => {
		const list = (window as any).SugarCube.setup.debugMenu.eventList.Events;
		return list.findIndex((ev: any) => ev.link && ev.link[0] === "Gang Rape Me w/ Audience");
	});
	expect(idx).toBeGreaterThanOrEqual(0);

	const result = await runEntry(page, "Events", idx);
	expect(result.errors, result.errors.join("\n")).toEqual([]);
	expect(result.passage).toBe("The Pod");
	await assertNoErrors(page);

	// step through a few combat turns
	for (let i = 0; i < 3; i++) {
		const next = page.locator("#passages #next a").first();
		await expect(next).toBeVisible();
		await next.click();
		await assertNoErrors(page);
	}
	expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});

test("Named NPC Gangbang Test select menu works", async ({ page }) => {
	const pageErrors: string[] = [];
	page.on("pageerror", err => pageErrors.push(err.message));
	await setupGame(page);

	const idx = await page.evaluate(() => {
		const list = (window as any).SugarCube.setup.debugMenu.eventList.Events;
		return list.findIndex((ev: any) => ev.link && ev.link[0] === "Named NPC Gangbang Test");
	});
	expect(idx).toBeGreaterThanOrEqual(0);

	const result = await runEntry(page, "Events", idx);
	expect(result.errors, result.errors.join("\n")).toEqual([]);
	expect(result.passage).toBe("Named NPC Gangbang Select");
	await assertNoErrors(page);

	// add NPCs, remove one, add another — reproduces slot-allocation holes
	await page.locator("#passages a", { hasText: "Add Robin" }).click();
	await assertNoErrors(page);
	await expect(page.locator("#passages").getByText("Robin is active.")).toBeVisible();

	await page.locator("#passages a", { hasText: "Add Whitney" }).click();
	await assertNoErrors(page);
	await expect(page.locator("#passages").getByText("Whitney is active.")).toBeVisible();

	await page.locator("#passages a", { hasText: "Remove Robin" }).click();
	await assertNoErrors(page);
	await expect(page.locator("#passages").getByText("Robin is active.")).not.toBeVisible();
	await expect(page.locator("#passages").getByText("Whitney is active.")).toBeVisible();

	await page.locator("#passages a", { hasText: "Add Alex" }).click();
	await assertNoErrors(page);
	await expect(page.locator("#passages").getByText("Alex is active.")).toBeVisible();

	// the roster must occupy the leading $NPCList slots for combat's 0..enemyno-1 loop
	const roster = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		return { enemyno: V.enemyno, npc: V.npc, slots: V.NPCList.slice(0, 3).map((n: any) => n.fullDescription) };
	});
	expect(roster.enemyno).toBe(2);
	expect(roster.slots.slice(0, 2)).toEqual(expect.arrayContaining(["Whitney", "Alex"]));

	// start the gangbang (target by passage — link text gets numberified)
	await page.locator('#passages a[data-passage="Named NPC Gangbang"]').click();
	await assertNoErrors(page);
	const passage = await page.evaluate(() => (window as any).SugarCube.State.active.title);
	expect(passage).toBe("Named NPC Gangbang");

	// step through combat turns until the scene ends or the budget runs out
	for (let i = 0; i < 15; i++) {
		const next = page.locator("#passages #next a").first();
		if ((await next.count()) === 0) break;
		await next.click();
		await assertNoErrors(page);
	}
	expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});

test("debug overlay renders and real link click navigates", async ({ page }) => {
	const pageErrors: string[] = [];
	page.on("pageerror", err => pageErrors.push(err.message));
	await setupGame(page);
	// re-render so the sidebar picks up $debug
	await navigateTo(page, "Bedroom");

	// The debug widget lives in the sidebar caption
	const overlay = page.locator("#debugOverlay");
	await expect(overlay).toBeAttached();

	// open the overlay
	await page.evaluate(() => (window as any).overlayShowHide("debugOverlay"));
	await expect(overlay).not.toHaveClass(/hidden/);

	// links must have been generated with onclick handlers
	const linkCount = await page.locator("#debugOverlay #debugEventsMain div > a").count();
	expect(linkCount).toBeGreaterThan(10);

	// click a real entry link: "Pass 1 hour" (stays on passage)
	const before = await page.evaluate(() => (window as any).Time.hour);
	await page.locator("#debugOverlay div[name='Pass 1 hour'] > a").click();
	await page.waitForTimeout(100);
	const after = await page.evaluate(() => (window as any).Time.hour);
	expect(after).toBe((before + 1) % 24);
	await assertNoErrors(page);
	expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});
