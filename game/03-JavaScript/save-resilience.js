/**
 * Save resilience layer.
 *
 * IndexedDB is "best-effort" storage. Browsers may reclaim an origin's data when the device is under
 * storage pressure, and they do it without warning the page.
 * `idb` only opens a connection for the length of one operation, so there is no live connection for
 * its `onclose`/`onerror` handlers to fire on. The next `indexedDB.open` simply finds no database,
 * creates an empty one, and the save list renders blank. A wiped player and a brand new player look
 * identical to the game.
 *
 * This module makes the difference visible and gives the player something to recover from:
 *
 *   1. A small mirror of the save list is kept in localStorage. If the IndexedDB databases are reset
 *      while localStorage remains, the game can explain what disappeared instead of showing an empty
 *      list with no context.
 *   2. A "lifeboat" copy of a recent save is kept there as well, so an IndexedDB-only failure
 *      may still be recoverable.
 *   3. Persistent-storage status is reported, and the player can request it from the saves menu.
 *
 * localStorage is not outside the browser's origin storage. Origin-wide eviction or clearing site data
 * can remove the saves, mirror, and lifeboat together. Exporting to a file remains the only independent
 * copy, and the UI says so rather than promising that the browser-side backup survives eviction.
 */
const DoLSaveGuard = (() => {
	"use strict";

	const MIRROR_KEY = "dolSaveMirror";
	const LIFEBOAT_KEY = "dolSaveLifeboat";
	const LOSS_KEY = "dolSaveLossReport";
	const PERSIST_KEY = "dolStoragePersistence";
	const TOKEN_KEY = "dolStorageToken";

	/* A database of our own, holding one value. It distinguishes an IndexedDB-wide reset from the
	   player deleting saves normally, provided localStorage was not reset at the same time. */
	const TOKEN_DB = "dolSaveGuard";
	const TOKEN_STORE = "meta";

	/* localStorage also holds feats and the legacy save system. A lifeboat past this size is skipped
	   rather than risk crowding them out - the mirror and the warning still work without it. */
	const LIFEBOAT_MAX_CHARS = 1200000;
	/* Minimum real time between automatic lifeboat writes and mirror reconciliation. Serialising the
	   history and opening two IndexedDB databases are not free on old phones. */
	const SAVE_GUARD_INTERVAL_MS = 10 * 60 * 1000;

	let lifeboatBlocked = false;
	let lastLifeboatWrite = 0;
	let lastRefresh = 0;
	let persistState = { supported: false, persisted: null, checked: false, requested: false };

	/**
	 * @param {string} key
	 * @returns {object|null}
	 */
	function readJSON(key) {
		try {
			const raw = localStorage.getItem(key);
			return raw == null ? null : JSON.parse(raw);
		} catch (ex) {
			return null;
		}
	}

	/**
	 * @param {string} key
	 * @param {object} value
	 * @returns {boolean} false if the write failed, usually because localStorage is full
	 */
	function writeJSON(key, value) {
		try {
			localStorage.setItem(key, JSON.stringify(value));
			return true;
		} catch (ex) {
			return false;
		}
	}

	function removeKey(key) {
		try {
			localStorage.removeItem(key);
		} catch (ex) {
			/* nothing useful to do, the key is unreadable either way */
		}
	}

	/**
	 * The APK is a Cordova WebView, not a browser tab. Storage behaves the same way, but none of the
	 * advice about bookmarks or home screens applies there, so the wording has to differ.
	 *
	 * @returns {boolean}
	 */
	function isApp() {
		return typeof window.cordova !== "undefined" && window.cordova != null;
	}

	function idbInUse() {
		return typeof idb !== "undefined" && idb != null && idb.active === true && !V.ironmanmode;
	}

	/* mirror */

	/**
	 * Reduce an idb details row to the few fields the mirror needs. Keeping this small matters because
	 * the mirror is rewritten after each local save.
	 *
	 * @param {object} row a row from idb.getSaveDetails()
	 * @returns {object}
	 */
	function summarise(row) {
		const data = row.data ?? {};
		const metadata = data.metadata ?? {};
		return {
			slot: row.slot,
			title: data.title ?? "",
			date: data.date ?? 0,
			saveName: metadata.saveName ?? "",
		};
	}

	/**
	 * @returns {object|null} {updated, slots: []} or null when nothing has been mirrored yet
	 */
	function getMirror() {
		const mirror = readJSON(MIRROR_KEY);
		if (mirror == null || !Array.isArray(mirror.slots)) return null;
		return mirror;
	}

	/**
	 * @param {Array} details rows from idb.getSaveDetails()
	 */
	function writeMirror(details) {
		writeJSON(MIRROR_KEY, {
			updated: Date.now(),
			slots: details.map(summarise),
		});
	}

	/* loss report */

	/**
	 * @returns {object|null} the pending loss report, or null when there is nothing to report
	 */
	function getLossReport() {
		const report = readJSON(LOSS_KEY);
		if (report == null || !Array.isArray(report.slots) || report.slots.length === 0) return null;
		return report;
	}

	/**
	 * Called when the player acknowledges the warning. The report is kept until then rather than
	 * cleared by the next healthy read, a warning that disappears before it is read is no warning.
	 */
	function dismissLoss() {
		removeKey(LOSS_KEY);
	}

	/* clearance token */

	/**
	 * @returns {Promise<IDBDatabase>}
	 */
	function openTokenDB() {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(TOKEN_DB, 1);
			request.onupgradeneeded = () => request.result.createObjectStore(TOKEN_STORE, { keyPath: "key" });
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
			request.onblocked = () => reject(new Error("blocked"));
		});
	}

	/**
	 * @param {IDBDatabase} db
	 * @param {string} mode
	 * @param {Function} run receives the object store, returns the request to await
	 * @returns {Promise<any>}
	 */
	function tokenTransaction(db, mode, run) {
		return new Promise((resolve, reject) => {
			const request = run(db.transaction(TOKEN_STORE, mode).objectStore(TOKEN_STORE));
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}

	function newToken() {
		return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
	}

	/**
	 * Decide whether the browser has cleared IndexedDB since the last time the game ran.
	 *
	 * Counting saves cannot answer this. A player who deletes their own saves and a browser that
	 * evicts the database both leave an empty save list. So the check does not look at saves at all:
	 * it keeps a token in a database of its own and a copy in localStorage. A token in localStorage
	 * with no matching token in IndexedDB means the IndexedDB databases were reset while localStorage
	 * remained. Origin-wide browser eviction cannot be detected this way because it removes both.
	 *
	 * @returns {Promise<"ok"|"fresh"|"cleared"|"unknown">}
	 */
	async function checkClearance() {
		if (typeof indexedDB === "undefined" || indexedDB == null) return "unknown";
		let db;
		try {
			db = await openTokenDB();
			const row = await tokenTransaction(db, "readonly", store => store.get("token"));
			const stored = row?.value ?? null;
			const local = localStorage.getItem(TOKEN_KEY);

			if (stored != null) {
				/* IndexedDB is intact. Keep localStorage in step with it, including the case where
				   localStorage was the side that got cleared. */
				if (stored !== local) localStorage.setItem(TOKEN_KEY, stored);
				return "ok";
			}

			/* No token in IndexedDB. Plant one either way, so a single event is reported once. */
			const token = newToken();
			await tokenTransaction(db, "readwrite", store => store.put({ key: "token", value: token }));
			localStorage.setItem(TOKEN_KEY, token);
			return local == null ? "fresh" : "cleared";
		} catch (ex) {
			return "unknown";
		} finally {
			if (db != null) db.close();
		}
	}

	/**
	 * Reconcile storage against the mirror, and record a loss report if the browser cleared
	 * IndexedDB while the mirror held saves.
	 *
	 * @param {boolean} force bypass the automatic-save throttle
	 * @returns {Promise<boolean>} true when there is a loss warning outstanding
	 */
	async function refresh(force = true) {
		if (!force && Date.now() - lastRefresh < SAVE_GUARD_INTERVAL_MS) return getLossReport() != null;
		lastRefresh = Date.now();
		const clearance = await checkClearance();
		if (!idbInUse()) return false;

		let details;
		try {
			details = await idb.getSaveDetails();
			if (!Array.isArray(details)) return false;
		} catch (ex) {
			/* A read that throws is a different failure from a read that returns nothing, and we
			   cannot tell an evicted database from a broken one here. Say nothing rather than guess. */
			return false;
		}

		const mirror = getMirror();
		if (clearance !== "cleared") {
			writeMirror(details);
			return getLossReport() != null;
		}

		/* IndexedDB was reset. Report whatever the mirror says is no longer here. idb may re-import
		   legacy localStorage saves, so the list is not always empty. */
		const present = new Set(details.map(row => row.slot));
		const missing = (mirror?.slots ?? []).filter(slot => !present.has(slot.slot));
		if (missing.length === 0) {
			writeMirror(details);
			return false;
		}
		const recorded = writeJSON(LOSS_KEY, {
			lastSeen: mirror.updated,
			slots: missing,
		});
		if (recorded) writeMirror(details);
		return recorded;
	}

	/* lifeboat */

	/**
	 * Build a save payload in the same shape idb stores, so restoring can reuse the normal load path.
	 *
	 * @returns {object|null}
	 */
	function buildPayload() {
		const state = State.marshalForSave();
		if (state == null || !Array.isArray(state.history)) return null;
		/* Delta encoding is what keeps a five-state history small enough to sit in localStorage. */
		const delta = State.deltaEncode(state.history);
		return {
			version: 1,
			date: Date.now(),
			id: Story.domId,
			idx: State.qc,
			index: state.index,
			seed: state.seed,
			expired: state.expired,
			delta,
			title: Story.get(State.passage).description(),
			saveName: V.saveName ?? "",
			saveId: V.saveId ?? null,
			days: Time.days ?? 0,
			gameVersion: StartConfig.version,
		};
	}

	/**
	 * Write the lifeboat copy. Skipped when it would be too large, when one was written recently, and
	 * for anything the save system would refuse to save anyway.
	 *
	 * @param {boolean} force bypass the interval, for deliberate saves
	 * @returns {boolean} true when a copy was written
	 */
	function writeLifeboat(force) {
		/* With the legacy backend this would only duplicate a localStorage save into the same limited
		   storage area, increasing quota pressure without providing another failure boundary. */
		if (!idbInUse() || (lifeboatBlocked && !force)) return false;
		if (!force && Date.now() - lastLifeboatWrite < SAVE_GUARD_INTERVAL_MS) return false;
		if (typeof Config.saves.isAllowed === "function" && !Config.saves.isAllowed()) return false;

		let serialised;
		try {
			const payload = buildPayload();
			if (payload == null) return false;
			serialised = JSON.stringify(payload);
		} catch (ex) {
			return false;
		}
		if (serialised.length > LIFEBOAT_MAX_CHARS) {
			/* Too big to hold without threatening feats and the legacy saves. Keep the previous
			   valid lifeboat; Web Storage writes are atomic, so it is safer than replacing it. */
			lifeboatBlocked = true;
			return false;
		}
		try {
			localStorage.setItem(LIFEBOAT_KEY, serialised);
			lifeboatBlocked = false;
			lastLifeboatWrite = Date.now();
			return true;
		} catch (ex) {
			/* Out of room. setItem leaves the old value intact. Stop trying for this session so we
			   are not throwing on every autosave. */
			lifeboatBlocked = true;
			return false;
		}
	}

	/**
	 * @returns {object|null} descriptive fields only, without the history payload
	 */
	function lifeboatInfo() {
		const payload = readJSON(LIFEBOAT_KEY);
		if (payload == null || !Array.isArray(payload.delta)) return null;
		return {
			date: payload.date,
			title: payload.title,
			saveName: payload.saveName,
			days: payload.days,
			gameVersion: payload.gameVersion,
		};
	}

	/**
	 * Load the lifeboat copy. Mirrors idb's loadState: rebuild the history, run the normal load
	 * handlers so version updates apply, then hand it to the engine.
	 *
	 * @returns {boolean} true when the game was restored
	 */
	function restoreLifeboat() {
		const payload = readJSON(LIFEBOAT_KEY);
		if (payload == null || !Array.isArray(payload.delta)) return false;
		try {
			const state = {
				history: State.deltaDecode(payload.delta),
				index: payload.index,
			};
			if (payload.seed != null) state.seed = payload.seed;
			if (payload.expired != null) state.expired = payload.expired;

			const fullSaveObj = {
				state,
				date: payload.date,
				id: payload.id,
				idx: payload.idx,
				title: payload.title,
				metadata: { saveId: payload.saveId, saveName: payload.saveName },
			};
			Save.onLoad.handlers.forEach(fn => fn(fullSaveObj));
			State.unmarshalForSave(state);
			State.show();
			return true;
		} catch (ex) {
			Errors.report("Could not restore the backup copy - " + ex, {});
			return false;
		}
	}

	/* persistence */

	/**
	 * Check whether the origin has persistent storage without prompting the player.
	 *
	 * @returns {Promise<object>} {supported, persisted}
	 */
	async function checkPersistence() {
		const manager = navigator.storage;
		const requested = persistState.requested === true || readJSON(PERSIST_KEY)?.requested === true;
		if (manager == null || typeof manager.persisted !== "function") {
			persistState = { supported: false, persisted: null, checked: true, requested };
			writeJSON(PERSIST_KEY, persistState);
			return persistState;
		}
		try {
			const persisted = await manager.persisted();
			persistState = { supported: true, persisted, checked: true, requested };
		} catch (ex) {
			persistState = { supported: true, persisted: null, checked: true, requested };
		}
		writeJSON(PERSIST_KEY, persistState);
		return persistState;
	}

	/**
	 * Ask for persistent storage. This is called by a saves-menu button so browsers that show a
	 * permission prompt receive the request in response to a player gesture.
	 *
	 * @returns {Promise<object>} {supported, persisted}
	 */
	async function requestPersistence() {
		const manager = navigator.storage;
		if (manager == null || typeof manager.persist !== "function") return checkPersistence();
		try {
			const persisted = await manager.persist();
			persistState = { supported: true, persisted, checked: true, requested: true };
		} catch (ex) {
			persistState = { supported: true, persisted: null, checked: true, requested: true };
		}
		writeJSON(PERSIST_KEY, persistState);
		return persistState;
	}

	/**
	 * @returns {object} last known persistence state, without re-asking
	 */
	function persistence() {
		if (persistState.checked) return persistState;
		return readJSON(PERSIST_KEY) ?? persistState;
	}

	/* diagnostics */

	/**
	 * Everything worth knowing when a player reports vanished saves. Rendered in the debug section of
	 * the saves menu so the next report arrives as facts rather than reconstruction.
	 *
	 * @returns {Promise<object>}
	 */
	async function diagnostics() {
		const out = {
			origin: location.protocol + "//" + (location.host || "(file)"),
			idbAvailable: typeof indexedDB !== "undefined" && indexedDB != null,
			idbActive: typeof idb !== "undefined" && idb != null ? idb.active : false,
			persistence: persistence(),
			mirrorSlots: getMirror()?.slots.length ?? 0,
			lifeboat: lifeboatInfo(),
			lifeboatBlocked,
		};
		try {
			if (navigator.storage && typeof navigator.storage.estimate === "function") {
				const estimate = await navigator.storage.estimate();
				out.usageBytes = estimate.usage;
				out.quotaBytes = estimate.quota;
			}
		} catch (ex) {
			/* estimate is informational; its absence is not worth reporting */
		}
		try {
			out.detailRows = idbInUse() ? (await idb.getSaveDetails()).length : null;
		} catch (ex) {
			out.detailRows = "error";
		}
		return out;
	}

	/* notice */

	/**
	 * @param {number} ms
	 * @returns {string}
	 */
	function stamp(ms) {
		if (!ms) return "unknown date";
		return new Date(ms).toLocaleString();
	}

	/**
	 * @param {object} slot a summarised mirror row
	 * @returns {string}
	 */
	function describeSlot(slot) {
		const label = slot.saveName || slot.title || "unnamed save";
		const where = slot.slot === 0 ? "Autosave" : "Slot " + slot.slot;
		return `${where}: ${label} (${stamp(slot.date)})`;
	}

	/**
	 * @param {HTMLElement} container
	 * @param {object} report
	 */
	function renderLoss(container, report) {
		const boat = lifeboatInfo();
		const actions = [];

		if (boat != null) {
			actions.push(
				element("input", {
					type: "button",
					class: "saveMenuButton saveMenuConfirm",
					value: "Restore backup copy",
					onclick() {
						if (restoreLifeboat()) {
							dismissLoss();
							closeOverlay();
						}
					},
				})
			);
		}
		actions.push(
			element("input", {
				type: "button",
				class: "saveMenuButton",
				value: "Dismiss",
				onclick() {
					dismissLoss();
					container.textContent = "";
				},
			})
		);

		container.appendChild(
			element("div", { class: "sneaky-warning" }, [
				element("h3", "Your saved games were cleared"),
				element(
					"p",
					`${report.slots.length} save${report.slots.length === 1 ? " that was" : "s that were"} here on ${stamp(report.lastSeen)} ` +
						`${report.slots.length === 1 ? "is" : "are"} gone. The game did not delete ${report.slots.length === 1 ? "it" : "them"} - ` +
						"the IndexedDB save database was reset or removed while its browser-side record remained. This can follow storage damage " +
						"or site-data changes; the game cannot determine the exact cause. The missing saves cannot be recovered from IndexedDB."
				),
				element(
					"ul",
					report.slots.map(slot => element("li", describeSlot(slot)))
				),
				boat != null
					? element("p", `A backup copy is still here: ${boat.saveName || boat.title || "unnamed save"}, day ${boat.days}, saved ${stamp(boat.date)}.`)
					: element("p", "No browser-side backup copy was available. An exported file is the only independent copy."),
				element("p", "The backup and save-list record use the same browser or app storage. They can also disappear if all site data is cleared."),
				element("div", actions),
			])
		);
	}

	/**
	 * @param {HTMLElement} container
	 */
	function renderPersistenceHint(container) {
		const state = persistence();
		if (state.persisted === true && !lifeboatBlocked) return;
		const contents = [];
		if (lifeboatBlocked) {
			contents.push(
				element("span", { class: "red" }, "The browser-side backup could not be updated. "),
				"The previous backup, if any, has been kept. A deliberate slot save will retry it. "
			);
		}
		if (state.persisted !== true) {
			const status = state.requested
				? state.persisted === false
					? "Your browser did not allow protected storage. "
					: "The storage request could not be completed. "
				: state.supported
				? "Protected storage is not enabled. "
				: "Your browser does not report whether storage is protected. ";

			contents.push(
				element("span", { class: "red" }, status),
				isApp()
					? "Your saves will be deleted if the cache is cleared! "
					: "Your saves will be deleted if your cache is cleared, or if your browser needs to free up space. ",
				"Export your save to a file to keep a separate backup!"
			);
		}
		if (!state.requested && state.persisted !== true && state.supported && navigator.storage != null && typeof navigator.storage.persist === "function") {
			contents.push(
				element("br"),
				element("input", {
					type: "button",
					class: "saveMenuButton",
					value: "Request persistent storage",
					async onclick(event) {
						event.currentTarget.disabled = true;
						event.currentTarget.value = "Requesting...";
						await requestPersistence();
						await renderNotice(container.id);
					},
				})
			);
		}
		container.appendChild(element("p", { class: "description" }, contents));
	}

	/**
	 * Reconcile storage, then draw whichever notice applies. Called by the saves overlay.
	 *
	 * @param {string} containerId
	 * @returns {Promise<void>}
	 */
	let noticeRender = 0;

	async function renderNotice(containerId) {
		const container = document.getElementById(containerId);
		if (container == null) return;
		/* Re-rendering the Saves tab starts a second pass while the first is still awaiting storage.
		   Without this, both would append and the notice would appear twice. */
		const pass = ++noticeRender;
		container.textContent = "";
		await Promise.all([refresh(), checkPersistence()]);
		if (pass !== noticeRender || !container.isConnected) return;
		container.textContent = "";
		const report = getLossReport();
		if (report != null) renderLoss(container, report);
		else renderPersistenceHint(container);
	}

	/**
	 * Diagnostics readout for the debug section of the saves menu.
	 *
	 * @param {string} containerId
	 * @returns {Promise<void>}
	 */
	async function renderDiagnostics(containerId) {
		const container = document.getElementById(containerId);
		if (container == null) return;
		const data = await diagnostics();
		const mb = bytes => (bytes == null ? "unknown" : (bytes / 1048576).toFixed(1) + " MB");
		const rows = [
			["Origin", data.origin],
			["indexedDB available", String(data.idbAvailable)],
			["idb active", String(data.idbActive)],
			["Rows in details store", String(data.detailRows)],
			["Saves in localStorage mirror", String(data.mirrorSlots)],
			["Storage persistent", data.persistence.supported ? String(data.persistence.persisted) : "unsupported"],
			["Storage used", mb(data.usageBytes) + " of " + mb(data.quotaBytes)],
			["Backup copy", data.lifeboat ? `${stamp(data.lifeboat.date)} (day ${data.lifeboat.days})` : data.lifeboatBlocked ? "blocked - no room" : "none"],
		];
		container.textContent = "";
		container.appendChild(
			element(
				"ul",
				rows.map(row => element("li", `${row[0]}: ${row[1]}`))
			)
		);
	}

	/* wiring */

	/* idb's saveState runs the Save.onSave handlers. The work is deferred so it never sits in the
	   middle of the save the player asked for. Legacy saves already occupy localStorage and are not
	   duplicated there. */
	Save.onSave.add((save, details) => {
		if (!idbInUse() || (details?.type !== "slot" && details?.type !== "autosave")) return;
		const deliberate = details != null && details.type === "slot";
		setTimeout(() => {
			writeLifeboat(deliberate);
			refresh(deliberate);
		}, 0);
	});

	return Object.freeze({
		refresh,
		getLossReport,
		dismissLoss,
		lifeboat: Object.freeze({
			write: writeLifeboat,
			info: lifeboatInfo,
			restore: restoreLifeboat,
		}),
		requestPersistence,
		checkPersistence,
		persistence,
		diagnostics,
		renderNotice,
		renderDiagnostics,
	});
})();
window.DoLSaveGuard = DoLSaveGuard;

/* Avoid duplicate export reminders: renderPersistenceHint already provides this message.
   Clear the format's copy before L10n.init(), so this must run at top level. */
l10nStrings.savesExportReminder = "";

/* Run once per session, as early as the storage APIs allow. idb already requests persistence while
   opening its database, so this layer only reads the result instead of adding a redundant prompt. */
$(document).one(":storyready", () => {
	DoLSaveGuard.checkPersistence();
	DoLSaveGuard.refresh();
});
