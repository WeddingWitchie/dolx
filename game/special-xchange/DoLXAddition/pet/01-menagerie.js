/* Pet state is separate from $worn. `where`: "home", "carried", or "lost". */
const Menagerie = (() => {
	const Tuning = Object.freeze({
		hungerPerHour: 1.4,
		// Happiness decays only while the pet is hungry.
		happinessPerHour: 0.5,
		hungryThreshold: 60,
		starvingThreshold: 90,
		neglectHoursToFlee: 96,
		// Limit catch-up decay after a long gap between syncs.
		maxElapsedHours: 240,

		bondMax: 100,
		bondPerFeed: 2,
		bondPerPlay: 3,
		// Prevent repeated interactions from farming bond in one day.
		bondDailyCap: 6,
		// Lost bond stops decaying here; pets already below this stay below it.
		bondFloorWhenLost: 20,
		bondDecayPerDayLost: 1,

		supportChanceDivisor: 3,
		supportChanceMax: 30,
		supportMinBond: 20,
		supportCooldownTurns: 3,
		// Kept separate from <<violence>>, which scales player attacks by physique.
		supportDamageBase: 2,
		supportDamagePerBond: 8,
		boltChance: 8,

		snakePrice: 15000,
		snakePriceFamous: 30000,
		terrariumPrice: 8000,
		feedPrice: 2000,
		feedServings: 10,
		premiumFeedPrice: 15000,
		slimePrice: 60000,
		ubmFee: 50000,
		ubmFeeBluffed: 10000,
		bluffSkulduggery: 350,
		recoveryFee: 5000,

		// Relative weights; one outcome is rolled per swim.
		swimPanicWeightFine: 30,
		swimPanicWeightThrash: 35,
		swimPanicWeightSwept: 25,
		swimPanicWeightDrown: 10,
		swimBondProtection: 0.9,
		swimThrashPain: 8,

		playCooldownHours: 4,
		// A pet that merely tolerates the player will not be intimate with them.
		intimacyMinBond: 40,
		// How many turns before the pet has had its fill and stops on its own.
		intimacyTurns: 12,

		// Pocket food is intentionally less effective than feeding at home.
		pocketFeedRelief: 45,
		sickHours: 12,
		sickHappiness: 25,
	});

	/* Adding a species only needs a catalogue entry and purchase scene.
	 * `eats`/`sickens` use food tags; unmatched food is refused. */
	const SPECIES = Object.freeze({
		snake: {
			name: "snake",
			colours: ["blue", "red", "brown", "green", "pink", "purple", "teal", "yellow"],
			housing: "terrarium",
			carriedOn: "around your neck",
			diet: "feed",
			eats: { categories: ["meat", "seafood"], tags: ["carnivore", "seafood"] },
			sickens: { categories: [], tags: ["alcohol", "tainted", "spicy", "sweet"] },
			source: "shop",
			icon: colour => `pet/${colour}snaketank.png`,
			emptyIcon: "pet/emptysnaketank.png",
			sprite: colour => `${colour}snake`,
			spriteZ: 82,
			support: "strike",
		},
		slime: {
			name: "slime",
			colours: ["blue", "red", "green", "orange", "pink", "purple", "teal", "yellow", "gray"],
			housing: "jar",
			carriedOn: "on your head",
			diet: "fluids",
			eats: { categories: ["fruit", "produce", "vegetable", "mushroom"], tags: ["drink", "sweet", "vegan", "vegetarian"] },
			sickens: { categories: [], tags: ["alcohol", "tainted", "spicy"] },
			source: "ubm",
			icon: colour => `pet/${colour}slimejar.png`,
			emptyIcon: "pet/emptyslimejar.png",
			sprite: colour => `${colour}slime`,
			spriteZ: 85,
			support: "smother",
		},
	});

	const speciesDef = id => SPECIES[id] || null;
	const speciesIds = () => Object.keys(SPECIES);

	const now = () => (typeof Time !== "undefined" && Time.date ? Time.date.timeStamp : 0);
	const secondsPerDay = 86400;
	const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
	const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

	/* --- State --- */

	// Created lazily to avoid adding menagerie data to untouched saves.
	function state() {
		if (typeof V === "undefined") return null;
		if (!V.menagerie || typeof V.menagerie !== "object") {
			V.menagerie = { pets: {}, carried: null, terrarium: false, feed: 0, premiumFeed: 0, note: false };
		}
		const m = V.menagerie;
		if (!m.pets || typeof m.pets !== "object") m.pets = {};
		// Invalid inventory counts would otherwise poison care calculations with NaN.
		for (const k of ["feed", "premiumFeed"]) if (!Number.isFinite(m[k])) m[k] = 0;
		return m;
	}

	function exists() {
		return typeof V !== "undefined" && !!V.menagerie;
	}

	function allPets() {
		if (!exists()) return [];
		const m = state();
		return Object.values(m.pets).filter(p => p && typeof p === "object");
	}

	function getPet(species) {
		if (!exists()) return null;
		const m = state();
		return m.pets[species] && typeof m.pets[species] === "object" ? m.pets[species] : null;
	}

	function owned(species) {
		const p = getPet(species);
		return !!p && p.where !== "lost";
	}

	function carried() {
		if (!exists()) return null;
		const m = state();
		if (!m.carried) return null;
		const p = getPet(m.carried);
		// Repair stale save data if the pointer and pet state disagree.
		if (!p || p.where !== "carried") {
			m.carried = null;
			return null;
		}
		return p;
	}

	function petsAtHome() {
		return allPets().filter(p => p.where === "home");
	}

	function lostPets() {
		return allPets().filter(p => p.where === "lost");
	}

	// Frozen or replayed scenes must not advance or mutate pet state.
	function historical() {
		if (typeof V === "undefined") return false;
		return !!(V.statFreeze || V.frozenValues || V.replayScene || V.hc);
	}

	// Captivity does not count as pet-care time.
	const badEndInfo = () => {
		const arr = typeof V !== "undefined" ? V.badEndStats : null;
		return Array.isArray(arr) && arr.length ? arr[arr.length - 1] : null;
	};
	const badEndActive = () => {
		const b = badEndInfo();
		return !!b && !b.trackedEnd;
	};
	// True when the elapsed interval since this pet's last tick was spent in captivity.
	const badEndCovers = p => {
		const b = badEndInfo();
		const last = Number.isFinite(p.lastTick) ? p.lastTick : 0;
		return badEndActive() || (!!b && !!b.trackedEnd && b.trackedEnd > last);
	};

	/* --- Care --- */

	function makePet(species, colour) {
		const def = speciesDef(species);
		return {
			species,
			colour: def && def.colours.includes(colour) ? colour : def ? def.colours[0] : colour,
			where: "home",
			hunger: 20,
			happiness: 80,
			bond: 0,
			bondToday: 0,
			bondDay: 0,
			neglectHours: 0,
			lastTick: now(),
			lostCause: null,
			lostAt: 0,
			playedAt: 0,
			sickUntil: 0,
		};
	}

	// Lazy time-based update; no background timer is required.
	function syncPet(p) {
		if (!p) return;
		const currentTime = now();
		if (!Number.isFinite(p.lastTick)) p.lastTick = currentTime;

		// Move the timestamp too, or the next real sync would charge the replayed time.
		if (historical()) {
			p.lastTick = currentTime;
			if (p.where === "lost") p.lostAt = currentTime;
			return;
		}

		if (p.where === "lost") {
			syncLost(p);
			return;
		}

		if (badEndCovers(p)) {
			p.lastTick = currentTime;
			return;
		}

		let hours = (currentTime - p.lastTick) / 3600;
		if (hours <= 0) return;
		hours = Math.min(hours, Tuning.maxElapsedHours);
		p.lastTick = currentTime;

		const hunger = Number.isFinite(p.hunger) ? p.hunger : 0;
		const happiness = Number.isFinite(p.happiness) ? p.happiness : 0;
		const fedHours = clamp((Tuning.hungryThreshold - hunger) / Tuning.hungerPerHour, 0, hours);
		const hungryHours = hours - fedHours;
		p.hunger = clamp(hunger + hours * Tuning.hungerPerHour, 0, 100);
		p.happiness = clamp(happiness - hungryHours * Tuning.happinessPerHour, 0, 100);

		// Leaving is driven by sustained misery, not hunger alone.
		const miserableHours = happiness <= 0 ? hours : Math.max(0, hungryHours - happiness / Tuning.happinessPerHour);
		if (p.happiness <= 0) p.neglectHours = (Number.isFinite(p.neglectHours) ? p.neglectHours : 0) + miserableHours;
		else p.neglectHours = 0;

		if (p.neglectHours >= Tuning.neglectHoursToFlee) {
			const lostAt = currentTime - (p.neglectHours - Tuning.neglectHoursToFlee) * 3600;
			lose(p, "neglect");
			p.lostAt = p.lastTick = lostAt;
			syncLost(p);
		}
	}

	function syncLost(p) {
		const currentTime = now();
		const since = Math.max(p.lastTick, Number.isFinite(p.lostAt) ? p.lostAt : currentTime);
		const days = Math.max(0, (currentTime - since) / secondsPerDay);
		const bond = Number.isFinite(p.bond) ? p.bond : 0;
		p.bond = clamp(Math.max(bond - days * Tuning.bondDecayPerDayLost, Math.min(bond, Tuning.bondFloorWhenLost)), 0, Tuning.bondMax);
		p.lastTick = currentTime;
	}

	function sync() {
		if (!exists()) return;
		allPets().forEach(syncPet);
	}

	function dayStamp() {
		return Math.floor(now() / secondsPerDay);
	}

	function addBond(p, amount) {
		if (!p) return 0;
		const today = dayStamp();
		if (p.bondDay !== today) {
			p.bondDay = today;
			p.bondToday = 0;
		}
		const room = Math.max(0, Tuning.bondDailyCap - (Number.isFinite(p.bondToday) ? p.bondToday : 0));
		const gain = Math.min(amount, room);
		if (gain <= 0) return 0;
		p.bondToday += gain;
		p.bond = clamp((Number.isFinite(p.bond) ? p.bond : 0) + gain, 0, Tuning.bondMax);
		return gain;
	}

	/* --- Acquisition and carrying --- */

	function acquire(species, colour) {
		const m = state();
		if (!m || !speciesDef(species)) return null;
		const existing = getPet(species);
		// Re-acquisition restores the same pet so its bond is preserved.
		if (existing && existing.where === "lost") {
			syncPet(existing);
			existing.where = "home";
			existing.lostCause = null;
			existing.lostAt = 0;
			delete existing.fledFrom;
			existing.hunger = 20;
			existing.happiness = Math.max(existing.happiness, 60);
			existing.neglectHours = 0;
			existing.lastTick = now();
			return existing;
		}
		m.pets[species] = makePet(species, colour);
		return m.pets[species];
	}

	function canCarry(species) {
		const p = getPet(species);
		syncPet(p);
		if (!p || p.where !== "home") return false;
		return !carried();
	}

	function carry(species) {
		const m = state();
		const p = getPet(species);
		if (!m || !p || !canCarry(species)) return false;
		p.where = "carried";
		m.carried = species;
		return true;
	}

	function stow(species) {
		const m = state();
		const p = species ? getPet(species) : carried();
		if (!m || !p || p.where !== "carried") return false;
		p.where = "home";
		if (m.carried === p.species) m.carried = null;
		return true;
	}

	function lose(p, cause) {
		if (historical()) return false;
		if (!p || p.where === "lost") return false;
		const m = state();
		// Neglect happens on a clock, so leave a note when the pet is lost.
		if (cause === "neglect") p.fledFrom = p.where === "carried" ? "carried" : "home";
		p.where = "lost";
		p.lostCause = cause || "unknown";
		p.lostAt = now();
		p.neglectHours = 0;
		if (m && m.carried === p.species) m.carried = null;
		return true;
	}

	// Pets that ran off while you weren't looking, each reported once.
	function takeFlightReports() {
		if (!exists() || historical()) return [];
		const out = [];
		for (const p of allPets()) {
			if (!p.fledFrom) continue;
			const def = speciesDef(p.species);
			out.push({ species: p.species, colour: p.colour, label: `${p.colour} ${def ? def.name : p.species}`, from: p.fledFrom });
			delete p.fledFrom;
		}
		return out;
	}

	// Use this for events that can only affect the pet currently with the player.
	function loseCarried(cause) {
		const p = carried();
		if (!p) return null;
		lose(p, cause);
		return p;
	}

	function recoverySite(p) {
		if (!p || p.where !== "lost") return null;
		switch (p.lostCause) {
			case "swept":
			case "drowned":
				return "lake";
			case "bailey":
				return "ubm";
			case "neglect":
			case "badEnd":
			case "bolted":
			default:
				return "forest";
		}
	}

	function lostAt(site) {
		return lostPets().filter(p => recoverySite(p) === site);
	}

	function recover(species) {
		const p = getPet(species);
		if (!p || p.where !== "lost") return false;
		syncPet(p);
		const drowned = p.lostCause === "drowned";
		p.where = "home";
		p.lostCause = null;
		p.lostAt = 0;
		delete p.fledFrom;
		p.neglectHours = 0;
		p.lastTick = now();
		if (drowned) {
			// Drowned pets return in poor condition, but keep their bond.
			p.hunger = 100;
			p.happiness = 5;
		} else {
			p.hunger = Math.min(p.hunger, 70);
			p.happiness = Math.max(p.happiness, 50);
		}
		return true;
	}

	// Deep-water risk applies only to the carried pet; bond shifts odds toward safety.
	function swimPanic() {
		if (historical()) return null;
		const p = carried();
		if (!p) return null;
		syncPet(p);
		if (p.where !== "carried") return null;

		const shield = Math.min(
			Tuning.swimPanicWeightThrash + Tuning.swimPanicWeightSwept + Tuning.swimPanicWeightDrown - 3,
			(Number.isFinite(p.bond) ? p.bond : 0) * Tuning.swimBondProtection
		);
		const bad = Tuning.swimPanicWeightThrash + Tuning.swimPanicWeightSwept + Tuning.swimPanicWeightDrown;
		const scale = (bad - shield) / bad;
		const weights = [
			["fine", Tuning.swimPanicWeightFine + shield],
			["thrash", Tuning.swimPanicWeightThrash * scale],
			["swept", Tuning.swimPanicWeightSwept * scale],
			["drown", Tuning.swimPanicWeightDrown * scale],
		];
		const total = weights.reduce((sum, w) => sum + w[1], 0);
		let roll = (random(1, 10000) / 10000) * total;
		let outcome = "fine";
		for (const [name, weight] of weights) {
			roll -= weight;
			if (roll <= 0) {
				outcome = name;
				break;
			}
		}

		const label = `${p.colour} ${speciesDef(p.species) ? speciesDef(p.species).name : p.species}`;
		if (outcome === "thrash") {
			p.happiness = clamp(p.happiness - 25, 0, 100);
			return { outcome, label, pain: Tuning.swimThrashPain };
		}
		if (outcome === "swept") {
			lose(p, "swept");
			return { outcome, label };
		}
		if (outcome === "drown") {
			lose(p, "drowned");
			return { outcome, label };
		}
		p.happiness = clamp(p.happiness - 8, 0, 100);
		return { outcome, label };
	}

	function renderInfo() {
		if (!exists() || historical()) return null;
		const p = carried();
		if (!p) return null;
		const def = speciesDef(p.species);
		if (!def || typeof def.sprite !== "function") return null;
		return { sprite: def.sprite(p.colour), z: def.spriteZ };
	}

	/* --- Care actions --- */

	function feed(species, premium = false) {
		const m = state();
		const p = getPet(species);
		syncPet(p);
		if (!m || !p || p.where === "lost") return false;
		const def = speciesDef(species);
		// Fluid-fed species do not consume stored feed.
		if (def && def.diet === "feed") {
			if (premium) {
				if (m.premiumFeed <= 0) return false;
				m.premiumFeed--;
			} else {
				if (m.feed <= 0) return false;
				m.feed--;
			}
		}
		p.hunger = clamp(p.hunger - (premium ? 100 : 70), 0, 100);
		p.happiness = clamp(p.happiness + (premium ? 25 : 15), 0, 100);
		p.neglectHours = 0;
		addBond(p, Tuning.bondPerFeed);
		return true;
	}

	// Empty string means play is available; other values are reason codes for the UI.
	function playBlock(species) {
		const p = getPet(species);
		syncPet(p);
		if (!p || p.where === "lost") return "gone";
		if (isSick(p)) return "sick";
		const since = (now() - (Number.isFinite(p.playedAt) ? p.playedAt : 0)) / 3600;
		if (since < Tuning.playCooldownHours) return "recent";
		return "";
	}

	// Same shape as playBlock: empty string means available.
	function intimacyBlock(species) {
		const p = getPet(species);
		if (!p || p.where === "lost") return "gone";
		syncPet(p);
		if (isSick(p)) return "sick";
		if (p.happiness < 30) return "unhappy";
		if ((Number.isFinite(p.bond) ? p.bond : 0) < Tuning.intimacyMinBond) return "bond";
		return "";
	}

	// satisfied: the player orgasm. Otherwise, the slime stays hungry and less pleased.
	function intimacyEnd(species, satisfied) {
		const p = getPet(species);
		if (!p) return null;
		syncPet(p);
		const def = speciesDef(species);
		const fed = !!(def && def.diet === "fluids") && !!satisfied;
		if (fed) p.hunger = 0;
		p.happiness = clamp(p.happiness + (satisfied ? 25 : 10), 0, 100);
		p.neglectHours = 0;
		p.playedAt = now();
		addBond(p, satisfied ? Tuning.bondPerPlay : 1);
		return { label: `${p.colour} ${def ? def.name : species}`, fed, satisfied: !!satisfied };
	}

	function play(species) {
		if (playBlock(species) !== "") return false;
		const p = getPet(species);
		p.happiness = clamp(p.happiness + 20, 0, 100);
		p.neglectHours = 0;
		p.playedAt = now();
		addBond(p, Tuning.bondPerPlay);
		return true;
	}

	function isSick(p) {
		return !!p && Number.isFinite(p.sickUntil) && p.sickUntil > now();
	}

	// Return a verdict without mutating inventory or pet state.
	function foodVerdict(species, key) {
		const def = speciesDef(species);
		if (!def || !def.eats) return "refuse";
		const item = typeof setup !== "undefined" && setup.foodstuff ? setup.foodstuff[key] : null;
		if (!item) return "refuse";
		const tags = item.food && Array.isArray(item.food.tags) ? item.food.tags : [];
		const hits = list => list.categories.includes(item.category) || tags.some(t => list.tags.includes(t));
		// Harmful tags take precedence over otherwise acceptable food.
		if (hits(def.sickens)) return "sick";
		if (hits(def.eats)) return "eat";
		return "refuse";
	}

	// Refused food is not consumed; successful calls return data for scene narration.
	function feedFood(species, key) {
		const p = getPet(species);
		syncPet(p);
		if (!p || p.where !== "carried") return null;
		const def = speciesDef(species);
		const label = `${p.colour} ${def ? def.name : p.species}`;
		const verdict = foodVerdict(species, key);
		if (verdict === "refuse") return { verdict, label, key };
		if (typeof foodConsumeServing !== "function" || !foodConsumeServing(key)) return null;
		if (verdict === "sick") {
			p.sickUntil = now() + Tuning.sickHours * 3600;
			p.happiness = clamp(p.happiness - Tuning.sickHappiness, 0, 100);
		} else {
			p.hunger = clamp(p.hunger - Tuning.pocketFeedRelief, 0, 100);
			p.happiness = clamp(p.happiness + 10, 0, 100);
			p.neglectHours = 0;
			addBond(p, Tuning.bondPerFeed);
		}
		return { verdict, label, key };
	}

	function feedFromPocket(key) {
		const p = carried();
		if (!p) return false;
		const destination = V.passage === "Pocket Feed Pet" ? V.petFoodReturn : V.passage;
		const result = feedFood(p.species, key);
		if (!result) return false;
		V.petFoodReturn = destination;
		V.petFoodResult = result;
		if (typeof closeOverlay === "function") closeOverlay();
		return true;
	}

	/* --- Status and combat support --- */

	function hungerWord(p) {
		if (p.hunger >= Tuning.starvingThreshold) return "Starving";
		if (p.hunger >= Tuning.hungryThreshold) return "Hungry";
		if (p.hunger >= 30) return "Peckish";
		return "Full";
	}
	function happinessWord(p) {
		if (p.happiness >= 80) return "Delighted";
		if (p.happiness >= 55) return "Content";
		if (p.happiness >= 30) return "Restless";
		if (p.happiness > 0) return "Miserable";
		return "Despairing";
	}
	function bondWord(p) {
		if (p.bond >= 90) return "Inseparable";
		if (p.bond >= 70) return "Devoted";
		if (p.bond >= 45) return "Attached";
		if (p.bond >= 20) return "Warming";
		return "Wary";
	}

	function status(species) {
		const p = getPet(species);
		if (!p) return null;
		syncPet(p);
		const def = speciesDef(p.species);
		return {
			species: p.species,
			colour: p.colour,
			label: `${p.colour} ${def ? def.name : p.species}`,
			where: p.where,
			hunger: Math.round(p.hunger),
			happiness: Math.round(p.happiness),
			bond: Math.round(p.bond),
			hungerWord: hungerWord(p),
			happinessWord: happinessWord(p),
			bondWord: bondWord(p),
			lostCause: p.lostCause,
			sick: isSick(p),
			icon: def ? def.icon(p.colour) : null,
		};
	}

	/* Pets aren't added to `$NPCList`; support returns an action for existing combat widgets to apply. */
	function supportChance() {
		if (historical()) return 0;
		const p = carried();
		if (!p) return 0;
		syncPet(p);
		if (p.bond < Tuning.supportMinBond) return 0;
		if (p.happiness < 30 || isSick(p)) return 0;
		return Math.min(Tuning.supportChanceMax, Math.floor(p.bond / Tuning.supportChanceDivisor));
	}

	// Restrict targets to active combat slots; NPCList may contain retired entries.
	function liveSlot() {
		const list = Array.isArray(V.NPCList) ? V.NPCList : [];
		const bound = Number.isInteger(V.enemynomax) && V.enemynomax > 0 ? Math.min(V.enemynomax, list.length) : list.length;
		const open = [];
		for (let i = 0; i < bound; i++) {
			const npc = list[i];
			if (npc && typeof npc === "object" && npc.stance !== "defeated") open.push(i);
		}
		if (!open.length) return -1;
		return open[random(0, open.length - 1)];
	}

	// One support roll per player turn; null means no pet action this turn.
	function combatSupport() {
		if (typeof V === "undefined") return null;
		if (historical()) return null;
		// effectsman runs during the pet's own scene too, where the only target is the pet.
		if (V.petEncounter) return null;
		const p = carried();
		if (!p) return null;
		syncPet(p);

		const target = liveSlot();
		if (target === -1) return null;
		const consensual = V.consensual === 1;

		if (Number.isFinite(V.petSupportCooldown) && V.petSupportCooldown > 0) {
			V.petSupportCooldown--;
			return null;
		}

		const bond = Number.isFinite(p.bond) ? p.bond : 0;
		const def = speciesDef(p.species);
		const base = { species: p.species, colour: p.colour, label: `${p.colour} ${def ? def.name : p.species}`, target, consensual };

		if (bond < Tuning.supportMinBond) {
			if (consensual || isSick(p)) return null;
			if (random(1, 100) > Tuning.boltChance) return null;
			V.petSupportCooldown = Tuning.supportCooldownTurns;
			lose(p, "bolted");
			return Object.assign(base, { act: "bolt", power: 0 });
		}

		const chance = supportChance();
		if (chance <= 0) return null;
		if (random(1, 100) > chance) return null;
		V.petSupportCooldown = Tuning.supportCooldownTurns;

		const power = Tuning.supportDamageBase + Math.round(bond / Tuning.supportDamagePerBond);

		if (def && def.support === "strike") {
			if (Number.isFinite(V.enemyanger)) V.enemyanger += consensual ? 10 : 5;
			if (consensual && Number.isFinite(V.enemytrust)) V.enemytrust -= 10;
			return Object.assign(base, { act: "strike", power });
		}
		if (def && def.support === "smother") {
			if (Number.isFinite(V.enemytrust)) V.enemytrust -= consensual ? 15 : 5;
			if (Number.isFinite(V.enemyarousal)) V.enemyarousal += power * 2;
			if (Number.isFinite(V.pain) && V.pain > 0) V.pain = Math.max(0, V.pain - power);
			return Object.assign(base, { act: "smother", power });
		}
		return null;
	}

	// Called before <<endcombat>> clears $finish; finish === 1 marks a forced ending.
	function combatEnd() {
		if (typeof V === "undefined") return null;
		delete V.petSupportCooldown;
		if (historical()) return null;
		// The pet is this encounter, so clear it here for every exit path.
		if (V.petEncounter) {
			delete V.petEncounter;
			delete V.petIntimacyOrgasms;
			delete V.petIntimacyTurns;
			return null;
		}
		if (V.finish !== 1) return null;

		const p = carried();
		if (!p) return null;
		const label = `${p.colour} ${speciesDef(p.species) ? speciesDef(p.species).name : p.species}`;
		const bolts = (Number.isFinite(p.bond) ? p.bond : 0) >= Tuning.supportMinBond;
		lose(p, bolts ? "badEnd" : "bailey");
		return { outcome: bolts ? "fled" : "taken", label };
	}

	/* --- HTML renderers --- */

	function meter(label, value, word, cls) {
		const pct = clamp(Math.round(value), 0, 100);
		return (
			`<div class="mg-meter"><span class="mg-k">${esc(label)}</span>` +
			`<span class="mg-bar"><span class="mg-bar-fill ${cls}" style="width:${pct}%"></span></span>` +
			`<span class="mg-v">${esc(word)}</span></div>`
		);
	}

	function hungerClass(p) {
		return p.hunger >= Tuning.starvingThreshold ? "bad" : p.hunger >= Tuning.hungryThreshold ? "warn" : "good";
	}
	function happinessClass(p) {
		return p.happiness <= 0 ? "bad" : p.happiness < 30 ? "warn" : "good";
	}

	// Hunger is inverted so a fuller bar always represents a better state.
	function petCardHtml(species) {
		const s = status(species);
		if (!s) return "";
		const p = getPet(species);
		let h = `<div class="mg-card">`;
		h += `<div class="mg-head"><span class="mg-name">${esc(s.label)}</span>`;
		if (s.where === "carried") h += ` <span class="mg-sub">with you</span>`;
		else if (s.where === "lost") h += ` <span class="mg-sub bad">lost</span>`;
		if (s.sick) h += ` <span class="mg-sub bad">unwell</span>`;
		h += `</div>`;
		if (s.where === "lost") {
			h += `<div class="mg-meta">It still remembers you.</div>`;
			h += meter("Bond", s.bond, s.bondWord, "bond");
		} else {
			h += meter("Fed", 100 - s.hunger, s.hungerWord, hungerClass(p));
			h += meter("Mood", s.happiness, s.happinessWord, happinessClass(p));
			h += meter("Bond", s.bond, s.bondWord, "bond");
		}
		h += `</div>`;
		return h;
	}

	function socialHtml() {
		if (!exists()) return "";
		sync();
		const pets = allPets();
		if (!pets.length) return "";
		return pets.map(p => petCardHtml(p.species)).join("");
	}

	return {
		Tuning,
		SPECIES,
		speciesDef,
		speciesIds,
		state,
		exists,
		sync,
		allPets,
		getPet,
		owned,
		carried,
		petsAtHome,
		lostPets,
		lostAt,
		recoverySite,
		acquire,
		canCarry,
		carry,
		stow,
		lose,
		loseCarried,
		recover,
		feed,
		feedFood,
		feedFromPocket,
		foodVerdict,
		intimacyBlock,
		intimacyEnd,
		isSick,
		play,
		playBlock,
		takeFlightReports,
		addBond,
		status,
		supportChance,
		combatSupport,
		combatEnd,
		historical,
		swimPanic,
		renderInfo,
		petCardHtml,
		socialHtml,
	};
})();
window.Menagerie = Menagerie;
