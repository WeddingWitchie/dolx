/* globals V Time either ensurePillInventoryRecords */
/* Completion rewards for the DoL player. Pills come from the game's own catalogue (setup.pills): a win gives an SWP
 * anti-pill, a loss an ordinary gray X-Change pill. Per DoL day (Time.days) the meta allows one pill of each kind and
 * three Science payments. game.rewarded is set the moment a run's reward is decided, even when a cap paid nothing, so
 * loading a finished run later can never pay it. The Science itself is paid by the caller through <<scienceskill>>. */
(() => {
	const science = 2;
	const dailyScienceCap = 3;

	const pool = won => setup.pills.filter(p => p.type === "xchange" && (won ? p.subtype === "anti-pill" : p.color === "gray")).map(p => p.name);

	/* The meta's ledger for today, reset when the DoL day has changed. */
	function ledger(meta) {
		const day = Time.days;
		if (!meta.dailyRewards || meta.dailyRewards.day !== day) meta.dailyRewards = { day, anti: false, gray: false, science: 0 };
		return meta.dailyRewards;
	}

	function grant(game, meta) {
		if (!game || !meta || game.status === "active" || game.rewarded) return null;
		game.rewarded = true;
		const won = game.status === "won";
		const today = ledger(meta);
		const reward = { science: 0, pill: null, notes: [] };
		if (today.science < dailyScienceCap) {
			today.science += 1;
			reward.science = science;
		} else {
			reward.notes.push("Daily Science reward limit reached.");
		}
		const kind = won ? "anti" : "gray";
		const names = pool(won);
		if (names.length && V.sexStats && V.sexStats.pills) {
			if (today[kind]) {
				reward.notes.push(won ? "Daily anti-pill reward already claimed." : "Daily X-Change pill reward already claimed.");
			} else {
				const name = either(names);
				ensurePillInventoryRecords(V.sexStats.pills.pills);
				V.sexStats.pills.pills[name].owned += 1;
				today[kind] = true;
				reward.pill = name;
			}
		}
		game.reward = reward;
		return reward;
	}

	setup.plagueReward = Object.freeze({ grant });
})();

/* Outbreak console minigame: fixed definitions only. Nothing here changes during play; save state lives on V.plagueGame.
 *
 * Effect objects (used by upgrades and events) share one shape, every key optional:
 *   infectivity / severity / lethality / resistance: added to the disease stat
 *   spread: multiplies spread inside every region
 *   travel: multiplies every route between regions
 *   cure:   multiplies daily cure progress
 *   routes:  { routeType: multiplier }, e.g. { river: 1.5 }
 *   regions: { regionId: multiplier } for spread inside that region
 *   isolate: true  (targeted effects only) blocks every route into and out of the effect's target region
 *   climates: { climateId: multiplier } for spread inside every region of that climate
 *   visibility: added straight to response pressure; negative keeps the outbreak quiet
 *   dnaReward: multiplies milestone DNA (a day's total, rounded down)
 *   restrictionResist: 0..1, the share of every travel cut from the response or a world event that is ignored
 *   cureHardening: true turns on the Genetic Hardening cure rule (tuning.hardening*)
 *   pressure: multiplies total response pressure (difficulty and traits)
 *   infectedWork: added to how much medical work an infected person still does (see infectedWork in plague-sim.js)
 *   startingDna / startingInfected: added when a game is created (traits only) */
(() => {
	const deepFreeze = obj => {
		Object.values(obj).forEach(v => {
			if (v && typeof v === "object") deepFreeze(v);
		});
		return Object.freeze(obj);
	};

	setup.plagueData = deepFreeze({
		/* $plagueGame schema version. */
		version: 1,

		/* $plagueMeta: progression shared by every run in one DoL save. Created by the setup flow's Begin step.
		 * A trait is available when its entry says `starter: true` or its id is in meta.unlocked.traits (earned traits only),
		 * so a starter trait added later reaches existing metas. */
		meta: {
			version: 1,
			startingSlots: 3,
			maxSlots: 4,
			starter: { pathogens: ["bacteria"], difficulties: ["casual", "normal"] },
			/* Unlock rules, read by recordRun(): a WIN with a matching `pathogen` (any if omitted) and a difficulty in `difficulties`
			 * appends `grants` (ids per unlocked list) to meta.unlocked. `hint` is what a locked card shows. */
			unlocks: [
				{ pathogen: "bacteria", difficulties: ["normal", "brutal"], grants: { pathogens: ["virus"] }, hint: "Win with Bacteria on Normal." },
				{ pathogen: "virus", difficulties: ["normal", "brutal"], grants: { pathogens: ["fungus"] }, hint: "Win with Virus on Normal." },
				{ pathogen: "fungus", difficulties: ["normal", "brutal"], grants: { pathogens: ["parasite"] }, hint: "Win with Fungus on Normal." },
				{ pathogen: "parasite", difficulties: ["normal", "brutal"], grants: { pathogens: ["prion"] }, hint: "Win with Parasite on Normal." },
				{ difficulties: ["normal", "brutal"], grants: { difficulties: ["brutal"] }, hint: "Win any outbreak on Normal." },
			],
		},

		/* A pathogen is playable only when meta.unlocked lists it and `ready` is true. `effects` is applied to the whole run. */
		pathogens: {
			bacteria: {
				name: "Bacteria",
				line: "Balanced, with no extreme strengths or weaknesses.",
				desc: "The recommended first strain. It plays by the standard rules.",
				ready: true,
				effects: {},
			},
			virus: {
				name: "Virus",
				line: "Unstable and mutation-oriented.",
				desc: "A strain that changes as it spreads. At 10%, 40% and 75% of the world reached it evolves on its own, giving you a free evolution you did not choose.",
				ready: true,
				effects: {},
				/* Shown on the World screen next to the name. */
				tag: "Unstable",
				/* Virus: each threshold (share of the world infected or dead) grants one random free evolution among those
				 * canMutate() allows, weighted by tier. */
				mutation: { thresholds: [0.1, 0.4, 0.75], tierWeights: { 1: 4, 2: 2, 3: 1 } },
			},
			fungus: {
				name: "Fungus",
				line: "Poor natural travel, with an ability of its own.",
				desc: "A strain that struggles to move between regions on its own, so routes carry it much less often. Locally it grows as normal. Its Spore Burst can start an infection in a region you have not reached, up to three times a run.",
				ready: true,
				effects: { travel: 0.6 },
				tag: "Sporebound",
				/* An active ability (game.ability). `charges` per run; `seed` infected added to the chosen unreached region. */
				ability: {
					id: "sporeBurst",
					name: "Spore Burst",
					usedLabel: "Spore Bursts used",
					desc: "Seed an unreached region without normal travel.",
					charges: 3,
					seed: 10,
				},
			},
			parasite: {
				name: "Parasite",
				line: "Stealthy, with an ability of its own.",
				desc: "A strain that trades speed for concealment. It spreads a little slower but draws less response, and its Suppress ability can hold that response back for a week, twice a run.",
				ready: true,
				effects: { pressure: 0.9, spread: 0.95 },
				tag: "Subtle",
				/* `effect` names a timed effect in abilityEffects, started on the run itself. */
				ability: {
					id: "suppress",
					name: "Suppress",
					usedLabel: "Suppress uses",
					desc: "Temporarily masks the outbreak and slows response escalation.",
					charges: 2,
					effect: "suppress",
				},
			},
			prion: {
				name: "Prion",
				line: "Slow and entrenched, strong late.",
				desc: "A strain that takes hold slowly, spreading a little slower at first. The longer the outbreak survives, the harder it is to remove: Entrenchment grows on days 20, 40 and 60, and each stage slows cure research by another 10%.",
				ready: true,
				effects: { spread: 0.9 },
				tag: "Entrenched",
				/* Prion: level = how many of `days` the current day has reached; each level multiplies cure research by `cure`. */
				entrenchment: { days: [20, 40, 60], cure: 0.9, names: ["I", "II", "III"] },
			},
		},

		/* Difficulty is an effect object read by modifiers(). Normal is `{}` and must stay neutral. */
		difficulties: {
			casual: {
				name: "Casual",
				line: "For learning the game or a relaxed outbreak.",
				notes: ["Cure research runs slower", "Authorities react later"],
				ready: true,
				effects: { cure: 0.92, pressure: 0.95 },
			},
			normal: { name: "Normal", line: "The standard game.", notes: ["Cure and response at full strength"], ready: true, effects: {} },
			/* TEMPORARY provisional numbers: Brutal has not been balanced yet. Do not treat them as final. */
			brutal: {
				name: "Brutal",
				line: "A harsher world.",
				notes: ["Cure research runs faster", "Authorities react sooner"],
				ready: true,
				effects: { cure: 1.15, pressure: 1.15 },
			},
		},

		/* One equipped trait per category at most. `effects` may use any generic key plus startingDna and startingInfected,
		 * which only create() reads. */
		traitCategories: {
			spread: { name: "Spread" },
			concealment: { name: "Concealment" },
			adaptation: { name: "Adaptation" },
			resistance: { name: "Resistance" },
			tempo: { name: "Tempo" },
		},
		traits: {
			vigorous: { name: "Vigorous", category: "spread", starter: true, desc: "Spreads a little faster in every region.", effects: { spread: 1.06 } },
			wanderer: { name: "Wanderer", category: "spread", starter: true, desc: "Slightly more likely to reach neighbouring regions.", effects: { travel: 1.2 } },
			mutedSymptoms: {
				name: "Muted Symptoms",
				category: "concealment",
				starter: true,
				desc: "Symptoms draw less attention once they appear. It does nothing while the outbreak has no symptoms.",
				effects: { visibility: -8 },
			},
			slowBurn: {
				name: "Slow Burn",
				category: "concealment",
				starter: true,
				desc: "Authorities react more slowly, at a small cost to spread.",
				effects: { pressure: 0.92, spread: 0.97 },
			},
			coldTolerance: {
				name: "Cold Tolerance",
				category: "adaptation",
				starter: true,
				desc: "Cold regions are less of a barrier.",
				effects: { climates: { cold: 1.15 } },
			},
			weatherproof: {
				name: "Weatherproof",
				category: "adaptation",
				starter: true,
				desc: "Wet and dry regions are less of a barrier.",
				effects: { climates: { wet: 1.1, dry: 1.1 } },
			},
			hardyStrain: {
				name: "Hardy Strain",
				category: "resistance",
				starter: true,
				desc: "A little harder for researchers to treat.",
				effects: { resistance: 0.05 },
			},
			overburden: {
				name: "Overburden",
				category: "resistance",
				starter: true,
				desc: "Infected people help medical services less.",
				effects: { infectedWork: -0.08 },
			},
			headStart: { name: "Head Start", category: "tempo", starter: true, desc: "Begin with a little spare DNA.", effects: { startingDna: 2 } },
			rapidSeeding: {
				name: "Rapid Seeding",
				category: "tempo",
				starter: true,
				desc: "Begin with more infected people, which draws early attention.",
				effects: { startingInfected: 10, visibility: 6 },
			},
		},

		/* Fictional pathogen names cycled by the setup screen. */
		nameSuggestions: [
			"Vespera rubra",
			"Caligena pallida",
			"Nexaria cinerea",
			"Morvena lenta",
			"Veloria atra",
			"Serenia muta",
			"Corvella ferox",
			"Thalera obscura",
			"Ardella mortis",
			"Silvaria alba",
			"Noctera gravis",
			"Valeria ignota",
			"Virentis",
			"Mortalis",
			"Aurexis",
			"Tenebris",
			"Corvaxis",
			"Malvera",
			"Orphena",
			"Caelith",
			"Virelia",
			"Solvena",
			"Neraxis",
			"Pallexa",
		],
		nameMax: 24,

		tuning: {
			startingDna: 2,
			startingInfected: 10,
			spreadBase: 0.1,
			spreadPerInfectivity: 0.07,
			routeBase: 0.02,
			routeScale: 1.5,
			routeChanceCap: 0.95,
			seedFraction: 0.002,
			seedMax: 20,
			deathPerLethality: 0.02,
			deathRateCap: 0.25,
			cureBase: 0.9,
			capacityFloor: 0.25,
			infectedCapacityBase: 0.6,
			infectedCapacitySeverityPenalty: 0.06,
			infectedCapacityMin: 0.15,
			resistanceCap: 0.6,
			hardeningAbove: 90,
			hardeningSlow: 0.4,
			hardeningCap: 0.8,
			restrictionResistCap: 0.9,
			eventChance: 0.12,
			maxActiveEvents: 2,
			logLimit: 12,
			fastForwardDays: 10,
			fastForwardCureMarks: [25, 50, 75, 90],
		},

		/* DNA milestones. Each pays once, when first reached (game.milestones lists claimed ids). Progress counts infected + dead.
		 * Share 0 means the first case; `full` means nobody healthy is left. {region} in text is the region's name. */
		dna: {
			region: [
				{ key: "first", share: 0, dna: 2, text: "reached {region}" },
				{ key: "25", share: 0.25, dna: 1, text: "{region} passed 25%" },
				{ key: "50", share: 0.5, dna: 1, text: "{region} passed 50%" },
				{ key: "75", share: 0.75, dna: 1, text: "{region} passed 75%" },
				{ key: "full", full: true, dna: 2, text: "{region} fully reached" },
			],
			global: [
				{ key: "5", share: 0.05, dna: 1, text: "outbreak passed 5%" },
				{ key: "10", share: 0.1, dna: 1, text: "outbreak passed 10%" },
				{ key: "25", share: 0.25, dna: 2, text: "outbreak passed 25%" },
				{ key: "50", share: 0.5, dna: 2, text: "outbreak passed 50%" },
				{ key: "75", share: 0.75, dna: 3, text: "outbreak passed 75%" },
				{ key: "full", full: true, dna: 3, text: "outbreak reached everyone" },
			],
			deaths: [
				{ key: "10", share: 0.1, dna: 2, text: "deaths passed 10%" },
				{ key: "25", share: 0.25, dna: 3, text: "deaths passed 25%" },
				{ key: "50", share: 0.5, dna: 3, text: "deaths passed 50%" },
				{ key: "75", share: 0.75, dna: 4, text: "deaths passed 75%" },
			],
		},

		baseStats: { infectivity: 1, severity: 0, lethality: 0, resistance: 0 },

		regions: {
			/* density: local spread multiplier. healthcare: weight in world medical capacity. hub: multiplier on infection leaving
			 * this region. */
			town: {
				name: "Town",
				icon: "town.png",
				population: 12000,
				density: 1.3,
				healthcare: 2,
				climate: "temperate",
				hub: 1,
				note: "Crowded streets and shared buildings",
			},
			farmland: {
				name: "Farmland",
				icon: "farmlands.png",
				population: 4000,
				density: 0.9,
				healthcare: 1,
				climate: "dry",
				hub: 0.9,
				note: "Farms spread far apart",
			},
			forest: {
				name: "Forest",
				icon: "forest.png",
				population: 1500,
				density: 0.5,
				healthcare: 0.5,
				climate: "wet",
				hub: 0.6,
				note: "Few people, living in isolated cabins",
			},
			lake: { name: "Lake", icon: "lake.png", population: 2500, density: 1, healthcare: 1, climate: "wet", hub: 1, note: "Villages gathered around the water" },
			coast: {
				name: "Coast",
				icon: "beach.gif",
				population: 5000,
				density: 1,
				healthcare: 1.5,
				climate: "wet",
				hub: 1.6,
				note: "Harbour towns with a steady flow of sailors",
			},
			north: {
				name: "North",
				icon: "moor.png",
				population: 2000,
				density: 0.8,
				healthcare: 1,
				climate: "cold",
				hub: 0.7,
				note: "Remote villages under long winters",
			},
		},

		/* `density` (optional) multiplies local spread in every region of that climate. */
		climates: {
			temperate: { name: "Temperate" },
			wet: { name: "Wet" },
			dry: { name: "Dry" },
			cold: { name: "Cold", density: 0.65 },
		},

		/* World response. The stage is saved and never falls; pressure is recalculated each day (responsePressure). Stage fields:
		 * threshold (pressure to reach it), cure (research speed factor), localSpread (spread multiplier in every region, with
		 * spreadNote for the player), effects (applied from the next day), healthcareSpread (extra spread cut in regions with
		 * healthcare >= highHealthcare), isolate (isolates one region on entry), news (logged once). */
		response: {
			spreadWeight: 35,
			spreadFull: 0.4,
			visibilityPerSeverity: 6,
			visibilityCap: 30,
			deathsWeight: 40,
			deathsFull: 0.25,
			reachWeight: 15,
			timePerDay: 0.5,
			timeCap: 40,
			highHealthcare: 1.5,
			stages: [
				{ name: "Unaware", threshold: 0, cure: 0 },
				{ name: "Detected", threshold: 15, cure: 0.4, news: "Doctors recognise the outbreak and start investigating it." },
				{
					name: "Alert",
					threshold: 35,
					cure: 1,
					localSpread: 0.95,
					spreadNote: "Public precautions are slightly slowing local spread.",
					healthcareSpread: 0.9,
					news: "Authorities organise a response to the outbreak.",
				},
				{
					name: "Emergency",
					threshold: 60,
					cure: 1.6,
					localSpread: 0.85,
					spreadNote: "Emergency measures are slowing local spread.",
					effects: { travel: 0.8 },
					healthcareSpread: 0.9,
					isolate: true,
					news: "Emergency measures are announced.",
				},
				{
					name: "Lockdown",
					threshold: 85,
					cure: 2,
					localSpread: 0.7,
					spreadNote: "Strict measures are heavily slowing local spread.",
					effects: { travel: 0.6 },
					healthcareSpread: 0.8,
					news: "Widespread restrictions are imposed.",
				},
			],
		},

		/* Timed effects created by the response. {region} in start/end is the target's name. */
		responseEffects: {
			isolation: {
				name: "Isolation",
				duration: 5,
				effects: { isolate: true },
				desc: "Nobody may travel in or out.",
				start: "Authorities isolate {region}. Nobody may travel in or out.",
				end: "The isolation of {region} is lifted.",
			},
		},

		/* Timed effects started by a pathogen ability. Added between days, they first apply on the next day and last `duration` days. */
		abilityEffects: {
			suppress: {
				name: "Suppress",
				duration: 7,
				effects: { pressure: 0.6 },
				desc: "Response pressure is reduced.",
				start: "The Parasite suppresses signs of the outbreak.",
				end: "Suppression has faded.",
			},
		},

		routeTypes: {
			road: { name: "road" },
			river: { name: "river" },
			sea: { name: "sea route" },
			trail: { name: "forest trail" },
		},

		/* Undirected: each route carries infection both ways. */
		routes: [
			{ a: "town", b: "farmland", type: "road" },
			{ a: "town", b: "lake", type: "river" },
			{ a: "town", b: "coast", type: "sea" },
			{ a: "farmland", b: "forest", type: "trail" },
			{ a: "farmland", b: "north", type: "road" },
			{ a: "forest", b: "lake", type: "river" },
			{ a: "forest", b: "north", type: "trail" },
			{ a: "lake", b: "coast", type: "river" },
		],

		/* requires: every id must be owned. requiresAny: at least one must be owned. Order here is display order. */
		/* Evolve screen sections, in display order. Each upgrade names one in `category`. */
		upgradeCategories: {
			transmission: { name: "Transmission" },
			symptoms: { name: "Symptoms" },
			resistance: { name: "Resistance" },
		},

		/* Branches inside each family, in display order. Each upgrade names one in `branch`; `tier` is its depth (1 first). */
		upgradeBranches: {
			respiratory: { name: "Respiratory", category: "transmission" },
			contact: { name: "Contact", category: "transmission" },
			water: { name: "Water", category: "transmission" },
			animal: { name: "Animal", category: "transmission" },
			travel: { name: "Travel", category: "transmission" },
			environment: { name: "Environment", category: "transmission" },
			mild: { name: "Mild", category: "symptoms" },
			visible: { name: "Visible", category: "symptoms" },
			severe: { name: "Severe", category: "symptoms" },
			lethal: { name: "Lethal", category: "symptoms" },
			cure: { name: "Cure resistance", category: "resistance" },
			concealment: { name: "Concealment", category: "resistance" },
			adaptation: { name: "Adaptation", category: "resistance" },
			stability: { name: "Stability", category: "resistance" },
		},

		/* `tag` is the short label printed on the evolution tree node; it has no effect on play. */
		upgrades: {
			cough: {
				name: "Coughing",
				tag: "Air",
				category: "transmission",
				branch: "respiratory",
				tier: 1,
				cost: 3,
				desc: "Spread through the air.",
				effects: { infectivity: 1 },
			},
			sneeze: {
				name: "Sneezing",
				tag: "Air",
				category: "transmission",
				branch: "respiratory",
				tier: 2,
				cost: 6,
				requires: ["cough"],
				desc: "Each sneeze reaches a whole room.",
				effects: { infectivity: 2 },
			},
			sweat: {
				name: "Fevered Sweat",
				tag: "Crowds",
				category: "transmission",
				branch: "contact",
				tier: 1,
				cost: 8,
				requires: ["cough"],
				desc: "Crowds pass it hand to hand.",
				effects: { infectivity: 1, regions: { town: 1.2 } },
			},
			water1: {
				name: "Waterborne",
				tag: "Water",
				category: "transmission",
				branch: "water",
				tier: 1,
				cost: 5,
				desc: "Survives in rivers and sea spray.",
				effects: { routes: { river: 1.5, sea: 1.5 }, regions: { lake: 1.3 } },
			},
			livestock: {
				name: "Livestock Carrier",
				tag: "Farms",
				category: "transmission",
				branch: "animal",
				tier: 1,
				cost: 5,
				desc: "Animals carry it between farms.",
				effects: { routes: { road: 1.3 }, regions: { farmland: 1.3 } },
			},
			travel: {
				name: "Hitchhiker",
				tag: "Travel",
				category: "transmission",
				branch: "travel",
				tier: 1,
				cost: 9,
				requiresAny: ["water1", "livestock"],
				desc: "Rides along with anyone travelling.",
				effects: { travel: 1.5 },
			},
			nausea: {
				name: "Nausea",
				tag: "Mild",
				category: "symptoms",
				branch: "mild",
				tier: 1,
				cost: 4,
				desc: "Hosts feel ill. People start to notice.",
				effects: { severity: 1 },
			},
			delirium: {
				name: "Delirium",
				tag: "Mingling",
				category: "symptoms",
				branch: "severe",
				tier: 1,
				cost: 8,
				requires: ["nausea"],
				desc: "Confused hosts wander and mingle.",
				effects: { severity: 2, infectivity: 1 },
			},
			organ: {
				name: "Organ Failure",
				tag: "Deadly",
				category: "symptoms",
				branch: "lethal",
				tier: 1,
				cost: 10,
				requires: ["nausea"],
				desc: "Some hosts stop recovering.",
				effects: { lethality: 2, severity: 1 },
			},
			haemorrhage: {
				name: "Haemorrhage",
				tag: "Deadly",
				category: "symptoms",
				branch: "lethal",
				tier: 2,
				cost: 16,
				requires: ["organ"],
				desc: "Deadly and impossible to hide.",
				effects: { lethality: 4, severity: 2 },
			},
			resist1: {
				name: "Drug Resistance",
				tag: "Cure",
				category: "resistance",
				branch: "cure",
				tier: 1,
				cost: 7,
				desc: "Common treatments stop working.",
				effects: { resistance: 0.2 },
			},
			resist2: {
				name: "Genetic Shuffle",
				tag: "Cure",
				category: "resistance",
				branch: "cure",
				tier: 2,
				cost: 14,
				requires: ["resist1"],
				desc: "Mutates faster than researchers can map it.",
				effects: { resistance: 0.25 },
			},
			airborne: {
				name: "Airborne Drift",
				tag: "Loud",
				category: "transmission",
				branch: "respiratory",
				tier: 3,
				cost: 10,
				requires: ["sneeze"],
				exclusive: "respiratoryPath",
				desc: "Spreads rapidly, but draws attention wherever it goes.",
				effects: { infectivity: 2, spread: 1.2, visibility: 12 },
			},
			silent: {
				name: "Silent Carrier",
				tag: "Quiet",
				category: "transmission",
				branch: "respiratory",
				tier: 3,
				cost: 9,
				requires: ["sneeze"],
				exclusive: "respiratoryPath",
				desc: "A quieter spread, with fewer opportunities to travel.",
				effects: { infectivity: 1, visibility: -10, travel: 0.75 },
			},
			crowd: {
				name: "Crowd Carrier",
				tag: "Crowds",
				category: "transmission",
				branch: "contact",
				tier: 2,
				cost: 11,
				requires: ["sweat"],
				desc: "Thrives in Town crowds, where it is also easier to spot.",
				effects: { infectivity: 1, regions: { town: 1.6 }, visibility: 5 },
			},
			flood: {
				name: "Floodborne",
				tag: "Wet",
				category: "transmission",
				branch: "water",
				tier: 2,
				cost: 9,
				requires: ["water1"],
				desc: "Favours wet regions and river routes over dry country.",
				effects: { climates: { wet: 1.4, dry: 0.85 }, routes: { river: 1.6 } },
			},
			bird: {
				name: "Bird Carrier",
				tag: "Remote",
				category: "transmission",
				branch: "animal",
				tier: 2,
				cost: 9,
				requires: ["livestock"],
				desc: "Reaches woodland settlements along remote trails.",
				effects: { routes: { trail: 1.8 }, regions: { forest: 1.5, north: 1.2 } },
			},
			harbour: {
				name: "Harbour Hopper",
				tag: "Borders",
				category: "transmission",
				branch: "travel",
				tier: 2,
				cost: 13,
				requires: ["travel"],
				desc: "Keeps routes moving through travel restrictions. Fully isolated regions remain closed.",
				effects: { restrictionResist: 0.6, routes: { sea: 1.3 } },
			},
			coldHardy: {
				name: "Cold Hardy",
				tag: "Cold",
				category: "transmission",
				branch: "environment",
				tier: 1,
				cost: 4,
				desc: "Spreads more easily in cold regions, less easily in dry ones.",
				effects: { climates: { cold: 1.6, dry: 0.9 } },
			},
			droughtHardy: {
				name: "Drought Hardy",
				tag: "Dry",
				category: "transmission",
				branch: "environment",
				tier: 1,
				cost: 3,
				desc: "Favours dry regions at the expense of wet ones.",
				effects: { climates: { dry: 1.5, wet: 0.9 } },
			},
			paranoia: {
				name: "Paranoia",
				tag: "Quiet",
				category: "symptoms",
				branch: "mild",
				tier: 2,
				cost: 7,
				requires: ["nausea"],
				desc: "Keeps symptoms out of sight, but hosts mingle less.",
				effects: { severity: 1, visibility: -12, spread: 0.85 },
			},
			fever: {
				name: "Fever Spikes",
				tag: "Loud",
				category: "symptoms",
				branch: "visible",
				tier: 1,
				cost: 4,
				desc: "A cheap burst of spread with conspicuous symptoms.",
				effects: { infectivity: 1, severity: 1, visibility: 5 },
			},
			frenzy: {
				name: "Frenzy",
				tag: "Loud",
				category: "symptoms",
				branch: "severe",
				tier: 2,
				cost: 12,
				requires: ["delirium"],
				exclusive: "deliriumPath",
				desc: "Reckless activity drives spread and a stronger official response.",
				effects: { infectivity: 2, severity: 2, visibility: 10 },
			},
			lethargy: {
				name: "Lethargy",
				tag: "Quiet",
				category: "symptoms",
				branch: "severe",
				tier: 2,
				cost: 10,
				requires: ["delirium"],
				exclusive: "deliriumPath",
				desc: "Quieter symptoms draw less attention, but slow spread and travel.",
				effects: { visibility: -20, spread: 0.8, travel: 0.7 },
			},
			collapse: {
				name: "Total Collapse",
				tag: "Deadly",
				category: "symptoms",
				branch: "lethal",
				tier: 3,
				cost: 22,
				requires: ["haemorrhage"],
				desc: "A costly final push towards lethality. Spread falters and the outbreak becomes impossible to overlook.",
				effects: { lethality: 4, severity: 3, spread: 0.65, visibility: 15 },
			},
			hardening: {
				name: "Genetic Hardening",
				tag: "Late cure",
				category: "resistance",
				branch: "cure",
				tier: 3,
				cost: 18,
				requires: ["resist2"],
				desc: "Caps daily cure gain at 0.8 points; above 90%, gain is also multiplied by 0.4. Research can still finish.",
				effects: { cureHardening: true },
			},
			lowSignal: {
				name: "Low Signal",
				tag: "Quiet",
				category: "resistance",
				branch: "concealment",
				tier: 1,
				cost: 3,
				desc: "Draws less attention, but spreads a little more slowly.",
				effects: { visibility: -8, spread: 0.95 },
			},
			mimicry: {
				name: "Mimicry",
				tag: "Quiet",
				category: "resistance",
				branch: "concealment",
				tier: 2,
				cost: 8,
				requires: ["lowSignal"],
				desc: "Further conceals the outbreak and delays research, at a cost to travel.",
				effects: { visibility: -12, cure: 0.9, travel: 0.85 },
			},
			stable: {
				name: "Stable Genome",
				tag: "Cure",
				category: "resistance",
				branch: "stability",
				tier: 1,
				cost: 3,
				desc: "A modest reduction in cure research. No mutation effects are active in this game.",
				effects: { cure: 0.95 },
			},
			climateShell: {
				name: "Climate Shell",
				tag: "Cold, dry",
				category: "resistance",
				branch: "adaptation",
				tier: 1,
				cost: 6,
				desc: "Helps in cold and dry regions, but slows travel between them.",
				effects: { climates: { cold: 1.3, dry: 1.3 }, travel: 0.9 },
			},
		},

		/* duration: days the event applies, starting the day after it rolls. weight: relative roll chance.
		 * stackable: may run twice at once (default no). needs: a condition name or list (see eventNeeds in plague-sim.js).
		 * responseAtLeast: the lowest response stage (index into response.stages) at which it can roll.
		 * conflicts: event ids that cannot run at the same time as this one (checked both ways).
		 * desc: the Active events line. start / end: one news entry each. */
		events: {
			rain: {
				name: "Heavy rain",
				duration: 3,
				weight: 3,
				effects: { routes: { river: 1.5, sea: 1.3 }, regions: { lake: 1.2 } },
				desc: "Water routes spread infection more easily.",
				start: "Heavy rain floods the rivers. Waterborne infection spreads more easily.",
				end: "The heavy rain eases.",
			},
			cold: {
				name: "Cold snap",
				duration: 4,
				weight: 3,
				/* A cold snap keeps people indoors and apart, a festival packs them into the streets: never both. */
				conflicts: ["festival"],
				effects: { spread: 0.75, regions: { north: 0.7 } },
				desc: "Infection spreads more slowly, especially in the North.",
				start: "A cold snap keeps people indoors and apart. Infection spreads more slowly.",
				end: "The cold snap ends.",
			},
			festival: {
				name: "Town festival",
				duration: 2,
				weight: 2,
				effects: { regions: { town: 1.6 } },
				desc: "Crowds pack the Town streets.",
				start: "A festival packs the Town streets.",
				end: "The festival is over.",
			},
			funding: {
				name: "Hospital funding",
				duration: 5,
				weight: 2,
				responseAtLeast: 2,
				effects: { cure: 1.6 },
				desc: "The hospital has extra money for cure research.",
				start: "The hospital gets emergency funding. Cure research speeds up.",
				end: "The emergency funding runs out.",
			},
			travelBan: {
				name: "Travel restrictions",
				duration: 5,
				weight: 2,
				responseAtLeast: 2,
				effects: { travel: 0.3 },
				desc: "Fewer people travel between regions.",
				start: "Roads and ferries close between regions.",
				end: "Travel restrictions are lifted.",
			},
		},
	});
})();
