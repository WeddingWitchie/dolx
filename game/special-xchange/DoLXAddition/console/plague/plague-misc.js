/* globals Engine formatMoney */
/* Outbreak challenges and the daily scenario: ordinary outbreaks with a fixed setup and one objective, judged after
 * each day by track(). $plagueGame.challenge holds the run's state; a daily's `rng` seeds every random draw, so the
 * same date plays the same for everyone. Records: $plagueMeta.challenges { id: date } and .daily { date: { tries,
 * done, best, paid } }. Normal outbreaks have no `challenge` and run as before. */
(() => {
	const sim = () => setup.plagueSimulation;
	const data = () => setup.plagueData;
	const daily = () => setup.consoleDaily;

	const challenges = Object.freeze(
		[
			{ id: "foothold", name: "Foothold", diff: "easy", setup: { difficulty: "casual" }, goal: { type: "reach", n: 3, by: 30 } },
			{ id: "harbour-fever", name: "Harbour Fever", diff: "easy", setup: { difficulty: "casual", origin: "coast" }, goal: { type: "reach", n: 4, by: 40 } },
			{ id: "quiet-quarter", name: "A Quiet Quarter", diff: "easy", setup: { difficulty: "casual" }, goal: { type: "share", n: 0.25, by: 66 } },
			{ id: "cold-start", name: "Cold Start", diff: "medium", setup: { difficulty: "normal", origin: "north" }, goal: { type: "reach", n: 6, by: 58 } },
			{ id: "half-the-world", name: "Half the World", diff: "medium", setup: { difficulty: "normal" }, goal: { type: "share", n: 0.5, by: 70 } },
			{ id: "no-blood", name: "No Blood Spilled", diff: "medium", setup: { difficulty: "normal" }, goal: { type: "win" }, rules: { noLethal: true } },
			{ id: "lean-genome", name: "Lean Genome", diff: "medium", setup: { difficulty: "casual" }, goal: { type: "win" }, rules: { dnaCap: 24 } },
			{
				id: "lockdown",
				name: "Lockdown",
				diff: "hard",
				setup: { difficulty: "normal", stage: 2, events: ["travelBan"] },
				goal: { type: "reach", n: 6, by: 50 },
			},
			{ id: "race-the-cure", name: "Race the Cure", diff: "hard", setup: { difficulty: "normal" }, goal: { type: "win" }, rules: { cureBelow: 60 } },
			{ id: "blitz", name: "Blitz", diff: "hard", setup: { difficulty: "normal" }, goal: { type: "win", by: 92 } },
		].map(c => Object.freeze(c))
	);
	const byId = id => challenges.find(c => c.id === id) || null;

	/* ---- daily scenario: the UTC date picks the setup, an opening condition and the objective ---- */
	const dailyGoals = Object.freeze([
		{ level: "easy", goal: { type: "reach", n: 3, by: 30 } },
		{ level: "easy", goal: { type: "reach", n: 4, by: 38 } },
		{ level: "medium", goal: { type: "reach", n: 5, by: 44 } },
		{ level: "medium", goal: { type: "share", n: 0.25, by: 60 } },
		{ level: "hard", goal: { type: "reach", n: 6, by: 50 } },
		{ level: "hard", goal: { type: "share", n: 0.5, by: 62 } },
	]);
	/* Opening conditions: a world event already under way, or the authorities already watching. */
	const openings = Object.freeze([
		{ id: "calm", text: "A calm start." },
		{ id: "rain", text: "Heavy rain from the first day.", events: ["rain"] },
		{ id: "cold", text: "A cold snap from the first day.", events: ["cold"] },
		{ id: "festival", text: "The Town festival is on.", events: ["festival"] },
		{ id: "watched", text: "Doctors are already watching.", stage: 1 },
	]);

	function dailyFor(date = daily().utcDate()) {
		const holder = { rng: daily().hash("outbreak-daily-" + date) };
		const r = daily().seeded(holder);
		const pick = list => list[Math.floor(r() * list.length)];
		const regions = Object.keys(data().regions);
		const g = pick(dailyGoals);
		const opening = pick(openings);
		return Object.freeze({
			id: "daily-" + date,
			date,
			name: "Daily scenario",
			diff: g.level,
			setup: { difficulty: g.level === "easy" ? "casual" : "normal", origin: pick(regions), stage: opening.stage, events: opening.events },
			opening: opening.text,
			goal: g.goal,
			seed: daily().hash("outbreak-daily-run-" + date),
			reward: daily().dailyMoney.outbreak[g.level] || 0,
		});
	}

	const defOf = ch => (ch.kind === "daily" ? dailyFor(ch.date) : byId(ch.id));

	/* ---- records ---- */
	function meta() {
		if (!V.plagueMeta) V.plagueMeta = sim().createMeta();
		const m = V.plagueMeta;
		if (!m.challenges || typeof m.challenges !== "object") m.challenges = {};
		if (!m.daily || typeof m.daily !== "object") m.daily = {};
		return m;
	}
	const dayRecord = date => (V.plagueMeta && V.plagueMeta.daily ? V.plagueMeta.daily[date] || null : null);

	/* ---- text ---- */
	const pct = n => Math.round(n * 100) + "%";
	function describeGoal(c) {
		const g = c.goal;
		let text;
		if (g.type === "reach") text = g.n >= Object.keys(data().regions).length ? "Reach every region" : `Reach ${g.n} regions`;
		else if (g.type === "share") text = `Infect ${pct(g.n)} of everyone`;
		else text = "Win the outbreak";
		if (g.by) text += ` within ${g.by} days`;
		return text;
	}
	function describeRules(c) {
		const r = c.rules || {};
		const out = [];
		if (r.noLethal) out.push("no Lethal symptoms");
		if (r.dnaCap) out.push(`spend at most ${r.dnaCap} DNA on evolutions`);
		if (r.cureBelow) out.push(`the cure must stay under ${r.cureBelow}%`);
		return out;
	}
	function describeSetup(c) {
		const d = data();
		const s = c.setup;
		const parts = [`Bacteria`, d.difficulties[s.difficulty || "normal"].name, `starts in ${d.regions[s.origin || "town"].name}`];
		if (s.stage) parts.push(`response already at ${d.response.stages[s.stage].name}`);
		(s.events || []).forEach(id => parts.push(d.events[id].name));
		return parts.join(" · ");
	}
	const describe = c => [describeGoal(c), ...describeRules(c)].join("; ") + ".";

	/* ---- judging ---- */
	const reached = game => Object.values(game.regions).filter(r => r.infected > 0 || r.dead > 0).length;
	function share(game) {
		const t = sim().totals(game);
		return (t.infected + t.dead) / Math.max(1, t.population);
	}
	const bought = game => game.upgrades.filter(id => !game.mutations.some(m => m.upgrade === id));
	const spent = game => bought(game).reduce((sum, id) => sum + (data().upgrades[id] ? data().upgrades[id].cost : 0), 0);
	const elapsed = game => game.day - 1;

	/* Where a run stands: { state, text, fraction, why }. */
	function evaluate(game, c) {
		const g = c.goal;
		const r = c.rules || {};
		const days = elapsed(game);
		const ended = game.status !== "active";
		let broken = null;
		if (r.noLethal && bought(game).some(id => (data().upgrades[id].effects || {}).lethality > 0)) broken = "a Lethal symptom was evolved";
		if (r.dnaCap && spent(game) > r.dnaCap) broken = `more than ${r.dnaCap} DNA was spent`;
		if (r.cureBelow && game.cure >= r.cureBelow) broken = `the cure reached ${r.cureBelow}%`;
		let value;
		let target;
		let done;
		if (g.type === "reach") {
			value = reached(game);
			target = g.n;
			done = value >= g.n;
		} else if (g.type === "share") {
			value = share(game);
			target = g.n;
			done = value >= g.n;
		} else {
			value = sim().totals(game).healthy === 0 ? 1 : share(game);
			target = 1;
			done = game.status === "won";
		}
		const late = g.by && days > g.by;
		let state = "active";
		let why = "";
		if (done && !broken && !late) state = "done";
		else if (broken) [state, why] = ["failed", broken];
		else if (late || (g.by && days >= g.by && !done)) [state, why] = ["failed", `the ${g.by} days ran out`];
		else if (ended && !done) [state, why] = ["failed", game.status === "won" ? "the outbreak ended first" : "the outbreak was stopped"];
		const shown =
			g.type === "reach" ? `${value} of ${target} regions` : g.type === "share" ? `${pct(value)} of ${pct(target)}` : `${pct(share(game))} infected so far`;
		const extra = [];
		if (g.by) extra.push(`day ${Math.min(days, g.by)} of ${g.by}`);
		if (r.dnaCap) extra.push(`DNA spent ${spent(game)} of ${r.dnaCap}`);
		if (r.cureBelow) extra.push(`cure ${Math.floor(game.cure)}% (limit ${r.cureBelow}%)`);
		return { state, why, text: [shown, ...extra].join(" · "), fraction: Math.min(1, value / target) };
	}

	/* After a day (and once more after an advance): settles the objective the moment it is met or missed and records it.
	 * Recording happens only on the change from active, so a re-render or a repeat call never records or pays twice.
	 * Returns a note for "Advance until" to stop on, or null. */
	function track(game) {
		const ch = game && game.challenge;
		if (!ch || ch.state !== "active") return null;
		const c = defOf(ch);
		if (!c) return null;
		const r = evaluate(game, c);
		if (r.state === "active") return null;
		ch.state = r.state;
		ch.settledDay = elapsed(game);
		if (r.state === "failed") return `Challenge failed: ${r.why}.`;
		const m = meta();
		if (ch.kind === "challenge") {
			if (!m.challenges[c.id]) m.challenges[c.id] = daily().utcDate();
			/* Patient Zero: every challenge completed (DoL shows its own feat banner). */
			if (challenges.every(x => m.challenges[x.id]) && daily().earnFeatOnce(daily().feats.outbreak)) ch.feat = daily().feats.outbreak;
		} else {
			const rec = m.daily[c.date] || (m.daily[c.date] = { tries: 1, done: false, best: null });
			rec.done = true;
			rec.best = rec.best === null ? ch.settledDay : Math.min(rec.best, ch.settledDay);
			const age = daily().daysAgo(c.date);
			if (!rec.paid && c.reward > 0 && age >= 0 && age < daily().keepDays) {
				rec.paid = c.reward;
				ch.paid = daily().pay(c.reward);
			}
		}
		return `Challenge complete: ${c.name}.`;
	}

	/* The generator a run's days should use: seeded for the daily scenario, the game's normal one otherwise. */
	function random(game) {
		const ch = game && game.challenge;
		return ch && Number.isFinite(ch.rng) ? daily().seeded(ch) : undefined;
	}

	/* ---- starting a run ---- */
	function create(c, kind) {
		const s = c.setup;
		const game = sim().create({ name: c.name, origin: s.origin || "town", disease: "bacteria", difficulty: s.difficulty || "normal", traits: [] });
		if (s.stage) {
			game.response.stage = s.stage;
			game.response.detectedDay = 1;
		}
		(s.events || []).forEach(id => game.effects.push({ source: "world", id, target: null, daysLeft: data().events[id].duration }));
		game.challenge = { id: c.id, kind, date: kind === "daily" ? c.date : null, state: "active", rng: kind === "daily" ? c.seed : null };
		return game;
	}
	function start(id) {
		const kind = id === "daily" ? "daily" : "challenge";
		const c = kind === "daily" ? dailyFor() : byId(id);
		if (!c) return false;
		const m = meta();
		V.plagueGame = create(c, kind);
		if (kind === "daily") {
			const rec = m.daily[c.date] || (m.daily[c.date] = { tries: 0, done: false, best: null });
			rec.tries++;
			daily().prune(m.daily);
		}
		Engine.play("Plague Map");
		return true;
	}

	/* ---- what the passages show ---- */
	const chip = level => daily().chip(level);
	const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

	/* The objective strip above the map. */
	function banner(game) {
		const ch = game && game.challenge;
		if (!ch) return "";
		const c = defOf(ch);
		if (!c) return "";
		const r = evaluate(game, c);
		const state =
			ch.state === "done"
				? `<span class="green">Complete${ch.paid ? `, you earned ${formatMoney(ch.paid)}` : ""}${
						ch.feat ? `. Every challenge done: feat earned, ${ch.feat}` : ""
				  }</span>`
				: ch.state === "failed"
				? `<span class="red">Failed: ${esc(r.why || "objective missed")}</span>`
				: "In progress";
		return (
			`<div class="con-banner plague-goal" role="status"><div class="con-daily-head"><strong>${esc(
				ch.kind === "daily" ? `Daily scenario · ${c.date}` : c.name
			)}</strong>${chip(c.diff)}</div>` + `<div>${esc(describe(c))}</div><div class="tama-sub">${esc(r.text)}</div><div>${state}</div></div>`
		);
	}

	/* A challenge needs confirming when it would replace an outbreak still being played. */
	const replacing = () => (V.plagueGame && V.plagueGame.status === "active" ? V.plagueGame.day : 0);

	function startButton(id, label) {
		const day = replacing();
		return `<button type="button" class="plague-chal-start" data-plague-start="${esc(id)}"${
			day ? ` data-confirm="Press again to replace your day ${day} outbreak"` : ""
		}>${esc(label)}</button>`;
	}

	/* A picture for the objective, from DoL's own icons. */
	function goalIcon(c) {
		const r = c.rules || {};
		let file = "skyscraper-ruins.gif";
		if ((c.setup.events || []).includes("travelBan")) file = "padlock.png";
		else if (c.goal.type === "reach") file = "town.png";
		else if (c.goal.type === "share") file = "hospital-bed.png";
		else if (r.noLethal) file = "heart.png";
		else if (r.dnaCap) file = "science.png";
		else if (r.cureBelow) file = "pillcure.png";
		else if (c.goal.by) file = "antiques/antique-hourglass.png";
		return daily().icon(file);
	}

	/* The Challenges page body: the daily scenario panel, then every challenge by difficulty. */
	function pageHtml() {
		const m = V.plagueMeta || {};
		const done = m.challenges || {};
		const c = dailyFor();
		const rec = dayRecord(c.date);
		const reward = c.reward
			? rec && rec.paid
				? `${formatMoney(rec.paid)}, claimed today`
				: `${formatMoney(c.reward)} on completion, not claimed yet`
			: "None today";
		let h =
			`<section class="con-daily${
				rec && rec.done ? " con-daily--done" : ""
			}" aria-label="Today's scenario"><div class="con-daily-head"><span class="con-daily-date">Today's scenario, ${c.date} (UTC)</span>${chip(c.diff)}</div>` +
			`<p class="con-daily-goal">${goalIcon(c)}${esc(describe(c))}</p><dl class="con-facts">` +
			`<dt>Setup</dt><dd>${esc(describeSetup(c))}</dd><dt>Opening</dt><dd>${esc(c.opening)}</dd>` +
			`<dt>Reward</dt><dd>${esc(reward)}</dd>` +
			`<dt>Status</dt><dd>${rec && rec.done ? '<span class="green">Completed</span>' : rec && rec.tries ? "Not completed yet" : "Not tried yet"}</dd>` +
			`<dt>Best</dt><dd>${rec && rec.best !== null && rec.best !== undefined ? `Done in ${rec.best} days` : "None yet"}${
				rec && rec.tries ? `, ${rec.tries} ${rec.tries === 1 ? "try" : "tries"}` : ""
			}</dd>` +
			`<dt>Next scenario</dt><dd>in ${daily().untilReset()} (midnight UTC)</dd></dl>` +
			`${startButton("daily", rec && rec.tries ? "Retry today's scenario" : "Play today's scenario")}</section>`;
		h += daily().history(m.daily, c.date, r => `done in ${r.best} days`);
		const count = challenges.filter(x => done[x.id]).length;
		h += `<h3 class="con-page-head">Challenges</h3><div class="con-progress"><div class="con-progress-head"><span>Completed</span><span class="con-progress-count">${count} of ${
			challenges.length
		}</span></div><div class="con-bar" role="progressbar" aria-label="Challenges completed" aria-valuemin="0" aria-valuemax="${
			challenges.length
		}" aria-valuenow="${count}"><span class="con-bar-fill" style="width:${Math.round((count / challenges.length) * 100)}%"></span></div></div>`;
		h += daily().featCard(daily().feats.outbreak, count, challenges.length);
		for (const level of ["easy", "medium", "hard"]) {
			const group = challenges.filter(x => x.diff === level);
			h += `<h4 class="con-group-head"><span>${daily().levelName(level)}</span><span class="con-progress-count">${group.filter(x => done[x.id]).length} of ${
				group.length
			}</span></h4>`;
			for (const ch of group) {
				const when = done[ch.id];
				const art = goalIcon(ch);
				h +=
					`<div class="con-row${when ? " con-row--done" : ""}">${art ? `<span class="con-row-icon" aria-hidden="true">${art}</span>` : ""}` +
					`<div class="con-row-main"><span class="con-row-title">${esc(ch.name)}</span>` +
					`<span class="con-row-desc">${esc(describe(ch))}</span><span class="con-row-meta">${esc(describeSetup(ch))}</span>` +
					`<span class="con-row-status">${when ? `Completed ${when}` : "Not completed"}</span></div>` +
					`<div class="con-row-action">${startButton(ch.id, when ? "Play again" : "Start")}</div></div>`;
			}
		}
		const day = replacing();
		if (day) h = `<p class="tama-sub">Starting a challenge replaces your day ${day} outbreak; each Start button asks twice.</p>` + h;
		return h;
	}

	/* One click starts; with an outbreak still running, the first click asks and the second starts. */
	if (typeof jQuery !== "undefined") {
		jQuery(document).on("click", "[data-plague-start]", event => {
			const btn = event.currentTarget;
			if (btn.dataset.confirm && !btn.dataset.armed) {
				btn.dataset.armed = "1";
				btn.dataset.label = btn.textContent;
				btn.textContent = btn.dataset.confirm;
				return;
			}
			if (setup.plagueSfx) setup.plagueSfx.play("outbreak-select");
			start(btn.dataset.plagueStart);
		});
	}

	setup.plagueChallenges = Object.freeze({
		challenges,
		dailyGoals,
		openings,
		dailyFor,
		describe,
		describeSetup,
		evaluate,
		track,
		random,
		create,
		start,
		banner,
		pageHtml,
		meta,
		dayRecord,
	});
})();
