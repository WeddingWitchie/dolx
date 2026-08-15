import { test, expect } from "@playwright/test";
import { openGame, navigateTo, assertNoErrors, type Page } from "./helpers.js";

async function setupGame(page: Page) {
	await openGame(page);
	await navigateTo(page, "Start2");
	// Start2 is tagged nosave, so the save system refuses to work there.
	await navigateTo(page, "Bedroom");
}

/**
 * Reset every IndexedDB database while leaving localStorage intact. This models an IndexedDB-only
 * failure, not origin eviction: browsers may remove localStorage during origin-wide eviction too.
 */
async function resetAllIndexedDB(page: Page) {
	await page.evaluate(async () => {
		const drop = (name: string) =>
			new Promise<void>(resolve => {
				const request = indexedDB.deleteDatabase(name);
				request.onsuccess = () => resolve();
				request.onerror = () => resolve();
				// A blocked delete completes once the holder closes, so wait rather than give up.
				request.onblocked = () => setTimeout(resolve, 250);
			});
		// idb may still be finishing a transaction, which blocks the delete. Retry until it lands.
		for (let attempt = 0; attempt < 20; attempt++) {
			const names = (await indexedDB.databases()).map(d => d.name).filter((n): n is string => !!n);
			if (names.length === 0) return;
			for (const name of names) await drop(name);
		}
		throw new Error("could not clear IndexedDB for the test");
	});
}

/** Write a save to an idb slot, the same way the saves menu does. */
async function saveToSlot(page: Page, slot: number, name: string) {
	await page.evaluate(
		async ({ s, n }) => {
			const SC = (window as any).SugarCube;
			SC.State.variables.saveName = n;
			await (window as any).idb.saveState(s, "test save", { saveName: n, saveId: SC.State.variables.saveId });
		},
		{ s: slot, n: name }
	);
}

test.describe("Save resilience", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("mirrors the idb save list into localStorage", async ({ page }) => {
		await setupGame(page);
		await saveToSlot(page, 1, "mirror test");

		await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("dolSaveMirror") ?? "null")?.slots?.length ?? 0)).toBe(1);
		const mirror = await page.evaluate(() => JSON.parse(localStorage.getItem("dolSaveMirror") ?? "null"));
		expect(mirror).not.toBeNull();
		expect(mirror.slots).toHaveLength(1);
		expect(mirror.slots[0].slot).toBe(1);
		expect(mirror.slots[0].saveName).toBe("mirror test");
	});

	test("throttles mirror reconciliation on automatic saves", async ({ page }) => {
		await setupGame(page);
		await page.evaluate(() => (window as any).DoLSaveGuard.refresh());
		const before = await page.evaluate(() => JSON.parse(localStorage.getItem("dolSaveMirror") ?? "null").updated);

		await saveToSlot(page, 0, "automatic save");
		await page.waitForTimeout(100);
		const throttled = await page.evaluate(() => JSON.parse(localStorage.getItem("dolSaveMirror") ?? "null"));
		expect(throttled.updated).toBe(before);
		expect(throttled.slots).toHaveLength(0);

		await page.evaluate(() => (window as any).DoLSaveGuard.refresh());
		const refreshed = await page.evaluate(() => JSON.parse(localStorage.getItem("dolSaveMirror") ?? "null"));
		expect(refreshed.slots[0].slot).toBe(0);
	});

	test("reports data loss when IndexedDB is reset while localStorage remains", async ({ page }) => {
		await setupGame(page);
		await saveToSlot(page, 1, "doomed save");
		await page.evaluate(() => (window as any).DoLSaveGuard.refresh());

		await resetAllIndexedDB(page);

		const lost = await page.evaluate(() => (window as any).DoLSaveGuard.refresh());
		expect(lost).toBe(true);

		const report = await page.evaluate(() => (window as any).DoLSaveGuard.getLossReport());
		expect(report.slots).toHaveLength(1);
		expect(report.slots[0].saveName).toBe("doomed save");
	});

	test("does not report loss for a player who has no saves", async ({ page }) => {
		await setupGame(page);

		const lost = await page.evaluate(() => (window as any).DoLSaveGuard.refresh());
		expect(lost).toBe(false);
		expect(await page.evaluate(() => (window as any).DoLSaveGuard.getLossReport())).toBeNull();
	});

	test("does not claim recovery after all origin-side records are cleared", async ({ page }) => {
		await setupGame(page);
		await saveToSlot(page, 1, "origin wipe test");
		await page.evaluate(async () => {
			const guard = (window as any).DoLSaveGuard;
			await guard.refresh();
			guard.lifeboat.write(true);
			localStorage.clear();
		});
		await resetAllIndexedDB(page);

		expect(await page.evaluate(() => (window as any).DoLSaveGuard.refresh())).toBe(false);
		expect(await page.evaluate(() => (window as any).DoLSaveGuard.getLossReport())).toBeNull();
		expect(await page.evaluate(() => (window as any).DoLSaveGuard.lifeboat.info())).toBeNull();
	});

	test("keeps the report visible until it is acknowledged", async ({ page }) => {
		await setupGame(page);
		await saveToSlot(page, 1, "first");
		await page.evaluate(() => (window as any).DoLSaveGuard.refresh());
		await resetAllIndexedDB(page);
		expect(await page.evaluate(() => (window as any).DoLSaveGuard.refresh())).toBe(true);

		// Saving again must not quietly bury the warning before the player has read it.
		await saveToSlot(page, 1, "second");
		await page.evaluate(() => (window as any).DoLSaveGuard.refresh());
		expect(await page.evaluate(() => (window as any).DoLSaveGuard.getLossReport())).not.toBeNull();
	});

	test("does not report loss when the player deletes their own saves", async ({ page }) => {
		await setupGame(page);
		await saveToSlot(page, 1, "unwanted");
		await page.evaluate(() => (window as any).DoLSaveGuard.refresh());

		await page.evaluate(() => (window as any).idb.deleteItem(1));

		expect(await page.evaluate(() => (window as any).DoLSaveGuard.refresh())).toBe(false);
		expect(await page.evaluate(() => (window as any).DoLSaveGuard.getLossReport())).toBeNull();
	});

	test("keeps a restorable backup copy in localStorage", async ({ page }) => {
		await setupGame(page);

		await page.evaluate(() => {
			(window as any).SugarCube.State.variables.money = 123400;
		});
		// Saves marshal committed history, not the uncommitted active moment, so move a passage first.
		await navigateTo(page, "Bedroom");
		expect(await page.evaluate(() => (window as any).DoLSaveGuard.lifeboat.write(true))).toBe(true);

		const info = await page.evaluate(() => (window as any).DoLSaveGuard.lifeboat.info());
		expect(info).not.toBeNull();

		// Move the live game somewhere else, then restore and confirm the backup state came back.
		await page.evaluate(() => {
			(window as any).SugarCube.State.variables.money = 1;
		});
		const restored = await page.evaluate(() => (window as any).DoLSaveGuard.lifeboat.restore());
		expect(restored).toBe(true);
		expect(await page.evaluate(() => (window as any).SugarCube.State.variables.money)).toBe(123400);
	});

	test("keeps and reports the previous backup, then retries on a deliberate save", async ({ page }) => {
		await setupGame(page);
		await page.evaluate(() => {
			(window as any).SugarCube.State.variables.saveName = "safe backup";
		});
		await navigateTo(page, "Bedroom");
		expect(await page.evaluate(() => (window as any).DoLSaveGuard.lifeboat.write(true))).toBe(true);

		await page.evaluate(() => {
			const SC = (window as any).SugarCube;
			const oversized = "x".repeat(1300000);
			SC.State.history.forEach((moment: any) => {
				moment.variables.saveName = "oversized backup";
				moment.variables.saveGuardSizeTest = oversized;
			});
			SC.State.variables.saveName = "oversized backup";
			SC.State.variables.saveGuardSizeTest = oversized;
		});
		expect(await page.evaluate(() => (window as any).DoLSaveGuard.lifeboat.write(true))).toBe(false);

		const info = await page.evaluate(() => (window as any).DoLSaveGuard.lifeboat.info());
		expect(info.saveName).toBe("safe backup");

		await page.evaluate(() => {
			const host = document.createElement("div");
			host.id = "test-saves-overlay";
			document.body.appendChild(host);
			new (window as any).SugarCube.Wikifier(host, "<<saves>>");
		});
		await expect(page.locator("#saveGuardNotice")).toContainText("backup could not be updated");
		await expect(page.locator("#saveGuardNotice")).toContainText("deliberate slot save will retry");

		await page.evaluate(() => {
			const SC = (window as any).SugarCube;
			SC.State.history.forEach((moment: any) => {
				delete moment.variables.saveGuardSizeTest;
				moment.variables.saveName = "recovered backup";
			});
			delete SC.State.variables.saveGuardSizeTest;
			SC.State.variables.saveName = "recovered backup";
		});
		await saveToSlot(page, 2, "recovered backup");
		await expect.poll(() => page.evaluate(() => (window as any).DoLSaveGuard.lifeboat.info().saveName)).toBe("recovered backup");
	});

	test("does not duplicate legacy localStorage saves into a lifeboat", async ({ page }) => {
		await setupGame(page);
		const written = await page.evaluate(() => {
			(window as any).idb.active = false;
			localStorage.removeItem("dolSaveLifeboat");
			return (window as any).DoLSaveGuard.lifeboat.write(true);
		});

		expect(written).toBe(false);
		expect(await page.evaluate(() => localStorage.getItem("dolSaveLifeboat"))).toBeNull();
	});

	test("the saves overlay shows the loss warning and a restore action", async ({ page }) => {
		await setupGame(page);
		await saveToSlot(page, 1, "doomed save");
		await page.evaluate(() => (window as any).DoLSaveGuard.refresh());
		await page.evaluate(() => (window as any).DoLSaveGuard.lifeboat.write(true));
		await resetAllIndexedDB(page);

		// Render the real overlay widget into the live document so its notice container exists.
		await page.evaluate(() => {
			const host = document.createElement("div");
			host.id = "test-saves-overlay";
			document.body.appendChild(host);
			new (window as any).SugarCube.Wikifier(host, "<<saves>>");
		});

		const notice = page.locator("#saveGuardNotice");
		await expect(notice).toContainText("Your saved games were cleared");
		await expect(notice).toContainText("doomed save");
		await expect(notice.locator("input[value='Restore backup copy']")).toBeVisible();
	});

	test("dismissing the warning stops it coming back", async ({ page }) => {
		await setupGame(page);
		await saveToSlot(page, 1, "doomed save");
		await page.evaluate(() => (window as any).DoLSaveGuard.refresh());
		await resetAllIndexedDB(page);
		await page.evaluate(() => (window as any).DoLSaveGuard.refresh());

		await page.evaluate(() => (window as any).DoLSaveGuard.dismissLoss());

		expect(await page.evaluate(() => (window as any).DoLSaveGuard.refresh())).toBe(false);
		expect(await page.evaluate(() => (window as any).DoLSaveGuard.getLossReport())).toBeNull();
	});

	test("the debug storage readout renders while indexedDB is the active backend", async ({ page }) => {
		await setupGame(page);
		await page.evaluate(() => {
			(window as any).SugarCube.State.variables.debug = 1;
			const host = document.createElement("div");
			host.id = "test-saves-overlay";
			document.body.appendChild(host);
			new (window as any).SugarCube.Wikifier(host, "<<saves>>");
		});

		expect(await page.evaluate(() => (window as any).idb.active)).toBe(true);
		await expect(page.locator("#saveGuardDiagnostics")).toContainText("Storage persistent");
	});

	test("the saves overlay warns when persistent storage is denied", async ({ page }) => {
		await page.addInitScript(() => {
			Object.defineProperty(navigator, "storage", {
				configurable: true,
				value: {
					persisted: async () => false,
					persist: () => new Promise(resolve => setTimeout(() => resolve(false), 250)),
					estimate: async () => ({ usage: 0, quota: 1024 }),
				},
			});
		});
		await setupGame(page);
		await page.evaluate(() => {
			(window as any).SugarCube.Wikifier.wikifyEval('<<overlayReplace "saves">>');
		});

		const notice = page.locator("#saveGuardNotice");
		await expect(notice).toContainText("Persistent storage has not been granted");
		await expect(notice).toContainText("browser-side backup together");
		const button = notice.locator("br + input[value='Request persistent storage']");
		await expect(button).toBeVisible();
		await button.click();
		await expect(notice).toContainText("Persistent storage was not granted");
		await expect(notice).toContainText("the game cannot force it");
		await expect(button).toHaveCount(0);
		expect(await page.evaluate(() => JSON.parse(localStorage.getItem("dolStoragePersistence") ?? "null").requested)).toBe(true);
	});

	test("diagnostics report the storage facts needed to triage a report", async ({ page }) => {
		await setupGame(page);
		const data = await page.evaluate(() => (window as any).DoLSaveGuard.diagnostics());

		expect(data.idbAvailable).toBe(true);
		expect(data).toHaveProperty("origin");
		expect(data).toHaveProperty("persistence");
		expect(data).toHaveProperty("detailRows");
	});
});
