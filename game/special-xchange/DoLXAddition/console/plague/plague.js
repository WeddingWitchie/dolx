/* Outbreak console minigame: simulation. Every function takes the save object (V.plagueGame); advanceDay and buyUpgrade
 * change it in place. Definitions come from setup.plagueData.
 *
 * A day is the list of phases in dayPhases: local spread and routes read a snapshot and produce deltas, which are then
 * applied together, so region order never matters. Timing per day:
 *  - modifiers() is read once before any spread, so everything in force at the start of the day shapes it;
 *  - the response stage may rise by one afterwards; its NEW stage sets today's research speed, while its travel and
 *    spread measures start tomorrow;
 *  - every timed effect then loses 1 from daysLeft and is removed at 0, and effects started today are added, so they first
 *    apply on the NEXT day and last their full `duration`.
 *
 * advanceDay and rollEvent take an optional `random` (default Math.random). */
(() => {
	const data = () => setup.plagueData;

	const randomRound = (x, random) => {
		const base = Math.floor(x);
		return base + (random() < x - base ? 1 : 0);
	};

	const isNoticed = game => game.response.stage >= 1;
	const researchActive = game => stageDef(game.response.stage).cure > 0;
	const stageDef = stage => {
		const stages = data().response.stages;
		return stages[Math.min(Math.max(0, stage), stages.length - 1)];
	};

	/* Every entry in game.effects is { source, id, target, daysLeft }; `source` picks the definition table. */
	const effectTables = { world: "events", response: "responseEffects", ability: "abilityEffects" };
	const effectDef = e => {
		const table = effectTables[e.source];
		return table ? data()[table][e.id] : undefined;
	};
	const worldEffects = game => game.effects.filter(e => e.source === "world");

	const eventNeeds = {
		noticed: isNoticed,
		cure: researchActive,
	};
	const isCount = n => Number.isInteger(n) && n >= 0;

	const newAbility = def => ({ id: def.id, charges: def.charges, maxCharges: def.charges, used: [] });

	/* Unknown options fall back to the standard game (Bacteria, Normal, Town, no traits). The setup flow validates first and
	 * never relies on that. */
	function create(options = {}) {
		const d = data();
		const origin = d.regions[options.origin] ? options.origin : "town";
		const traits = {};
		Object.keys(d.traits).forEach(id => {
			if ([].concat(options.traits || []).includes(id)) traits[id] = 1;
		});
		let extraDna = 0;
		let extraInfected = 0;
		Object.keys(traits).forEach(id => {
			extraDna += d.traits[id].effects.startingDna || 0;
			extraInfected += d.traits[id].effects.startingInfected || 0;
		});
		const regions = {};
		for (const [id, def] of Object.entries(d.regions)) {
			const infected = id === origin ? Math.min(d.tuning.startingInfected + extraInfected, def.population) : 0;
			regions[id] = { healthy: def.population - infected, infected, dead: 0 };
		}
		const game = {
			version: d.version,
			status: "active",
			outcome: null,
			disease: d.pathogens[options.disease] ? options.disease : "bacteria",
			difficulty: d.difficulties[options.difficulty] ? options.difficulty : "normal",
			name: options.name || "Pathogen",
			day: 1,
			dna: d.tuning.startingDna + extraDna,
			upgrades: [],
			cure: 0,
			response: { stage: 0, detectedDay: null },
			regions,
			effects: [],
			log: [{ day: 1, text: `${d.regions[origin].name} reports its first cases.`, tone: "" }],
			origin,
			traits,
			mutations: [],
			milestones: [],
			ability: d.pathogens[options.disease] && d.pathogens[options.disease].ability ? newAbility(d.pathogens[options.disease].ability) : null,
			recorded: false,
			report: null,
			rewarded: false,
			reward: null,
		};
		/* The starting cases are given, not earned: their milestones are claimed without DNA. */
		collectMilestones(game, { award: false });
		return game;
	}

	/* Fills missing fields and repairs impossible region numbers; a valid game comes back unchanged. Null when there is none. */
	function ensure(game) {
		if (!game || typeof game !== "object") return null;
		const d = data();
		if (!Number.isInteger(game.version)) game.version = d.version;
		if (!["active", "won", "lost"].includes(game.status)) game.status = "active";
		if (game.outcome === undefined) game.outcome = null;
		if (typeof game.disease !== "string") game.disease = "bacteria";
		if (typeof game.difficulty !== "string") game.difficulty = "normal";
		if (typeof game.name !== "string") game.name = "Pathogen";
		if (!Number.isInteger(game.day) || game.day < 1) game.day = 1;
		if (!Number.isFinite(game.dna) || game.dna < 0) game.dna = 0;
		if (!Array.isArray(game.upgrades)) game.upgrades = [];
		if (!Number.isFinite(game.cure)) game.cure = 0;
		const r = game.response;
		if (!r || typeof r !== "object" || !Number.isInteger(r.stage) || r.stage < 0) game.response = { stage: 0, detectedDay: null };
		else if (!Number.isInteger(r.detectedDay)) r.detectedDay = r.stage >= 1 ? game.day : null;
		if (!Array.isArray(game.effects)) game.effects = [];
		if (!Array.isArray(game.log)) game.log = [];
		if (!game.traits || typeof game.traits !== "object") game.traits = {};
		if (!Array.isArray(game.mutations)) game.mutations = [];
		const rebuildMilestones = !Array.isArray(game.milestones);
		if (rebuildMilestones) game.milestones = [];
		if (game.ability === undefined) game.ability = null;
		/* A finished run missing these flags is treated as handled, so opening it never records or pays anything. */
		if (typeof game.recorded !== "boolean") game.recorded = game.status !== "active";
		if (game.report === undefined) game.report = null;
		if (typeof game.rewarded !== "boolean") game.rewarded = game.status !== "active";
		if (game.reward === undefined) game.reward = null;
		if (!d.regions[game.origin]) game.origin = "town";
		if (!game.regions || typeof game.regions !== "object") game.regions = {};
		for (const [id, def] of Object.entries(d.regions)) {
			const r = game.regions[id];
			if (!r || typeof r !== "object") {
				/* A region added after this save started joins untouched. */
				game.regions[id] = { healthy: def.population, infected: 0, dead: 0 };
			} else if (!isCount(r.healthy) || !isCount(r.infected) || !isCount(r.dead) || r.healthy + r.infected + r.dead !== def.population) {
				repairRegion(r, def.population);
			}
		}
		if (rebuildMilestones) collectMilestones(game, { award: false });
		return game;
	}

	function createMeta() {
		const m = data().meta;
		return {
			version: m.version,
			unlocked: { pathogens: [...m.starter.pathogens], difficulties: [...m.starter.difficulties], traits: [], slots: m.startingSlots },
			record: { runs: 0, wins: 0, best: {}, highest: null },
			dailyRewards: null,
			lastSetup: null,
		};
	}

	const traitAvailable = (meta, id) => {
		const def = data().traits[id];
		return !!def && (def.starter === true || (!!meta && !!meta.unlocked && Array.isArray(meta.unlocked.traits) && meta.unlocked.traits.includes(id)));
	};

	/* Like ensure(): fills missing fields of an existing $plagueMeta and never resets a valid one. Null when there is none. */
	function ensureMeta(meta) {
		if (!meta || typeof meta !== "object") return null;
		const fresh = createMeta();
		if (!Number.isInteger(meta.version)) meta.version = fresh.version;
		if (!meta.unlocked || typeof meta.unlocked !== "object") meta.unlocked = fresh.unlocked;
		for (const key of ["pathogens", "difficulties", "traits"]) if (!Array.isArray(meta.unlocked[key])) meta.unlocked[key] = fresh.unlocked[key];
		if (!Number.isInteger(meta.unlocked.slots)) meta.unlocked.slots = fresh.unlocked.slots;
		if (!meta.record || typeof meta.record !== "object") meta.record = fresh.record;
		for (const key of ["runs", "wins"]) if (!isCount(meta.record[key])) meta.record[key] = 0;
		if (!meta.record.best || typeof meta.record.best !== "object" || Array.isArray(meta.record.best)) meta.record.best = {};
		if (typeof meta.record.highest !== "string") meta.record.highest = null;
		if (meta.lastSetup === undefined) meta.lastSetup = null;
		if (meta.dailyRewards === undefined) meta.dailyRewards = null;
		return meta;
	}

	const runKey = (pathogen, difficulty, origin) => `${pathogen}/${difficulty}/${origin}`;
	const gameKey = game => runKey(game.disease, game.difficulty, game.origin);
	const roundTenth = n => Math.round(n * 10) / 10;

	/* Counts the run, updates the best win for its pathogen/difficulty/origin, applies the unlock rules and stores what changed
	 * on game.report. The caller makes sure meta exists. Null when the run is still going or already recorded. */
	function recordRun(game, meta) {
		if (!game || game.status === "active" || game.recorded) return null;
		const d = data();
		const m = ensureMeta(meta);
		if (!m) return null;
		game.recorded = true;
		const report = { unlocked: [], first: false, day: null, cure: null, highest: false };
		m.record.runs += 1;
		if (game.status === "won") {
			m.record.wins += 1;
			const key = gameKey(game);
			const day = game.day - 1;
			const cure = roundTenth(game.cure);
			const prev = m.record.best[key];
			report.first = !prev;
			if (!prev || day < prev.day) report.day = { value: day, previous: prev ? prev.day : null };
			if (!prev || cure < prev.cure) report.cure = { value: cure, previous: prev ? prev.cure : null };
			m.record.best[key] = { day: prev ? Math.min(prev.day, day) : day, cure: prev ? Math.min(prev.cure, cure) : cure };
			const rank = id => Object.keys(d.difficulties).indexOf(id);
			if (rank(game.difficulty) > rank(m.record.highest)) {
				m.record.highest = game.difficulty;
				report.highest = true;
			}
			d.meta.unlocks.forEach(rule => {
				if ((rule.pathogen && rule.pathogen !== game.disease) || !rule.difficulties.includes(game.difficulty)) return;
				Object.entries(rule.grants).forEach(([kind, ids]) =>
					ids.forEach(id => {
						if (m.unlocked[kind].includes(id)) return;
						m.unlocked[kind].push(id);
						report.unlocked.push({ kind, id, name: d[kind][id].name });
					})
				);
			});
		}
		game.report = report;
		return report;
	}

	function progressView(game, meta) {
		const d = data();
		const lines = [];
		const r = game.report;
		const label = `${d.pathogens[game.disease] ? d.pathogens[game.disease].name : game.disease} / ${
			d.difficulties[game.difficulty] ? d.difficulties[game.difficulty].name : game.difficulty
		} / ${d.regions[game.origin].name}`;
		if (r) {
			r.unlocked.forEach(u => lines.push({ tone: "green", text: u.kind === "traits" ? `Trait unlocked: ${u.name}!` : `${u.name} unlocked!` }));
			if (r.first) lines.push({ tone: "", text: `First win, ${label}: day ${game.day - 1}.` });
			else if (r.day) lines.push({ tone: "green", text: `New best ${label}: day ${r.day.value} (was day ${r.day.previous}).` });
			if (r.cure && !r.first && r.cure.previous !== null)
				lines.push({ tone: "green", text: `Lowest cure at victory, ${label}: ${r.cure.value}% (was ${r.cure.previous}%).` });
			if (r.highest) lines.push({ tone: "", text: `Highest difficulty cleared: ${d.difficulties[game.difficulty].name}.` });
		}
		const best = meta && meta.record && meta.record.best ? meta.record.best[gameKey(game)] : null;
		if (best && game.status === "lost") lines.push({ tone: "", text: `Your best win with this setup is day ${best.day}.` });
		return { label, lines };
	}

	function repairRegion(r, population) {
		const clampCount = n => (Number.isFinite(n) ? Math.min(population, Math.max(0, Math.round(n))) : 0);
		r.dead = clampCount(r.dead);
		r.infected = Math.min(clampCount(r.infected), population - r.dead);
		r.healthy = population - r.infected - r.dead;
	}

	/* Everything that changes the disease's numbers, in the order applied. Order only matters for floating-point rounding, so
	 * new sources go at the end. */
	const modifierSources = Object.freeze([
		{ id: "upgrades", effects: (game, d) => game.upgrades.map(id => [d.upgrades[id] && d.upgrades[id].effects, null]) },
		{ id: "effects", restrictive: true, effects: game => game.effects.map(e => [effectDef(e) && effectDef(e).effects, e.target]) },
		{ id: "response", restrictive: true, effects: game => [[responseStageEffects(game), null]] },
		/* Setup sources are plain effect objects from data, so a neutral setup adds nothing. Traits are read in data order. */
		{ id: "pathogen", effects: (game, d) => [[d.pathogens[game.disease] && d.pathogens[game.disease].effects, null]] },
		{ id: "difficulty", effects: (game, d) => [[d.difficulties[game.difficulty] && d.difficulties[game.difficulty].effects, null]] },
		{
			id: "traits",
			effects: (game, d) =>
				Object.keys(d.traits)
					.filter(id => game.traits && game.traits[id])
					.map(id => [d.traits[id].effects, null]),
		},
		{
			id: "entrenchment",
			effects: (game, d) => {
				const def = d.pathogens[game.disease] && d.pathogens[game.disease].entrenchment;
				const level = def ? entrenchmentLevel(game) : 0;
				return level ? [[{ cure: def.cure ** level }, null]] : [];
			},
		},
	]);

	/* game.day is the day about to be played, so level n is in force for that day's cure research and every later day. */
	function entrenchmentLevel(game) {
		const def = data().pathogens[game.disease] && data().pathogens[game.disease].entrenchment;
		return def ? def.days.filter(day => game.day >= day).length : 0;
	}

	function responseStageEffects(game) {
		const d = data();
		const stage = stageDef(game.response.stage);
		const local = stage.localSpread !== undefined && stage.localSpread !== 1;
		if (!stage.effects && !stage.healthcareSpread && !local) return null;
		const fx = { ...(stage.effects || {}) };
		if (local) fx.spread = (fx.spread === undefined ? 1 : fx.spread) * stage.localSpread;
		if (stage.healthcareSpread) {
			fx.regions = {};
			for (const [id, r] of Object.entries(d.regions)) if (r.healthcare >= d.response.highHealthcare) fx.regions[id] = stage.healthcareSpread;
		}
		return fx;
	}

	function measureLinesFor(game, id, routeTypes) {
		const stage = stageDef(game.response.stage);
		const measures = responseStageEffects(game);
		if (!measures) return [];
		const rest = { ...measures };
		const lines = [];
		if (stage.localSpread !== undefined && stage.localSpread !== 1) {
			delete rest.spread;
			if (stage.spreadNote) lines.push(stage.spreadNote);
		}
		return lines.concat(effectLinesFor(rest, id, routeTypes));
	}

	function applyEffects(mods, effects, target, restrictive) {
		if (!effects) return;
		for (const stat of ["infectivity", "severity", "lethality", "resistance"]) mods[stat] += effects[stat] || 0;
		mods.visibility += effects.visibility || 0;
		for (const mult of ["spread", "travel", "cure", "dnaReward", "pressure"]) if (effects[mult] !== undefined) mods[mult] *= effects[mult];
		mods.infectedWork += effects.infectedWork || 0;
		for (const [k, v] of Object.entries(effects.routes || {})) mods.routes[k] = (mods.routes[k] || 1) * v;
		for (const [k, v] of Object.entries(effects.regions || {})) mods.regions[k] = (mods.regions[k] || 1) * v;
		for (const [k, v] of Object.entries(effects.climates || {})) mods.climates[k] = (mods.climates[k] || 1) * v;
		/* Each source of restriction resistance ignores its share of what is left, so several never pass 100%. */
		if (effects.restrictionResist) mods.restrictionResist = 1 - (1 - mods.restrictionResist) * (1 - effects.restrictionResist);
		/* A travel cut imposed by the world is counted again on its own, so restriction resistance can soften it later. */
		if (restrictive && effects.travel !== undefined && effects.travel < 1) mods.travelRestriction *= effects.travel;
		if (effects.cureHardening) mods.cureHardening = true;
		if (effects.isolate && target) mods.isolated[target] = true;
	}

	function modifiers(game) {
		const d = data();
		const mods = {
			...d.baseStats,
			spread: 1,
			travel: 1,
			cure: 1,
			visibility: 0,
			dnaReward: 1,
			pressure: 1,
			infectedWork: 0,
			restrictionResist: 0,
			/* Only the travel cuts the world imposes, so they can be softened without touching the disease's own travel. */
			travelRestriction: 1,
			cureHardening: false,
			routes: {},
			regions: {},
			climates: {},
			isolated: {},
		};
		modifierSources.forEach(source => source.effects(game, d).forEach(([effects, target]) => applyEffects(mods, effects, target, source.restrictive)));
		mods.resistance = Math.min(d.tuning.resistanceCap, mods.resistance);
		mods.restrictionResist = Math.min(d.tuning.restrictionResistCap, mods.restrictionResist);
		/* Nothing is recomputed without resistance, so travel keeps the exact value the multipliers produced. */
		if (mods.restrictionResist > 0 && mods.travelRestriction < 1) {
			mods.travel = (mods.travel / mods.travelRestriction) * (1 - (1 - mods.travelRestriction) * (1 - mods.restrictionResist));
		}
		return mods;
	}

	function stats(game) {
		const m = modifiers(game);
		return { infectivity: m.infectivity, severity: m.severity, lethality: m.lethality, resistance: m.resistance };
	}

	function totals(game) {
		const t = { population: 0, healthy: 0, infected: 0, dead: 0 };
		for (const [id, def] of Object.entries(data().regions)) {
			const r = game.regions[id];
			t.population += def.population;
			t.healthy += r.healthy;
			t.infected += r.infected;
			t.dead += r.dead;
		}
		return t;
	}

	const pctChange = m => {
		const p = Math.round((m - 1) * 100);
		return (p > 0 ? "+" : "") + p + "%";
	};

	function effectLinesFor(effects, id, routeTypes) {
		const d = data();
		const signed = n => (n > 0 ? "+" : "") + n;
		const regionClimate = id && d.regions[id] ? d.regions[id].climate : null;
		const lines = [];
		if (id === null) {
			for (const [stat, label] of [
				["infectivity", "Infectivity"],
				["severity", "Severity"],
				["lethality", "Lethality"],
			]) {
				if (effects[stat]) lines.push(`${label} ${signed(effects[stat])}`);
			}
			if (effects.resistance) lines.push(`Cure resistance ${signed(Math.round(effects.resistance * 100))}%`);
			if (effects.cure !== undefined) lines.push(`Cure research ${pctChange(effects.cure)}`);
		}
		if (effects.spread !== undefined) lines.push(`Spread in every region ${pctChange(effects.spread)}`);
		for (const [rid, m] of Object.entries(effects.regions || {})) {
			if (id === null) lines.push(`Spread in ${d.regions[rid].name} ${pctChange(m)}`);
			else if (rid === id) lines.push(`Spread here ${pctChange(m)}`);
		}
		if (effects.travel !== undefined) lines.push(`Travel between regions ${pctChange(effects.travel)}`);
		for (const [type, m] of Object.entries(effects.routes || {})) {
			if (id === null || routeTypes.includes(type)) lines.push(`Infection along ${d.routeTypes[type].name}s ${pctChange(m)}`);
		}
		if (id === null) {
			if (effects.visibility) lines.push(`Attention drawn ${signed(effects.visibility)}`);
			if (effects.dnaReward !== undefined) lines.push(`DNA from milestones ${pctChange(effects.dnaReward)}`);
			if (effects.pressure !== undefined) lines.push(`Response pressure ${pctChange(effects.pressure)}`);
			if (effects.infectedWork)
				lines.push(`Infected people do ${Math.round(Math.abs(effects.infectedWork) * 100)} points ${effects.infectedWork < 0 ? "less" : "more"} medical work`);
			if (effects.startingDna) lines.push(`Starting DNA ${effects.startingDna > 0 ? "+" : ""}${effects.startingDna}`);
			if (effects.startingInfected) lines.push(`Starting infected ${effects.startingInfected > 0 ? "+" : ""}${effects.startingInfected}`);
			if (effects.restrictionResist) lines.push(`Ignores ${Math.round(effects.restrictionResist * 100)}% of travel restrictions`);
			if (effects.cureHardening) lines.push("Slows cure research as it nears completion");
		}
		for (const [cid, m] of Object.entries(effects.climates || {})) {
			const cname = d.climates[cid] ? d.climates[cid].name.toLowerCase() : cid;
			if (id === null) lines.push(`Spread in ${cname} regions ${pctChange(m)}`);
			else if (regionClimate === cid) lines.push(`Spread here ${pctChange(m)}`);
		}
		if (effects.isolate) lines.push("No travel in or out");
		return lines;
	}

	function infectedWork(game) {
		const t = data().tuning;
		const m = modifiers(game);
		const work = t.infectedCapacityBase - m.severity * t.infectedCapacitySeverityPenalty + m.infectedWork;
		return Math.min(1, Math.max(t.infectedCapacityMin, work));
	}

	const workingPeople = (r, work) => r.healthy + r.infected * work;

	/* 1 when nobody is sick or dead, 0 when everyone is dead. */
	function medicalCapacity(game) {
		const work = infectedWork(game);
		let working = 0;
		let full = 0;
		for (const [id, def] of Object.entries(data().regions)) {
			working += def.healthcare * workingPeople(game.regions[id], work);
			full += def.healthcare * def.population;
		}
		return full > 0 ? Math.min(1, Math.max(0, working / full)) : 0;
	}

	const densityWord = def =>
		def.density >= 1.2
			? "Very dense population"
			: def.density >= 0.95
			? "Ordinary density"
			: def.density >= 0.75
			? "Spread-out population"
			: "Sparse population";
	const careWord = def =>
		def.healthcare >= 2 ? "Major medical centre" : def.healthcare >= 1.5 ? "Good healthcare" : def.healthcare >= 1 ? "Ordinary healthcare" : "Weak healthcare";

	function regionTraitLines(def, capacityShare) {
		const d = data();
		const lines = [];
		const density = densityWord(def);
		lines.push(def.density === 1 ? `${density}.` : `${density}: local spread ${pctChange(def.density)}.`);
		const care = careWord(def);
		lines.push(`${care}: about ${Math.round(capacityShare * 100)}% of the world's medical capacity while everyone is healthy.`);
		const climate = d.climates[def.climate];
		if (climate) lines.push(climate.density ? `${climate.name} climate: local spread ${pctChange(climate.density)}.` : `${climate.name} climate.`);
		if (def.hub >= 1.3) lines.push("Busy travel hub: infection leaves this region more easily.");
		else if (def.hub <= 0.8) lines.push("Remote: infection leaves this region less easily.");
		else lines.push("Ordinary travel links.");
		return lines;
	}

	/* Fixed facts from data only, in plain words. It never says a region is a good or bad choice. */
	function originView(id) {
		const d = data();
		const def = d.regions[id];
		if (!def) return null;
		const climate = d.climates[def.climate];
		const facts = [];
		if (climate && climate.density && climate.density < 1) facts.push("cold");
		if (def.density >= 1.2) facts.push("densely populated");
		else if (def.density < 0.75) facts.push("sparsely populated");
		if (def.hub >= 1.3) facts.push("a busy travel hub");
		else if (def.hub <= 0.8) facts.push("remote");
		if (def.healthcare >= 2) facts.push("home to a major medical centre");
		else if (def.healthcare < 1) facts.push("short of medical care");
		const list = facts.length > 1 ? `${facts.slice(0, -1).join(", ")} and ${facts[facts.length - 1]}` : facts[0];
		return {
			id,
			name: def.name,
			note: def.note || "",
			population: def.population,
			density: densityWord(def),
			climate: climate ? climate.name : def.climate,
			care: careWord(def),
			links: d.routes.filter(rt => rt.a === id || rt.b === id).length,
			neighbours: d.routes.filter(rt => rt.a === id || rt.b === id).map(rt => d.regions[rt.a === id ? rt.b : rt.a].name),
			summary: list ? `${def.name} is ${list}.` : "",
		};
	}

	function regionView(game, id) {
		const d = data();
		const def = d.regions[id];
		if (!def) return null;
		const r = game.regions[id];
		const isolated = modifiers(game).isolated;
		const neighbours = d.routes
			.filter(rt => rt.a === id || rt.b === id)
			.map(rt => {
				const other = rt.a === id ? rt.b : rt.a;
				return { id: other, name: d.regions[other].name, type: rt.type, routeName: d.routeTypes[rt.type].name, closed: !!(isolated[id] || isolated[other]) };
			});
		const routeTypes = neighbours.map(n => n.type);
		const effects = [];
		game.upgrades.forEach(uid => {
			const u = d.upgrades[uid];
			const lines = u ? effectLinesFor(u.effects, id, routeTypes) : [];
			if (lines.length) effects.push({ source: "evolution", name: u.name, daysLeft: null, lines });
		});
		game.effects.forEach(e => {
			if (e.target && e.target !== id) return;
			const ev = effectDef(e);
			const lines = ev ? effectLinesFor(ev.effects, id, routeTypes) : [];
			if (lines.length) effects.push({ source: e.source === "world" ? "event" : e.source, name: ev.name, daysLeft: e.daysLeft, lines });
		});
		const measureLines = measureLinesFor(game, id, routeTypes);
		if (measureLines.length)
			effects.push({ source: "response", name: `Authorities (${stageDef(game.response.stage).name})`, daysLeft: null, lines: measureLines });
		const work = infectedWork(game);
		let fullCapacity = 0;
		let workingCapacity = 0;
		for (const [rid, reg] of Object.entries(d.regions)) {
			fullCapacity += reg.healthcare * reg.population;
			workingCapacity += reg.healthcare * workingPeople(game.regions[rid], work);
		}
		const capacityShare = (def.healthcare * def.population) / fullCapacity;
		const regionWorking = def.healthcare * workingPeople(r, work);
		return {
			id,
			name: def.name,
			note: def.note || "",
			traitLines: regionTraitLines(def, capacityShare),
			/* capacityShare: this region's part of the world's MAXIMUM capacity. capacityWorking: how much of its own
			 * capacity still works. capacityWorkingShare: its part of the capacity working in the world right now.
			 * symptomsReduceCapacity: Severity has pushed infected people's work below the Severity-0 level here. */
			capacityShare,
			capacityWorking: workingPeople(r, work) / def.population,
			capacityWorkingShare: workingCapacity > 0 ? regionWorking / workingCapacity : 0,
			symptomsReduceCapacity: r.infected > 0 && modifiers(game).severity > 0 && d.tuning.infectedCapacitySeverityPenalty > 0,
			isolated: !!isolated[id],
			spreadChange: def.density === 1 ? "" : pctChange(def.density),
			population: def.population,
			healthy: r.healthy,
			infected: r.infected,
			dead: r.dead,
			infectedPct: (r.infected / def.population) * 100,
			deadPct: (r.dead / def.population) * 100,
			neighbours,
			effects,
		};
	}

	/* Everything that can stop an evolution being taken except its DNA cost. Shared by canBuy() and canMutate(), so a free
	 * mutation obeys the same ownership, prerequisite and exclusivity rules as a purchase. */
	function blocked(game, id) {
		const d = data();
		const u = d.upgrades[id];
		if (!u) return { ok: false, reason: "unknown" };
		if (game.status !== "active") return { ok: false, reason: "over" };
		if (game.upgrades.includes(id)) return { ok: false, reason: "owned" };
		/* Exclusive groups only ever block a purchase. An owned upgrade is never taken away, so a save that somehow holds
		 * both sides of a group keeps both. */
		const blocker = u.exclusive && game.upgrades.find(other => other !== id && d.upgrades[other] && d.upgrades[other].exclusive === u.exclusive);
		if (blocker) return { ok: false, reason: "excluded", excludedBy: blocker };
		if (u.requires && !u.requires.every(r => game.upgrades.includes(r))) return { ok: false, reason: "requires" };
		if (u.requiresAny && !u.requiresAny.some(r => game.upgrades.includes(r))) return { ok: false, reason: "requires" };
		return null;
	}

	function canBuy(game, id) {
		const b = blocked(game, id);
		if (b) return b;
		if (game.dna < data().upgrades[id].cost) return { ok: false, reason: "dna" };
		return { ok: true, reason: "" };
	}

	const canMutate = (game, id) => !blocked(game, id);

	/* Owned wins over "over", so a finished game still shows what was bought. */
	function upgradeViews(game) {
		const d = data();
		const nameOf = id => (d.upgrades[id] ? d.upgrades[id].name : id);
		const branchName = bid => (d.upgradeBranches[bid] ? d.upgradeBranches[bid].name : bid);
		const groups = Object.entries(d.upgradeCategories).map(([cid, c]) => ({ id: cid, name: c.name, upgrades: [], branches: [] }));
		/* The same check as if the game were still running, so a finished game's tree still shows locks and forks. */
		const running = game.status === "active" ? game : { ...game, status: "active" };
		for (const [id, u] of Object.entries(d.upgrades)) {
			const group = groups.find(g => g.id === u.category);
			if (!group) continue;
			const check = canBuy(game, id);
			const plan = game.status === "active" ? check : canBuy(running, id);
			const owned = game.upgrades.includes(id);
			const needs = [];
			if (u.requires) needs.push(u.requires.map(nameOf).join(" and "));
			if (u.requiresAny) needs.push(u.requiresAny.map(nameOf).join(" or "));
			const view = {
				id,
				name: u.name,
				desc: u.desc || "",
				branch: u.branch || "",
				tier: u.tier || 1,
				cost: u.cost,
				dnaShort: Math.max(0, u.cost - game.dna),
				owned,
				mutatedDay: (game.mutations.find(m => m && m.upgrade === id) || {}).day || null,
				available: check.ok,
				state: owned ? "owned" : check.ok ? "available" : check.reason,
				requirementText: needs.length ? `Needs ${needs.join(", and ")}` : "",
				excludedText: plan.reason === "excluded" ? `Excluded by ${nameOf(plan.excludedBy)}` : "",
				effectLines: effectLinesFor(u.effects, null, null),
				tag: u.tag || "",
				requires: u.requires ? [...u.requires] : [],
				requiresAny: u.requiresAny ? [...u.requiresAny] : [],
				exclusive: u.exclusive || "",
				rivals: u.exclusive ? Object.keys(d.upgrades).filter(o => o !== id && d.upgrades[o].exclusive === u.exclusive) : [],
				excludedBy: plan.reason === "excluded" ? plan.excludedBy : "",
				planState: owned ? "owned" : plan.ok ? "available" : plan.reason,
			};
			group.upgrades.push(view);
			let branch = group.branches.find(b => b.id === view.branch);
			if (!branch) group.branches.push((branch = { id: view.branch, name: branchName(view.branch), upgrades: [] }));
			branch.upgrades.push(view);
		}
		groups.forEach(g => {
			g.ownedCount = g.upgrades.filter(u => u.owned).length;
			const order = Object.keys(d.upgradeBranches);
			g.branches.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
			g.branches.forEach(b => b.upgrades.sort((x, y) => x.tier - y.tier));
		});
		return groups;
	}

	function buyUpgrade(game, id) {
		if (!canBuy(game, id).ok) return false;
		const u = data().upgrades[id];
		game.dna -= u.cost;
		game.upgrades.push(id);
		return true;
	}

	/* ---- Pathogen abilities: manual, in place, no day advance, no DNA. Seeds an unreached region (Fungus) or starts a timed effect (Parasite). ---- */
	const abilityDef = game => {
		const def = data().pathogens[game.disease] && data().pathogens[game.disease].ability;
		return def && game.ability && game.ability.id === def.id ? def : null;
	};

	/* The running timed effect of an ability, if any. game.effects owns the countdown, not game.ability. */
	const abilityEffect = (game, def) => (def.effect ? game.effects.find(e => e.source === "ability" && e.id === def.effect) || null : null);

	/* Route links and travel multipliers are ignored on purpose; isolated regions are not targets. */
	function abilityTargets(game) {
		const d = data();
		const isolated = modifiers(game).isolated;
		return Object.keys(d.regions).filter(id => {
			const r = game.regions[id];
			return r.infected + r.dead === 0 && !isolated[id];
		});
	}

	function canUseAbility(game, target) {
		if (game.status !== "active") return { ok: false, reason: "over" };
		const def = abilityDef(game);
		if (!def) return { ok: false, reason: "none" };
		if (!Number.isInteger(game.ability.charges) || game.ability.charges < 1) return { ok: false, reason: "charges" };
		if (def.effect) return abilityEffect(game, def) ? { ok: false, reason: "active" } : { ok: true, reason: "" };
		if (!data().regions[target]) return { ok: false, reason: "target" };
		const r = game.regions[target];
		if (r.infected + r.dead > 0) return { ok: false, reason: "reached" };
		if (modifiers(game).isolated[target]) return { ok: false, reason: "isolated" };
		return { ok: true, reason: "" };
	}

	const abilityReasons = {
		over: "The outbreak is over.",
		none: "This strain has no ability.",
		charges: "No charges left.",
		active: "It is already active.",
		target: "Choose a region to seed.",
		reached: "That region has already been reached.",
		isolated: "That region is isolated, so spores cannot be placed there.",
	};

	/* Milestone DNA is not touched: the next ordinary day claims what the new cases reach. A timed ability's effect first applies
	 * on the next day. On failure nothing has changed. */
	function useAbility(game, target) {
		const check = canUseAbility(game, target);
		if (!check.ok) return { ok: false, reason: check.reason, text: abilityReasons[check.reason] };
		const d = data();
		const def = abilityDef(game);
		game.ability.charges -= 1;
		if (def.effect) {
			const fx = d.abilityEffects[def.effect];
			game.effects.push({ source: "ability", id: def.effect, target: null, daysLeft: fx.duration });
			game.ability.used.push(game.day);
			addLog(game, fx.start, "");
			return { ok: true, reason: "", text: fx.start };
		}
		const r = game.regions[target];
		const seeded = Math.min(def.seed, r.healthy);
		r.healthy -= seeded;
		r.infected += seeded;
		game.ability.used.push(target);
		addLog(game, `Spores established a foothold in ${d.regions[target].name}.`, "");
		return { ok: true, reason: "", text: `${def.name} seeded ${d.regions[target].name}.` };
	}

	function abilityView(game) {
		const def = abilityDef(game);
		if (!def) return null;
		const d = data();
		const view = {
			name: def.name,
			desc: def.desc,
			charges: game.ability.charges,
			max: game.ability.maxCharges,
			needsTarget: !def.effect,
			targets: [],
			note: "",
			canUse: false,
		};
		if (def.effect) {
			const running = abilityEffect(game, def);
			if (running) view.note = `${def.name} active \u00b7 ${running.daysLeft} ${running.daysLeft === 1 ? "day" : "days"} remaining`;
			else if (view.charges < 1) view.note = `No ${def.name} charges left.`;
			view.canUse = !running && view.charges > 0;
			if (view.canUse && !isNoticed(game)) view.warn = "Authorities are not yet aware of the outbreak; Suppress has little effect right now.";
			return view;
		}
		view.targets = abilityTargets(game).map(id => ({ id, name: d.regions[id].name }));
		const unreached = Object.keys(d.regions).filter(id => game.regions[id].infected + game.regions[id].dead === 0).length;
		if (view.charges < 1) view.note = `No ${def.name}s left.`;
		else if (!unreached) view.note = "All reachable regions have already been seeded.";
		else if (!view.targets.length) view.note = "Every unreached region is isolated.";
		view.canUse = view.charges > 0 && view.targets.length > 0;
		return view;
	}

	function abilitySummary(game) {
		const def = abilityDef(game);
		if (!def) return null;
		const regions = data().regions;
		return {
			label: def.usedLabel,
			used: game.ability.used.length,
			max: game.ability.maxCharges,
			names: game.ability.used.map(u => (regions[u] ? regions[u].name : `day ${u}`)),
		};
	}

	function addLog(game, text, tone) {
		game.log.push({ day: game.day, text, tone: tone || "" });
		const limit = data().tuning.logLimit;
		if (game.log.length > limit) game.log.splice(0, game.log.length - limit);
	}

	/* Nothing below reads game.regions until applyPhase, so region order never matters. */
	function snapshotPhase(ctx) {
		ctx.ids.forEach(id => {
			ctx.snap[id] = { ...ctx.game.regions[id] };
			ctx.delta[id] = { local: 0, seeded: 0, deaths: 0 };
		});
	}

	/* One loop on purpose: the random draws go spread, deaths, next region. */
	function localPhase(ctx) {
		const { d, t, mods, snap, delta, random } = ctx;
		const spreadRate = (t.spreadBase + t.spreadPerInfectivity * mods.infectivity) * mods.spread;
		const deathRate = Math.min(t.deathRateCap, t.deathPerLethality * Math.max(0, mods.lethality));
		ctx.ids.forEach(id => {
			const s = snap[id];
			const def = d.regions[id];
			if (s.infected === 0) return;
			const climate = d.climates[def.climate];
			const rate = spreadRate * def.density * ((climate && climate.density) || 1) * (mods.climates[def.climate] || 1) * (mods.regions[id] || 1);
			delta[id].local = Math.min(s.healthy, randomRound(s.infected * rate * (s.healthy / def.population), random));
			delta[id].deaths = Math.min(s.infected, randomRound(s.infected * deathRate, random));
		});
	}

	/* Reads only the snapshot, so infection moves at most one route per day. An isolated region neither sends nor receives. */
	function routePhase(ctx) {
		const { d, t, mods, snap, delta, random } = ctx;
		d.routes.forEach(rt => {
			[
				[rt.a, rt.b],
				[rt.b, rt.a],
			].forEach(([from, to]) => {
				const src = snap[from];
				if (src.infected === 0 || snap[to].healthy === 0) return;
				if (mods.isolated[from] || mods.isolated[to]) return;
				const share = src.infected / d.regions[from].population;
				const chance = Math.min(t.routeChanceCap, (t.routeBase + t.routeScale * share) * mods.travel * (mods.routes[rt.type] || 1) * d.regions[from].hub);
				if (random() >= chance) return;
				delta[to].seeded += Math.min(t.seedMax, Math.max(1, Math.round(src.infected * t.seedFraction)));
			});
		});
	}

	function applyPhase(ctx) {
		const { game, d, ids, snap, delta } = ctx;
		const reachedBefore = ids.filter(id => snap[id].infected > 0 || snap[id].dead > 0);
		ids.forEach(id => {
			const s = snap[id];
			const dl = delta[id];
			const infections = Math.min(s.healthy, dl.local + dl.seeded);
			game.regions[id] = {
				healthy: s.healthy - infections,
				infected: s.infected + infections - dl.deaths,
				dead: s.dead + dl.deaths,
			};
			ctx.newInfected += infections;
			ctx.deaths += dl.deaths;
		});
		ctx.newRegions = ids.filter(id => !reachedBefore.includes(id) && game.regions[id].infected > 0);
		game.day += 1;
		ctx.newRegions.forEach(id => addLog(game, `The disease reaches ${d.regions[id].name}.`, "red"));
	}

	/* The one place that decides what counts as reached. With award, DNA is paid as one total; without (a new game, a migration)
	 * nothing is paid. */
	function collectMilestones(game, { award }) {
		const d = data();
		const found = [];
		const check = (id, reached, def, name) => {
			if (reached && !game.milestones.includes(id)) found.push({ id, dna: def.dna, text: def.text.replace("{region}", name || "") });
		};
		for (const [rid, def] of Object.entries(d.regions)) {
			const r = game.regions[rid];
			const reached = r.infected + r.dead;
			d.dna.region.forEach(m => check(`region.${rid}.${m.key}`, reached > 0 && (m.full ? r.healthy === 0 : reached / def.population >= m.share), m, def.name));
		}
		const tot = totals(game);
		const reached = tot.infected + tot.dead;
		d.dna.global.forEach(m => check(`global.${m.key}`, reached > 0 && (m.full ? tot.healthy === 0 : reached / tot.population >= m.share), m));
		d.dna.deaths.forEach(m => check(`deaths.${m.key}`, tot.dead > 0 && tot.dead / tot.population >= m.share, m));
		found.forEach(m => game.milestones.push(m.id));
		/* The multiplier applies to the day's total, so it never pays a fraction. */
		const dna = award ? Math.floor(found.reduce((sum, m) => sum + m.dna, 0) * modifiers(game).dnaReward) : 0;
		game.dna += dna;
		return { dna, milestones: found };
	}

	function dnaPhase(ctx) {
		const earned = collectMilestones(ctx.game, { award: true });
		ctx.milestones = earned.milestones;
		ctx.dnaGained = earned.dna;
	}

	/* The stage rises by at most one and never falls. A stage that isolates queues its isolation for after today's countdown. */
	function responsePhase(ctx) {
		const { game, d } = ctx;
		const stages = d.response.stages;
		const next = game.response.stage + 1;
		ctx.pressure = responsePressure(game).total;
		if (next >= stages.length || ctx.pressure < stages[next].threshold) return;
		game.response.stage = next;
		if (game.response.detectedDay === null) game.response.detectedDay = game.day;
		ctx.stageRose = next;
		if (stages[next].news) addLog(game, stages[next].news, "gold");
		if (stages[next].isolate) {
			const target = isolationTarget(game);
			if (target) ctx.newEffects.push({ source: "response", id: "isolation", target });
		}
	}

	/* Research speed uses the stage reached today, medical capacity after today's spread, and start-of-day multipliers. */
	function curePhase(ctx) {
		const { game, t, mods } = ctx;
		const factor = stageDef(game.response.stage).cure;
		if (!factor) return;
		const capacity = medicalCapacity(game);
		ctx.cureGained = t.cureBase * factor * (t.capacityFloor + (1 - t.capacityFloor) * capacity) * mods.cure * (1 - mods.resistance);
		/* The gain stays above zero, so the cure always finishes eventually. */
		if (mods.cureHardening) {
			if (game.cure > t.hardeningAbove) ctx.cureGained *= t.hardeningSlow;
			ctx.cureGained = Math.min(t.hardeningCap, ctx.cureGained);
		}
		game.cure = Math.min(100, game.cure + ctx.cureGained);
	}

	function effectPhase(ctx) {
		const { game, d } = ctx;
		const endedToday = tickEffects(game)
			.filter(e => e.source === "world")
			.map(e => e.id);
		ctx.newEffects.forEach(({ source, id, target }) => {
			const def = effectDef({ source, id });
			game.effects.push({ source, id, target, daysLeft: def.duration });
			if (def.start) addLog(game, def.start.replace("{region}", target ? d.regions[target].name : ""), "gold");
		});
		rollEvent(game, ctx.random, endedToday);
	}

	function endPhase(ctx) {
		checkEnd(ctx.game);
	}

	/* Virus only. Runs last, so an ended game never mutates. Each threshold is claimed in game.milestones the day it is reached, so
	 * it fires once even when nothing is eligible. */
	function mutationPhase(ctx) {
		const { game, d } = ctx;
		const def = d.pathogens[game.disease] && d.pathogens[game.disease].mutation;
		if (!def || game.status !== "active") return;
		const tot = totals(game);
		const share = (tot.infected + tot.dead) / tot.population;
		def.thresholds.forEach(threshold => {
			const claim = `mutation.${threshold}`;
			if (share < threshold || game.milestones.includes(claim)) return;
			game.milestones.push(claim);
			const pool = Object.keys(d.upgrades)
				.filter(id => canMutate(game, id))
				.map(id => ({ id, weight: def.tierWeights[d.upgrades[id].tier || 1] || 1 }));
			if (!pool.length) return;
			let roll = ctx.random() * pool.reduce((sum, c) => sum + c.weight, 0);
			const pick = pool.find(c => (roll -= c.weight) < 0) || pool[pool.length - 1];
			game.upgrades.push(pick.id);
			game.mutations.push({ day: ctx.day, upgrade: pick.id });
			ctx.mutations.push(pick.id);
			addLog(game, `Mutation: ${d.upgrades[pick.id].name} evolved spontaneously.`, "purple");
		});
	}

	/* Prion only. The day counter has already moved on, so a level whose day was just reached is announced now, once, and
	 * shapes the cure research of that day (the next one played). */
	function entrenchmentPhase(ctx) {
		const { game, d } = ctx;
		const def = d.pathogens[game.disease] && d.pathogens[game.disease].entrenchment;
		if (!def || game.status !== "active") return;
		const level = entrenchmentLevel(game);
		for (let n = 1; n <= level; n++) {
			const claim = `entrenchment.${n}`;
			if (game.milestones.includes(claim)) continue;
			game.milestones.push(claim);
			ctx.entrenchment = n;
			addLog(game, `Entrenchment increased to ${def.names[n - 1]}.`, "");
		}
	}

	/* Modifiers are read once, before any phase, so everything in force at the start of the day shapes the whole day. */
	const dayPhases = [
		snapshotPhase,
		localPhase,
		routePhase,
		applyPhase,
		dnaPhase,
		responsePhase,
		curePhase,
		effectPhase,
		endPhase,
		mutationPhase,
		entrenchmentPhase,
	];

	function advanceDay(game, random = Math.random) {
		if (game.status !== "active") return null;
		const d = data();
		const ctx = {
			game,
			random,
			d,
			t: d.tuning,
			mods: modifiers(game),
			ids: Object.keys(d.regions),
			day: game.day,
			snap: {},
			delta: {},
			newInfected: 0,
			deaths: 0,
			newRegions: [],
			dnaGained: 0,
			milestones: [],
			pressure: 0,
			stageRose: null,
			newEffects: [],
			cureGained: 0,
			mutations: [],
			entrenchment: null,
		};
		dayPhases.forEach(phase => phase(ctx));
		return {
			day: ctx.day,
			newInfected: ctx.newInfected,
			deaths: ctx.deaths,
			dnaGained: ctx.dnaGained,
			milestones: ctx.milestones,
			cureGained: ctx.cureGained,
			newRegions: ctx.newRegions,
			pressure: ctx.pressure,
			stageRose: ctx.stageRose,
			mutations: ctx.mutations,
			entrenchment: ctx.entrenchment,
		};
	}

	function responsePressure(game) {
		const d = data();
		const r = d.response;
		const tot = totals(game);
		const ids = Object.keys(d.regions);
		const reached = ids.filter(id => game.regions[id].infected > 0 || game.regions[id].dead > 0).length;
		const mods = modifiers(game);
		const severity = Math.max(0, mods.severity);
		const known = game.response.detectedDay === null ? 0 : Math.max(0, game.day - game.response.detectedDay);
		const components = {
			spread: r.spreadWeight * Math.sqrt(Math.min(1, tot.infected / tot.population / r.spreadFull)),
			/* Anything that hides or advertises the outbreak moves this component only, never the other four. */
			visibility: Math.max(0, Math.min(r.visibilityCap, r.visibilityPerSeverity * severity + mods.visibility)),
			deaths: r.deathsWeight * Math.sqrt(Math.min(1, tot.dead / tot.population / r.deathsFull)),
			reach: ids.length > 1 ? (r.reachWeight * Math.max(0, reached - 1)) / (ids.length - 1) : 0,
			time: Math.min(r.timeCap, r.timePerDay * known),
		};
		/* Only the total is scaled (difficulty, traits); the components stay as the world made them, so the cause text is honest. */
		const total = Object.values(components).reduce((a, b) => a + b, 0) * mods.pressure;
		return { components, total, reached, known, infectedShare: tot.infected / tot.population };
	}

	function isolationTarget(game) {
		let best = null;
		let bestShare = -1;
		for (const [id, def] of Object.entries(data().regions)) {
			const r = game.regions[id];
			if (r.infected === 0 || r.healthy === 0) continue;
			const share = r.infected / def.population;
			if (share > bestShare) {
				best = id;
				bestShare = share;
			}
		}
		return best;
	}

	function responseView(game) {
		const d = data();
		const stages = d.response.stages;
		const stage = Math.min(game.response.stage, stages.length - 1);
		const p = responsePressure(game);
		const next = stages[stage + 1];
		const low = stages[stage].threshold;
		const progress = next ? Math.max(0, Math.min(1, (p.total - low) / (next.threshold - low))) : 1;
		const causeText = {
			spread: () => `${Math.max(1, Math.round(p.infectedShare * 100))}% of people are infected.`,
			visibility: () => "Severe symptoms are drawing attention.",
			deaths: () => "Deaths are alarming authorities.",
			reach: () => `Infection has spread to ${p.reached} regions.`,
			time: () => `The outbreak has been known for ${p.known} ${p.known === 1 ? "day" : "days"}.`,
		};
		const causes = Object.entries(p.components)
			.filter(([, v]) => v > 0.5)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 2)
			.map(([k]) => causeText[k]());
		return {
			stage,
			name: stages[stage].name,
			nextName: next ? next.name : null,
			pressure: p.total,
			progress,
			causes,
			research: stages[stage].cure,
			measureLines: measureLinesFor(game, null, null),
			effects: game.effects
				.filter(e => e.source === "response" && effectDef(e))
				.map(e => ({ name: effectDef(e).name, desc: effectDef(e).desc || "", target: e.target ? d.regions[e.target].name : "", daysLeft: e.daysLeft })),
		};
	}

	function tickEffects(game) {
		const ended = [];
		game.effects = game.effects.filter(e => {
			e.daysLeft -= 1;
			if (e.daysLeft > 0) return true;
			ended.push({ source: e.source, id: e.id });
			const def = effectDef(e);
			if (def && def.end) addLog(game, def.end.replace("{region}", e.target && data().regions[e.target] ? data().regions[e.target].name : ""), "");
			return false;
		});
		return ended;
	}

	function eventEligible(game, id) {
		const d = data();
		const def = d.events[id];
		if (!def) return false;
		const world = worldEffects(game);
		if (!def.stackable && world.some(e => e.id === id)) return false;
		if (def.responseAtLeast && game.response.stage < def.responseAtLeast) return false;
		const needs = def.needs ? [].concat(def.needs) : [];
		if (!needs.every(n => eventNeeds[n] && eventNeeds[n](game))) return false;
		return !world.some(e => {
			const other = d.events[e.id];
			return (def.conflicts || []).includes(e.id) || (other && (other.conflicts || []).includes(id));
		});
	}

	function rollEvent(game, random = Math.random, exclude = []) {
		const d = data();
		const t = d.tuning;
		if (worldEffects(game).length >= t.maxActiveEvents || random() >= t.eventChance) return null;
		const pool = Object.entries(d.events).filter(([id]) => !exclude.includes(id) && eventEligible(game, id));
		const total = pool.reduce((sum, [, def]) => sum + (def.weight || 1), 0);
		if (total <= 0) return null;
		let roll = random() * total;
		for (const [id, def] of pool) {
			roll -= def.weight || 1;
			if (roll < 0) {
				game.effects.push({ source: "world", id, target: null, daysLeft: def.duration });
				addLog(game, def.start, "teal");
				return id;
			}
		}
		return null;
	}

	function activeEventViews(game) {
		const d = data();
		return worldEffects(game)
			.filter(e => d.events[e.id])
			.map(e => {
				const def = d.events[e.id];
				return { name: def.name, desc: def.desc || "", daysLeft: e.daysLeft, effectLines: effectLinesFor(def.effects, null, null) };
			});
	}

	/* The one place the end precedence lives: no healthy left wins, then extinction loses, then a finished cure loses. */
	function outcomeOf(game) {
		const tot = totals(game);
		if (tot.healthy === 0) return "infected";
		if (tot.infected === 0) return "extinct";
		if (game.cure >= 100) return "cured";
		return null;
	}

	const outcomeText = {
		infected: { won: true, title: "Victory", reason: "The outbreak has consumed the entire population.", news: "Nobody healthy remains." },
		extinct: {
			won: false,
			title: "Disease died out",
			reason: "The disease has died out before reaching everyone.",
			news: "The last infected host is gone. The disease has died out.",
		},
		cured: {
			won: false,
			title: "Outbreak contained",
			reason: "The cure is complete. The outbreak has been contained.",
			news: "The cure is finished and being given out.",
		},
	};

	function checkEnd(game) {
		if (game.status !== "active") return game.status;
		const outcome = outcomeOf(game);
		if (!outcome) return game.status;
		game.status = outcomeText[outcome].won ? "won" : "lost";
		game.outcome = outcome;
		addLog(game, outcomeText[outcome].news, outcomeText[outcome].won ? "green" : "red");
		return game.status;
	}

	function endView(game, meta) {
		if (game.status === "active") return null;
		const d = data();
		const outcome = outcomeText[game.outcome] ? game.outcome : outcomeOf(game) || "cured";
		const tot = totals(game);
		const pct = n => (n / tot.population) * 100;
		const regions = Object.keys(d.regions).map(id => regionView(game, id));
		return {
			outcome,
			won: outcomeText[outcome].won,
			title: outcomeText[outcome].title,
			reason: outcomeText[outcome].reason,
			finalDay: game.day - 1,
			...tot,
			healthyPct: pct(tot.healthy),
			infectedPct: pct(tot.infected),
			deadPct: pct(tot.dead),
			cure: game.cure,
			dna: game.dna,
			stats: stats(game),
			regionsReached: regions.filter(r => r.infected > 0 || r.dead > 0).length,
			regionCount: regions.length,
			regions,
			evolutions: game.upgrades.filter(id => d.upgrades[id]).map(id => d.upgrades[id].name),
			progress: progressView(game, meta),
			mutation: mutationSummary(game),
			ability: abilitySummary(game),
			entrenchment: entrenchmentView(game),
			evolutionGroups: evolutionGroups(game),
			reward: game.reward || null,
		};
	}

	function evolutionGroups(game) {
		const d = data();
		return Object.values(d.upgradeCategories)
			.map((c, i) => ({ name: c.name, id: Object.keys(d.upgradeCategories)[i], items: [] }))
			.map(group => ({
				name: group.name,
				items: game.upgrades.filter(id => d.upgrades[id] && d.upgrades[id].category === group.id).map(id => d.upgrades[id].name),
			}))
			.filter(group => group.items.length);
	}

	function pathogenView(game) {
		const def = data().pathogens[game.disease];
		if (!def || !def.tag) return null;
		const parts = [];
		if (def.mutation) parts.push(`Mutations: ${game.mutations.length} / ${def.mutation.thresholds.length}`);
		const ent = entrenchmentView(game);
		if (ent) parts.push(`Entrenchment ${ent.name} / ${ent.maxName}`);
		return { name: def.name, tag: def.tag, parts };
	}

	function entrenchmentView(game) {
		const def = data().pathogens[game.disease] && data().pathogens[game.disease].entrenchment;
		if (!def) return null;
		const level = entrenchmentLevel(game);
		return { level, name: level ? def.names[level - 1] : "0", max: def.days.length, maxName: def.names[def.days.length - 1] };
	}

	function mutationSummary(game) {
		const d = data();
		if (!d.pathogens[game.disease] || !d.pathogens[game.disease].mutation) return null;
		const names = game.mutations.filter(m => m && d.upgrades[m.upgrade]).map(m => d.upgrades[m.upgrade].name);
		return { count: names.length, names };
	}

	/* Runs ordinary advanceDay() days (at most tuning.fastForwardDays) and stops after the first day worth the player's attention.
	 * It only compares the game before and after each day, so the days are exactly what Advance one day would produce. DNA is
	 * checked after all of a day's milestone rewards are in. `onDay(game)`, if given, runs after each day; a text it returns
	 * is one more reason to stop (challenge runs use it to stop on the day their goal is met or missed). */
	function advanceUntil(game, random = Math.random, onDay = null) {
		const d = data();
		const t = d.tuning;
		const affordableAtStart = Object.keys(d.upgrades).filter(id => canBuy(game, id).ok);
		const effectKey = e => `${e.source}:${e.id}:${e.target || ""}`;
		const effectText = (e, verb) => {
			const def = effectDef(e);
			const name = def ? def.name : e.id;
			return e.target ? `${name} ${verb === "began" ? "began in" : "ended in"} ${d.regions[e.target].name}.` : `${name} ${verb}.`;
		};
		const stops = [];
		const dnaReasons = [];
		let dnaGained = 0;
		let days = 0;
		while (days < t.fastForwardDays && game.status === "active" && stops.length === 0) {
			const cureBefore = game.cure;
			const effectsBefore = new Map(game.effects.map(e => [effectKey(e), e.daysLeft]));
			const summary = advanceDay(game, random);
			days++;
			dnaGained += summary.dnaGained;
			summary.milestones.forEach(m => dnaReasons.push(m.text));
			const add = (reason, text) => stops.push({ day: summary.day, reason, text });
			summary.newRegions.forEach(id => add("region", `${d.regions[id].name} reported its first cases.`));
			if (summary.entrenchment) add("entrenchment", `Entrenchment increased to ${d.pathogens[game.disease].entrenchment.names[summary.entrenchment - 1]}.`);
			summary.mutations.forEach(id => add("mutation", `Mutation: ${d.upgrades[id].name} evolved spontaneously.`));
			if (summary.stageRose !== null) add("response", `The authorities raised the response to ${d.response.stages[summary.stageRose].name}.`);
			/* An effect that kept counting down is the same effect; one that is new, or whose days went up, started today. */
			const effectsAfter = new Map(game.effects.map(e => [effectKey(e), e]));
			game.effects.forEach(e => {
				const before = effectsBefore.get(effectKey(e));
				if (before === undefined || e.daysLeft !== before - 1) add(e.source === "world" ? "event" : "response", effectText(e, "began"));
			});
			effectsBefore.forEach((daysLeft, key) => {
				const after = effectsAfter.get(key);
				if (after && after.daysLeft === daysLeft - 1) return;
				const [source, id, target] = key.split(":");
				add(source === "world" ? "event" : "response", effectText({ source, id, target: target || null }, "ended"));
			});
			t.fastForwardCureMarks.forEach(mark => {
				if (cureBefore < mark && game.cure >= mark) add("cure", `Cure research passed ${mark}%.`);
			});
			const note = onDay ? onDay(game) : null;
			if (note) add("challenge", note);
			if (game.status !== "active") add("end", "The outbreak is over.");
			else {
				const newlyAffordable = Object.keys(d.upgrades).filter(id => !affordableAtStart.includes(id) && canBuy(game, id).ok);
				if (newlyAffordable.length) add("dna", `You can now afford ${newlyAffordable.map(id => d.upgrades[id].name).join(", ")}.`);
			}
		}
		return { days, stops, dnaGained, dnaReasons };
	}

	setup.plagueSimulation = Object.freeze({
		create,
		ensure,
		createMeta,
		ensureMeta,
		recordRun,
		traitAvailable,
		stats,
		totals,
		regionView,
		originView,
		effectLines: effects => effectLinesFor(effects, null, null),
		abilityView,
		useAbility,
		pathogenView,
		upgradeViews,
		buyUpgrade,
		advanceDay,
		advanceUntil,
		activeEventViews,
		responseView,
		endView,
	});
})();
