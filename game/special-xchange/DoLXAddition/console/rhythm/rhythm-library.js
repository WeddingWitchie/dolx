/* Rhythm game: the player's own Rhythm Library. It lives in this browser's IndexedDB (database "dolRhythmLibrary"),
 * never in DoL saves: songs, their audio files, charts and playlists. When IndexedDB is unavailable it falls back to
 * memory for the page session and says so.
 *
 * Shared JSON (charts, playlists, the whole library) never carries audio. A song names its audio by file name, size,
 * duration and a sampled fingerprint, so whoever imports it can link their own copy. Every import is rebuilt field by
 * field from a whitelist, so nothing in the file can add properties, run code or reach the stored data unchecked. */
(() => {
	const dbName = "dolRhythmLibrary";
	const levelNames = Object.freeze(["easy", "normal", "hard"]);
	const format = "dol-rhythm";
	const version = 1;
	const limits = Object.freeze({
		importBytes: 8 * 1024 * 1024,
		audioBytes: 60 * 1024 * 1024,
		audioSeconds: 12 * 60,
		songs: 500,
		playlists: 200,
		playlistSongs: 1000,
		notes: 6000,
		text: 120,
	});

	let dbPromise = null;
	let persistent = true;
	const memory = { songs: new Map(), audio: new Map(), playlists: new Map() };

	function openDb() {
		if (dbPromise) return dbPromise;
		dbPromise = new Promise(resolve => {
			let request;
			try {
				request = window.indexedDB && indexedDB.open(dbName, 1);
			} catch (e) {
				request = null;
			}
			if (!request) {
				persistent = false;
				resolve(null);
				return;
			}
			request.onupgradeneeded = () => {
				const db = request.result;
				for (const store of ["songs", "audio", "playlists"]) if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
			};
			request.onsuccess = () => {
				const db = request.result;
				if (!persistent) {
					db.close();
					return;
				}
				/* Another tab upgrading or deleting the database: let it, and reopen on the next call. */
				db.onversionchange = () => {
					db.close();
					dbPromise = null;
				};
				resolve(db);
			};
			request.onerror = () => {
				persistent = false;
				resolve(null);
			};
			request.onblocked = () => {
				persistent = false;
				resolve(null);
			};
		});
		return dbPromise;
	}

	/* One request in one transaction. Falls back to memory when there is no database. */
	async function run(store, mode, action) {
		const db = await openDb();
		if (!db) return action(null, memory[store]);
		return new Promise((resolve, reject) => {
			let tx;
			try {
				tx = db.transaction(store, mode);
			} catch (e) {
				reject(e);
				return;
			}
			const request = action(tx.objectStore(store));
			let result;
			if (request) request.onsuccess = () => (result = request.result);
			tx.oncomplete = () => resolve(result);
			tx.onabort = tx.onerror = () => reject(tx.error || new Error("Storage failed"));
		});
	}

	const getAll = store =>
		run(store, "readonly", (os, mem) => {
			if (!os) return [...mem.values()];
			return os.getAll();
		});
	const get = (store, key) => run(store, "readonly", (os, mem) => (os ? os.get(key) : mem.get(key)));
	const put = (store, key, value) =>
		run(store, "readwrite", (os, mem) => {
			if (!os) {
				mem.set(key, value);
				return undefined;
			}
			return os.put(value, key);
		});
	const del = (store, key) =>
		run(store, "readwrite", (os, mem) => {
			if (!os) {
				mem.delete(key);
				return undefined;
			}
			return os.delete(key);
		});

	/* Turns a storage failure into a sentence the player can act on. */
	function storageMessage(error) {
		const name = error && error.name;
		if (name === "QuotaExceededError") return "The browser has no room left for the Rhythm Library. Delete some songs and try again.";
		return "The Rhythm Library could not be saved in this browser" + (error && error.message ? ` (${error.message})` : "") + ".";
	}

	/* ---- ids and fingerprints ---- */

	function newId(prefix) {
		const rand = Math.floor(Math.random() * 0x100000000)
			.toString(36)
			.padStart(7, "0");
		return `${prefix}-${Date.now().toString(36)}${rand}`;
	}

	/* A sampled 64-bit FNV-1a over the file bytes plus its size: cheap, stable, and the same in every browser. */
	function fingerprint(bytes) {
		const view = new Uint8Array(bytes);
		const stride = Math.max(1, Math.floor(view.length / 262144));
		let a = 0x811c9dc5;
		let b = 0x01000193 ^ view.length;
		for (let i = 0; i < view.length; i += stride) {
			a = Math.imul(a ^ view[i], 0x01000193);
			b = Math.imul(b ^ view[view.length - 1 - i], 0x01000193);
		}
		return `fnv:${(a >>> 0).toString(16).padStart(8, "0")}${(b >>> 0).toString(16).padStart(8, "0")}:${view.length}`;
	}

	/* ---- songs ---- */

	const builtin = id => setup.rhythmBuiltins.find(s => s.id === id);

	/* A built-in song as a library-shaped record (not stored; charts generated on demand). */
	function builtinSong(b) {
		return {
			id: b.id,
			title: b.title,
			artist: b.artist,
			source: "builtin",
			builtin: b.id,
			bpm: b.bpm,
			offset: b.offset,
			pageBeats: setup.rhythmAnalysis.pageBeats(b.bpm),
			duration: b.duration,
			trim: 0,
			analysis: b.analysis,
			charts: {},
			audio: null,
		};
	}

	const listSongs = () => getAll("songs");
	const getSong = id => (builtin(id) ? Promise.resolve(builtinSong(builtin(id))) : get("songs", id));

	async function saveSong(song, audioBlob) {
		song.updated = Date.now();
		if (audioBlob === undefined) return put("songs", song.id, song);
		const db = await openDb();
		if (!db) {
			memory.songs.set(song.id, song);
			memory.audio.set(song.id, audioBlob);
			return;
		}
		return new Promise((resolve, reject) => {
			const tx = db.transaction(["songs", "audio"], "readwrite");
			tx.oncomplete = () => resolve();
			tx.onabort = tx.onerror = () => reject(tx.error || new Error("Storage failed"));
			try {
				tx.objectStore("songs").put(song, song.id);
				tx.objectStore("audio").put(audioBlob, song.id);
			} catch (e) {
				tx.abort();
				reject(e);
			}
		});
	}

	async function deleteSong(id) {
		await del("songs", id);
		await del("audio", id);
		for (const list of await listPlaylists()) {
			if (list.songs.includes(id)) {
				list.songs = list.songs.filter(s => s !== id);
				await savePlaylist(list);
			}
		}
	}

	const getAudio = id => get("audio", id);

	/* The chart for a level: the stored one when the player has one, otherwise generated now. */
	function chartFor(song, level) {
		const stored = song.charts && song.charts[level];
		if (stored && Array.isArray(stored.notes)) return stored;
		return { notes: setup.rhythmAnalysis.generate(song, level).notes, edited: false };
	}

	/* ---- playlists ---- */

	const listPlaylists = () => getAll("playlists").then(list => list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
	const savePlaylist = list => put("playlists", list.id, list);
	const deletePlaylist = id => del("playlists", id);

	/* ---- export ---- */

	function exportSong(song) {
		const out = {
			id: song.id,
			title: song.title,
			artist: song.artist || "",
			bpm: song.bpm,
			offset: song.offset,
			pageBeats: song.pageBeats,
			duration: song.duration,
			trim: song.trim || 0,
			audio: song.audio ? { name: song.audio.name, size: song.audio.size, type: song.audio.type, fingerprint: song.audio.fingerprint } : null,
			analysis: song.analysis ? { bpm: song.analysis.bpm, offset: song.analysis.offset, slots: song.analysis.slots, energy: song.analysis.energy } : null,
			charts: {},
		};
		if (song.builtin) out.builtin = song.builtin;
		for (const level of levelNames) {
			const chart = chartFor(song, level);
			out.charts[level] = {
				edited: !!chart.edited,
				notes: chart.notes.map(n => (n.type === "hold" ? { t: n.t, x: n.x, type: n.type, d: n.d } : { t: n.t, x: n.x, type: n.type })),
			};
		}
		return out;
	}

	const wrap = (kind, songs, playlists) => ({ format, version, kind, exported: new Date().toISOString(), songs, playlists });

	async function exportData(kind, { songIds = [], playlistId } = {}) {
		let ids = songIds;
		let lists = [];
		if (kind === "playlist") {
			const list = (await listPlaylists()).find(p => p.id === playlistId);
			if (!list) throw new Error("That playlist no longer exists.");
			lists = [{ id: list.id, name: list.name, songs: [...list.songs] }];
			ids = list.songs;
		} else if (kind === "library") {
			ids = (await listSongs()).map(s => s.id);
			lists = (await listPlaylists()).map(p => ({ id: p.id, name: p.name, songs: [...p.songs] }));
		}
		const songs = [];
		for (const id of ids) {
			if (builtin(id)) continue; // built-in songs come with every copy of the game
			const song = await get("songs", id);
			if (song) songs.push(exportSong(song));
		}
		return wrap(kind, songs, lists);
	}

	/* ---- import: validation ---- */

	class ImportError extends Error {}
	const fail = message => {
		throw new ImportError(message);
	};

	const isPlain = v => v !== null && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
	const text = (v, max = limits.text) =>
		typeof v === "string"
			? v
					.replace(/[\p{Cc}<>]/gu, "")
					.trim()
					.slice(0, max)
			: "";
	const num = (v, min, max, what) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : fail(`${what} is out of range.`));
	const idOk = v => typeof v === "string" && /^[A-Za-z0-9:_-]{1,64}$/.test(v);

	function cleanNotes(notes, durationMs, where) {
		if (!Array.isArray(notes)) fail(`${where}: notes must be a list.`);
		if (notes.length > limits.notes) fail(`${where}: more than ${limits.notes} notes.`);
		return setup.rhythmAnalysis.tidy(
			notes.map((n, i) => {
				if (!isPlain(n)) fail(`${where}: note ${i + 1} is not a note.`);
				const type = ["tap", "hold", "drag"].includes(n.type) ? n.type : fail(`${where}: note ${i + 1} has an unknown type.`);
				const note = {
					t: Math.round(num(n.t, 0, durationMs + 5000, `${where}: note ${i + 1} time`)),
					x: Math.round(num(n.x, 0, 1, `${where}: note ${i + 1} position`) * 1000) / 1000,
					type,
				};
				if (type === "hold") note.d = Math.round(num(n.d, 50, 60000, `${where}: note ${i + 1} hold length`));
				return note;
			})
		);
	}

	function cleanSong(s, i) {
		const where = `Song ${i + 1}`;
		if (!isPlain(s)) fail(`${where} is not a song.`);
		const song = {
			id: idOk(s.id) ? s.id : newId("s"),
			title: text(s.title) || "Untitled",
			artist: text(s.artist),
			source: "file",
			bpm: num(s.bpm, 40, 300, `${where}: BPM`),
			offset: Math.round(num(s.offset, -10000, 60000, `${where}: beat offset`)),
			pageBeats: [2, 4, 8].includes(s.pageBeats) ? s.pageBeats : fail(`${where}: page length must be 2, 4, or 8 beats.`),
			duration: num(s.duration, 1, limits.audioSeconds, `${where}: duration`),
			trim: s.trim === undefined ? 0 : Math.round(num(s.trim, -500, 500, `${where}: timing offset`)),
			audio: null,
			analysis: null,
			charts: {},
		};
		if (s.builtin !== undefined) {
			if (typeof s.builtin !== "string" || !builtin(s.builtin)) fail(`${where} is linked to a built-in song this game does not have.`);
			song.builtin = s.builtin;
			song.source = "builtin";
		}
		if (s.audio !== null && s.audio !== undefined) {
			if (!isPlain(s.audio)) fail(`${where}: audio details are malformed.`);
			const fp = typeof s.audio.fingerprint === "string" && /^[a-z]{1,8}:[0-9a-f]{1,32}:[0-9]{1,12}$/.test(s.audio.fingerprint) ? s.audio.fingerprint : "";
			song.audio = {
				name: text(s.audio.name, 200),
				size: s.audio.size === undefined ? 0 : Math.round(num(s.audio.size, 0, 4e9, `${where}: file size`)),
				type: text(s.audio.type, 60),
				fingerprint: fp,
			};
		}
		if (s.analysis !== null && s.analysis !== undefined) {
			if (!isPlain(s.analysis)) fail(`${where}: analysis is malformed.`);
			const a = s.analysis;
			if (typeof a.slots !== "string" || !/^[0-9]{0,40000}$/.test(a.slots)) fail(`${where}: analysis beats are malformed.`);
			if (typeof a.energy !== "string" || !/^[0-9]{0,5000}$/.test(a.energy)) fail(`${where}: analysis loudness is malformed.`);
			song.analysis = {
				bpm: num(a.bpm, 40, 300, `${where}: analysis BPM`),
				offset: Math.round(num(a.offset, -10000, 60000, `${where}: analysis offset`)),
				slots: a.slots,
				energy: a.energy,
			};
		}
		if (s.charts !== undefined) {
			if (!isPlain(s.charts)) fail(`${where}: charts are malformed.`);
			for (const level of levelNames) {
				const c = s.charts[level];
				if (c === undefined) continue;
				if (!isPlain(c)) fail(`${where}: the ${level} chart is malformed.`);
				song.charts[level] = { edited: c.edited === true, notes: cleanNotes(c.notes, song.duration * 1000, `${where} (${level})`) };
			}
		}
		if (!song.analysis && !levelNames.some(l => song.charts[l])) fail(`${where} has no charts and no analysis to make them from.`);
		if (song.builtin) song.analysis = song.analysis || builtin(song.builtin).analysis;
		return song;
	}

	/* Parses and validates a shared file. Returns { kind, songs, playlists } or throws an ImportError with a reason. */
	function parse(raw) {
		if (typeof raw !== "string") fail("That file could not be read as text.");
		if (raw.length > limits.importBytes) fail("That file is too large to be a rhythm chart (over 8 MB).");
		let data;
		try {
			data = JSON.parse(raw);
		} catch (e) {
			fail("That file is not valid JSON.");
		}
		if (!isPlain(data) || data.format !== format) fail("That file is not a rhythm chart, playlist, or library.");
		if (data.version !== version) fail(`That file uses version ${String(data.version).slice(0, 10)} of the format; this game reads version ${version}.`);
		if (!["song", "playlist", "library"].includes(data.kind)) fail("That file does not say what it holds.");
		const songs = data.songs === undefined ? [] : Array.isArray(data.songs) ? data.songs : fail("The song list is malformed.");
		const lists = data.playlists === undefined ? [] : Array.isArray(data.playlists) ? data.playlists : fail("The playlist list is malformed.");
		if (songs.length > limits.songs) fail(`That file has more than ${limits.songs} songs.`);
		if (lists.length > limits.playlists) fail(`That file has more than ${limits.playlists} playlists.`);
		const playlists = lists.map((p, i) => {
			if (!isPlain(p)) fail(`Playlist ${i + 1} is malformed.`);
			if (!Array.isArray(p.songs) || p.songs.length > limits.playlistSongs) fail(`Playlist ${i + 1} has a malformed song list.`);
			return { id: idOk(p.id) ? p.id : newId("p"), name: text(p.name, 80) || "Imported playlist", songs: p.songs.filter(idOk) };
		});
		return { kind: data.kind, songs: songs.map(cleanSong), playlists };
	}

	/* ---- import: merging ---- */

	/* Two songs' charts hold the same notes (stored and imported charts list their fields in different orders). */
	const chartKey = song =>
		JSON.stringify(levelNames.map(l => song.charts[l] && [!!song.charts[l].edited, song.charts[l].notes.map(n => [n.t, n.x, n.type, n.d || 0])]));
	const sameCharts = (a, b) =>
		chartKey(a) === chartKey(b) &&
		["builtin", "bpm", "offset", "pageBeats", "duration", "trim"].every(key => (a[key] ?? 0) === (b[key] ?? 0)) &&
		JSON.stringify(a.analysis) === JSON.stringify(b.analysis);

	/* Adds parsed data to the library without overwriting anything. Identical songs are skipped; a song whose id is
	 * already taken by something different is added under a new id. Returns a report of what happened. */
	async function merge(data) {
		const report = { added: [], skipped: [], renamed: [], playlists: [], missingAudio: 0 };
		const existing = new Map((await listSongs()).map(s => [s.id, s]));
		const idMap = new Map();
		for (const song of data.songs) {
			const old = existing.get(song.id);
			if (old && old.title === song.title && (old.audio?.fingerprint || "") === (song.audio?.fingerprint || "") && sameCharts(old, song)) {
				idMap.set(song.id, old.id);
				report.skipped.push(song.title);
				continue;
			}
			const from = song.id;
			if (old || builtin(song.id)) {
				song.id = newId("s");
				report.renamed.push(song.title);
			}
			song.created = Date.now();
			idMap.set(from, song.id);
			await saveSong(song);
			existing.set(song.id, song);
			report.added.push(song.title);
			if (!song.builtin) report.missingAudio++;
		}
		const lists = await listPlaylists();
		const names = new Set(lists.map(p => p.name));
		const ids = new Set(lists.map(p => p.id));
		for (const p of data.playlists) {
			const songs = p.songs.map(id => idMap.get(id) || (builtin(id) || existing.has(id) ? id : null)).filter(Boolean);
			let name = p.name;
			let copy = 1;
			while (names.has(name)) {
				const suffix = ` (imported ${copy++})`;
				name = p.name.slice(0, 80 - suffix.length) + suffix;
			}
			const list = { id: ids.has(p.id) ? newId("p") : p.id, name, songs, order: lists.length + report.playlists.length };
			names.add(name);
			ids.add(list.id);
			await savePlaylist(list);
			report.playlists.push(name);
		}
		return report;
	}

	setup.rhythmLibrary = Object.freeze({
		limits,
		levelNames,
		get persistent() {
			return persistent;
		},
		open: openDb,
		storageMessage,
		newId,
		fingerprint,
		builtin,
		builtinSong,
		listSongs,
		getSong,
		saveSong,
		deleteSong,
		getAudio,
		chartFor,
		listPlaylists,
		savePlaylist,
		deletePlaylist,
		exportData,
		parse,
		merge,
		ImportError,
	});
})();
