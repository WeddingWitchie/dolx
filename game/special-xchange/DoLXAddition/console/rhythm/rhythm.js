/* globals updateMoment */
/* Rhythm game: records in the save, the music clock, and the playfield.
 *
 * Timing: the song plays through one HTMLAudioElement and its currentTime is the only clock. Frames
 * (requestAnimationFrame) only draw; between the element's own time updates the clock runs on performance.now() and is
 * pulled back to the element's time, so a slow frame, a stall or a hidden tab can never move the chart ahead of the
 * music. The player's timing offset and the song's own offset are subtracted from that clock. */
(() => {
	const A = () => setup.rhythmAnalysis;

	/* ---- records in the save ----
	 * $rhythm: { settings, best { "songId|level": { score, acc, grade, fc, ap } }, stats, challenges { id: date },
	 *   daily { date: { tries, best, done, paid } }, achievements { id: date }, tutorial }.
	 * Only "eligible" plays count for any of it: a built-in song with its own generated chart. Your own music, imported
	 * charts and edited copies keep a best score in the Rhythm Library and nothing else, so nothing can be farmed. */

	const levelsList = Object.freeze(["easy", "normal", "hard"]);

	const achievements = Object.freeze([
		{ id: "first-clear", name: "Opening number", desc: "Clear any built-in song." },
		{ id: "normal-clear", name: "Keeping time", desc: "Clear a built-in song on Normal." },
		{ id: "hard-clear", name: "Hard hitter", desc: "Clear a built-in song on Hard." },
		{ id: "full-combo", name: "Unbroken", desc: "Finish a built-in song without a single miss." },
		{ id: "all-perfect", name: "Spotless", desc: "Hit every note of a built-in song Perfect." },
		{ id: "s-rank", name: "Top marks", desc: "Get an S on any built-in song." },
		{ id: "set-list", name: "Full set list", desc: "Clear every built-in song, on any difficulty." },
		{ id: "own-song", name: "Mixtape", desc: "Play a song from your own Rhythm Library." },
		{ id: "graduate", name: "Practice makes perfect", desc: "Finish the tutorial." },
		{ id: "daily-1", name: "Daily habit", desc: "Complete a daily challenge." },
		{ id: "challenges-5", name: "Challenger", desc: "Complete 5 challenges." },
	]);

	/* Regular challenges: met once, ticked for good, no money (the daily challenge pays). Thresholds sit inside what the
	 * built-in charts allow: the shortest Normal chart has about 100 notes, the longest Hard chart over 400. */
	const challenges = Object.freeze(
		[
			{ id: "warm-up", name: "Warm-up", diff: "easy", desc: "Clear any built-in song.", target: 1, value: s => Math.max(s.clears, s.songs) },
			{ id: "three-songs", name: "Shuffle", diff: "easy", desc: "Clear 3 different built-in songs.", target: 3, value: s => s.songs },
			{ id: "combo-50", name: "In the groove", diff: "easy", desc: "Reach a 50 combo.", target: 50, value: s => s.bestCombo },
			{ id: "perfect-500", name: "Sharp ears", diff: "easy", desc: "Hit 500 Perfects in total.", target: 500, value: s => s.perfects },
			{
				id: "normal-90",
				name: "Turning it up",
				diff: "medium",
				desc: "Clear a song on Normal with 90% accuracy or more.",
				target: 90,
				value: s => s.bestAcc.normal,
			},
			{ id: "normal-fc", name: "Clean run", diff: "medium", desc: "Finish a song on Normal without a miss.", target: 1, value: s => s.fc.normal },
			{ id: "five-songs", name: "Half the set", diff: "medium", desc: "Clear 5 different built-in songs.", target: 5, value: s => s.songs },
			{ id: "combo-150", name: "Long haul", diff: "medium", desc: "Reach a 150 combo.", target: 150, value: s => s.bestCombo },
			{ id: "hard-clear", name: "No easy way", diff: "hard", desc: "Clear a song on Hard.", target: 1, value: s => s.clearsByLevel.hard },
			{ id: "hard-s", name: "Hard and sharp", diff: "hard", desc: "Get an S on Hard.", target: 1, value: s => s.sByLevel.hard },
			{ id: "hard-fc", name: "Untouchable", diff: "hard", desc: "Finish a song on Hard without a miss.", target: 1, value: s => s.fc.hard },
			{ id: "all-songs", name: "Encore", diff: "hard", desc: "Clear every built-in song.", target: () => setup.rhythmBuiltins.length, value: s => s.songs },
			{ id: "perfect-3000", name: "Perfectionist", diff: "hard", desc: "Hit 3,000 Perfects in total.", target: 3000, value: s => s.perfects },
		].map(c => Object.freeze(c))
	);
	const masterFeat = "Rhythm Master";

	function data() {
		if (!V.rhythm || typeof V.rhythm !== "object") V.rhythm = {};
		const d = V.rhythm;
		if (!d.settings) d.settings = {};
		if (!d.best) d.best = {};
		if (!d.daily) d.daily = {};
		if (!d.achievements) d.achievements = {};
		if (!d.challenges) d.challenges = {};
		if (!d.stats) d.stats = { clears: 0, perfects: 0, bestCombo: 0 };
		return d;
	}

	/* Totals the challenges read: the counters kept in $rhythm.stats plus what the best results already show. */
	function stats(d = data()) {
		const s = { clears: d.stats.clears || 0, perfects: d.stats.perfects || 0, bestCombo: d.stats.bestCombo || 0 };
		s.clearsByLevel = { easy: 0, normal: 0, hard: 0 };
		s.sByLevel = { easy: 0, normal: 0, hard: 0 };
		s.fc = { easy: 0, normal: 0, hard: 0 };
		s.bestAcc = { easy: 0, normal: 0, hard: 0 };
		const songs = new Set();
		for (const [key, b] of Object.entries(d.best)) {
			const [id, level] = key.split("|");
			if (s.clearsByLevel[level] === undefined || !setup.rhythmBuiltins.some(x => x.id === id)) continue;
			if (b.acc >= clearAt) {
				songs.add(id);
				s.clearsByLevel[level]++;
				s.bestAcc[level] = Math.max(s.bestAcc[level], b.acc);
			}
			if (b.grade === "S") s.sByLevel[level]++;
			if (b.fc) s.fc[level]++;
		}
		s.songs = songs.size;
		return s;
	}

	const targetOf = c => (typeof c.target === "function" ? c.target() : c.target);

	/* Where every challenge stands: [{ c, value, target, done, date }]. */
	function challengeStatus(d = data()) {
		const s = stats(d);
		return challenges.map(c => {
			const target = targetOf(c);
			const value = Math.min(target, c.value(s) || 0);
			return { c, value, target, done: !!d.challenges[c.id] || value >= target, date: d.challenges[c.id] || null };
		});
	}

	/* ---- the daily challenge ----
	 * The UTC date picks a built-in song, a difficulty and a goal; its level sets the money (the console's £200 / £350 /
	 * £500). Only that song on that difficulty counts, and it pays once per day however often it is played. */
	const dailyTemplates = Object.freeze([
		{ type: "acc", level: "easy", n: 85, text: "with at least 85% accuracy" },
		{ type: "fc", level: "easy", text: "without a single miss" },
		{ type: "combo", level: "normal", share: 0.4, text: "with a combo of at least {n}" },
		{ type: "acc", level: "normal", n: 90, text: "with at least 90% accuracy" },
		{ type: "acc", level: "hard", n: 80, text: "with at least 80% accuracy" },
		{ type: "combo", level: "hard", share: 0.3, text: "with a combo of at least {n}" },
	]);

	function hash(text) {
		let h = 0x811c9dc5;
		for (let i = 0; i < text.length; i++) {
			h ^= text.charCodeAt(i);
			h = Math.imul(h, 0x01000193);
		}
		return h >>> 0;
	}

	function daily(date = setup.consoleDaily.utcDate()) {
		const h = hash(`rhythm-daily-${date}`);
		const t = dailyTemplates[h % dailyTemplates.length];
		const b = setup.rhythmBuiltins[(h >>> 8) % setup.rhythmBuiltins.length];
		const notes = setup.rhythmLibrary.chartFor(setup.rhythmLibrary.builtinSong(b), t.level).notes.length;
		const n = t.type === "combo" ? Math.max(20, Math.round((notes * t.share) / 5) * 5) : t.n;
		return Object.freeze({
			date,
			songId: b.id,
			title: b.title,
			level: t.level,
			type: t.type,
			n,
			goal: `Play ${b.title} on ${t.level[0].toUpperCase() + t.level.slice(1)} ${t.text.replace("{n}", n)}.`,
			reward: setup.consoleDaily.dailyMoney.rhythm[t.level],
		});
	}

	function dailyMet(c, r) {
		if (c.type === "acc") return r.acc >= c.n;
		if (c.type === "fc") return r.fc;
		return r.maxCombo >= c.n;
	}

	/* Records one finished play. Returns { newBest, paid, unlocked, completed (challenge names), daily, feat }. */
	function record(result, eligible) {
		const d = data();
		const out = { newBest: false, paid: 0, unlocked: [], completed: [], daily: null, feat: false };
		const today = setup.consoleDaily.utcDate();
		const unlock = id => {
			if (d.achievements[id]) return;
			d.achievements[id] = today;
			out.unlocked.push(achievements.find(a => a.id === id).name);
		};
		if (!eligible || !setup.rhythmBuiltins.some(s => s.id === result.songId) || !levelsList.includes(result.level)) {
			if (result.custom) unlock("own-song");
			updateMoment();
			return out;
		}
		const key = `${result.songId}|${result.level}`;
		const best = d.best[key];
		if (!best || result.score > best.score) {
			d.best[key] = { score: result.score, acc: result.acc, grade: result.grade, fc: result.fc || !!best?.fc, ap: result.ap || !!best?.ap };
			out.newBest = !!best;
		} else {
			best.fc = best.fc || result.fc;
			best.ap = best.ap || result.ap;
		}
		d.stats.perfects = (d.stats.perfects || 0) + result.perfect;
		d.stats.bestCombo = Math.max(d.stats.bestCombo || 0, result.maxCombo);
		if (result.cleared) {
			d.stats.clears = (d.stats.clears || 0) + 1;
			unlock("first-clear");
			if (result.level === "normal") unlock("normal-clear");
			if (result.level === "hard") unlock("hard-clear");
			if (result.fc) unlock("full-combo");
			if (result.ap) unlock("all-perfect");
			if (result.grade === "S") unlock("s-rank");
			if (stats(d).songs >= setup.rhythmBuiltins.length) unlock("set-list");
		}

		/* Today's daily challenge. A day paid by the old "any clear" reward keeps that payment and pays nothing more. */
		const c = daily(today);
		if (result.songId === c.songId && result.level === c.level) {
			const day = d.daily[today] || (d.daily[today] = { tries: 0, best: 0, done: false, paid: 0 });
			day.tries = (day.tries || 0) + 1;
			day.best = Math.max(day.best || 0, result.acc);
			out.daily = { met: dailyMet(c, result), first: false };
			if (out.daily.met && !day.done) {
				day.done = true;
				out.daily.first = true;
				d.stats.daily = (d.stats.daily || 0) + 1;
				unlock("daily-1");
			}
			if (out.daily.met && !day.paid) {
				day.paid = c.reward;
				out.paid = setup.consoleDaily.pay(c.reward);
			}
			setup.consoleDaily.prune(d.daily);
		}

		for (const st of challengeStatus(d)) {
			if (st.done && !d.challenges[st.c.id]) {
				d.challenges[st.c.id] = today;
				out.completed.push(st.c.name);
			}
		}
		if (Object.keys(d.challenges).length >= 5) unlock("challenges-5");
		out.feat = checkFeat();
		updateMoment();
		return out;
	}

	/* The Rhythm Master feat: every challenge completed, earned through DoL's own earnFeat (once per save). */
	function checkFeat() {
		const d = data();
		return challenges.every(c => d.challenges[c.id]) && setup.consoleDaily.earnFeatOnce(masterFeat);
	}

	/* The tutorial's own achievement; nothing else. */
	function finishTutorial(how) {
		const d = data();
		d.tutorial = how;
		if (how === "done" && !d.achievements.graduate) d.achievements.graduate = setup.consoleDaily.utcDate();
		updateMoment();
	}

	const systemReduced = () => !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	/* Keyboard lanes: six keys across the field, bound by physical key (KeyboardEvent.code) so any layout works. */
	const defaultKeys = Object.freeze(["KeyA", "KeyS", "KeyD", "KeyJ", "KeyK", "KeyL"]);
	/* Keys a lane may never take: pausing, page navigation, and DoL's own shortcuts (numbered links, Z / N / Enter). */
	const reservedKeys = Object.freeze(["Escape", "KeyP", "Tab", "Enter", "NumpadEnter", "KeyZ", "KeyN", "Space", "Backspace"]);
	const keyAllowed = code =>
		typeof code === "string" &&
		/^(Key[A-Z]|Semicolon|Quote|Comma|Period|Slash|BracketLeft|BracketRight|Backslash|Minus|Equal|Backquote|Arrow(Left|Right|Up|Down)|Numpad[0-9])$/.test(
			code
		) &&
		!reservedKeys.includes(code);

	function settings() {
		const s = data().settings;
		const keys =
			Array.isArray(s.keys) && s.keys.length === defaultKeys.length && s.keys.every(keyAllowed) && new Set(s.keys).size === s.keys.length
				? [...s.keys]
				: [...defaultKeys];
		return {
			music: Number.isFinite(s.music) ? s.music : 0.8,
			offset: Number.isFinite(s.offset) ? s.offset : 0,
			reduced: s.reduced === undefined ? systemReduced() : !!s.reduced,
			level: levelsList.includes(s.level) ? s.level : "normal",
			keys,
			laneLabels: ["auto", "always", "never"].includes(s.laneLabels) ? s.laneLabels : "auto",
			previews: s.previews === undefined ? true : !!s.previews,
		};
	}

	function setSetting(key, value) {
		data().settings[key] = value;
		updateMoment();
	}

	const grades = Object.freeze([
		[97, "S"],
		[92, "A"],
		[85, "B"],
		[75, "C"],
		[0, "D"],
	]);
	const gradeOf = acc => grades.find(([min]) => acc >= min)[1];
	const clearAt = 75; // accuracy % that counts as clearing a song (grade C)

	/* Which lane (0..5) a note's x falls in. */
	const laneOf = (x, count = defaultKeys.length) => Math.max(0, Math.min(count - 1, Math.floor(x * count)));

	/* ---- the music clock ---- */

	class Clock {
		constructor(audio) {
			this.audio = audio;
			this.reset();
		}

		reset() {
			this.lastAudio = -1;
			this.lastPerf = 0;
			this.out = 0;
		}

		/* Song time in seconds. */
		now() {
			const audio = this.audio;
			const a = audio.currentTime || 0;
			const p = performance.now();
			if (a !== this.lastAudio) {
				this.lastAudio = a;
				this.lastPerf = p;
			}
			if (audio.paused || audio.readyState < 3) {
				this.out = a;
				return a;
			}
			/* Interpolate between the element's updates, but never more than 150 ms past its last report. */
			const est = this.lastAudio + Math.min(0.15, ((p - this.lastPerf) / 1000) * (audio.playbackRate || 1));
			/* Hold steady through a small step backwards, so notes never jitter; a seek moves the clock at once. */
			if (est < this.out && this.out - est < 0.04) return this.out;
			this.out = est;
			return est;
		}
	}

	/* ---- judgement windows (ms) ---- */

	const windows = Object.freeze({
		easy: Object.freeze({ perfect: 60, good: 125, miss: 170 }),
		normal: Object.freeze({ perfect: 50, good: 110, miss: 150 }),
		hard: Object.freeze({ perfect: 45, good: 100, miss: 140 }),
	});
	const goodValue = 0.6;

	/* Colours of the console screen. The field is its own dark screen in every DoL theme, so these are fixed; every note
	 * type also has its own shape, so colour is never the only difference. */
	const palette = Object.freeze({
		field: "#10131a",
		grid: "#1d2230",
		line: "#f2ead2",
		tap: "#66ccff",
		hold: "#ffbb33",
		drag: "#dd99ff",
		outline: "#f6f6f6",
		perfect: "#ffe27a",
		good: "#9fe0a0",
		miss: "#ff8a80",
		text: "#f2ead2",
		laneKey: "#8d93a6",
	});

	/* ---- the playfield ---- */

	class Field {
		/* opts: { canvas, song, notes, reduced } */
		constructor(opts) {
			Object.assign(this, opts);
			this.ctx = this.canvas.getContext("2d");
			this.dpr = 1;
			this.w = this.h = 0;
			this.fx = [];
			this.pointers = new Map();
			this.page = A().pages(this.song);
			this.resize();
		}

		resize() {
			const rect = this.canvas.getBoundingClientRect();
			this.dpr = Math.min(2, window.devicePixelRatio || 1);
			this.w = Math.max(200, rect.width);
			this.h = Math.max(160, rect.height);
			this.canvas.width = Math.round(this.w * this.dpr);
			this.canvas.height = Math.round(this.h * this.dpr);
			/* Note size: a comfortable thumb target on a phone, not huge on a desktop. */
			this.r = Math.max(15, Math.min(30, Math.min(this.w, this.h) * 0.075));
			this.padX = this.r + 6;
			this.padY = this.r + 6;
		}

		px(x) {
			return this.padX + x * (this.w - 2 * this.padX);
		}

		py(y) {
			return this.padY + y * (this.h - 2 * this.padY);
		}

		/* Screen position of a note: its x, and the line's height at its time. */
		pos(note, at = note.t / 1000) {
			const l = A().lineAt(this.song, at);
			return { x: this.px(note.x), y: this.py(l.y), page: l.page };
		}

		/* Field coordinates (0..1) of a client point, and the time the line passes that height on page `page`. */
		toField(clientX, clientY) {
			const rect = this.canvas.getBoundingClientRect();
			const sx = clientX - rect.left;
			const sy = clientY - rect.top;
			return {
				sx,
				sy,
				x: Math.max(0, Math.min(1, (sx - this.padX) / (this.w - 2 * this.padX))),
				y: Math.max(0, Math.min(1, (sy - this.padY) / (this.h - 2 * this.padY))),
			};
		}

		/* The time on page `page` at which the line is at height y. */
		timeAt(page, y) {
			const frac = page % 2 === 0 ? 1 - y : y;
			return this.page.start + (page + frac) * this.page.length;
		}

		/* Draws the field at song time t. `editing` draws every note of the current page at full strength. */
		draw(t, { selected, editing = false, judged } = {}) {
			const c = this.ctx;
			const { w, h, r } = this;
			c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
			c.fillStyle = palette.field;
			c.fillRect(0, 0, w, h);
			/* Beat lines on the page: where the line will be on each beat, so the music's grid is visible. */
			const line = A().lineAt(this.song, t);
			c.strokeStyle = palette.grid;
			c.lineWidth = 1;
			for (let b = 1; b < this.song.pageBeats; b++) {
				const y = this.py(b / this.song.pageBeats);
				c.beginPath();
				c.moveTo(0, y);
				c.lineTo(w, y);
				c.stroke();
			}

			if (this.lanes && !editing) this.drawLanes();
			const notes = this.notes;
			const approach = this.approach();
			const lead = this.lead();
			/* Visibility is decided by time alone, never by which page the line is on: a note just after a reversal sits
			 * at the edge the line is heading for, so it gets its full approach before the line turns, like any other. */
			const from = t - 0.5;
			const to = t + lead;
			const far = [];
			const near = [];
			for (let i = this.firstIndex(from * 1000 - 60000); i < notes.length; i++) {
				const n = notes[i];
				const nt = n.t / 1000;
				const end = n.type === "hold" ? nt + n.d / 1000 : nt;
				if (nt > to) break;
				if (end < from) continue;
				const state = judged ? judged.get(n) : null;
				const p = this.pos(n);
				if (editing) {
					if (p.page === line.page) near.push({ n, p, state, alpha: 1 });
					continue;
				}
				if (state && state.done && (t - state.at > 0.3 || state.result !== "miss")) continue;
				if (state && state.result === "miss") near.push({ n, p, state, alpha: 0.3 * (1 - (t - state.at) / 0.3) });
				else if (nt - t > approach) far.push({ n, p, state, alpha: 0.32 * Math.min(1, (t - (nt - lead)) / 0.2) });
				else near.push({ n, p, state, alpha: 1, k: nt >= t && !(state && state.holding) ? (nt - t) / approach : undefined });
			}
			/* Upcoming notes underneath, then the ones due soon, the soonest drawn last so it is always on top. */
			const drawn = [...far, ...near.reverse()];
			this.drawChains(drawn);
			for (const item of drawn) {
				if (item.alpha <= 0) continue;
				const { n, p, state } = item;
				c.globalAlpha = item.alpha;
				if (n.type === "hold") this.drawHold(n, p, t, state, editing);
				else if (n.type === "drag") this.drawDrag(p, state);
				else this.drawTap(p);
				/* Approach ring: shrinks onto the note's outline at exactly the moment to hit it. */
				if (item.k !== undefined) {
					c.globalAlpha = 0.35 + 0.65 * (1 - item.k);
					c.strokeStyle = palette[n.type];
					c.lineWidth = 2.5;
					c.beginPath();
					c.arc(p.x, p.y, r * (0.72 + 1.1 * item.k), 0, Math.PI * 2);
					c.stroke();
				}
				/* With key lanes showing, each note due soon carries its lane's key. */
				if (this.lanes && item.k !== undefined) this.drawKey(p, this.lanes[laneOf(n.x)]);
				if (selected === n) {
					c.globalAlpha = 1;
					c.strokeStyle = palette.perfect;
					c.lineWidth = 3;
					c.setLineDash([5, 4]);
					c.strokeRect(p.x - r * 1.3, p.y - r * 1.3, r * 2.6, r * 2.6);
					c.setLineDash([]);
				}
			}
			c.globalAlpha = 1;

			/* The scan line: a soft band trails behind it, and an arrow at each end points the way it moves. */
			const ly = this.py(line.y);
			const up = line.page % 2 === 0;
			if (!this.reduced) {
				const band = 18;
				const g = c.createLinearGradient(0, ly, 0, up ? ly + band : ly - band);
				g.addColorStop(0, "rgba(242, 234, 210, 0.28)");
				g.addColorStop(1, "rgba(242, 234, 210, 0)");
				c.fillStyle = g;
				c.fillRect(0, up ? ly : ly - band, w, band);
			}
			c.fillStyle = palette.line;
			c.fillRect(0, ly - 1.5, w, 3);
			for (const ax of [10, w - 10]) {
				c.beginPath();
				c.moveTo(ax - 6, ly + (up ? -4 : 4));
				c.lineTo(ax, ly + (up ? -12 : 12));
				c.lineTo(ax + 6, ly + (up ? -4 : 4));
				c.closePath();
				c.fill();
			}

			this.drawFx(t);
		}

		drawTap(p) {
			const c = this.ctx;
			c.fillStyle = palette.tap;
			c.strokeStyle = palette.outline;
			c.lineWidth = 2.5;
			c.beginPath();
			c.arc(p.x, p.y, this.r * 0.62, 0, Math.PI * 2);
			c.fill();
			c.stroke();
			c.fillStyle = palette.field;
			c.beginPath();
			c.arc(p.x, p.y, this.r * 0.2, 0, Math.PI * 2);
			c.fill();
		}

		/* How long before its time a note is at full strength with its ring closing: half a sweep, at least 0.55 s. */
		approach() {
			return Math.max(0.55, Math.min(1.1, this.page.length * 0.5));
		}

		/* How long before its time a note first shows, dimmed: a full sweep, and always more than the approach. */
		lead() {
			return Math.max(this.page.length, this.approach() + 0.4);
		}

		/* Key lanes: faint dividers and each lane's key along the bottom edge, under the notes. */
		drawLanes() {
			const c = this.ctx;
			const count = this.lanes.length;
			const width = (this.w - 2 * this.padX) / count;
			c.strokeStyle = palette.grid;
			c.lineWidth = 1;
			c.setLineDash([2, 6]);
			for (let i = 1; i < count; i++) {
				const x = Math.round(this.padX + i * width) + 0.5;
				c.beginPath();
				c.moveTo(x, 0);
				c.lineTo(x, this.h);
				c.stroke();
			}
			c.setLineDash([]);
			c.font = "bold 12px sans-serif";
			c.textAlign = "center";
			c.textBaseline = "bottom";
			c.fillStyle = palette.laneKey;
			for (let i = 0; i < count; i++) c.fillText(this.lanes[i], this.padX + (i + 0.5) * width, this.h - 3);
		}

		drawKey(p, label) {
			const c = this.ctx;
			c.globalAlpha = 1;
			c.fillStyle = palette.field;
			c.beginPath();
			c.arc(p.x, p.y, this.r * 0.36, 0, Math.PI * 2);
			c.fill();
			c.fillStyle = palette.text;
			c.font = `bold ${Math.round(this.r * 0.5)}px sans-serif`;
			c.textAlign = "center";
			c.textBaseline = "middle";
			c.fillText(label, p.x, p.y + 1);
		}

		/* Drag chains: a dotted path from each drag note to the next close one on the same page. */
		drawChains(items) {
			const c = this.ctx;
			const drags = items.filter(i => i.n.type === "drag" && i.alpha > 0).sort((a, b) => a.n.t - b.n.t);
			c.strokeStyle = palette.drag;
			c.lineWidth = 2;
			c.setLineDash([3, 5]);
			for (let k = 1; k < drags.length; k++) {
				const a = drags[k - 1];
				const b = drags[k];
				if (a.p.page !== b.p.page || b.n.t - a.n.t > 700) continue;
				c.globalAlpha = Math.min(a.alpha, b.alpha);
				c.beginPath();
				c.moveTo(a.p.x, a.p.y);
				c.lineTo(b.p.x, b.p.y);
				c.stroke();
			}
			c.setLineDash([]);
			c.globalAlpha = 1;
		}

		drawDrag(p) {
			const c = this.ctx;
			const s = this.r * 0.5;
			c.fillStyle = palette.drag;
			c.strokeStyle = palette.outline;
			c.lineWidth = 2;
			c.beginPath();
			c.moveTo(p.x, p.y - s);
			c.lineTo(p.x + s, p.y);
			c.lineTo(p.x, p.y + s);
			c.lineTo(p.x - s, p.y);
			c.closePath();
			c.fill();
			c.stroke();
		}

		/* A hold: a square head and a bar to where the line will be when it ends (clipped at the page edge). */
		drawHold(n, p, t, state, editing) {
			const c = this.ctx;
			const r = this.r;
			const endT = (n.t + n.d) / 1000;
			const end = A().lineAt(this.song, endT);
			let endY = this.py(end.y);
			if (end.page !== p.page) endY = this.py(p.page % 2 === 0 ? 0 : 1);
			const top = Math.min(p.y, endY);
			const height = Math.abs(endY - p.y);
			c.fillStyle = "rgba(255, 187, 51, 0.35)";
			c.fillRect(p.x - r * 0.35, top, r * 0.7, height);
			c.strokeStyle = palette.hold;
			c.lineWidth = 2;
			c.strokeRect(p.x - r * 0.35, top, r * 0.7, height);
			/* Progress while held: the bar fills behind the line. */
			if (!editing && state && state.holding) {
				const lineY = this.py(A().lineAt(this.song, Math.min(t, endT)).y);
				c.fillStyle = palette.hold;
				c.fillRect(p.x - r * 0.35, Math.min(p.y, lineY), r * 0.7, Math.abs(lineY - p.y));
			}
			const s = r * 0.58;
			c.fillStyle = palette.hold;
			c.strokeStyle = palette.outline;
			c.lineWidth = 2.5;
			c.fillRect(p.x - s, p.y - s, 2 * s, 2 * s);
			c.strokeRect(p.x - s, p.y - s, 2 * s, 2 * s);
			c.fillStyle = palette.field;
			c.fillRect(p.x - s * 0.3, p.y - s * 0.3, s * 0.6, s * 0.6);
			/* Held: a bright frame round the head for as long as the press counts. */
			if (!editing && state && state.holding) {
				c.strokeStyle = palette.perfect;
				c.lineWidth = 3;
				c.strokeRect(p.x - s - 4, p.y - s - 4, 2 * s + 8, 2 * s + 8);
			}
		}

		/* First note index with t >= ms (binary search). */
		firstIndex(ms) {
			let lo = 0;
			let hi = this.notes.length;
			while (lo < hi) {
				const mid = (lo + hi) >> 1;
				if (this.notes[mid].t < ms) lo = mid + 1;
				else hi = mid;
			}
			return lo;
		}

		/* A judgement word where the note was, and a ring for hits unless effects are reduced. */
		effect(x, y, result, t) {
			this.fx.push({ x, y, result, t });
			if (this.fx.length > 24) this.fx.shift();
		}

		drawFx(t) {
			const c = this.ctx;
			c.textAlign = "center";
			c.textBaseline = "middle";
			c.font = `bold ${Math.round(this.r * 0.62)}px sans-serif`;
			this.fx = this.fx.filter(f => t - f.t < 0.45 && t >= f.t - 0.05);
			for (const f of this.fx) {
				const k = (t - f.t) / 0.45;
				c.globalAlpha = 1 - k;
				const colour = palette[f.result];
				if (!this.reduced && f.result !== "miss") {
					c.strokeStyle = colour;
					c.lineWidth = 3;
					c.beginPath();
					c.arc(f.x, f.y, this.r * (0.8 + k * 0.9), 0, Math.PI * 2);
					c.stroke();
				}
				c.fillStyle = colour;
				const label = f.result === "perfect" ? "Perfect" : f.result === "good" ? "Good" : "Miss";
				/* Above the note, or below it when the note is at the top edge, so the word is never cut off. */
				const rise = this.r * (1.4 + (this.reduced ? 0 : k * 0.5));
				const ty = f.y - rise < this.r * 0.5 ? f.y + rise : f.y - rise;
				c.fillText(label, Math.max(this.r * 1.6, Math.min(this.w - this.r * 1.6, f.x)), ty);
			}
			c.globalAlpha = 1;
		}
	}

	/* ---- a play of one chart ---- */

	class Play {
		/* opts: { canvas, song, notes, level, audio, offsetMs, reduced, keyboard, onHud(stats, result), onEnd(result), and
		 * optionally win (judgement windows) and endAt (seconds: play on at least this long) } */
		constructor(opts) {
			Object.assign(this, opts);
			this.win = this.win || windows[this.level];
			this.clock = new Clock(this.audio);
			this.field = new Field({ canvas: this.canvas, song: this.song, notes: this.notes, reduced: this.reduced });
			this.state = new Map(); // note -> { done, result, at, holding, pointer, start }
			this.stats = { perfect: 0, good: 0, miss: 0, combo: 0, maxCombo: 0, errors: [] };
			this.total = this.notes.length;
			this.lastNoteEnd = this.notes.reduce((m, n) => Math.max(m, (n.t + (n.d || 0)) / 1000), 0);
			this.raf = 0;
			this.running = false;
			this.keysDown = new Map();
		}

		/* Chart time: the music clock minus the player's offset and the song's own. */
		time() {
			return this.clock.now() - this.offsetMs / 1000;
		}

		start() {
			this.running = true;
			this.loop();
		}

		stop() {
			this.running = false;
			cancelAnimationFrame(this.raf);
			this.raf = 0;
		}

		/* Static frame (countdown, pause): drawn at the given time without judging anything. */
		still(t) {
			this.field.draw(t, { judged: this.state });
		}

		loop = () => {
			this.raf = 0;
			if (!this.running) return;
			if (!this.canvas.isConnected) {
				this.stop();
				return;
			}
			const t = this.time();
			this.update(t);
			this.field.draw(t, { judged: this.state });
			if (t > Math.max(this.lastNoteEnd + 1.2, this.endAt || 0) || this.audio.ended) {
				this.finish();
				return;
			}
			this.raf = requestAnimationFrame(this.loop);
		};

		judge(note, result, t, errorMs) {
			const s = this.state.get(note) || {};
			s.done = true;
			s.result = result;
			s.at = t;
			s.holding = false;
			this.state.set(note, s);
			this.stats[result]++;
			if (result === "miss") this.stats.combo = 0;
			else {
				this.stats.combo++;
				this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.combo);
				if (Number.isFinite(errorMs)) this.stats.errors.push(errorMs);
			}
			const p = this.field.pos(note);
			this.field.effect(p.x, p.y, result, t);
			if (result !== "miss") setup.consoleSfx?.play(result === "perfect" ? "rhythm-perfect" : "rhythm-good");
			this.onHud(this.summary(), result);
		}

		/* Per frame: misses for notes the line has passed, drags touched in time, and holds that finish. */
		update(t) {
			const ms = t * 1000;
			const w = this.win;
			const start = this.field.firstIndex(ms - 70000);
			for (let i = start; i < this.notes.length; i++) {
				const n = this.notes[i];
				if (n.t > ms + w.miss) break;
				const s = this.state.get(n);
				if (s && s.done) continue;
				if (n.type === "hold" && s && s.holding) {
					if (ms >= n.t + n.d) this.judge(n, s.start, t, s.error);
					continue;
				}
				if (n.type === "drag") {
					/* Being on the note as the line arrives is enough: a drag never needs its own tap, and a finger already
					 * resting there scores Perfect once the line reaches it. */
					if (ms >= n.t - w.perfect && ms <= n.t + w.good && (this.touching(n) || this.laneHeld(n))) {
						this.judge(n, ms <= n.t + w.perfect ? "perfect" : "good", t);
						continue;
					}
					if (ms > n.t + w.good) this.judge(n, "miss", t);
					continue;
				}
				if (ms > n.t + w.good) this.judge(n, "miss", t);
			}
		}

		/* Is any finger or held mouse button near this note's position right now? */
		touching(note) {
			if (!this.pointers.size) return false;
			const p = this.field.pos(note);
			const reach = this.reach();
			for (const q of this.pointers.values()) if (Math.hypot(q.sx - p.x, q.sy - p.y) <= reach * 1.5) return true;
			return false;
		}

		/* Is a lane key held over this note's lane, or the lane either side? Drag chains slide across lanes, so a held key
		 * covers its neighbours and a chain is played by rolling from key to key. */
		laneHeld(note) {
			if (!this.keysDown.size) return false;
			const lane = laneOf(note.x);
			for (const held of this.keysDown.values()) if (Math.abs(held - lane) <= 1) return true;
			return false;
		}

		reach() {
			return Math.max(30, this.field.r * 1.35);
		}

		get pointers() {
			return this.field.pointers;
		}

		/* A press: `at` is { sx, sy, mouse } for a pointer, or { lane } for a lane key. Of the notes it reaches (near the
		 * point, or in the lane), the earliest still hittable wins, so a press never skips a note to take the one after;
		 * a press more than the Good window early (but inside the Miss window) misses, so mashing does not pay.
		 * Notes due at the same moment: a lane key takes every one in its lane (two notes can share a lane in an edited
		 * chart, and one key cannot press twice at once), and a mouse click takes the whole pair, because a mouse cannot
		 * click two places at once. Touch and separate keys hit pairs the real way. */
		press(id, at) {
			const t = this.time();
			const ms = t * 1000;
			const w = this.win;
			const reach = this.reach();
			const reaches = n => {
				if (at.lane !== undefined) return laneOf(n.x) === at.lane ? 0 : -1;
				const p = this.field.pos(n);
				const d = Math.hypot(at.sx - p.x, at.sy - p.y);
				return d <= reach ? d : -1;
			};
			const open = n => {
				if (n.type === "drag") return false;
				const s = this.state.get(n);
				return !(s && (s.done || s.holding));
			};
			let best = null;
			let bestD = Infinity;
			let early = null;
			const start = this.field.firstIndex(ms - w.good - 70000);
			for (let i = start; i < this.notes.length; i++) {
				const n = this.notes[i];
				if (n.t > ms + w.miss) break;
				if (!open(n) || ms - n.t > w.good) continue;
				const d = reaches(n);
				if (d < 0) continue;
				if (n.t - ms > w.good) {
					if (!early) early = n;
					continue;
				}
				/* Earliest first; notes at the same moment go to the nearer one. */
				if (!best || n.t < best.t || (n.t === best.t && d < bestD)) {
					best = n;
					bestD = d;
				}
			}
			if (!best && early) {
				this.judge(early, "miss", t, NaN);
				return;
			}
			if (!best) return;
			const err = ms - best.t;
			const result = Math.abs(err) <= w.perfect ? "perfect" : "good";
			const together = [best];
			if (at.lane !== undefined || at.mouse) {
				for (let i = this.field.firstIndex(best.t - 10); i < this.notes.length && this.notes[i].t <= best.t + 10; i++) {
					const n = this.notes[i];
					if (n !== best && open(n) && (at.mouse || laneOf(n.x) === at.lane)) together.push(n);
				}
			}
			for (const n of together) {
				if (n.type === "hold") {
					this.state.set(n, { holding: true, pointer: id, start: result, error: err });
					setup.consoleSfx?.play("rhythm-good");
					this.onHud(this.summary(), "hold");
				} else this.judge(n, result, t, err);
			}
		}

		/* A finger or key let go: a hold released before its end is downgraded (Good past 60%, else a miss). */
		release(id) {
			const t = this.time();
			const ms = t * 1000;
			for (const [n, s] of this.state) {
				if (!s.holding || s.pointer !== id) continue;
				const progress = (ms - n.t) / n.d;
				if (progress >= 0.6 && ms >= n.t + n.d - this.win.good) this.judge(n, s.start, t, s.error);
				else this.judge(n, progress >= 0.6 ? "good" : "miss", t, progress >= 0.6 ? s.error : NaN);
			}
		}

		/* Pausing releases inputs at their actual progress; it must not finish a hold that has barely started. */
		settleInputs() {
			for (const s of this.state.values()) if (s.holding) this.release(s.pointer);
			this.pointers.clear();
			this.keysDown.clear();
		}

		summary() {
			const done = this.stats.perfect + this.stats.good + this.stats.miss;
			const value = this.stats.perfect + this.stats.good * goodValue;
			return {
				score: this.total ? Math.round((value / this.total) * 1000000) : 0,
				acc: done ? Math.round((value / done) * 10000) / 100 : 100,
				combo: this.stats.combo,
				progress: this.total ? done / this.total : 0,
			};
		}

		finish() {
			this.stop();
			/* Anything left unjudged (the song ended early) is a miss. */
			for (const n of this.notes) if (!this.state.get(n)?.done) this.judge(n, "miss", this.time());
			const value = this.stats.perfect + this.stats.good * goodValue;
			const acc = this.total ? Math.round((value / this.total) * 10000) / 100 : 0;
			const errors = this.stats.errors;
			const meanError = errors.length >= 8 ? Math.round(errors.reduce((a, b) => a + b, 0) / errors.length) : null;
			this.onEnd({
				score: this.total ? Math.round((value / this.total) * 1000000) : 0,
				acc,
				grade: gradeOf(acc),
				cleared: acc >= clearAt,
				fc: this.total > 0 && this.stats.miss === 0,
				ap: this.total > 0 && this.stats.perfect === this.total,
				perfect: this.stats.perfect,
				good: this.stats.good,
				miss: this.stats.miss,
				maxCombo: this.stats.maxCombo,
				total: this.total,
				meanError,
			});
		}
	}

	setup.rhythm = Object.freeze({
		achievements,
		challenges,
		challengeStatus,
		stats,
		daily,
		dailyMet,
		masterFeat,
		finishTutorial,
		defaultKeys,
		reservedKeys,
		keyAllowed,
		laneOf,
		data,
		settings,
		setSetting,
		record,
		gradeOf,
		clearAt,
		windows,
		palette,
		Clock,
		Field,
		Play,
	});
})();
