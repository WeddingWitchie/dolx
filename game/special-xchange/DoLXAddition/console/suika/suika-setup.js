/* globals formatMoney SimpleAudio */
/* Fruit game menu pages and the tutorial card. Pages open in place of the jar (the game pauses) inside the game's own
 * element, so opening one never leaves the passage. Every control here changes something real: a setting through
 * setup.suikaProgress.setSetting, a run through the game's requestStart, or the page shown. Esc steps back. */
(() => {
	/* Small element builder: h("div", { class, text, onclick, ...attributes }, ...children). */
	function h(tag, props, ...kids) {
		const el = document.createElement(tag);
		for (const [k, v] of Object.entries(props || {})) {
			if (v === undefined || v === null || v === false) continue;
			if (k === "class") el.className = v;
			else if (k === "text") el.textContent = v;
			else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
			else el.setAttribute(k, v === true ? "" : String(v));
		}
		for (const kid of kids.flat(Infinity)) if (kid !== null && kid !== undefined && kid !== false) el.append(kid instanceof Node ? kid : String(kid));
		return el;
	}
	const button = (label, onclick, props = {}) => h("button", { type: "button", class: "suika-btn", onclick, ...props }, label);

	const progress = () => setup.suikaProgress;
	const content = () => setup.suikaContent;
	const capital = s => s[0].toUpperCase() + s.slice(1);
	const fruitName = tier => (tier >= 0 ? setup.suika.fruits[tier].name : "None yet");

	function glyph(name) {
		const span = h("span", { class: "suika-glyph", "aria-hidden": "true" });
		span.innerHTML = `<svg viewBox="0 0 24 24">${content().glyphs[name]}</svg>`;
		return span;
	}

	function fruitIcon(game, tier, size = 28) {
		const canvas = h("canvas", { class: "suika-fruit-icon", "aria-hidden": "true" });
		canvas.style.width = canvas.style.height = `${size}px`;
		setup.suika.renderer.icon(canvas, tier, size, game.dpr);
		return canvas;
	}

	const titles = {
		menu: "Menu",
		challenges: "Challenges",
		daily: "Daily challenge",
		achievements: "Achievements",
		stats: "Statistics",
		appearance: "Appearance",
		settings: "Settings",
		help: "How to play",
	};

	/* Shows page `name` in place of the jar. */
	function open(game, name) {
		if (!game || !game.el) return;
		if (!game.paused && !game.over && !game.idle) game.setPaused(true);
		const panel = game.el.panel;
		panel.textContent = "";
		const heading = h("h3", { class: "suika-panel-title", tabindex: "-1", id: "suika-panel-title" }, titles[name]);
		const back = name === "menu" ? button("Close", () => close(game)) : button("Back", () => open(game, "menu"));
		let body;
		try {
			body = pages[name](game);
		} catch (e) {
			console.error(`Fruit game: the ${name} page failed`, e);
			body = h("p", null, "This page could not be shown. Close the menu and try again.");
		}
		panel.append(h("div", { class: "suika-panel-head" }, heading, back), body);
		panel.setAttribute("aria-labelledby", "suika-panel-title");
		panel.hidden = false;
		game.el.play.hidden = true;
		game.panel = name;
		heading.focus({ preventScroll: true });
	}

	/* Back to the jar. The game stays paused behind its Resume overlay unless a run was just started. */
	function close(game, focus = true) {
		if (!game || !game.el || game.el.panel.hidden) return;
		game.el.panel.hidden = true;
		game.el.panel.textContent = "";
		game.el.play.hidden = false;
		game.panel = null;
		game.resize();
		if (focus) (game.el.overlay.hidden ? game.el.menuBtn : game.el.overlayBtn).focus({ preventScroll: true });
	}

	/* Esc on a page: a sub-page goes back to the menu, the menu closes. */
	function escape(game) {
		if (!game.panel) return false;
		if (game.panel === "menu") close(game);
		else open(game, "menu");
		return true;
	}

	/* ---- pages ---- */

	function menu(game) {
		const d = progress().data();
		const today = content().daily();
		const day = progress().dailyDay(today.date);
		const total = content().challenges.length;
		const unlocked = content().achievements.filter(a => d.achievements[a.id]).length;
		const item = (label, note, onclick) =>
			h(
				"button",
				{ type: "button", class: "suika-btn suika-menu-item", onclick },
				h("span", { class: "suika-menu-label" }, label),
				note ? h("span", { class: "suika-menu-note" }, note) : null
			);
		return h(
			"div",
			{ class: "suika-menu-list" },
			item(game.over || game.idle ? "Back to the jar" : "Resume", null, () => {
				close(game);
				if (game.paused && !game.idle && !game.over) game.setPaused(false);
			}),
			item("Challenges", `${progress().challengeCount()} of ${total} done`, () => open(game, "challenges")),
			item(
				"Daily challenge",
				day && day.done
					? day.paid
						? "Done today, reward claimed"
						: "Done today"
					: `${setup.consoleDaily.levelName(today.level)}, ${today.reward ? formatMoney(today.reward) : "no reward"}`,
				() => open(game, "daily")
			),
			item("Achievements", `${unlocked} of ${content().achievements.length}`, () => open(game, "achievements")),
			item("Statistics", null, () => open(game, "stats")),
			item("Appearance", null, () => open(game, "appearance")),
			item("Settings", null, () => open(game, "settings")),
			item("How to play", null, () => open(game, "help")),
			/* Only when there is a run to save; plain leaving is the passage's own Back to the console link. */
			game.canSave()
				? item("Save and exit", "Resume this run next time", () => {
						setup.suika.leave();
						Engine.play("Home Console");
				  })
				: null
		);
	}

	function challenges(game) {
		const d = progress().data();
		const wrap = h("div", { class: "suika-list" });
		wrap.append(
			h(
				"p",
				{ class: "suika-panel-note" },
				`${progress().challengeCount()} of ${content().challenges.length} completed. Each challenge has one goal; completing it once ticks it for good.`
			)
		);
		for (const diff of ["easy", "medium", "hard"]) {
			wrap.append(h("h4", { class: "suika-subhead" }, capital(diff)));
			for (const c of content().challenges.filter(x => x.diff === diff)) {
				const done = !!d.challenges[c.id];
				const play = button(done ? "Play again" : "Play", () => game.requestStart(play, "Press again to start", "challenge", c));
				wrap.append(
					h(
						"div",
						{ class: `suika-row${done ? " suika-row--done" : ""}` },
						h(
							"div",
							{ class: "suika-row-main" },
							h("span", { class: "suika-row-title" }, c.name),
							h("span", { class: "suika-row-desc" }, content().describe(c)),
							h("span", { class: "suika-row-status" }, done ? `Completed ${d.challenges[c.id]}` : "Not completed")
						),
						play
					)
				);
			}
		}
		return wrap;
	}

	/* A labelled progress bar: "label  n of total" over a bar (the shared console style). */
	function progressBar(label, n, total) {
		const pct = total ? Math.round((n / total) * 100) : 0;
		const bar = h("div", { class: "con-bar", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": total, "aria-valuenow": n, "aria-label": label });
		bar.append(h("span", { class: "con-bar-fill", style: `width:${pct}%` }));
		return h(
			"div",
			{ class: "con-progress" },
			h("div", { class: "con-progress-head" }, h("span", null, label), h("span", { class: "con-progress-count" }, `${n} of ${total}`)),
			bar
		);
	}
	/* Difficulty label: the word, plus DoL's own colour classes (green / gold / red). */
	const levelClass = { easy: "green", medium: "gold", hard: "red" };
	const levelChip = level => h("span", { class: `con-diff con-diff--${level} ${levelClass[level] || ""}` }, setup.consoleDaily.levelName(level));
	const fact = (term, ...value) => [h("dt", null, term), h("dd", null, ...value)];

	function daily(game) {
		const c = content().daily();
		const day = progress().dailyDay(c.date);
		const parts = content().describeParts(c);
		const tried = !!(day && day.tries);
		const play = button(tried ? "Retry" : "Play", () => game.requestStart(play, "Press again to start", "daily", c), { class: "suika-btn con-play" });
		let reward;
		if (!c.reward) reward = "None today";
		else if (day && day.paid) reward = `${formatMoney(day.paid)}, claimed today`;
		else reward = `${formatMoney(c.reward)} on completion, not claimed yet`;
		const history = Object.entries(progress().data().daily)
			.filter(([date]) => date !== c.date)
			.sort((x, y) => (x[0] < y[0] ? 1 : -1))
			.slice(0, 7);
		return h(
			"div",
			{ class: "suika-list" },
			h(
				"section",
				{ class: `con-daily${day && day.done ? " con-daily--done" : ""}`, "aria-label": "Today's challenge" },
				h("div", { class: "con-daily-head" }, h("span", { class: "con-daily-date" }, `${c.date} (UTC)`), levelChip(c.level)),
				h("p", { class: "con-daily-goal" }, parts.goal + "."),
				h(
					"dl",
					{ class: "con-facts" },
					fact("Limits", [parts.drops ? `${parts.drops} drops` : "No drop limit", parts.rules].join(" · ")),
					fact("Reward", reward),
					fact("Status", day && day.done ? h("span", { class: "green" }, "Completed") : tried ? "Not completed yet" : "Not tried yet"),
					fact("Best today", tried ? `${day.best} points, ${day.tries} ${day.tries === 1 ? "try" : "tries"}` : "None yet"),
					fact("Next challenge", `in ${setup.consoleDaily.untilReset()} (midnight UTC)`)
				),
				play
			),
			history.length ? h("h4", { class: "suika-subhead" }, "Earlier days") : null,
			history.length
				? h(
						"ul",
						{ class: "con-history" },
						history.map(([date, r]) =>
							h(
								"li",
								null,
								h("span", null, date),
								h("span", null, r.done ? "Completed" : "Not completed"),
								h("span", null, `best ${r.best}`),
								h("span", null, r.paid ? formatMoney(r.paid) : "")
							)
						)
				  )
				: null
		);
	}

	function achievements(game) {
		const d = progress().data();
		const list = content().achievements;
		const themes = content().themes;
		const unlocked = list.filter(a => d.achievements[a.id]).length;
		const featName = content().masterFeat;
		const featState = progress().masterFeatState();
		let featLine;
		if (featState === "earned") featLine = h("span", { class: "green" }, "Earned in this save.");
		else if (featState === "blocked") featLine = "Feats can't be earned in this save (cheats, debug, or soft mode are on).";
		else featLine = unlocked === list.length ? "All unlocked: it is earned the next time the game opens." : `${list.length - unlocked} to go.`;
		const wrap = h(
			"div",
			{ class: "suika-list" },
			progressBar("Unlocked", unlocked, list.length),
			h(
				"div",
				{ class: `con-feat${featState === "earned" ? " con-feat--earned" : ""}` },
				h("img", { class: "con-feat-coin", src: "img/ui/coin-gold.gif", alt: "", "aria-hidden": "true" }),
				h(
					"div",
					{ class: "con-feat-text" },
					h("span", { class: "con-feat-title" }, `${featName}, a Level 3 feat`),
					h("span", null, `Unlock all ${list.length} achievements to earn it. `, featLine)
				)
			)
		);
		for (const [group, title] of content().achievementGroups) {
			const members = list.filter(a => a.group === group);
			const got = members.filter(a => d.achievements[a.id]).length;
			wrap.append(
				h("h4", { class: "suika-subhead con-group-head" }, h("span", null, title), h("span", { class: "con-progress-count" }, `${got} of ${members.length}`))
			);
			for (const a of members) {
				const when = d.achievements[a.id];
				const icon = a.icon.fruit !== undefined ? fruitIcon(game, a.icon.fruit) : glyph(a.icon.glyph);
				const art = h(
					"span",
					{ class: "con-ach-icon" },
					icon,
					a.icon.count ? h("span", { class: "con-ach-count", "aria-hidden": "true" }, `x${a.icon.count}`) : null
				);
				wrap.append(
					h(
						"div",
						{ class: `con-ach${when ? " con-ach--done" : " con-ach--locked"}` },
						art,
						h(
							"div",
							{ class: "con-ach-main" },
							h("span", { class: "con-ach-name" }, a.name),
							h("span", { class: "con-ach-desc" }, a.desc),
							a.reward ? h("span", { class: "con-ach-reward" }, `Reward: the ${themes[a.reward].name} jar theme`) : null
						),
						h("span", { class: "con-ach-state" }, when ? `Unlocked ${when}` : "Locked")
					)
				);
			}
		}
		return wrap;
	}

	function stats(game) {
		const d = progress().data();
		const s = d.stats;
		/* Saved totals plus the run in progress, which is saved when it ends or is saved. */
		const t = game.mode === "tutorial" ? progress().newTally() : game.tally;
		const runs = Object.values(s.runs).reduce((a, b) => a + b, 0);
		const minutes = Math.floor((s.playMs + t.playMs) / 60000);
		const rows = [
			["Runs played", `${runs} (Classic ${s.runs.classic}, Arcade ${s.runs.arcade}, Zen ${s.runs.zen}, Challenge ${s.runs.challenge}, Daily ${s.runs.daily})`],
			["Classic best", V.suikaBest || 0],
			["Arcade best", V.suikaBestArcade || 0],
			["Fruit dropped", s.drops + t.drops],
			["Merges", s.merges + t.merges],
			["Points from finished runs", s.score],
			["Biggest fruit", fruitName(Math.max(s.largest, t.largest))],
			["Watermelons made", s.watermelons + t.watermelons],
			["Longest chain", Math.max(s.bestChain, t.bestChain)],
			["Power-ups used", s.abilities + t.abilities],
			["Challenges completed", `${progress().challengeCount()} of ${content().challenges.length}`],
			["Daily challenges completed", s.daily],
			["Time in the jar", `${Math.floor(minutes / 60)} h ${minutes % 60} min`],
		];
		const wrap = h(
			"div",
			{ class: "suika-list" },
			h(
				"dl",
				{ class: "suika-stats" },
				rows.map(([k, v]) => [h("dt", null, k), h("dd", null, String(v))])
			)
		);
		for (const mode of ["classic", "arcade"]) {
			const list = d.records[mode];
			wrap.append(h("h4", { class: "suika-subhead" }, `${capital(mode)} records`));
			if (!list.length) {
				wrap.append(h("p", { class: "suika-panel-note" }, `No finished ${capital(mode)} runs yet. Your ten best appear here.`));
				continue;
			}
			wrap.append(
				h(
					"table",
					{ class: "suika-records" },
					h(
						"thead",
						null,
						h(
							"tr",
							null,
							["#", "Score", "Biggest", "Drops", "Chain", "Date"].map(x => h("th", { scope: "col" }, x))
						)
					),
					h(
						"tbody",
						null,
						list.map((r, i) =>
							h("tr", null, h("td", null, i + 1), h("td", null, r.s), h("td", null, fruitName(r.t)), h("td", null, r.n), h("td", null, r.c), h("td", null, r.d))
						)
					)
				)
			);
		}
		return wrap;
	}

	function checkbox(label, key, note) {
		const id = `suika-set-${key}`;
		const input = h("input", { type: "checkbox", id, checked: !!progress().settings()[key], onchange: e => progress().setSetting(key, e.target.checked) });
		return h("div", { class: "suika-field" }, input, h("label", { for: id }, label), note ? h("p", { class: "suika-panel-note" }, note) : null);
	}

	function appearance(game) {
		const s = progress().settings();
		const themes = content().themes;
		const preview = h("canvas", { class: "suika-preview", "aria-hidden": "true" });
		const drawPreview = () => {
			const theme = progress().settings().contrast ? themes.contrast : themes[progress().settings().theme] || themes.dark;
			const css = { w: 240, h: 56 };
			preview.style.width = `${css.w}px`;
			preview.style.height = `${css.h}px`;
			preview.width = css.w * game.dpr;
			preview.height = css.h * game.dpr;
			const ctx = preview.getContext("2d");
			ctx.setTransform(game.dpr, 0, 0, game.dpr, 0, 0);
			ctx.fillStyle = theme.inner;
			ctx.fillRect(0, 0, css.w, css.h);
			[1, 4, 7, 10].forEach((tier, i) => {
				const r = 12 + i * 3;
				setup.suika.renderer.fruit(ctx, tier, 34 + i * 58, css.h - r - 2, r, 0, 1, (r * game.dpr) / setup.suika.fruits[tier].radius);
			});
		};
		const changed = (key, value) => {
			progress().setSetting(key, value);
			drawPreview();
		};
		const themeField = h("fieldset", { class: "suika-fieldset" }, h("legend", null, "Jar"));
		for (const [id, theme] of Object.entries(themes)) {
			if (id === "contrast") continue;
			const open = progress().themeUnlocked(id);
			const inputId = `suika-theme-${id}`;
			const lockedBy = theme.reward && content().achievements.find(a => a.id === theme.reward);
			themeField.append(
				h(
					"div",
					{ class: "suika-field" },
					h("input", {
						type: "radio",
						name: "suika-theme",
						id: inputId,
						value: id,
						checked: s.theme === id,
						disabled: !open,
						onchange: () => changed("theme", id),
					}),
					h("label", { for: inputId }, theme.name, open ? "" : ` (locked: unlock "${lockedBy.name}")`)
				)
			);
		}
		const box = (label, key, note) => {
			const field = checkbox(label, key, note);
			field.querySelector("input").addEventListener("change", drawPreview);
			return field;
		};
		const wrap = h(
			"div",
			{ class: "suika-list" },
			preview,
			themeField,
			h(
				"fieldset",
				{ class: "suika-fieldset" },
				h("legend", null, "Fruit"),
				box("Faces on the fruit", "faces"),
				box("Simple drawing", "simple", "Flat colours without shading or texture. Lighter on slow phones."),
				box("Bold outlines", "bold"),
				box("High contrast", "contrast", "Black jar, bright line and labels, bold outlines. Overrides the jar theme.")
			)
		);
		drawPreview();
		return wrap;
	}

	function settings(game) {
		const s = progress().settings();
		const percent = h("output", { for: "suika-set-sfx" }, `${Math.round(s.sfx * 100)}%`);
		const slider = h("input", {
			type: "range",
			id: "suika-set-sfx",
			min: 0,
			max: 100,
			step: 10,
			value: Math.round(s.sfx * 100),
			oninput: e => (percent.textContent = `${e.target.value}%`),
			onchange: e => progress().setSetting("sfx", Number(e.target.value) / 100),
		});
		const dolAudio = V.options?.audio === 1;
		const canVibrate = typeof navigator.vibrate === "function";
		const motion = h("fieldset", { class: "suika-fieldset" }, h("legend", null, "Motion"));
		for (const [value, label] of [
			["auto", "Follow this device's setting"],
			["reduced", "Reduced: no particles or jar wobble"],
			["full", "Full effects"],
		]) {
			const id = `suika-motion-${value}`;
			motion.append(
				h(
					"div",
					{ class: "suika-field" },
					h("input", { type: "radio", name: "suika-motion", id, value, checked: s.motion === value, onchange: () => progress().setSetting("motion", value) }),
					h("label", { for: id }, label)
				)
			);
		}
		motion.append(h("p", { class: "suika-panel-note" }, "Fruit always move; only decoration is reduced."));
		const replay = button("Replay the tutorial", () => {
			game.armOrRun(replay, "Press again to start the tutorial", () => {
				if (game.idle) progress().clearRun();
				close(game, false);
				game.startTutorial();
			});
		});
		return h(
			"div",
			{ class: "suika-list" },
			h(
				"fieldset",
				{ class: "suika-fieldset" },
				h("legend", null, "Sound"),
				h("div", { class: "suika-field suika-field--range" }, h("label", { for: "suika-set-sfx" }, "Sound effects volume"), slider, percent),
				checkbox("Mute the fruit game", "mute", "Silences its sound effects and its music."),
				checkbox(
					"Arcade music while playing",
					"music",
					dolAudio
						? "Uses DoL's music volume from Options. The room's music comes back when you leave."
						: "DoL's audio is off in Options, so the game plays no music. Sound effects still work."
				),
				h("p", { class: "suika-panel-note" }, "Sound starts after your first tap or key press in the game.")
			),
			h(
				"fieldset",
				{ class: "suika-fieldset" },
				h("legend", null, "Vibration"),
				checkbox(
					"Vibrate on big merges, long chains and game over",
					"haptics",
					canVibrate ? null : "This device or browser cannot vibrate, so this does nothing here."
				)
			),
			motion,
			h("fieldset", { class: "suika-fieldset" }, h("legend", null, "Tutorial"), replay)
		);
	}

	function help() {
		return h(
			"div",
			{ class: "suika-list suika-help-page" },
			content().help.map(([title, lines]) => [
				h("h4", { class: "suika-subhead" }, title),
				h(
					"ul",
					{ class: "suika-plain-list" },
					lines.map(line => h("li", null, line))
				),
			])
		);
	}

	const pages = { menu, challenges, daily, achievements, stats, appearance, settings, help };

	/* The tutorial card above the jar. */
	function tip(game, step, index, count) {
		const el = game.el.tip;
		el.textContent = "";
		const last = index === count - 1;
		el.append(
			h("p", { class: "suika-tip-title" }, `Tutorial ${index + 1} of ${count}: ${step.title}`),
			h("p", { class: "suika-tip-text" }, step.text),
			h(
				"div",
				{ class: "suika-tip-buttons" },
				button(last ? "Start playing" : "Next", () => game.nextTip()),
				button("Skip tutorial", () => game.finishTutorial())
			)
		);
		el.hidden = false;
	}

	setup.suikaUI = Object.freeze({ open, close, escape, tip, pages: Object.keys(pages) });
})();

/* Fruit game sound, music and vibration. One AudioContext, created on the first tap (browsers refuse audio before),
 * suspended on pause or leave. Music is DoL's "arcade" playlist as an intermission, so the room theme returns after. */
(() => {
	let ctx = null;
	let master = null;
	let noise = null;
	let unlocked = false;
	let musicOn = false;
	const lastPlayed = {};

	/* Minimum gap between two plays of the same sound, so a busy pile does not turn into noise. */
	const cooldownMs = { collide: 90, merge: 45, drop: 60, combo: 120 };

	const settings = () => setup.suikaProgress.settings();
	const volume = () => (settings().mute ? 0 : Math.max(0, Math.min(1, Number(settings().sfx) || 0)));

	/* Called from the game's own input handlers: the first user gesture creates (or wakes) the context. */
	function unlock() {
		unlocked = true;
		const AC = window.AudioContext || window.webkitAudioContext;
		if (!ctx && AC) {
			try {
				ctx = new AC();
				master = ctx.createGain();
				master.connect(ctx.destination);
			} catch (e) {
				ctx = null;
			}
		}
		applyVolume();
		resume();
		startMusic();
	}

	function applyVolume() {
		if (master) master.gain.value = volume() * 0.5;
	}

	function resume() {
		if (ctx && unlocked && ctx.state === "suspended") ctx.resume().catch(() => {});
	}

	function suspend() {
		if (ctx && ctx.state === "running") ctx.suspend().catch(() => {});
	}

	/* One enveloped tone. `at` is seconds from now. */
	function tone(freq, dur, { type = "sine", gain = 0.2, at = 0, slide = 0 } = {}) {
		const t = ctx.currentTime + at;
		const osc = ctx.createOscillator();
		const g = ctx.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(freq, t);
		if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		osc.connect(g);
		g.connect(master);
		osc.start(t);
		osc.stop(t + dur + 0.02);
	}

	function burst(dur, gain, cutoff) {
		if (!noise) {
			noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
			const ch = noise.getChannelData(0);
			for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
		}
		const src = ctx.createBufferSource();
		const filter = ctx.createBiquadFilter();
		const g = ctx.createGain();
		src.buffer = noise;
		filter.type = "lowpass";
		filter.frequency.value = cutoff;
		const t = ctx.currentTime;
		g.gain.setValueAtTime(gain, t);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		src.connect(filter);
		filter.connect(g);
		g.connect(master);
		src.start(t);
		src.stop(t + dur);
	}

	const notes = (list, opts) => list.forEach(([f, d, at]) => tone(f, d, { ...opts, at }));

	const sounds = {
		drop: () => tone(240, 0.09, { slide: 140, gain: 0.22 }),
		collide: ({ strength = 0.5 }) => tone(170, 0.05, { type: "triangle", gain: 0.05 + 0.1 * strength }),
		merge: ({ tier = 1 }) => {
			const f = 280 * Math.pow(1.12, tier);
			tone(f, 0.08, { type: "triangle", gain: 0.18 });
			tone(f * 1.5, 0.12, { type: "triangle", gain: 0.14, at: 0.05 });
			if (tier >= 7) tone(f * 2, 0.22, { gain: 0.12, at: 0.1 });
		},
		watermelon: () =>
			notes(
				[
					[392, 0.12, 0],
					[494, 0.12, 0.09],
					[587, 0.12, 0.18],
					[784, 0.35, 0.27],
				],
				{ type: "triangle", gain: 0.18 }
			),
		vanish: () =>
			notes(
				[
					[784, 0.1, 0],
					[988, 0.1, 0.07],
					[1175, 0.3, 0.14],
				],
				{ gain: 0.16 }
			),
		combo: ({ n = 2 }) => tone(420 + 70 * Math.min(n, 8), 0.12, { type: "square", gain: 0.06 }),
		shake: () => burst(0.4, 0.35, 700),
		shuffle: () =>
			notes(
				[
					[600, 0.06, 0],
					[750, 0.06, 0.06],
					[900, 0.08, 0.12],
				],
				{ type: "triangle", gain: 0.12 }
			),
		wand: () => tone(900, 0.32, { slide: 1900, gain: 0.1 }),
		swap: () =>
			notes(
				[
					[520, 0.08, 0],
					[390, 0.1, 0.08],
				],
				{ type: "triangle", gain: 0.14 }
			),
		harvest: () =>
			notes(
				[
					[660, 0.08, 0],
					[880, 0.14, 0.07],
				],
				{ gain: 0.12 }
			),
		achievement: () =>
			notes(
				[
					[523, 0.12, 0],
					[659, 0.12, 0.1],
					[784, 0.12, 0.2],
					[1047, 0.3, 0.3],
				],
				{ type: "triangle", gain: 0.16 }
			),
		challenge: () =>
			notes(
				[
					[523, 0.14, 0],
					[523, 0.1, 0.16],
					[659, 0.14, 0.28],
					[784, 0.45, 0.42],
				],
				{ type: "square", gain: 0.08 }
			),
		gameover: () =>
			notes(
				[
					[392, 0.18, 0],
					[330, 0.18, 0.18],
					[262, 0.4, 0.36],
				],
				{ type: "triangle", gain: 0.16 }
			),
	};

	/* Plays `name` if sound is on, the context is awake and its cooldown has passed. */
	function play(name, data = {}) {
		if (!ctx || ctx.state !== "running" || !volume() || !sounds[name]) return false;
		const now = performance.now();
		if (now - (lastPlayed[name] || 0) < (cooldownMs[name] || 0)) return false;
		lastPlayed[name] = now;
		try {
			sounds[name](data);
		} catch (e) {
			return false;
		}
		return true;
	}

	function vibrate(pattern) {
		if (!settings().haptics || typeof navigator.vibrate !== "function") return false;
		try {
			return navigator.vibrate(pattern);
		} catch (e) {
			return false;
		}
	}

	/* ---- music, through DoL's own music system ---- */

	function musicAllowed() {
		return !!settings().music && !settings().mute && V.options?.audio === 1 && !window.PocketMusic?.active;
	}

	function startMusic() {
		if (!unlocked || !musicAllowed()) return;
		if (!musicOn) {
			musicOn = true;
			try {
				Wikifier.wikifyEval('<<bgm-intermission "arcade">>');
			} catch (e) {
				musicOn = false;
			}
			return;
		}
		const list = SimpleAudio.lists.get("arcade");
		if (list && !list.isPlaying()) list.play();
	}

	function pauseMusic() {
		const list = musicOn && SimpleAudio.lists.get("arcade");
		if (list) list.pause();
	}

	/* Hands the music back to the room: DoL resumes the theme the intermission paused. */
	function stopMusic() {
		if (!musicOn) return;
		musicOn = false;
		try {
			Wikifier.wikifyEval("<<update-audio>>");
		} catch (e) {}
	}

	/* Settings changed: new volume, and music on or off to match. */
	function refresh() {
		applyVolume();
		if (musicAllowed()) startMusic();
		else stopMusic();
	}

	/* The game paused or hid (true) or came back (false). */
	function setPaused(paused) {
		if (paused) {
			suspend();
			pauseMusic();
		} else {
			resume();
			startMusic();
		}
	}

	/* The game was left: silence it. The next passage's own music call takes the theme back. */
	function leave() {
		suspend();
		musicOn = false;
		/* Each visit waits for its own first tap before making any sound. */
		unlocked = false;
	}

	setup.suikaAudio = Object.freeze({
		unlock,
		play,
		vibrate,
		refresh,
		setPaused,
		leave,
		/* For checking from the browser console. */
		state: () => ({ context: ctx ? ctx.state : "none", unlocked, musicOn, gain: master ? master.gain.value : 0 }),
	});
})();
