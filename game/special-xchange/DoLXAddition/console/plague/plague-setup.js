/* Rules behind the New Outbreak wizard: plain functions over a temporary `state` object (a SugarCube temporary variable,
 * never saved) and a meta. Nothing here touches $plagueGame or $plagueMeta, draws a random number or calls updateMoment;
 * only Begin turns choices into a game, through finish(), which returns new objects for the widget to store. */
setup.plagueSetup = (() => {
	"use strict";

	const data = () => setup.plagueData;
	const sim = () => setup.plagueSimulation;

	const steps = [
		{ id: "pathogen", name: "Pathogen" },
		{ id: "difficulty", name: "Difficulty" },
		{ id: "details", name: "Details" },
		{ id: "traits", name: "Traits" },
		{ id: "review", name: "Review" },
	];
	const stepIndex = id => steps.findIndex(s => s.id === id);

	/* A private, repaired copy, so reading never creates or changes the saved $plagueMeta. */
	const metaView = meta => sim().ensureMeta(meta ? JSON.parse(JSON.stringify(meta)) : null) || sim().createMeta();

	const slotCount = meta => Math.min(data().meta.maxSlots, Math.max(1, metaView(meta).unlocked.slots));

	const pathogenPlayable = (meta, id) => {
		const def = data().pathogens[id];
		return !!def && def.ready === true && metaView(meta).unlocked.pathogens.includes(id);
	};
	const difficultyPlayable = (meta, id) => {
		const def = data().difficulties[id];
		return !!def && def.ready === true && metaView(meta).unlocked.difficulties.includes(id);
	};
	const firstPlayable = (table, playable, meta, preferred) =>
		playable(meta, preferred) ? preferred : Object.keys(table).find(id => playable(meta, id)) || preferred;

	function cleanName(text) {
		const t = String(text === undefined || text === null ? "" : text)
			// eslint-disable-next-line no-control-regex
			.replace(/[\u0000-\u001f\u007f]/g, " ")
			.replace(/\s+/g, " ")
			.trim();
		return t.slice(0, data().nameMax).trim();
	}

	function defaults(meta) {
		const d = data();
		return {
			step: "pathogen",
			reached: 0,
			pathogen: firstPlayable(d.pathogens, pathogenPlayable, meta, "bacteria"),
			difficulty: firstPlayable(d.difficulties, difficultyPlayable, meta, "normal"),
			origin: "town",
			name: d.nameSuggestions[0],
			nameIdx: 0,
			slots: Array.from({ length: slotCount(meta) }, () => null),
			slotOpen: 0,
			pick: null,
		};
	}

	const OK = { ok: true, msg: "" };
	const no = msg => ({ ok: false, msg });

	function choose(state, kind, id, meta) {
		const d = data();
		if (kind === "pathogen" && pathogenPlayable(meta, id)) state.pathogen = id;
		else if (kind === "difficulty" && difficultyPlayable(meta, id)) state.difficulty = id;
		else if (kind === "origin" && d.regions[id]) state.origin = id;
		else return no("That choice is not available.");
		return OK;
	}

	function suggestName(state) {
		const list = data().nameSuggestions;
		state.nameIdx = ((Number.isInteger(state.nameIdx) ? state.nameIdx : 0) + 1) % list.length;
		state.name = list[state.nameIdx];
		return OK;
	}

	function go(state, stepId) {
		const i = stepIndex(stepId);
		if (i < 0 || i > state.reached) return no("Finish the earlier steps first.");
		if (i > stepIndex("details") && !cleanName(state.name)) return no("Give your outbreak a name.");
		state.step = stepId;
		return OK;
	}

	function next(state) {
		const i = stepIndex(state.step);
		if (i === stepIndex("details") && !cleanName(state.name)) return no("Give your outbreak a name.");
		if (i >= steps.length - 1) return no("");
		state.step = steps[i + 1].id;
		state.reached = Math.max(state.reached, i + 1);
		return OK;
	}

	function back(state) {
		const i = stepIndex(state.step);
		if (i > 0) state.step = steps[i - 1].id;
		return OK;
	}

	const slotList = state => (Array.isArray(state.slots) ? state.slots : []);

	/* How a trait stands against the slots, for the slot `slot`:
	 *  "equipped"   it is in this slot
	 *  "elsewhere"  it is in another slot (clear that slot first)
	 *  "covered"    another slot already holds a trait of its category
	 *  "locked"     the meta has not unlocked it
	 *  "available"  it can go in this slot */
	function traitState(state, meta, id, slot) {
		const d = data();
		const slots = slotList(state);
		if (slots[slot] === id) return { state: "equipped", slot };
		const at = slots.indexOf(id);
		if (at >= 0) return { state: "elsewhere", slot: at };
		if (!sim().traitAvailable(metaView(meta), id)) return { state: "locked", slot: -1 };
		const other = slots.findIndex((t, i) => i !== slot && t && d.traits[t] && d.traits[t].category === d.traits[id].category);
		if (other >= 0) return { state: "covered", slot: other, by: slots[other] };
		return { state: "available", slot: -1 };
	}

	function equip(state, meta, slot, id) {
		const d = data();
		if (!d.traits[id]) return no("That trait does not exist.");
		if (!Number.isInteger(slot) || slot < 0 || slot >= slotList(state).length || slot >= slotCount(meta)) return no("That slot is not unlocked.");
		const st = traitState(state, meta, id, slot);
		if (st.state === "equipped") return OK;
		if (st.state === "elsewhere") return no(`${d.traits[id].name} is already in slot ${st.slot + 1}.`);
		if (st.state === "covered")
			return no(`${d.traitCategories[d.traits[id].category].name} is already covered by ${d.traits[st.by].name} in slot ${st.slot + 1}.`);
		if (st.state === "locked") return no(`${d.traits[id].name} is not unlocked.`);
		state.slots[slot] = id;
		state.pick = id;
		return OK;
	}

	function clearSlot(state, slot) {
		if (Number.isInteger(slot) && slot >= 0 && slot < slotList(state).length) state.slots[slot] = null;
		return OK;
	}

	function openSlot(state, slot) {
		if (Number.isInteger(slot) && slot >= 0 && slot < slotList(state).length) state.slotOpen = slot;
		return OK;
	}

	function validate(state, meta) {
		const d = data();
		const errors = [];
		const s = state || {};
		if (!pathogenPlayable(meta, s.pathogen)) errors.push("Choose an available pathogen.");
		if (!difficultyPlayable(meta, s.difficulty)) errors.push("Choose an available difficulty.");
		if (!d.regions[s.origin]) errors.push("Choose a starting region.");
		const name = cleanName(s.name);
		if (!name) errors.push("Give your outbreak a name.");
		if (s.slots !== undefined && !Array.isArray(s.slots)) errors.push("The trait slots are not valid.");
		const slots = slotList(s);
		const equipped = slots.filter(Boolean);
		if (slots.length > slotCount(meta) || equipped.length > slotCount(meta)) errors.push("Too many traits for the unlocked slots.");
		const seen = new Set();
		const cats = new Set();
		equipped.forEach(id => {
			if (!d.traits[id] || !sim().traitAvailable(metaView(meta), id)) return errors.push("A chosen trait is not available.");
			if (seen.has(id)) errors.push(`${d.traits[id].name} is chosen twice.`);
			seen.add(id);
			if (cats.has(d.traits[id].category)) errors.push(`Only one ${d.traitCategories[d.traits[id].category].name} trait can be equipped.`);
			cats.add(d.traits[id].category);
		});
		return {
			ok: errors.length === 0,
			errors,
			clean: { name, pathogen: s.pathogen, difficulty: s.difficulty, origin: s.origin, traits: equipped.filter(id => d.traits[id]) },
		};
	}

	/* Nothing passed in is changed, so a refused Begin leaves everything as it was. */
	function finish(state, meta) {
		const v = validate(state, meta);
		if (!v.ok) return { ok: false, errors: v.errors, game: null, meta: null };
		const c = v.clean;
		const game = sim().create({ name: c.name, origin: c.origin, disease: c.pathogen, difficulty: c.difficulty, traits: c.traits });
		const next = metaView(meta);
		next.lastSetup = { pathogen: c.pathogen, difficulty: c.difficulty, origin: c.origin, traits: [...c.traits] };
		return { ok: true, errors: [], game, meta: next };
	}

	/* The legal parts of meta.lastSetup; traits that no longer fit are dropped. Null when there is none. */
	function fitLastSetup(meta) {
		const d = data();
		const last = meta && meta.lastSetup;
		if (!last || typeof last !== "object") return null;
		const fit = {};
		if (typeof last.pathogen === "string" && pathogenPlayable(meta, last.pathogen)) fit.pathogen = last.pathogen;
		if (typeof last.difficulty === "string" && difficultyPlayable(meta, last.difficulty)) fit.difficulty = last.difficulty;
		if (typeof last.origin === "string" && d.regions[last.origin]) fit.origin = last.origin;
		const traits = [];
		const cats = new Set();
		(Array.isArray(last.traits) ? last.traits : []).forEach(id => {
			if (typeof id !== "string" || !d.traits[id] || !sim().traitAvailable(metaView(meta), id) || traits.includes(id)) return;
			if (cats.has(d.traits[id].category) || traits.length >= slotCount(meta)) return;
			cats.add(d.traits[id].category);
			traits.push(id);
		});
		fit.traits = traits;
		return fit;
	}

	function useLast(state, meta) {
		const fit = fitLastSetup(meta);
		if (!fit) return no("There is no earlier setup.");
		["pathogen", "difficulty", "origin"].forEach(k => {
			if (fit[k]) state[k] = fit[k];
		});
		state.slots = Array.from({ length: slotCount(meta) }, (_, i) => fit.traits[i] || null);
		state.pick = null;
		state.reached = steps.length - 1;
		state.step = "review";
		return OK;
	}

	function stepBar(state) {
		const cur = stepIndex(state.step);
		return steps.map((s, i) => ({
			id: s.id,
			name: s.name,
			number: i + 1,
			current: i === cur,
			done: i < cur || (i > cur && i <= state.reached),
			link: i !== cur && i <= state.reached,
		}));
	}

	function unlockHint(kind, id) {
		const rule = data().meta.unlocks.find(r => (r.grants[kind] || []).includes(id));
		return rule ? rule.hint : "";
	}

	function pathogenCards(state, meta) {
		return Object.entries(data().pathogens).map(([id, def]) => {
			const playable = pathogenPlayable(meta, id);
			return {
				id,
				name: def.name,
				line: def.line,
				desc: def.desc,
				playable,
				hint: playable || metaView(meta).unlocked.pathogens.includes(id) ? "" : unlockHint("pathogens", id),
				selected: playable && state.pathogen === id,
				status: !playable ? "Locked" : state.pathogen === id ? "Selected" : "Available",
			};
		});
	}

	function difficultyCards(state, meta) {
		return Object.entries(data().difficulties).map(([id, def]) => {
			const playable = difficultyPlayable(meta, id);
			return {
				id,
				name: def.name,
				line: def.line,
				notes: def.notes,
				playable,
				hint: playable || metaView(meta).unlocked.difficulties.includes(id) ? "" : unlockHint("difficulties", id),
				selected: playable && state.difficulty === id,
				status: !playable ? "Locked" : state.difficulty === id ? "Selected" : "Available",
			};
		});
	}

	function originCards(state) {
		return Object.keys(data().regions).map(id => ({ ...sim().originView(id), selected: state.origin === id }));
	}

	function traitBrowser(state, meta) {
		const d = data();
		const slot = Number.isInteger(state.slotOpen) ? state.slotOpen : 0;
		const slots = slotList(state).map((id, i) => ({
			index: i,
			number: i + 1,
			id,
			name: id && d.traits[id] ? d.traits[id].name : "",
			category: id && d.traits[id] ? d.traitCategories[d.traits[id].category].name : "",
			open: i === slot,
		}));
		const categories = Object.entries(d.traitCategories).map(([cid, c]) => {
			const holder = slotList(state).findIndex(t => t && d.traits[t] && d.traits[t].category === cid);
			return {
				id: cid,
				name: c.name,
				covered: holder >= 0 ? { slot: holder + 1, name: d.traits[slotList(state)[holder]].name } : null,
				traits: Object.entries(d.traits)
					.filter(([, t]) => t.category === cid)
					.map(([id, t]) => {
						const st = traitState(state, meta, id, slot);
						const words = {
							equipped: `In slot ${slot + 1}`,
							elsewhere: `In slot ${st.slot + 1}`,
							covered: `${c.name} covered`,
							locked: "Locked",
							available: "Available",
						};
						return { id, name: t.name, desc: t.desc, effectLines: effectLines(t.effects), state: st.state, status: words[st.state], picked: state.pick === id };
					}),
			};
		});
		const picked = state.pick && d.traits[state.pick] ? state.pick : null;
		const detail = picked
			? {
					id: picked,
					name: d.traits[picked].name,
					category: d.traitCategories[d.traits[picked].category].name,
					desc: d.traits[picked].desc,
					effectLines: effectLines(d.traits[picked].effects),
					...traitState(state, meta, picked, slot),
			  }
			: null;
		if (detail) {
			const st = detail.state;
			detail.action = st === "available" ? "equip" : st === "equipped" ? "clear" : "none";
			detail.note =
				st === "covered"
					? `${detail.category} is already covered by ${d.traits[detail.by].name} in slot ${detail.slot + 1}. Clear that slot to use this trait.`
					: st === "elsewhere"
					? `Already in slot ${detail.slot + 1}.`
					: st === "locked"
					? "Not yet unlocked."
					: "";
		}
		return { slots, categories, detail, openSlot: slot + 1 };
	}

	const effectLines = effects => sim().effectLines(effects);

	function review(state, meta, game) {
		const d = data();
		const v = validate(state, meta);
		const origin = d.regions[state.origin] ? sim().originView(state.origin) : null;
		return {
			ok: v.ok,
			errors: v.errors,
			name: v.clean.name,
			pathogen: d.pathogens[state.pathogen] ? d.pathogens[state.pathogen].name : "",
			difficulty: d.difficulties[state.difficulty] ? d.difficulties[state.difficulty].name : "",
			origin: origin ? origin.name : "",
			originNote: origin ? origin.summary : "",
			traits: v.clean.traits.map(id => ({
				id,
				name: d.traits[id].name,
				category: d.traitCategories[d.traits[id].category].name,
				effectLines: effectLines(d.traits[id].effects),
			})),
			replaces: game && game.status === "active" ? game.day : null,
		};
	}

	return Object.freeze({
		steps,
		stepIndex,
		metaView,
		slotCount,
		pathogenPlayable,
		difficultyPlayable,
		cleanName,
		defaults,
		choose,
		suggestName,
		go,
		next,
		back,
		traitState,
		equip,
		clearSlot,
		openSlot,
		validate,
		finish,
		fitLastSetup,
		useLast,
		stepBar,
		pathogenCards,
		difficultyCards,
		originCards,
		traitBrowser,
		review,
	});
})();

/* A redraw must not inherit the clicked link's macro context. Otherwise each new link keeps the previous render's
 * parent contexts and detached DOM alive until the player leaves the passage. Keep SugarCube's normal replace cleanup. */
Macro.add("plagueReplace", {
	tags: null,
	handler() {
		const parser = Wikifier.Parser.get("macro");
		const context = parser.context;
		try {
			parser.context = null;
			Macro.get("replace").handler.call(Object.create(this, { name: { value: "replace" }, self: { value: Macro.get("replace") } }));
		} finally {
			parser.context = context;
		}
	},
});

/* Outbreak map and evolution-tree display helpers. Read-only; the simulation never loads this file. */
setup.plagueUi = (() => {
	"use strict";

	/* Node centres as percentages of the map box; the same percentages give the same topology on desktop and phones. */
	const layout = {
		north: { x: 50, y: 11 },
		farmland: { x: 20, y: 37 },
		forest: { x: 80, y: 37 },
		town: { x: 20, y: 63 },
		lake: { x: 80, y: 63 },
		coast: { x: 50, y: 89 },
	};

	/* "Full" means nobody healthy is left, so a region whose living are all infected reads as full even after deaths. */
	const tierNames = ["none", "trace", "low", "medium", "severe", "full"];

	function tierOf(r) {
		if (r.infected === 0) return 0;
		if (r.healthy === 0) return 5;
		if (r.infectedPct < 10) return 1;
		if (r.infectedPct < 40) return 2;
		if (r.infectedPct < 70) return 3;
		return 4;
	}

	function pct(n) {
		if (!(n > 0)) return "0%";
		if (n < 0.1) return "<0.1%";
		if (n < 10) return `${Math.floor(n * 10) / 10}%`;
		if (n < 100) return `${Math.floor(n)}%`;
		return "100%";
	}

	function isolationDays(game, id) {
		const e = game.effects.find(x => x.source === "response" && x.target === id);
		return e ? e.daysLeft : 0;
	}

	function regionNode(game, id) {
		const sim = setup.plagueSimulation;
		const r = sim.regionView(game, id);
		const tier = tierOf(r);
		const days = r.isolated ? isolationDays(game, id) : 0;
		const parts = [`${pct(r.infectedPct)} infected`, tierNames[tier]];
		if (r.dead > 0) parts.push(`${pct(r.deadPct)} dead`);
		if (r.isolated) parts.push(`isolated${days ? `, ${days} ${days === 1 ? "day" : "days"} left` : ""}`);
		return {
			id,
			name: r.name,
			x: layout[id].x,
			y: layout[id].y,
			tier,
			tierName: tierNames[tier],
			infectedText: pct(r.infectedPct),
			deadText: pct(r.deadPct),
			/* The dead band starts at 1% so a handful of deaths does not draw a sliver. */
			deadBand: r.deadPct >= 1 ? Math.min(100, r.deadPct) : 0,
			isolated: r.isolated,
			isolationDays: days,
			label: `${r.name}: ${parts.join(", ")}`,
		};
	}

	function regionNodes(game) {
		return Object.keys(setup.plagueData.regions).map(id => regionNode(game, id));
	}

	function routes(game) {
		const d = setup.plagueData;
		const sim = setup.plagueSimulation;
		const isolated = {};
		for (const id of Object.keys(d.regions)) isolated[id] = sim.regionView(game, id).isolated;
		return d.routes.map(rt => {
			const closed = !!(isolated[rt.a] || isolated[rt.b]);
			const a = layout[rt.a];
			const b = layout[rt.b];
			return {
				a: rt.a,
				b: rt.b,
				type: rt.type,
				typeName: d.routeTypes[rt.type].name,
				closed,
				x1: a.x,
				y1: a.y,
				x2: b.x,
				y2: b.y,
				midX: (a.x + b.x) / 2,
				midY: (a.y + b.y) / 2,
				label: `${d.regions[rt.a].name} to ${d.regions[rt.b].name} by ${d.routeTypes[rt.type].name}${closed ? ", closed by isolation" : ""}`,
			};
		});
	}

	/* A closed route is drawn as two stubs with a gap where the map puts its closure marker. */
	function routeSvg(game) {
		const line = (cls, x1, y1, x2, y2) => `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"></line>`;
		const drawn = routes(game).map(rt => {
			const cls = `plague-route plague-route-${rt.type}${rt.closed ? " plague-route-closed" : ""}`;
			const segs = rt.closed
				? [
						[rt.x1, rt.y1, rt.x1 + (rt.x2 - rt.x1) * 0.4, rt.y1 + (rt.y2 - rt.y1) * 0.4],
						[rt.x1 + (rt.x2 - rt.x1) * 0.6, rt.y1 + (rt.y2 - rt.y1) * 0.6, rt.x2, rt.y2],
				  ]
				: [[rt.x1, rt.y1, rt.x2, rt.y2]];
			const strokes = segs.map(s => line("plague-route-line", ...s) + (rt.type === "river" ? line("plague-route-gap", ...s) : "")).join("");
			return `<g class="${cls}" data-route="${rt.a}-${rt.b}" data-route-type="${rt.type}">${strokes}</g>`;
		});
		return `<svg class="plague-routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">${drawn.join("")}</svg>`;
	}

	function legendSvg(type) {
		const gap = type === "river" ? '<line class="plague-route-gap" x1="0" y1="5" x2="30" y2="5"></line>' : "";
		return `<svg class="plague-legend-line plague-route-${type}" viewBox="0 0 30 10" aria-hidden="true" focusable="false"><line class="plague-route-line" x1="0" y1="5" x2="30" y2="5"></line>${gap}</svg>`;
	}

	function dnaFeedback(result) {
		if (!result || !result.dnaGained) return "";
		const reasons = result.dnaReasons || result.milestones.map(m => m.text);
		return `+${result.dnaGained} DNA: ${reasons.join("; ")}.`;
	}

	function mutationFeedback(summary) {
		const upgrades = setup.plagueData.upgrades;
		return ((summary && summary.mutations) || []).map(id => `Mutation: ${upgrades[id].name} evolved spontaneously.`).join(" ");
	}

	function dayFeedback(summary, game) {
		const lines = [mutationFeedback(summary)];
		const def = summary && summary.entrenchment && setup.plagueData.pathogens[game.disease].entrenchment;
		if (def) lines.push(`Entrenchment increased to ${def.names[summary.entrenchment - 1]}.`);
		return lines.filter(Boolean).join(" ");
	}

	/* Inline SVG in currentColor so the symbols follow the theme. Decorative: the text beside each one carries the meaning. */
	const symbolPaths = Object.freeze({
		casual: '<path d="M5 19C5 10 10 5 19 5c0 9-5 14-14 14z"/><path d="M5 19L13 11"/>',
		normal: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/>',
		brutal: '<path d="M12 2l2.5 6 6-2.5-3 5.5 5.5 3-6 .5.5 6.5-5.5-4-5.5 4 .5-6.5-6-.5 5.5-3-3-5.5 6 2.5z"/>',
		spread: '<circle cx="12" cy="12" r="2.5"/><path d="M12 9.5V3M12 14.5V21M9.5 12H3M14.5 12H21"/>',
		concealment: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 20L20 4"/>',
		adaptation: '<path d="M20 8a8 8 0 0 0-14-2M4 4v4h4"/><path d="M4 16a8 8 0 0 0 14 2M20 20v-4h-4"/>',
		resistance: '<rect x="3" y="5" width="18" height="14"/><path d="M3 12h18M9 5v7M15 12v7"/>',
		tempo: '<path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/>',
		map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
		evolutions: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 7v10M6 12h10"/>',
		newOutbreak: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
		lastSetup: '<path d="M20 12a8 8 0 1 1-3-6.2M20 4v5h-5"/>',
	});
	const symbol = id =>
		symbolPaths[id]
			? `<svg class="plague-symbol plague-symbol-${id}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true" focusable="false">${symbolPaths[id]}</svg>`
			: "";

	function regionIcon(id) {
		const def = setup.plagueData.regions[id];
		return def && def.icon ? `<img class="plague-region-icon" src="img/misc/icon/${def.icon}" alt="" width="30" height="30">` : "";
	}

	const tree = Object.freeze({ gap: 1.8, node: 4.4 });

	/* One family's tree from prerequisite data only (tier is ignored). depth = 0 without prerequisites, else 1 + the deepest
	 * parent. A node takes the first free row at or below its depth and the row under each parent; a node sharing a parent with
	 * the occupant of its row opens a fork column, an unrelated one moves down. Desktop grid rows: 1 lane names, then per node
	 * row r a gap row 2 + 2r and a node row 3 + 2r. Phones use mRow / mCol / mSpan inside each lane instead. */
	function evolveLayout(game, familyId) {
		const d = setup.plagueData;
		const group = setup.plagueSimulation.upgradeViews(game).find(g => g.id === familyId);
		if (!group) return null;
		const byId = {};
		group.upgrades.forEach(u => (byId[u.id] = u));
		const parentsOf = u => [...u.requires, ...u.requiresAny].filter(p => byId[p]);
		const depth = {};
		const depthOf = u => {
			if (depth[u.id] === undefined) depth[u.id] = parentsOf(u).reduce((m, p) => Math.max(m, depthOf(byId[p]) + 1), 0);
			return depth[u.id];
		};
		const lanes = group.branches.map(b => ({ id: b.id, name: b.name, width: 1, cells: {}, nodes: [] }));
		const laneOf = {};
		lanes.forEach((lane, i) => group.branches[i].upgrades.forEach(u => (laneOf[u.id] = lane)));
		/* Lane order: data order, except that a lane fed from two or more other lanes moves in front of the right-most of
		 * them, so its lines never have to pass a lane in between (Travel sits between Water and Animal). */
		[...lanes].forEach((lane, i) => {
			const fed = [...new Set(group.branches[i].upgrades.flatMap(u => parentsOf(u).map(p => laneOf[p])))].filter(l => l !== lane);
			if (fed.length < 2) return;
			lanes.splice(lanes.indexOf(lane), 1);
			lanes.splice(Math.max(...fed.map(l => lanes.indexOf(l))), 0, lane);
		});
		const order = group.upgrades.map(u => u.id);
		const place = {};
		[...group.upgrades]
			.sort((a, b) => depthOf(a) - depthOf(b) || order.indexOf(a.id) - order.indexOf(b.id))
			.forEach(u => {
				const lane = laneOf[u.id];
				const parents = parentsOf(u);
				let row = parents.reduce((m, p) => Math.max(m, place[p].row + 1), depthOf(u));
				for (;;) {
					let sub = 0;
					while (sub < lane.width && lane.cells[`${row}:${sub}`]) sub++;
					if (sub === lane.width) {
						const occupants = Object.keys(lane.cells)
							.filter(k => k.startsWith(`${row}:`))
							.map(k => byId[lane.cells[k]]);
						if (!occupants.some(o => parentsOf(o).some(p => parents.includes(p)))) {
							row++;
							continue;
						}
						lane.width++;
					}
					lane.cells[`${row}:${sub}`] = u.id;
					place[u.id] = { row, sub };
					lane.nodes.push(u);
					break;
				}
			});
		let col = 0;
		lanes.forEach(lane => {
			lane.col = col;
			col += lane.width;
		});
		const cols = col;
		const rows = Object.values(place).reduce((m, p) => Math.max(m, p.row + 1), 0);
		const step = tree.gap + tree.node;
		const nameOf = id => (d.upgrades[id] ? d.upgrades[id].name : id);
		const forks = [];
		lanes.forEach(lane => {
			lane.nodes.sort((a, b) => place[a.id].row - place[b.id].row || place[a.id].sub - place[b.id].sub);
			let mRow = 1;
			[...new Set(lane.nodes.map(u => place[u.id].row))].forEach(row => {
				const here = lane.nodes.filter(u => place[u.id].row === row);
				const groups = [...new Set(here.filter(u => u.exclusive).map(u => u.exclusive))];
				groups.forEach(ex => {
					const members = here.filter(u => u.exclusive === ex);
					if (members.length < 2 || members.length !== members[0].rivals.length + 1) return;
					const subs = members.map(u => place[u.id].sub);
					const owned = members.find(u => u.owned);
					forks.push({
						group: ex,
						lane: lane.id,
						row,
						col: lane.col + Math.min(...subs),
						span: Math.max(...subs) - Math.min(...subs) + 1,
						gridRow: 2 + 2 * row,
						mRow: mRow + 1,
						ids: members.map(u => u.id),
						chosen: owned ? owned.name : "",
						label: owned ? `Chose ${owned.name}` : "Pick one",
					});
				});
				if (forks.some(f => f.lane === lane.id && f.row === row)) mRow++;
				mRow++;
				here.forEach(u => {
					const p = place[u.id];
					u.row = p.row;
					u.col = lane.col + p.sub;
					u.gridRow = 3 + 2 * p.row;
					u.mRow = mRow;
					u.mCol = here.length === 1 ? 1 : p.sub + 1;
					u.mSpan = here.length === 1 ? lane.width : 1;
					u.lane = lane.id;
					const away = ids => ids.filter(p => byId[p] && laneOf[p] !== lane).map(nameOf);
					const all = away(u.requires);
					const any = away(u.requiresAny);
					u.afterText = [...all, ...(any.length ? [any.join(" or ")] : [])].join(" and ");
					u.parentNames = { all: u.requires.map(nameOf), any: u.requiresAny.map(nameOf) };
					u.rivalNames = u.rivals.map(nameOf);
					u.excludedByName = u.excludedBy ? nameOf(u.excludedBy) : "";
				});
			});
			lane.mRows = mRow;
		});
		const edges = [];
		group.upgrades.forEach(u => {
			[
				["all", u.requires],
				["any", u.requiresAny],
			].forEach(([kind, ids]) =>
				ids
					.filter(p => byId[p])
					.forEach(p => {
						const from = byId[p];
						edges.push({
							from: p,
							to: u.id,
							kind,
							fork: !!(u.exclusive && forks.some(f => f.ids.includes(u.id))),
							owned: from.owned && u.owned,
							excluded: u.planState === "excluded",
							x1: from.col + 0.5,
							y1: from.row * step + step,
							x2: u.col + 0.5,
							y2: u.row * step + tree.gap,
						});
					})
			);
		});
		return {
			id: group.id,
			name: group.name,
			ownedCount: group.ownedCount,
			cols,
			rows,
			tree,
			lanes: lanes.map(({ cells, ...lane }) => lane),
			nodes: group.upgrades,
			forks,
			edges,
		};
	}

	/* Each edge leaves its parent's bottom, turns in the gap row above the child and enters the child's top, so no line crosses a node. */
	function evolveSvg(layout) {
		const r = n => Math.round(n * 100) / 100;
		const height = r(layout.rows * (layout.tree.gap + layout.tree.node));
		const paths = layout.edges.map(e => {
			const turn = r(e.y2 - layout.tree.gap / 2);
			const cls = [
				"plague-edge",
				`plague-edge-${e.kind}`,
				e.owned ? "plague-edge-owned" : "",
				e.excluded ? "plague-edge-excluded" : "",
				e.fork ? "plague-edge-fork" : "",
			]
				.filter(Boolean)
				.join(" ");
			return `<path class="${cls}" data-edge="${e.from}-${e.to}" d="M${e.x1} ${r(e.y1)}V${turn}H${e.x2}V${r(e.y2)}"></path>`;
		});
		return `<svg class="plague-edges" viewBox="0 0 ${layout.cols} ${height}" preserveAspectRatio="none" aria-hidden="true" focusable="false">${paths.join(
			""
		)}</svg>`;
	}

	/* Player text as HTML that shows exactly those characters: every ASCII character that is not a letter, digit or space becomes
	 * a numeric entity, so neither HTML nor SugarCube markup can be read as anything but text. Print with <<print>>, not <<->>,
	 * which escapes HTML but still hands the text to the wiki parser. */
	function plainHtml(text) {
		return String(text === undefined || text === null ? "" : text).replace(/[^A-Za-z0-9 ]/g, c => (c.charCodeAt(0) < 128 ? `&#${c.charCodeAt(0)};` : c));
	}

	return Object.freeze({
		plainHtml,
		evolveLayout,
		evolveSvg,
		dnaFeedback,
		mutationFeedback,
		dayFeedback,
		symbol,
		regionIcon,
		layout,
		tierNames,
		tierOf,
		regionNode,
		regionNodes,
		routes,
		routeSvg,
		legendSvg,
	});
})();
