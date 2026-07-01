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
	const RCB_LOCATIONS = ["hospital", "asylum", "wolf cave", "cottage", "prison", "bedroom", "tower"];

	/* Map the player's current game location (`V.location`) onto a birth location, used to deduce where to route the player when `$birth.location` is missing. */
	const LOCATION_FROM_GAME = {
		hospital: "hospital",
		asylum: "asylum",
		wolf_cave: "wolf cave",
		farm: "cottage",
		cottage: "cottage",
		prison: "prison",
		cell: "prison",
		prisoner: "prison",
		home: "bedroom",
		bedroom: "bedroom",
		tower: "tower",
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
		if (LOCATION_FROM_GAME[V.location]) {
			return LOCATION_FROM_GAME[V.location];
		}
		return "hospital";
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

	// Expose the version + helpers for reuse (e.g. by the init block / other mods).
	setup.RCB_BIRTH_VERSION = RCB_BIRTH_VERSION;
	setup.rcbBirthPatches = birthPatches;
	setup.rcbDeduceBirthLocation = deduceBirthLocation;
})();
