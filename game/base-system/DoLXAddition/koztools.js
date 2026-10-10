/**
 * D.N.A. moved/split some reusable X-Change misc/helper widgets out of `xchange.twee` and into this file:
 * - `koztools.twee` is for shared utility widgets, small UI helpers, and misc glue
 * - Main X-Change pill/effect/body handling should remain in `xchange.twee`
 * - Gender-identity logic remains split across `identity.twee`, `identity.js`
 * - Any still-live compatibility helpers in `xchange.js`
 * If what you're looking for isn't defined here, check the other files too.
 */

function wornSetupClothes(slot) {
	return setup.clothes[slot][clothesIndex(slot, V.worn[slot])];
}
window.wornSetupClothes = wornSetupClothes;

// Keep the Identity pronoun summary live because its controls do not re-render the passage.
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
	if (typeof window.setup !== "object" || window.setup === null) {
		window.setup = {};
	}

	// Polyfill for forks without Math.clamp.
	if (typeof Math.clamp !== "function") {
		Math.clamp = (n, min, max) => Math.min(max, Math.max(min, n));
	}

	setup.bodySizeSteps = [-1, 0, 1, 2, 2.5, 3, 4];

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
	if (typeof window.setup !== "object" || window.setup === null) {
		window.setup = {};
	}

	if (typeof Math.clamp !== "function") {
		Math.clamp = (n, min, max) => Math.min(max, Math.max(min, n));
	}

	// Fill only missing pill fields for save compatibility.
	setup.xchangeEnsurePillDefaults = function () {
		const V = State?.variables;
		const pill = V?.xchange?.pill;
		if (!pill) return;

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
		// Zero means untested; a positive roll also keeps the displayed duration stable between redraws.
		if (pill.durationDetailRoll === undefined) pill.durationDetailRoll = 0;
	};

	// Repair missing or invalid X-Change globals expected by core code.
	setup.xchangeEnsureCompatGlobals = function () {
		const V = State?.variables;
		if (!V) return;
		V.xchange ??= {};
		V.xchange.heat ??= {};
		if (V.xchange.heat.permanentOn === undefined) {
			V.xchange.heat.permanentOn = 0;
		}
		// Missing resistWithWillpower must default on; falsy would make heat always override.
		if (V.xchange.heat.resistWithWillpower === undefined) {
			V.xchange.heat.resistWithWillpower = 1;
		}

		// Legacy saves may store these 0/1 settings as booleans.
		for (const key of ["systemOn", "permanentOn", "resistWithWillpower"]) {
			if (typeof V.xchange.heat[key] === "boolean") {
				V.xchange.heat[key] = V.xchange.heat[key] ? 1 : 0;
			}
		}

		// Body-changing ABO options default off; flavour-only options default on.
		if (V.xchange.omegaNeedsNoVagina === undefined) V.xchange.omegaNeedsNoVagina = 0;
		if (V.xchange.alphaGrowsPenis === undefined) V.xchange.alphaGrowsPenis = 0;
		if (V.xchange.aboDrivesHeat === undefined) V.xchange.aboDrivesHeat = 1;
		if (V.xchange.pheromoneAllure === undefined) V.xchange.pheromoneAllure = 1;
		for (const key of ["omegaNeedsNoVagina", "alphaGrowsPenis", "aboDrivesHeat", "pheromoneAllure"]) {
			if (typeof V.xchange[key] === "boolean") V.xchange[key] = V.xchange[key] ? 1 : 0;
		}

		// breederDenial feeds heat arithmetic, so keep it finite and bounded.
		const bd = Number(V.xchange.breederDenial);
		if (!Number.isFinite(bd)) {
			V.xchange.breederDenial = 0;
		} else {
			V.xchange.breederDenial = Math.clamp(bd, 0, 6);
		}

		V.pregnancyStats ??= {};
		if (typeof V.pregnancyStats.heatStillEnabled !== "boolean") {
			try {
				V.pregnancyStats.heatStillEnabled = typeof playerIsPregnant === "function" ? !playerIsPregnant() : true;
			} catch (e) {
				V.pregnancyStats.heatStillEnabled = true;
			}
		}

		// $ballssize may be absent on female-start saves; keep save-body arithmetic finite.
		const balls = Number(V.ballssize);
		if (!Number.isFinite(balls)) {
			const penisSize = Number(V.player?.penissize);
			V.ballssize = V.player?.ballsExist && Number.isFinite(penisSize) ? Math.clamp(penisSize, 0, 6) : 0;
		} else {
			V.ballssize = Math.clamp(balls, 0, 6);
		}

		// Restore invalid body-size bounds before transformed bodies are generated.
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

	// X-Change body limits are separate from the player's global body-part limits.
	setup.xChangeBodySizeParts = {
		breast: { absMax: 12, globalMin: "breastsizemin", globalMax: "breastsizemax", setting: "bodyBreastSize", swellBoost: 3 },
		bottom: { absMax: 8, globalMin: "bottomsizemin", globalMax: "bottomsizemax", setting: "bodyBottomSize", swellBoost: 2 },
		penis: { absMax: 6, globalMin: "penissizemin", globalMax: "penissizemax", setting: "bodyPenisSize", swellBoost: 2 },
	};

	setup.xChangeBodySizeLimitsActive = function () {
		const x = State?.variables?.xchange;
		return !!x && (x.bodySizeLimitsEnabled === 1 || x.bodySizeLimitsEnabled === true);
	};

	setup.xChangeBodySizeAbsolute = function (part) {
		const cfg = setup.xChangeBodySizeParts[part];
		return { min: 0, max: cfg ? cfg.absMax : 0 };
	};

	const sanitiseSizeRange = (cfg, rawMin, rawMax) => {
		let min = Number(rawMin);
		let max = Number(rawMax);
		if (!Number.isFinite(min)) min = 0;
		if (!Number.isFinite(max)) max = cfg.absMax;
		min = Math.clamp(Math.round(min), 0, cfg.absMax);
		max = Math.clamp(Math.round(max), 0, cfg.absMax);
		return min <= max ? { min, max } : { min: max, max: min };
	};

	setup.xChangeGlobalSizeRange = function (part) {
		const cfg = setup.xChangeBodySizeParts[part];
		if (!cfg) return { min: 0, max: 0 };
		const V = State?.variables;
		if (!V) return { min: 0, max: cfg.absMax };
		return sanitiseSizeRange(cfg, V[cfg.globalMin], V[cfg.globalMax]);
	};

	setup.xChangeBodySizeRange = function (part) {
		const cfg = setup.xChangeBodySizeParts[part];
		if (!cfg) return { min: 0, max: 0 };
		if (!setup.xChangeBodySizeLimitsActive()) return setup.xChangeGlobalSizeRange(part);
		const x = State.variables.xchange;
		const min = Number(x[cfg.setting + "Min"]);
		const max = Number(x[cfg.setting + "Max"]);
		if (!Number.isFinite(min) || !Number.isFinite(max)) return setup.xChangeGlobalSizeRange(part);
		return sanitiseSizeRange(cfg, min, max);
	};

	// The current body uses X-Change limits only while inhabiting a pill-created body.
	setup.xChangeCurrentBodySizeRange = function (part) {
		const inPilledBody = typeof window.playerIsXChanged === "function" && window.playerIsXChanged();
		return inPilledBody && setup.xChangeBodySizeLimitsActive() ? setup.xChangeBodySizeRange(part) : setup.xChangeGlobalSizeRange(part);
	};

	setup.xChangeRollBodySize = function (part) {
		const range = setup.xChangeBodySizeRange(part);
		return range.min + Math.floor(Math.random() * (range.max - range.min + 1));
	};

	setup.xChangeFitBodySize = function (part, value) {
		const range = setup.xChangeBodySizeRange(part);
		const num = Number(value);
		if (!Number.isFinite(num)) return setup.xChangeRollBodySize(part);
		return Math.clamp(Math.round(num), range.min, range.max);
	};

	setup.xChangeSwellBodySize = function (part, current) {
		const cfg = setup.xChangeBodySizeParts[part];
		if (!cfg) return 0;
		const base = Number(current);
		const range = setup.xChangeBodySizeRange(part);
		const from = Number.isFinite(base) ? base : range.max;
		// Swell effects may grow a part but must never shrink it.
		return Math.clamp(Math.round(from) + cfg.swellBoost, Math.clamp(Math.round(from), 0, cfg.absMax), cfg.absMax);
	};

	setup.xChangeEnsureBodySizeSettings = function () {
		const V = State?.variables;
		if (!V || !V.xchange || typeof V.xchange !== "object") return;
		const x = V.xchange;
		if (x.bodySizeLimitsEnabled === undefined || x.bodySizeLimitsEnabled === null) x.bodySizeLimitsEnabled = 0;
		if (typeof x.bodySizeLimitsEnabled === "boolean") x.bodySizeLimitsEnabled = x.bodySizeLimitsEnabled ? 1 : 0;
		if (!Number.isFinite(Number(x.bodySizeLimitsEnabled))) x.bodySizeLimitsEnabled = 0;
		for (const part of Object.keys(setup.xChangeBodySizeParts)) {
			const cfg = setup.xChangeBodySizeParts[part];
			const minKey = cfg.setting + "Min";
			const maxKey = cfg.setting + "Max";
			// Seed new X-Change limits from the player's current limits.
			const seed = setup.xChangeGlobalSizeRange(part);
			const min = Number.isFinite(Number(x[minKey])) ? x[minKey] : seed.min;
			const max = Number.isFinite(Number(x[maxKey])) ? x[maxKey] : seed.max;
			const range = sanitiseSizeRange(cfg, min, max);
			x[minKey] = range.min;
			x[maxKey] = range.max;
		}
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

		// Fallbacks mirror <<parasiteinit>>; keep this list in sync with base-DoL body parts.
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
		// "parasite" is rendered separately by base-DoL, so exclude it from this display cache to avoid duplicates.
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

	// Ear slime is global and must survive body swaps even though other parasites are body-scoped.
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

	// Call after penisExist/vaginaExist update. Keep .variable as the owned item ID; use .type for its current shape.
	setup.xchangeAdaptChastityToBody = function () {
		const V = State?.variables;
		const worn = V?.worn?.genitals;
		if (!worn || !Array.isArray(worn.type) || !worn.type.includes("chastity")) return null;

		if (worn.name === "chastity parasite") return null;

		const cloneFn = typeof clone === "function" ? clone : o => JSON.parse(JSON.stringify(o));
		const isCage = worn.type.includes("cage") && !worn.type.includes("hidden");
		const isBelt = worn.type.includes("hidden") && !worn.type.includes("cage");
		const rename = (from, to) => {
			const swap = text =>
				typeof text === "string" ? text.replace(new RegExp(`\\b${from}\\b`, "gi"), m => (m[0] === m[0].toUpperCase() ? to.toUpperFirst() : to)) : text;
			worn.name = swap(worn.name);
			// name_cap is printed separately, so it must follow name changes.
			worn.name_cap = swap(worn.name_cap);
		};
		const setType = (tag, present) => {
			const at = worn.type.indexOf(tag);
			if (present && at === -1) worn.type.push(tag);
			else if (!present && at !== -1) worn.type.splice(at, 1);
		};

		if (isCage && !V.player?.penisExist) {
			// An uncursed cage falls into the wardrobe when possible; otherwise reshape it instead of destroying it.
			if (worn.cursed === 0 && Array.isArray(V.wardrobe?.genitals)) {
				V.wardrobe.genitals.push(cloneFn(worn));
				V.worn.genitals = cloneFn(setup.clothes.genitals[0]);
				return "fellOff";
			}
			setType("cage", false);
			setType("hidden", true);
			// "constricting" must follow belt/cage shape because pregnancy checks read it.
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

	// Keep disabled Gender Identity drift from retaining queued state that could fire later.
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
		for (const key of ["giBreastSizeEnabled", "giAssSizeEnabled", "giGenitalsEnabled", "giHairLengthEnabled", "giBodySizeEnabled", "giFecundityEnabled"]) {
			x[key] = toStrictBool(x[key]);
		}
		if (Object.hasOwn(x, "giTransformConsent")) delete x.giTransformConsent;

		// Complete the single-to-dual genital preference migration on normal loads too.
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

		// identityCap limits drift range; it does not control whether the system is enabled.
		const unlocked = V.attitudesControl?.unlockGender === true;
		if (!unlocked || !x.genderIdentityEnabled) {
			x.giAutoEnabled = false;
			x.giTransformEnabled = false;
		}

		// Slow body changes require daily drift; disabling either clears queued drift.
		if (x.giAutoEnabled !== true) x.giTransformEnabled = false;
		if (x.giAutoEnabled !== true || x.giTransformEnabled !== true) {
			x.giDrift = 0;
			x.giShiftStage = 0;
			x.giShiftMode = "";
		}
	};

	const runXChangeLoadCompat = () => {
		if (V.xchange && Object.hasOwn(V.xchange, "_debugEffectHistory")) delete V.xchange._debugEffectHistory;
		if (V.wraith && !Number.isFinite(V.wraith.will)) {
			if (V.possessed) V.wraith.will = random(1300, 1700);
			else delete V.wraith.will;
		}
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

	runXChangeLoadCompat();

	if (typeof jQuery === "function") {
		jQuery(document).on(":onloadsave", runXChangeLoadCompat);
		jQuery(document).on(":passagestart", () => {
			if (V.wraith && !Number.isFinite(V.wraith.will)) {
				if (V.possessed) V.wraith.will = random(1300, 1700);
				else delete V.wraith.will;
			}
			try {
				setup.xchangeEnsurePillDefaults();
			} catch (e) {}
		});
	}
})();

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

	// Foreign crops reset their bed; the bed itself is never deleted.
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

// Remove only clothing the game cannot resolve with clothesIndex-compatible matching.
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
		for (const dictName of ["worn", "carried"]) {
			const item = V[dictName]?.[slot];
			if (!item?.temp && isKnownItem(slot, item)) continue;
			pruned.add(`${dictName}.${slot}:${item?.variable || item?.name || "invalid"}`);
			const fallback = setup.clothes[slot]?.[0];
			if (fallback) V[dictName][slot] = clone(fallback);
		}

		if (Array.isArray(V.wardrobe?.[slot])) {
			V.wardrobe[slot] = V.wardrobe[slot].filter(item => {
				if (!item?.temp && !skippedNames.has(item?.name) && isKnownItem(slot, item)) return true;
				pruned.add(`wardrobe.${slot}:${item?.variable || item?.name || "invalid"}`);
				return false;
			});
		}

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
		C.tiredness.max = 2000 + Math.floor(currentSkillValue("physique", 2, 1) / 32);
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

// Smaller bodies get higher dodge soft/hard caps; invalid sizes fall back to the neutral size.
function bodySizeDodgeCaps(size) {
	const raw = size ?? State.variables.bodysize;
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

// Body size adds a flat dodge modifier; invalid sizes fall back to the neutral size.
function bodySizeDodgeModifier(size) {
	const raw = size ?? State.variables.bodysize;
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

// Body size also scales counter chance so large builds do not keep full counter strength.
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

// npcChastityLevel defaults to 2 for older saves and is clamped to 0..3.
function npcChastityLevel() {
	const level = Number(V.settings?.npcChastityLevel);
	if (!Number.isFinite(level)) return 2;
	return Math.clamp(Math.round(level), 0, 3);
}
window.npcChastityLevel = npcChastityLevel;

function npcChastityAllowed() {
	return npcChastityLevel() > 0;
}
window.npcChastityAllowed = npcChastityAllowed;

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

function repairMissingJewelleryWornSlots(context = "clothing render") {
	if (!V?.worn || !setup?.clothes) return;

	for (const slot of ["earrings", "rings"]) {
		if (V.worn[slot] && typeof V.worn[slot] === "object") continue;

		const fallback = setup.clothes[slot]?.[0];
		if (!fallback) continue;

		console.warn(`Missing $worn.${slot} during ${context}; repairing with default naked ${slot}.`, V.worn[slot]);

		V.worn[slot] = clone(fallback);
	}
}
window.repairMissingJewelleryWornSlots = repairMissingJewelleryWornSlots;

// Repair fabricated "vine" NPC stubs without touching valid NPC data.
function scrubFabricatedNPCStubs() {
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

		if (window.isLiveNPC?.(npc)) continue;

		// Reset only the complete stub signature; partial real NPC data is preserved.
		if (npc.fullDescription === undefined && Object.entries(stubProps).every(([key, value]) => npc[key] === value)) {
			// Restore the standard empty NPC shape because combat expects a contiguous NPCList prefix.
			if (setup.baseNPC) V.NPCList[i] = clone(setup.baseNPC);
			scrubbed.push(`${i} (full stub)`);
			continue;
		}

		// A stray type:"vine" is not a valid live NPC type, so remove only that key.
		if (npc.type === "vine") {
			delete npc.type;
			scrubbed.push(`${i} (stray type)`);
		}
	}

	for (const genital of ["vagina", "anus"]) {
		const pregnancy = V.sexStats?.[genital]?.pregnancy;
		if (pregnancy && pregnancy.stuckAtOne !== undefined) delete pregnancy.stuckAtOne;
	}

	if (scrubbed.length) console.warn(`Removed fabricated NPC stub data from $NPCList slots: ${scrubbed.join(", ")}`);
}
window.scrubFabricatedNPCStubs = scrubFabricatedNPCStubs;

// Repair non-finite core numerics that other systems derive state from.
function repairNonFiniteNumerics() {
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
	fix("multiOrgasmChance", 20);

	// statNerf must stay finite or skill and combat calculations become NaN.
	if (V.options && !Number.isFinite(V.options.statNerf)) {
		repaired.push(`options.statNerf=${V.options.statNerf}`);
		V.options.statNerf = 100;
	}

	// Repair live combat state too; otherwise a poisoned fight can become unwinnable.
	if (V.combat === 1) {
		const enemyno = Number.isFinite(V.enemyno) && V.enemyno > 0 ? V.enemyno : 1;
		fix("enemyno", enemyno);
		const named = Array.isArray(V.NPCList) && V.NPCList[0] && setup.NPCNameList?.includes(V.NPCList[0].fullDescription);
		fix("enemyarousalmax", 500 * enemyno * ((named ? V.nnpcArousalMult : V.npcArousalMult) / 100));
		fix("enemyarousal", 0);

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
		for (const name of ["enemyarousal", "enemyhealth", "enemytrust", "enemystrength"]) {
			fix(name, 0);
		}
	}

	if (V.daily && "stall_lewdity" in V.daily && !Number.isFinite(V.daily.stall_lewdity)) {
		repaired.push(`daily.stall_lewdity=${V.daily.stall_lewdity}`);
		V.daily.stall_lewdity = 0;
	}

	// The bus groper countdown went NaN when one branch skipped setting it; 0 just ends that scene.
	if ("chikantimeout" in V && !Number.isFinite(V.chikantimeout)) {
		repaired.push(`chikantimeout=${V.chikantimeout}`);
		V.chikantimeout = 0;
	}

	// Refund the extra 1500 from affected negative antiquemoney saves, then clamp at zero.
	if (Number.isFinite(V.antiquemoney) && V.antiquemoney < 0) {
		repaired.push(`antiquemoney=${V.antiquemoney}`);
		V.antiquemoney = Math.max(0, V.antiquemoney + 1500);
	}
	fix("antiquemoney", 0);

	// A non-finite Poppy patience value forces every comparison down the anger branch.
	const poppyIndex = V.NPCNameList?.indexOf("Poppy");
	if (poppyIndex > -1 && V.NPCName?.[poppyIndex] && !Number.isFinite(V.NPCName[poppyIndex].patience)) {
		repaired.push(`NPCName[${poppyIndex}].patience=${V.NPCName[poppyIndex].patience}`);
		V.NPCName[poppyIndex].patience = 100;
	}

	// Fluid tallies may be legacy strings; normalise them before "+=" can concatenate digits.
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
	if (repaired.length) console.warn(`Repaired non-finite save numerics: ${repaired.join(", ")}`);
}
window.repairNonFiniteNumerics = repairNonFiniteNumerics;

// Replace invalid hair colours that no longer exist in `setup.colours.hair_map`, preventing `canvasfilter` errors that blank the passage.
function repairInvalidHairColours() {
	if (!V || !setup.colours?.hair_map) return;
	// tmp0/tmp1 are preview-only colours. If found in a save, they are leftovers from a bug.
	const isValid = colour => typeof colour === "string" && colour !== "tmp0" && colour !== "tmp1" && !!setup.colours.hair_map[colour];
	const fallback = isValid(V.naturalhaircolour) ? V.naturalhaircolour : "brown";
	const repaired = [];

	for (const key of ["haircolour", "hairfringecolour", "naturalhaircolour"]) {
		if (V[key] === undefined || isValid(V[key])) continue;
		repaired.push(`${key}=${V[key]}`);
		V[key] = fallback;
	}
	for (const key of ["hairColourGradient", "hairFringeColourGradient"]) {
		const colours = V[key]?.colours;
		if (!Array.isArray(colours)) continue;
		colours.forEach((colour, index) => {
			if (isValid(colour)) return;
			repaired.push(`${key}[${index}]=${colour}`);
			colours[index] = fallback;
		});
	}
	if (V.makeup?.browscolour && !isValid(V.makeup.browscolour)) {
		repaired.push(`browscolour=${V.makeup.browscolour}`);
		V.makeup.browscolour = fallback;
	}

	if (repaired.length) console.warn(`Repaired unknown hair colours: ${repaired.join(", ")}`);
}
window.repairInvalidHairColours = repairInvalidHairColours;

// Remove obsolete underscored clothing wetness keys from saves.
function clearOrphanWetnessKeys() {
	if (!V) return;
	const cleared = [];
	for (const slot of ["over_upper", "over_lower", "under_upper", "under_lower"]) {
		for (const key of [slot + "wet", slot + "wetstage"]) {
			if (V[key] === undefined) continue;
			cleared.push(`${key}=${V[key]}`);
			delete V[key];
		}
	}
	if (cleared.length) console.warn(`Cleared orphaned wetness keys: ${cleared.join(", ")}`);
}
window.clearOrphanWetnessKeys = clearOrphanWetnessKeys;

// Backfill missing transformationParts keys using the same defaults as setupTransformationPiecesObject.
function ensureTransformationParts() {
	const parts = V?.transformationParts;
	if (!parts || typeof parts !== "object") return;

	const lvl = name => (Number.isFinite(V[name]) ? V[name] : 0);
	const special = V.specialTransform === 1;
	const physical = V.physicalTransform === 1;

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
	if (filled.length) console.warn(`Backfilled missing transformationParts keys: ${filled.join(", ")}`);
}
window.ensureTransformationParts = ensureTransformationParts;

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
	if (typeof window.setup !== "object" || window.setup === null) window.setup = {};

	const stateInvalid = (...states) => states.some(state => state === undefined);

	// Key pain modifiers by actual bodysize value so every discrete body-size step is covered.
	const BODY_SIZE_PAIN_MODIFIER = new Map([
		[-1, 3],
		[0, 2],
		[1, 1],
		[2, 0.5],
		[2.5, 0.25],
		[3, 0],
		[4, 0],
	]);

	setup.penetratedPain = function penetratedPain() {
		if (V.combat !== 1 || V.gamemode === "soft") return;
		if (stateInvalid(V.vaginastate, V.anusstate, V.mouthstate, V.bodysize)) return;

		const painStates = {
			penetrated: 1.5,
			doublepenetrated: 4,
			tentacle: 1.5,
			tentacledeep: 3,
		};

		// Wetness scales base penetration pain from 1.0 dry to 0.4 fully wet.
		const WET_PAIN_MAX_MULT = 1;
		const WET_PAIN_MIN_MULT = 0.4;
		const wetnessMult = wetness => {
			const w = Math.clamp(wetness ?? 0, 0, 100) / 100;
			return WET_PAIN_MAX_MULT - w * (WET_PAIN_MAX_MULT - WET_PAIN_MIN_MULT);
		};

		// Stretch pain starts above penetrator size 4; full wetness can only reduce it to 70%.
		const SIZE_PAIN_THRESHOLD = 4;
		const SIZE_PAIN_PER_STEP = 2;
		const sizePain = size => Math.max(0, (size ?? 0) - SIZE_PAIN_THRESHOLD) * SIZE_PAIN_PER_STEP;

		const SIZE_WET_MIN_MULT = 0.7;
		const sizeWetMult = wetness => {
			const w = Math.clamp(wetness ?? 0, 0, 100) / 100;
			return 1 - w * (1 - SIZE_WET_MIN_MULT);
		};

		// Scan NPCList by .penis because target index 0 ambiguously means both NPC #0 and "none".
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

		// Skill relaxes the hole: 0 skill takes full pain, 1000 takes half.
		const SKILL_MIN_MULT = 0.5;
		const skillMult = skill => 1 - (Math.clamp(currentSkillValue(skill), 0, 1000) / 1000) * (1 - SKILL_MIN_MULT);

		// Arousal relaxes the body in consensual sex only, up to 30% less pain.
		const AROUSAL_MIN_MULT = 0.7;
		const relaxMult = V.consensual === 1 ? 1 - Math.clamp((V.arousal || 0) / (V.arousalmax || 10000), 0, 1) * (1 - AROUSAL_MIN_MULT) : 1;

		let pain = 0;
		if (V.vaginastate in painStates) {
			pain +=
				(painStates[V.vaginastate] * wetnessMult(V.vaginaWetness) + sizePain(maxPenetratorSize("vagina", "vaginadouble")) * sizeWetMult(V.vaginaWetness)) *
				skillMult("vaginalskill");
		}
		if (V.anusstate in painStates) {
			pain +=
				(painStates[V.anusstate] * wetnessMult(V.anusWetness) + sizePain(maxPenetratorSize("anus", "anusdouble")) * sizeWetMult(V.anusWetness)) *
				skillMult("analskill");
		}
		// Mouth has no wetness stat; forced oral weighs more since the PC cannot set pace or depth.
		if (V.mouthstate in painStates) {
			const mouthWeight = V.consensual === 1 ? 0.5 : 0.75;
			// Jaw strain grows each unbroken turn (cap +1.5); every 5th turn also costs tiredness.
			V.oralStrainTurns = (V.oralStrainTurns || 0) + 1;
			const jawStrain = Math.min(V.oralStrainTurns * 0.1, 1.5);
			pain += (painStates[V.mouthstate] + sizePain(maxPenetratorSize("mouth")) + jawStrain) * mouthWeight * skillMult("oralskill");
			if (V.oralStrainTurns % 5 === 0 && !V.statFreeze) statChange.tiredness(1);
		} else {
			delete V.oralStrainTurns;
		}
		pain *= relaxMult;

		// PENETRATION_PAIN_MULT applies only to this function's per-turn penetration pain.
		const PENETRATION_PAIN_MULT = 0.46;

		const modifier = BODY_SIZE_PAIN_MODIFIER.get(V.bodysize) ?? 0;
		statChange.pain(pain * modifier * PENETRATION_PAIN_MULT);

		// Consensual encounters can adapt after repeated orgasms; assaults convert severe pain into trauma.
		if (V.consensual === 1) {
			const ADAPT_ORGASM_THRESHOLD = 3;
			const ADAPT_BASE = 1;
			const ADAPT_WET_BONUS = 4;
			if ((V.orgasmcount || 0) >= ADAPT_ORGASM_THRESHOLD) {
				const wet = Math.clamp(Math.max(V.vaginaWetness ?? 0, V.anusWetness ?? 0), 0, 100) / 100;
				const adapt = ADAPT_BASE + wet * ADAPT_WET_BONUS;
				statChange.pain(-adapt, 1);
			}
		} else {
			const TRAUMA_CONVERT_RATE = 1;
			const TRAUMA_CONVERT_THRESHOLD = 100;
			if (V.pain >= TRAUMA_CONVERT_THRESHOLD) {
				statChange.pain(-TRAUMA_CONVERT_RATE, 1);
				statChange.straighttrauma(TRAUMA_CONVERT_RATE);
			}
		}
	};

	// Returns a negative per-minute pain modifier that increases logarithmically with continuous pain duration.
	setup.painChangeByTime = function painChangeByTime(currentPain) {
		const PAIN_DECAY_MIN = 0.3;
		const PAIN_DECAY_MAX = 0.5;
		const PAIN_DECAY_STEP = 0.05;
		const hours = (V.painDuration || 0) / 60;
		const steps = Math.floor(Math.log2(hours + 1));
		return -Math.min(PAIN_DECAY_MIN + steps * PAIN_DECAY_STEP, PAIN_DECAY_MAX);
	};

	// Pain may amplify tiredness gain but never reduce it below the normal rate.
	setup.tirednessChangeByPain = function tirednessChangeByPain(currentPain) {
		return Math.max(0.00181 * Math.pow(currentPain, 1.45), 1);
	};

	// This polynomial assumes pain stays within the current 0..200 cap; clamp it if that cap rises substantially.
	setup.escapeAmount = function escapeAmount() {
		if (stateInvalid(V.pain, V.tiredness)) return 1;
		const currentPain = V.pain;
		const currentTiredness = V.tiredness;
		const tirednessModifier = Math.min(-0.0000001 * currentTiredness * currentTiredness - 0.0002 * currentTiredness + 1, 1);
		const painModifier = Math.min(-0.000000001 * currentPain ** 4 + 0.0000007 * currentPain ** 3 - 0.0001275 * currentPain ** 2 + 0.00075 * currentPain + 1, 1);
		return painModifier * tirednessModifier;
	};
})();

// Per-body virginity
setup.xChangeBodyVirginityKeys = ["vaginal", "penile", "anal", "oral", "handholding", "kiss"];
setup.xChangeVirginTraitKeys = ["vaginal", "penile"];

// Derive transformed role from live body configuration, not session effect flags.
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
	// Clone bodies have no legacy body snapshot to seed from.
	return "";
}

// Each named clone gets its own virginity role so histories cannot leak between bodies.
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
	// One-time migration: copy taken transformed-body data into an untouched sibling role, never into "real" or over existing taken data.
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

	// Prefer cached legacy snapshot data when seeding an existing body record.
	if (snap && typeof snap === "object" && snap.virginity) {
		return xChangeVirginityEntryFrom(snap.virginity, snap.virginityDetails);
	}

	// If the real record is missing, seed it from the live player history; new transformed bodies start intact.
	if (role === "real") {
		return xChangeVirginityEntryFrom(V.player && V.player.virginity, V.player && V.player.virginityDetails);
	}

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
	// Callers bank history before changing shape. Here the live shape and clone/effect
	// flags may already describe different bodies, so do not infer an outgoing role.
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

// Original-sex traits must use the pre-transformation sex, not the current body.
function playerOriginalSex() {
	const pill = V.xchange && V.xchange.pill;
	if (pill && pill.active && (pill.baseSex === "m" || pill.baseSex === "f")) return pill.baseSex;
	return V.player ? V.player.sex : "f";
}
window.playerOriginalSex = playerOriginalSex;

// Determine active virginity role from the live body: clone first, then true herm shape, then sex vs baseSex.
setup.xChangeActiveBodyVirginityRole = function xChangeActiveBodyVirginityRole() {
	const pill = V.xchange && V.xchange.pill;
	const transformed = typeof window.playerIsXChanged === "function" && window.playerIsXChanged();
	// Clone role takes priority because a clone can have any body shape.
	if (transformed && pill) {
		const cloneRole = setup.xChangeCloneVirginityRole(pill.clone);
		if (cloneRole) return cloneRole;
	}
	// A herm role requires both genital sets; gender_body "a" alone can also describe an androgynous single-genital body.
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

// Prayer-room restoration is per body so switching bodies inside the room cannot overwrite another body's real history.
setup.xChangeCapturePrayerRoomVirginity = function xChangeCapturePrayerRoomVirginity() {
	const pill = V.xchange && V.xchange.pill;
	const role = setup.xChangeActiveBodyVirginityRole();

	if (pill) setup.xChangeRecordBodyVirginity(role);
	return {
		role,
		store: pill && pill.bodyVirginity ? xChangeClone(pill.bodyVirginity) : undefined,
	};
};

setup.xChangeRestorePrayerRoomVirginity = function xChangeRestorePrayerRoomVirginity(saved) {
	if (!saved || !saved.playerVirginity || !V.player || !V.player.virginity) return false;
	const pill = V.xchange && V.xchange.pill;

	// Mid-scene legacy saves without bodyRole fall back to the whole-player snapshot.
	if (!pill || saved.bodyRole === undefined) {
		V.player.virginity = xChangeClone(saved.playerVirginity);
		if (saved.playerVirginityDetails) V.player.virginityDetails = xChangeClone(saved.playerVirginityDetails);
		return true;
	}

	pill.bodyVirginity = saved.bodyVirginityStore ? xChangeClone(saved.bodyVirginityStore) : {};
	// Preserve the body worn when the scene began so returning to it restores the correct history.
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

// Repair brothel vending fields used by time.js.
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

/* globals Wikifier, onLoadUpdateCheck, versionUpdateCheck */
// Repair leaked $statFreeze once the player reaches a normal hub where a frozen scene should already have torn down.
function repairLeakedStatFreeze(passageName) {
	if (!V || !V.statFreeze || V.replayScene) return false;

	// A freeze without its snapshot cannot represent a valid in-progress frozen scene.
	if (!V.frozenValues) {
		console.warn("$statFreeze was set with no frozen snapshot; clearing it so daily resets and stat changes run again.");
		delete V.statFreeze;
		delete V.frozenXchangeValues;
		return true;
	}

	const title = passageName || V.passage;
	if (!title || !setup.majorAreas || !setup.majorAreas.includes(title)) return false;

	// Do not trigger unfreeze teardown while a load/version migration is still pending.
	if (onLoadUpdateCheck || versionUpdateCheck) return false;

	console.warn(`Reached ${title} with stale frozen stats; clearing the freeze and keeping the current character.`);
	delete V.statFreeze;
	delete V.frozenValues;
	delete V.frozenXchangeValues;
	return true;
}
window.repairLeakedStatFreeze = repairLeakedStatFreeze;

$(document).on(":passagestart", ev => {
	// Repair the incoming history moment, not the previous passage's saved state.
	if (V && V.statFreeze) repairLeakedStatFreeze(ev?.passage?.title);
});

// If the Raul/Janet daydream is exited abnormally, run its normal teardown to restore body and stats.
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
$(document).on(":passagestart", ev => {
	if (!V.scarletVision || V.replayScene) return;
	// Prefer the incoming event title; V.passage is only a fallback.
	const title = (ev && ev.passage && ev.passage.title) || V.passage;
	if (!title || scarletVisionPassages.includes(title)) return;

	console.warn("Raul and Janet daydream was left via " + title + " without its ending; restoring the real body.");
	Wikifier.wikifyEval("<<sleepJanet>>");
});

// Save compatibility runs on load; only expiry checks need a per-passage tick.
function repairBeautyBoostShape() {
	V.beautyBoost ??= { bath: 0, teeth: 0, face: 0, hands: 0, hygiene: 0, tan: 0 };
	if (V.beautyBoost.bath == null) V.beautyBoost.bath = 0;
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
}
window.repairBeautyBoostShape = repairBeautyBoostShape;
$(document).on(":storyready :onloadsave", repairBeautyBoostShape);

$(document).on(":passageinit", () => {
	if (V.sleepTimePassing) V.sleepTimePassing = false;
	// One cheap guard covers a save that reached a passage without a load event running first.
	if (typeof V.beautyBoost?.spa !== "object" || typeof V.beautyBoost?.nails !== "object") repairBeautyBoostShape();

	const spa = V.beautyBoost.spa;
	if (spa.amount > 0 && spa.expires > 0 && Time.days > spa.expires) {
		spa.amount = 0;
		spa.expiredNotice = true;
	}
	const nails = V.beautyBoost.nails;
	if (nails.amount > 0 && nails.expires > 0 && Time.days > nails.expires) {
		nails.amount = 0;
		nails.expiredNotice = true;
	}
});

function getGenderedPath(path) {
	if (typeof path === "string" && (V.options?.altImgAlways === 1 || (V.options?.useAltImg === 1 && V.player?.sex === V.options?.altImgGender))) {
		// Redirect only img/ paths; leave mod paths, data URIs and existing img2/ paths untouched.
		if (!path.startsWith("img/")) return path;
		let sub = path.substring(4);
		if (sub[0] === "/") {
			sub = sub.substring(1);
		}
		// These folders stay on the main img set; clothing preview icons are the exception.
		const sharedFolders = ["decorations", "sex", "ui", "misc"];
		const clothingIcon = sub.startsWith("misc/icon/clothes/");
		if (sharedFolders.includes(sub.split("/")[0]) && !clothingIcon) {
			return path;
		}
		return "img2/" + sub;
	} else return path;
}
window.getGenderedPath = getGenderedPath;

// Rain can reach extremities directly; covered torso, lower body and genitals follow clothing exposure rules.
function rainExposedBodyparts() {
	const w = V.worn;
	if (!w) return [];

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

// Rain washes exposed body fluids hourly; heavier rain removes more.
function rainWashFluids(hours = 1) {
	if (V.statFreeze || hours < 1) return;
	if (V.outside !== 1 || Weather.precipitation !== "rain") return;
	if (!V.player?.bodyliquid) return;

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

// Voice routing uses male/female/sissy/butch/herm buckets; herm takes priority over sex/posture routing.
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

function playerVoiceCategory() {
	if (playerIsHerm()) return "herm";
	const sex = V.player && V.player.sex;
	const posture = V.player && V.player.gender_posture;
	const usePosture = !!(V.options && V.options.postureAffectsVoice);
	if (sex === "m") return usePosture && posture === "f" ? "sissy" : "male";
	if (sex === "f") return usePosture && posture === "m" ? "butch" : "female";
	return "male";
}
window.playerVoiceCategory = playerVoiceCategory;

// Defaults preserve existing male/female routing; herm defaults to the v1 voice.
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

function playerVoiceSettings() {
	const cat = playerVoiceCategory();
	const def = defaultVoiceConfig()[cat];
	const cur = (V.options && V.options.voiceConfig && V.options.voiceConfig[cat]) || {};
	return {
		category: cat,
		voice: cur.voice || def.voice,
		enabled: cur.enabled !== false,
		npc: cur.npc || def.npc,
	};
}
window.playerVoiceSettings = playerVoiceSettings;

function playerVoiceIsFemale() {
	const s = playerVoiceSettings();
	return s.enabled && (s.voice === "v1" || s.voice === "v2");
}
window.playerVoiceIsFemale = playerVoiceIsFemale;

function playerVoiceIsMale() {
	const s = playerVoiceSettings();
	return s.enabled && s.voice === "m";
}
window.playerVoiceIsMale = playerVoiceIsMale;

function npcVoiceAllowed(pronoun) {
	if (!V.options || V.options.npcVoiceoverAudio === 0) return false;
	const npc = playerVoiceSettings().npc;
	if (npc === "off") return false;
	if (npc === "m") return pronoun === "m";
	if (npc === "f") return pronoun === "f";
	return true;
}
window.npcVoiceAllowed = npcVoiceAllowed;

// Skill income bonus: none below S (1000), +10% at S scaling to +50% at SSS (2000).
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

	return 1 + 0.1 + 0.4 * Math.clamp((value - 1000) / 1000, 0, 1);
}
window.skillIncomeMultiplier = skillIncomeMultiplier;

// Apply the bonus once per completed transformation; compatible chimera/custom TF bonuses intentionally compound.
function animalTfMultiplier(value, bonus, ...types) {
	let result = Number(value) || 0;
	for (const type of types.flat()) {
		if (Transformations.effectiveLevel(type) >= (type === "waterdragon" ? 7 : 6)) result *= 1 + bonus;
	}
	return result;
}
window.animalTfMultiplier = animalTfMultiplier;

const animalTfIncomeBonus = 0.75;
window.animalTfIncomeBonus = animalTfIncomeBonus;

function animalTfIncome(value, ...types) {
	return Math.round(animalTfMultiplier(value, animalTfIncomeBonus, types));
}
window.animalTfIncome = animalTfIncome;

// Divine income: fallen +20% all income; angel +50% non-sexual; demon +50% sexualised work.
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

// Pub fencing value combines loot, maths haggling, skulduggery and valuable-sale bonuses in one shared calculation.
function blackMoneySaleValue() {
	const base = (Number.isFinite(V.blackmoney) ? V.blackmoney : 0) * 100;
	if (base <= 0) return 0;
	const mathsBuff = V.mathsTraitBuffs && V.mathsTraitBuffs.stolen === 1 ? 1 + (Number(V.mathstrait) || 0) / 4 : 1;
	const skulduggery = typeof currentSkillValue === "function" ? currentSkillValue("skulduggery") : Number(V.skulduggery) || 0;
	const skulduggeryBuff = 1 + skulduggery / 2000;
	return Math.round(base * mathsBuff * skulduggeryBuff * valuableSaleMultiplier());
}
window.blackMoneySaleValue = blackMoneySaleValue;

// Preview the same divine bonus that payout applies so displayed and credited sale values match.
function previewSaleValue(value, source) {
	return divineTfIncome(value, source);
}
window.previewSaleValue = previewSaleValue;

// Derived from the current outfit so torn clothes can raise office danger mid-assignment.
function officeSluttyAllure() {
	// eslint-disable-next-line no-undef
	if (!inappropriatePlayerState("clothes")) return 0;
	let bonus = 1200;
	if (V.exposed >= 1) bonus += 900;
	if (V.exposed >= 2) bonus += 900;
	return bonus;
}
window.officeSluttyAllure = officeSluttyAllure;

function wearingTidebloomRing() {
	// Use variable, not name: strip widgets may blank the displayed worn name to "naked".
	return V.worn?.rings?.variable === "tidebloom";
}
window.wearingTidebloomRing = wearingTidebloomRing;

/*
 * Use player.perceived_breastsize for the visible bust size.
 * Refresh before reading, since clothing changes can affect it.
 */
function apparentBreastSize() {
	window.apparentbreastsizecheck();
	const perceived = V.player?.perceived_breastsize;
	return Number.isFinite(perceived) ? perceived : Number(V.player?.breastsize) || 0;
}
window.apparentBreastSize = apparentBreastSize;

/* True when clothing is hiding some of the PC's bust, so commentary about their chest is reacting to the clothes. */
function breastsAreBound() {
	return apparentBreastSize() < (Number(V.player?.breastsize) || 0);
}
window.breastsAreBound = breastsAreBound;
