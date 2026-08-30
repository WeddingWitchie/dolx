/**
 * D.N.A. moved/split some reusable X-Change misc/helper widgets out of `xchange.twee` and into this file:
 * - `koztools.twee` is for shared utility widgets, small UI helpers, and misc glue
 * - Main X-Change pill/effect/body handling should remain in `xchange.twee`
 * - Gender-identity logic remains split across `identity.twee`, `identity.js`
 * - Any still-live compatibility helpers in `xchange.js`
 * =========================
 * Important!
 * If what you're looking for isn't defined here, check other files too.
 */

function kofiValidate(code) {
	const versionNumber = window.StartConfig.version;

	const versionMatch = versionNumber.match(/DoLX (\d+)\.(\d+)\.(\d+)\w{0,1}/);
	if (!versionMatch) {
		throw new Error("Version number doesn't match convention.");
	}

	const codeMatch = code.match(/(\d+)[A-Z]{3}(\w)[A-Z]{1}(\w)[A-Z]{1,3}(\d+)/);
	if (codeMatch === null) return 0;

	const verMajor = codeMatch[1];
	const codeMajor = codeMatch[2];
	const codeMinor = codeMatch[3];
	const verMinor = Math.sqrt(codeMatch[4]);

	const majorHash = String.fromCharCode(((verMajor << 11) % 25) + 65);
	const minorHash = String.fromCharCode(((verMinor << 11) % 25) + 65);

	const isValid = versionMatch[1] >= verMajor && versionMatch[2] >= verMinor && codeMajor === majorHash && codeMinor === minorHash;

	if (isValid) {
		return +verMajor * 1000 + +verMinor;
	} else {
		return 0;
	}
}
window.kofiValidate = kofiValidate;

function wornSetupClothes(slot) {
	return setup.clothes[slot][clothesIndex(slot, V.worn[slot])];
}
window.wornSetupClothes = wornSetupClothes;

// ==================================================
// GLOBAL MOD HELPER
// ==================================================
// Keeps the "Currently used: he/him | she/her | they/them" pronoun summary in the Identity settings tab live,
// since radiobutton/checkbox clicks there don't trigger a full passage re-render (see settingsDisableElement).
function updatePronounSummary() {
	$(() => {
		const el = jQuery("#pronoun-current-label");
		if (!el.length) return;
		const updateText = () => {
			el.text(typeof window.pronounSummaryLabel === "function" ? window.pronounSummaryLabel() : "they / them");
		};
		updateText();
		[
			"identity.presentation.pronouns.masculine.acceptance",
			"identity.presentation.pronouns.masculine.reject",
			"identity.presentation.pronouns.feminine.acceptance",
			"identity.presentation.pronouns.feminine.reject",
			"identity.presentation.pronouns.neutral.acceptance",
			"identity.presentation.pronouns.neutral.reject",
			"identity.presentation.pronouns.preferredMasculine",
			"identity.presentation.pronouns.preferredFeminine",
			"identity.presentation.pronouns.preferredNeutral",
			"identity.presentation.pronouns.pronounDynamicMode",
			"identity.presentation.appearance.preferred",
			"identity.presentation.clothing.preferred",
		].forEach(name => $("[name$='" + Util.slugify(name) + "']").on("change", updateText));
	});
}
window.updatePronounSummary = updatePronounSummary;

(() => {
	// Ensure setup exists
	if (typeof window.setup !== "object" || window.setup === null) {
		window.setup = {};
	}

	// Ensure Math.clamp exists (some forks have it, some don't)
	if (typeof Math.clamp !== "function") {
		Math.clamp = (n, min, max) => Math.min(max, Math.max(min, n));
	}

	// Valid bodysize values in build
	setup.bodySizeSteps = [-1, 0, 1, 2, 2.5, 3, 4];

	// Snap any number to nearest valid bodysize step
	setup.snapBodySize = function (v) {
		v = Number(v);
		if (!Number.isFinite(v)) return 2;

		let best = setup.bodySizeSteps[0];
		let bestD = Math.abs(v - best);

		for (const s of setup.bodySizeSteps) {
			const d = Math.abs(v - s);
			if (d < bestD) {
				best = s;
				bestD = d;
			}
		}
		return best;
	};

	// Move by N steps in the discrete list (prevents 1.5 / 3.5 etc)
	setup.stepBodySize = function (cur, stepDelta) {
		cur = setup.snapBodySize(cur);
		stepDelta = Math.trunc(Number(stepDelta) || 0);

		const arr = setup.bodySizeSteps;
		let idx = arr.indexOf(cur);
		if (idx < 0) idx = arr.indexOf(2);

		let next = idx + stepDelta;
		next = Math.clamp(next, 0, arr.length - 1);

		return arr[next];
	};

	setup.bodySizeStealthModifier = function (v) {
		return (3 - setup.bodySizeSteps.indexOf(setup.snapBodySize(v))) * 50;
	};

	setup.bodySizeIntimidationRange = function (v, submissive) {
		const size = setup.snapBodySize(v);
		const sizeModifier = (setup.bodySizeSteps.indexOf(size) - 3) * 100;
		const dominantSmallModifier = size <= 1 && Number(submissive) <= 850 ? 250 : 0;
		return Math.clamp(1000 + sizeModifier + dominantSmallModifier, 700, 1400);
	};
})();

(() => {
	// Ensure setup exists
	if (typeof window.setup !== "object" || window.setup === null) {
		window.setup = {};
	}

	// Ensure Math.clamp exists
	if (typeof Math.clamp !== "function") {
		Math.clamp = (n, min, max) => Math.min(max, Math.max(min, n));
	}

	// Back-compat: old saves may be missing newer X-Change pill fields.
	// We only fill in missing fields; we don't wipe or rewrite existing data.
	setup.xchangeEnsurePillDefaults = function () {
		const V = State?.variables;
		const pill = V?.xchange?.pill;
		if (!pill) return;

		// effectsKnown was introduced later; if missing and the pill is active or any effect is present,
		// assume the player is aware (they'd notice the changes anyway).
		if (pill.effectsKnown === undefined) {
			const hasAnyEffect =
				!!pill.fertile ||
				!!pill.breederEffect ||
				!!pill.bullEffect ||
				!!pill.omegaEffect ||
				!!pill.alphaEffect ||
				!!pill.genderflipEffect ||
				!!pill.genderificationEffect ||
				!!pill.hermEffect ||
				!!pill.resistanceEffect ||
				!!pill.continueEffect ||
				!!pill.portalEffect;

			pill.effectsKnown = !!pill.active || hasAnyEffect;
		}
		// Zero means no tester reading.
		// A positive roll both records that the duration was tested and keeps its approximate week wording stable between Traits-panel redraws.
		if (pill.durationDetailRoll === undefined) pill.durationDetailRoll = 0;
	};

	// Back-compat: older saves may be missing or have invalid scalar X-Change fields that core game code expects.
	setup.xchangeEnsureCompatGlobals = function () {
		const V = State?.variables;
		if (!V) return;
		V.xchange ??= {};
		V.xchange.heat ??= {};
		if (V.xchange.heat.permanentOn === undefined) {
			V.xchange.heat.permanentOn = 0;
		}
		// Default: heat is resisted by high willpower (the vanilla behavior).
		// Missing reads as falsy, which would make heat always override, so restore the intended default here.
		if (V.xchange.heat.resistWithWillpower === undefined) {
			V.xchange.heat.resistWithWillpower = 1;
		}

		// Older saves stored these as booleans while their checkboxes and the settings export treat them as 0/1.
		for (const key of ["systemOn", "permanentOn", "resistWithWillpower"]) {
			if (typeof V.xchange.heat[key] === "boolean") {
				V.xchange.heat[key] = V.xchange.heat[key] ? 1 : 0;
			}
		}

		// Alpha/Beta/Omega pill settings.
		// Body-changing options default off to avoid changing existing saves on load. Flavour-only options default on.
		if (V.xchange.omegaNeedsNoVagina === undefined) V.xchange.omegaNeedsNoVagina = 0;
		if (V.xchange.alphaGrowsPenis === undefined) V.xchange.alphaGrowsPenis = 0;
		if (V.xchange.aboDrivesHeat === undefined) V.xchange.aboDrivesHeat = 1;
		if (V.xchange.pheromoneAllure === undefined) V.xchange.pheromoneAllure = 1;
		for (const key of ["omegaNeedsNoVagina", "alphaGrowsPenis", "aboDrivesHeat", "pheromoneAllure"]) {
			if (typeof V.xchange[key] === "boolean") V.xchange[key] = V.xchange[key] ? 1 : 0;
		}

		// story-functions.js uses V.xchange.breederDenial in arithmetic.
		// If it's missing or invalid, recover the bounded feature default so heat math doesn't become NaN.
		const bd = Number(V.xchange.breederDenial);
		if (!Number.isFinite(bd)) {
			V.xchange.breederDenial = 0;
		} else {
			V.xchange.breederDenial = Math.clamp(bd, 0, 6);
		}

		// story-functions.js also gates heat when pregnant using V.pregnancyStats.heatStillEnabled
		V.pregnancyStats ??= {};
		if (typeof V.pregnancyStats.heatStillEnabled !== "boolean") {
			try {
				V.pregnancyStats.heatStillEnabled = typeof playerIsPregnant === "function" ? !playerIsPregnant() : true;
			} catch (e) {
				V.pregnancyStats.heatStillEnabled = true;
			}
		}

		// Ensure $ballssize always exists (female-start characters may never have it initialised, which causes NaN when save-body runs Number($ballssize)).
		const balls = Number(V.ballssize);
		if (!Number.isFinite(balls)) {
			const penisSize = Number(V.player?.penissize);
			V.ballssize = V.player?.ballsExist && Number.isFinite(penisSize) ? Math.clamp(penisSize, 0, 6) : 0;
		} else {
			V.ballssize = Math.clamp(balls, 0, 6);
		}

		// Body-size bounds are static limits. If an old save has broken bounds, restore the known ranges so transformed bodies can be generated without writing NaN body sizes.
		const repairBounds = (minKey, maxKey, fallbackMin, fallbackMax) => {
			const min = Number(V[minKey]);
			const max = Number(V[maxKey]);
			if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
				V[minKey] = fallbackMin;
				V[maxKey] = fallbackMax;
			} else {
				V[minKey] = min;
				V[maxKey] = max;
			}
		};
		repairBounds("breastsizemin", "breastsizemax", 0, 12);
		repairBounds("bottomsizemin", "bottomsizemax", 0, 8);
		repairBounds("penissizemin", "penissizemax", 0, 6);
		repairBounds("ballssizemin", "ballssizemax", 0, 6);
	};

	setup.xchangeEnsureAlphaUsable = function () {
		const V = State?.variables;
		const pill = V?.xchange?.pill;
		if (!pill?.active || !pill.alphaEffect || !V.player?.penisExist) return;
		const penisSize = Number(V.player.penissize);
		if (Number.isFinite(penisSize) && penisSize >= 2) return;
		if (pill.alphaPenisSizeBoost !== true) {
			pill.alphaPenisSizeBoost = true;
			pill.alphaPenisSizePrevious = Number.isFinite(penisSize) ? penisSize : 0;
		}
		V.player.penissize = 2;
	};

	setup.xchangeRepairParasiteDisplayCache = function () {
		const V = State?.variables;
		const parasite = V?.parasite;
		if (!parasite || typeof parasite !== "object" || Array.isArray(parasite)) return false;

		// Fallbacks mirror <<parasiteinit>> (game/base-system/parasites.twee) exactly; keep them in sync if base-DoL adds body parts.
		const bodyparts = Array.isArray(parasite.bodyparts)
			? parasite.bodyparts
			: [
					"nipples",
					"bottom",
					"breasts",
					"penis",
					"balls",
					"clit",
					"anus",
					"vagina",
					"labia",
					"left_thigh",
					"right_thigh",
					"left_foot",
					"right_foot",
					"left_arm",
					"right_arm",
					"left_hand",
					"right_hand",
					"tummy",
					"back",
					"face",
					"mouth",
					"left_ear",
					"right_ear",
					"hair",
			  ];
		const types = Array.isArray(parasite.types) ? parasite.types : ["urchin", "slime", "maggot", "parasite"];
		// The "parasite" type (chastity/ear-slime genital parasite) is always applied with the "noSuck" flag, so base-DoL never lists it in the display-cache arrays and renders it separately from slots (caption.twee).
		// Rebuilding it here would double-display it, so it is deliberately excluded and its array is forced empty below.
		const displayTypes = types.filter(type => type !== "parasite");
		const rebuilt = {};

		for (const type of types) rebuilt[type] = [];

		for (const part of bodyparts) {
			if (part === "left_ear" || part === "right_ear") continue;
			const slot = parasite[part];
			if (!slot || typeof slot !== "object" || Array.isArray(slot)) continue;
			const name = slot.name;
			if (!displayTypes.includes(name)) continue;
			const label = part.replace(/_/g, " ");
			if (!rebuilt[name].includes(label)) rebuilt[name].push(label);
		}

		let changed = false;
		for (const type of types) {
			const current = Array.isArray(parasite[type]) ? parasite[type] : [];
			const next = rebuilt[type] || [];
			if (current.length !== next.length || current.some((value, index) => value !== next[index])) changed = true;
			parasite[type] = next;
		}

		return changed;
	};

	// Ear slime is GLOBAL (it lives in the player's head, not a body), so it must survive body swaps even though wild parasites are body-scoped.
	// Both parasiteinit and restoring a body's parasite snapshot replace the whole $parasite object and would wipe the ear slots;
	// capture them first, then re-apply with xchangeRestoreEarParasites so the ear slime rides along.
	setup.xchangeCaptureEarParasites = function () {
		const V = State?.variables;
		const parasite = V?.parasite;
		const cloneFn = typeof clone === "function" ? clone : o => JSON.parse(JSON.stringify(o));
		const grab = part => {
			const slot = parasite && parasite[part];
			return slot && typeof slot === "object" && !Array.isArray(slot) ? cloneFn(slot) : {};
		};
		return { left_ear: grab("left_ear"), right_ear: grab("right_ear") };
	};

	setup.xchangeRestoreEarParasites = function (captured) {
		const V = State?.variables;
		const parasite = V?.parasite;
		if (!parasite || typeof parasite !== "object" || Array.isArray(parasite)) return;
		if (!captured || typeof captured !== "object") return;
		const cloneFn = typeof clone === "function" ? clone : o => JSON.parse(JSON.stringify(o));
		for (const part of ["left_ear", "right_ear"]) {
			const slot = captured[part];
			parasite[part] = slot && typeof slot === "object" && !Array.isArray(slot) ? cloneFn(slot) : {};
		}
	};

	/**
	 * Reshapes a worn chastity device to fit the player's current body.
	 *
	 * Call this AFTER penisExist/vaginaExist are updated.
	 * The item's .variable stays unchanged so it remains the same owned item. Only its shape-related fields are changed.
	 * Use .type to check its current shape, not .variable.
	 *
	 * Returns: "feminize", "butchify", "fellOff", or null if nothing changed.
	 */
	setup.xchangeAdaptChastityToBody = function () {
		const V = State?.variables;
		const worn = V?.worn?.genitals;
		if (!worn || !Array.isArray(worn.type) || !worn.type.includes("chastity")) return null;
		// A chastity parasite is living slime rather than a metal device; it already fits whatever body it is on.
		if (worn.name === "chastity parasite") return null;

		const cloneFn = typeof clone === "function" ? clone : o => JSON.parse(JSON.stringify(o));
		const isCage = worn.type.includes("cage") && !worn.type.includes("hidden");
		const isBelt = worn.type.includes("hidden") && !worn.type.includes("cage");
		const rename = (from, to) => {
			const swap = text =>
				typeof text === "string" ? text.replace(new RegExp(`\\b${from}\\b`, "gi"), m => (m[0] === m[0].toUpperCase() ? to.toUpperFirst() : to)) : text;
			worn.name = swap(worn.name);
			// name_cap is what the statistics overlay and other capitalised references print, so it has to follow the name.
			worn.name_cap = swap(worn.name_cap);
		};
		const setType = (tag, present) => {
			const at = worn.type.indexOf(tag);
			if (present && at === -1) worn.type.push(tag);
			else if (!present && at !== -1) worn.type.splice(at, 1);
		};

		if (isCage && !V.player?.penisExist) {
			// Nothing left to cage.
			// A bought cage is not a curse forcing it to stay, so it simply comes off into the wardrobe back home.
			// Without somewhere to put it the device would be destroyed, so in that case reshape it instead of losing it.
			if (worn.cursed === 0 && Array.isArray(V.wardrobe?.genitals)) {
				V.wardrobe.genitals.push(cloneFn(worn));
				V.worn.genitals = cloneFn(setup.clothes.genitals[0]);
				return "fellOff";
			}
			setType("cage", false);
			setType("hidden", true);
			// Every belt in the catalogue is "constricting" and no cage is; pregnancy checks read this, so it has to follow the shape.
			setType("constricting", true);
			worn.exposed = 0;
			worn.exposed_base = 0;
			rename("cage", "belt");
			return "feminize";
		}

		if (isBelt && V.player?.penisExist && !V.player?.vaginaExist && !V.xchange?.chastityKeepBeltShape) {
			setType("hidden", false);
			setType("cage", true);
			setType("constricting", false);
			worn.exposed = 1;
			worn.exposed_base = 1;
			rename("belt", "cage");
			return "butchify";
		}

		return null;
	};

	// GI safety: keep the Gender Identity drift system truly OFF unless explicitly enabled, and prevent "armed" drift/stage from firing later.
	setup.xchangeEnsureGiSafety = function () {
		const V = State?.variables;
		if (!V) return;
		V.xchange ??= {};
		const x = V.xchange;

		const toStrictBool = v => v === true || v === 1 || v === "true";

		if (x.genderIdentityEnabled === undefined) x.genderIdentityEnabled = true;
		x.genderIdentityEnabled = toStrictBool(x.genderIdentityEnabled);

		x.giAutoEnabled = toStrictBool(x.giAutoEnabled);
		x.giTransformEnabled = toStrictBool(x.giTransformEnabled);
		if (Object.hasOwn(x, "giTransformConsent")) delete x.giTransformConsent;

		// Complete the existing single-to-dual genital preference migration on normal loads too.
		// New and same-version saves can otherwise keep the legacy field until the Identity screen is opened.
		const genitals = V.identity?.body?.genitals;
		if (genitals && typeof genitals === "object" && !Array.isArray(genitals)) {
			const penisPreferences = ["tinypenis", "smallpenis", "mediumpenis", "bigpenis"];
			if (genitals.preferredVagina === undefined) genitals.preferredVagina = genitals.preferred === "vagina";
			if (genitals.preferredPenis === undefined) {
				genitals.preferredPenis = penisPreferences.includes(genitals.preferred) ? genitals.preferred : false;
			}
		}

		const drift = Number(x.giDrift);
		x.giDrift = Number.isFinite(drift) && drift >= 0 ? drift : 0;
		const stage = Number(x.giShiftStage);
		x.giShiftStage = stage === 3 ? 2 : [0, 1, 2].includes(stage) ? stage : 0;
		if (!["", "f", "m"].includes(x.giShiftMode)) x.giShiftMode = "";

		// Lock behind the same unlock the UI uses.
		// identityCap is NOT checked here; it controls how far the meter can drift, not whether the system is enabled.
		// The genderidentity widget already enforces the cap floor when identityCap is true.
		const unlocked = V.attitudesControl?.unlockGender === true;
		if (!unlocked) {
			x.giAutoEnabled = false;
			x.giTransformEnabled = false;
		}

		// Body changes require daily drift.
		// If "Update Gender Identity" is off, "Allow slow body changes" is also turned off to prevent inconsistent saves.
		if (x.giAutoEnabled !== true) x.giTransformEnabled = false;

		// If the system isn't fully enabled, clear queued drift/stage so it can't "fire later".
		if (x.giAutoEnabled !== true || x.giTransformEnabled !== true) {
			x.giDrift = 0;
			x.giShiftStage = 0;
			x.giShiftMode = "";
		}
	};

	const runXChangeLoadCompat = () => {
		if (V.xchange && Object.hasOwn(V.xchange, "_debugEffectHistory")) delete V.xchange._debugEffectHistory;
		try {
			setup.xchangeEnsurePillDefaults();
		} catch (e) {}
		try {
			setup.xchangeEnsureCompatGlobals();
		} catch (e) {}
		try {
			setup.xchangeEnsureAlphaUsable();
		} catch (e) {}
		try {
			setup.xchangeRepairParasiteDisplayCache();
		} catch (e) {}
		try {
			setup.xchangeEnsureGiSafety();
		} catch (e) {}
	};

	// Run once now, then when a save is loaded. These are compatibility fills for old/missing setup, not an every-passage data cleaner.
	runXChangeLoadCompat();

	if (typeof jQuery === "function") {
		jQuery(document).on(":onloadsave", runXChangeLoadCompat);
		jQuery(document).on(":passagestart", () => {
			try {
				setup.xchangeEnsurePillDefaults();
			} catch (e) {}
		});
	}
})();

// ---------- X-CHANGE SAVE REPAIR NOTICE ----------
window.xChangeQueueNotice = function (id, html) {
	const V = typeof State !== "undefined" && State.variables ? State.variables : window.V;
	if (!V) return;

	V.xChangeFlags ??= {};
	if (V.xChangeFlags[id]) return;

	V.xChangeNotices ??= [];
	V.xChangeNotices.push({ id, html });
};

(function () {
	function renderNotices() {
		const V = typeof State !== "undefined" && State.variables ? State.variables : window.V;
		if (!V?.xChangeNotices?.length) return;

		V.xChangeFlags ??= {};

		const passEl = document.querySelector("#passage") || document.querySelector(".passage");
		if (!passEl) return;

		while (V.xChangeNotices.length) {
			const n = V.xChangeNotices.shift();
			if (!n || !n.id || V.xChangeFlags[n.id]) continue;

			V.xChangeFlags[n.id] = true;

			const box = document.createElement("div");
			box.innerHTML = n.html;
			box.style.cssText = [
				"border:2px solid #ff4d4d",
				"background:rgba(255,0,0,0.12)",
				"color:#ffb3b3",
				"padding:12px 12px",
				"border-radius:8px",
				"margin:0 0 14px 0",
				"font-size:1em",
				"line-height:1.4",
				"word-break:break-word",
				"overflow-wrap:anywhere",
				"box-sizing:border-box",
			].join(";");

			passEl.prepend(box);
		}
	}

	if (window.jQuery) {
		jQuery(document).on(":passagedisplay", renderNotices);
	} else {
		document.addEventListener(":passagedisplay", renderNotices);
	}
})();

function xChangeCachedBodyUsable(slotName) {
	const pill = V.xchange?.pill;
	if (!pill) return false;

	const prop = slotName === "genderswapped" ? "changedBody" : slotName === "herm" ? "hermBody" : slotName;
	const body = pill[prop];
	if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length === 0) return false;

	if (window.xChangeBodySnapshotUsable(body)) return true;

	setup.xChangeRepairNoticeOnce(
		`xchange_invalid_cached_${prop}`,
		`<b>X-Change cache notice</b><br>X-Change found an invalid generated body cache (<b>${slotName}</b>). It was not loaded; the body will be regenerated through the normal X-Change path.<br><br><b>Please report this with your save and steps if the new body looks wrong.</b>`
	);
	try {
		console.warn("Invalid generated body cache; regenerating", { slotName, prop, body });
	} catch (e) {}
	if (typeof Errors !== "undefined" && typeof Errors.report === "function") {
		Errors.report(`X-Change found an invalid generated body cache (${slotName}) and regenerated it.`, { slotName, prop, body });
	}
	pill[prop] = {};
	return false;
}
window.xChangeCachedBodyUsable = xChangeCachedBodyUsable;
setup.xChangeCachedBodyUsable = xChangeCachedBodyUsable;

// ==================================================
// OTHER FUNCTIONAL HELPER
// ==================================================
function pruneNPCName() {
	const V = State.variables;
	if (!Array.isArray(V.NPCName) || !Array.isArray(V.NPCNameList)) return;

	const allowed = new Set(setup.NPCNameList);
	for (let i = V.NPCName.length - 1; i >= 0; i--) {
		const nam = V.NPCName[i]?.nam;
		if (typeof nam !== "string" || !allowed.has(nam)) V.NPCName.splice(i, 1);
	}

	const have = new Set(V.NPCName.map(n => n?.nam).filter(n => typeof n === "string"));
	for (let i = V.NPCNameList.length - 1; i >= 0; i--) {
		if (!have.has(V.NPCNameList[i])) V.NPCNameList.splice(i, 1);
	}
}
window.pruneNPCName = pruneNPCName;

function pruneFoodstuff() {
	const V = State.variables;
	const catalog = setup.foodstuff;
	if (!catalog || typeof catalog !== "object") return;

	const allowed = new Set(Object.keys(catalog));
	const pruned = new Set();

	for (const dictName of ["foodstuff", "stall_stats"]) {
		const dict = V[dictName];
		if (!dict || typeof dict !== "object" || Array.isArray(dict)) continue;
		for (const key of Object.keys(dict)) {
			if (allowed.has(key)) continue;
			delete dict[key];
			pruned.add(key);
		}
	}

	if (Array.isArray(V.plants_known)) {
		for (let i = V.plants_known.length - 1; i >= 0; i--) {
			const key = V.plants_known[i];
			if (typeof key === "string" && allowed.has(key)) continue;
			V.plants_known.splice(i, 1);
			pruned.add(key);
		}
	}

	/* Beds planted with a foreign crop: reset the bed (mirrors clear_plot), never delete it. */
	if (V.plots && typeof V.plots === "object") {
		for (const plots of Object.values(V.plots)) {
			if (!Array.isArray(plots)) continue;
			for (const plot of plots) {
				if (!plot || typeof plot !== "object") continue;
				if (plot.plant === undefined || plot.plant === "none" || allowed.has(plot.plant)) continue;
				pruned.add(plot.plant);
				plot.plant = "none";
				plot.stage = 0;
				plot.days = 0;
				plot.water = 0;
				plot.till = 0;
			}
		}
	}

	/* Scalar foodstuff-key vars. Stall selection uses unset as its idle state;
	 Avery's dinner request falls back to its routine-start default. */
	for (const varName of ["stall_foodstuff", "stall_expensive", "lastRecipeViewed"]) {
		if (V[varName] === undefined || allowed.has(V[varName])) continue;
		pruned.add(V[varName]);
		delete V[varName];
	}
	if (V.avery_mansion && typeof V.avery_mansion === "object") {
		if (V.avery_mansion.food !== undefined && V.avery_mansion.food !== "none" && !allowed.has(V.avery_mansion.food)) {
			pruned.add(V.avery_mansion.food);
			V.avery_mansion.food = "hamburger";
		}
		if (V.avery_mansion.food_last !== undefined && V.avery_mansion.food_last !== "none" && !allowed.has(V.avery_mansion.food_last)) {
			pruned.add(V.avery_mansion.food_last);
			V.avery_mansion.food_last = "none";
		}
	}

	if (pruned.size) console.warn("Pruned foodstuff entries unknown to this mod from the save.", [...pruned]);
}
window.pruneFoodstuff = pruneFoodstuff;

/* Drop unresolvable or malformed saved clothing (worn/carried/wardrobes/store), plus temporary storage placeholders that escaped into an equipped slot or wardrobe.
   Mirrors clothesIndex()'s own matching rules (variable+modder, variable-only, then oldVariable/name recovery) so anything the game can still resolve is left alone. */
function pruneClothes() {
	const V = State.variables;
	if (!setup?.clothes || !Array.isArray(setup.clothes_all_slots)) return;

	const pruned = new Set();
	const skippedNames = new Set(setup.wardrobeSkip || []);
	const catalogLookups = new Map();
	const namedWardrobes =
		V.wardrobes && typeof V.wardrobes === "object"
			? Object.entries(V.wardrobes).filter(([name, wardrobe]) => name !== "wardrobe" && wardrobe && typeof wardrobe === "object")
			: [];

	/* A large wardrobe used to rescan the entire clothing catalogue up to four times
	   for every saved item. Build the same matching keys once per slot instead. */
	for (const slot of setup.clothes_all_slots) {
		const catalog = setup.clothes[slot];
		if (!Array.isArray(catalog)) continue;
		const lookup = {
			variables: new Set(),
			names: new Set(),
			oldNamesByVariable: new Map(),
		};
		for (const ref of catalog) {
			lookup.variables.add(ref.variable);
			lookup.names.add(ref.name);
			if (!Array.isArray(ref.oldVariable)) continue;
			for (const old of ref.oldVariable) {
				if (!lookup.oldNamesByVariable.has(old.variable)) lookup.oldNamesByVariable.set(old.variable, new Set());
				lookup.oldNamesByVariable.get(old.variable).add(old.name);
			}
		}
		catalogLookups.set(slot, lookup);
	}

	function isKnownItem(slot, item) {
		const lookup = catalogLookups.get(slot);
		if (!lookup) return true;
		if (!item?.name || !item.variable) return false;
		if (lookup.variables.has(item.variable)) return true;
		if (lookup.oldNamesByVariable.get(item.variable)?.has(item.name)) return true;
		return lookup.names.has(item.name);
	}

	for (const slot of setup.clothes_all_slots) {
		/* $worn / $carried: one item per slot; reset to the slot's naked default when unresolvable. */
		for (const dictName of ["worn", "carried"]) {
			const item = V[dictName]?.[slot];
			if (!item?.temp && isKnownItem(slot, item)) continue;
			pruned.add(`${dictName}.${slot}:${item?.variable || item?.name || "invalid"}`);
			const fallback = setup.clothes[slot]?.[0];
			if (fallback) V[dictName][slot] = clone(fallback);
		}

		/* $wardrobe: array per slot. */
		if (Array.isArray(V.wardrobe?.[slot])) {
			V.wardrobe[slot] = V.wardrobe[slot].filter(item => {
				if (!item?.temp && !skippedNames.has(item?.name) && isKnownItem(slot, item)) return true;
				pruned.add(`wardrobe.${slot}:${item?.variable || item?.name || "invalid"}`);
				return false;
			});
		}

		/* $wardrobes.*: array per slot for every named wardrobe except the metadata-only "wardrobe" entry. */
		if (namedWardrobes.length) {
			for (const [name, wd] of namedWardrobes) {
				if (!wd || !Array.isArray(wd[slot])) continue;
				wd[slot] = wd[slot].filter(item => {
					if (!item?.temp && !skippedNames.has(item?.name) && isKnownItem(slot, item)) return true;
					pruned.add(`wardrobes.${name}.${slot}:${item?.variable || item?.name || "invalid"}`);
					return false;
				});
			}
		}

		/* $store: array per slot. */
		if (Array.isArray(V.store?.[slot])) {
			V.store[slot] = V.store[slot].filter(item => {
				if (item?.temp || isKnownItem(slot, item)) return true;
				pruned.add(`store.${slot}:${item?.variable || item?.name || "invalid"}`);
				return false;
			});
		}
	}

	if (pruned.size) console.warn("Pruned clothing entries unknown to this mod from the save.", [...pruned]);
}
window.pruneClothes = pruneClothes;

function updateDynamicStatCaps() {
	const V = State.variables;
	if (!window.C || !C.tiredness) return;
	if (V.tirednessMaxScalingToggle && typeof currentSkillValue === "function") {
		C.tiredness.max = 2000 + Math.floor(currentSkillValue("physique", 0, 1) / 32);
	} else {
		C.tiredness.max = 2000;
	}
	if (V.stressMaxScalingToggle) {
		const willpower = V.xchange?.willpowerSystemEnabled === 1 ? Math.max(0, Number(V.xchange.willpowerPoints) || 0) : currentSkillValue("willpower", 0, 1);
		V.stressmax = 10000 + Math.floor(willpower * 5);
	} else {
		V.stressmax = 10000;
	}
}
window.updateDynamicStatCaps = updateDynamicStatCaps;

/**
 * Dodge ceilings by body size.
 *
 * Small bodies can build an evasion-focused style: their dodge chance keeps scaling further before diminishing returns kick in, and their hard cap is higher.
 * Large bodies hit the wall early, since they already take pain better and are harder to move out of the way.
 *
 * `soft` is the point where extra dodge chance starts counting for a quarter.
 * `hard` is the ceiling applied when the player has not turned off the dodge cap.
 *
 * @param {number} [size] body size, defaults to $bodysize
 * @returns {{soft: number, hard: number}}
 */
function bodySizeDodgeCaps(size) {
	const raw = size ?? State.variables.bodysize;
	/* A missing or broken size must not read as "tiny" and hand out the highest caps. */
	const bodysize = Number.isFinite(raw) ? raw : 2;
	if (bodysize >= 4) return { soft: 40, hard: 52 };
	if (bodysize >= 3) return { soft: 50, hard: 65 };
	if (bodysize >= 2.5) return { soft: 55, hard: 72 };
	if (bodysize >= 2) return { soft: 60, hard: 80 };
	if (bodysize >= 1) return { soft: 68, hard: 88 };
	if (bodysize >= 0) return { soft: 75, hard: 95 };
	return { soft: 82, hard: 100 };
}
window.bodySizeDodgeCaps = bodySizeDodgeCaps;

/**
 * Flat dodge chance granted or taken away by body size.
 *
 * A large frame is the worst dodger in the game and always will be, but the old penalty was steep enough to wipe out
 * everything dance and brawling training contributed, leaving a heavy character on a flat zero chance no matter how
 * hard they trained.
 * The penalty is now roughly half as harsh, so training still buys a heavy build something while keeping it clearly behind a light one.
 *
 * @param {number} [size] body size, defaults to $bodysize
 * @returns {number} percentage points added to the dodge roll
 */
function bodySizeDodgeModifier(size) {
	const raw = size ?? State.variables.bodysize;
	/* A missing or broken size must not read as "tiny" and hand out the largest bonus. */
	const bodysize = Number.isFinite(raw) ? raw : 2;
	if (bodysize >= 4) return -18;
	if (bodysize >= 3) return -10;
	if (bodysize >= 2.5) return -5;
	if (bodysize >= 2) return 0;
	if (bodysize >= 1) return 15;
	if (bodysize >= 0) return 30;
	return 45;
}
window.bodySizeDodgeModifier = bodySizeDodgeModifier;

/**
 * Counter chance multiplier by body size.
 *
 * Countering means reading a blow and turning it back, which suits a light frame the way blocking and raw damage suit a heavy one.
 * Without this a large character got the best block, the most damage and an undiminished counter, paying for all of it only in dodge.
 *
 * @param {number} [size] body size, defaults to $bodysize
 * @returns {number} multiplier applied to the counter chance
 */
function bodySizeCounterMultiplier(size) {
	const raw = size ?? State.variables.bodysize;
	const bodysize = Number.isFinite(raw) ? raw : 2;
	if (bodysize >= 4) return 0.75;
	if (bodysize >= 3) return 0.85;
	if (bodysize >= 2.5) return 0.95;
	if (bodysize >= 2) return 1;
	if (bodysize >= 1) return 1.1;
	if (bodysize >= 0) return 1.2;
	return 1.3;
}
window.bodySizeCounterMultiplier = bodySizeCounterMultiplier;

/**
 * $settings.npcChastityLevel, defaulting to the normal level for saves made before the setting existed.
 *
 * @returns {number} 0 (never) to 3 (often)
 */
function npcChastityLevel() {
	const level = Number(V.settings?.npcChastityLevel);
	if (!Number.isFinite(level)) return 2;
	return Math.clamp(Math.round(level), 0, 3);
}
window.npcChastityLevel = npcChastityLevel;

/**
 * Whether NPCs can put the player in chastity.
 *
 * Applies to scripted chastity scenes. Existing devices can still be
 * replaced or re-locked. Random chances use npcChastityChance().
 *
 * @returns {boolean}
 */
function npcChastityAllowed() {
	return npcChastityLevel() > 0;
}
window.npcChastityAllowed = npcChastityAllowed;

/**
 * Scales NPC chastity chance using $settings.npcChastityLevel.
 *
 * Returns 0 when disabled and never goes above 100.
 *
 * @param {number} base Base chance out of 100
 * @returns {number} Adjusted chance
 */
function npcChastityChance(base) {
	const raw = Number(base);
	if (!Number.isFinite(raw) || raw <= 0) return 0;

	switch (npcChastityLevel()) {
		case 0:
			return 0;
		case 1:
			return Math.max(1, Math.round(raw * 0.45));
		case 3:
			return Math.clamp(Math.round(raw * 2), 0, 100);
		default:
			return Math.clamp(Math.round(raw), 0, 100);
	}
}
window.npcChastityChance = npcChastityChance;

function dolxRepairMissingJewelleryWornSlots(context = "clothing render") {
	if (!V?.worn || !setup?.clothes) return;

	const warn =
		typeof window.dolxWarnOnce === "function" ? (key, msg, value) => window.dolxWarnOnce(key, msg, value) : (_key, msg, value) => console.warn(msg, value);

	for (const slot of ["earrings", "rings"]) {
		if (V.worn[slot] && typeof V.worn[slot] === "object") continue;

		const fallback = setup.clothes[slot]?.[0];
		if (!fallback) continue;

		warn(`missing-worn-jewellery:${slot}`, `[DoLX] Missing $worn.${slot} during ${context}; repairing with default naked ${slot}.`, V.worn[slot]);

		V.worn[slot] = clone(fallback);
	}
}
window.dolxRepairMissingJewelleryWornSlots = dolxRepairMissingJewelleryWornSlots;

/* One-time cleanup for saves affected by the old <<animatemodel>> NPC corruption bug (ee84ce2b79, now fixed).
 * The portrait renderer could overwrite a stale $NPCList slot with a fake "vine" NPC, which then persisted in the save and could later appear as "the undefined vineperson".
 * Only slots matching the COMPLETE corrupted stub are reset. Individual values are not enough, since many are also valid for real or cleared NPCs.
 * This keeps the cleanup safe and avoids touching legitimate data.
 *
 * Partially corrupted slots are intentionally left alone; <<clearnpc>> will reset them normally later. */
function dolxScrubFabricatedNPCStubs() {
	if (!V || !Array.isArray(V.NPCList)) return;

	const stubProps = {
		condom: false,
		type: "vine",
		penis: "none",
		vagina: "none",
		mouth: "none",
		anus: "none",
		pronoun: "i",
		gender: "n",
		breastsize: 0,
		active: "inactive",
	};
	const scrubbed = [];

	for (let i = 0; i < V.NPCList.length; i++) {
		const npc = V.NPCList[i];
		if (!npc || typeof npc !== "object") continue;
		/* A fully generated NPC keeps its own data; the old stub only ever filled in blanks there. */
		if (window.isLiveNPC?.(npc)) continue;

		/* Both corrupted shapes (the slot the stub conjured from nothing, and the empty padding clone it filled in) end up carrying every stub value and no fullDescription.
		   Nothing real looks like this. */
		if (npc.fullDescription === undefined && Object.entries(stubProps).every(([key, value]) => npc[key] === value)) {
			/* Restore the standard empty shape rather than leaving a bare object or a hole
			   (combat iterates slots 0..$enemyno-1 as a contiguous prefix). */
			if (setup.baseNPC) V.NPCList[i] = clone(setup.baseNPC);
			scrubbed.push(`${i} (full stub)`);
			continue;
		}

		/* Residue on a slot that carried some real fields of its own:
		"vine" is never a real $NPCList type (real ones are human/plant/wolf/centaur/...), so drop just that key and leave everything else. */
		if (npc.type === "vine") {
			delete npc.type;
			scrubbed.push(`${i} (stray type)`);
		}
	}

	/* Dead key from the superseded water-breaking workaround that the stub's NPCList[0] pollution forced. */
	for (const genital of ["vagina", "anus"]) {
		const pregnancy = V.sexStats?.[genital]?.pregnancy;
		if (pregnancy && pregnancy.stuckAtOne !== undefined) delete pregnancy.stuckAtOne;
	}

	if (scrubbed.length) console.warn(`[DoLX] Removed fabricated NPC stub data from $NPCList slots: ${scrubbed.join(", ")}`);
}
window.dolxScrubFabricatedNPCStubs = dolxScrubFabricatedNPCStubs;

/* NaN/Infinity repair for core numerics the game derives other state from. */
function dolxRepairNonFiniteNumerics() {
	if (!V) return;

	const repaired = [];
	const fix = (name, value) => {
		if (Number.isFinite(V[name])) return;
		repaired.push(`${name}=${V[name]}`);
		V[name] = value;
	};

	fix("hairlength", 200);
	fix("fringelength", 200);
	const hairRepaired = repaired.length > 0;

	const giRange = Number.isFinite(V.xchange?.giRange) ? V.xchange.giRange : 1500;
	fix("genderidentitymax", giRange);
	fix("genderidentity", V.player?.gender === "f" ? giRange : 0);

	for (const mult of [
		"npcHealthMult",
		"npcArousalMult",
		"nnpcHealthMult",
		"nnpcArousalMult",
		"beastHealthMult",
		"beastArousalMult",
		"tentacleHealthMult",
		"struggleHealthMult",
	]) {
		fix(mult, 100);
	}

	/* statNerf feeds currentSkillValue and combatExtendedSkillValue as a raw*(nerf/100) multiplier; a non-finite value silently NaNs combat damage AND every skill check. */
	if (V.options && !Number.isFinite(V.options.statNerf)) {
		repaired.push(`options.statNerf=${V.options.statNerf}`);
		V.options.statNerf = 100;
	}

	/* A save made inside an already-poisoned fight would stay endless without this. */
	if (V.combat === 1) {
		const enemyno = Number.isFinite(V.enemyno) && V.enemyno > 0 ? V.enemyno : 1;
		fix("enemyno", enemyno);
		const named = Array.isArray(V.NPCList) && V.NPCList[0] && setup.NPCNameList?.includes(V.NPCList[0].fullDescription);
		fix("enemyarousalmax", 500 * enemyno * ((named ? V.nnpcArousalMult : V.npcArousalMult) / 100));
		fix("enemyarousal", 0);

		/* NaN enemyhealth hides the enemy's health line and makes "enemyhealth lte 0" forever false: the fight can never be won. */
		if (!Number.isFinite(V.enemyhealth)) {
			let sum = 0;
			let any = false;
			if (Array.isArray(V.NPCList)) {
				for (const npc of V.NPCList) {
					if (npc && Number.isFinite(Number(npc.health))) {
						sum += Number(npc.health);
						any = true;
					}
				}
			}
			repaired.push(`enemyhealth=${V.enemyhealth}`);
			V.enemyhealth = any && sum > 0 ? sum : 199;
		}
		if (!Number.isFinite(V.enemyhealthmax) || V.enemyhealthmax <= 0) {
			repaired.push(`enemyhealthmax=${V.enemyhealthmax}`);
			V.enemyhealthmax = Math.max(Number(V.enemyhealth) || 199, 199);
		}
	} else {
		/* Outside combat these are inert leftovers, not live state. Just zero them. */
		for (const name of ["enemyarousal", "enemyhealth", "enemytrust", "enemystrength"]) {
			fix(name, 0);
		}
	}

	/* Prepaid stall deposit rollover left stall_lewdity uninitialised, then lewdity NaN'd it. */
	if (V.daily && "stall_lewdity" in V.daily && !Number.isFinite(V.daily.stall_lewdity)) {
		repaired.push(`daily.stall_lewdity=${V.daily.stall_lewdity}`);
		V.daily.stall_lewdity = 0;
	}

	/* The moor gold ring used to deduct 3000 instead of 1500 from $antiquemoney,
	which could make it negative and block antique museum options. Refund the extra 1500 on affected saves. */
	if (Number.isFinite(V.antiquemoney) && V.antiquemoney < 0) {
		repaired.push(`antiquemoney=${V.antiquemoney}`);
		V.antiquemoney = Math.max(0, V.antiquemoney + 1500);
	}
	fix("antiquemoney", 0);

	/* Poppy's patience/anger slider NaNs on some saves;
	a raw "gte 0" comparison against NaN is always false, silently locking every patience/anger check onto the anger branch. */
	const poppyIndex = V.NPCNameList?.indexOf("Poppy");
	if (poppyIndex > -1 && V.NPCName?.[poppyIndex] && !Number.isFinite(V.NPCName[poppyIndex].patience)) {
		repaired.push(`NPCName[${poppyIndex}].patience=${V.NPCName[poppyIndex].patience}`);
		V.NPCName[poppyIndex].patience = 100;
	}

	/* Fluid tallies are display-only counters, but old saves may store them as strings.
	This makes "+=" join digits instead of adding numbers, causing impossible values.
	Convert them back to numbers and reset anything beyond a realistic amount. */
	const fluidStatCap = (Time.days + 1) * 50000;
	for (const stat of ["milk_produced_stat", "milk_drank_stat", "semen_produced_stat", "lube_produced_stat", "nectar_drank_stat"]) {
		if (V[stat] === undefined) continue;
		const wasString = typeof V[stat] === "string";
		const value = wasString ? Number(V[stat]) : V[stat];
		if (!Number.isFinite(value) || value < 0) {
			repaired.push(`${stat}=${V[stat]}`);
			V[stat] = 0;
		} else if (wasString && value > fluidStatCap) {
			repaired.push(`${stat}=${V[stat]} (over cap)`);
			V[stat] = fluidStatCap;
		} else if (wasString) {
			V[stat] = value;
		}
	}

	if (hairRepaired && typeof window.calchairlengthstage === "function") window.calchairlengthstage();
	if (repaired.length) console.warn(`[DoLX] Repaired non-finite save numerics: ${repaired.join(", ")}`);
}
window.dolxRepairNonFiniteNumerics = dolxRepairNonFiniteNumerics;

/* Guarantee every transformationParts species/part key exists. */
function dolxEnsureTransformationParts() {
	const parts = V?.transformationParts;
	if (!parts || typeof parts !== "object") return;

	const lvl = name => (Number.isFinite(V[name]) ? V[name] : 0);
	const special = V.specialTransform === 1;
	const physical = V.physicalTransform === 1;

	/* Rules mirror setupTransformationPiecesObject; parts it leaves inactive on a fresh setup have no rule and fill as "disabled". */
	const defaults = {
		angel: { halo: () => special && lvl("angel") >= 4, wings: () => special && lvl("angel") >= 6 },
		fallenAngel: { halo: () => special && lvl("fallenangel") >= 2, wings: () => special && lvl("fallenangel") >= 2 },
		demon: { horns: () => special && lvl("demon") >= 2, wings: () => special && lvl("demon") >= 6, tail: () => special && lvl("demon") >= 4 },
		cat: { ears: () => physical && lvl("cat") >= 4, tail: () => physical && lvl("cat") >= 6, heterochromia: () => physical && lvl("cat") >= 7 },
		cow: { horns: () => physical && lvl("cow") >= 2, ears: () => physical && lvl("cow") >= 4, tail: () => physical && lvl("cow") >= 6 },
		waterdragon: {
			horns: () => physical && lvl("waterdragon") >= 2,
			ears: () => physical && lvl("waterdragon") >= 4,
			tail: () => physical && lvl("waterdragon") >= 7,
		},
		bear: { plumage: null, pubes: null, ears: () => physical && lvl("bear") >= 4, tail: () => physical && lvl("bear") >= 6 },
		wolf: {
			ears: () => physical && lvl("wolfgirl") >= 4,
			tail: () => physical && lvl("wolfgirl") >= 6,
			pubes: () => physical && lvl("wolfgirl") >= 4,
			pits: () => physical && lvl("wolfgirl") >= 4,
			cheeks: () => (lvl("wolfgirl") >= 5 ? "feral" : false),
		},
		bird: { tail: null, wings: null, eyes: null, malar: null, plumage: null, pubes: null },
		fox: { ears: null, tail: null, cheeks: null },
		bunny: { ears: () => physical && lvl("bunny") >= 4, tail: () => physical && lvl("bunny") >= 6 },
		okami: { ears: null, tail: null, wings: null, misc: null },
		seraphim: { wings: null, plumage: null, eyes: null },
		kitsune: { ears: null, tail: null, cheeks: null, misc: null },
	};

	const filled = [];
	for (const [species, rules] of Object.entries(defaults)) {
		if (!parts[species] || typeof parts[species] !== "object") parts[species] = {};
		for (const [part, rule] of Object.entries(rules)) {
			if (parts[species][part] !== undefined) continue;
			const active = typeof rule === "function" ? rule() : false;
			parts[species][part] = active === true ? "default" : typeof active === "string" ? active : "disabled";
			filled.push(`${species}.${part}`);
		}
	}
	if (filled.length) console.warn(`[DoLX] Backfilled missing transformationParts keys: ${filled.join(", ")}`);
}
window.dolxEnsureTransformationParts = dolxEnsureTransformationParts;

if (Array.isArray(V.NPCList)) {
	V.NPCList.forEach(npc => {
		if (npc && typeof npc === "object") {
			delete npc.orgasms;
			delete npc.maxOrgasms;
		}
	});
}
if (!V.npcOrgasmState || typeof V.npcOrgasmState !== "object" || Array.isArray(V.npcOrgasmState)) {
	V.npcOrgasmState = {};
}

(() => {
	// Ensure setup exists (defensive; other blocks in this file already do this)
	if (typeof window.setup !== "object" || window.setup === null) window.setup = {};
	// Internal helper, closure-scoped (not used outside this block).
	const stateInvalid = (...states) => states.some(state => state === undefined);

	// Pain multiplier per bodysize step.
	// Keyed by VALUE, not array index, so it stays aligned with setup.bodySizeSteps = [-1, 0, 1, 2, 2.5, 3, 4].
	// The old [2, 1, 0.5, 0] array silently returned undefined for bodysize -1, 2.5, and 4, which the `|| 0` then swallowed into zero pain.
	// Adjust the -1 / 2.5 / 4 entries if the game-design intent differs.
	const BODY_SIZE_PAIN_MODIFIER = new Map([
		[-1, 3], // very small frame: extra pain
		[0, 2],
		[1, 1],
		[2, 0.5],
		[2.5, 0.25], // between 2 and 3
		[3, 0],
		[4, 0], // very large frame: no extra pain
	]);

	// Increase pain based on penetration states every turn in combat.
	setup.penetratedPain = function penetratedPain() {
		if (V.combat !== 1 || V.gamemode === "soft") return;
		if (stateInvalid(V.vaginastate, V.anusstate, V.mouthstate, V.bodysize)) return;

		const painStates = {
			penetrated: 1.5,
			doublepenetrated: 4,
			tentacle: 1.5,
			tentacledeep: 3,
		};

		// Wetness eases penetration pain. Maps a hole's wetness (0-100) to a multiplier:
		//   dry (0)        -> WET_PAIN_MAX_MULT (full pain)
		//   drenched (100) -> WET_PAIN_MIN_MULT (reduced, but never zero; penetration still hurts)
		const WET_PAIN_MAX_MULT = 1; // pain multiplier when completely dry
		const WET_PAIN_MIN_MULT = 0.4; // pain multiplier when fully wet (floor: stays hurtful)
		const wetnessMult = wetness => {
			const w = Math.clamp(wetness ?? 0, 0, 100) / 100;
			return WET_PAIN_MAX_MULT - w * (WET_PAIN_MAX_MULT - WET_PAIN_MIN_MULT);
		};

		// Size (stretch) pain: large penetrators add extra pain on top of the base.
		//   SIZE_PAIN_THRESHOLD = sizes at or below this add NO stretch pain (1=Mini ... 4=Normal).
		//   SIZE_PAIN_PER_STEP  = pain added per size step above the threshold (5=Large, 6=Enormous).
		// So with threshold 4 / step 2: size 5 -> +2, size 6 -> +4 (before wetness/body modifiers).
		const SIZE_PAIN_THRESHOLD = 4;
		const SIZE_PAIN_PER_STEP = 2;
		const sizePain = size => Math.max(0, (size ?? 0) - SIZE_PAIN_THRESHOLD) * SIZE_PAIN_PER_STEP;

		// Wetness only PARTIALLY eases stretch pain; a big penis still hurts even when fully wet.
		//   SIZE_WET_MIN_MULT = fraction of stretch pain that remains when fully wet (floor).
		const SIZE_WET_MIN_MULT = 0.7;
		const sizeWetMult = wetness => {
			const w = Math.clamp(wetness ?? 0, 0, 100) / 100;
			return 1 - w * (1 - SIZE_WET_MIN_MULT);
		};

		// Find the largest penis fully seated in a hole. Full penetration sets the NPC's
		// .penis to exactly the hole name (or holename+"double"); "entrance"/"imminent" don't count.
		// Scanning NPCList by .penis avoids relying on $vaginatarget/$anustarget indices,
		// where 0 ambiguously means both "NPC #0" and "none".
		const maxPenetratorSize = (...penisValues) => {
			if (!Array.isArray(V.NPCList)) return 0;
			let maxSize = 0;
			for (const npc of V.NPCList) {
				if (npc && penisValues.includes(npc.penis)) {
					const s = Number(npc.penissize);
					if (Number.isFinite(s) && s > maxSize) maxSize = s;
				}
			}
			return maxSize;
		};

		let pain = 0;
		if (V.vaginastate in painStates) {
			pain += painStates[V.vaginastate] * wetnessMult(V.vaginaWetness);
			pain += sizePain(maxPenetratorSize("vagina", "vaginadouble")) * sizeWetMult(V.vaginaWetness);
		}
		if (V.anusstate in painStates) {
			pain += painStates[V.anusstate] * wetnessMult(V.anusWetness);
			pain += sizePain(maxPenetratorSize("anus", "anusdouble")) * sizeWetMult(V.anusWetness);
		}
		// Mouth has no wetness stat (saliva assumed); keep its existing 0.5 weighting unchanged.
		if (V.mouthstate in painStates) {
			pain += painStates[V.mouthstate] * 0.5;
			pain += sizePain(maxPenetratorSize("mouth")) * 0.5;
		}

		// Global rebalance: penetration pain accumulates at 46% of its raw rate.
		// This is a further 8% reduction from the previous 0.5 multiplier, keeping pain relevant without making repeated high-fame encounters spiral as quickly.
		// (Applies only to this function's per-turn penetration pain; other pain sources unaffected.)
		const PENETRATION_PAIN_MULT = 0.46;

		const modifier = BODY_SIZE_PAIN_MODIFIER.get(V.bodysize) ?? 0;
		statChange.pain(pain * modifier * PENETRATION_PAIN_MULT);

		// --- Consensual vs non-consensual aftermath -------------------------------
		// V.consensual:  1 = consensual encounter, 0 = assault.
		// V.orgasmcount: the PC's orgasms this encounter (DoL's own per-scene counter, reset by combat init).
		if (V.consensual === 1) {
			// CONSENSUAL: after enough orgasms the PC acclimates and pain eases off each turn,
			// faster the wetter things are (can fully null pain over time). "How wet during the action."
			const ADAPT_ORGASM_THRESHOLD = 3; // orgasms required before adaptation kicks in
			const ADAPT_BASE = 1; // pain removed per turn once adapted, when dry
			const ADAPT_WET_BONUS = 4; // extra removal that scales up to full wetness
			if ((V.orgasmcount || 0) >= ADAPT_ORGASM_THRESHOLD) {
				const wet = Math.clamp(Math.max(V.vaginaWetness ?? 0, V.anusWetness ?? 0), 0, 100) / 100;
				const adapt = ADAPT_BASE + wet * ADAPT_WET_BONUS;
				statChange.pain(-adapt, 1); // modifier 1 => removes exactly `adapt` pain
			}
		} else {
			// NON-CONSENSUAL: severe pain slowly converts to trauma so 1 pain -> 1 trauma per turn
			// (straighttrauma = raw 1:1, no control multiplier) once pain crosses the threshold.
			const TRAUMA_CONVERT_RATE = 1;
			const TRAUMA_CONVERT_THRESHOLD = 100; // pain level at which conversion begins
			if (V.pain >= TRAUMA_CONVERT_THRESHOLD) {
				statChange.pain(-TRAUMA_CONVERT_RATE, 1);
				statChange.straighttrauma(TRAUMA_CONVERT_RATE);
			}
		}
	};

	// Per-minute pain decay rate.
	// Used as the `modifier` arg to statChange.pain from time.js, so this returns a negative number (pain decreases over time).
	// Acclimation model: pain fades gently, speeding up the longer the PC has been hurting, within a fixed band.
	//   PAIN_DECAY_MIN  = decay during the first interval (per minute).
	//   PAIN_DECAY_MAX  = fastest decay once fully acclimated (per minute, hard cap).
	//   PAIN_DECAY_STEP = added to the rate at each adaptation step (capped at PAIN_DECAY_MAX).
	//   Steps trigger at 1h, 3h, 7h, 15h, 31h ... in pain (each gap doubles: 1, 2, 4, 8 ...).
	// V.painDuration (minutes spent continuously in pain) is maintained in time.js minutePassed().
	setup.painChangeByTime = function painChangeByTime(currentPain) {
		const PAIN_DECAY_MIN = 0.3;
		const PAIN_DECAY_MAX = 0.5;
		const PAIN_DECAY_STEP = 0.05;
		const hours = (V.painDuration || 0) / 60;
		const steps = Math.floor(Math.log2(hours + 1));
		return -Math.min(PAIN_DECAY_MIN + steps * PAIN_DECAY_STEP, PAIN_DECAY_MAX);
	};

	// Multiplier on tiredness gain due to pain.
	// Used as a per-tick multiplier in stat-changes.js, where the fallback when this is missing is 1.
	// Floor of 1 is intentional: pain only ever amplifies tiredness gain, never reduces it.
	setup.tirednessChangeByPain = function tirednessChangeByPain(currentPain) {
		return Math.max(0.00181 * Math.pow(currentPain, 1.45), 1);
	};

	// Multiplier on badend escape amount. Lower = harder to escape.
	// Note: V.pain is clamped to [0, 200] by painClamp(), within which the painModifier quartic stays in roughly [0.05, 1].
	// If the pain cap is ever raised above ~440, wrap the polynomial in Math.clamp(..., 0, 1) to prevent negative values from flipping the multiplier sign.
	setup.escapeAmount = function escapeAmount() {
		if (stateInvalid(V.pain, V.tiredness)) return 1;
		const currentPain = V.pain;
		const currentTiredness = V.tiredness;
		const tirednessModifier = Math.min(-0.0000001 * currentTiredness * currentTiredness - 0.0002 * currentTiredness + 1, 1);
		const painModifier = Math.min(-0.000000001 * currentPain ** 4 + 0.0000007 * currentPain ** 3 - 0.0001275 * currentPain ** 2 + 0.00075 * currentPain + 1, 1);
		return painModifier * tirednessModifier;
	};
})();

/* ------------------------------------------------------------------ *
 * X-Change per-body virginity
 * ------------------------------------------------------------------ */
setup.xChangeBodyVirginityKeys = ["vaginal", "penile", "anal", "oral", "handholding", "kiss"];
setup.xChangeVirginTraitKeys = ["vaginal", "penile"];

/* Canonical role for the transformed body the player is currently inhabiting, derived from its configuration (gender_body) rather than stale effect flags.
 * herm bodies are gender_body "a"; genderflip bodies are "m"/"f".
 * Using this one signal everywhere a save/apply decides herm-vs-xchange keeps the store and the re-entry path in agreement, so new saves never split. */
setup.xChangeTransformedRole = function xChangeTransformedRole(genderBody) {
	return genderBody === "a" ? "herm" : "xchange";
};

function xChangeClone(value) {
	try {
		if (typeof clone === "function") return clone(value);
	} catch (e) {}
	try {
		return JSON.parse(JSON.stringify(value));
	} catch (e) {
		return value;
	}
}

function xChangeVirginityStore() {
	const pill = V.xchange && V.xchange.pill;
	if (!pill) return undefined;
	if (!pill.bodyVirginity || typeof pill.bodyVirginity !== "object" || Array.isArray(pill.bodyVirginity)) {
		pill.bodyVirginity = {};
	}
	return pill.bodyVirginity;
}

function xChangeBodyProp(role) {
	if (role === "real") return "originalBody";
	if (role === "xchange") return "changedBody";
	if (role === "herm") return "hermBody";
	// Clone bodies ("clone:<NPC name>") have no legacy snapshot to seed from,
	// so they fall through to the intact seed wearing a copy of someone's body does not come with their history.
	return "";
}

// Clone pills give the player a copy of a named NPC's body, cached per NPC in pill.clonedBody.
// Each of those is its own body and so needs its own virginity record, or a clone's losses land on whichever of real/xchange/herm its shape happens to resemble.
setup.xChangeCloneVirginityRole = function xChangeCloneVirginityRole(npcName) {
	return typeof npcName === "string" && npcName !== "" && npcName !== "none" ? `clone:${npcName}` : "";
};

function xChangeVirginityEntryFrom(virginity, details, seen = true) {
	const entry = { v: {}, d: {}, seen };
	for (const key of setup.xChangeBodyVirginityKeys) {
		entry.v[key] = virginity && virginity[key] !== undefined ? xChangeClone(virginity[key]) : true;
		if (details && details[key] !== undefined) entry.d[key] = xChangeClone(details[key]);
	}
	return entry;
}

function xChangeVirginityEntryHasTaken(entry) {
	if (!entry || typeof entry !== "object" || !entry.v) return false;
	return setup.xChangeBodyVirginityKeys.some(key => entry.v[key] !== undefined && entry.v[key] !== true);
}

function xChangeCopyVirginityEntry(entry) {
	return {
		v: xChangeClone((entry && entry.v) || {}),
		d: xChangeClone((entry && entry.d) || {}),
		seen: true,
	};
}

function xChangeMigrateTransformedVirginityRoles() {
	// One-time old-save bridge. Old saves could record a transformed body's losses under one role (e.g. "herm") while the re-entry path read the other ("xchange"), because the save slot used to be chosen by stale effect flags.
	// Reconcile that split EXACTLY ONCE: if one transformed store has taken virginity and its sibling is still the all-true seed, copy it across.
	//   - never touches "real"
	//   - never overwrites a transformed store that already has taken data
	const pill = V.xchange && V.xchange.pill;
	if (!pill || pill.bodyVirginityRoleMigrated === true) return;
	pill.bodyVirginityRoleMigrated = true;

	const store = pill.bodyVirginity;
	if (!store || typeof store !== "object") return;

	const hermTaken = xChangeVirginityEntryHasTaken(store.herm);
	const xchangeTaken = xChangeVirginityEntryHasTaken(store.xchange);

	if (hermTaken && !xchangeTaken) {
		store.xchange = xChangeCopyVirginityEntry(store.herm);
	} else if (xchangeTaken && !hermTaken) {
		store.herm = xChangeCopyVirginityEntry(store.xchange);
	}
}

function xChangeSeedBodyVirginity(role) {
	const pill = V.xchange && V.xchange.pill;
	const prop = xChangeBodyProp(role);
	const snap = prop && pill ? pill[prop] : undefined;

	// Prefer legacy snapshot data if a save was made while virginity still lived in the body cache.
	if (snap && typeof snap === "object" && snap.virginity) {
		return xChangeVirginityEntryFrom(snap.virginity, snap.virginityDetails);
	}

	// The original body should already have been recorded by save-body before transformation, so a missing "real" record means a save from before virginity was split per body
	// back then both bodies shared one history, and the live player still carries it.
	// Seed from that rather than handing the player back a blank record, which would erase everything the real body ever did.
	if (role === "real") {
		return xChangeVirginityEntryFrom(V.player && V.player.virginity, V.player && V.player.virginityDetails);
	}

	// Brand-new X-Change/herm bodies start intact.
	return xChangeVirginityEntryFrom({}, {});
}

setup.xChangeRecordBodyVirginity = function xChangeRecordBodyVirginity(role) {
	const store = xChangeVirginityStore();
	if (!store || !role || !V.player || !V.player.virginity) return false;
	xChangeMigrateTransformedVirginityRoles();
	store[role] = xChangeVirginityEntryFrom(V.player.virginity, V.player.virginityDetails);
	return true;
};

setup.xChangeApplyBodyVirginity = function xChangeApplyBodyVirginity(role) {
	const store = xChangeVirginityStore();
	if (!store || !role || !V.player || !V.player.virginity) return false;
	xChangeMigrateTransformedVirginityRoles();
	if (!store[role] || store[role].seen !== true) {
		store[role] = xChangeSeedBodyVirginity(role);
	}
	const entry = store[role];
	for (const key of setup.xChangeBodyVirginityKeys) {
		V.player.virginity[key] = entry.v && entry.v[key] !== undefined ? xChangeClone(entry.v[key]) : true;
		if (V.player.virginityDetails) {
			if (entry.d && entry.d[key] !== undefined) V.player.virginityDetails[key] = xChangeClone(entry.d[key]);
			else delete V.player.virginityDetails[key];
		}
	}
	return true;
};

// Role of the body the player is currently in, by configuration not flags.
// gender_body "a" is unambiguously a herm body regardless of session flags: hermEffect/genderflipEffect
// get reset to false whenever a fresh pill session starts (xchange-effects), even if the player's actual
// body never reverted (e.g. a still-herm-shaped body carried into a brand-new grey-only session).
//
// Trusting pill.active alone here misfiled virginity events onto the wrong body's record; check the live shape first.
//
// Transformed-vs-real is decided by comparing the live sex against pill.baseSex (the sex the player had when this session began) not by genderflipEffect.
// The flag can still be stale when a second pill re-runs xchange-effects mid-session, and a stale "no flip" reading writes the transformed body's losses onto the real body's record.
// sex is the right signal: a genderflip always swaps it, while a crossdress body (sissify/butchify) keeps it,
// and a crossdress body shares the real body's genitals and so its virginity too. This is the same test characteristics.twee uses to decide body dysphoria.
setup.xChangeActiveBodyVirginityRole = function xChangeActiveBodyVirginityRole() {
	const pill = V.xchange && V.xchange.pill;
	const transformed = typeof window.playerIsXChanged === "function" && window.playerIsXChanged();
	// A clone is checked first: it can take any shape, including a herm one.
	if (transformed && pill) {
		const cloneRole = setup.xChangeCloneVirginityRole(pill.clone);
		if (cloneRole) return cloneRole;
	}
	// A herm is a body with BOTH sets of genitals. gender_body "a" alone is not enough: vanilla also uses it for a merely
	// androgynous single-genital body (the bimbo/pimp outfit drift parks a body there on its way from "m" to "f").
	if (V.player && V.player.gender_body === "a" && V.player.penisExist && V.player.vaginaExist) return "herm";
	if (!transformed) return "real";
	if (pill && (pill.baseSex === "m" || pill.baseSex === "f")) {
		return V.player && V.player.sex !== pill.baseSex ? "xchange" : "real";
	}
	if (pill && pill.genderflipEffect) return "xchange";
	return "real";
};

setup.xChangeRecordActiveBodyVirginity = function xChangeRecordActiveBodyVirginity() {
	return setup.xChangeRecordBodyVirginity(setup.xChangeActiveBodyVirginityRole());
};

/* Sydney's prayer room restores virginity changes when you leave.
 * X-Change can switch the player's body inside the room, so restoring one old snapshot could overwrite the new body's
 * real virginity history.
 *
 * These helpers now restore each body's own record. Changes made inside the room still do not count, while virginity
 * lost outside the room is preserved. Temple records are restored separately.
 */
setup.xChangeCapturePrayerRoomVirginity = function xChangeCapturePrayerRoomVirginity() {
	const pill = V.xchange && V.xchange.pill;
	const role = setup.xChangeActiveBodyVirginityRole();
	// An older active pill may not have a per-body store yet. Seed its current body before taking the room snapshot.
	if (pill) setup.xChangeRecordBodyVirginity(role);
	return {
		role,
		store: pill && pill.bodyVirginity ? xChangeClone(pill.bodyVirginity) : undefined,
	};
};

setup.xChangeRestorePrayerRoomVirginity = function xChangeRestorePrayerRoomVirginity(saved) {
	if (!saved || !saved.playerVirginity || !V.player || !V.player.virginity) return false;
	const pill = V.xchange && V.xchange.pill;

	// Saves made mid-scene before this fix have no recorded body role: restore exactly as the old code did.
	if (!pill || saved.bodyRole === undefined) {
		V.player.virginity = xChangeClone(saved.playerVirginity);
		if (saved.playerVirginityDetails) V.player.virginityDetails = xChangeClone(saved.playerVirginityDetails);
		return true;
	}

	pill.bodyVirginity = saved.bodyVirginityStore ? xChangeClone(saved.bodyVirginityStore) : {};
	// The current virginity belongs to the body worn when the scene started and may be newer than the saved record.
	// Update that body's stored history so switching back to it later restores the correct virginity.
	if (saved.bodyRole) pill.bodyVirginity[saved.bodyRole] = xChangeVirginityEntryFrom(saved.playerVirginity, saved.playerVirginityDetails);

	if (setup.xChangeActiveBodyVirginityRole() === saved.bodyRole) {
		V.player.virginity = xChangeClone(saved.playerVirginity);
		if (saved.playerVirginityDetails) V.player.virginityDetails = xChangeClone(saved.playerVirginityDetails);
		return true;
	}

	for (const key of Object.keys(saved.playerVirginity)) {
		if (!setup.xChangeBodyVirginityKeys.includes(key)) V.player.virginity[key] = xChangeClone(saved.playerVirginity[key]);
	}
	setup.xChangeApplyBodyVirginity(setup.xChangeActiveBodyVirginityRole());
	return true;
};

function xChangeOtherBodyVirginity() {
	const pill = V.xchange && V.xchange.pill;
	if (!pill) return undefined;
	const transformed = typeof window.playerIsXChanged === "function" && window.playerIsXChanged();
	const store = pill.bodyVirginity;
	let role;
	if (transformed) {
		role = "real";
	} else {
		// In the real body the "other" body is the transformed one.
		// Prefer whichever transformed store has actually been recorded; fall back to xchange.
		if (store && store.xchange && store.xchange.seen) role = "xchange";
		else if (store && store.herm && store.herm.seen) role = "herm";
		else role = "xchange";
	}
	if (store && store[role] && store[role].seen) return store[role].v;
	const prop = xChangeBodyProp(role);
	const snap = prop && pill[prop];
	return snap && snap.virginity;
}
window.xChangeOtherBodyVirginity = xChangeOtherBodyVirginity;

function bodyIsGenitalVirgin(virginity, keys) {
	if (!virginity) return false;
	keys = keys || setup.xChangeVirginTraitKeys;
	return keys.every(key => virginity[key] === true);
}
window.bodyIsGenitalVirgin = bodyIsGenitalVirgin;

function playerCountsAsVirgin() {
	const transformed = typeof window.playerIsXChanged === "function" && window.playerIsXChanged();
	const permanent = typeof window.pillIsPermanent === "function" && window.pillIsPermanent();
	const paused = typeof window.pillTimerPaused === "function" && window.pillTimerPaused();
	const tempXChanged = transformed && !permanent && !paused;

	let trueForm = V.player && V.player.virginity;
	if (tempXChanged) {
		const other = xChangeOtherBodyVirginity();
		if (other) trueForm = other;
	}
	return bodyIsGenitalVirgin(trueForm, setup.xChangeVirginTraitKeys);
}
window.playerCountsAsVirgin = playerCountsAsVirgin;

// ==================================================
// MOVED FROM time.js to keeps vanilla time.js untouched
// ==================================================
/* Brothel vending state repair / defaults. Called from time.js (weekPassed, dayPassed, etc.). 
	Exported on window so those call sites continue to resolve after the move. */
function ensureBrothelVendingState() {
	if (V.brothelVending == null) return false;

	if (typeof V.brothelVending !== "object") {
		console.warn("[brothelVending] Repaired non-object state:", V.brothelVending);
		V.brothelVending = {};
	}

	if (typeof V.brothelVending.status !== "string") V.brothelVending.status = "idea";

	const numericDefaults = {
		products: 0,
		condoms: 0,
		lube: 0,
		condomsSold: 0,
		lubeSold: 0,
		weeksRent: 0,
		weeksEmpty: 0,
		total: 0,
	};

	for (const [key, fallback] of Object.entries(numericDefaults)) {
		if (!Number.isFinite(V.brothelVending[key])) {
			console.warn(`[brothelVending] Repaired invalid ${key}:`, V.brothelVending[key]);
			V.brothelVending[key] = fallback;
		}
	}

	V.brothelVending.products = Math.max(0, Math.floor(V.brothelVending.products));
	V.brothelVending.condoms = Math.max(0, Math.floor(V.brothelVending.condoms));
	V.brothelVending.lube = Math.max(0, Math.floor(V.brothelVending.lube));
	V.brothelVending.condomsSold = Math.max(0, Math.floor(V.brothelVending.condomsSold));
	V.brothelVending.lubeSold = Math.max(0, Math.floor(V.brothelVending.lubeSold));
	V.brothelVending.weeksRent = Math.max(0, Math.floor(V.brothelVending.weeksRent));
	V.brothelVending.weeksEmpty = Math.max(0, Math.floor(V.brothelVending.weeksEmpty));
	V.brothelVending.total = Math.max(0, Math.floor(V.brothelVending.total));

	V.brothelVending.condomsToRefill = Math.max(0, 200 - V.brothelVending.condoms);
	V.brothelVending.lubeToRefill = Math.max(0, 200 - V.brothelVending.lube);

	return true;
}
window.ensureBrothelVendingState = ensureBrothelVendingState;

/* Daily speech-attitude roll for the "fickle" attitude.
 * Called from dayPassed() in time.js. Exported on window for the call site. */
function speechDailyCheck() {
	if (V.statFreeze) return;

	delete V.speechDailyMessage;
	delete V.speechDailyMessagePending;

	if (V.speech_attitude === "fickle") {
		const pool = ["meek", "shy", "neutral", "confident", "bratty"];
		V.speechDailyAttitude = pool[random(0, pool.length - 1)];
		V.speechDailyAttitudeDay = Time.days;
		V.speechDailyMessage = `Today you feel especially ${V.speechDailyAttitude}.`;
		V.speechDailyMessagePending = 1;
	} else {
		delete V.speechDailyAttitude;
		delete V.speechDailyAttitudeDay;
	}
}
window.speechDailyCheck = speechDailyCheck;

/* globals Wikifier */
/* Safety cleanup for the Raul and Janet daydream.
The scene temporarily changes the player's body and stats, including virginity.
Normally <<sleepJanet>> restores everything, but it only runs on the normal endings.
This makes sure the player is restored if they leave the scene another way. Only affects the Raul and Janet daydream. */
const scarletVisionPassages = [
	"ScarletBook5",
	"ScarletBook6",
	"ScarletBook7aye",
	"ScarletBook7nay",
	"ScarletBook7nay_page2",
	"ScarletBook8aye",
	"ScarletBook8nay",
	"ScarletBook9",
	"ScarletBook10",
	"Loveth",
	"Loveth Finish",
	"Drama",
	"Drama Finish",
];
$(document).on(":passageinit", ev => {
	if (!V.scarletVision || V.replayScene) return;
	/* Prefer the incoming passage from the event, falling back to V.passage
	If both still read as the old passage on some build, the net simply fires one passage later, which still restores. */
	const title = (ev && ev.passage && ev.passage.title) || V.passage;
	if (!title || scarletVisionPassages.includes(title)) return;
	/* Left the daydream without passing through an ending
	Run the scene's own teardown so the restore is identical to the intended exit rather than a second, drifting copy of it. */
	console.warn("[DoLX] Raul and Janet daydream was left via " + title + " without its ending; restoring the real body.");
	Wikifier.wikifyEval("<<sleepJanet>>");
});

/* beautyBoost save-compat / expiry; relocated out of vanilla time.js's :passageinit handler.
Runs on every passage as before, behavior identical. */
$(document).on(":passageinit", () => {
	/* Ensure beautyBoost object exists (save compatibility) */
	V.beautyBoost ??= { bath: 0, teeth: 0, face: 0, hands: 0, hygiene: 0, tan: 0 };
	if (V.beautyBoost.bath == null) V.beautyBoost.bath = 0;
	if (V.sleepTimePassing) V.sleepTimePassing = false;
	if (V.beautyBoost.teeth == null) V.beautyBoost.teeth = 0;
	if (V.beautyBoost.face == null) V.beautyBoost.face = 0;
	if (V.beautyBoost.hands == null) V.beautyBoost.hands = 0;
	if (V.beautyBoost.hygiene == null) V.beautyBoost.hygiene = 0;
	if (V.beautyBoost.tan == null) V.beautyBoost.tan = 0;

	if (V.beautyBoost.spa == null || typeof V.beautyBoost.spa === "number") {
		V.beautyBoost.spa = {
			amount: Number.isFinite(V.beautyBoost.spa) ? V.beautyBoost.spa : 0,
			expires: 0,
			treatment: "spa treatment",
		};
	}
	if (typeof V.beautyBoost.spa !== "object") V.beautyBoost.spa = { amount: 0, expires: 0, treatment: "spa treatment" };
	if (!Number.isFinite(V.beautyBoost.spa.amount)) V.beautyBoost.spa.amount = 0;
	if (!Number.isFinite(V.beautyBoost.spa.expires)) V.beautyBoost.spa.expires = 0;
	if (typeof V.beautyBoost.spa.treatment !== "string") V.beautyBoost.spa.treatment = "spa treatment";
	if (V.beautyBoost.spa.amount > 0 && V.beautyBoost.spa.expires > 0 && Time.days > V.beautyBoost.spa.expires) {
		V.beautyBoost.spa.amount = 0;
		V.beautyBoost.spa.expiredNotice = true;
	}

	/* Salon manicure boost, parallel slot to spa */
	if (V.beautyBoost.nails == null || typeof V.beautyBoost.nails === "number") {
		V.beautyBoost.nails = {
			amount: Number.isFinite(V.beautyBoost.nails) ? V.beautyBoost.nails : 0,
			expires: 0,
			treatment: "salon manicure",
		};
	}
	if (typeof V.beautyBoost.nails !== "object") V.beautyBoost.nails = { amount: 0, expires: 0, treatment: "salon manicure" };
	if (!Number.isFinite(V.beautyBoost.nails.amount)) V.beautyBoost.nails.amount = 0;
	if (!Number.isFinite(V.beautyBoost.nails.expires)) V.beautyBoost.nails.expires = 0;
	if (typeof V.beautyBoost.nails.treatment !== "string") V.beautyBoost.nails.treatment = "salon manicure";
	if (V.beautyBoost.nails.amount > 0 && V.beautyBoost.nails.expires > 0 && Time.days > V.beautyBoost.nails.expires) {
		V.beautyBoost.nails.amount = 0;
		V.beautyBoost.nails.expiredNotice = true;
	}
});

/* 
	@args:
	 - path: type string, representing the relative path to an 'img' asset.
*/
function getGenderedPath(path) {
	if (typeof path === "string" && (V.options?.altImgAlways === 1 || (V.options?.useAltImg === 1 && V.player?.sex === V.options?.altImgGender))) {
		let sub = path.substring(4); // strip leading "img/"
		if (sub[0] === "/") {
			sub = sub.substring(1);
		}
		// Folders shared with the main 'img' set ; never redirect these to img2
		const sharedFolders = ["decorations", "sex", "ui", "misc"];
		if (sharedFolders.includes(sub.split("/")[0])) {
			return path; // keep the original img/ path untouched
		}
		return "img2/" + sub;
	} else return path;
}
window.getGenderedPath = getGenderedPath;

/*
	Returns the list of "outer" bodyliquid parts that the rain can actually reach.
	Extremities (face, hair, neck, arms, feet) are always exposed to falling rain;
	the torso, lower body and genitals are only reached when the relevant clothing layers are exposed, using the same `.exposed`/`lower_covering` semantics as bodywritingExposureCheck().
*/
function rainExposedBodyparts() {
	const w = V.worn;
	if (!w) return [];

	// face, hair, neck, arms and feet are treated as always reached by the rain
	const parts = ["face", "hair", "neck", "rightarm", "leftarm", "feet"];

	const upperBare = w.over_upper.exposed >= 1 && w.upper.exposed >= 1 && w.under_upper.exposed >= 1;
	if (upperBare) parts.push("chest", "tummy");

	const lowerBare = w.over_lower.exposed >= 1 && w.lower.exposed >= 1 && (w.under_lower.exposed >= 1 || !w.under_lower.type.includes("lower_covering"));
	if (lowerBare) parts.push("thigh", "bottom");

	const genitalsBare = w.over_lower.vagina_exposed >= 1 && w.lower.vagina_exposed >= 1 && !w.under_lower.type.includes("lower_covering");
	if (genitalsBare) {
		if (V.player.vaginaExist) parts.push("vaginaoutside");
		if (V.player.penisExist) parts.push("penis");
	}

	return parts;
}
window.rainExposedBodyparts = rainExposedBodyparts;

/*
	Rain gradually washes lewd fluids off exposed skin.
	Called once per hour-block from hourPassed().
	Only acts while the player is outdoors in the rain; heavier rain rinses faster, and clothing shields whatever it covers (see rainExposedBodyparts).
*/
function rainWashFluids(hours = 1) {
	if (V.statFreeze || hours < 1) return;
	if (V.outside !== 1 || Weather.precipitation !== "rain") return;
	if (!V.player?.bodyliquid) return;

	// precipitationIntensity ~1.3 (drizzle) -> 1, ~2 (rain) -> 2, 3.5 (storm) -> 3 points rinsed per hour
	const perHour = Math.clamp(Math.round(Weather.precipitationIntensity), 1, 3);
	const amount = perHour * hours;

	for (const part of rainExposedBodyparts()) {
		const liquids = V.player.bodyliquid[part];
		if (!liquids) continue;
		for (const liquid of setup.bodyliquid.liquidtype) {
			if (liquids[liquid] > 0) liquids[liquid] = Math.clamp(liquids[liquid] - amount, 0, 5);
		}
	}
}
window.rainWashFluids = rainWashFluids;

/* ---------------------------------------------------------------------------
	Player voiceover configuration

	The audio engine (base-system/kozmods/audio.twee) only has two voice sets:
	a female set ("v1"/"v2" prefix, full moan/chupa/breath/orgasm) and a male
	set ("m_" prefix, breath/orgasm only). Vanilla picks between them straight
	from $player.sex (or gender_posture when $options.postureAffectsVoice is on).

	These helpers add a configurable layer on top so the player can map each
	body/identity bucket to whichever voice they want (or silence it), and so a
	herm PC — who is forced into sex "m"/"f" for the rest of the game's systems
	— gets their own independent voice instead of inheriting male moans.

	Buckets ("categories"):
		male   - masculine body, masculine/neutral posture
		female - feminine body, feminine/neutral posture
		sissy  - masculine body presenting feminine (needs postureAffectsVoice)
		butch  - feminine body presenting masculine (needs postureAffectsVoice)
		herm   - X-Change herm effect active (takes priority over the above)

	Per-category config: { voice: "m"|"v1"|"v2", enabled: bool, npc: "all"|"m"|"f"|"off" }
		voice   - which voice set this bucket uses
		enabled - whether the player's own voiceover plays at all
		npc     - which NPC voices the player hears while in this bucket
--------------------------------------------------------------------------- */

/* True when the PC is currently a herm via the X-Change herm effect. */
function playerIsHerm() {
	return !!(
		!V.statFreeze &&
		typeof window.playerIsXChanged === "function" &&
		window.playerIsXChanged() &&
		V.xchange &&
		V.xchange.pill &&
		V.xchange.pill.hermEffect
	);
}
window.playerIsHerm = playerIsHerm;

/* Resolve the player's current voice bucket from sex + posture + herm effect. */
function playerVoiceCategory() {
	if (playerIsHerm()) return "herm";
	const sex = V.player && V.player.sex;
	const posture = V.player && V.player.gender_posture;
	const usePosture = !!(V.options && V.options.postureAffectsVoice);
	if (sex === "m") return usePosture && posture === "f" ? "sissy" : "male";
	if (sex === "f") return usePosture && posture === "m" ? "butch" : "female";
	return "male"; // safety net for unexpected sex values
}
window.playerVoiceCategory = playerVoiceCategory;

/* Per-category defaults. These exactly reproduce vanilla routing (male/butch -> male voice, female/sissy -> the chosen female voice) so existing saves are unchanged;
only herm is new, defaulting to the v1 female voice. */
function defaultVoiceConfig() {
	const fv = (V.options && V.options.f_voice) || "v1";
	return {
		male: { voice: "m", enabled: true, npc: "all" },
		female: { voice: fv, enabled: true, npc: "all" },
		sissy: { voice: fv, enabled: true, npc: "all" },
		butch: { voice: "m", enabled: true, npc: "all" },
		herm: { voice: "v1", enabled: true, npc: "all" },
	};
}
window.defaultVoiceConfig = defaultVoiceConfig;

/* Fill in any missing pieces of $options.voiceConfig without clobbering the player's choices. Called once per load from the version-update widget. */
function ensureVoiceConfig() {
	if (!V.options) return;
	const def = defaultVoiceConfig();
	const cfg = V.options.voiceConfig;
	if (!cfg || typeof cfg !== "object" || Array.isArray(cfg)) {
		V.options.voiceConfig = def;
		return;
	}
	for (const cat of Object.keys(def)) {
		const d = def[cat];
		const c = cfg[cat];
		if (!c || typeof c !== "object" || Array.isArray(c)) {
			cfg[cat] = Object.assign({}, d);
			continue;
		}
		if (c.voice === undefined) c.voice = d.voice;
		if (c.enabled === undefined) c.enabled = d.enabled;
		if (c.npc === undefined) c.npc = d.npc;
	}
}
window.ensureVoiceConfig = ensureVoiceConfig;

/* Resolved settings for the player's current bucket, falling back to defaults. */
function playerVoiceSettings() {
	const cat = playerVoiceCategory();
	const def = defaultVoiceConfig()[cat];
	const cur = (V.options && V.options.voiceConfig && V.options.voiceConfig[cat]) || {};
	return {
		category: cat,
		voice: cur.voice || def.voice, // "m" | "v1" | "v2"
		enabled: cur.enabled !== false, // player's own voiceover on/off
		npc: cur.npc || def.npc, // "all" | "m" | "f" | "off"
	};
}
window.playerVoiceSettings = playerVoiceSettings;

/* True when the player's voice should currently use the female set. */
function playerVoiceIsFemale() {
	const s = playerVoiceSettings();
	return s.enabled && (s.voice === "v1" || s.voice === "v2");
}
window.playerVoiceIsFemale = playerVoiceIsFemale;

/* True when the player's voice should currently use the male set. */
function playerVoiceIsMale() {
	const s = playerVoiceSettings();
	return s.enabled && s.voice === "m";
}
window.playerVoiceIsMale = playerVoiceIsMale;

/* Whether an NPC of the given pronoun ("m"/"f") may be voiced right now, honouring the global NPC toggle and the current bucket's NPC filter. */
function npcVoiceAllowed(pronoun) {
	if (!V.options || V.options.npcVoiceoverAudio === 0) return false;
	const npc = playerVoiceSettings().npc;
	if (npc === "off") return false;
	if (npc === "m") return pronoun === "m";
	if (npc === "f") return pronoun === "f";
	return true; // "all"
}
window.npcVoiceAllowed = npcVoiceAllowed;

/**
 * X-Change skill-scaled income bonus.
 *
 * The 0.5.11 vanilla "Balance proposal" nerfed many low/mid income sources.
 * To give players a reason to push a skill past its S grade, income from a nerfed source is boosted once its governing skill reaches grade S (value 1000), scaling from +10% at S up to +50% at SSS (2000).
 * Below S there is no bonus, so the rebalance stands for anyone who hasn't specialised.
 *
 * Grade thresholds (see characteristics.twee): S 1000, S+ 1250, SS 1500, SS+ 1750, SSS 2000.
 *
 * @param {string|number} skill a skill name understood by currentSkillValue (e.g. "housekeeping"),
 *                              or a raw numeric skill value.
 * @returns {number} an income multiplier >= 1.
 */
function skillIncomeMultiplier(skill) {
	let value;
	if (typeof skill === "number") {
		value = skill;
	} else if (typeof currentSkillValue === "function") {
		value = currentSkillValue(skill);
	} else {
		value = V[skill];
	}
	if (!Number.isFinite(value) || value < 1000) return 1;
	// +10% at S (1000), ramping linearly to +50% at SSS (2000).
	return 1 + 0.1 + 0.4 * Math.clamp((value - 1000) / 1000, 0, 1);
}
window.skillIncomeMultiplier = skillIncomeMultiplier;

/**
 * Multiplies a value once for every active transformation in `types`.
 * This deliberately compounds so compatible chimera/custom TF benefits stack.
 *
 * @param {number} value value to modify
 * @param {number} bonus fractional bonus per full transformation
 * @param {...string} types transformation types to check
 * @returns {number} modified value
 */
function animalTfMultiplier(value, bonus, ...types) {
	let result = Number(value) || 0;
	for (const type of types.flat()) {
		if (Transformations.effectiveLevel(type) >= (type === "waterdragon" ? 7 : 6)) result *= 1 + bonus;
	}
	return result;
}
window.animalTfMultiplier = animalTfMultiplier;

/* Fractional income bonus granted by one completed animal transformation.
   Rebalanced from +100% to +75%: doubling the payout outclassed every other income modifier. */
const animalTfIncomeBonus = 0.75;
window.animalTfIncomeBonus = animalTfIncomeBonus;

function animalTfIncome(value, ...types) {
	return Math.round(animalTfMultiplier(value, animalTfIncomeBonus, types));
}
window.animalTfIncome = animalTfIncome;

/**
 * Applies the full divine transformation income bonus.
 * Fallen angels gain +20% from every income type. Angels gain +50% from non-sexual income, while demons gain +50% from sexualised work.
 * The source names mirror moneyStats; callers can pass "slut" or "normal" when a generic source does not describe the action clearly.
 *
 * @param {number} value income value to modify
 * @param {string} [source] moneyStats source
 * @param {string} [incomeType] explicit "slut" or "normal" classification
 * @returns {number} modified value
 */
function divineTfIncome(value, source = "", incomeType) {
	let result = Number(value) || 0;
	if (result <= 0) return result;

	const sourceName = String(source || V.location || "").toLowerCase();
	if (["debug", "startingmoney", "nottracked", "bankloan"].includes(sourceName) || sourceName.includes("refund") || incomeType === "none") {
		return result;
	}

	let slutIncome = incomeType === "slut";
	if (incomeType !== "normal" && incomeType !== "slut") {
		slutIncome =
			sourceName.includes("prostitution") ||
			sourceName === "avery" ||
			sourceName === "briargel" ||
			sourceName.includes("brothel") ||
			sourceName === "stripclub" ||
			sourceName.includes("brothelshow") ||
			sourceName.includes("gloryhole") ||
			sourceName.includes("exhibitionism") ||
			sourceName.includes("dance");
	}

	if (Transformations.effectiveLevel("fallen") >= 2) result *= 1.2;
	else if (Transformations.effectiveLevel("angel") >= 6 && !slutIncome) result *= 1.5;
	else if (Transformations.effectiveLevel("demon") >= 6 && slutIncome) result *= 1.5;

	return Math.round(result);
}
window.divineTfIncome = divineTfIncome;

function animalTfValuableChance(value, ...types) {
	return animalTfMultiplier(value, 0.5, types);
}
window.animalTfValuableChance = animalTfValuableChance;

function foxSkulduggeryDifficulty(value) {
	return Math.round(animalTfMultiplier(value, -0.25, "fox"));
}
window.foxSkulduggeryDifficulty = foxSkulduggeryDifficulty;

function valuableSaleMultiplier() {
	return Transformations.effectiveLevel("fox") >= 6 ? 1.25 : 1;
}
window.valuableSaleMultiplier = valuableSaleMultiplier;

function antiqueSaleValue() {
	const base = (Number.isFinite(V.antiquemoney) ? V.antiquemoney : 0) * 100;
	const mathsBuff = V.mathsTraitBuffs && V.mathsTraitBuffs.antiques === 1 ? 1 + (Number(V.mathstrait) || 0) / 4 : 1;
	return Math.round(base * mathsBuff * valuableSaleMultiplier());
}
window.antiqueSaleValue = antiqueSaleValue;

/**
 * X-Change value (in pennies) the player gets for fencing their stolen goods ($blackmoney) at the pub.
 *
 * Vanilla's 0.5.11 rebalance roughly halved raw theft loot ($blackmoney gains).
 * The pub fence sale used a flat <<money>> and so, unlike every other crime payout (which <<moneyGain>>'s crime flag scales by 1 + skulduggery/2000), never rewarded skulduggery.
 * This brings it in line: base loot, times the optional maths "haggling" buff, times the same skulduggery crime multiplier.
 * Single source of truth so the pub sale and the journal estimate always agree.
 *
 * @returns {number} sale value in pennies (0 with no stolen goods).
 */
function blackMoneySaleValue() {
	const base = (Number.isFinite(V.blackmoney) ? V.blackmoney : 0) * 100;
	if (base <= 0) return 0;
	const mathsBuff = V.mathsTraitBuffs && V.mathsTraitBuffs.stolen === 1 ? 1 + (Number(V.mathstrait) || 0) / 4 : 1;
	const skulduggery = typeof currentSkillValue === "function" ? currentSkillValue("skulduggery") : Number(V.skulduggery) || 0;
	const skulduggeryBuff = 1 + skulduggery / 2000;
	return Math.round(base * mathsBuff * skulduggeryBuff * valuableSaleMultiplier());
}
window.blackMoneySaleValue = blackMoneySaleValue;

/**
 * Display value of a sale that has not been paid out yet.
 *
 * `money()` applies the divine TF income bonus itself, so the raw sale value quoted in the journal or in a shopkeeper's
 * line of dialogue came out lower than the amount the player actually received. This mirrors that bonus for preview text only.
 *
 * @param {number} value raw sale value in pennies
 * @param {string} source moneyStats source the payout will use
 * @returns {number} value the payout will actually credit
 */
function previewSaleValue(value, source) {
	return divineTfIncome(value, source);
}
window.previewSaleValue = previewSaleValue;

/**
 * Extra "allure" folded into office danger rolls when the player chooses to work a temp assignment in a revealing outfit.
 * Dressing provocatively at the agency is allowed, but it draws far more harassment on the upper floors.
 * Derived live from the current outfit, so clothes torn mid-assignment ramp the danger up too.
 *
 * @returns {number} bonus allure (0 when decently dressed)
 */
function officeSluttyAllure() {
	// eslint-disable-next-line no-undef
	if (!inappropriatePlayerState("clothes")) return 0;
	let bonus = 1200; // a revealing, work-inappropriate outfit
	if (V.exposed >= 1) bonus += 900; // underwear or lewd parts on show
	if (V.exposed >= 2) bonus += 900; // fully exposed
	return bonus;
}
window.officeSluttyAllure = officeSluttyAllure;

/**
 * Tidebloom ring: a plaited water lily stem kept from the lab's day room planter.
 * Worn, it keeps a nectar craving from fading and gives off a faint sweet scent.
 *
 * @returns {boolean} true while the ring is on the player's hand
 */
function wearingTidebloomRing() {
	/* Keyed off variable, the identity clothesIndex uses; worn names get blanked to "naked" by the strip widgets. */
	return V.worn?.rings?.variable === "tidebloom";
}
window.wearingTidebloomRing = wearingTidebloomRing;
