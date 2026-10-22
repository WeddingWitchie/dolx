/* globals V, C, State, Time, Wikifier */
// Reaction previews only read state; commit(), poppyResolve(), avery*() and debug() write it.
(() => {
	"use strict";
	const P = () => setup.perfumery;
	const M = () => setup.perfumeryModel;
	const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
	const layerOf = phase => (phase === "heart" ? "heart" : phase === "foundation" || phase === "drydown" ? "base" : "top");
	const week = () => Math.floor(Time.days / 7);
	const seen = (list, key) => !!V[list]?.includes?.(key);

	/* Weights over identity descriptors. Favourites come from existing dialogue; every other taste is a DoLX design choice (docs/perfumery-characters.md). */
	const profiles = {
		Robin: {
			likes: { "fresh floral": 0.9, green: 0.7, citrus: 0.6, gourmand: 0.5, creamy: 0.4, floral: 0.4 },
			dislikes: { smoky: 0.6, spicy: 0.4, musky: 0.3 },
			projection: [0.4, 1.7],
			craft: 0.4,
			curiosity: 0.3,
			offNote: 1,
			favourite: { material: "daisy", seen: () => seen("robinSeen", "favouriteFlower") },
			gate: () => C.npc.Robin.love >= 5,
			stat: "love",
		},
		Whitney: {
			likes: { smoky: 0.8, woody: 0.6, spicy: 0.6, musky: 0.5, resinous: 0.4, floral: 0.2 },
			dislikes: { sweet: 0.7, powdery: 0.6, creamy: 0.4, fruity: 0.3 },
			projection: [0.6, 2.4],
			craft: 0.2,
			curiosity: 0.5,
			offNote: 0.6,
			favourite: { material: "lily", seen: () => seen("whitneySeen", "favouriteFlower") },
			gate: () => C.npc.Whitney.love >= 5 || C.npc.Whitney.dom >= 10,
			stat: "love",
		},
		Kylar: {
			likes: { powdery: 0.6, musky: 0.6, floral: 0.4, resinous: 0.5, bitter: 0.3, amber: 0.4 },
			dislikes: { citrus: 0.4, aquatic: 0.3 },
			projection: [0.3, 1.8],
			craft: 0.3,
			curiosity: 0.6,
			offNote: 0.5,
			/* Kylar's favourite is nightshade, which isn't a perfumery material. Kylar's personal branch comes from familiarity instead. */
			favourite: null,
			gate: () => C.npc.Kylar.love >= 5,
			stat: "love",
		},
		Sydney: {
			likes: { floral: 0.7, "fresh floral": 0.6, resinous: 0.6, powdery: 0.4, herbal: 0.4, green: 0.3 },
			dislikes: { musky: 0.3, gourmand: 0.3 },
			projection: [0.3, 1.5],
			craft: 0.6,
			curiosity: 0.5,
			offNote: 1.1,
			favourite: { material: "white_rose", seen: () => seen("sydneySeen", "favouriteFlower") },
			gate: () => C.npc.Sydney.love >= 5,
			stat: "love",
		},
		Eden: {
			likes: { woody: 0.7, earthy: 0.6, herbal: 0.6, green: 0.6, resinous: 0.4, smoky: 0.3 },
			dislikes: { sweet: 0.6, gourmand: 0.6, fruity: 0.4, powdery: 0.4 },
			projection: [0.2, 1.3],
			craft: 0.2,
			curiosity: 0.3,
			offNote: 0.7,
			favourite: { material: "daisy", seen: () => seen("edenSeen", "favouriteFlower") },
			gate: () => C.npc.Eden.love >= 1,
			stat: "love",
		},
		Alex: {
			likes: { green: 0.7, floral: 0.6, herbal: 0.5, earthy: 0.5, fruity: 0.4, sweet: 0.2 },
			dislikes: { metallic: 0.5, smoky: 0.3, powdery: 0.3 },
			projection: [0.3, 1.8],
			craft: 0.4,
			curiosity: 0.4,
			offNote: 0.6,
			favourite: { material: "sunflower", seen: () => seen("alexSeen", "favouriteFlower") },
			gate: () => C.npc.Alex.love >= 5,
			stat: "love",
			grown: true,
		},
		Avery: {
			likes: { woody: 0.7, amber: 0.7, resinous: 0.6, powdery: 0.5, musky: 0.5, floral: 0.3, spicy: 0.3 },
			dislikes: { gourmand: 0.7, fruity: 0.5, sweet: 0.4, earthy: 0.4, green: 0.2 },
			projection: [0.4, 1.6],
			craft: 0.8,
			curiosity: 0.2,
			offNote: 1.4,
			favourite: null,
			gate: () => C.npc.Avery.love >= 10,
			stat: "love",
		},
		Gwylan: {
			likes: { herbal: 0.5, earthy: 0.5, resinous: 0.5, fermented: 0.3, bitter: 0.3, spicy: 0.3 },
			dislikes: { overpowering: 0.4 },
			projection: [0.2, 2],
			craft: 0.7,
			curiosity: 1,
			offNote: 0.3,
			favourite: null,
			gate: () => true,
			/* Gwylan's love is computed from clothing sets every visit. Perfume never writes to it. */
			stat: null,
		},
		"Black Wolf": {
			likes: { musky: 0.5, earthy: 0.5, woody: 0.3, savoury: 0.4 },
			dislikes: { citrus: 0.5, spicy: 0.6, powdery: 0.5, sweet: 0.3, overpowering: 0.6 },
			projection: [0, 1],
			craft: 0,
			curiosity: 0.2,
			offNote: 0.2,
			favourite: null,
			gate: () => V.wolfstate === "cave",
			stat: null,
			nose: "wolf",
		},
		"Great Hawk": {
			likes: { green: 0.4, herbal: 0.5, woody: 0.3, aquatic: 0.3 },
			dislikes: { overpowering: 0.8, smoky: 0.4, sweet: 0.3 },
			projection: [0, 1.2],
			craft: 0,
			curiosity: 0.3,
			offNote: 0.4,
			favourite: { material: "scottish_bog_myrtle", seen: () => true },
			gate: () => C.npc["Great Hawk"].love >= 1,
			stat: "love",
			nose: "bird",
		},
		Wren: {
			likes: { spicy: 0.4, citrus: 0.4, amber: 0.4, woody: 0.3, floral: 0.3 },
			dislikes: { earthy: 0.3, musty: 0.5 },
			projection: [0.5, 2],
			craft: 0.5,
			curiosity: 0.6,
			offNote: 0.6,
			favourite: { material: "tulip", seen: () => seen("wrenSeen", "favouriteFlower") },
			gate: () => C.npc.Wren.love >= 1,
			stat: "love",
		},
		Charlie: {
			likes: { citrus: 0.5, "fresh floral": 0.5, green: 0.4, aquatic: 0.4 },
			dislikes: { overpowering: 1, musky: 0.3, gourmand: 0.3 },
			projection: [0.2, 1.2],
			craft: 0.3,
			curiosity: 0.2,
			offNote: 0.8,
			favourite: null,
			gate: () => true,
			stat: "love",
		},
		Doren: {
			likes: { citrus: 0.5, green: 0.5, woody: 0.4, aquatic: 0.3 },
			dislikes: { sweet: 0.3, overpowering: 0.6 },
			projection: [0.2, 1.6],
			craft: 0.3,
			curiosity: 0.3,
			offNote: 0.6,
			favourite: null,
			gate: () => C.npc.Doren.love >= 1,
			stat: null,
			nose: "dog",
		},
		Bailey: {
			likes: {},
			dislikes: {},
			projection: [0, 3],
			craft: 1,
			curiosity: 0,
			offNote: 0.2,
			favourite: null,
			gate: () => true,
			stat: null,
		},
	};
	const poppySignature = { powdery: 1, floral: 0.8, sweet: 0.45, musky: 0.35, amber: 0.25 };
	const poppyMaterials = ["red_rose", "daisy", "orchid", "choc_chip_cookie"];
	const poppyOrder = ["teacher", "familiar", "gift", "unconventional", "disaster"];
	const averyRequests = [
		{ context: "dinner", wants: ["woody", "amber", "powdery"], avoids: ["gourmand", "fruity", "sweet"], projection: "close" },
		{ context: "party", wants: ["floral", "citrus", "resinous"], avoids: ["gourmand", "earthy", "musky"], projection: "moderate" },
		{ context: "avery", wants: ["amber", "resinous", "spicy", "musky"], avoids: ["fruity", "green", "sweet"], projection: "close" },
	];
	const projectionRange = { close: [0.5, 1.6], moderate: [1, 2.2] };

	function state() {
		const s = P().state();
		s.characters ??= {
			version: 1,
			memories: [],
			known: {},
			familiar: {},
			reacted: {},
			last: {},
			loveWeek: {},
			poppy: { done: {}, skipped: {}, pending: null, last: null, day: -1, repeatDay: -1, rivalry: false },
			avery: { version: 1, stage: "none", origin: null, noticedDay: -1, declinedDay: -1, count: 0, commission: null, history: [] },
		};
		return s.characters;
	}
	function descriptorsAt(p, phase) {
		const all = p.descriptorStrengths || {};
		const local = p.phaseStrengths?.[layerOf(phase)];
		if (!local) return all;
		const keys = new Set([...Object.keys(all), ...Object.keys(local)]);
		return Object.fromEntries([...keys].map(k => [k, (all[k] || 0) * 0.4 + (local[k] || 0) * 0.6]));
	}
	function sources(p) {
		return [...new Set((p.contributions || []).map(c => M().source(c.id)))];
	}
	function neutral(id) {
		return { id, kind: "none", tone: "neutral", eligible: false, reasons: ["No fragrance to react to."] };
	}
	function evaluate(id, p, context = {}) {
		const prof = profiles[id];
		if (!prof || !p || p.identityVersion !== 2) return neutral(id);
		const phase = context.phase || p.phase || "opening";
		const d = descriptorsAt(p, phase);
		const negative = setup.perfumeryIdentity.negative;
		const strength = context.strength ?? p.strength ?? 1;
		const projection = p.intensity * strength;
		const factors = [];
		let liking = 0;
		for (const [k, w] of Object.entries(prof.likes)) if (d[k]) factors.push([k, w * d[k]]);
		for (const [k, w] of Object.entries(prof.dislikes)) if (d[k]) factors.push([k, -w * d[k]]);
		for (const [, n] of factors) liking += n;
		let offNote = 0;
		for (const [k, w] of Object.entries(negative))
			if (d[k] > 0.1) {
				offNote += d[k] * w * prof.offNote;
				factors.push([k, -d[k] * w * prof.offNote * 0.5]);
			}
		factors.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
		const phasePleasant = (p.phasePleasantness?.[layerOf(phase)] ?? p.pleasantness) / 100;
		const over = Math.max(0, projection - prof.projection[1]);
		const under = Math.max(0, prof.projection[0] - projection);
		const enjoyment = clamp(liking * 0.7 + (phasePleasant - 0.55) * 0.9 - offNote * 0.4 - over * 0.35, -1, 1);
		const craft = clamp((p.technicalQuality - 60) / 35) * prof.craft;
		const curiosity = clamp((p.distinctiveness - 45) / 45) * prof.curiosity;
		const discomfort = clamp(offNote * 0.7 + over * 0.6 + Math.max(0, 0.35 - phasePleasant) * 1.4);
		const used = sources(p);
		const favourite = prof.favourite && used.includes(prof.favourite.material) ? (prof.favourite.seen() ? "known" : "hidden") : null;
		const s = V.perfumery?.characters;
		const fam = s?.familiar?.[id];
		const familiarity = fam && fam.fp === p.fingerprint ? fam.n : 0;
		const gifted = !!s?.memories?.some(m => m.c === id && m.fp === p.fingerprint && m.k === "gift");
		const grown = prof.grown ? used.filter(u => V.plants_known?.includes(u)).length : 0;
		let kind = "mild";
		if (prof.nose === "wolf") kind = p.concealment > 0.35 ? "masked" : discomfort > 0.4 || d.spicy > 0.3 || d.citrus > 0.35 ? "discomfort" : "scent";
		else if (prof.nose === "bird")
			kind = projection > 1.5 || discomfort > 0.5 ? "discomfort" : favourite || d.herbal > 0.25 || d.green > 0.3 ? "moor" : "close";
		else if (discomfort >= 0.55) kind = "discomfort";
		else if (favourite === "known" && enjoyment > -0.1) kind = "personal";
		else if (familiarity >= 3 || gifted) kind = "familiar";
		else if (enjoyment >= 0.3) kind = "enjoy";
		else if (craft >= 0.45 && enjoyment < 0.2) kind = "craft";
		else if (curiosity >= 0.4) kind = "curious";
		else if (enjoyment <= -0.15) kind = "dislike";
		const tone = ["discomfort", "dislike", "masked"].includes(kind) ? "bad" : ["mild", "craft", "curious", "scent", "close"].includes(kind) ? "mixed" : "good";
		return {
			id,
			kind,
			tone,
			phase,
			fp: p.fingerprint,
			name: p.name,
			enjoyment,
			craft,
			curiosity,
			discomfort,
			projection,
			tooStrong: over > 0.2,
			tooFaint: under > 0.2,
			favourite,
			familiarity,
			gifted,
			grown,
			note: factors[0]?.[0] || p.dominant,
			liked: factors
				.filter(f => f[1] > 0.04)
				.slice(0, 2)
				.map(f => f[0]),
			disliked: factors
				.filter(f => f[1] < -0.04)
				.slice(0, 2)
				.map(f => f[0]),
			opening: p.phases?.opening,
			heart: p.phases?.heart,
			drydown: p.phases?.drydown,
			quality: p.technicalQuality,
			pleasantness: p.pleasantness,
			eligible: true,
		};
	}
	function roll(id, p, ctx) {
		return setup.perfumeryIdentity.hash(`${id}|${ctx}|${Time.days}|${p.fingerprint}`) % 100;
	}
	/* Read-only. Returns the reaction to show in this passage, or null. */
	function notice(id, ctx = "talk", chance = 40) {
		if (!P().enabled() || !profiles[id]) return null;
		const s = V.perfumery?.characters;
		const last = s?.last?.[id];
		if (last && last.turn === State.turns && last.ctx === ctx)
			return { ...last.result, ctx, shown: true, choice: last.choice === "notice" ? null : last.choice, outcome: last.outcome };
		const p = P().scent();
		if (!p || p.identityVersion !== 2 || p.strength < 0.15 || !C.npc[id] || C.npc[id].init === 0) return null;
		if (s?.reacted?.[id] === Time.days) return null;
		if (!profiles[id].gate()) return null;
		const fresh = !s?.memories?.some(m => m.c === id && m.fp === p.fingerprint);
		const bonus = (fresh ? 25 : 0) + Math.min(20, p.intensity * p.strength * 8);
		if (roll(id, p, ctx) >= chance + bonus) return null;
		return { ...evaluate(id, p, { phase: p.phase }), ctx };
	}
	function remember(rec) {
		const s = state();
		const same = s.memories.find(m => m.c === rec.c && m.fp === rec.fp && m.k === rec.k);
		if (same) {
			same.n = Math.min(99, same.n + 1);
			same.day = Time.days;
			same.ctx = rec.ctx;
			same.name = rec.name;
			return same;
		}
		s.memories.push({ ...rec, n: 1, day: Time.days });
		/* Bounded: drop the oldest ordinary memory first; special events stay longest. */
		while (s.memories.length > 40) {
			const i = s.memories.findIndex(m => !m.x);
			s.memories.splice(i >= 0 ? i : 0, 1);
		}
		return rec;
	}
	function learn(id, r, level = 1) {
		const s = state();
		const k = (s.known[id] ??= { lvl: 0, likes: {}, dislikes: {} });
		for (const f of r.liked || []) k.likes[f] = Math.min(9, (k.likes[f] || 0) + 1);
		for (const f of r.disliked || []) k.dislikes[f] = Math.min(9, (k.dislikes[f] || 0) + 1);
		const evidence = Math.max(0, ...Object.values(k.likes), ...Object.values(k.dislikes));
		if (r.favourite === "known") level = 3;
		else if (evidence >= 3) level = Math.max(level, 2);
		k.lvl = Math.max(k.lvl, level);
	}
	/* Only the fields the scenes and averyLater() read are kept in the save. */
	const kept = [
		"id",
		"kind",
		"tone",
		"phase",
		"fp",
		"note",
		"liked",
		"disliked",
		"favourite",
		"familiarity",
		"gifted",
		"grown",
		"quality",
		"craft",
		"curiosity",
		"enjoyment",
		"tooStrong",
		"eligible",
	];
	const slim = r => Object.fromEntries(kept.filter(k => r[k] !== undefined).map(k => [k, r[k]]));
	function bottleIcon(fp) {
		const b = V.perfumery.bottles.find(b => b.fingerprint === fp);
		if (b) return setup.perfumeryIcons.forBottle(b);
		const a = V.perfumery.active;
		return a && P().activeProperties(a).fingerprint === fp ? a.icon : null;
	}
	/* Commits a reaction once per character per day. Repeat calls in the same day return the stored outcome. */
	function commit(id, ctx, choice = "notice", delta = {}) {
		const s = state();
		const last = s.last[id];
		if (s.reacted[id] === Time.days && last) return last.outcome;
		const p = P().scent();
		const r = p ? evaluate(id, p, { phase: p.phase }) : neutral(id);
		if (!r.eligible) return { love: 0 };
		const outcome = { kind: r.kind, choice, love: 0, rage: 0, dom: 0, endear: 0 };
		const prof = profiles[id];
		if (prof.stat && delta.love > 0 && s.loveWeek[id] !== week()) {
			s.loveWeek[id] = week();
			outcome.love = Math.min(2, delta.love);
			Wikifier.wikifyEval(`<<npcincr "${id}" love ${outcome.love}>>`);
		}
		if (delta.love < 0 && prof.stat) {
			outcome.love = Math.max(-2, delta.love);
			Wikifier.wikifyEval(`<<npcincr "${id}" love ${outcome.love}>>`);
		}
		for (const stat of ["rage", "dom"])
			if (delta[stat]) {
				outcome[stat] = clamp(delta[stat], -10, 10);
				Wikifier.wikifyEval(`<<npcincr "${id}" ${stat} ${outcome[stat]}>>`);
			}
		if (delta.endear) {
			outcome.endear = clamp(delta.endear, -15, 15);
			V.endear = (V.endear || 0) + outcome.endear;
		}
		const fam = s.familiar[id];
		s.familiar[id] = fam?.fp === r.fp ? { ...fam, n: Math.min(5, fam.n + 1) } : { fp: r.fp, n: 1, prev: fam?.n >= 3 ? fam.fp : fam?.prev };
		remember({
			c: id,
			fp: r.fp,
			name: String(p.name).slice(0, 48),
			icon: bottleIcon(r.fp),
			k: r.kind,
			ctx,
			ch: choice,
			f: [r.liked[0] || "", r.disliked[0] || ""],
			x: !!delta.special,
		});
		learn(id, r, choice === "ask" ? 2 : 1);
		s.reacted[id] = Time.days;
		s.last[id] = { turn: State.turns, day: Time.days, ctx, choice, result: slim(r), outcome };
		if (delta.wash) P().wash();
		return outcome;
	}

	/* Poppy's five special events. */
	function cosine(a, b) {
		let dot = 0;
		let na = 0;
		let nb = 0;
		for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
			dot += (a[k] || 0) * (b[k] || 0);
			na += (a[k] || 0) ** 2;
			nb += (b[k] || 0) ** 2;
		}
		return na && nb ? dot / Math.sqrt(na * nb) : 0;
	}
	function poppyQualifies(bottle) {
		const p = P().properties(bottle);
		const s = V.perfumery;
		const q = {};
		if (p.identityVersion !== 2) return { p, q };
		const used = sources(p);
		const accords = new Set((p.contributions || []).filter(c => c.id.startsWith("aroma~")).map(c => M().source(c.id))).size;
		const challenging = Object.keys(p.descriptorStrengths).some(k => setup.perfumeryIdentity.negative[k] && p.descriptorStrengths[k] > 0.15);
		const fam = new Set(used.map(id => M().material(id)?.family)).size;
		q.disaster = p.pleasantness < 32;
		q.unconventional = p.technicalQuality >= 72 && p.pleasantness >= 55 && (p.distinctiveness >= 55 || (challenging && fam >= 3));
		q.similarity = cosine(p.descriptorStrengths, poppySignature);
		q.familiar = q.similarity >= 0.8 && p.persistence > 0.5 && p.pleasantness >= 60;
		const hits = [
			p.sweet > 0.3,
			(p.phaseStrengths?.base?.floral || 0) + (p.phaseStrengths?.heart?.floral || 0) > 0.3,
			p.persistence > 0.5,
			p.intensity <= 2,
			used.some(u => poppyMaterials.includes(u)),
		].filter(Boolean).length;
		q.attention = hits;
		q.gift = hits >= 3 && p.pleasantness >= 62 && !s.gifts.includes(P().formulaKey(bottle.formula));
		q.teacher = s.skill >= 60 && p.technicalQuality >= 85 && accords >= 2 && s.extraction.practice >= 10;
		q.disasterKind =
			p.technicalQuality >= 72 && p.stability >= 0.55
				? "crafted"
				: p.extractionPurity < 0.55
				? "extraction"
				: p.stability < 0.45
				? "unstable"
				: setup.perfumeryIdentity.negative[p.nuances[0]]
				? "intent"
				: "failed";
		return { p, q };
	}
	function poppyPick(bottle, c = state().poppy) {
		const { q } = poppyQualifies(bottle);
		const qualifying = poppyOrder.filter(id => q[id]);
		const fresh = qualifying.filter(id => !c.done[id]);
		if (fresh.length)
			return { id: [...fresh].sort((a, b) => (c.skipped[b] || 0) - (c.skipped[a] || 0) || poppyOrder.indexOf(a) - poppyOrder.indexOf(b))[0], fresh };
		if (c.repeatDay >= 0 && Time.days < c.repeatDay + 3) return { id: null, fresh };
		const repeat = [...qualifying].sort((a, b) => c.done[a].day - c.done[b].day)[0];
		return { id: repeat || null, fresh };
	}
	function poppyEligible(s = V.perfumery) {
		return P().availableTeacher() && s.lesson >= 4 && (!s.session || s.session.stage === "concluded");
	}
	/* Called once from craft(), inside the same synchronous bottling transaction. */
	function poppyCrafted(bottle) {
		const s = V.perfumery;
		const c = state().poppy;
		if (V.perfumeryVenue !== "poppy" || !poppyEligible(s) || c.pending || c.day === Time.days) return null;
		const pick = poppyPick(bottle, c);
		if (!pick.id) return null;
		for (const id of pick.fresh) if (id !== pick.id) c.skipped[id] = Math.min(9, (c.skipped[id] || 0) + 1);
		c.skipped[pick.id] = 0;
		c.pending = { id: pick.id, bottleId: bottle.id, fp: bottle.fingerprint, repeat: !!c.done[pick.id], kind: poppyQualifies(bottle).q.disasterKind };
		c.day = Time.days;
		return c.pending;
	}
	function poppyPending() {
		const c = V.perfumery?.characters?.poppy;
		const b = c?.pending && V.perfumery.bottles.find(b => b.id === c.pending.bottleId);
		if (!b) return null;
		const p = P().properties(b);
		const names = ids => [...new Set(ids)].map(id => setup.foodstuff[id]?.name || id);
		return {
			...c.pending,
			bottle: b,
			p,
			q: poppyQualifies(b).q,
			done: c.done[c.pending.id] || null,
			sources: names(sources(p)).slice(0, 4),
			accords: names((p.contributions || []).filter(x => x.id.startsWith("aroma~")).map(x => M().source(x.id))).slice(0, 3),
		};
	}
	function poppyResolve(choice) {
		const s = V.perfumery;
		const c = state().poppy;
		const pend = poppyPending();
		/* The bedroom test page plays events without arranging Poppy's schedule. */
		const testing = V.debug === 1;
		if (!pend || (!P().canTeach() && !testing)) throw new Error("Poppy isn't free to talk about that bottle now.");
		const first = !c.done[pend.id];
		const out = { id: pend.id, choice, first, repeat: !first, love: 0, gift: false, kind: pend.kind };
		if (first && pend.id !== "gift") {
			out.love = 1;
			Wikifier.wikifyEval("<<npcincr Poppy love 1>>");
		}
		if (pend.id === "gift" && ["give", "admit"].includes(choice)) {
			const key = P().formulaKey(pend.bottle.formula);
			if (!s.gifts.includes(key)) {
				s.gifts.push(key);
				if (s.gifts.length > 32) s.gifts.shift();
				out.love = first ? 3 : 1;
				Wikifier.wikifyEval(`<<npcincr Poppy love ${out.love}>>`);
			}
			s.bottles.splice(s.bottles.indexOf(pend.bottle), 1);
			out.gift = true;
		}
		if (pend.id === "unconventional" && choice === "challenge") c.rivalry = true;
		c.done[pend.id] = { day: Time.days, choice, fp: pend.fp, n: Math.min(99, (c.done[pend.id]?.n || 0) + 1) };
		if (!first) c.repeatDay = Time.days;
		c.last = { ...out, turn: State.turns, fp: pend.fp, attention: poppyQualifies(pend.bottle).q.attention };
		c.pending = null;
		remember({
			c: "Poppy",
			fp: pend.fp,
			name: String(pend.bottle.name).slice(0, 48),
			icon: setup.perfumeryIcons.forBottle(pend.bottle),
			k: pend.id,
			ctx: "table",
			ch: choice,
			f: [pend.p.dominant || "", pend.p.offNotes?.[0]?.name || ""],
			x: true,
		});
		learn("Poppy", { liked: pend.id === "gift" || pend.id === "familiar" ? ["floral", "powdery"] : [], disliked: [] }, pend.id === "gift" ? 2 : 1);
		markPoppy();
		if (!testing && pend.id === "teacher" && choice === "guide") P().startCollaboration("demonstration", pend.bottle.formula);
		if (!testing && pend.id === "disaster" && choice === "rescue") P().startCollaboration("rescue", pend.bottle.formula);
		return out;
	}
	function markPoppy() {
		if (typeof window.markPoppyInteraction === "function") window.markPoppyInteraction();
	}

	/* Avery's commission. */
	function averyState() {
		return state().avery;
	}
	function averyRequest(n = averyState().count) {
		return averyRequests[n % averyRequests.length];
	}
	function averyOfferReady() {
		const a = V.perfumery?.characters?.avery;
		if (!a || !C.npc.Avery || a.commission || a.origin !== "made") return false;
		if (a.stage !== "noticed" && a.stage !== "delivered" && a.stage !== "declined") return false;
		if (C.npc.Avery.love < 35 || (V.averyragerevealed === 1 && C.npc.Avery.rage >= 50)) return false;
		if (Time.days < a.noticedDay + 3 || (a.declinedDay >= 0 && Time.days < a.declinedDay + 10)) return false;
		const lastDone = a.history[a.history.length - 1];
		return !lastDone || Time.days >= lastDone.day + 21;
	}
	function averyDeliverable() {
		const a = V.perfumery?.characters?.avery;
		const session = V.perfumery?.session;
		return a?.commission?.stage === "active"
			? V.perfumery.bottles.filter(b => P().ready(b) && b.uses > 0 && !(session?.stage === "review" && session.bottleId === b.id)).slice(-6)
			: [];
	}
	function averyFit(p, request) {
		const d = p.descriptorStrengths || {};
		const wants = request.wants.reduce((sum, k) => sum + (d[k] || 0), 0) / request.wants.length;
		const avoid = Math.max(0, ...request.avoids.map(k => d[k] || 0));
		const off = Object.entries(setup.perfumeryIdentity.negative).reduce((sum, [k, w]) => sum + (d[k] > 0.1 ? d[k] * w : 0), 0);
		const [lo, hi] = projectionRange[request.projection];
		const proj = p.intensity;
		const fit = clamp(wants * 2.2 - avoid * 1.1 - off * 0.8);
		return {
			fit,
			wants,
			avoid,
			off,
			projection: proj,
			projectionOk: proj >= lo - 0.2 && proj <= hi + 0.2,
			tooStrong: proj > hi + 0.6,
			tooFaint: proj < lo - 0.3,
		};
	}
	function averyJudge(p, request, framing, rel = { love: C.npc.Avery.love, rage: C.npc.Avery.rage }) {
		const f = averyFit(p, request);
		const q = p.technicalQuality;
		const pl = p.pleasantness;
		const close = rel.love >= 60 && rel.rage < 40;
		let outcome = "adequate";
		if (pl < 40 || f.tooStrong) outcome = "embarrassing";
		else if (framing === "own" && f.fit < 0.3) outcome = close && q >= 70 && pl >= 60 ? "exception" : "defiance";
		else if (framing === "you" && close && pl >= 60 && q >= 65 && f.fit < 0.45) outcome = "exception";
		else if (f.fit >= 0.55 && q >= 68 && f.projectionOk) outcome = "excellent";
		else if (pl >= 70 && q >= 72 && f.fit < 0.55) outcome = "unexpected";
		else if (q >= 78 && f.fit < 0.55) outcome = "technical";
		const effects = {
			excellent: { love: 2, endear: 15, rage: 0 },
			unexpected: { love: 1, endear: 10, rage: 0 },
			exception: { love: 2, endear: 10, rage: -5 },
			technical: { love: 0, endear: 0, rage: 0 },
			adequate: { love: 0, endear: 5, rage: 0 },
			embarrassing: { love: V.averyragerevealed === 1 ? 0 : -1, endear: -10, rage: 5 },
			defiance: { love: -1, endear: -10, rage: 8 },
		}[outcome];
		return { outcome, ...f, quality: q, pleasantness: pl, effects };
	}
	/* Moments that ask the player something take over the scene like any interrupting event;
	   the rest are a single remark printed inside the scene. */
	function asks(pm) {
		return !(pm.id === "Robin" && pm.ctx === "study") && !["Charlie", "Doren", "Bailey"].includes(pm.id);
	}
	// Read-only: select Avery's delivery, offer or worn-scent scene.
	function averyScene(ctx) {
		if (!P().enabled() || !C.npc.Avery || C.npc.Avery.init !== 1) return null;
		const s = V.perfumery?.characters;
		const last = s?.last?.Avery;
		if (last && last.turn === State.turns && last.ctx === ctx)
			return last.scene
				? { ...last.scene, shown: true }
				: { mode: "notice", ctx, r: { ...last.result, ctx, choice: last.choice, outcome: last.outcome, shown: true } };
		if (s?.reacted?.Avery === Time.days) return null;
		if (averyDeliverable().length) return { mode: "deliver", ctx };
		if (averyOfferReady()) return { mode: "offer", ctx, repeat: averyState().count > 0, request: averyRequest() };
		const r = notice("Avery", ctx, ctx === "mansion" ? 100 : 60);
		return r ? { mode: "notice", ctx, r } : null;
	}
	function averyMark(ctx, scene) {
		const s = state();
		s.reacted.Avery = Time.days;
		s.last.Avery = { turn: State.turns, day: Time.days, ctx, scene };
	}
	/* Later in the same dinner: did the active phase move on since Avery first noticed it? */
	function averyLater(ctx) {
		const last = V.perfumery?.characters?.last?.Avery;
		const p = P().scent();
		if (last?.later && last.later.turn === State.turns) return last.later;
		if (!last?.result || last.later || V.perfumery.characters.reacted.Avery !== Time.days || !p || last.result.fp !== p.fingerprint) return null;
		if (last.ctx !== ctx || p.phase === last.result.phase) return null;
		const before = last.result;
		const now = evaluate("Avery", p, { phase: p.phase });
		last.later = { turn: State.turns, before, now, better: now.enjoyment > before.enjoyment + 0.1, worse: now.enjoyment < before.enjoyment - 0.1 };
		return last.later;
	}
	function averyNotice(origin) {
		const a = averyState();
		if (!["made", "vague", "ask", "tease", "defend"].includes(origin)) throw new Error("Choose how to answer Avery.");
		if (a.stage === "none") {
			a.stage = "noticed";
			a.noticedDay = Time.days;
		}
		if (a.origin !== "made") a.origin = origin;
	}
	function averyAccept(terms) {
		const a = averyState();
		if (!averyOfferReady() && !a.offering) throw new Error("Avery hasn't asked for a perfume.");
		if (!["none", "materials", "fee"].includes(terms)) throw new Error("Choose the terms.");
		const r = averyRequest();
		a.commission = {
			id: a.count + 1,
			stage: "active",
			...r,
			wants: [...r.wants],
			avoids: [...r.avoids],
			terms,
			offeredDay: Time.days,
			dueDay: Time.days + 14,
			poppy: null,
			submitted: null,
			outcome: null,
			rewarded: false,
			poppyTold: false,
		};
		a.stage = "active";
		a.offering = false;
		const paid = terms === "materials" && !a.history.some(h => h.paidMaterials) ? 5000 : 0;
		a.commission.paidMaterials = paid > 0;
		return { paid };
	}
	function averyDecline() {
		const a = averyState();
		a.declinedDay = Time.days;
		a.stage = "declined";
		a.offering = false;
	}
	function averyDeliver(bottleId, framing, ctx) {
		const s = V.perfumery;
		const a = averyState();
		const c = a.commission;
		if (!c || c.stage !== "active") throw new Error("There is no commission to deliver.");
		if (!["asked", "own", "you"].includes(framing)) throw new Error("Choose how to present the bottle.");
		const b = s.bottles.find(b => b.id === bottleId);
		if (!b || !P().ready(b) || b.uses < 1) throw new Error("Choose a matured bottle with perfume left in it.");
		if (s.session?.stage === "review" && s.session.bottleId === bottleId) throw new Error("Discuss this experiment with Poppy before giving away the bottle.");
		const p = P().properties(b);
		const judged = averyJudge(p, c, framing);
		/* Single commit: bottle leaves the cabinet, the reward is marked and the record is closed together. */
		s.bottles.splice(s.bottles.indexOf(b), 1);
		c.stage = "delivered";
		c.submitted = b.fingerprint;
		c.outcome = judged.outcome;
		c.framing = framing;
		c.deliveredDay = Time.days;
		c.ctx = ctx;
		const e = judged.effects;
		if (!c.rewarded) {
			c.rewarded = true;
			if (e.love) Wikifier.wikifyEval(`<<npcincr Avery love ${e.love}>>`);
			if (e.rage) Wikifier.wikifyEval(`<<npcincr Avery rage ${e.rage}>>`);
			if (ctx !== "mansion" && e.endear) V.endear = (V.endear || 0) + e.endear;
			c.fee = c.terms === "fee" ? { excellent: 8000, unexpected: 8000, exception: 8000, adequate: 4000, technical: 4000 }[judged.outcome] || 0 : 0;
		}
		a.history.push({ id: c.id, outcome: judged.outcome, day: Time.days, paidMaterials: c.paidMaterials });
		while (a.history.length > 4) a.history.shift();
		a.count = Math.min(99, a.count + 1);
		a.stage = "delivered";
		a.last = { ...judged, framing, turn: State.turns, ctx, name: b.name, fee: c.fee, endearApplied: ctx !== "mansion" };
		remember({
			c: "Avery",
			fp: b.fingerprint,
			name: String(b.name).slice(0, 48),
			icon: setup.perfumeryIcons.forBottle(b),
			k: "commission-" + judged.outcome,
			ctx,
			ch: framing,
			f: [c.wants.find(k => (p.descriptorStrengths[k] || 0) > 0.15) || "", c.avoids.find(k => (p.descriptorStrengths[k] || 0) > 0.15) || ""],
			x: true,
		});
		learn("Avery", { liked: c.wants.slice(0, 2), disliked: c.avoids.slice(0, 1) }, 2);
		a.commission = { ...c, archived: true };
		return a.last;
	}
	/* Poppy's advice reads the request and a bottle; it never sees Avery's verdict. */
	function poppyAdvice(bottleId) {
		const c = V.perfumery?.characters?.avery?.commission;
		if (!c || c.stage !== "active") return null;
		const b = V.perfumery.bottles.find(b => b.id === bottleId);
		if (!b) return { request: c, bottle: null };
		const p = P().properties(b);
		const f = averyFit(p, c);
		const d = p.descriptorStrengths;
		return {
			request: c,
			bottle: b,
			fit: f,
			missing: c.wants.filter(k => (d[k] || 0) < 0.12),
			clashing: c.avoids.filter(k => (d[k] || 0) > 0.15),
			offNote: p.offNotes?.[0]?.name || null,
			unusual: p.distinctiveness > 60,
		};
	}
	/* Which bottle the player showed Poppy, kept on the commission until they reply (-1: none yet). */
	function poppyAsk(bottleId) {
		const c = averyState().commission;
		if (!c || c.stage !== "active" || c.poppy) throw new Error("Poppy has already given advice.");
		c.asked = bottleId;
	}
	function poppyAdviceRecord(choice) {
		const c = averyState().commission;
		if (!c || c.stage !== "active" || c.asked === undefined || !P().canTeach()) throw new Error("Bring the question when Poppy is free.");
		if (!["accept", "ignore", "own"].includes(choice)) throw new Error("Choose a reply.");
		const b = V.perfumery.bottles.find(b => b.id === c.asked);
		c.poppy = { advice: choice, fp: b?.fingerprint || null, day: Time.days };
		delete c.asked;
		markPoppy();
	}
	function poppyFollowup() {
		const c = V.perfumery?.characters?.avery?.commission;
		return c?.archived && c.poppy && !c.poppyTold ? c : null;
	}
	function poppyFollowupDone() {
		const c = poppyFollowup();
		if (!c || !P().canTeach()) throw new Error("Poppy isn't free to talk.");
		c.poppyTold = true;
		markPoppy();
	}

	/* Journal text is rebuilt from short records, never stored as prose. */
	const contextText = {
		study: "while you studied together",
		room: "in Robin's room",
		chat: "while you talked",
		school: "at school, in front of the others",
		private: "when the two of you were alone",
		library: "at the library desk",
		cuddle: "by the fire",
		field: "while you rested in the field",
		brewing: "over the recipe cards",
		cave: "in the cave",
		tower: "by the tower fire",
		pub: "in the pub",
		class: "during class",
		visit: "at the flat",
		rent: "while collecting rent",
		dinner: "at dinner",
		hotel: "at the hotel",
		mansion: "at the mansion",
		table: "at Poppy's table",
		hallway: "in the school corridor",
	};
	const kindText = {
		enjoy: "liked it",
		personal: "recognised a favourite flower in it",
		familiar: "recognised your usual scent",
		craft: "respected the work more than the result",
		curious: "was curious about how you made it",
		discomfort: "found it too much",
		dislike: "didn't care for it",
		mild: "noticed it without much comment",
		masked: "didn't like that it covered your own scent",
		scent: "picked out your scent beneath it",
		moor: "seemed to recognise something from the moor",
		close: "noticed it up close",
		gift: "received it as a gift",
		teacher: "asked you to teach the technique",
		familiar_poppy: "heard an echo of a personal fragrance in it",
		unconventional: "didn't expect it to work",
		disaster: "examined a spectacular failure",
		"commission-excellent": "found it right for the occasion",
		"commission-unexpected": "was surprised by how well it worked",
		"commission-exception": "made an exception for your choice",
		"commission-technical": "admired the skill but not the choice",
		"commission-adequate": "accepted it without enthusiasm",
		"commission-embarrassing": "thought it unfit for company",
		"commission-defiance": "saw that you ignored the request",
	};
	function memoryText(m) {
		const what = (m.c === "Poppy" && m.k === "familiar" ? kindText.familiar_poppy : kindText[m.k]) || "noticed it";
		const where = contextText[m.ctx] ? ` ${contextText[m.ctx]}` : "";
		const detail = m.f?.[0] && m.f?.[1] ? ` The ${m.f[0]} side mattered; the ${m.f[1]} side less so.` : m.f?.[0] ? ` The ${m.f[0]} side stood out.` : "";
		return `${m.c} ${what}${where}.${detail}${m.n > 1 ? ` (${m.n} times)` : ""}`;
	}
	function knownText(id) {
		const k = V.perfumery?.characters?.known?.[id];
		if (!k || !k.lvl) return null;
		const top = obj =>
			Object.entries(obj)
				.sort((a, b) => b[1] - a[1])
				.filter(([, n]) => n >= (k.lvl >= 2 ? 2 : 1))
				.slice(0, 2)
				.map(([f]) => f);
		const likes = top(k.likes);
		const dislikes = top(k.dislikes);
		const label = ["Unknown", "Suspected", "Known", "Personal"][k.lvl];
		const fav =
			k.lvl >= 3 && profiles[id]?.favourite?.seen()
				? ` A favourite flower helps: ${setup.foodstuff[profiles[id].favourite.material]?.name || profiles[id].favourite.material}.`
				: "";
		const parts = [likes.length ? `seems to like ${likes.join(" and ")}` : "", dislikes.length ? `seems to avoid ${dislikes.join(" and ")}` : ""].filter(
			Boolean
		);
		return `${label}: ${parts.length ? id + " " + parts.join(", ") + "." : "One reaction so far; not enough to tell."}${fav}`;
	}

	function validateState() {
		const s = V.perfumery?.characters;
		const problems = [];
		if (!s) return ["Character records not initialized yet (created on first reaction)."];
		if (s.memories.length > 40) problems.push("Memory list exceeds 40.");
		const c = s.avery.commission;
		if (c && !c.archived && c.rewarded) problems.push("Active commission already marked rewarded.");
		if (c?.archived && !c.rewarded) problems.push("Delivered commission was never rewarded.");
		if (s.avery.history.filter(h => h.id === c?.id).length > 1) problems.push("Commission delivered twice.");
		if (s.poppy.pending && !V.perfumery.bottles.some(b => b.id === s.poppy.pending.bottleId))
			problems.push("Poppy event points to a missing bottle (it will be skipped).");
		for (const [id, f] of Object.entries(s.familiar)) if (f.n > 5) problems.push(`${id} familiarity above cap.`);
		return problems.length ? problems : ["No problems found."];
	}
	function debug(action, value) {
		if (V.debug !== 1) throw new Error("Enable the native DEBUG menu first.");
		const s = state();
		if (action === "resetAvery")
			s.avery = { version: 1, stage: "none", origin: null, noticedDay: -1, declinedDay: -1, count: 0, commission: null, history: [] };
		if (action === "averyStage") {
			if (value === "noticed") Object.assign(s.avery, { stage: "noticed", origin: "made", noticedDay: Time.days - 3, declinedDay: -1, commission: null });
			if (value === "active") {
				Object.assign(s.avery, { stage: "noticed", origin: "made", noticedDay: Time.days - 3, declinedDay: -1, commission: null, offering: true });
				averyAccept("none");
			}
		}
		if (action === "resetPoppy") s.poppy = { done: {}, skipped: {}, pending: null, last: null, day: -1, repeatDay: -1, rivalry: false };
		if (action === "poppyPending") {
			const b = V.perfumery.bottles.find(b => b.id === value.bottleId);
			if (!b || !poppyOrder.includes(value.id)) throw new Error("Choose an owned bottle and an event.");
			s.poppy.pending = { id: value.id, bottleId: b.id, fp: b.fingerprint, repeat: !!s.poppy.done[value.id], kind: poppyQualifies(b).q.disasterKind };
		}
		if (action === "resetReactions") Object.assign(s, { reacted: {}, last: {}, loveWeek: {} });
		if (action === "kit") {
			/* Equipment, every lesson, spirits, empty bottles and 24 measures of each preset's extracts. */
			const v = V.perfumery;
			P().debugAction("workstation");
			v.lesson = Math.max(v.lesson, 4);
			v.invited = true;
			v.containers = Math.max(v.containers, 20);
			for (const k of Object.keys(v.solvent)) v.solvent[k] = Math.max(v.solvent[k], 400);
			for (const name of setup.perfumeryLab.presets)
				for (const layer of M().layers)
					for (const key of Object.keys(setup.perfumeryLab.preset(name)[layer]))
						if (!v.extraction.stock[key] || v.extraction.stock[key] < 24) P().debugAction("extract", key, 24);
		}
		if (action === "clearTestBottles") V.perfumery.bottles = V.perfumery.bottles.filter(b => !b.name.startsWith("Test: "));
		if (action === "testBottle") {
			/* Test bottles replace each other so the cabinet doesn't fill up. */
			const v = V.perfumery;
			v.learned = true;
			v.lesson = Math.max(v.lesson, 4);
			v.bottles = v.bottles.filter(b => !b.name.startsWith("Test: "));
			const b = P().debugAction("bottle", setup.perfumeryLab.preset(value.preset), 0.85);
			b.made -= 60 * 86400;
			b.name = "Test: " + value.preset;
			if (value.wear) P().apply(b.id);
			return b.id;
		}
		if (action === "clearMemories") Object.assign(s, { memories: [], known: {}, familiar: {} });
	}

	/* Hooks are listed by hand from the twee integration points; "tested" means covered by tests/perfumery-characters.spec.ts. */
	const coverage = {
		Robin: { regular: "Robin Study Concentrate", personal: "Garden Robin Sit", special: "", tested: true },
		Whitney: { regular: "Whitney Chat (school)", personal: "Whitney Chat (elsewhere)", special: "", tested: true },
		Kylar: { regular: "Kylar Chat", personal: "Kylar Chat (jealousy branch)", special: "", tested: true },
		Sydney: { regular: "Sydney Chat", personal: "Sydney Chat (pure/corrupt)", special: "", tested: true },
		Eden: { regular: "Eden Cuddle", personal: "Eden Cuddle (forest warning)", special: "", tested: true },
		Alex: { regular: "Farm Tending Alex Sit", personal: "Farm Tending Alex Sit (grown flowers)", special: "", tested: true },
		Avery: {
			regular: "Avery Date 2, Avery Hotel 2",
			personal: "Mansion Talk Chat 2",
			special: "Commission: offer, delivery, Avery Date 3 / Hotel 3 follow-up",
			tested: true,
		},
		Gwylan: { regular: "Gwylan Brewing Lesson", personal: "Gwylan Brewing Lesson (guess)", special: "", tested: true },
		"Black Wolf": { regular: "Wolf Relax", personal: "Wolf Relax (scent masking)", special: "", tested: true },
		"Great Hawk": { regular: "Bird Tower Firepit Cuddle", personal: "Bird Tower Firepit Cuddle", special: "", tested: true },
		Wren: { regular: "Smuggler pub chat pool", personal: "", special: "", tested: true },
		Charlie: { regular: "Dancing Lesson", personal: "", special: "", tested: true },
		Doren: { regular: "Doren Talk", personal: "", special: "", tested: true },
		Bailey: { regular: "Rent Pay", personal: "", special: "", tested: true },
		Poppy: {
			regular: "existing lessons and collaborations",
			personal: "",
			special: "Five special events, rivalry, rescue, demonstration, Avery advice",
			tested: true,
		},
	};
	function lab({ host, el, button, section, select, signal, current, debugAction }) {
		const d = section("Character reactions (preview never changes relationships)");
		const who = select(
			"Character",
			Object.keys(profiles).map(k => [k, k]),
			d
		);
		const owned = select("Source", [["lab", "Current lab formula"], ...(V.perfumery?.bottles || []).map(b => [String(b.id), b.name])], d);
		const phase = select(
			"Scent phase",
			[
				["opening", "Opening"],
				["heart", "Heart"],
				["foundation", "Base"],
			],
			d
		);
		const strength = select(
			"Wear strength",
			[
				["1", "Fresh"],
				["0.6", "Settled"],
				["0.25", "Faint"],
			],
			d
		);
		const event = select(
			"Poppy event",
			poppyOrder.map(k => [k, k]),
			d
		);
		const request = select(
			"Avery request",
			averyRequests.map((r, i) => [String(i), r.context]),
			d
		);
		const framing = select(
			"Avery framing",
			[
				["asked", "Followed the brief"],
				["own", "Own choices"],
				["you", "Thinking of Avery"],
			],
			d
		);
		button("Evaluate reaction", "charEval", d);
		button("Check Poppy events", "charPoppy", d);
		button("Judge as Avery commission", "charAvery", d);
		button("Find suitable and unsuitable formulas", "charAverySearch", d);
		button("Coverage matrix", "charCoverage", d);
		button("Check for broken state", "charValidate", d);
		button("Apply to save: queue Poppy event on chosen bottle", "charQueue", d);
		button("Apply to save: reset Poppy special events only", "charResetPoppy", d);
		button("Apply to save: Avery noticed (offer due)", "charAveryNoticed", d);
		button("Apply to save: start Avery commission", "charAveryActive", d);
		button("Apply to save: reset Avery commission only", "charResetAvery", d);
		button("Apply to save: allow today's reactions again", "charResetReactions", d);
		const out = el("pre", "", d);
		const props = () => {
			if (owned.value === "lab") return current();
			const b = V.perfumery.bottles.find(b => b.id === Number(owned.value));
			if (!b) throw new Error("That bottle is gone.");
			return P().properties(b);
		};
		host.addEventListener(
			"click",
			e => {
				const action = e.target.closest("button[data-lab]")?.dataset.lab;
				if (!action?.startsWith("char") || V.debug !== 1) return;
				try {
					const id = who.value;
					if (action === "charEval") {
						const p = props();
						const r = evaluate(id, p, { phase: phase.value, strength: Number(strength.value) });
						const s = V.perfumery?.characters;
						out.textContent = JSON.stringify(
							{
								result: r,
								present: !!C.npc[id] && C.npc[id].init !== 0,
								relationshipGate: !!C.npc[id] && profiles[id].gate(),
								alreadyReactedToday: s?.reacted?.[id] === Time.days,
								weeklyLoveClaimed: s?.loveWeek?.[id] === week(),
								wouldRecordMemory: r.eligible,
								familiarity: s?.familiar?.[id] || null,
								knowledge: s?.known?.[id] || null,
								stat: profiles[id].stat || "none (no relationship change)",
							},
							null,
							2
						);
					}
					if (action === "charPoppy") {
						const p = props();
						const fake =
							owned.value === "lab"
								? { formula: current().formula, blending: 0.7, made: V.timeStamp - 60 * 86400, identityVersion: 2 }
								: V.perfumery.bottles.find(b => b.id === Number(owned.value));
						const c = V.perfumery?.characters?.poppy || { done: {}, skipped: {} };
						const q = poppyQualifies(fake).q;
						out.textContent = JSON.stringify(
							{
								priority: poppyOrder,
								qualifies: q,
								wouldPick: poppyPick(fake, c),
								poppyPresentAndFree: P().availableTeacher(),
								lessonsDone: V.perfumery?.lesson,
								sessionIdle: !V.perfumery?.session || V.perfumery.session.stage === "concluded",
								alreadyHadSpecialToday: c.day === Time.days,
								done: c.done,
								skipped: c.skipped,
								pending: c.pending,
								quality: p.technicalQuality,
								pleasantness: p.pleasantness,
							},
							null,
							2
						);
					}
					if (action === "charAvery") {
						const p = props();
						const r = averyRequests[Number(request.value)];
						out.textContent = JSON.stringify(
							{
								state: V.perfumery?.characters?.avery || "not initialized",
								offerReady: averyOfferReady(),
								request: r,
								judged: averyJudge(p, r, framing.value),
								relationship: { love: C.npc.Avery?.love, rage: C.npc.Avery?.rage, rageRevealed: V.averyragerevealed === 1, endear: V.endear },
							},
							null,
							2
						);
					}
					if (action === "charAverySearch") {
						const r = averyRequests[Number(request.value)];
						const scored = setup.perfumeryLab.candidates(300).map(c => ({ c, j: averyJudge(M().calculate(c.formula, c.blending), r, "asked") }));
						scored.sort((a, b) => b.j.fit - a.j.fit);
						const pick = list => list.slice(0, 2).map(x => ({ outcome: x.j.outcome, fit: x.j.fit, formula: x.c.formula, blending: x.c.blending }));
						out.textContent = JSON.stringify(
							{
								request: r,
								suitable: pick(scored),
								unsuitable: pick(scored.slice().reverse()),
								note: "Paste a formula into the JSON box above, or store it as a bottle to test delivery.",
							},
							null,
							2
						);
					}
					if (action === "charCoverage") {
						out.textContent = Object.entries(coverage)
							.map(([k, v]) => {
								const missing = k === "Poppy" ? !V.modLIUnlocks?.Poppy : !C.npc[k] || C.npc[k].init === 0;
								return `${k}: profile ${profiles[k] || k === "Poppy" ? "yes" : "no"}; regular ${v.regular || "none"}; personal ${
									v.personal || "none"
								}; special ${v.special || "none"}; tested ${v.tested ? "yes" : "no"}${missing ? "; NPC not met in this save" : ""}`;
							})
							.join("\n");
					}
					if (action === "charValidate") out.textContent = validateState().join("\n");
					if (action === "charQueue") debug("poppyPending", { id: event.value, bottleId: Number(owned.value) });
					if (action === "charResetPoppy") debug("resetPoppy");
					if (action === "charAveryNoticed") debug("averyStage", "noticed");
					if (action === "charAveryActive") debug("averyStage", "active");
					if (action === "charResetAvery") debug("resetAvery");
					if (action === "charResetReactions") debug("resetReactions");
					if (action.startsWith("charQueue") || action.startsWith("charReset") || action.startsWith("charAveryN") || action.startsWith("charAveryA"))
						out.textContent = "Saved. " + validateState().join(" ");
				} catch (error) {
					out.textContent = error.message;
				}
			},
			{ signal }
		);
	}
	setup.perfumeryCharacters = {
		profiles,
		evaluate,
		notice,
		asks,
		commit,
		state,
		memoryText,
		knownText,
		poppyOrder,
		poppyQualifies,
		poppyPick,
		poppyEligible,
		poppyCrafted,
		poppyPending,
		poppyResolve,
		poppyAdvice,
		poppyAsk,
		poppyAdviceRecord,
		poppyFollowup,
		poppyFollowupDone,
		averyRequests,
		averyRequest,
		averyScene,
		averyMark,
		averyLater,
		averyOfferReady,
		averyDeliverable,
		averyFit,
		averyJudge,
		averyNotice,
		averyAccept,
		averyDecline,
		averyDeliver,
		validateState,
		debug,
		lab,
		coverage,
	};
})();

/* global getKylarLocation, rollWeightedRandomFromArray, pocketSyncBag */
// begin() sets the daily flag only after selection; resolve() applies each choice once.
// poolWeight() and preview() only read state.
(() => {
	const P = () => setup.perfumery;
	const CH = () => setup.perfumeryCharacters;
	const M = () => setup.perfumeryModel;
	const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
	const layerOf = phase => (phase === "heart" ? "heart" : phase === "foundation" ? "base" : "top");
	const daily = { street: "perfumeryStreet", hallway: "perfumeryHallway" };
	const families = {
		floral: ["floral", "fresh floral", "powdery"],
		gourmand: ["gourmand", "sweet", "creamy", "roasted"],
		nature: ["woody", "herbal", "green", "earthy", "resinous", "smoky"],
	};
	const words = {
		floral: "flowers",
		"fresh floral": "fresh flowers",
		powdery: "face powder",
		fruity: "ripe fruit",
		citrus: "lemons",
		green: "cut grass",
		herbal: "herbs",
		aquatic: "rain",
		woody: "wood",
		earthy: "soil",
		resinous: "pine sap",
		spicy: "spice",
		musky: "warm skin",
		amber: "warm honey",
		sweet: "sugar",
		creamy: "cream",
		gourmand: "baking",
		roasted: "toast",
		smoky: "smoke",
		savoury: "cooking",
		rancid: "old butter",
		sulfurous: "rotten eggs",
		acrid: "burning plastic",
		moldy: "mould",
		decaying: "something rotting",
		pungent: "vinegar",
		sour: "sour milk",
		fermented: "old fruit",
		sweaty: "sweat",
		burnt: "burnt food",
	};
	const word = k => words[k] || "perfume";
	const foulNotes = ["rancid", "sulfurous", "acrid", "moldy", "decaying", "pungent", "sour", "fermented", "sweaty", "burnt"];

	/* What a passer-by can tell about the perfume right now, from the calculated profile and the current phase. */
	function profile(p = P().scent()) {
		if (!p || p.identityVersion !== 2 || p.strength < 0.15) return null;
		const layer = layerOf(p.phase);
		const local = p.phaseStrengths?.[layer] || p.descriptorStrengths || {};
		const all = p.descriptorStrengths || {};
		const pleasant = p.phasePleasantness?.[layer] ?? p.pleasantness;
		const foul = foulNotes.filter(k => (local[k] ?? all[k] ?? 0) > 0.15).sort((a, b) => (local[b] || 0) - (local[a] || 0));
		const sweetness = ["gourmand", "sweet", "creamy", "roasted"].reduce((n, k) => n + (all[k] || 0), 0);
		const top = [...(p.contributions || [])].sort((a, b) => b.weight - a.weight)[0];
		const material = top ? M().source(top.id) : null;
		return {
			proj: Math.round(p.intensity * p.strength * 100) / 100,
			pleasant: Math.round(pleasant),
			quality: Math.round(p.technicalQuality),
			distinct: Math.round(p.distinctiveness),
			foul: foul[0] || null,
			family: Object.keys(families).find(f => families[f].includes(p.dominant)) || "other",
			gourmand: families.gourmand.includes(p.dominant) || sweetness > 0.45,
			dominant: p.dominant,
			phase: p.phase,
			turned: layer !== "top" && (p.phasePleasantness?.top ?? 0) >= 55 && pleasant < 40,
			romance: Math.round((p.romance || 0) * 100) / 100,
			animal: Math.round((p.animal || 0) * 100) / 100,
			material: material ? setup.foodstuff[material]?.name || null : null,
			fp: p.fingerprint,
		};
	}
	/* A named character can react only if the existing reaction rules allow it today. */
	function canReact(id) {
		const prof = CH().profiles[id];
		const c = C.npc[id];
		return !!(prof && c && c.init === 1 && prof.gate() && V.perfumery?.characters?.reacted?.[id] !== Time.days);
	}
	const night = () => Time.dayState === "night";
	const scenes = {
		street: [
			{ id: "compliment", when: f => !f.foul && f.pleasant >= 55 && f.proj >= 0.5, weight: 3 },
			{ id: "complaint", when: f => !!f.foul || f.pleasant < 35, weight: 4 },
			{ id: "ingredient", when: f => !f.foul && f.pleasant >= 45 && !!f.material, weight: 2 },
			{ id: "customer", when: f => !f.foul && f.quality >= 65 && f.pleasant >= 55 && !night(), weight: 2 },
			{ id: "tooMuch", when: f => f.proj >= 2, weight: 3 },
			{ id: "sweet", when: f => f.gourmand && !f.foul, weight: 3 },
			{ id: "animal", when: f => (f.gourmand || f.animal > 0.3) && !night(), weight: 1.5 },
			{ id: "advice", when: f => !f.foul && f.pleasant >= 35 && f.pleasant < 60, weight: 2 },
			{ id: "trail", when: f => !f.foul && f.pleasant >= 50 && f.proj >= 1.1 && f.phase !== "opening", weight: 2 },
			{ id: "turned", when: f => f.turned, weight: 4 },
			{ id: "follower", when: f => night() && !f.foul && f.pleasant >= 50 && f.proj >= 1.2, weight: 1.5 },
		],
		hallway: [
			{ id: "Robin", when: () => getRobinLocation() === "school" && canReact("Robin"), weight: 3, npc: true },
			{ id: "Whitney", when: () => C.npc.Whitney.state === "active" && canReact("Whitney"), weight: 3, npc: true },
			{ id: "Kylar", when: () => C.npc.Kylar.state === "active" && getKylarLocation().area !== "english" && canReact("Kylar"), weight: 2, npc: true },
			{
				id: "Sydney",
				when: () => ["morning", "afternoon"].includes(V.schoolstate) && !V.daily.sydney?.punish && V.sydneyLate !== 1 && canReact("Sydney"),
				weight: 2,
				npc: true,
			},
			{ id: "food", when: f => f.gourmand && !f.foul, weight: 3 },
			{ id: "complaint", when: f => !!f.foul || f.proj >= 2.2, weight: 4 },
			{ id: "bought", when: f => !f.foul && f.pleasant >= 55, weight: 3 },
			{ id: "howTo", when: f => !f.foul && f.quality >= 60, weight: 2 },
			{ id: "teacher", when: f => !!f.foul || f.proj >= 2 || f.distinct >= 70, weight: 2 },
			{ id: "admirer", when: f => !f.foul && f.pleasant >= 55 && f.romance >= 0.45, weight: 2 },
		],
	};
	function history() {
		return V.perfumery?.encounters;
	}
	function candidates(place, f) {
		const h = history();
		return scenes[place]
			.filter(s => s.when(f))
			.map(s => {
				const key = `${place}:${s.id}`;
				const variety = h?.recent?.includes(key) ? 0.25 : h?.n?.[key] ? 1 : 1.5;
				return { id: s.id, npc: !!s.npc, weight: s.weight * variety };
			});
	}
	function blocked(place) {
		if (!P().enabled() || !daily[place]) return "Perfumery is off.";
		if (V.daily[daily[place]]) return "Already happened today.";
		if (V.exposed > 0) return "You're exposed.";
		if (place === "street" && !V.outside) return "Not outdoors.";
		return null;
	}
	/* Read-only. The weight this location's perfume event gets in the host's event pool. Kept small so vanilla events keep their share. */
	function poolWeight(place) {
		if (blocked(place)) return 0;
		const f = profile();
		if (!f || !candidates(place, f).length) return 0;
		return f.proj < 0.6 ? 0.05 : clamp(0.08 + f.proj * 0.12, 0.08, 0.45);
	}
	/* The bottles you could hand over: carried in your pocket or bag, matured, not empty. */
	function carried() {
		const session = V.perfumery?.session;
		return (V.perfumery?.bottles || []).filter(b => b.packed && b.uses > 0 && P().ready(b) && !(session?.stage === "review" && session.bottleId === b.id));
	}
	function price(b) {
		const q = P().properties(b).technicalQuality;
		return Math.round(clamp(400 + q * 15, 800, 2400) * Math.min(1, b.uses / 10));
	}
	const kept = ["kind", "tone", "note", "liked", "disliked", "favourite", "familiarity", "gifted", "tooStrong", "craft", "curiosity", "enjoyment", "quality"];
	/* Starts the event the pool picked. Sets the daily flag, chooses the scene and stores what the scene needs to show. */
	function begin(place, force) {
		if (!force && blocked(place)) return null;
		const f = profile();
		if (!f) return null;
		const list = candidates(place, f);
		const pick = force ? list.find(s => s.id === force) || { id: force, npc: CH().profiles[force] !== undefined } : rollWeightedRandomFromArray(list);
		if (!pick) return null;
		V.daily[daily[place]] = true;
		const h = (V.perfumery.encounters ??= { n: {}, recent: [], last: null, sold: 0 });
		const key = `${place}:${pick.id}`;
		h.n[key] = Math.min(99, (h.n[key] || 0) + 1);
		h.recent = [key, ...h.recent.filter(k => k !== key)].slice(0, 4);
		const e = {
			place,
			id: pick.id,
			f,
			name: String(P().scent().name).slice(0, 48),
			buys: f.quality >= 70 || f.pleasant >= 65,
			v: setup.perfumeryIdentity.hash(`${key}|${Time.days}|${f.fp}`) % 4,
			repeat: h.n[key] > 1,
		};
		if (pick.id === "teacher") e.teacher = V.schoolstate === "lunch" ? "River" : "Leighton";
		if (pick.npc) {
			const r = CH().evaluate(pick.id, P().scent());
			e.npc = pick.id;
			e.r = Object.fromEntries(kept.filter(k => r[k] !== undefined).map(k => [k, r[k]]));
		}
		const offer = carried().sort((a, b) => P().properties(b).technicalQuality - P().properties(a).technicalQuality)[0];
		if (offer) e.bottle = { id: offer.id, name: offer.name, price: price(offer) };
		V.perfumeryEncounter = e;
		return e;
	}
	function removeBottle(id) {
		const s = V.perfumery;
		const i = s.bottles.findIndex(b => b.id === id && b.packed);
		if (i < 0) return false;
		s.bottles.splice(i, 1);
		if (typeof pocketSyncBag === "function") pocketSyncBag();
		return true;
	}
	/* Applies a choice once. delta.love/rage/dom go through the character system's own daily and weekly limits. */
	function resolve(choice, delta = {}) {
		const e = V.perfumeryEncounter;
		if (!e || e.choice) return e?.out;
		e.choice = choice;
		e.out = {};
		if (e.npc) e.out = CH().commit(e.npc, "hallway", choice, delta);
		for (const stat of ["stress", "control", "trauma"]) if (delta[stat]) Wikifier.wikifyEval(`<<${stat} ${clamp(delta[stat], -10, 10)}>>`);
		if (delta.sell && e.bottle) {
			e.out.sold = removeBottle(e.bottle.id);
			if (e.out.sold) {
				Wikifier.wikifyEval(`<<money ${e.bottle.price} "perfumerySale">>`);
				V.perfumery.encounters.sold = Math.min(999, V.perfumery.encounters.sold + 1);
			}
		}
		if (delta.give && e.bottle) e.out.given = removeBottle(e.bottle.id);
		if (delta.detention) Wikifier.wikifyEval(`<<detention ${clamp(delta.detention, 0, 3)}>>`);
		if (delta.wash) P().wash();
		if (delta.pass) Wikifier.wikifyEval(`<<pass ${clamp(delta.pass, 1, 30)}>>`);
		return e.out;
	}
	/* Called by the reply passage. Keeps a compact copy so a re-render of the same turn can still show the reply. */
	function finish() {
		const e = V.perfumeryEncounter;
		const h = history();
		if (e && h) h.last = { ...e, turn: State.turns };
		delete V.perfumeryEncounter;
		return e || (h?.last?.turn === State.turns ? h.last : null);
	}
	/* Debug: what each scene would do right now. No state changes. */
	function preview(place) {
		const f = profile();
		const ok = f ? candidates(place, f) : [];
		return {
			blocked: blocked(place),
			weight: poolWeight(place),
			profile: f,
			scenes: scenes[place].map(s => ({ id: s.id, eligible: !!ok.find(c => c.id === s.id), weight: ok.find(c => c.id === s.id)?.weight || 0 })),
		};
	}
	setup.perfumeryEncounters = { word, profile, poolWeight, preview, begin, resolve, finish, carried, price, scenes };
})();
