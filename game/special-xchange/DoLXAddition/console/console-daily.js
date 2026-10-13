/* globals statChange earnFeat formatMoney */
/* Shared by the console games: UTC day, seeded random, money and feats. Money is paid through
 * statChange.money() (source "consoleGames"); callers write their claim in the same step, so nothing pays twice. */
(() => {
	/* Daily money in pennies, paid once per UTC day per game. */
	const dailyMoney = Object.freeze({
		fruit: Object.freeze({ easy: 20000, medium: 35000, hard: 50000 }),
		pet: Object.freeze({ easy: 20000, medium: 35000, hard: 50000 }),
		outbreak: Object.freeze({ easy: 20000, medium: 35000, hard: 50000 }),
		/* The rhythm game's own levels: easy, normal, hard. Built-in songs only. */
		rhythm: Object.freeze({ easy: 20000, normal: 35000, hard: 50000 }),
	});

	/* The Level 3 feat each game gives for finishing everything (setup.feats): the Fruit game's for all its achievements,
	 * the others' (Virtual Pet, Outbreak, Rhythm) for completing every challenge. */
	const feats = Object.freeze({ fruit: "Fruit Master", pet: "Champion Tamer", outbreak: "Patient Zero", rhythm: "Rhythm Master" });

	/* How many daily records each game keeps (older days are dropped). */
	const keepDays = 30;

	const utcDate = (now = new Date()) => now.toISOString().slice(0, 10);

	/* Whole days from `date` (YYYY-MM-DD) to today; negative for a date in the future. */
	const daysAgo = (date, today = utcDate()) => Math.round((Date.parse(today + "T00:00:00Z") - Date.parse(date + "T00:00:00Z")) / 86400000);

	/* "5 h 12 min" until the next UTC midnight, when every daily changes. */
	function untilReset(now = new Date()) {
		const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
		const mins = Math.max(1, Math.ceil((next - now.getTime()) / 60000));
		return mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
	}

	/* 32-bit FNV-1a: a stable seed from a string. */
	function hash(text) {
		let h = 0x811c9dc5;
		for (let i = 0; i < text.length; i++) {
			h ^= text.charCodeAt(i);
			h = Math.imul(h, 0x01000193);
		}
		return h >>> 0;
	}

	/* mulberry32. `holder[key]` keeps the state, so a generator stored in a save carries on where it stopped. */
	function seeded(holder, key = "rng") {
		return () => {
			let t = (holder[key] = (holder[key] + 0x6d2b79f5) >>> 0);
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	/* Pays `amount` pennies of DoL money. Returns the amount paid (0 for nothing). */
	function pay(amount) {
		if (!Number.isFinite(amount) || amount <= 0) return 0;
		statChange.money(amount, "consoleGames", { divineTfAdjusted: true, animalTfAdjusted: true });
		return amount;
	}

	/* Keeps the newest `keepDays` entries of a { "YYYY-MM-DD": record } object. */
	function prune(records) {
		const dates = Object.keys(records).sort();
		for (const old of dates.slice(0, Math.max(0, dates.length - keepDays))) delete records[old];
	}

	const levelName = level => (level ? level[0].toUpperCase() + level.slice(1) : "");

	/* The difficulty label: the word itself, with DoL's own green / gold / red on top. */
	const levelClass = { easy: "green", medium: "gold", hard: "red" };
	const chip = level => `<span class="con-diff ${levelClass[level] || ""}">${levelName(level)}</span>`;

	/* "earned" (in this save), "blocked" (DoL's feat rules are off for this save: cheats, debug, soft mode or similar), or
	 * "open". */
	function featState(name) {
		if (V.feats && V.feats.currentSave && V.feats.currentSave[name] !== undefined) return "earned";
		const f = V.feats || {};
		if (f.locked || V.cheatsEnabled === true || V.debug || V.gamemode === "soft" || V.settings?.allureModifier < 1 || V.statFreeze) return "blocked";
		return "open";
	}

	/* Earns feat `name` through DoL's own earnFeat (which shows its banner and keeps it to once per save). Returns true
	 * only when this call earned it. */
	function earnFeatOnce(name) {
		if (typeof earnFeat !== "function" || !V.feats || !V.feats.currentSave || V.feats.currentSave[name] !== undefined) return false;
		earnFeat(name);
		return V.feats.currentSave[name] !== undefined;
	}

	/* The feat card on a challenge page: coin, name, how to earn it, and where the player stands. */
	function featCard(name, done, total) {
		const state = featState(name);
		let line;
		if (state === "earned") line = '<span class="green">Earned in this save.</span>';
		else if (state === "blocked") line = "Feats can't be earned in this save (cheats, debug, or soft mode are on).";
		else line = done >= total ? "All done." : `${total - done} to go.`;
		return (
			`<div class="con-feat${state === "earned" ? " con-feat--earned" : ""}"><img class="con-feat-coin" src="img/ui/coin-gold.gif" alt="" aria-hidden="true">` +
			`<div class="con-feat-text"><span class="con-feat-title">${name}, a Level 3 feat</span><span>Complete all ${total} challenges to earn it. ${line}</span></div></div>`
		);
	}

	/* A DoL icon (img/misc/icon/...), or nothing when the player has images turned off. */
	const icon = path => (V.options && V.options.images ? `<img class="icon" src="img/misc/icon/${path}" alt="">` : "");

	/* "Earlier days" under a daily panel: the last week of records except today. `best(record)` words a best result. */
	function history(records, today, best) {
		const rows = Object.keys(records || {})
			.filter(date => date !== today)
			.sort()
			.reverse()
			.slice(0, 7);
		if (!rows.length) return "";
		const li = rows.map(date => {
			const r = records[date];
			return (
				`<li><span>${date}</span><span>${r.done ? "Completed" : "Not completed"}</span>` +
				`<span>${r.best !== null && r.best !== undefined ? best(r) : "no win"}</span><span>${r.paid ? formatMoney(r.paid) : ""}</span></li>`
			);
		});
		return `<h4 class="con-subhead">Earlier days</h4><ul class="con-history">${li.join("")}</ul>`;
	}

	setup.consoleDaily = Object.freeze({
		icon,
		history,
		dailyMoney,
		feats,
		keepDays,
		utcDate,
		daysAgo,
		untilReset,
		hash,
		seeded,
		pay,
		prune,
		levelName,
		chip,
		featState,
		earnFeatOnce,
		featCard,
	});
})();
