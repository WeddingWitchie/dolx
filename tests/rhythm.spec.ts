import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import { pathToFileURL } from "url";
import { openGame, navigateTo, assertNoErrors } from "./helpers.js";

const dir = "game/special-xchange/DoLXAddition/console/rhythm";
async function modules(page: Page, memory = false) {
	await page.goto(pathToFileURL(path.resolve("tests") + path.sep).href);
	await page.evaluate(memoryOnly => {
		const w = window as any;
		w.setup = {};
		w.updateMoment = () => {};
		w.V = { options: { audio: 1, mastervolume: 1 } };
		w.formatMoney = (n: number) => `£${n / 100}`;
		w.statChange = { money: (n: number) => (w.V.money = (w.V.money || 0) + n) };
		w.earnFeat = (name: string) => {
			if (!w.V.feats.locked) w.V.feats.currentSave[name] = true;
		};
		w.$ = () => ({ on() {} });
		w.Utils = { Defer: (fn: Function, ...args: any[]) => fn(...args) };
		if (memoryOnly) Object.defineProperty(window, "indexedDB", { value: undefined });
		document.body.innerHTML = '<div id="rhythm" class="rhythm"></div>';
	}, memory);
	for (const name of ["rhythm-analysis", "rhythm-builtins", "rhythm-library", "rhythm", "rhythm-ui", "rhythm-editor", "rhythm-tutorial"]) {
		await page.addScriptTag({ path: path.resolve(`${dir}/${name}.js`) });
	}
	await page.addScriptTag({ path: path.resolve("game/special-xchange/DoLXAddition/console/console-daily.js") });
	await page.addStyleTag({ path: path.resolve("modules/css/xchange/rhythm.css") });
}

test.describe("Rhythm contracts", () => {
	test.beforeEach(async ({ page }) => modules(page));
	test("all built-in assets and charts agree with their timing and difficulty", async ({ page }) => {
		const songs = await page.evaluate(() => {
			const { rhythmBuiltins: builtins, rhythmLibrary: L } = (window as any).setup;
			return builtins.map((b: any) => ({
				path: b.path,
				charts: L.levelNames.map((level: string) => {
					const s = L.builtinSong(b);
					const notes = L.chartFor(s, level).notes;
					return {
						count: notes.length,
						stable: JSON.stringify(notes) === JSON.stringify(L.chartFor(s, level).notes),
						valid: notes.every(
							(n: any, i: number) => n.t >= 0 && n.t + (n.d || 0) <= s.duration * 1000 && n.x >= 0 && n.x <= 1 && (!i || n.t >= notes[i - 1].t)
						),
					};
				}),
			}));
		});
		const fs = await import("fs");
		for (const song of songs) {
			expect(fs.existsSync(path.resolve(song.path)), song.path).toBe(true);
			for (const chart of song.charts) {
				expect(chart.count).toBeGreaterThan(0);
				expect(chart.stable && chart.valid).toBe(true);
			}
		}
	});

	test("tap, simultaneous mouse notes, holds, drags and final accounting", async ({ page }) => {
		const result = await page.evaluate(() => {
			const w = window as any,
				R = w.setup.rhythm;
			const canvas = document.createElement("canvas");
			document.body.append(canvas);
			const notes = [
				{ t: 1000, x: 0.2, type: "tap" },
				{ t: 1000, x: 0.8, type: "tap" },
				{ t: 2000, x: 0.5, type: "hold", d: 1000 },
				{ t: 3500, x: 0.5, type: "drag" },
			];
			let result: any,
				t = 1;
			const p = new R.Play({
				canvas,
				song: { bpm: 120, offset: 0, pageBeats: 4 },
				notes,
				level: "normal",
				audio: { currentTime: 0 },
				offsetMs: 0,
				onHud() {},
				onEnd(r: any) {
					result = r;
				},
			});
			p.time = () => t;
			const pos = p.field.pos(notes[0]);
			p.press(1, { sx: pos.x, sy: pos.y, mouse: true });
			t = 2;
			p.press("hold", { lane: 3 });
			t = 3;
			p.release("hold");
			t = 3.5;
			p.keysDown.set("drag", 3);
			p.update(t);
			p.finish();
			return result;
		});
		expect(result).toMatchObject({ score: 1000000, acc: 100, perfect: 4, miss: 0, fc: true, ap: true, maxCombo: 4 });
	});

	test("early presses and pause cannot manufacture a full hold", async ({ page }) => {
		const result = await page.evaluate(() => {
			const R = (window as any).setup.rhythm,
				canvas = document.createElement("canvas");
			document.body.append(canvas);
			let t = 0.86;
			const notes = [
				{ t: 1000, x: 0.2, type: "tap" },
				{ t: 2000, x: 0.5, type: "hold", d: 1000 },
			];
			const p = new R.Play({ canvas, song: { bpm: 120, offset: 0, pageBeats: 4 }, notes, level: "normal", audio: {}, onHud() {}, onEnd() {} });
			p.time = () => t;
			p.press("early", { lane: 1 });
			t = 2;
			p.press("hold", { lane: 3 });
			p.settleInputs();
			return { perfect: p.stats.perfect, miss: p.stats.miss, holding: p.state.get(notes[1]).holding };
		});
		expect(result).toEqual({ perfect: 0, miss: 2, holding: false });
	});

	test("short audio completes with misses for notes beyond its end", async ({ page }) => {
		const result = await page.evaluate(() => {
			const R = (window as any).setup.rhythm,
				canvas = document.createElement("canvas");
			document.body.append(canvas);
			let result: any;
			const p = new R.Play({
				canvas,
				song: { bpm: 120, offset: 0, pageBeats: 4 },
				notes: [{ t: 20000, x: 0.5, type: "tap" }],
				level: "normal",
				audio: { currentTime: 10, ended: true, paused: true },
				offsetMs: 0,
				onHud() {},
				onEnd(r: any) {
					result = r;
				},
			});
			p.start();
			return { running: p.running, result };
		});
		expect(result.running).toBe(false);
		expect(result.result.miss).toBe(1);
	});

	test("clock freezes on a stall or pause and follows seeks", async ({ page }) => {
		const times = await page.evaluate(() => {
			const R = (window as any).setup.rhythm;
			const a = { currentTime: 5, paused: false, readyState: 4 },
				c = new R.Clock(a);
			const first = c.now();
			a.readyState = 2;
			const stalled = c.now();
			a.currentTime = 1;
			a.paused = true;
			const seek = c.now();
			return [first, stalled, seek];
		});
		expect(times).toEqual([5, 5, 1]);
	});

	test("daily reward pays once, custom charts cannot advance challenges, and feat obeys native lock", async ({ page }) => {
		const result = await page.evaluate(() => {
			const w = window as any,
				R = w.setup.rhythm,
				c = R.daily();
			w.V.feats = { currentSave: {}, locked: true };
			const r = { songId: c.songId, level: c.level, score: 1000000, acc: 100, grade: "S", fc: true, ap: true, perfect: 500, maxCombo: 500, cleared: true };
			const custom = R.record({ ...r, custom: true }, false);
			R.record({ ...r, songId: "builtin:untrusted", perfect: 9999 }, true);
			const before = JSON.stringify(R.data().stats);
			const first = R.record(r, true),
				second = R.record(r, true);
			for (const ch of R.challenges) R.data().challenges[ch.id] = c.date;
			const locked = R.record(r, true).feat;
			w.V.feats.locked = false;
			const earned = R.record(r, true).feat;
			return { customPaid: custom.paid, before, first: first.paid, second: second.paid, money: w.V.money, expected: c.reward, locked, earned };
		});
		expect(result.customPaid).toBe(0);
		expect(JSON.parse(result.before).clears).toBe(0);
		expect(result.first).toBe(result.expected);
		expect(result.second).toBe(0);
		expect(result.money).toBe(result.expected);
		expect(result.locked).toBe(false);
		expect(result.earned).toBe(true);
	});

	test("JSON roundtrip preserves playlist repetitions and resolves repeated long names", async ({ page }) => {
		const result = await page.evaluate(async () => {
			const { rhythmLibrary: L, rhythmBuiltins: bs } = (window as any).setup;
			const list = { id: "p-test", name: "x".repeat(80), songs: [bs[0].id, bs[0].id] };
			await L.savePlaylist(list);
			const raw = JSON.stringify(await L.exportData("playlist", { playlistId: list.id }));
			for (let i = 0; i < 4; i++) await L.merge(L.parse(raw));
			const lists = await L.listPlaylists();
			let rejected = false;
			try {
				L.parse('{"format":"dol-rhythm","version":1,"kind":"song","songs":[{"bpm":"120"}]}');
			} catch {
				rejected = true;
			}
			return { count: lists.length, unique: new Set(lists.map((p: any) => p.name)).size, repeated: lists.every((p: any) => p.songs.length === 2), rejected };
		});
		expect(result).toEqual({ count: 5, unique: 5, repeated: true, rejected: true });
	});

	test("library audio and chart copies survive reopen without entering save state", async ({ page }) => {
		await page.evaluate(async () => {
			const w = window as any,
				L = w.setup.rhythmLibrary,
				song = L.builtinSong(w.setup.rhythmBuiltins[0]);
			song.id = "s-test";
			song.charts.normal = { notes: [{ t: 1000, x: 0.5, type: "tap" }], edited: true };
			await L.saveSong(song, new Blob(["test-audio"]));
		});
		await modules(page);
		const result = await page.evaluate(async () => {
			const w = window as any,
				L = w.setup.rhythmLibrary,
				song = await L.getSong("s-test");
			return {
				notes: L.chartFor(song, "normal").notes.length,
				audio: await (await L.getAudio(song.id)).text(),
				saved: JSON.stringify(w.V).includes("test-audio"),
			};
		});
		expect(result).toEqual({ notes: 1, audio: "test-audio", saved: false });
	});

	test("stale editor and source requests cannot replace a newer screen or allocate URLs after exit", async ({ page }) => {
		const result = await page.evaluate(async () => {
			const w = window as any,
				ui = w.setup.rhythmUI.open() || w.setup.rhythmUI.current;
			await ui.menu("settings");
			const pending = w.setup.rhythmEditor.open(ui, w.setup.rhythmBuiltins[0].id);
			await ui.menu("challenges");
			await pending;
			const editor = !!document.querySelector(".rh-editor");
			await w.setup.rhythmLibrary.saveSong({ id: "s-url" }, new Blob(["audio"]));
			const source = ui.audioSource({ id: "s-url" });
			ui.destroy();
			await source;
			return { editor, url: ui.objectURL, root: ui.root, timers: ui.timers.size, listeners: ui.listeners.length };
		});
		expect(result).toEqual({ editor: false, url: null, root: null, timers: 0, listeners: 0 });
	});

	test("key rebinding swaps lanes and is removed when leaving settings", async ({ page }) => {
		await page.evaluate(() => (window as any).setup.rhythmUI.open());
		await page.getByRole("button", { name: "Settings", exact: true }).click();
		await page.getByRole("button", { name: "Lane 1:" }).click();
		await page.keyboard.press("KeyL");
		expect(await page.evaluate(() => (window as any).setup.rhythm.settings().keys)).toEqual(["KeyL", "KeyS", "KeyD", "KeyJ", "KeyK", "KeyA"]);
		await page.getByRole("button", { name: "Lane 2:" }).click();
		await page.getByRole("button", { name: "Challenges", exact: true }).click();
		await page.keyboard.press("KeyQ");
		expect(await page.evaluate(() => (window as any).setup.rhythm.settings().keys[1])).toBe("KeyS");
	});

	test("desktop and mobile menu screens fit and reduced effects update immediately", async ({ page }) => {
		await page.evaluate(() => (window as any).setup.rhythmUI.open());
		for (const width of [1280, 390, 320]) {
			await page.setViewportSize({ width, height: 800 });
			for (const tab of ["Play", "Challenges", "Library", "Playlists", "Settings"]) {
				await page.getByRole("button", { name: tab, exact: true }).click();
				expect(
					await page.evaluate(() => {
						const el = document.getElementById("rhythm")!;
						return el.scrollWidth - el.clientWidth;
					}),
					`${width} ${tab}`
				).toBeLessThanOrEqual(2);
			}
		}
		await page.getByLabel("Fewer effects:", { exact: false }).check();
		await expect(page.locator("#rhythm")).toHaveClass(/rh-calm/);
		await page.screenshot({ path: "test-results/rhythm-mobile-settings.png" });
	});
});

test("IndexedDB unavailable keeps a disclosed session-only library", async ({ page }) => {
	await modules(page, true);
	const result = await page.evaluate(async () => {
		const L = (window as any).setup.rhythmLibrary;
		await L.open();
		await L.savePlaylist({ id: "p", name: "Session", songs: [] });
		return { persistent: L.persistent, count: (await L.listPlaylists()).length };
	});
	expect(result).toEqual({ persistent: false, count: 1 });
});

test("failed audio replacement leaves the previous metadata and audio together", async ({ page }) => {
	await modules(page);
	const result = await page.evaluate(async () => {
		const L = (window as any).setup.rhythmLibrary,
			song = L.builtinSong((window as any).setup.rhythmBuiltins[0]);
		song.id = "s-atomic";
		await L.saveSong(song, new Blob(["old"]));
		const put = IDBObjectStore.prototype.put;
		let rejected = false;
		IDBObjectStore.prototype.put = function (...args: any[]) {
			if (this.name === "audio") throw new DOMException("Storage full", "QuotaExceededError");
			return put.apply(this, args as any);
		};
		try {
			await L.saveSong({ ...song, title: "New title" }, new Blob(["new"]));
		} catch {
			rejected = true;
		} finally {
			IDBObjectStore.prototype.put = put;
		}
		return { rejected, title: (await L.getSong(song.id)).title, audio: await (await L.getAudio(song.id)).text(), expected: song.title };
	});
	expect(result.rejected).toBe(true);
	expect(result.title).toBe(result.expected);
	expect(result.audio).toBe("old");
});

test("uploaded WAV is decoded, charted, edited and shared without its audio", async ({ page }) => {
	await modules(page);
	const rate = 22050,
		samples = rate * 16,
		wav = Buffer.alloc(44 + samples * 2);
	wav.write("RIFF", 0);
	wav.writeUInt32LE(wav.length - 8, 4);
	wav.write("WAVEfmt ", 8);
	wav.writeUInt32LE(16, 16);
	wav.writeUInt16LE(1, 20);
	wav.writeUInt16LE(1, 22);
	wav.writeUInt32LE(rate, 24);
	wav.writeUInt32LE(rate * 2, 28);
	wav.writeUInt16LE(2, 32);
	wav.writeUInt16LE(16, 34);
	wav.write("data", 36);
	wav.writeUInt32LE(samples * 2, 40);
	for (let i = 0; i < samples; i++) {
		const beatSample = i % (rate / 2);
		wav.writeInt16LE(Math.round(16000 * Math.exp(-beatSample / 300) * Math.sin((beatSample * Math.PI * 2 * 880) / rate)), 44 + i * 2);
	}
	await page.evaluate(() => (window as any).setup.rhythmUI.open());
	await page.getByRole("button", { name: "Library", exact: true }).click();
	await page.getByLabel("Music file to add", { exact: true }).setInputFiles({ name: "Audit - Click track.wav", mimeType: "audio/wav", buffer: wav });
	await expect(page.locator(".rh-song-title", { hasText: "Click track" })).toBeVisible({ timeout: 20000 });
	await page.getByRole("button", { name: "Edit chart", exact: true }).click();
	await expect(page.locator(".rh-editor")).toBeVisible();
	await page.getByRole("button", { name: "Next page", exact: true }).click();
	await page.locator(".rh-canvas").click({ position: { x: 35, y: 50 } });
	await page.getByRole("button", { name: "Save", exact: true }).click();
	await expect(page.locator(".rh-progress-text")).toHaveText("Saved.");
	const result = await page.evaluate(async () => {
		const w = window as any,
			L = w.setup.rhythmLibrary,
			song = (await L.listSongs())[0];
		const exported = await L.exportData("song", { songIds: [song.id] });
		const parsed = L.parse(JSON.stringify(exported));
		return {
			bpm: song.bpm,
			counts: L.levelNames.map((l: string) => L.chartFor(song, l).notes.length),
			edited: parsed.songs[0].charts.normal.edited,
			audio: (await L.getAudio(song.id)).size,
			shared: exported.songs[0].audio.name,
			noBytes: !JSON.stringify(exported).includes("data:audio"),
		};
	});
	expect(result.bpm).toBeGreaterThan(110);
	expect(result.bpm).toBeLessThan(130);
	for (const count of result.counts) expect(count).toBeGreaterThan(0);
	expect(result.edited && result.noBytes).toBe(true);
	expect(result.audio).toBe(wav.length);
	expect(result.shared).toBe("Audit - Click track.wav");
});

test("compiled offline passage repeatedly opens and leaves without errors or live resources", async ({ page }) => {
	const errors: string[] = [];
	page.on("pageerror", e => errors.push(e.message));
	await openGame(page);
	await navigateTo(page, "Start2");
	await navigateTo(page, "Bedroom");
	for (let i = 0; i < 3; i++) {
		await navigateTo(page, "Home Console Rhythm");
		await expect(page.locator(".rh-pick")).toHaveCount(8);
		await page.getByRole("button", { name: "Settings", exact: true }).click();
		await page.getByRole("button", { name: "Lane 1:" }).click();
		await page.getByRole("link", { name: /Back to the console/ }).click();
		await expect(page.locator("#rhythm")).toHaveCount(0);
		await assertNoErrors(page);
	}
	expect(errors).toEqual([]);
});

test("compiled playback, previews, editor, tutorial and save restoration share one audio owner", async ({ page }) => {
	const errors: string[] = [];
	page.on("pageerror", e => errors.push(e.message));
	await openGame(page);
	await navigateTo(page, "Start2");
	await navigateTo(page, "Bedroom");
	await page.evaluate(() => {
		const sc = (window as any).SugarCube;
		sc.State.variables.options.audio = 1;
		sc.State.variables.options.mastervolume = 0.2;
	});
	await navigateTo(page, "Home Console Rhythm");
	await expect(page.locator(".rh-pick")).toHaveCount(8);
	await page.locator(".rh-pick").nth(1).click();
	await page.waitForFunction(() => {
		const audio = (window as any).SugarCube.setup.rhythmUI.current.audio;
		return !audio.paused && audio.getAttribute("src").includes("Flashback");
	});
	const preview = await page.evaluate(() => {
		const sc = (window as any).SugarCube,
			ui = sc.setup.rhythmUI.current;
		return { id: ui.previewId, src: ui.audio.getAttribute("src"), t: ui.audio.currentTime };
	});
	for (const tab of ["Challenges", "Library", "Playlists", "Settings", "Play"]) await page.getByRole("button", { name: tab, exact: true }).click();
	expect(await page.evaluate(() => (window as any).SugarCube.setup.rhythmUI.current.audio.getAttribute("src"))).toBe(preview.src);
	await page.screenshot({ path: "test-results/rhythm-desktop-play.png", fullPage: true });
	await page.locator(".rh-play").click();
	await expect(page.locator(".rh-overlay")).toBeHidden({ timeout: 15000 });
	await page.waitForFunction(() => (window as any).SugarCube.setup.rhythmUI.current.audio.currentTime > 0.2);
	await page.keyboard.press("KeyP");
	await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Restart", exact: true }).click();
	await expect(page.locator(".rh-overlay")).toBeHidden();
	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: "Quit to the song list" }).click();
	await page.getByRole("button", { name: "Library", exact: true }).click();
	await page.getByRole("button", { name: "Open in the chart editor" }).click();
	await expect(page.locator(".rh-editor")).toBeVisible();
	await page.getByRole("button", { name: "Play this page", exact: true }).click();
	await page.waitForFunction(() => !(window as any).SugarCube.setup.rhythmUI.current.audio.paused);
	await page.getByRole("button", { name: "Back to the library", exact: true }).click();
	await page.getByRole("button", { name: "Play", exact: true }).click();
	await page.getByRole("button", { name: "Tutorial", exact: true }).click();
	await page.getByRole("button", { name: "Keyboard", exact: true }).click();
	await page.getByRole("button", { name: "Watch the line", exact: true }).click();
	await page.waitForFunction(() => !(window as any).SugarCube.setup.rhythmUI.current.audio.paused);
	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: "Skip the tutorial" }).click();
	await page.evaluate(async () => {
		const w = window as any,
			sc = w.SugarCube;
		const R = sc.setup.rhythm,
			c = R.daily();
		R.record({ songId: c.songId, level: c.level, score: 1000000, acc: 100, grade: "S", fc: true, ap: true, perfect: 500, maxCombo: 500, cleared: true }, true);
		sc.setup.rhythm.setSetting("offset", 85);
		await w.idb.saveState(7, "rhythm audit", { saveName: "Rhythm audit", saveId: sc.State.variables.saveId });
		sc.setup.rhythm.setSetting("offset", 0);
		await w.idb.loadState(7);
	});
	await expect(page.locator(".rh-pick")).toHaveCount(8);
	expect(await page.evaluate(() => (window as any).SugarCube.setup.rhythm.settings().offset)).toBe(85);
	const reward = await page.evaluate(() => {
		const sc = (window as any).SugarCube,
			R = sc.setup.rhythm,
			c = R.daily();
		return { paid: R.data().daily[c.date].paid, expected: c.reward, best: R.data().best[`${c.songId}|${c.level}`].score };
	});
	expect(reward.paid).toBe(reward.expected);
	expect(reward.best).toBe(1000000);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.evaluate(() => (window as any).SugarCube.UIBar.stow());
	await expect.poll(() => page.locator("#rhythm").evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(2);
	await page.screenshot({ path: "test-results/rhythm-mobile-play.png", fullPage: true });
	await assertNoErrors(page);
	expect(errors).toEqual([]);
});

test("touch pointers hit pairs separately and playfield gestures leave sidebar alone", async ({ page }) => {
	await modules(page);
	await page.addScriptTag({ path: path.resolve("game/03-JavaScript/ui-sidebar-swipe.js") });
	const result = await page.evaluate(() => {
		const w = window as any,
			R = w.setup.rhythm;
		let sidebar = 0;
		w.UIBar = {
			stow() {
				sidebar++;
			},
			unstow() {
				sidebar++;
			},
		};
		const canvas = document.createElement("canvas"),
			field = document.createElement("div");
		field.dataset.gestureOwner = "rhythm";
		field.append(canvas);
		document.body.append(field);
		const notes = [
			{ t: 1000, x: 0.2, type: "tap" },
			{ t: 1000, x: 0.8, type: "tap" },
		];
		const p = new R.Play({ canvas, song: { bpm: 120, offset: 0, pageBeats: 4 }, notes, level: "normal", audio: {}, onHud() {}, onEnd() {} });
		p.time = () => 1;
		w.setup.rhythmUI.bindInput(canvas, field, () => p);
		for (const [i, n] of notes.entries()) {
			const pos = p.field.pos(n),
				rect = canvas.getBoundingClientRect();
			canvas.dispatchEvent(
				new PointerEvent("pointerdown", { pointerId: i + 1, pointerType: "touch", clientX: rect.left + pos.x, clientY: rect.top + pos.y, bubbles: true })
			);
		}
		for (const [type, x] of [
			["touchstart", 20],
			["touchmove", 180],
		] as const) {
			const event = new Event(type, { bubbles: true });
			Object.defineProperty(event, "touches", { value: [{ clientX: x, clientY: 50 }] });
			canvas.dispatchEvent(event);
		}
		return { hits: p.stats.perfect, pointers: p.pointers.size, sidebar };
	});
	expect(result).toEqual({ hits: 2, pointers: 2, sidebar: 0 });
});
