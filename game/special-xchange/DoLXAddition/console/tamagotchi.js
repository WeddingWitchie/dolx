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
		hungerPerHour: 2,
		happinessPerHour: 1.5,
		energyPerHour: 0.75,
		poopChancePerHour: 0.08,
		maxPoops: 4,
		sickThresholdHunger: 90,
		sickThresholdPoops: 3,
		neglectHoursToDeath: 72,
		maxElapsedHours: 240,
		attackIntervalDays: 7,
		skillEveryTrainings: 3,
		sleepHours: 6,
		damageScale: 0.5,
		/* Damage floors: a hit always lands for at least this fraction of the TARGET side's max HP (scaled by type effectiveness), so grown pets can't stat-wall fights down to chip damage.
		 * Enemy floors sit near/above the 12% battle Rest heal so sustain is a choice, not an auto-win. */
		attackDamageFloor: 0.045,
		skillDamageFloor: 0.09,
		wildDamageFloor: 0.07,
		dungeonDamageFloor: 0.085,
		minibossDamageFloor: 0.1,
		bossDamageFloor: 0.125,
		guardMpFrac: 0.2,
		restHpFrac: 0.12,
		restMpFrac: 0.4,
		recoverHpFrac: 0.35,
		winStatBoostStep: 10,
		boosterHp: 100,
		boosterMp: 50,
		/* Stat ceilings. A pet that reaches all of these can grow no further (and the player may adopt another pet). */
		capHp: 5000,
		capMp: 2500,
		capStat: 500,
		/* Combat scaling for the tougher post-launch enemies. */
		enemyBaseHp: 120,
		enemyHpFloorMult: 0.3,
		enemyHpCapMult: 1.25,
		enemyAtkCapMult: 1.15,
		enemyDefCapMult: 0.9,
		enemySpdCapMult: 1.1,
		minibossHpMult: 2.25,
		minibossAtkMult: 1.2,
		minibossDefMult: 1.05,
		bossHpMult: 1.5,
		bossAtkMult: 1.3,
		bossDefMult: 1.1,
		evolveSkillCost: 10,
		evolveStatMult: 10,
		minibossChance: 0.35,
		boosterPctMin: 5,
		boosterPctMax: 20,
		dungeonTiles: 15,
		/* Dungeon money-tile roll, in pennies: £1..£10, averaging about a fiver. */
		dungeonMoneyMin: 100,
		dungeonMoneySpread: 901,
		/* Robin will pet-sit through a bad end (captivity) at this much love, sparing the pet what would otherwise be a fatal absence. */
		robinSitLove: 80,
	});

	/* Starters: base stats and type. Pets start with no skills; they draft them through training. */
	const SPECIES = {
		embit: {
			name: "Embit",
			type: "fire",
			blurb: "A hot-headed little lizard.",
			evolution: "blazilisk",
			base: { hp: 28, atk: 8, def: 5, spd: 6, mp: 8 },
		},
		pudduck: {
			name: "Pudduck",
			type: "water",
			blurb: "A calm, dependable duckling.",
			evolution: "pondswan",
			base: { hp: 34, atk: 6, def: 7, spd: 4, mp: 8 },
		},
		sprout: {
			name: "Sprout",
			type: "grass",
			blurb: "A sturdy little seedling.",
			evolution: "oakguard",
			base: { hp: 32, atk: 6, def: 8, spd: 4, mp: 8 },
		},
		voltpup: {
			name: "Voltpup",
			type: "electric",
			blurb: "A jittery, lightning-fast pup.",
			evolution: "thundrover",
			base: { hp: 26, atk: 8, def: 5, spd: 8, mp: 8 },
		},
	};

	/* Evolved forms. Reached by sacrificing skills (see evolve()); they inherit the base type and the pet's name. */
	const EVOLVED = {
		blazilisk: { name: "Blazilisk", type: "fire", blurb: "A towering ember serpent." },
		pondswan: { name: "Pondswan", type: "water", blurb: "A regal river swan." },
		oakguard: { name: "Oakguard", type: "grass", blurb: "A bark-plated sentinel." },
		thundrover: { name: "Thundrover", type: "electric", blurb: "A storm-charged hound." },
	};
	/* Combined lookup so species helpers resolve both base and evolved ids. */
	const speciesDef = id => SPECIES[id] || EVOLVED[id] || null;
	/* Resolve any species id (base or evolved) back to its base starter id, so two pets of the same line can't coexist. */
	const baseSpeciesOf = id => (SPECIES[id] ? id : Object.keys(SPECIES).find(b => SPECIES[b].evolution === id) || id);

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
	const esc = s =>
		String(s == null ? "" : s)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");
	const now = () => (typeof Time !== "undefined" && Time.date ? Time.date.timeStamp : 0);
	const secondsPerDay = (typeof TimeConstants !== "undefined" && TimeConstants.secondsPerDay) || 86400;
	const dayNum = () => Math.floor(now() / secondsPerDay);
	const rand = n => Math.floor(Math.random() * n);
	const typeMult = (atk, def) => (TYPE_CHART[atk] && TYPE_CHART[atk][def]) || 1;
	const effNote = tm => (tm > 1 ? " Super effective!" : tm < 1 ? " Not very effective..." : "");
	const isBloodMoon = () => typeof Time !== "undefined" && typeof Time.isBloodMoon === "function" && Time.isBloodMoon();
	/* The window in which a blood-moon boss can arm: the moon itself, or the last day of the month. */
	const bloodMoonWindow = () => isBloodMoon() || (typeof Time !== "undefined" && Time.monthDay === Time.lastDayOfMonth);

	/* --- Bad-end (captivity) awareness, so a forced absence isn't treated as neglect. --- */
	const badEndInfo = () => {
		const arr = typeof V !== "undefined" ? V.badEndStats : null;
		return Array.isArray(arr) && arr.length ? arr[arr.length - 1] : null;
	};
	/* The player is currently locked away in a bad end (the latest record has no recorded end). */
	const badEndActive = () => {
		const b = badEndInfo();
		return !!b && !b.trackedEnd;
	};
	const robinLove = () => {
		try {
			return typeof C !== "undefined" && C.npc && C.npc.Robin ? C.npc.Robin.love || 0 : 0;
		} catch (e) {
			return 0;
		}
	};
	/* Robin cares enough to look after the pet through a bad end. */
	const robinWouldSit = () => robinLove() >= Tuning.robinSitLove;

	/* --- Island-arc awareness.
	The pirate ship, the island itself and the water-dragon crossing are week-plus absences with no console access, but none of them register in V.badEndStats, so the bad-end check above never covers them.
	A passage hook (bottom of this file) stamps V.petIslandAbsence = { start, last } while the player is away, letting the catch-up sync after coming home prove the absence was covered even though the player is already back. --- */
	const AWAY_LOCATIONS = ["island", "pirate_ship"];
	const islandArcAway = () => {
		if (typeof V === "undefined") return false;
		if (AWAY_LOCATIONS.includes(V.location)) return true;
		/* Mid-crossing. Outbound travel begins from seabeach while already at maximum sea depth;
		 * the return trip uses the sea location directly. Requiring either keeps a stale counter harmless on land. */
		return (V.waterdragonJourneyDay || 0) !== 0 && (V.location === "sea" || V.sea >= 100);
	};
	/* The absence window still covers a pet that hasn't ticked past it (its lastTick predates the last away stamp). */
	const islandAbsenceCovers = t => {
		const w = typeof V !== "undefined" ? V.petIslandAbsence : null;
		return islandArcAway() || !!(w && (w.last || 0) > (Number.isFinite(t.lastTick) ? t.lastTick : 0));
	};
	/* Drop the window once every living pet has ticked past it (never while still away). */
	function pruneIslandAbsence() {
		if (typeof V === "undefined" || !V.petIslandAbsence || islandArcAway()) return;
		const cutoff = V.petIslandAbsence.last || 0;
		const pets = exists() ? [V.tamagotchi, ...backupList()] : backupList();
		if (!pets.some(p => p && p.alive === true && (Number.isFinite(p.lastTick) ? p.lastTick : 0) <= cutoff)) delete V.petIslandAbsence;
	}

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
	function capMissing(t) {
		if (!t) return [];
		return [
			{ label: "HP", current: t.maxHp || 0, cap: Tuning.capHp },
			{ label: "MP", current: t.maxMp || 0, cap: Tuning.capMp },
			{ label: "ATK", current: t.atk || 0, cap: Tuning.capStat },
			{ label: "DEF", current: t.def || 0, cap: Tuning.capStat },
			{ label: "SPD", current: t.spd || 0, cap: Tuning.capStat },
		].filter(stat => stat.current < stat.cap);
	}
	function capMissingText(t) {
		return capMissing(t)
			.map(stat => stat.label + " " + stat.current + "/" + stat.cap)
			.join(", ");
	}
	function atCap(t) {
		return !!t && capMissing(t).length === 0;
	}

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
		const petName =
			name == null
				? ""
				: Array.from(String(name))
						.filter(character => {
							const code = character.charCodeAt(0);
							return code > 31 && code !== 127;
						})
						.join("")
						.trim()
						.slice(0, 30);
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
			lastBossArm: bloodMoonWindow() ? dayNum() : null,
			bossPending: false,
			bossDeadline: 0,
			nextAttackDay: dayNum() + Tuning.attackIntervalDays,
		};
	}
	function hatch(name, speciesId) {
		V.tamagotchi = makePet(name, speciesId);
		delete V.petBackup;
		delete V.petBackups;
		delete V.petBattle;
		delete V.petDungeon;
		delete V.petRobinSitting;
		delete V.petIslandAbsence;
		return V.tamagotchi;
	}

	/* --- Multi-pet (tag-team). The active pet lives on V.tamagotchi; other collected pets bench on V.petBackups. --- */
	function backupList() {
		if (typeof V === "undefined") return [];
		if (!Array.isArray(V.petBackups)) V.petBackups = [];
		if (V.petBackup != null && typeof V.petBackup === "object") {
			if (!V.petBackups.includes(V.petBackup)) V.petBackups.push(V.petBackup);
			delete V.petBackup;
		}
		V.petBackups = V.petBackups.filter(pet => pet != null && typeof pet === "object");
		return V.petBackups;
	}
	function hasBackup() {
		return backupList().length > 0;
	}
	function backupAlive() {
		return backupList().some(pet => pet.alive === true);
	}
	function allPets() {
		const pets = exists() ? [V.tamagotchi] : [];
		return pets.concat(backupList());
	}
	function allLivingPetsAtCap() {
		const pets = allPets().filter(pet => pet.alive === true);
		return pets.length > 0 && pets.every(atCap);
	}
	function ownedSpeciesIds() {
		return [
			...new Set(
				allPets()
					.map(pet => baseSpeciesOf(pet.species))
					.filter(id => SPECIES[id])
			),
		];
	}
	function canAdopt() {
		return isAlive() && atCap(V.tamagotchi) && allLivingPetsAtCap() && adoptableSpecies().length > 0;
	}
	/* Adopt another pet once every living pet in the collection has maxed out.
	 * Each adopted pet must add a new elemental line to the collection. */
	function adopt(name, speciesId) {
		if (!canAdopt()) return false;
		if (!SPECIES[speciesId] || ownedSpeciesIds().includes(speciesId)) return false;
		backupList().push(makePet(name, speciesId));
		return true;
	}
	/* Threat timers only tick (and kill) for the active pet, so a benched pet's deadlines freeze in the past.
	 * Clamp them whenever a pet becomes active: an overdue weekly attacker is waiting (due today, not instantly lethal), and an armed boss gets its week back rather than executing the pet on the next sync. */
	function refreshThreatTimers(t) {
		if (!t || t.alive !== true) return;
		t.nextAttackDay = Math.max(t.nextAttackDay || 0, dayNum());
		if (t.bossPending) t.bossDeadline = Math.max(t.bossDeadline || 0, dayNum() + Tuning.attackIntervalDays);
	}
	/* Swap which pet the care UI targets. All pets keep living; sync() ticks the bench as well. */
	function switchActive(index) {
		const backups = backupList();
		if (!backups.length) return false;
		let i = Number.isFinite(index) ? Math.trunc(index) : backups.findIndex(pet => pet.alive === true);
		if (i < 0) i = 0;
		if (!backups[i]) return false;
		const tmp = V.tamagotchi;
		V.tamagotchi = backups[i];
		backups[i] = tmp;
		refreshThreatTimers(V.tamagotchi);
		return true;
	}
	function bringInBackup() {
		const backups = backupList();
		const i = backups.findIndex(pet => pet.alive === true);
		if (i < 0) return null;
		const fallen = V.tamagotchi;
		V.tamagotchi = backups[i];
		backups[i] = fallen;
		backups[i].faintedInBattle = true;
		refreshThreatTimers(V.tamagotchi);
		return V.tamagotchi;
	}
	function buryDeadBackups() {
		if (typeof V === "undefined") return false;
		V.petBackups = backupList().filter(pet => pet.alive === true);
		return true;
	}
	/* Robin's pet-sitting: a pet looked after through a bad end is paused in good health, with its threat timers reset. */
	function robinCarePet(t) {
		if (!t) return;
		t.hunger = 20;
		t.happiness = 80;
		t.energy = 90;
		t.poops = 0;
		t.sick = false;
		t.neglectHours = 0;
		t.sleepUntil = 0;
		t.justWoke = false;
		t.bossPending = false;
		t.bossDeadline = 0;
		t.lastBossArm = dayNum();
		t.nextAttackDay = dayNum() + Tuning.attackIntervalDays;
		t.lastTick = now();
	}
	/* True once the player is back from a bad end Robin sat through, so the homecoming event can fire. */
	function robinRescuePending() {
		if (typeof V === "undefined" || V.petRobinSitting !== true || !exists()) return false;
		sync();
		return isAlive() && V.petRobinSitting === true && !badEndActive() && !islandArcAway();
	}
	/* Acknowledge the homecoming: clear the flag and, if the pet had evolved, grant a dungeon key. */
	function claimRobinRescue() {
		const out = { keyGained: false, evolved: false, keys: keysCount() };
		if (typeof V === "undefined" || V.petRobinSitting !== true) return out;
		V.petRobinSitting = false;
		if (isAlive() && V.tamagotchi.evolved) {
			addKey(1);
			out.keyGained = true;
			out.evolved = true;
			out.keys = keysCount();
		}
		return out;
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
		/* A bad end is forced captivity, not neglect. If Robin loves the player enough, she pet-sits: the pet is paused in good health for the whole absence (decided here so a lazy sync after escaping can't kill it first).
		 * The island arc (pirate abduction, the island, the water-dragon crossing) is the same kind of absence but never registers as a bad end, so it gets its own coverage window.
		 * Without Robin's care a long absence still kills the pet, like ordinary neglect. */
		const last = badEndInfo();
		const badEndCovered = badEndActive() || (last && last.trackedEnd && last.trackedEnd > (Number.isFinite(t.lastTick) ? t.lastTick : 0));
		if ((badEndCovered || islandAbsenceCovers(t)) && robinWouldSit()) {
			robinCarePet(t);
			if (typeof V !== "undefined") V.petRobinSitting = true;
			return;
		}
		const currentTime = now();
		let hours = (currentTime - (Number.isFinite(t.lastTick) ? t.lastTick : currentTime)) / 3600;
		if (hours > 0) {
			hours = Math.min(hours, Tuning.maxElapsedHours);
			/* A fully grown pet fends for itself: no hunger, mess, sickness or neglect */
			const selfSufficient = atCap(t);
			const sleepingNow = (t.sleepUntil || 0) > currentTime;
			if (selfSufficient) {
				t.hunger = Math.min(t.hunger, 30);
				t.happiness = Math.max(t.happiness, 70);
				t.energy = Math.max(t.energy, 80);
				t.poops = 0;
				t.sick = false;
				t.neglectHours = 0;
			} else {
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
			}
			/* The blood-moon boss arms once per moon (any time on the month's last day, or during the blood moon itself) and, like an ignored attacker, must be beaten within a week or it kills the pet.
			The 20-day guard dedupes the month-end/day-one window and keeps the cadence roughly monthly. */
			if (isActive) {
				const bloodMoonNow = bloodMoonWindow();
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
		/* The pet wakes once its 6h nap is over: rested, but ravenous and messy (unless it's fully grown and fends for itself). */
		if (t.alive && (t.sleepUntil || 0) > 0 && currentTime >= t.sleepUntil) {
			t.sleepUntil = 0;
			t.energy = 100;
			if (!atCap(t)) {
				t.hunger = clamp(t.hunger + 12);
				if (t.poops < Tuning.maxPoops) t.poops++;
			}
			t.justWoke = true;
		}
		t.lastTick = currentTime;
	}
	function sync() {
		if (exists()) syncPet(V.tamagotchi, true);
		for (const pet of backupList()) syncPet(pet, false);
		pruneIslandAbsence();
		if (!isAlive()) {
			delete V.petBattle;
			delete V.petDungeon;
		}
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
		if (t.hunger <= 5) {
			bumpCare(-1);
			return "overfed";
		}
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
	/* Wild enemies scale toward the pet instead of staying tiny beside a capped monster.
	 * Defence stays under the pet's ceiling so fights have bite without turning into pure HP walls. */
	function makeEnemy(wave, pet) {
		const types = ["fire", "water", "grass", "electric"];
		const ty = types[rand(types.length)];
		const names = ENEMY_NAMES[ty];
		let maxHp = Tuning.enemyBaseHp * Math.pow(2, wave);
		let atk = Math.round(6 + wave * 2);
		let def = Math.round(5 + wave * 1.2);
		let spd = Math.round(5 + wave);
		if (pet) {
			const wavePressure = Math.min(1, 0.45 + wave * 0.06);
			maxHp = Math.min(maxHp, Math.round(pet.maxHp * Tuning.enemyHpCapMult));
			maxHp = Math.max(maxHp, Math.round(pet.maxHp * Tuning.enemyHpFloorMult));
			atk = Math.max(atk, Math.round(pet.atk * Math.min(Tuning.enemyAtkCapMult, wavePressure + 0.15)));
			def = Math.max(def, Math.round(pet.def * Math.min(Tuning.enemyDefCapMult, wavePressure)));
			spd = Math.max(spd, Math.round(pet.spd * Math.min(Tuning.enemySpdCapMult, wavePressure + 0.05)));
		}
		return {
			name: names[rand(names.length)],
			type: ty,
			maxHp,
			hp: maxHp,
			atk,
			def,
			spd,
			usesSkills: true,
			skillPower: 24,
			skillChance: 0.5,
			kind: "wild",
		};
	}
	/* Miniboss: a heavier stat check that can throw elemental blows. Beating it yields a dungeon key. */
	function makeMiniboss(pet) {
		const types = ["fire", "water", "grass", "electric"];
		const ty = types[rand(types.length)];
		const maxHp = Math.round(pet.maxHp * Tuning.minibossHpMult);
		return {
			name: "Golem Sentinel",
			type: ty,
			maxHp,
			hp: maxHp,
			atk: Math.max(Math.round(pet.atk * Tuning.minibossAtkMult), Math.round(10 + pet.wave * 2)),
			def: Math.max(Math.round(pet.def * Tuning.minibossDefMult), Math.round(8 + pet.wave * 1.2)),
			spd: Math.max(pet.spd, Math.round(5 + pet.wave)),
			usesSkills: true,
			skillPower: 28,
			skillChance: 0.55,
			kind: "miniboss",
		};
	}
	/* Monthly blood-moon boss: a stronger mirror of the player's own pet; same type, damaging skills, heal skills (as limited charges, since enemies have no MP bar) and even the passive Revive.
	 * Fighting it should feel like fighting yourself. */
	function makeBoss(pet) {
		const owned = (Array.isArray(pet.skills) ? pet.skills : []).filter(id => SKILLS[id]);
		const dmgSkills = owned.filter(id => !SKILLS[id].passive && SKILLS[id].effect !== "heal");
		const healSkills = owned.filter(id => SKILLS[id].effect === "heal");
		const sd = speciesDef(pet.species);
		return {
			name: "Mirror " + (sd ? sd.name : "Beast"),
			type: pet.type,
			maxHp: Math.round(pet.maxHp * Tuning.bossHpMult),
			hp: Math.round(pet.maxHp * Tuning.bossHpMult),
			atk: Math.round(pet.atk * Tuning.bossAtkMult),
			def: Math.round(pet.def * Tuning.bossDefMult),
			spd: pet.spd,
			usesSkills: true,
			skills: dmgSkills,
			heals: healSkills,
			healsLeft: healSkills.length ? 2 : 0,
			canRevive: owned.includes("revive"),
			reviveUsed: false,
			skillPower: 32,
			skillChance: 0.65,
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
			e = makeBoss(pet);
			kind = "boss";
			intro = "The blood moon rises and a monstrous " + e.name + " descends on " + pet.name + "!";
		} else if (pet.evolved && Math.random() < Tuning.minibossChance) {
			e = makeMiniboss(pet);
			kind = "miniboss";
			intro = "A hulking " + e.name + " blocks " + pet.name + "'s path!";
		} else {
			e = makeEnemy(pet.wave, pet);
			kind = "wild";
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
			kind,
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
		const skillChance = e.skillChance == null ? 0.4 : e.skillChance;
		if (e.usesSkills && Math.random() < skillChance) {
			if (Array.isArray(e.skills) && e.skills.length) {
				const sk = SKILLS[e.skills[rand(e.skills.length)]];
				if (sk) return { name: sk.name, type: sk.type, power: sk.power };
			}
			return { name: cap(e.type) + " Blast", type: e.type, power: e.skillPower || 24 };
		}
		return { name: "Strike", type: "normal", power: 12 };
	}
	function enemyDamageFloor(kind, maxHp) {
		const floors = {
			wild: Tuning.wildDamageFloor,
			dungeon: Tuning.dungeonDamageFloor,
			miniboss: Tuning.minibossDamageFloor,
			boss: Tuning.bossDamageFloor,
		};
		return Math.ceil(maxHp * (floors[kind] || Tuning.wildDamageFloor));
	}
	function playerDamageFloor(kind, maxHp) {
		return Math.ceil(maxHp * (kind === "skill" ? Tuning.skillDamageFloor : Tuning.attackDamageFloor));
	}
	function enemyTurn(b, log) {
		const pet = V.tamagotchi;
		const e = b.enemy;
		/* A mirror boss uses its copied heal skills like a player would: when badly hurt, spending the turn. */
		if (e.healsLeft > 0 && Array.isArray(e.heals) && e.heals.length && e.hp <= e.maxHp * 0.35 && Math.random() < 0.5) {
			const sk = SKILLS[e.heals[rand(e.heals.length)]];
			if (sk) {
				e.healsLeft--;
				const h = Math.ceil(e.maxHp * (sk.healFrac || Tuning.recoverHpFrac));
				e.hp = Math.min(e.maxHp, e.hp + h);
				log.push("The " + e.name + " mirrors " + sk.name + ", restoring " + h + " HP!");
				/* b.guarding is left braced: no blow landed, so the guard holds for the next real attack. */
				return;
			}
		}
		const mv = enemyMove(e);
		const stab = mv.type === e.type ? 1.5 : 1;
		const r = dmgCalc(e.atk, pet.def, mv.power, mv.type, pet.type, stab);
		let dmg = Math.max(r.dmg, Math.max(1, Math.round(enemyDamageFloor(b.kind, b.maxHp) * r.tm)));
		if (b.guarding) dmg = Math.ceil(dmg / 2);
		b.hp = Math.max(0, b.hp - dmg);
		log.push("The " + e.name + " uses " + mv.name + " for " + dmg + "." + effNote(r.tm) + (b.guarding ? " (guarded)" : ""));
		b.guarding = false;
	}

	function doRound(action) {
		const b = battleState();
		if (!b || b.over) return b;
		if (!isAlive()) {
			b.over = true;
			b.result = "lose";
			return b;
		}
		const pet = V.tamagotchi;
		const e = b.enemy;
		const pAtk = Math.max(1, Math.round(pet.atk * conditionMod()));
		const log = [];

		if (action.kind === "attack") {
			const stab = pet.type === "normal" ? 1.5 : 1;
			const r = dmgCalc(pAtk, e.def, 9, "normal", e.type, stab);
			const dmg = Math.max(r.dmg, Math.max(1, Math.round(playerDamageFloor("attack", e.maxHp) * r.tm)));
			e.hp = Math.max(0, e.hp - dmg);
			log.push("You attack for " + dmg + " damage." + effNote(r.tm));
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
			if (b.mp < sk.mp) {
				b.log = ["Not enough MP to use " + sk.name + "."];
				return b;
			}
			b.mp -= sk.mp;
			if (sk.effect === "heal") {
				const h = Math.ceil(b.maxHp * (sk.healFrac || Tuning.recoverHpFrac));
				b.hp = Math.min(b.maxHp, b.hp + h);
				log.push("You use " + sk.name + ", restoring " + h + " HP.");
			} else {
				const stab = sk.type === pet.type ? 1.5 : 1;
				const r = dmgCalc(pAtk, e.def, sk.power, sk.type, e.type, stab);
				const dmg = Math.max(r.dmg, Math.max(1, Math.round(playerDamageFloor("skill", e.maxHp) * r.tm)));
				e.hp = Math.max(0, e.hp - dmg);
				log.push("You use " + sk.name + " for " + dmg + " damage." + effNote(r.tm));
			}
		} else {
			return b;
		}

		if (e.hp <= 0 && e.canRevive && !e.reviveUsed) {
			/* The mirror copied your Revive: it gets back up once, just like your pet would. */
			e.reviveUsed = true;
			e.hp = Math.ceil(e.maxHp * 0.5);
			log.push("The " + e.name + " collapses... but a mirrored Revive drags it back up with " + e.hp + " HP!");
		}
		if (e.hp <= 0) {
			b.over = true;
			b.result = "win";
			log.push("The " + enemyLabel(e) + " is defeated!");
			b.turn++;
			b.log = log;
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
				const fresh = bringInBackup();
				b.maxHp = fresh.maxHp;
				b.hp = fresh.maxHp;
				b.maxMp = fresh.maxMp;
				b.mp = fresh.maxMp;
				b.reviveUsed = false; /* the fresh pet has its own Revive */
				b.guarding = false;
				log.push(fallenName + " falls! " + fresh.name + " charges in to take its place!");
			} else {
				b.over = true;
				b.result = "lose";
				log.push(pet.name + " has fallen...");
			}
		}
		b.turn++;
		b.log = log;
		return b;
	}
	function battleAttack() {
		return doRound({ kind: "attack" });
	}
	function battleGuard() {
		return doRound({ kind: "guard" });
	}
	function battleRest() {
		return doRound({ kind: "rest" });
	}
	function battleSkill(id) {
		return doRound({ kind: "skill", id });
	}

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
		const summary = { result: b.result, kind, enemy: b.enemy.name };
		if (b.result === "win") {
			pet.happiness = clamp(pet.happiness + 15);
			/* The team pulled through: a teammate that fainted mid-battle survives, just exhausted. */
			const fainted = backupList().filter(benchPet => benchPet.faintedInBattle);
			if (fainted.length) {
				for (const benchPet of fainted) {
					benchPet.alive = true;
					benchPet.faintedInBattle = false;
					benchPet.hunger = clamp(60);
					benchPet.energy = clamp(25);
					benchPet.happiness = clamp(45);
					benchPet.lastTick = now();
					/* This was the pet the defeated enemy originally attacked. Resolve its threat too,
					 * or switching it back in immediately resurrects the same encounter. */
					if (kind === "boss") {
						benchPet.bossPending = false;
						benchPet.bossDeadline = 0;
					} else if (kind !== "dungeon") {
						benchPet.nextAttackDay = dayNum() + Tuning.attackIntervalDays;
					}
				}
				summary.teammateRevived = true;
			}
			if (kind === "boss") {
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
			for (const benchPet of backupList().filter(p => p.faintedInBattle)) {
				benchPet.alive = false;
				benchPet.deathCause = "battle";
				benchPet.faintedInBattle = false;
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
	function revivePetWithElixir(t) {
		if (!t || t.alive === true || elixirCount() <= 0) return false;
		V.petElixirs = elixirCount() - 1;
		t.alive = true;
		t.deathCause = null;
		t.faintedInBattle = false;
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
		t.bossPending = false;
		t.bossDeadline = 0;
		if (bloodMoonWindow()) t.lastBossArm = dayNum();
		return true;
	}
	function reviveWithElixir() {
		if (!exists() || !revivePetWithElixir(V.tamagotchi)) return false;
		delete V.petBattle;
		return true;
	}
	/* Elixirs work on the bench too: revive a dead benched pet by its bench index. */
	function reviveBackupWithElixir(index) {
		const backups = backupList();
		const i = Number.isFinite(index) ? Math.trunc(index) : -1;
		return revivePetWithElixir(backups[i]);
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
			const amount = Tuning.dungeonMoneyMin + rand(Tuning.dungeonMoneySpread);
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
			const amount = Tuning.dungeonMoneyMin + rand(Tuning.dungeonMoneySpread);
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
		egg: "an unhatched egg",
		baby: "a wobbly baby",
		child: "a playful child",
		teen: "a gangly teen",
		adult: "a happy, well-raised adult",
		adultGrumpy: "a grumpy, neglected adult",
		dead: "gone",
		none: "nothing",
	};
	function word(scale, kind) {
		if (kind === "hunger") return scale < 20 ? "Full" : scale < 50 ? "Peckish" : scale < 80 ? "Hungry" : "Starving";
		if (kind === "happiness") return scale > 80 ? "Happy" : scale > 50 ? "Content" : scale > 20 ? "Glum" : "Miserable";
		return scale > 70 ? "Energetic" : scale > 40 ? "Neutral" : scale > 15 ? "Tired" : "Exhausted";
	}
	function listSpecies() {
		return Object.keys(SPECIES).map(id => ({ id, name: SPECIES[id].name, type: SPECIES[id].type, typeLabel: cap(SPECIES[id].type), blurb: SPECIES[id].blurb }));
	}
	/* Species offered for adoption: every elemental line not already in the collection. */
	function adoptableSpecies() {
		const owned = ownedSpeciesIds();
		return listSpecies().filter(s => !owned.includes(s.id));
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
			type: t.type || (s ? s.type : ""),
			typeLabel: cap(t.type || (s ? s.type : "")),
			hunger: t.hunger,
			energy: t.energy,
			sick: !!t.sick,
			poops: t.poops,
			evolved: !!t.evolved,
			needsCare: t.alive === true && (t.sick || t.hunger >= 80 || t.poops > 0 || t.energy <= 15),
			atCap: atCap(t),
			capMissingText: capMissingText(t),
			maxHp: t.maxHp,
			maxMp: t.maxMp,
			atk: t.atk,
			def: t.def,
			spd: t.spd,
		};
	}
	function status() {
		const backups = backupList();
		const backupBriefs = backups.map((pet, index) => Object.assign({ index }, petBrief(pet)));
		const aliveBackups = backupBriefs.filter(pet => pet.alive);
		if (!exists())
			return {
				exists: false,
				keys: keysCount(),
				elixirs: elixirCount(),
				hasBackup: backups.length > 0,
				backupAlive: aliveBackups.length > 0,
				backups: backupBriefs,
				backup: aliveBackups[0] || backupBriefs[0] || null,
			};
		const t = V.tamagotchi;
		const s = speciesDef(t.species);
		const skills = Array.isArray(t.skills) ? t.skills.filter(id => SKILLS[id]) : [];
		const boss = bossDue();
		const adoptionOpen = canAdopt();
		const collection = ownedSpeciesIds();
		return {
			exists: true,
			alive: t.alive,
			name: t.name || (s ? s.name : "Pet"),
			stage: stage(),
			stageLabel: stageLabel[stage()] || "",
			ageDays: Math.floor(ageDays()),
			hunger: t.hunger,
			happiness: t.happiness,
			energy: t.energy,
			poops: t.poops,
			sick: t.sick,
			deathCause: t.deathCause,
			hungerWord: word(t.hunger, "hunger"),
			happinessWord: word(t.happiness, "happiness"),
			energyWord: word(t.energy, "energy"),
			species: t.species,
			speciesLabel: s ? s.name : "",
			type: t.type,
			typeLabel: cap(t.type),
			evolved: !!t.evolved,
			maxHp: t.maxHp,
			maxMp: t.maxMp,
			atk: t.atk,
			def: t.def,
			spd: t.spd,
			capHp: Tuning.capHp,
			capMp: Tuning.capMp,
			capStat: Tuning.capStat,
			capMissingText: capMissingText(t),
			trainCount: t.trainCount,
			wave: t.wave,
			wins: t.wins || 0,
			skills: skills.map(id => SKILLS[id].name),
			skillCount: skills.length,
			pendingSkillChoice: t.pendingSkillChoice,
			pendingAttack: attackDue() || boss,
			bossDue: boss,
			bossDaysLeft: bossDaysLeft(),
			threat: boss ? "boss" : attackDue() ? "attack" : "none",
			nextAttackDays: Math.max(0, t.nextAttackDay - dayNum()),
			sleeping: isSleeping(),
			sleepHoursLeft: sleepHoursLeft(),
			elixirs: elixirCount(),
			autoRevive: skills.includes("revive"),
			canEvolve: canEvolve(t),
			evolveCost: Tuning.evolveSkillCost,
			atCap: atCap(t),
			keys: keysCount(),
			inDungeon: !!dungeonState(),
			hasBackup: backups.length > 0,
			backupAlive: aliveBackups.length > 0,
			backup: aliveBackups[0] || backupBriefs[0] || null,
			backups: backupBriefs,
			backupCount: backups.length,
			backupAliveCount: aliveBackups.length,
			canAdopt: adoptionOpen,
			adoptableCount: adoptableSpecies().length,
			collectionCount: collection.length,
			collectionTotal: Object.keys(SPECIES).length,
			collectionComplete: collection.length >= Object.keys(SPECIES).length,
		};
	}
	/* Full restart: clear every collected pet. */
	function bury() {
		if (typeof V !== "undefined") {
			delete V.tamagotchi;
			delete V.petBackup;
			delete V.petBackups;
			delete V.petBattle;
			delete V.petDungeon;
			delete V.petRobinSitting;
			delete V.petIslandAbsence;
		}
	}
	/* Promote the benched pet to active (used when the active pet dies but a teammate survives). */
	function promoteBackup(index) {
		if (typeof V === "undefined") return false;
		const backups = backupList();
		const i = Number.isFinite(index) ? Math.trunc(index) : backups.findIndex(pet => pet.alive === true);
		if (i < 0 || !backups[i]) return false;
		V.tamagotchi = backups.splice(i, 1)[0];
		refreshThreatTimers(V.tamagotchi);
		delete V.petBattle;
		return true;
	}

	/* --- HTML renderers (styled by tamagotchi.css; printed in twee via <<= ...>>) --- */
	/* Red ("bad") strictly means the stat is in death range, mirroring syncPet's critical check:
	 * hunger >= 95, or misery <= 10 while sick. Everything else that needs care shows orange ("warn").
	 * Energy can never kill, so it never shows red. */
	function careClass(scale, kind, sick) {
		if (kind === "hunger") return scale >= 95 ? "bad" : scale >= 50 ? "warn" : "good";
		if (kind === "happiness") return sick && scale <= 10 ? "bad" : scale <= 50 ? "warn" : "good";
		return scale <= 50 ? "warn" : "good";
	}
	function statusHtml() {
		if (!exists()) return "";
		const s = status();
		const chip = (k, v) => `<div class="tama-stat"><span class="tama-k">${k}</span><span class="tama-v">${v}</span></div>`;
		const care = (k, wd, cls) => `<div class="tama-care-item ${cls}"><span class="tama-k">${k}</span><span class="tama-v">${wd}</span></div>`;
		let h = `<div class="tama-card">`;
		h += `<div class="tama-head"><span class="tama-name">${esc(s.name)}</span> <span class="tama-sub">${esc(s.stageLabel)} &middot; ${esc(
			s.speciesLabel
		)} (${esc(s.typeLabel)})${s.evolved ? " &middot; evolved" : ""}</span></div>`;
		h += `<div class="tama-row">${chip("HP", s.maxHp)}${chip("MP", s.maxMp)}${chip("ATK", s.atk)}${chip("DEF", s.def)}${chip("SPD", s.spd)}</div>`;
		h += `<div class="tama-row">${care("Hunger", s.hungerWord, careClass(s.hunger, "hunger", s.sick))}${care(
			"Mood",
			s.happinessWord,
			careClass(s.happiness, "happiness", s.sick)
		)}${care("Energy", s.energyWord, careClass(s.energy, "energy", s.sick))}</div>`;
		h += `<div class="tama-meta">Trainings: ${s.trainCount} &middot; Wins: ${s.wins} &middot; Age: ${s.ageDays}d${
			s.elixirs ? " &middot; Elixirs: " + s.elixirs : ""
		}${s.keys ? " &middot; Keys: " + s.keys : ""} &middot; Skills: ${s.skillCount ? esc(s.skills.join(", ")) : "none yet"}</div>`;
		if (s.atCap) h += `<div class="tama-meta gold">Fully grown &mdash; this pet has reached its limits and looks after itself now.</div>`;
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
		const eLabel = b.kind === "boss" ? "Boss " : b.kind === "miniboss" ? "Miniboss " : b.kind === "dungeon" ? "Dungeon " : "Wild ";
		let h = `<div class="tama-battle">`;
		h += `<div class="tama-fighter"><div class="tama-fname">${esc(pet.name)}</div><div class="tama-barline"><span class="tama-blabel">HP</span>${bar(
			b.hp,
			b.maxHp,
			b.hp <= b.maxHp / 4 ? "hp-low" : "hp"
		)}</div><div class="tama-barline"><span class="tama-blabel">MP</span>${bar(b.mp, b.maxMp, "mp")}</div></div>`;
		h += `<div class="tama-fighter"><div class="tama-fname">${eLabel}${esc(b.enemy.name)} <span class="tama-sub">(${esc(
			b.enemy.type
		)})</span></div><div class="tama-barline"><span class="tama-blabel">HP</span>${bar(
			b.enemy.hp,
			b.enemy.maxHp,
			b.enemy.hp <= b.enemy.maxHp / 4 ? "hp-low" : "hp"
		)}</div></div>`;
		h += `</div>`;
		return h;
	}

	/* Stamp the island-arc absence window on every passage while the player is away, so the pet's next sync
	 * (usually the one big catch-up after coming home) can tell the absence was covered. */
	if (typeof jQuery !== "undefined") {
		jQuery(document).on(":passagedisplay", () => {
			if (typeof V === "undefined") return;
			/* Do nothing for saves that have never used the virtual pet game. */
			if (!exists() && !(Array.isArray(V.petBackups) && V.petBackups.length) && !(V.petBackup && typeof V.petBackup === "object")) return;
			if (islandArcAway()) {
				if (V.petIslandAbsence && typeof V.petIslandAbsence === "object") V.petIslandAbsence.last = now();
				else V.petIslandAbsence = { start: now(), last: now() };
			}
		});
	}

	return {
		exists,
		isAlive,
		isSleeping,
		sleepHoursLeft,
		ackWoke,
		hatch,
		sync,
		feed,
		play,
		clean,
		rest,
		cure,
		status,
		stage,
		ageDays,
		bury,
		Tuning,
		listSpecies,
		adoptableSpecies,
		trainingTypes,
		canTrain,
		train,
		skillOfferList,
		chooseSkill,
		learnedSkills,
		battleSkills,
		canEvolve,
		evolve,
		attackDue,
		bossDue,
		bossDaysLeft,
		startBattle,
		startWeeklyBattle: startBattle,
		startDungeonBattle,
		battleState,
		battleAttack,
		battleGuard,
		battleRest,
		battleSkill,
		endBattle,
		elixirCount,
		addElixir,
		reviveWithElixir,
		reviveBackupWithElixir,
		rollBooster,
		boosterChancePct,
		keysCount,
		dungeonState,
		dungeonStart,
		dungeonStep,
		dungeonMobCleared,
		dungeonEnd,
		hasBackup,
		backupAlive,
		canAdopt,
		adopt,
		switchActive,
		promoteBackup,
		buryDeadBackups,
		robinRescuePending,
		claimRobinRescue,
		statusHtml,
		battleHtml,
	};
})();
window.Tamagotchi = Tamagotchi;
