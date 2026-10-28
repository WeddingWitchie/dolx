/* Fruit game data: challenges, daily templates, achievements, jar themes, help text. Tiers are fruit indexes, 0 Cherry
 * to 10 Watermelon. Challenge: { id, name, diff, rules "classic"|"arcade", noAbilities?, drops?, goal: { type, n } };
 * goal types are score, tier, merges, chain and survive. */
(() => {
	const settleMs = 3000;

	const challenges = Object.freeze(
		[
			{ id: "first-steps", name: "First Steps", diff: "easy", rules: "classic", drops: 40, goal: { type: "score", n: 200 } },
			{ id: "busy-hands", name: "Busy Hands", diff: "easy", rules: "classic", drops: 30, goal: { type: "merges", n: 15 } },
			{ id: "apple-picking", name: "Apple Picking", diff: "easy", rules: "classic", drops: 30, goal: { type: "tier", n: 5 } },
			{ id: "steady-stack", name: "Steady Stack", diff: "medium", rules: "classic", goal: { type: "survive", n: 100 } },
			{ id: "pear-shaped", name: "Pear Shaped", diff: "medium", rules: "classic", drops: 40, goal: { type: "tier", n: 6 } },
			{ id: "ripple", name: "Ripple Effect", diff: "medium", rules: "arcade", drops: 70, goal: { type: "chain", n: 4 } },
			{ id: "bare-hands", name: "Bare Hands", diff: "medium", rules: "arcade", noAbilities: true, drops: 70, goal: { type: "score", n: 550 } },
			{ id: "pineapple-express", name: "Pineapple Express", diff: "hard", rules: "arcade", drops: 100, goal: { type: "tier", n: 8 } },
			{ id: "score-rush", name: "Score Rush", diff: "hard", rules: "arcade", drops: 100, goal: { type: "score", n: 950 } },
			{ id: "cascade", name: "Cascade", diff: "hard", rules: "arcade", goal: { type: "chain", n: 5 } },
			{ id: "the-big-one", name: "The Big One", diff: "hard", rules: "classic", goal: { type: "tier", n: 10 } },
		].map(c => Object.freeze(c))
	);

	const fruitName = tier => setup.suika.fruits[tier].name;

	/* The goal and the limits apart, for the daily panel: { goal, drops, rules }. */
	function describeParts(c) {
		const g = c.goal;
		let goal;
		if (g.type === "score") goal = `Score ${g.n} points`;
		else if (g.type === "tier") goal = `Make a${/^[AEIOU]/.test(fruitName(g.n)) ? "n" : ""} ${fruitName(g.n)}`;
		else if (g.type === "merges") goal = `Make ${g.n} merges`;
		else if (g.type === "chain") goal = `Make a ${g.n}-merge chain from one drop`;
		else goal = `Drop ${g.n} fruit without the pile ending the run`;
		const rules = c.rules === "arcade" ? (c.noAbilities ? "Arcade combo points, no power-ups" : "Arcade rules, power-ups allowed") : "Classic rules";
		return { goal, drops: c.drops && g.type !== "survive" ? c.drops : null, rules };
	}

	/* One line saying what the goal is, for lists and the in-run goal strip. */
	function describe(c) {
		const p = describeParts(c);
		let text = p.goal + (p.drops ? ` within ${p.drops} drops` : "");
		if (c.rules === "arcade") text += ". " + p.rules;
		return text + ".";
	}

	/* Where a run stands on its challenge: { value, target, done, failed, text }. `run` is the game. */
	function evaluate(c, run) {
		const g = c.goal;
		let value;
		if (g.type === "score") value = run.score;
		else if (g.type === "tier") value = Math.max(-1, run.runInfo.largest);
		else if (g.type === "merges") value = run.mergeCount;
		else if (g.type === "chain") value = run.runInfo.maxChain;
		else value = run.drops;
		const limit = g.type === "survive" ? g.n : c.drops;
		/* The run waits settleMs after its last allowed drop, so merges already under way still count. */
		const settled = !!limit && run.drops >= limit && run.time - run.lastDropAt >= settleMs;
		const done = g.type === "survive" ? settled && !run.over : value >= g.n;
		const failed = !done && (settled || (run.over && run.endReason !== "won"));
		let text;
		if (g.type === "tier") text = value >= 0 ? `Biggest: ${fruitName(value)}` : "Biggest: none yet";
		else if (g.type === "survive") text = `Dropped ${Math.min(value, g.n)} / ${g.n}`;
		else text = `${g.type === "score" ? "Score" : g.type === "merges" ? "Merges" : "Best chain"} ${Math.min(value, g.n)} / ${g.n}`;
		if (c.drops && g.type !== "survive") text += ` · Drops ${run.drops} / ${c.drops}`;
		const fraction = g.type === "tier" ? Math.max(0, value + 1) / (g.n + 1) : Math.min(1, value / g.n);
		return { done, failed, text, fraction: Math.min(1, fraction) };
	}

	/* ---- daily challenge ----
	 * The UTC date seeds the template, numbers and fruit sequence; `level` lines up with `n` and sets the reward. */
	const dailyTemplates = Object.freeze([
		{ type: "score", rules: "classic", n: [250, 350, 450], level: ["easy", "medium", "hard"], drops: [55, 65] },
		{ type: "score", rules: "arcade", n: [400, 500, 600], level: ["easy", "medium", "hard"], drops: [60, 75] },
		{ type: "tier", rules: "classic", n: [6], level: ["medium"], drops: [35, 45] },
		{ type: "tier", rules: "arcade", n: [7], level: ["hard"], drops: [60, 80] },
		{ type: "merges", rules: "classic", n: [20, 25], level: ["easy", "medium"], drops: [35, 45] },
		{ type: "chain", rules: "arcade", n: [3, 4], level: ["easy", "medium"], drops: [70, 90] },
	]);

	function utcDate(now = new Date()) {
		return now.toISOString().slice(0, 10);
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

	function daily(date = utcDate()) {
		const rng = setup.suika.makeRng(hash("fruit-daily-" + date));
		const pick = list => list[Math.floor(rng.next() * list.length)];
		const t = pick(dailyTemplates);
		/* Same draws in the same order as before levels existed, so every date keeps its challenge. */
		const drops = pick(t.drops);
		const i = Math.floor(rng.next() * t.n.length);
		const c = {
			id: "daily-" + date,
			date,
			name: "Daily challenge",
			diff: "daily",
			level: t.level[i],
			reward: setup.consoleDaily.dailyMoney.fruit[t.level[i]],
			rules: t.rules,
			noAbilities: !!t.noAbilities,
			drops,
			goal: { type: t.type, n: t.n[i] },
			seed: hash("fruit-daily-drops-" + date),
		};
		return Object.freeze(c);
	}

	/* ---- achievements ----
	 * check(ctx) runs on game events; ctx is { type, game, data, stats } where stats is the saved totals plus this run's
	 * tally. icon is { fruit: tier } (drawn with the fruit art) or { glyph: name } from `glyphs`. reward names a theme. */
	const glyphs = Object.freeze({
		trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M9 20h6M10 17h4"/>',
		chain: '<path d="M10 14a4 4 0 0 1 0-5.6l2-2a4 4 0 0 1 5.6 5.6l-1 1"/><path d="M14 10a4 4 0 0 1 0 5.6l-2 2a4 4 0 0 1-5.6-5.6l1-1"/>',
		jar: '<path d="M9 3h6M10 3v3L7 10v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9l-3-4V3"/><path d="M3 9v6M21 9v6"/>',
		wand: '<path d="M4 20L14 10"/><path d="M17 3l1 2.3 2.4.4-1.8 1.6.5 2.4L17 8.5l-2.1 1.2.5-2.4-1.8-1.6 2.4-.4z"/>',
		kit: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V5h6v3M3 13h18"/>',
		flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
		calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
		hand: '<path d="M7 11V6a1.5 1.5 0 0 1 3 0v4M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V11M16 11V8a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-2.5-4a1.5 1.5 0 0 1 2.5-1.6L7 14"/>',
		bowl: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 11c0-3 2-5 4-5M13 11c0-2 1.5-4 4-4M7 20h10"/>',
		basket: '<path d="M3 10h18l-2 10H5z"/><path d="M8 10l3-6M16 10l-3-6M9 14v3M12 14v3M15 14v3"/>',
		crown: '<path d="M4 18h16M5 15l-1-9 5 4 3-6 3 6 5-4-1 9z"/>',
		joystick: '<rect x="4" y="15" width="16" height="5" rx="1.5"/><path d="M12 15V8"/><circle cx="12" cy="6" r="2.5"/><path d="M16.5 17.5h1"/>',
		rise: '<path d="M4 20h16"/><path d="M5 16l5-5 3 3 6-7"/><path d="M15 7h4v4"/>',
		dominoes:
			'<rect x="3" y="9" width="5" height="11" rx="1" transform="rotate(-18 5.5 14.5)"/><rect x="10" y="7" width="5" height="11" rx="1" transform="rotate(-9 12.5 12.5)"/><rect x="16" y="6" width="5" height="12" rx="1"/>',
		gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-6"/><path d="M4 17h2M18 17h2M12 7v2"/>',
		waves:
			'<path d="M9 3h6M10 3v3L7 10v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9l-3-4V3"/><path d="M3 12c1-1.5 2-1.5 3 0M18 12c1-1.5 2-1.5 3 0M3 16c1-1.5 2-1.5 3 0M18 16c1-1.5 2-1.5 3 0"/>',
		flags: '<path d="M4 21V5h9l-1.5 3L13 11H4M14 21V8h6l-1.5 3 1.5 3h-6"/>',
		cup: '<path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3M12 13v4M8 20h8l-1-3h-6z"/><path d="M10.5 7.5l1 1 2-2"/>',
	});
	/* Achievement groups, in the order the Achievements page shows them. */
	const achievementGroups = Object.freeze([
		["fruit", "Fruit"],
		["score", "Scores"],
		["chain", "Chains and combos"],
		["power", "Power-ups"],
		["challenge", "Challenges"],
	]);

	const competitive = game => game.mode !== "tutorial";
	/* Each achievement's group and its own icon (count draws a small "x5" on a repeated fruit). */
	const look = {
		"merge-1": { group: "fruit", icon: { fruit: 1 } },
		apple: { group: "fruit", icon: { fruit: 5 } },
		pineapple: { group: "fruit", icon: { fruit: 8 } },
		melon: { group: "fruit", icon: { fruit: 9 } },
		watermelon: { group: "fruit", icon: { fruit: 10 } },
		"watermelon-5": { group: "fruit", icon: { fruit: 10, count: 5 } },
		"score-500": { group: "score", icon: { glyph: "bowl" } },
		"score-1500": { group: "score", icon: { glyph: "basket" } },
		"classic-2500": { group: "score", icon: { glyph: "crown" } },
		"arcade-3000": { group: "score", icon: { glyph: "joystick" } },
		"new-best": { group: "score", icon: { glyph: "rise" } },
		"chain-3": { group: "chain", icon: { glyph: "chain" } },
		"chain-5": { group: "chain", icon: { glyph: "dominoes" } },
		"combo-max": { group: "chain", icon: { glyph: "gauge" } },
		"shake-1": { group: "power", icon: { glyph: "jar" } },
		"shake-merge": { group: "power", icon: { glyph: "waves" } },
		"wand-1": { group: "power", icon: { glyph: "wand" } },
		"all-four": { group: "power", icon: { glyph: "kit" } },
		"pure-arcade": { group: "power", icon: { glyph: "hand" } },
		"challenge-1": { group: "challenge", icon: { glyph: "flag" } },
		"challenge-5": { group: "challenge", icon: { glyph: "flags" } },
		"challenge-all": { group: "challenge", icon: { glyph: "cup" } },
		"daily-1": { group: "challenge", icon: { glyph: "calendar" } },
	};
	/* Unlocking every achievement earns this DoL feat (setup.feats, Level 3), once, through earnFeat. */
	const masterFeat = "Fruit Master";

	const achievements = Object.freeze(
		[
			{ id: "merge-1", name: "First Merge", desc: "Merge two fruit.", icon: { fruit: 1 }, check: x => x.type === "merge" },
			{ id: "apple", name: "First Apple", desc: "Make an Apple.", icon: { fruit: 5 }, reward: "pastel", check: x => x.type === "merge" && x.data.tier >= 5 },
			{
				id: "pineapple",
				name: "First Pineapple",
				desc: "Make a Pineapple.",
				icon: { fruit: 8 },
				reward: "wood",
				check: x => x.type === "merge" && x.data.tier >= 8,
			},
			{ id: "melon", name: "First Melon", desc: "Make a Melon.", icon: { fruit: 9 }, check: x => x.type === "merge" && x.data.tier >= 9 },
			{ id: "watermelon", name: "First Watermelon", desc: "Make a Watermelon.", icon: { fruit: 10 }, check: x => x.type === "merge" && x.data.tier === 10 },
			{
				id: "watermelon-5",
				name: "Watermelon Expert",
				desc: "Make 5 Watermelons, across any runs.",
				icon: { fruit: 10 },
				check: x => x.stats.watermelons >= 5,
			},
			{ id: "score-500", name: "Fruit Salad", desc: "Score 500 points in one run.", icon: { glyph: "trophy" }, check: x => x.game.score >= 500 },
			{ id: "score-1500", name: "Big Harvest", desc: "Score 1,500 points in one run.", icon: { glyph: "trophy" }, check: x => x.game.score >= 1500 },
			{
				id: "classic-2500",
				name: "Classic Champion",
				desc: "Score 2,500 points in Classic.",
				icon: { glyph: "trophy" },
				check: x => x.game.mode === "classic" && x.game.score >= 2500,
			},
			{
				id: "arcade-3000",
				name: "Arcade Ace",
				desc: "Score 3,000 points in Arcade.",
				icon: { glyph: "trophy" },
				check: x => x.game.mode === "arcade" && x.game.score >= 3000,
			},
			{
				id: "new-best",
				name: "Personal Best",
				desc: "Beat your earlier best score in Classic or Arcade.",
				icon: { glyph: "trophy" },
				check: x => x.type === "end" && x.data.beatBest,
			},
			{
				id: "chain-3",
				name: "Chain Reaction",
				desc: "Make a 3-merge chain from one drop.",
				icon: { glyph: "chain" },
				check: x => x.type === "merge" && x.data.chain >= 3,
			},
			{
				id: "chain-5",
				name: "Domino Effect",
				desc: "Make a 5-merge chain from one drop.",
				icon: { glyph: "chain" },
				reward: "neon",
				check: x => x.type === "merge" && x.data.chain >= 5,
			},
			{
				id: "combo-max",
				name: "Maximum Combo",
				desc: "Earn the biggest combo bonus in Arcade.",
				icon: { glyph: "chain" },
				check: x => x.type === "merge" && x.data.bonus >= setup.suika.config.combo.maxBonus,
			},
			{ id: "shake-1", name: "Shake It Up", desc: "Use Shake.", icon: { glyph: "jar" }, check: x => x.type === "ability" && x.data.id === "shake" },
			{
				id: "shake-merge",
				name: "Good Shake",
				desc: "Make a merge with a Shake.",
				icon: { glyph: "jar" },
				check: x => x.type === "merge" && x.data.cause === "shake",
			},
			{
				id: "wand-1",
				name: "Abracadabra",
				desc: "Remove a fruit with the Magic Wand.",
				icon: { glyph: "wand" },
				check: x => x.type === "ability" && x.data.id === "wand",
			},
			{
				id: "all-four",
				name: "Full Toolkit",
				desc: "Use all four power-ups in one Arcade run.",
				icon: { glyph: "kit" },
				check: x => x.type === "ability" && Object.keys(x.game.runInfo.used).length >= 4,
			},
			{
				id: "pure-arcade",
				name: "No Tricks Needed",
				desc: "Finish an Arcade run with 500 or more points without using a power-up.",
				icon: { glyph: "hand" },
				check: x => x.type === "end" && x.game.mode === "arcade" && x.game.score >= 500 && !Object.keys(x.game.runInfo.used).length,
			},
			{ id: "challenge-1", name: "Challenger", desc: "Complete a challenge.", icon: { glyph: "flag" }, check: x => x.stats.challenges >= 1 },
			{ id: "challenge-5", name: "Seasoned", desc: "Complete 5 challenges.", icon: { glyph: "flag" }, check: x => x.stats.challenges >= 5 },
			{
				id: "challenge-all",
				name: "Every Challenge",
				desc: `Complete all ${challenges.length} challenges.`,
				icon: { glyph: "flag" },
				check: x => x.stats.challenges >= challenges.length,
			},
			{ id: "daily-1", name: "Daily Habit", desc: "Complete a daily challenge.", icon: { glyph: "calendar" }, check: x => x.stats.daily >= 1 },
		].map(a => Object.freeze({ ...a, ...look[a.id], check: x => competitive(x.game) && a.check(x) }))
	);

	/* ---- jar themes ----
	 * Board colours only. Every ink/halo pair keeps text readable on its board. */
	const themes = Object.freeze({
		dark: {
			name: "Original dark",
			bg: "#1c1824",
			inner: "#26202f",
			line: "#ff7878",
			warn: "#f5a623",
			guide: "rgb(255 255 255 / 22%)",
			ink: "#fff",
			halo: "rgb(20 14 28 / 90%)",
			accent: "#ffd84a",
			ring: "#444",
		},
		light: {
			name: "Light",
			bg: "#e7e2d9",
			inner: "#f5f1ea",
			line: "#c0392b",
			warn: "#a35c00",
			guide: "rgb(0 0 0 / 25%)",
			ink: "#1d1a17",
			halo: "rgb(255 255 255 / 90%)",
			accent: "#8a4b00",
			ring: "#b8b0a2",
		},
		pastel: {
			name: "Pastel",
			bg: "#f2dcef",
			inner: "#fbeefa",
			line: "#c2366e",
			warn: "#a34a00",
			guide: "rgb(120 40 90 / 30%)",
			ink: "#3a1530",
			halo: "rgb(255 255 255 / 90%)",
			accent: "#9b2667",
			ring: "#e0a9d2",
			reward: "apple",
		},
		wood: {
			name: "Wooden",
			bg: "#5b3a21",
			inner: "#76502f",
			line: "#ffb199",
			warn: "#ffcc66",
			guide: "rgb(255 240 220 / 30%)",
			ink: "#fff6e8",
			halo: "rgb(40 22 10 / 90%)",
			accent: "#ffd27a",
			ring: "#3b2412",
			reward: "pineapple",
		},
		neon: {
			name: "Arcade neon",
			bg: "#0b0b1a",
			inner: "#141032",
			line: "#ff3fd5",
			warn: "#ffb000",
			guide: "rgb(0 255 240 / 35%)",
			ink: "#fff",
			halo: "rgb(5 5 20 / 90%)",
			accent: "#3ff6ff",
			ring: "#3ff6ff",
			reward: "chain-5",
		},
		/* Used instead of the chosen theme when High contrast is on. */
		contrast: {
			name: "High contrast",
			bg: "#000",
			inner: "#000",
			line: "#ff3030",
			warn: "#ffb000",
			guide: "rgb(255 255 255 / 60%)",
			ink: "#fff",
			halo: "#000",
			accent: "#ffe600",
			ring: "#fff",
		},
	});

	/* ---- How to Play ---- */
	const help = Object.freeze([
		[
			"Dropping",
			[
				"Move along the top of the jar to aim. A line shows where the fruit will fall.",
				"Tap, click, or press Space to drop. There is a short wait before the next drop; the held fruit is faded until then.",
			],
		],
		[
			"Merging",
			[
				"Two of the same fruit that touch merge into the next fruit up.",
				"The order runs from Cherry to Watermelon, shown in the strip under the jar. Two Watermelons vanish together for a bonus.",
			],
		],
		["Scoring", ["Each merge scores the points of the fruit it makes: 1 for a Strawberry up to 55 for a Watermelon.", "Two Watermelons vanishing score 100."]],
		[
			"The red line",
			[
				"If the pile stays above the red line for 2.5 seconds, the run ends.",
				"The line turns amber when the pile gets close, and red with a countdown bar while it is over. A fruit just dropped or just made does not count for its first 1.2 seconds.",
			],
		],
		[
			"Modes",
			[
				"Classic: the plain game.",
				"Arcade: four power-ups with a few uses each, and bonus points for chains.",
				"Zen: no game over. When the pile stays over the line, the fruit above it are picked off. Session score only.",
				"Challenges and the Daily challenge: set goals, some with a drop limit. Open them from the Menu.",
			],
		],
		[
			"Power-ups (Arcade)",
			[
				"Shake: jolts the jar so fruit knock together. Fruit can bounce up over the line.",
				"Shuffle: swaps your held fruit for a different small one.",
				"Magic Wand: removes one of the five smallest fruit from the jar. Tap a ringed fruit, or press Cancel.",
				"Swap: trades your held fruit with the Next fruit.",
				"A use is only spent when the power-up actually does something.",
			],
		],
		[
			"Chains and combos",
			[
				"A chain is every merge that follows from one drop, Shake, or Wand pick.",
				"In Arcade, merge 2 of a chain adds +2, merge 3 adds +4, and so on up to +10 per merge.",
			],
		],
		[
			"Challenges",
			[
				"Each challenge has one goal. Some limit the drops: after the last drop the jar has 3 seconds to finish merging.",
				"Completed challenges stay ticked. The Daily challenge changes at midnight UTC and keeps your best score for the day.",
			],
		],
		[
			"Pause, restart, and save",
			[
				"Pause stops the jar. Restart asks for a second press during a run.",
				"Choose Back to the console, or choose Save and exit from the Menu, to keep your run for next time. Leaving by any other route ends the run.",
			],
		],
		[
			"Controls",
			[
				"Mouse: move to aim, click to drop.",
				"Touch: drag to aim, lift your finger to drop.",
				"Keyboard (with the jar focused): arrow keys or A and D to aim, Space or Enter to drop, P to pause. With the Wand: arrows pick a fruit, Enter removes it, Esc cancels.",
				"Esc also closes menu pages.",
			],
		],
	]);

	setup.suikaContent = Object.freeze({
		settleMs,
		challenges,
		describe,
		describeParts,
		evaluate,
		dailyTemplates,
		achievementGroups,
		masterFeat,
		daily,
		utcDate,
		hash,
		achievements,
		glyphs,
		themes,
		help,
	});
})();

/* Fruit game saved data, all in $suikaData (best scores stay in $suikaBest / $suikaBestArcade for older saves):
 *   { v, mode, tutorial, settings, stats, records { classic, arcade }, challenges { id: date },
 *     achievements { id: date }, daily { date: { best, done, tries, paid } }, run }
 * A running game counts in game.tally and folds it into stats only when the run ends, is saved or is thrown away,
 * so nothing is counted twice. */
(() => {
	const schema = 1;
	const recordLimit = 10;
	const dailyKeep = 30;
	const recordModes = ["classic", "arcade"];

	function defaults() {
		return {
			v: schema,
			mode: "classic",
			tutorial: false,
			settings: { sfx: 0.6, mute: false, music: true, haptics: false, motion: "auto", faces: true, simple: false, bold: false, contrast: false, theme: "dark" },
			stats: {
				runs: { classic: 0, arcade: 0, zen: 0, challenge: 0, daily: 0 },
				drops: 0,
				merges: 0,
				score: 0,
				largest: -1,
				watermelons: 0,
				bestChain: 0,
				abilities: 0,
				daily: 0,
				playMs: 0,
			},
			records: { classic: [], arcade: [] },
			challenges: {},
			achievements: {},
			daily: {},
			run: null,
		};
	}

	/* Fills anything an older or partial object lacks. Version 1 is the first schema, so this only adds defaults;
	 * later versions add their own steps before the version is raised. */
	function migrate(d) {
		const fill = (target, source) => {
			for (const [key, value] of Object.entries(source)) {
				if (target[key] === undefined || target[key] === null) target[key] = value;
				else if (value && typeof value === "object" && !Array.isArray(value) && typeof target[key] === "object") fill(target[key], value);
			}
		};
		const def = defaults();
		delete def.run;
		fill(d, def);
		if (d.run === undefined) d.run = null;
		d.v = schema;
	}

	/* The saved progression, created on first use. */
	function data() {
		let d = V.suikaData;
		if (!d || typeof d !== "object" || Array.isArray(d)) d = V.suikaData = defaults();
		else if (d.v !== schema) migrate(d);
		return d;
	}

	function settings() {
		return data().settings;
	}

	/* Saves one setting at once (a DoL save made right after keeps it) and redraws the running game. */
	function setSetting(key, value) {
		data().settings[key] = value;
		updateMoment();
		const game = setup.suika.current;
		if (game) game.applySettings();
	}

	function newTally() {
		return { drops: 0, merges: 0, largest: -1, watermelons: 0, bestChain: 0, abilities: 0, playMs: 0 };
	}

	const challengeCount = d => setup.suikaContent.challenges.filter(c => d.challenges[c.id]).length;

	/* Saved totals plus the running game's tally, for achievement checks. */
	function totals(game) {
		const d = data();
		const s = d.stats;
		const t = game ? game.tally : newTally();
		return {
			drops: s.drops + t.drops,
			merges: s.merges + t.merges,
			watermelons: s.watermelons + t.watermelons,
			abilities: s.abilities + t.abilities,
			challenges: challengeCount(d),
			daily: s.daily,
		};
	}

	function checkAchievements(game, type, payload) {
		if (game.mode === "tutorial") return;
		const d = data();
		const ctx = { type, game, data: payload || {}, stats: totals(game) };
		for (const a of setup.suikaContent.achievements) {
			if (d.achievements[a.id] || !a.check(ctx)) continue;
			d.achievements[a.id] = setup.suikaContent.utcDate();
			game.onAchievement(a);
			if (masterFeat()) game.onFeat(setup.suikaContent.masterFeat);
		}
	}

	/* The Fruit Master feat: earned through DoL's own earnFeat once every achievement is unlocked (setup.consoleDaily
	 * keeps it to once per save and lets DoL's feat rules decide whether it can be earned at all). Returns true only
	 * when this call earned it. */
	function masterFeat() {
		const d = data();
		return setup.suikaContent.achievements.every(a => d.achievements[a.id]) && setup.consoleDaily.earnFeatOnce(setup.suikaContent.masterFeat);
	}

	/* "earned", "blocked" (DoL's feat rules are off for this save) or "open". */
	const masterFeatState = () => setup.consoleDaily.featState(setup.suikaContent.masterFeat);

	/* Game events: drop { tier }, merge { tier (null when watermelons vanish), chain, bonus, cause }, ability { id }. */
	function event(game, type, payload) {
		if (game.mode === "tutorial") return;
		const t = game.tally;
		if (type === "drop") t.drops++;
		else if (type === "merge") {
			t.merges++;
			if (payload.tier !== null) {
				t.largest = Math.max(t.largest, payload.tier);
				if (payload.tier === setup.suika.fruits.length - 1) t.watermelons++;
			}
			t.bestChain = Math.max(t.bestChain, payload.chain || 0);
		} else if (type === "ability") t.abilities++;
		checkAchievements(game, type, payload);
	}

	/* Folds the game's tally into the saved totals and zeroes it. */
	function commit(game) {
		if (game.mode === "tutorial") return;
		const s = data().stats;
		const t = game.tally;
		s.drops += t.drops;
		s.merges += t.merges;
		s.largest = Math.max(s.largest, t.largest);
		s.watermelons += t.watermelons;
		s.bestChain = Math.max(s.bestChain, t.bestChain);
		s.abilities += t.abilities;
		s.playMs += Math.round(t.playMs);
		game.tally = newTally();
	}

	function countRun(game) {
		const runs = data().stats.runs;
		runs[game.mode] = (runs[game.mode] || 0) + 1;
	}

	/* A run thrown away mid-way (restart, mode change). Counts as played; no best score or record. */
	function abandon(game) {
		if (game.mode === "tutorial" || game.over) return;
		commit(game);
		if (game.drops > 0) countRun(game);
	}

	/* A run that ended. Returns { best, newBest, firstClear } for the summary. */
	function endRun(game, reason) {
		if (game.mode === "tutorial") return { best: null, newBest: false, firstClear: false };
		const d = data();
		commit(game);
		countRun(game);
		d.stats.score += game.score;
		const mode = setup.suika.modes[game.mode];
		let best = null;
		let newBest = false;
		if (mode.best) {
			const prev = V[mode.best] || 0;
			if (game.score > prev) {
				V[mode.best] = game.score;
				newBest = prev > 0;
			}
			best = V[mode.best] || 0;
		}
		if (recordModes.includes(game.mode) && game.score > 0) {
			const list = d.records[game.mode];
			list.push({ s: game.score, t: game.runInfo.largest, n: game.drops, c: game.runInfo.maxChain, d: setup.suikaContent.utcDate() });
			list.sort((a, b) => b.s - a.s);
			list.length = Math.min(list.length, recordLimit);
		}
		let firstClear = false;
		const c = game.challenge;
		if (c && game.mode === "challenge" && reason === "won" && !d.challenges[c.id]) {
			d.challenges[c.id] = setup.suikaContent.utcDate();
			firstClear = true;
		}
		let paid = 0;
		if (c && game.mode === "daily") ({ first: firstClear, paid } = recordDaily(d, c, game.score, reason === "won"));
		checkAchievements(game, "end", { beatBest: newBest, reason });
		updateMoment();
		return { best, newBest, firstClear, paid };
	}

	/* Records the day and pays its money the first time it is completed; the claim is written with the payment.
	 * Returns { first, paid }. */
	function recordDaily(d, c, score, done) {
		const day = d.daily[c.date] || (d.daily[c.date] = { best: 0, done: false, tries: 0 });
		day.tries++;
		day.best = Math.max(day.best, score);
		const first = done && !day.done;
		if (first) {
			day.done = true;
			d.stats.daily++;
		}
		let paid = 0;
		const age = setup.consoleDaily.daysAgo(c.date);
		if (done && !day.paid && c.reward > 0 && age >= 0 && age < dailyKeep) {
			day.paid = c.reward;
			paid = setup.consoleDaily.pay(c.reward);
		}
		setup.consoleDaily.prune(d.daily);
		return { first, paid };
	}

	function dailyDay(date) {
		return data().daily[date] || null;
	}

	/* ---- saved run ---- */

	function savedRun() {
		const run = data().run;
		return run && typeof run === "object" ? run : null;
	}

	function saveRun(game, snapshot) {
		commit(game);
		data().run = snapshot;
	}

	function clearRun() {
		data().run = null;
	}

	function rememberMode(mode) {
		if (mode === "classic" || mode === "arcade" || mode === "zen") data().mode = mode;
	}

	function finishTutorial() {
		data().tutorial = true;
	}

	function themeUnlocked(id) {
		const theme = setup.suikaContent.themes[id];
		return !!theme && (!theme.reward || !!data().achievements[theme.reward]);
	}

	setup.suikaProgress = Object.freeze({
		schema,
		recordLimit,
		dailyKeep,
		data,
		settings,
		setSetting,
		newTally,
		totals,
		event,
		commit,
		abandon,
		endRun,
		dailyDay,
		masterFeat,
		masterFeatState,
		savedRun,
		saveRun,
		clearRun,
		rememberMode,
		finishTutorial,
		themeUnlocked,
		challengeCount: () => challengeCount(data()),
	});
})();
