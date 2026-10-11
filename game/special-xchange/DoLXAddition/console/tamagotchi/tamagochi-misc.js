/* globals Tamagotchi PetArt formatMoney */
/* Virtual Pet challenges and the daily battle. The opponent scales from the pet's stats, and the battle ends through
 * finish(), never endBattle(), so the pet's own data is never touched. Records: $petChallenges { v, done: { id: date },
 * daily: { date: { tries, done, best, paid } } }.
 * Rules: noHeal, basics (Attack and Guard only), maxTurns, minHp (a Revive save counts as falling), finisher "element". */
(() => {
	const daily = () => setup.consoleDaily;
	const schema = 1;

	const challenges = Object.freeze(
		[
			{ id: "warm-up", name: "Warm-Up", diff: "easy", foe: { strength: 0.7 }, rules: {} },
			{ id: "clean-sweep", name: "Clean Sweep", diff: "easy", foe: { strength: 0.75 }, rules: { noHeal: true } },
			{ id: "back-to-basics", name: "Back to Basics", diff: "easy", foe: { strength: 0.75 }, rules: { basics: true } },
			{ id: "quick-work", name: "Quick Work", diff: "medium", foe: { strength: 0.8 }, rules: { maxTurns: 14 } },
			{ id: "untouchable", name: "Untouchable", diff: "medium", foe: { strength: 0.6 }, rules: { minHp: 0.4 } },
			{ id: "toe-to-toe", name: "Toe to Toe", diff: "medium", foe: { strength: 0.9 }, rules: {} },
			{ id: "signature-move", name: "Signature Move", diff: "medium", foe: { strength: 0.9 }, rules: { finisher: "element" } },
			{ id: "iron-will", name: "Iron Will", diff: "hard", foe: { strength: 0.95 }, rules: { noHeal: true, maxTurns: 20 } },
			{ id: "glass-cannon", name: "Glass Cannon", diff: "hard", foe: { strength: 0.7 }, rules: { minHp: 0.5 } },
			{ id: "heavyweight", name: "Heavyweight", diff: "hard", foe: { strength: 1.05 }, rules: {} },
			{ id: "mirror-match", name: "Mirror Match", diff: "hard", foe: { strength: 0.9, mirror: true }, rules: {} },
		].map(c => Object.freeze(c))
	);
	const byId = id => challenges.find(c => c.id === id) || null;

	/* The daily battle: the UTC date picks the opponent's element and one of these. */
	const dailyTemplates = Object.freeze([
		{ level: "easy", foe: { strength: 0.7 }, rules: { noHeal: true } },
		{ level: "easy", foe: { strength: 0.7 }, rules: { maxTurns: 22 } },
		{ level: "medium", foe: { strength: 0.8 }, rules: { maxTurns: 18 } },
		{ level: "medium", foe: { strength: 0.6 }, rules: { minHp: 0.4 } },
		{ level: "hard", foe: { strength: 0.9 }, rules: { noHeal: true } },
		{ level: "hard", foe: { strength: 0.85, mirror: true }, rules: { maxTurns: 24 } },
	]);
	const types = ["fire", "water", "grass", "electric"];

	function dailyFor(date = daily().utcDate()) {
		const r = daily().seeded({ rng: daily().hash("pet-daily-" + date) });
		const t = dailyTemplates[Math.floor(r() * dailyTemplates.length)];
		const type = types[Math.floor(r() * types.length)];
		return Object.freeze({
			id: "daily-" + date,
			date,
			name: "Daily battle",
			diff: t.level,
			foe: { ...t.foe, type, pick: r() },
			rules: t.rules,
			reward: daily().dailyMoney.pet[t.level] || 0,
		});
	}

	/* ---- records ---- */
	function data() {
		const d = V.petChallenges && typeof V.petChallenges === "object" ? V.petChallenges : (V.petChallenges = {});
		if (!Number.isInteger(d.v)) d.v = schema;
		if (!d.done || typeof d.done !== "object") d.done = {};
		if (!d.daily || typeof d.daily !== "object") d.daily = {};
		return d;
	}
	const peek = () => (V.petChallenges && typeof V.petChallenges === "object" ? V.petChallenges : { done: {}, daily: {} });

	/* ---- text ---- */
	function rulesText(c) {
		const r = c.rules;
		const out = [];
		if (r.noHeal) out.push("no Rest or healing skills");
		if (r.basics) out.push("Attack and Guard only");
		if (r.maxTurns) out.push(`at most ${r.maxTurns} turns`);
		if (r.minHp) out.push(`HP never below ${Math.round(r.minHp * 100)}%`);
		if (r.finisher === "element") out.push("an own-element skill as the final blow");
		return out;
	}
	/* With a pet, names the element it will really face (after the fairness swap in makeFoe). */
	function foeText(c, pet = Tamagotchi.isAlive() ? V.tamagotchi : null) {
		const f = c.foe;
		const type = !f.mirror && pet ? makeFoe(c, pet).type : f.type;
		const how = f.mirror ? "a mirror of your own pet" : type ? `a ${type} opponent` : "an opponent whose element has no edge over your pet";
		const s = f.strength;
		const level =
			s < 0.8 ? "weaker than your pet" : s < 0.97 ? "a little weaker than your pet" : s <= 1.03 ? "as strong as your pet" : "stronger than your pet";
		return `${how}, ${level}`;
	}
	function describe(c) {
		const rules = rulesText(c);
		return rules.length ? `Win with ${rules.join(" and ")}.` : "Win the battle.";
	}

	/* Whether this pet can attempt it at all (a Signature Move needs an own-element attack skill). */
	function needs(c, pet = V.tamagotchi) {
		if (c.rules.finisher === "element") {
			const own = Tamagotchi.battleSkills().some(s => !s.heal && s.type === (pet && pet.type));
			if (!own) return "Needs a learned attack skill of your pet's own element.";
		}
		return "";
	}

	/* ---- the opponent ---- */
	function makeFoe(c, pet) {
		const f = c.foe;
		const strength = f.strength;
		const rng = daily().seeded({ rng: daily().hash("pet-foe-" + c.id + "-" + (f.pick || 0)) });
		/* Never an element that hits the pet super-effectively, so no starter has an impossible day: the day's element
		 * stands unless it beats the pet, and then the next fair one is used. */
		const fair = types.filter(t => Tamagotchi.typeMult(t, pet.type) <= 1);
		let type = f.mirror ? pet.type : f.type || fair[Math.floor(rng() * fair.length)];
		if (!f.mirror && !fair.includes(type)) type = fair[(types.indexOf(type) + 1) % fair.length] || fair[0];
		const scaled = (v, k) => Math.max(1, Math.round(v * k * strength));
		const base = {
			type,
			maxHp: scaled(pet.maxHp, 1),
			atk: scaled(pet.atk, 0.9),
			def: scaled(pet.def, 0.85),
			spd: scaled(pet.spd, 1),
			usesSkills: true,
			skillPower: 24,
			skillChance: 0.5,
		};
		if (f.mirror) {
			const sd = setup.petForms.pets[pet.species];
			const skills = (Array.isArray(pet.skills) ? pet.skills : []).filter(id => {
				const s = Tamagotchi.battleSkills().find(x => x.id === id);
				return s && !s.heal;
			});
			const heals = Tamagotchi.battleSkills()
				.filter(s => s.heal)
				.map(s => s.id);
			return {
				...base,
				name: "Mirror " + (sd ? sd.name : "Beast"),
				hp: base.maxHp,
				skills,
				heals,
				healsLeft: heals.length ? 1 : 0,
				canRevive: false,
				reviveUsed: false,
				skillPower: 28,
				skillChance: 0.6,
				kind: "boss",
			};
		}
		const names = Object.keys(setup.petForms.wild).filter(n => setup.petForms.wild[n].type === type);
		return { ...base, name: names[Math.floor(rng() * names.length)] || "Wild beast", hp: base.maxHp, kind: "wild" };
	}

	/* ---- starting and tracking ---- */
	function blocked() {
		if (!Tamagotchi.isAlive()) return "Your pet needs to be alive.";
		if (Tamagotchi.isSleeping()) return "Your pet is asleep.";
		const b = Tamagotchi.battleState();
		if (b && b.kind === "challenge") return "";
		if (b) return "Finish the battle your pet is already in first.";
		const t = Tamagotchi.status();
		if (t.pendingAttack) return "Your pet is under attack. Deal with that first.";
		return "";
	}

	function start(id) {
		install();
		if (blocked() || Tamagotchi.battleState()) return null;
		const c = id === "daily" ? dailyFor() : byId(id);
		if (!c || needs(c)) return null;
		const pet = V.tamagotchi;
		const enemy = makeFoe(c, pet);
		V.petBattle = {
			kind: "challenge",
			enemy,
			hp: pet.maxHp,
			maxHp: pet.maxHp,
			mp: pet.maxMp,
			maxMp: pet.maxMp,
			guarding: false,
			reviveUsed: false,
			usedBackup: true,
			log: [`Challenge: ${c.name}. ${enemy.kind === "boss" ? "A mirror of " + pet.name : "A " + enemy.name} steps up to face ${pet.name}.`],
			over: false,
			result: null,
			turn: 0,
			challenge: {
				id: c.id,
				kind: id === "daily" ? "daily" : "challenge",
				date: id === "daily" ? c.date : null,
				minHp: 1,
				used: {},
				lastMove: null,
				broken: null,
			},
		};
		if (id === "daily") {
			const d = data();
			const rec = d.daily[c.date] || (d.daily[c.date] = { tries: 0, done: false, best: null });
			rec.tries++;
			daily().prune(d.daily);
		}
		return V.petBattle;
	}

	const defOf = ch => (ch.kind === "daily" ? dailyFor(ch.date) : byId(ch.id));

	/* Called after every round of a challenge battle: notes what was used and whether a rule was broken. */
	function note(b, action) {
		const ch = b.challenge;
		const c = defOf(ch);
		if (!c) return;
		ch.used[action.kind] = (ch.used[action.kind] || 0) + 1;
		ch.lastMove = action;
		const knocked = b.log.some(line => / is struck down, but its Revive/.test(line));
		ch.minHp = Math.min(ch.minHp, knocked ? 0 : b.hp / Math.max(1, b.maxHp));
		const r = c.rules;
		if (ch.broken) return;
		if (r.noHeal && action.heal) ch.broken = "your pet healed";
		else if (r.basics && action.kind !== "attack" && action.kind !== "guard") ch.broken = "a move other than Attack or Guard was used";
		else if (r.minHp && ch.minHp < r.minHp) ch.broken = `HP fell below ${Math.round(r.minHp * 100)}%`;
		else if (r.maxTurns && b.turn >= r.maxTurns && !(b.over && b.result === "win")) ch.broken = `the ${r.maxTurns} turns ran out`;
	}

	/* Where the battle stands, for the objective strip. */
	function status(b = Tamagotchi.battleState()) {
		if (!b || b.kind !== "challenge") return null;
		const ch = b.challenge;
		const c = defOf(ch);
		const r = c.rules;
		const bits = [];
		if (r.maxTurns) bits.push(`turn ${Math.min(b.turn, r.maxTurns)} of ${r.maxTurns}`);
		if (r.minHp) bits.push(`lowest HP ${Math.round(ch.minHp * 100)}% (limit ${Math.round(r.minHp * 100)}%)`);
		return { c, broken: ch.broken, text: bits.join(" · ") };
	}

	/* Ends a finished challenge battle: records it and removes the battle. Never touches the pet. Returns
	 * { result "win"|"lose", done, why, name, turns, paid } or null when there is no finished challenge battle. */
	function finish() {
		const b = Tamagotchi.battleState();
		if (!b || b.kind !== "challenge" || !b.over) return null;
		const ch = b.challenge;
		const c = defOf(ch);
		let why = ch.broken;
		const won = b.result === "win";
		if (won && !why && c.rules.finisher === "element") {
			const m = ch.lastMove;
			if (!(m && m.kind === "attack" && m.skill && m.type === V.tamagotchi.type)) why = "the winning blow was not an own-element skill";
		}
		const out = { result: won ? "win" : "lose", done: won && !why, why: won ? why : "", name: c.name, turns: b.turn, paid: 0, kind: ch.kind };
		if (out.done) {
			const d = data();
			if (ch.kind === "challenge") {
				if (!d.done[c.id]) d.done[c.id] = daily().utcDate();
			} else {
				const rec = d.daily[c.date] || (d.daily[c.date] = { tries: 1, done: false, best: null });
				rec.done = true;
				rec.best = rec.best === null ? b.turn : Math.min(rec.best, b.turn);
				const age = daily().daysAgo(c.date);
				if (!rec.paid && c.reward > 0 && age >= 0 && age < daily().keepDays) {
					rec.paid = c.reward;
					out.paid = daily().pay(c.reward);
				}
			}
			if (setup.consoleSfx) setup.consoleSfx.play("pet-challenge");
			if (ch.kind === "challenge" && masterFeat()) out.feat = daily().feats.pet;
		}
		delete V.petBattle;
		return out;
	}

	/* Champion Tamer: every challenge completed (DoL shows its own feat banner). True only when this call earned it. */
	function masterFeat() {
		const done = peek().done || {};
		return challenges.every(c => done[c.id]) && daily().earnFeatOnce(daily().feats.pet);
	}

	/* ---- watching rounds (the same wrapping pet-art.js uses; neither changes what a round does) ---- */
	let installed = false;
	function install() {
		if (installed || typeof Tamagotchi === "undefined") return;
		installed = true;
		const wrap = (name, describeAction) => {
			const fn = Tamagotchi[name];
			Tamagotchi[name] = function (...args) {
				const b = Tamagotchi.battleState();
				const before = b ? b.turn : null;
				const action = describeAction(...args);
				const result = fn.apply(this, args);
				const after = Tamagotchi.battleState();
				if (after && after.kind === "challenge" && after.turn !== before) note(after, action);
				return result;
			};
		};
		wrap("battleAttack", () => ({ kind: "attack", type: "normal" }));
		wrap("battleGuard", () => ({ kind: "guard" }));
		wrap("battleRest", () => ({ kind: "rest", heal: true }));
		wrap("battleSkill", id => {
			const s = Tamagotchi.battleSkills().find(x => x.id === id);
			return s && s.heal ? { kind: "skill", heal: true } : { kind: "attack", skill: true, type: s ? s.type : "normal" };
		});
	}

	/* ---- the Challenges page ---- */
	const chip = level => daily().chip(level);

	/* The opponent's drawing (small, facing the pet), or nothing without a living pet. */
	function foeArt(c) {
		if (!Tamagotchi.isAlive() || typeof PetArt === "undefined") return "";
		return PetArt.html(PetArt.enemyKey(makeFoe(c, V.tamagotchi)), { size: "icon", still: true, flip: true });
	}

	/* Rows for the page: everything the twee list needs, already worded. */
	function rows() {
		const done = peek().done || {};
		return challenges.map(c => ({
			id: c.id,
			name: c.name,
			diff: c.diff,
			chip: chip(c.diff),
			describe: describe(c),
			foe: foeText(c),
			done: done[c.id] || "",
			needs: needs(c),
			art: foeArt(c),
		}));
	}
	function dailyView() {
		const c = dailyFor();
		const rec = (peek().daily || {})[c.date] || null;
		return {
			c,
			chip: chip(c.diff),
			describe: describe(c),
			foe: foeText(c),
			rec,
			reward: c.reward
				? rec && rec.paid
					? `${formatMoney(rec.paid)}, claimed today`
					: `${formatMoney(c.reward)} on completion, not claimed yet`
				: "None today",
			reset: daily().untilReset(),
			art: foeArt(c),
			foeName: Tamagotchi.isAlive() ? makeFoe(c, V.tamagotchi).name : "",
			petArt: Tamagotchi.isAlive() && typeof PetArt !== "undefined" ? PetArt.icon(V.tamagotchi.species) : "",
			history: daily().history(peek().daily, c.date, r => `won in ${r.best} turns`),
		};
	}
	const progress = () => ({ count: challenges.filter(c => (peek().done || {})[c.id]).length, total: challenges.length });
	const featCard = () => daily().featCard(daily().feats.pet, progress().count, challenges.length);

	if (typeof jQuery !== "undefined") jQuery(document).one(":storyready", install);

	setup.petChallenges = Object.freeze({
		challenges,
		dailyTemplates,
		dailyFor,
		describe,
		foeText,
		needs,
		makeFoe,
		blocked,
		start,
		status,
		finish,
		rows,
		dailyView,
		progress,
		data,
		install,
		chip,
		masterFeat,
		featCard,
	});
})();
