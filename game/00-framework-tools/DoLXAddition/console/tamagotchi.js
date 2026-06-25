/* Virtual pet ("Tamagotchi") minigame for the console furniture item.
 * State lives on V.tamagotchi so the pet keeps living regardless of the player's location.
 *
 * Loop:
 *  - Care: feed/play/clean/rest/cure keep the pet alive (neglect can kill it).
 *  - Train (once per day): pick a discipline, gain a stat, and every 3rd training drafts one new skill from a choice of three.
 *  - Weekly attack: a wild enemy comes. A turn-based battle with Attack / Guard / Rest (restore MP + a little HP) and any learned MP-costed skills.
 * 		Win and the enemy grows tougher next week; lose and pet dies, must hatch a new one. */
const Tamagotchi = (() => {
	const Tuning = Object.freeze({
		hungerPerHour: 4,
		happinessPerHour: 3,
		energyPerHour: 1.5,
		poopChancePerHour: 0.15,
		maxPoops: 4,
		sickThresholdHunger: 90,
		sickThresholdPoops: 3,
		neglectHoursToDeath: 72,
		maxElapsedHours: 240,
		attackIntervalDays: 7,
		skillEveryTrainings: 3,
		sleepHours: 6,
		damageScale: 0.5,
		guardMpFrac: 0.2,
		restHpFrac: 0.12,
		restMpFrac: 0.4,
		recoverHpFrac: 0.35,
		winStatBoostStep: 10,
		boosterHp: 100,
		boosterMp: 50,
		/* Stat ceilings. A pet that reaches all of these can grow no further (and the player may adopt a second pet). */
		capHp: 5000,
		capMp: 2500,
		capStat: 500,
		/* Combat scaling for the tougher post-launch enemies. */
		enemyBaseHp: 100,
		minibossHpMult: 2,
		evolveSkillCost: 10,
		evolveStatMult: 10,
		minibossChance: 0.35,
		boosterPctMin: 5,
		boosterPctMax: 20,
		dungeonTiles: 15,
	});

	/* Starters: base stats + type + icon. Pets start with no skills; they draft them through training. */
	const SPECIES = {
		embit: { name: "Embit", type: "fire", blurb: "A hot-headed little lizard.", icon: "embit", evolution: "blazilisk", base: { hp: 28, atk: 8, def: 5, spd: 6, mp: 8 } },
		pudduck: { name: "Pudduck", type: "water", blurb: "A calm, dependable duckling.", icon: "pudduck", evolution: "pondswan", base: { hp: 34, atk: 6, def: 7, spd: 4, mp: 8 } },
		sprout: { name: "Sprout", type: "grass", blurb: "A sturdy little seedling.", icon: "sprout", evolution: "oakguard", base: { hp: 32, atk: 6, def: 8, spd: 4, mp: 8 } },
		voltpup: { name: "Voltpup", type: "electric", blurb: "A jittery, lightning-fast pup.", icon: "voltpup", evolution: "thundrover", base: { hp: 26, atk: 8, def: 5, spd: 8, mp: 8 } },
	};

	/* Evolved forms. Reached by sacrificing skills (see evolve()); they inherit the base type and the pet's name. */
	const EVOLVED = {
		blazilisk: { name: "Blazilisk", type: "fire", icon: "blazilisk", blurb: "A towering ember serpent." },
		pondswan: { name: "Pondswan", type: "water", icon: "pondswan", blurb: "A regal river swan." },
		oakguard: { name: "Oakguard", type: "grass", icon: "oakguard", blurb: "A bark-plated sentinel." },
		thundrover: { name: "Thundrover", type: "electric", icon: "thundrover", blurb: "A storm-charged hound." },
	};
	const BOSS_ICON = "boss-dragon";
	const MINIBOSS_ICON = "bossmini-golem";
	/* Combined lookup so species helpers resolve both base and evolved ids. */
	const speciesDef = id => SPECIES[id] || EVOLVED[id] || null;
	/* Resolve any species id (base or evolved) back to its base starter id, so two pets of the same line can't coexist. */
	const baseSpeciesOf = id => SPECIES[id] ? id : Object.keys(SPECIES).find(b => SPECIES[b].evolution === id) || id;

	/* The draftable skills. Elemental damage, plus normal-type utility (heals, a nuke and a passive revive).
	 * effect "heal": restores HP by healFrac (defaults to Tuning.recoverHpFrac).
	 * effect "autorevive": passive, never used as a move; if learned, the pet revives once per battle when it would faint. */
	const SKILLS = {
		ember: { name: "Ember", type: "fire", power: 12, mp: 3 },
		flameburst: { name: "Flame Burst", type: "fire", power: 20, mp: 6 },
		inferno: { name: "Inferno", type: "fire", power: 30, mp: 10 },
		bubble: { name: "Bubble", type: "water", power: 12, mp: 3 },
		aquapulse: { name: "Aqua Pulse", type: "water", power: 20, mp: 6 },
		tsunami: { name: "Tsunami", type: "water", power: 30, mp: 10 },
		vinewhip: { name: "Vine Whip", type: "grass", power: 12, mp: 3 },
		leafstorm: { name: "Leaf Storm", type: "grass", power: 20, mp: 6 },
		solarbeam: { name: "Solar Beam", type: "grass", power: 30, mp: 10 },
		spark: { name: "Spark", type: "electric", power: 12, mp: 3 },
		thunderbolt: { name: "Thunderbolt", type: "electric", power: 20, mp: 6 },
		voltcrash: { name: "Volt Crash", type: "electric", power: 30, mp: 10 },
		powerstrike: { name: "Power Strike", type: "normal", power: 16, mp: 4 },
		slam: { name: "Slam", type: "normal", power: 13, mp: 3 },
		rampage: { name: "Rampage", type: "normal", power: 22, mp: 7 },
		meteor: { name: "Meteor Strike", type: "normal", power: 28, mp: 9 },
		recover: { name: "Recover", type: "normal", power: 0, mp: 5, effect: "heal" },
		rejuvenate: { name: "Rejuvenate", type: "normal", power: 0, mp: 8, effect: "heal", healFrac: 0.6 },
		revive: { name: "Revive", type: "normal", power: 0, mp: 0, effect: "autorevive", passive: true },
	};

	const TRAININGS = {
		strength: { name: "Strength training", stat: "atk", gain: 3, desc: "Raises Attack." },
		endurance: { name: "Endurance training", stat: "maxHp", gain: 12, desc: "Raises max HP." },
		agility: { name: "Agility drills", stat: "spd", gain: 3, desc: "Raises Speed." },
		defense: { name: "Defence drills", stat: "def", gain: 3, desc: "Raises Defence." },
		focus: { name: "Focus meditation", stat: "maxMp", gain: 5, desc: "Raises max MP." },
	};

	const ENEMY_NAMES = {
		fire: ["Cinderbeast", "Magmite", "Ashfang"],
		water: ["Drizzlefin", "Tidemaw", "Brinejaw"],
		grass: ["Thornbeast", "Bramblil", "Mosshorn"],
		electric: ["Boltfang", "Sparkmaw", "Voltbeast"],
	};

	/* Softer-than-Pokemon multipliers so type swings don't one-shot a permadeath pet. */
	const TYPE_CHART = {
		fire: { grass: 1.5, water: 0.67, fire: 0.67 },
		water: { fire: 1.5, grass: 0.67, water: 0.67 },
		grass: { water: 1.5, fire: 0.67, grass: 0.67 },
		electric: { water: 1.5, grass: 0.67, electric: 0.67 },
		normal: {},
	};

	const clamp = v => Math.max(0, Math.min(100, Math.round(v)));
	const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
	const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	const now = () => (typeof Time !== "undefined" && Time.date ? Time.date.timeStamp : 0);
	const secondsPerDay = (typeof TimeConstants !== "undefined" && TimeConstants.secondsPerDay) || 86400;
	const dayNum = () => Math.floor(now() / secondsPerDay);
	const rand = n => Math.floor(Math.random() * n);
	const typeMult = (atk, def) => (TYPE_CHART[atk] && TYPE_CHART[atk][def]) || 1;
	const effNote = tm => (tm > 1 ? " Super effective!" : tm < 1 ? " Not very effective..." : "");
	const monthKey = () => (typeof Time !== "undefined" && Time.year != null ? Time.year + "-" + Time.month : "0");
	const isBloodMoon = () => typeof Time !== "undefined" && typeof Time.isBloodMoon === "function" && Time.isBloodMoon();

	/* Apply the stat ceilings in-place. Called after anything that raises a stat (training, wins, boosters, evolution). */
	function clampStats(t) {
		if (!t) return;
		t.maxHp = Math.min(t.maxHp, Tuning.capHp);
		t.maxMp = Math.min(t.maxMp, Tuning.capMp);
		t.atk = Math.min(t.atk, Tuning.capStat);
		t.def = Math.min(t.def, Tuning.capStat);
		t.spd = Math.min(t.spd, Tuning.capStat);
	}
	/* True once every stat sits at its ceiling: the pet can grow no further. */
	function atCap(t) {
		return !!t && t.maxHp >= Tuning.capHp && t.maxMp >= Tuning.capMp && t.atk >= Tuning.capStat && t.def >= Tuning.capStat && t.spd >= Tuning.capStat;
	}
	const speciesIcon = id => { const d = speciesDef(id); return d && d.icon ? "mini-game/" + d.icon + ".png" : ""; };

	function exists() {
		return typeof V !== "undefined" && V.tamagotchi != null && typeof V.tamagotchi === "object";
	}
	function isAlive() {
		return exists() && V.tamagotchi.alive === true;
	}

	function makePet(name, speciesId) {
		const ids = Object.keys(SPECIES);
		const sid = SPECIES[speciesId] ? speciesId : ids[rand(ids.length)];
		const s = SPECIES[sid];
		const petName = name == null ? "" : String(name).replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 30);
		return {
			alive: true,
			name: petName || s.name,
			born: now(),
			lastTick: now(),
			hunger: 30,
			happiness: 70,
			energy: 80,
			poops: 0,
			sick: false,
			careScore: 50,
			neglectHours: 0,
			deathCause: null,
			sleepUntil: 0,
			justWoke: false,
			species: sid,
			type: s.type,
			evolved: false,
			maxHp: s.base.hp,
			maxMp: s.base.mp,
			atk: s.base.atk,
			def: s.base.def,
			spd: s.base.spd,
			skills: [],
			trainCount: 0,
			lastTrainDay: -999,
			pendingSkillChoice: false,
			skillOffer: [],
			wave: 0,
			wins: 0,
			lastBossMonth: null,
			lastBossArm: null,
			bossPending: false,
			bossDeadline: 0,
			nextAttackDay: dayNum() + Tuning.attackIntervalDays,
		};
	}
	function hatch(name, speciesId) {
		V.tamagotchi = makePet(name, speciesId);
		delete V.petBattle;
		return V.tamagotchi;
	}

	/* --- Multi-pet (tag-team). The active pet lives on V.tamagotchi; an optional second pet benches on V.petBackup. --- */
	function hasBackup() {
		return typeof V !== "undefined" && V.petBackup != null && typeof V.petBackup === "object";
	}
	function backupAlive() {
		return hasBackup() && V.petBackup.alive === true;
	}
	/* Adopt a second pet, allowed once the active pet has maxed out and there's no backup yet.
	 * The new pet can't be the same species line as the one you already have. */
	function adopt(name, speciesId) {
		if (!isAlive() || !atCap(V.tamagotchi) || hasBackup()) return false;
		if (!SPECIES[speciesId] || speciesId === baseSpeciesOf(V.tamagotchi.species)) return false;
		V.petBackup = makePet(name, speciesId);
		return true;
	}
	/* Swap which pet the care UI targets. Both keep living; sync() ticks both. */
	function switchActive() {
		if (!hasBackup()) return false;
		const tmp = V.tamagotchi;
		V.tamagotchi = V.petBackup;
		V.petBackup = tmp;
		return true;
	}

	function ageDays() {
		if (!exists()) return 0;
		return Math.max(0, (now() - V.tamagotchi.born) / secondsPerDay);
	}
	function stage() {
		if (!exists()) return "none";
		const t = V.tamagotchi;
		if (!t.alive) return "dead";
		const d = ageDays();
		if (d < 0.04) return "egg";
		if (d < 1) return "baby";
		if (d < 3) return "child";
		if (d < 7) return "teen";
		return t.careScore >= 55 ? "adult" : "adultGrumpy";
	}

	/* Advance a single pet's care state by the elapsed time. isActive pets are the only ones who can be killed by an ignored weekly attacker (the benched pet isn't the one under attack). */
	function syncPet(t, isActive) {
		if (!t || t.alive !== true) return;
		const currentTime = now();
		let hours = (currentTime - (Number.isFinite(t.lastTick) ? t.lastTick : currentTime)) / 3600;
		if (hours > 0) {
			hours = Math.min(hours, Tuning.maxElapsedHours);
			const sleepingNow = (t.sleepUntil || 0) > currentTime;
			t.hunger = clamp(t.hunger + Tuning.hungerPerHour * hours);
			/* A sleeping pet rests: its mood and energy hold steady while it naps. */
			if (!sleepingNow) {
				t.happiness = clamp(t.happiness - Tuning.happinessPerHour * hours);
				t.energy = clamp(t.energy - Tuning.energyPerHour * hours);
			}
			for (let h = 0; h < Math.floor(hours); h++) {
				if (Math.random() < Tuning.poopChancePerHour && t.poops < Tuning.maxPoops) t.poops++;
			}
			if (t.hunger >= Tuning.sickThresholdHunger || t.poops >= Tuning.sickThresholdPoops) {
				if (Math.random() < 0.25 * hours) t.sick = true;
			}
			/* The blood-moon boss arms once per moon (any time on the month's last day, or during the blood moon itself) and, like an ignored attacker, must be beaten within a week or it kills the pet.
			The 20-day guard dedupes the month-end/day-one window and keeps the cadence roughly monthly. */
			if (isActive) {
				const bloodMoonNow = isBloodMoon() || (typeof Time !== "undefined" && Time.monthDay === Time.lastDayOfMonth);
				if (bloodMoonNow && (!t.lastBossArm || dayNum() - t.lastBossArm >= 20)) {
					t.lastBossArm = dayNum();
					t.bossPending = true;
					t.bossDeadline = dayNum() + Tuning.attackIntervalDays;
				}
				if (t.bossPending && dayNum() >= t.bossDeadline) {
					t.alive = false;
					t.deathCause = "boss";
				}
			}
			/* An ignored attacker gets priority over ordinary neglect so the weekly timeout has a reachable outcome. */
			if (isActive && t.alive && dayNum() >= t.nextAttackDay + Tuning.attackIntervalDays) {
				t.alive = false;
				t.deathCause = "abandoned";
			}
			const critical = t.hunger >= 95 || (t.sick && t.happiness <= 10);
			if (t.alive && critical) {
				t.neglectHours += hours;
				if (t.neglectHours >= Tuning.neglectHoursToDeath) {
					t.alive = false;
					t.deathCause = t.sick ? "illness" : "hunger";
				}
			} else if (t.alive) {
				t.neglectHours = Math.max(0, t.neglectHours - hours * 0.5);
			}
		}
		/* The pet wakes once its 6h nap is over: rested, but ravenous and messy. */
		if (t.alive && (t.sleepUntil || 0) > 0 && currentTime >= t.sleepUntil) {
			t.sleepUntil = 0;
			t.energy = 100;
			t.hunger = clamp(t.hunger + 12);
			if (t.poops < Tuning.maxPoops) t.poops++;
			t.justWoke = true;
		}
		t.lastTick = currentTime;
	}
	function sync() {
		if (exists()) syncPet(V.tamagotchi, true);
		if (hasBackup()) syncPet(V.petBackup, false);
		if (!isAlive()) delete V.petBattle;
	}

	function isSleeping() {
		return isAlive() && (V.tamagotchi.sleepUntil || 0) > now();
	}
	function sleepHoursLeft() {
		if (!isSleeping()) return 0;
		return Math.ceil((V.tamagotchi.sleepUntil - now()) / 3600);
	}
	/* One-shot: true the first time it's read after the pet wakes, then cleared. */
	function ackWoke() {
		if (!exists()) return false;
		const w = V.tamagotchi.justWoke === true;
		V.tamagotchi.justWoke = false;
		return w;
	}

	function bumpCare(amount) {
		if (!exists()) return;
		V.tamagotchi.careScore = clamp(V.tamagotchi.careScore + amount);
	}

	/* --- Care actions --- */
	function feed() {
		sync();
		if (!isAlive()) return "dead";
		if (isSleeping()) return "asleep";
		const t = V.tamagotchi;
		if (t.hunger <= 5) { bumpCare(-1); return "overfed"; }
		t.hunger = clamp(t.hunger - 45);
		t.happiness = clamp(t.happiness + 5);
		bumpCare(3);
		if (Math.random() < 0.4 && t.poops < Tuning.maxPoops) t.poops++;
		t.lastTick = now();
		return "fed";
	}
	function play() {
		sync();
		if (!isAlive()) return "dead";
		if (isSleeping()) return "asleep";
		const t = V.tamagotchi;
		if (t.energy <= 10) return "tooTired";
		t.happiness = clamp(t.happiness + 30);
		t.energy = clamp(t.energy - 18);
		t.hunger = clamp(t.hunger + 6);
		bumpCare(3);
		t.lastTick = now();
		return "played";
	}
	function clean() {
		sync();
		if (!isAlive()) return "dead";
		if (isSleeping()) return "asleep";
		const t = V.tamagotchi;
		if (t.poops <= 0) return "alreadyClean";
		t.poops = 0;
		t.happiness = clamp(t.happiness + 5);
		bumpCare(2);
		t.lastTick = now();
		return "cleaned";
	}
	/* "Let it sleep" and the PET naps for ~6 in-game hours; it does NOT cost the player time.
	 * While asleep it can't be interacted with (see isSleeping); sync() wakes it ravenous and messy. */
	function rest() {
		sync();
		if (!isAlive()) return "dead";
		if (isSleeping()) return "alreadyAsleep";
		const t = V.tamagotchi;
		t.sleepUntil = now() + Tuning.sleepHours * 3600;
		t.lastTick = now();
		return "sleeping";
	}
	function cure() {
		sync();
		if (!isAlive()) return "dead";
		if (isSleeping()) return "asleep";
		const t = V.tamagotchi;
		if (!t.sick) return "notSick";
		t.sick = false;
		t.happiness = clamp(t.happiness + 10);
		t.neglectHours = 0;
		bumpCare(3);
		t.lastTick = now();
		return "cured";
	}

	/* --- Training & skill drafting --- */
	function trainingTypes() {
		return Object.keys(TRAININGS).map(id => ({ id, name: TRAININGS[id].name, desc: TRAININGS[id].desc }));
	}
	function unlearnedSkills() {
		const have = exists() && Array.isArray(V.tamagotchi.skills) ? V.tamagotchi.skills : [];
		return Object.keys(SKILLS).filter(id => !have.includes(id));
	}
	function attackDue() {
		return isAlive() && dayNum() >= V.tamagotchi.nextAttackDay;
	}
	function canTrain() {
		if (!isAlive()) return { ok: false, reason: "your pet can't train right now" };
		if (isSleeping()) return { ok: false, reason: "it's fast asleep" };
		if (attackDue()) return { ok: false, reason: "your pet is under attack!" };
		if (V.tamagotchi.pendingSkillChoice) return { ok: false, reason: "choose a new skill first" };
		if (V.tamagotchi.energy < 15) return { ok: false, reason: "it's too tired to train" };
		if (dayNum() <= V.tamagotchi.lastTrainDay) return { ok: false, reason: "it's already trained today" };
		return { ok: true };
	}
	function train(typeId) {
		sync();
		if (!TRAININGS[typeId]) return { ok: false, reason: "that training option is no longer available" };
		const cb = canTrain();
		if (!cb.ok) return { ok: false, reason: cb.reason };
		const t = V.tamagotchi;
		const tr = TRAININGS[typeId];
		t[tr.stat] += tr.gain;
		clampStats(t);
		t.happiness = clamp(t.happiness + 4);
		t.energy = clamp(t.energy - 12);
		t.hunger = clamp(t.hunger + 8);
		t.trainCount++;
		t.lastTrainDay = dayNum();
		bumpCare(2);
		let unlocked = false;
		if (t.trainCount % Tuning.skillEveryTrainings === 0 && unlearnedSkills().length > 0) {
			t.pendingSkillChoice = true;
			const pool = unlearnedSkills();
			for (let i = pool.length - 1; i > 0; i--) {
				const j = rand(i + 1);
				[pool[i], pool[j]] = [pool[j], pool[i]];
			}
			t.skillOffer = pool.slice(0, 3);
			unlocked = true;
		}
		t.lastTick = now();
		return { ok: true, type: typeId, stat: tr.stat, gain: tr.gain, unlocked };
	}
	function skillOfferList() {
		if (!exists() || !V.tamagotchi.pendingSkillChoice || !Array.isArray(V.tamagotchi.skillOffer)) return [];
		return V.tamagotchi.skillOffer.map(id => skillInfo(id)).filter(Boolean);
	}
	function chooseSkill(id) {
		const t = V.tamagotchi;
		if (!t || !t.pendingSkillChoice || !Array.isArray(t.skillOffer) || !t.skillOffer.includes(id) || !SKILLS[id]) return false;
		if (!Array.isArray(t.skills)) t.skills = [];
		if (!t.skills.includes(id)) t.skills.push(id);
		t.pendingSkillChoice = false;
		t.skillOffer = [];
		return SKILLS[id].name;
	}

	/* --- Evolution --- */
	/* Evolving requires sacrificing skills (they're spent in the ritual) and lifts every stat tenfold (then clamped). */
	function canEvolve(t) {
		t = t || (exists() ? V.tamagotchi : null);
		if (!t || t.alive !== true || t.evolved) return false;
		const base = SPECIES[t.species];
		if (!base || !base.evolution) return false;
		const have = Array.isArray(t.skills) ? t.skills.length : 0;
		return have >= Tuning.evolveSkillCost;
	}
	/* Evolve, sacrificing the exact skills the player chose. sacrificeIds must list evolveSkillCost distinct learned skills. */
	function evolve(sacrificeIds) {
		if (!canEvolve()) return { ok: false, reason: "cannot" };
		const t = V.tamagotchi;
		const chosen = Array.isArray(sacrificeIds) ? [...new Set(sacrificeIds.filter(id => t.skills.includes(id)))] : [];
		if (chosen.length !== Tuning.evolveSkillCost) return { ok: false, reason: "selection" };
		const fromName = SPECIES[t.species].name;
		const evoId = SPECIES[t.species].evolution;
		const evo = EVOLVED[evoId];
		const sacrificedNames = chosen.map(id => SKILLS[id].name);
		/* Spend exactly the chosen skills, keeping any the player didn't pick. */
		t.skills = t.skills.filter(id => !chosen.includes(id));
		t.species = evoId;
		t.type = evo.type;
		t.evolved = true;
		t.maxHp *= Tuning.evolveStatMult;
		t.maxMp *= Tuning.evolveStatMult;
		t.atk *= Tuning.evolveStatMult;
		t.def *= Tuning.evolveStatMult;
		t.spd *= Tuning.evolveStatMult;
		clampStats(t);
		t.happiness = clamp(t.happiness + 20);
		return { ok: true, from: fromName, to: evo.name, capped: atCap(t), sacrificed: sacrificedNames };
	}

	/* --- Battle --- */
	function conditionMod() {
		if (!exists()) return 1;
		const t = V.tamagotchi;
		let m = 1;
		if (t.sick) m *= 0.8;
		if (t.hunger >= 80) m *= 0.85;
		if (t.happiness <= 20) m *= 0.85;
		return m;
	}
	function dmgCalc(atkStat, defStat, power, atkType, defType, stab) {
		const tm = typeMult(atkType, defType);
		let d = Math.floor(power * (atkStat / Math.max(1, defStat)) * Tuning.damageScale) + 2;
		d = Math.floor(d * stab * tm * (0.85 + Math.random() * 0.15));
		return { dmg: Math.max(1, d), tm };
	}
	/* Tougher wild enemy: HP starts at 100 and DOUBLES per wave (100, 200, 400...), and it can use mid-to-high elemental skills from the very first encounter.
	 * Softer late-game curve: any stat that would exceed the player's is capped to the player's, so a mob is never stronger than the pet it's fighting (at worst a mirror match). */
	function makeEnemy(wave, pet) {
		const types = ["fire", "water", "grass", "electric"];
		const ty = types[rand(types.length)];
		const names = ENEMY_NAMES[ty];
		let maxHp = Tuning.enemyBaseHp * Math.pow(2, wave);
		let atk = Math.round(6 + wave * 2);
		let def = Math.round(5 + wave * 1.2);
		let spd = Math.round(5 + wave);
		if (pet) {
			maxHp = Math.min(maxHp, pet.maxHp);
			atk = Math.min(atk, pet.atk);
			def = Math.min(def, pet.def);
			spd = Math.min(spd, pet.spd);
		}
		return {
			name: names[rand(names.length)],
			type: ty,
			maxHp: maxHp,
			hp: maxHp,
			atk: atk,
			def: def,
			spd: spd,
			usesSkills: true,
			skillPower: 22,
			kind: "wild",
		};
	}
	/* Miniboss: double the player's HP, but only basic strikes (no skills). Beating it yields a dungeon key. */
	function makeMiniboss(pet) {
		const types = ["fire", "water", "grass", "electric"];
		const ty = types[rand(types.length)];
		const maxHp = Math.round(pet.maxHp * Tuning.minibossHpMult);
		return {
			name: "Golem Sentinel",
			type: ty,
			maxHp: maxHp,
			hp: maxHp,
			atk: Math.max(pet.atk, Math.round(10 + pet.wave * 2)),
			def: Math.max(pet.def, Math.round(8 + pet.wave * 1.2)),
			spd: Math.round(5 + pet.wave),
			usesSkills: false,
			icon: MINIBOSS_ICON,
			kind: "miniboss",
		};
	}
	/* Monthly blood-moon boss: a mirror of the player's own pet (same stats, type and damaging skills). */
	function makeBoss(pet) {
		const dmgSkills = (Array.isArray(pet.skills) ? pet.skills : []).filter(id => SKILLS[id] && !SKILLS[id].passive && SKILLS[id].effect !== "heal");
		const sd = speciesDef(pet.species);
		return {
			name: "Mirror " + (sd ? sd.name : "Beast"),
			type: pet.type,
			maxHp: pet.maxHp,
			hp: pet.maxHp,
			atk: pet.atk,
			def: pet.def,
			spd: pet.spd,
			usesSkills: dmgSkills.length > 0,
			skills: dmgSkills,
			icon: BOSS_ICON,
			kind: "boss",
		};
	}
	function enemyLabel(e) {
		return (e && e.kind === "wild" ? "wild " : "") + (e ? e.name : "enemy");
	}
	/* The boss is armed at the blood moon (see syncPet) and stays pending until beaten or its weekly deadline kills the pet. */
	function bossDue() {
		return isAlive() && V.tamagotchi.bossPending === true;
	}
	function bossDaysLeft() {
		return bossDue() ? Math.max(0, V.tamagotchi.bossDeadline - dayNum()) : 0;
	}
	function startBattle() {
		const currentBattle = battleState();
		if (currentBattle) return currentBattle;
		sync();
		if (!isAlive()) return null;
		const boss = bossDue();
		if (!boss && !attackDue()) return null;
		const pet = V.tamagotchi;
		pet.sleepUntil = 0; /* the commotion of an attack wakes the pet */
		let e, kind, intro;
		if (boss) {
			e = makeBoss(pet); kind = "boss";
			intro = "The blood moon rises and a monstrous " + e.name + " descends on " + pet.name + "!";
		} else if (pet.evolved && Math.random() < Tuning.minibossChance) {
			e = makeMiniboss(pet); kind = "miniboss";
			intro = "A hulking " + e.name + " blocks " + pet.name + "'s path!";
		} else {
			e = makeEnemy(pet.wave, pet); kind = "wild";
			intro = "A wild " + e.name + " attacks " + pet.name + "!";
		}
		V.petBattle = newBattleState(kind, e, pet, intro);
		return V.petBattle;
	}
	/* A dungeon mob: same scaling as weekly wild enemies. */
	function startDungeonBattle() {
		if (battleState()) return battleState();
		sync();
		if (!isAlive()) return null;
		const pet = V.tamagotchi;
		const e = makeEnemy(pet.wave, pet);
		e.kind = "dungeon";
		V.petBattle = newBattleState("dungeon", e, pet, "A dungeon " + e.name + " lunges at " + pet.name + "!");
		return V.petBattle;
	}
	function newBattleState(kind, e, pet, intro) {
		return {
			kind: kind,
			enemy: e,
			hp: pet.maxHp,
			maxHp: pet.maxHp,
			mp: pet.maxMp,
			maxMp: pet.maxMp,
			guarding: false,
			reviveUsed: false,
			usedBackup: false,
			log: [intro],
			over: false,
			result: null,
			turn: 0,
		};
	}
	function battleState() {
		return typeof V !== "undefined" && V.petBattle != null && typeof V.petBattle === "object" ? V.petBattle : null;
	}

	/* Pick the enemy's move: a known skill, a generic elemental blast, or a basic strike. */
	function enemyMove(e) {
		if (Array.isArray(e.skills) && e.skills.length && Math.random() < 0.45) {
			const sk = SKILLS[e.skills[rand(e.skills.length)]];
			if (sk) return { name: sk.name, type: sk.type, power: sk.power };
		}
		if (e.usesSkills && Math.random() < 0.4) {
			return { name: cap(e.type) + " Blast", type: e.type, power: e.skillPower || 22 };
		}
		return { name: "Strike", type: "normal", power: 12 };
	}
	function enemyTurn(b, log) {
		const pet = V.tamagotchi;
		const e = b.enemy;
		const mv = enemyMove(e);
		const stab = mv.type === e.type ? 1.5 : 1;
		const r = dmgCalc(e.atk, pet.def, mv.power, mv.type, pet.type, stab);
		let dmg = r.dmg;
		if (b.guarding) dmg = Math.ceil(dmg / 2);
		b.hp = Math.max(0, b.hp - dmg);
		log.push("The " + e.name + " uses " + mv.name + " for " + dmg + "." + effNote(r.tm) + (b.guarding ? " (guarded)" : ""));
		b.guarding = false;
	}

	function doRound(action) {
		const b = battleState();
		if (!b || b.over) return b;
		if (!isAlive()) { b.over = true; b.result = "lose"; return b; }
		const pet = V.tamagotchi;
		const e = b.enemy;
		const pAtk = Math.max(1, Math.round(pet.atk * conditionMod()));
		const log = [];

		if (action.kind === "attack") {
			const stab = pet.type === "normal" ? 1.5 : 1;
			const r = dmgCalc(pAtk, e.def, 9, "normal", e.type, stab);
			e.hp = Math.max(0, e.hp - r.dmg);
			log.push("You attack for " + r.dmg + " damage." + effNote(r.tm));
		} else if (action.kind === "guard") {
			b.guarding = true;
			const gain = Math.ceil(b.maxMp * Tuning.guardMpFrac);
			b.mp = Math.min(b.maxMp, b.mp + gain);
			log.push("You guard, bracing for the next blow and recovering " + gain + " MP.");
		} else if (action.kind === "rest") {
			const h = Math.ceil(b.maxHp * Tuning.restHpFrac);
			const m = Math.ceil(b.maxMp * Tuning.restMpFrac);
			b.hp = Math.min(b.maxHp, b.hp + h);
			b.mp = Math.min(b.maxMp, b.mp + m);
			log.push("You rest, recovering " + h + " HP and " + m + " MP.");
		} else if (action.kind === "skill") {
			const sk = SKILLS[action.id];
			if (!sk || sk.passive || !pet.skills.includes(action.id)) return b;
			if (b.mp < sk.mp) { b.log = ["Not enough MP to use " + sk.name + "."]; return b; }
			b.mp -= sk.mp;
			if (sk.effect === "heal") {
				const h = Math.ceil(b.maxHp * (sk.healFrac || Tuning.recoverHpFrac));
				b.hp = Math.min(b.maxHp, b.hp + h);
				log.push("You use " + sk.name + ", restoring " + h + " HP.");
			} else {
				const stab = sk.type === pet.type ? 1.5 : 1;
				const r = dmgCalc(pAtk, e.def, sk.power, sk.type, e.type, stab);
				e.hp = Math.max(0, e.hp - r.dmg);
				log.push("You use " + sk.name + " for " + r.dmg + " damage." + effNote(r.tm));
			}
		} else {
			return b;
		}

		if (e.hp <= 0) {
			b.over = true; b.result = "win";
			log.push("The " + enemyLabel(e) + " is defeated!");
			b.turn++; b.log = log;
			return b;
		}
		enemyTurn(b, log);
		if (b.hp <= 0) {
			/* Auto-revive: the passive Revive skill saves the pet once per battle. */
			if (!b.reviveUsed && Array.isArray(pet.skills) && pet.skills.includes("revive")) {
				b.reviveUsed = true;
				b.hp = Math.ceil(b.maxHp * 0.5);
				log.push(pet.name + " is struck down, but its Revive skill brings it back with " + b.hp + " HP!");
			} else if (!b.usedBackup && backupAlive()) {
				/* Tag-team: the benched pet charges in to keep the fight going. */
				b.usedBackup = true;
				const fallenName = pet.name;
				switchActive();
				V.petBackup.faintedInBattle = true; /* the pet that just fell is now benched */
				const fresh = V.tamagotchi;
				b.maxHp = fresh.maxHp; b.hp = fresh.maxHp;
				b.maxMp = fresh.maxMp; b.mp = fresh.maxMp;
				b.reviveUsed = false; /* the fresh pet has its own Revive */
				b.guarding = false;
				log.push(fallenName + " falls! " + fresh.name + " charges in to take its place!");
			} else {
				b.over = true; b.result = "lose"; log.push(pet.name + " has fallen...");
			}
		}
		b.turn++;
		b.log = log;
		return b;
	}
	function battleAttack() { return doRound({ kind: "attack" }); }
	function battleGuard() { return doRound({ kind: "guard" }); }
	function battleRest() { return doRound({ kind: "rest" }); }
	function battleSkill(id) { return doRound({ kind: "skill", id }); }

	/* Apply a stat boost across the board (max HP gets the larger share), then clamp to the ceilings. */
	function grantBoost(pet, amount, summary) {
		pet.atk += amount;
		pet.def += amount;
		pet.spd += amount;
		pet.maxMp += amount;
		pet.maxHp += amount * 4;
		clampStats(pet);
		summary.statBoost = amount;
		summary.hpBoost = amount * 4;
	}
	function endBattle() {
		const b = battleState();
		if (!b || !b.over || !exists()) return { result: "none" };
		const pet = V.tamagotchi;
		const kind = b.kind || "wild";
		const summary = { result: b.result, kind: kind, enemy: b.enemy.name };
		if (b.result === "win") {
			pet.happiness = clamp(pet.happiness + 15);
			/* The team pulled through: a teammate that fainted mid-battle survives, just exhausted. */
			if (hasBackup() && V.petBackup.faintedInBattle) {
				V.petBackup.alive = true;
				V.petBackup.faintedInBattle = false;
				V.petBackup.hunger = clamp(60);
				V.petBackup.energy = clamp(25);
				V.petBackup.happiness = clamp(45);
				V.petBackup.lastTick = now();
				summary.teammateRevived = true;
			}
			if (kind === "boss") {
				pet.lastBossMonth = monthKey();
				pet.bossPending = false;
				pet.bossDeadline = 0;
				grantBoost(pet, Tuning.winStatBoostStep * 5, summary);
				summary.boss = true;
			} else if (kind === "miniboss") {
				addKey(1);
				pet.nextAttackDay = dayNum() + Tuning.attackIntervalDays;
				grantBoost(pet, Tuning.winStatBoostStep * 2, summary);
				summary.keyGained = true;
				summary.keys = keysCount();
			} else if (kind === "dungeon") {
				grantBoost(pet, Tuning.winStatBoostStep, summary);
				summary.dungeon = true;
			} else {
				pet.wave++;
				pet.wins = (pet.wins || 0) + 1;
				pet.nextAttackDay = dayNum() + Tuning.attackIntervalDays;
				/* Wild wins escalate (1st win +10, 2nd +20, ...). */
				grantBoost(pet, Tuning.winStatBoostStep * pet.wins, summary);
				summary.wave = pet.wave;
			}
			summary.capped = atCap(pet);
		} else if (b.result === "lose") {
			/* Total wipe: the active (last) pet dies, and any teammate who fell earlier perishes too. */
			pet.alive = false;
			pet.deathCause = "battle";
			if (hasBackup() && V.petBackup.faintedInBattle) {
				V.petBackup.alive = false;
				V.petBackup.deathCause = "battle";
			}
		}
		pet.lastTick = now();
		delete V.petBattle;
		return summary;
	}

	/* --- Elixirs & Robin's booster packs --- */
	/* Elixirs live on V.petElixirs (global) so they survive hatching a new pet and can be banked for later. */
	function elixirCount() {
		return typeof V !== "undefined" && Number.isFinite(V.petElixirs) ? V.petElixirs : 0;
	}
	function addElixir(n = 1) {
		if (typeof V === "undefined") return 0;
		V.petElixirs = Math.max(0, elixirCount() + n);
		return V.petElixirs;
	}
	/* Spend one elixir to bring a dead pet back to life. Works for any cause of death (battle or neglect). */
	function reviveWithElixir() {
		if (!exists() || V.tamagotchi.alive || elixirCount() <= 0) return false;
		const t = V.tamagotchi;
		V.petElixirs = elixirCount() - 1;
		t.alive = true;
		t.deathCause = null;
		t.hunger = 30;
		t.happiness = 60;
		t.energy = 80;
		t.poops = 0;
		t.sick = false;
		t.neglectHours = 0;
		t.sleepUntil = 0;
		t.justWoke = false;
		t.lastTick = now();
		t.nextAttackDay = dayNum() + Tuning.attackIntervalDays;
		delete V.petBattle;
		return true;
	}
	/* Robin's booster pack: applies one random reward and returns a descriptor for the event text.
	 * With a living pet the full pool is available; otherwise only an elixir can be banked for a future pet. */
	function rollBooster() {
		sync();
		const alive = isAlive();
		const pool = alive ? ["hp", "mp", "elixir"] : ["elixir"];
		if (alive && unlearnedSkills().length > 0) pool.push("skill");
		const type = pool[rand(pool.length)];
		const t = alive ? V.tamagotchi : null;
		/* detail reads as a clause after the label, e.g. "Robin gave you <label> <detail>!" */
		if (type === "hp") {
			t.maxHp += Tuning.boosterHp;
			clampStats(t);
			return { type, label: "a Vitality Capsule", detail: "that raises its max HP by " + Tuning.boosterHp };
		}
		if (type === "mp") {
			t.maxMp += Tuning.boosterMp;
			clampStats(t);
			return { type, label: "a Mana Crystal", detail: "that raises its max MP by " + Tuning.boosterMp };
		}
		if (type === "skill") {
			const choices = unlearnedSkills();
			const id = choices[rand(choices.length)];
			if (!Array.isArray(t.skills)) t.skills = [];
			t.skills.push(id);
			return { type, label: "a Skill Disc", detail: "that teaches your pet " + SKILLS[id].name, skill: SKILLS[id].name };
		}
		addElixir(1);
		return { type: "elixir", label: "an Elixir", detail: "that revives your pet once when it dies" };
	}
	/* Robin's weekly booster odds fluctuate between 5% and 20%, fixed for the week (V.weekly clears each week). */
	function boosterChancePct() {
		const span = Tuning.boosterPctMax - Tuning.boosterPctMin + 1;
		if (typeof V === "undefined" || !V.weekly || typeof V.weekly !== "object") return Tuning.boosterPctMin + rand(span);
		if (!Number.isFinite(V.weekly.tamaBoosterPct)) V.weekly.tamaBoosterPct = Tuning.boosterPctMin + rand(span);
		return V.weekly.tamaBoosterPct;
	}

	/* --- Dungeon (unlocked by beating minibosses) --- */
	function keysCount() {
		return typeof V !== "undefined" && Number.isFinite(V.petKeys) ? V.petKeys : 0;
	}
	function addKey(n = 1) {
		if (typeof V === "undefined") return 0;
		V.petKeys = Math.max(0, keysCount() + n);
		return V.petKeys;
	}
	function dungeonState() {
		return typeof V !== "undefined" && V.petDungeon != null && typeof V.petDungeon === "object" ? V.petDungeon : null;
	}
	/* Spend a key to begin a 15-tile run. */
	function dungeonStart() {
		if (!isAlive() || keysCount() <= 0 || dungeonState()) return false;
		V.petKeys = keysCount() - 1;
		V.petDungeon = { tile: 0, tiles: Tuning.dungeonTiles, money: 0, items: 0, kills: 0 };
		return true;
	}
	/* Advance one tile and roll the loot table: 70% money, 10% mob, 19% item, 1% anti-pill.
	 * Money/item/anti-pill effects are applied in twee (where the money/foodstuff/pill macros live). */
	function dungeonStep() {
		const d = dungeonState();
		if (!d || d.tile >= d.tiles) return { type: "done" };
		d.tile++;
		const base = { tile: d.tile, tiles: d.tiles };
		const roll = rand(100);
		if (roll < 70) {
			const amount = 100 + rand(49901); /* £1..£500 in pennies (100..50000) */
			d.money += amount;
			return Object.assign(base, { type: "money", amount });
		}
		if (roll < 80) {
			return Object.assign(base, { type: "mob" });
		}
		if (roll < 99) {
			const fruits = typeof setup !== "undefined" && setup.foodstuff ? Object.keys(setup.foodstuff).filter(k => setup.foodstuff[k].category === "fruit") : [];
			if (fruits.length) {
				const key = fruits[rand(fruits.length)];
				d.items++;
				return Object.assign(base, { type: "item", key, name: setup.foodstuff[key].name || key });
			}
			const amount = 100 + rand(49901);
			d.money += amount;
			return Object.assign(base, { type: "money", amount });
		}
		return Object.assign(base, { type: "antipill" });
	}
	function dungeonMobCleared() {
		const d = dungeonState();
		if (d) d.kills++;
	}
	function dungeonEnd() {
		const d = dungeonState() || { tile: 0, tiles: Tuning.dungeonTiles, money: 0, items: 0, kills: 0 };
		if (typeof V !== "undefined") delete V.petDungeon;
		return d;
	}

	/* --- UI data --- */
	const stageLabel = {
		egg: "an unhatched egg", baby: "a wobbly baby", child: "a playful child",
		teen: "a gangly teen", adult: "a happy, well-raised adult",
		adultGrumpy: "a grumpy, neglected adult", dead: "gone", none: "nothing",
	};
	function word(scale, kind) {
		if (kind === "hunger") return scale < 20 ? "Full" : scale < 50 ? "Peckish" : scale < 80 ? "Hungry" : "Starving";
		if (kind === "happiness") return scale > 80 ? "Happy" : scale > 50 ? "Content" : scale > 20 ? "Glum" : "Miserable";
		return scale > 70 ? "Energetic" : scale > 40 ? "Neutral" : scale > 15 ? "Tired" : "Exhausted";
	}
	function listSpecies() {
		return Object.keys(SPECIES).map(id => ({ id, name: SPECIES[id].name, type: SPECIES[id].type, typeLabel: cap(SPECIES[id].type), blurb: SPECIES[id].blurb }));
	}
	/* Species offered when adopting a second pet: everything except the line you already own. */
	function adoptableSpecies() {
		const owned = exists() ? baseSpeciesOf(V.tamagotchi.species) : null;
		return listSpecies().filter(s => s.id !== owned);
	}
	function skillInfo(id) {
		const s = SKILLS[id];
		if (!s) return null;
		return { id, name: s.name, type: s.type, typeLabel: cap(s.type), power: s.power, mp: s.mp, heal: s.effect === "heal", passive: s.passive === true };
	}
	function learnedSkills() {
		if (!exists()) return [];
		const skills = Array.isArray(V.tamagotchi.skills) ? V.tamagotchi.skills : [];
		return skills.map(skillInfo).filter(Boolean);
	}
	/* Skills usable as a battle action and excludes passives like Revive, which trigger automatically. */
	function battleSkills() {
		return learnedSkills().filter(s => !s.passive);
	}
	/* Compact summary of a pet (used for the benched teammate). */
	function petBrief(t) {
		if (!t) return null;
		const s = speciesDef(t.species);
		return {
			name: t.name || (s ? s.name : "Pet"),
			alive: t.alive === true,
			speciesLabel: s ? s.name : "",
			icon: speciesIcon(t.species),
			hunger: t.hunger, energy: t.energy, sick: !!t.sick, poops: t.poops, evolved: !!t.evolved,
			needsCare: t.alive === true && (t.sick || t.hunger >= 80 || t.poops > 0 || t.energy <= 15),
			maxHp: t.maxHp, maxMp: t.maxMp, atk: t.atk, def: t.def, spd: t.spd,
		};
	}
	function status() {
		if (!exists()) return { exists: false, keys: keysCount(), elixirs: elixirCount(), hasBackup: hasBackup() };
		const t = V.tamagotchi;
		const s = speciesDef(t.species);
		const skills = Array.isArray(t.skills) ? t.skills.filter(id => SKILLS[id]) : [];
		const boss = bossDue();
		return {
			exists: true, alive: t.alive, name: t.name || (s ? s.name : "Pet"), stage: stage(), stageLabel: stageLabel[stage()] || "",
			ageDays: Math.floor(ageDays()), hunger: t.hunger, happiness: t.happiness, energy: t.energy,
			poops: t.poops, sick: t.sick, deathCause: t.deathCause,
			hungerWord: word(t.hunger, "hunger"), happinessWord: word(t.happiness, "happiness"), energyWord: word(t.energy, "energy"),
			species: t.species, speciesLabel: s ? s.name : "", type: t.type, typeLabel: cap(t.type),
			icon: speciesIcon(t.species), evolved: !!t.evolved,
			maxHp: t.maxHp, maxMp: t.maxMp, atk: t.atk, def: t.def, spd: t.spd,
			trainCount: t.trainCount, wave: t.wave, wins: t.wins || 0,
			skills: skills.map(id => SKILLS[id].name), skillCount: skills.length,
			pendingSkillChoice: t.pendingSkillChoice, pendingAttack: attackDue() || boss,
			bossDue: boss, bossDaysLeft: bossDaysLeft(), threat: boss ? "boss" : attackDue() ? "attack" : "none",
			nextAttackDays: Math.max(0, t.nextAttackDay - dayNum()),
			sleeping: isSleeping(), sleepHoursLeft: sleepHoursLeft(),
			elixirs: elixirCount(), autoRevive: skills.includes("revive"),
			canEvolve: canEvolve(t), evolveCost: Tuning.evolveSkillCost, atCap: atCap(t),
			keys: keysCount(), inDungeon: !!dungeonState(),
			hasBackup: hasBackup(), backupAlive: backupAlive(), backup: hasBackup() ? petBrief(V.petBackup) : null,
		};
	}
	/* Full restart: clear both pets. */
	function bury() {
		if (typeof V !== "undefined") {
			delete V.tamagotchi;
			delete V.petBackup;
			delete V.petBattle;
		}
	}
	/* Promote the benched pet to active (used when the active pet dies but a teammate survives). */
	function promoteBackup() {
		if (typeof V === "undefined" || !hasBackup()) return false;
		V.tamagotchi = V.petBackup;
		delete V.petBackup;
		delete V.petBattle;
		return true;
	}

	/* --- HTML renderers (styled by tamagotchi.css; printed in twee via <<= ...>>) --- */
	function careClass(scale, kind) {
		if (kind === "hunger") return scale >= 80 ? "bad" : scale >= 50 ? "warn" : "good";
		return scale <= 20 ? "bad" : scale <= 50 ? "warn" : "good";
	}
	/* Inline <img> for a mini-game icon path (e.g. "mini-game/embit.png"), honouring the image-display option. */
	function iconImg(icon, cls) {
		if (!icon || (typeof V !== "undefined" && V.options && V.options.images === false)) return "";
		return `<img class="${cls || "tama-icon"}" src="img/misc/icon/${icon}" alt="">`;
	}
	function statusHtml() {
		if (!exists()) return "";
		const s = status();
		const chip = (k, v) => `<div class="tama-stat"><span class="tama-k">${k}</span><span class="tama-v">${v}</span></div>`;
		const care = (k, wd, cls) => `<div class="tama-care-item ${cls}"><span class="tama-k">${k}</span><span class="tama-v">${wd}</span></div>`;
		let h = `<div class="tama-card">`;
		h += `<div class="tama-head">${iconImg(s.icon, "tama-portrait")}<span class="tama-name">${esc(s.name)}</span> <span class="tama-sub">${esc(s.stageLabel)} &middot; ${esc(s.speciesLabel)} (${esc(s.typeLabel)})${s.evolved ? " &middot; evolved" : ""}</span></div>`;
		h += `<div class="tama-row">${chip("HP", s.maxHp)}${chip("MP", s.maxMp)}${chip("ATK", s.atk)}${chip("DEF", s.def)}${chip("SPD", s.spd)}</div>`;
		h += `<div class="tama-row">${care("Hunger", s.hungerWord, careClass(s.hunger, "hunger"))}${care("Mood", s.happinessWord, careClass(s.happiness, "happiness"))}${care("Energy", s.energyWord, careClass(s.energy, "energy"))}</div>`;
		h += `<div class="tama-meta">Trainings: ${s.trainCount} &middot; Wins: ${s.wins} &middot; Age: ${s.ageDays}d${s.elixirs ? " &middot; Elixirs: " + s.elixirs : ""}${s.keys ? " &middot; Keys: " + s.keys : ""} &middot; Skills: ${s.skillCount ? esc(s.skills.join(", ")) : "none yet"}</div>`;
		if (s.atCap) h += `<div class="tama-meta gold">Fully grown &mdash; this pet has reached its limits.</div>`;
		h += `</div>`;
		return h;
	}
	function bar(cur, max, cls) {
		const pct = Math.max(0, Math.min(100, Math.round((cur / Math.max(1, max)) * 100)));
		return `<div class="tama-bar"><div class="tama-bar-fill ${cls}" style="width:${pct}%"></div><span class="tama-bar-label">${cur}/${max}</span></div>`;
	}
	function battleHtml() {
		const b = battleState();
		if (!b) return "";
		const pet = V.tamagotchi;
		const petIcon = iconImg(speciesIcon(pet.species), "tama-portrait");
		const eIcon = iconImg(b.enemy.icon ? "mini-game/" + b.enemy.icon + ".png" : "", "tama-portrait");
		const eLabel = b.kind === "boss" ? "Boss " : b.kind === "miniboss" ? "Miniboss " : b.kind === "dungeon" ? "Dungeon " : "Wild ";
		let h = `<div class="tama-battle">`;
		h += `<div class="tama-fighter">${petIcon}<div class="tama-fname">${esc(pet.name)}</div><div class="tama-barline"><span class="tama-blabel">HP</span>${bar(b.hp, b.maxHp, b.hp <= b.maxHp / 4 ? "hp-low" : "hp")}</div><div class="tama-barline"><span class="tama-blabel">MP</span>${bar(b.mp, b.maxMp, "mp")}</div></div>`;
		h += `<div class="tama-fighter">${eIcon}<div class="tama-fname">${eLabel}${esc(b.enemy.name)} <span class="tama-sub">(${esc(b.enemy.type)})</span></div><div class="tama-barline"><span class="tama-blabel">HP</span>${bar(b.enemy.hp, b.enemy.maxHp, b.enemy.hp <= b.enemy.maxHp / 4 ? "hp-low" : "hp")}</div></div>`;
		h += `</div>`;
		return h;
	}

	return {
		exists, isAlive, isSleeping, sleepHoursLeft, ackWoke, hatch, sync, feed, play, clean, rest, cure, status, stage, ageDays, bury, Tuning,
		listSpecies, adoptableSpecies, trainingTypes, canTrain, train, skillOfferList, chooseSkill, learnedSkills, battleSkills,
		canEvolve, evolve,
		attackDue, bossDue, bossDaysLeft, startBattle, startWeeklyBattle: startBattle, startDungeonBattle, battleState, battleAttack, battleGuard, battleRest, battleSkill, endBattle,
		elixirCount, addElixir, reviveWithElixir, rollBooster, boosterChancePct,
		keysCount, dungeonState, dungeonStart, dungeonStep, dungeonMobCleared, dungeonEnd,
		hasBackup, backupAlive, adopt, switchActive, promoteBackup,
		statusHtml, battleHtml,
	};
})();
window.Tamagotchi = Tamagotchi;
