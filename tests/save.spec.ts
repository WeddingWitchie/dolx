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
			new (window as any).SugarCube.Wikifier(host, "<<saveBackups>>");
		});
		await expect(page.locator("#saveGuardBackups")).toContainText("backup could not be updated");
		await expect(page.locator("#saveGuardBackups")).toContainText("deliberate slot save will retry");

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

	test("routine storage guidance stays in Backups and the persistence request still works", async ({ page }) => {
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

		const tabs = page.locator("#overlayTabs");
		await expect(tabs.locator("button")).toHaveText(["Saves", "Backups", "Export/Import"]);
		await expect(page.locator("#saveGuardNotice")).toBeEmpty();
		await expect(page.locator("#saves-export-reminder")).toContainText("browser cache is cleared");
		await tabs.getByRole("button", { name: "Backups", exact: true }).click();
		const notice = page.locator("#saveGuardBackups");
		await expect(notice).toContainText("Protected storage is not enabled");
		await expect(notice).toContainText("Export your save to a file");
		const button = notice.locator("br + input[value='Request persistent storage']");
		await expect(button).toBeVisible();
		await button.click();
		await expect(notice).toContainText("Your browser did not allow protected storage");
		await expect(page.locator("#saves-export-reminder")).toHaveCount(0);
		await expect(button).toHaveCount(0);
		expect(await page.evaluate(() => JSON.parse(localStorage.getItem("dolStoragePersistence") ?? "null").requested)).toBe(true);
		await tabs.getByRole("button", { name: "Saves", exact: true }).click();
		await expect(page.locator("#saveGuardBackups")).toHaveCount(0);
		await expect(page.locator("#saveList")).toBeVisible();
		await expect(page.locator("#saveGuardNotice")).toBeEmpty();
		await tabs.getByRole("button", { name: "Backups", exact: true }).click();
		await expect(page.locator("#saveGuardBackups")).toContainText("Your browser did not allow protected storage");
		await tabs.getByRole("button", { name: "Export/Import", exact: true }).click();
		await expect(page.locator("#saveDataInput")).toBeVisible();
		await page.evaluate(() => {
			(window as any).closeOverlay();
			(window as any).SugarCube.Wikifier.wikifyEval('<<overlayReplace "export">>');
		});
		await expect(tabs.locator(".tab-selected")).toHaveText("Export/Import");
	});

	test("APK recovery copies render only in Backups and still restore the selected save", async ({ page }) => {
		await setupGame(page);
		await page.evaluate(() => {
			(window as any).SugarCube.State.variables.money = 654300;
		});
		await navigateTo(page, "Bedroom");
		await page.evaluate(() => {
			const guard = (window as any).DoLSaveGuard;
			guard.lifeboat.write(true);
			const payload = localStorage.getItem("dolSaveLifeboat")!;
			const save = JSON.parse(payload);
			(window as any).backupListCalls = 0;
			(window as any).cordova = {
				plugins: {
					dolSaveBackup: {
						list: async () => {
							(window as any).backupListCalls++;
							return [{ index: 0, date: save.date, saveId: save.saveId, saveName: "APK test", days: save.days }];
						},
						read: async () => payload,
					},
				},
			};
			(window as any).SugarCube.State.variables.money = 1;
			(window as any).SugarCube.Wikifier.wikifyEval('<<overlayReplace "saves">>');
		});
		const tabs = page.locator("#overlayTabs");
		await expect(page.locator("#saveList")).toBeVisible();
		await expect(page.locator("input[value='Restore APK backup']")).toHaveCount(0);
		expect(await page.evaluate(() => (window as any).backupListCalls)).toBe(0);
		await tabs.getByRole("button", { name: "Backups", exact: true }).click();
		await expect(page.locator("#saveGuardBackups")).toContainText("APK test");
		await expect(page.locator("input[value='Restore APK backup']")).toHaveCount(1);
		await tabs.getByRole("button", { name: "Saves", exact: true }).click();
		await tabs.getByRole("button", { name: "Backups", exact: true }).click();
		await expect(page.locator("input[value='Restore APK backup']")).toHaveCount(1);
		page.once("dialog", dialog => dialog.accept());
		await page.locator("input[value='Restore APK backup']").click();
		await expect.poll(() => page.evaluate(() => (window as any).SugarCube.State.variables.money)).toBe(654300);
	});

	test("Ironman does not query or expose APK recovery copies", async ({ page }) => {
		await setupGame(page);
		await page.evaluate(() => {
			(window as any).SugarCube.State.variables.ironmanmode = true;
			(window as any).backupListCalls = 0;
			(window as any).cordova = {
				plugins: {
					dolSaveBackup: {
						list: async () => {
							(window as any).backupListCalls++;
							return [];
						},
					},
				},
			};
			(window as any).SugarCube.Wikifier.wikifyEval('<<overlayReplace "saves">>');
		});
		await page.locator("#overlayTabs").getByText("Backups", { exact: true }).click();
		await page.evaluate(() => (window as any).DoLSaveGuard.renderNotice("saveGuardBackups", true));
		expect(await page.evaluate(() => (window as any).backupListCalls)).toBe(0);
		await expect(page.locator("input[value='Restore APK backup']")).toHaveCount(0);
		expect(await page.evaluate(() => (window as any).SugarCube.State.variables.ironmanmode)).toBe(true);
	});

	test("late APK results cannot populate another tab or duplicate recovery controls", async ({ page }) => {
		await setupGame(page);
		await page.evaluate(() => {
			(window as any).backupResolvers = [];
			(window as any).cordova = {
				plugins: {
					dolSaveBackup: {
						list: () => new Promise(resolve => (window as any).backupResolvers.push(resolve)),
					},
				},
			};
			(window as any).SugarCube.Wikifier.wikifyEval('<<overlayReplace "saves">>');
		});
		const tabs = page.locator("#overlayTabs");
		await tabs.getByText("Backups", { exact: true }).click();
		await expect.poll(() => page.evaluate(() => (window as any).backupResolvers.length)).toBe(1);
		await tabs.getByText("Saves", { exact: true }).click();
		await tabs.getByText("Backups", { exact: true }).click();
		await expect.poll(() => page.evaluate(() => (window as any).backupResolvers.length)).toBe(2);
		await page.evaluate(() => {
			(window as any).backupResolvers[1]([{ index: 0, saveName: "current backup", date: 2 }]);
		});
		await expect(page.locator("#saveGuardBackups")).toContainText("current backup");
		await page.evaluate(() => {
			(window as any).backupResolvers[0]([{ index: 0, saveName: "stale backup", date: 1 }]);
		});
		await expect(page.locator("#saveGuardBackups")).not.toContainText("stale backup");
		await expect(page.locator("input[value='Restore APK backup']")).toHaveCount(1);
		await tabs.getByText("Saves", { exact: true }).click();
		await expect(page.locator("#saveGuardBackups")).toHaveCount(0);
		await expect(page.locator("#saveGuardNotice")).toBeEmpty();
	});

	test("diagnostics report the storage facts needed to triage a report", async ({ page }) => {
		await setupGame(page);
		const data = await page.evaluate(() => (window as any).DoLSaveGuard.diagnostics());

		expect(data.idbAvailable).toBe(true);
		expect(data).toHaveProperty("origin");
		expect(data).toHaveProperty("persistence");
		expect(data).toHaveProperty("detailRows");
	});

	test("does not replace the local reset token when its database write aborts", async ({ page }) => {
		await setupGame(page);
		const result = await page.evaluate(async () => {
			const guard = (window as any).DoLSaveGuard;
			await guard.refresh();
			const before = localStorage.getItem("dolStorageToken");
			await new Promise<void>((resolve, reject) => {
				const request = indexedDB.deleteDatabase("dolSaveGuard");
				request.onsuccess = () => resolve();
				request.onerror = () => reject(request.error);
			});
			const original = IDBObjectStore.prototype.put;
			IDBObjectStore.prototype.put = function (...args: Parameters<typeof original>) {
				const request = original.apply(this, args);
				if (this.transaction.db.name === "dolSaveGuard") {
					request.addEventListener("success", () => this.transaction.abort());
				}
				return request;
			};
			try {
				await guard.refresh();
				return { before, after: localStorage.getItem("dolStorageToken"), diagnostics: await guard.diagnostics() };
			} finally {
				IDBObjectStore.prototype.put = original;
			}
		});
		expect(result.after).toBe(result.before);
		expect(result.diagnostics.storageError).toContain("Checking database reset");
	});
});

test.describe("Save compression dictionaries", () => {
	// Saves labelled "v3" exist in two layouts: vanilla's, and the shifted one this build wrote from 2026-07-22 (now "v3b").
	for (const written of ["v3", "v3b"]) {
		test(`a "v3" save written with the ${written} layout loads back unchanged`, async ({ page }) => {
			await setupGame(page);
			const result = await page.evaluate(w => {
				const win = window as any;
				const SC = win.SugarCube;
				const state = JSON.parse(JSON.stringify({ title: SC.State.passage, variables: SC.State.variables }));
				const zstate = new win.JsonCompressor(win.DoLCompressorDictionaries[w]).compress(state);
				zstate.dictionary = "v3";
				zstate.variables = {};
				const saveObj = { metadata: { jsoncompressed: 1 }, state: { history: [zstate] } };
				win.DoLSave.decompressIfNeeded(saveObj);
				return { same: JSON.stringify(saveObj.state.history[0]) === JSON.stringify(state), hasWorn: "worn" in saveObj.state.history[0].variables };
			}, written);
			expect(result.hasWorn).toBe(true);
			expect(result.same).toBe(true);
		});
	}

	test("new saves are compressed with vanilla's v3 list", async ({ page }) => {
		await setupGame(page);
		const dicts = await page.evaluate(() => {
			const d = (window as any).DoLCompressorDictionaries;
			return { v3HasInsert: d.v3.includes("transgenderknown"), v3bExtra: d.v3b.length - d.v3.length };
		});
		expect(dicts.v3HasInsert).toBe(false);
		expect(dicts.v3bExtra).toBe(1);
	});
});
