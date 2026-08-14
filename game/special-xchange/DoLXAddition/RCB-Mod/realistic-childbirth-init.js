/*
 * "Realistic Childbirth" birth safety init / version gate
 * -------------------------------------------------------
 * Heavy validation + version-migration logic for the `$birth` object lives here in JS rather than in Twine macros, because:
 *   - timing is predictable (loaded once, before any passage renders),
 *   - nested-shape validation and early-return decision trees read cleanly,
 *   - real try/catch and console logging are available for debugging,
 *   - it is parsed once instead of on every widget call.
 *
 * The entry point is `setup.rcbBirthSafetyCheck()`, called at the very top of the `:: Childbirth` passage.
 * It implements this decision flow:
 *   $birth defined? ──► no ──► info lost ─► deduce location ─► EJECT
 *        │ yes
 *   $birth.version defined? ── no ──► info lost ─► deduce location ─► EJECT
 *        │ yes
 *   version current? ──► yes ──► CONTINUE
 *        │ no
 *   migrate via patch chain ──► ok ──► CONTINUE
 *                            └ fails ─► would cause problems ─► EJECT
 *
 * "EJECT" means the birth minigame can't run safely,
 * so the caller winds the encounter down through the normal `Childbirth End` routing for the deduced location (which still resolves the pregnancy),
 * instead of leaving the player soft-locked.
 */
(() => {
	"use strict";

	/*
	Current schema version of the `$birth` object.
	Bump this whenever the shape of `$birth` changes in a way that an in-progress save needs migrating for, and add a matching entry to `birthPatches` below.
	 */
	const RCB_BIRTH_VERSION = 1;

	/* Birth locations the encounter knows how to wind down (must match the `<<switch $birth.location>>` in the `Childbirth End` passage). */
	const RCB_LOCATIONS = ["hospital", "asylum", "wolf cave", "forest shop", "cottage", "prison", "bedroom", "tower", "waterdragon_nest", "waterdragon_lab"];

	/* Fetus species the birth prompt tables know how to narrate (must match the keys under setup.birthPrompts.stage/stageInitial/contractions). */
	const RCB_TYPES = ["human", "wolf", "hawk"];

	/* Map the player's current game location (`V.location`) onto a birth location, used to deduce where to route the player when `$birth.location` is missing. */
	const LOCATION_FROM_GAME = {
		hospital: "hospital",
		asylum: "asylum",
		forest_shop: "forest shop",
		forest_shop_garden: "forest shop",
		wolf_cave: "wolf cave",
		farm: "cottage",
		cottage: "cottage",
		prison: "prison",
		cell: "prison",
		prisoner: "prison",
		home: "bedroom",
		bedroom: "bedroom",
		tower: "tower",
		waterdragon_nest: "waterdragon_nest",
		waterdragon_lab: "waterdragon_lab",
	};

	const isObject = value => typeof value === "object" && value !== null;

	/*
	 * Version migration registry. 
	Each key `v` holds a function that upgrades a `$birth` object from version `v` to version `v + 1`, mutating it in place.
	The chain is walked one step at a time so multi-version jumps still work.
	 *
	 * There are no patches yet (current version is the first), but as an example:
	   0: birth => { birth.someNewField = birth.oldField ?? 0; delete birth.oldField; },
	 */
	const birthPatches = {};

	/* Figure out where to send the player when `$birth` can't be trusted.
	 * Prefers a valid location already on `$birth`, then the current game location, and falls back to "hospital" (the safe default). */
	function deduceBirthLocation() {
		const birth = V.birth;
		if (isObject(birth) && RCB_LOCATIONS.includes(birth.location)) {
			return birth.location;
		}
		const gameLocation = LOCATION_FROM_GAME[V.location];
		if (gameLocation === "bedroom") {
			// "Childbirth End" only routes "bedroom" to the Robin/Kylar/Solo *egg-laying* passages
			// (every real trigger that starts a bedroom birth hardcodes type: "hawk"). Routing a
			// human/wolf birth there would land it on egg-laying text instead of a birth ending,
			// so only take this fallback when it's actually an egg-laying birth.
			const isHawkBirth = (isObject(birth) && birth.type === "hawk") || (V.harpyEggs && V.harpyEggs.count > 0);
			if (isHawkBirth) {
				return "bedroom";
			}
		} else if (gameLocation) {
			return gameLocation;
		}
		return "hospital";
	}

	/* Figure out what species is being birthed when `$birth.type` can't be trusted. */
	function deduceBirthType() {
		const birth = V.birth;
		if (isObject(birth) && RCB_TYPES.includes(birth.type)) {
			return birth.type;
		}
		if (isObject(birth) && (birth.genital === "vagina" || birth.genital === "anus")) {
			const pregnancy = V.sexStats && V.sexStats[birth.genital] && V.sexStats[birth.genital].pregnancy;
			const fetusType = pregnancy && Array.isArray(pregnancy.fetus) && pregnancy.fetus[0] && pregnancy.fetus[0].type;
			if (RCB_TYPES.includes(fetusType)) {
				return fetusType;
			}
		}
		if (V.harpyEggs && V.harpyEggs.count > 0) {
			return "hawk";
		}
		return "human";
	}

	/* Walk the patch chain to bring `birth` up to RCB_BIRTH_VERSION.
	 * Returns true on success, false if migration is impossible or errors; i.e. the "is the version change going to cause problems?" decision. */
	function migrateBirth(birth) {
		let v = birth.version;

		// Save came from a NEWER mod version than is installed.
		// We can't know what changed, so treat it as unsupported rather than risk corrupting state.
		if (v > RCB_BIRTH_VERSION) {
			return false;
		}

		while (v < RCB_BIRTH_VERSION) {
			const patch = birthPatches[v];
			if (typeof patch !== "function") {
				// Gap in the patch chain: nothing knows how to upgrade this version.
				return false;
			}
			try {
				patch(birth);
			} catch (error) {
				console.error(`RCB: birth patch ${v} -> ${v + 1} threw`, error);
				return false;
			}
			// Patches may set the version themselves; otherwise advance it for them.
			if (birth.version === v) birth.version = v + 1;
			if (birth.version !== v + 1) {
				console.error(`RCB: birth patch ${v} left version at ${birth.version}`);
				return false;
			}
			v = birth.version;
		}
		return v === RCB_BIRTH_VERSION;
	}

	/* Build an "end the encounter prematurely" result, ensuring `$birth` exists and carries a routable location so `Childbirth End` can wind down cleanly. */
	function eject(reason) {
		if (!isObject(V.birth)) V.birth = {};
		const location = deduceBirthLocation();
		V.birth.location = location;
		console.warn(`RCB safety: ending childbirth encounter early — ${reason}; routing via "${location}".`);
		return { action: "eject", location, reason };
	}

	/*
	 * Entry point. Returns { action: "continue" } to run the birth normally, or { action: "eject", location, reason } to wind the encounter down safely.
	 */
	setup.rcbBirthSafetyCheck = function rcbBirthSafetyCheck() {
		const birth = V.birth;

		// "Is $birth defined?"
		if (!isObject(birth)) {
			return eject("$birth was undefined");
		}

		// On a brand-new birth, the version and full shape are stamped by the init block that runs immediately after this check,
		// so the version is legitimately absent here. Just guarantee a routable location and let init take over.
		if (V.childbirthstart === 1) {
			if (!RCB_LOCATIONS.includes(birth.location)) {
				birth.location = deduceBirthLocation();
			}
			return { action: "continue" };
		}

		// --- continuation round: the object should already be fully initialised ---

		// "Is $birth.version defined?"
		if (typeof birth.version !== "number") {
			return eject("$birth.version was undefined");
		}

		if (!RCB_LOCATIONS.includes(birth.location)) {
			return eject(`$birth.location was invalid: ${birth.location}`);
		}

		// Unlike location, an invalid/missing type is recoverable from the live pregnancy data, so repair it in place instead of ejecting the whole encounter.
		if (!RCB_TYPES.includes(birth.type)) {
			const badType = birth.type;
			birth.type = deduceBirthType();
			console.warn(`RCB safety: $birth.type was invalid (${badType}); repaired to "${birth.type}".`);
		}

		// "Is version current?"
		if (birth.version === RCB_BIRTH_VERSION) {
			return { action: "continue" };
		}

		// Not current: "apply patch or leave unsupported" / "going to cause problems?"
		if (migrateBirth(birth)) {
			return { action: "continue" };
		}
		return eject(`$birth.version ${birth.version} could not be migrated to ${RCB_BIRTH_VERSION}`);
	};

	/* Generic, species-neutral filler used by rcbNormalizeBirthPrompts() when a location has no authored text at all for a given fetus type */
	const RCB_GENERIC_STAGE = [
		[["A contraction rolls through you. All you can do is breathe and wait it out."], ["default"]],
		[["The contractions are getting stronger and closer together."], ["default"]],
		[["Your body tenses hard around the pressure building inside you."], ["default"]],
		[["The urge to push is impossible to ignore now."], ["default"]],
		[["You push with the contraction, bracing yourself against it."], ["default"]],
		[["You can feel it crowning. You keep pushing, shaking with the effort."], ["default"]],
		[["The widest part is passing. You can't rush it. All you can do is push when your body tells you to."], ["default"]],
		[["With a final push, the pressure gives way."], ["default"]],
		[["You aren't done yet. You can feel another one on the way."], ["default"]],
		[["You have finally finished giving birth."], ["default"]],
	];
	const RCB_GENERIC_CONTRACTIONS = [
		["You feel a cramp hit you.", "You feel mild cramps.", "Your body relaxes as the cramps relent."],
		["You feel the contractions grip you.", "You endure a stronger contraction than usual.", "You take a small moment to catch your breath."],
		["The contractions grip your body hard.", "The pain lessens, but there's little reprieve."],
		["The pressure in your pelvis feels immense and unrelenting.", "The contractions lessen for a moment."],
		["You feel like you're at your limit, but the contractions continue.", "The pain lessens momentarily."],
		["The contractions continue despite how tiring they are.", "The contractions yield, but not entirely."],
		["The contractions continue despite how tiring they are.", "The contractions yield, but not entirely."],
		["The pressure is suddenly relieved."],
		["The contractions ease for a moment while your body gathers itself."],
		["The contractions stop."],
	];
	const RCB_GENERIC_BOUND = [
		"Your right arm jerks against its bonds as someone releases you from them.",
		"Your right arm is released from a painful bind.",
		"Your right arm lies limp as the bonds are removed.",
		"Your right arm is freed from its bonds.",
	];

	/* Backfill any RCB_LOCATIONS x RCB_TYPES combination the authored data doesn't cover */
	setup.rcbNormalizeBirthPrompts = function rcbNormalizeBirthPrompts() {
		const prompts = setup.birthPrompts;
		if (!isObject(prompts)) return;

		["stage", "stageInitial"].forEach(table => {
			const byLocation = prompts[table];
			if (!isObject(byLocation)) return;
			RCB_LOCATIONS.forEach(location => {
				if (!isObject(byLocation[location])) byLocation[location] = {};
				const byType = byLocation[location];
				RCB_TYPES.forEach(type => {
					if (!Array.isArray(byType[type])) byType[type] = RCB_GENERIC_STAGE;
				});
			});
		});

		if (!isObject(prompts.contractions)) prompts.contractions = {};
		RCB_TYPES.forEach(type => {
			if (!Array.isArray(prompts.contractions[type])) prompts.contractions[type] = RCB_GENERIC_CONTRACTIONS;
		});

		if (!isObject(prompts.bound)) prompts.bound = {};
		RCB_LOCATIONS.forEach(location => {
			if (!Array.isArray(prompts.bound[location])) prompts.bound[location] = RCB_GENERIC_BOUND;
		});
	};

	// Expose the version + helpers for reuse (e.g. by the init block / other mods).
	setup.RCB_BIRTH_VERSION = RCB_BIRTH_VERSION;
	setup.rcbBirthPatches = birthPatches;
	setup.rcbDeduceBirthLocation = deduceBirthLocation;
	setup.rcbDeduceBirthType = deduceBirthType;
})();
