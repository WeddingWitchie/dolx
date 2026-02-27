/* X-Change Premium runtime helpers 
   - Robust listUniqueCarriedXchangePills() (prevents `.owned` crashes)
   - Pronoun/text override while X-Change pill active (presentationGenderOverride)
*/
(function () {
	"use strict";

	function getV() {
		// DoL exposes State.variables; some builds also expose V.
		if (typeof State !== "undefined" && State.variables) return State.variables;
		if (typeof V !== "undefined") return V;
		return null;
	}

	function getPillDefs() {
		try {
			if (typeof setup === "undefined" || !setup.pills) return [];
			// Some builds use an array, others use an object keyed by name.
			return Array.isArray(setup.pills) ? setup.pills : Object.values(setup.pills);
		} catch (e) {
			return [];
		}
	}

	function ensureInvEntry(name) {
const V = getV();
if (!V) return null;
V.sexStats = V.sexStats || {};
V.sexStats.pills = V.sexStats.pills || {};
V.sexStats.pills.pills = V.sexStats.pills.pills || {};

const inv = V.sexStats.pills.pills;
if (!inv[name] || typeof inv[name] !== "object") {
	// Missing entry (common when loading older saves after new pills were added)
	inv[name] = { owned: 0, doseTaken: 0, overdose: 0 };
} else {
	// Only fill missing fields; don't silently coerce existing values.
	if (!("owned" in inv[name])) inv[name].owned = 0;
	if (!("doseTaken" in inv[name])) inv[name].doseTaken = 0;
	if (!("overdose" in inv[name])) inv[name].overdose = 0;

	// If types are wrong, log loudly (helps find real root cause instead of masking it).
	if (typeof inv[name].owned !== "number" || typeof inv[name].doseTaken !== "number" || typeof inv[name].overdose !== "number") {
		try {
			console.warn("[X-Change Premium] Pill inventory entry has unexpected types for", name, inv[name]);
		} catch (e) {}
	}
}
return inv[name];
	}

	function ensureAllInvEntries() {
		try {
			const defs = getPillDefs();
			defs.forEach((def) => {
				if (def && typeof def.name === "string") ensureInvEntry(def.name);
			});
		} catch (e) {
			// ignore
		}
	}

// --- listUniqueCarriedXchangePills() ---
// Core X-Change defines this to *limit which pills are usable on NPCs during combat*.
// Premium must NOT replace that logic, only:
//  1) prevent missing-inventory crashes (ensureAllInvEntries)
//  2) expose a separate helper that returns *all* carried X-Change pills for non-combat/premium UIs.
//  3) wrap the core function lazily once it's present, so load-order can't break it.

function listUniqueCarriedXchangePillsAll() {
	const V = getV();
	if (!V) return [];

	ensureAllInvEntries();

	const inv = (V.sexStats && V.sexStats.pills && V.sexStats.pills.pills) ? V.sexStats.pills.pills : {};
	const defs = getPillDefs();

	const out = [];
	const seen = new Set();

	for (const def of defs) {
		if (!def || typeof def.name !== "string") continue;
		if (def.type !== "xchange") continue;

		const entry = inv[def.name];
		const owned = entry ? Number(entry.owned) : 0;
		if (!(owned > 0)) continue;
		if (seen.has(def.name)) continue;

		seen.add(def.name);
		out.push(def);
	}
	return out;
}

// A "known-safe" limited implementation (mirrors the core's current experimental rollout list).
// Used only as a fallback if the core function isn't available yet.
function listUniqueCarriedXchangePillsLimited() {
	const V = getV();
	if (!V) return [];

	ensureAllInvEntries();

	const defs = getPillDefs().filter(p => p && p.type === "xchange");
	const inv = V.sexStats && V.sexStats.pills && V.sexStats.pills.pills ? V.sexStats.pills.pills : {};

	const allowed = new Set([
		"pink basic", "blue basic",
		"pink continue", "pink resistance",
		"blue continue", "blue resistance",
	]);

	const out = [];
	for (const pill of defs) {
		const entry = inv[pill.name];
		const owned = entry ? Number(entry.owned) : 0;
		if (owned > 0 && allowed.has(pill.subtype)) out.push(pill);
	}
	return out;
}

// Expose helpers for debugging / UIs that explicitly want the full list.
window.listUniqueCarriedXchangePillsAll = listUniqueCarriedXchangePillsAll;
window.listUniqueCarriedXchangePillsLimited = listUniqueCarriedXchangePillsLimited;

function wrapCoreListUniqueCarriedXchangePills() {
	const cur = window.listUniqueCarriedXchangePills;

	// If the core hasn't defined it yet, provide the limited fallback (core may overwrite later).
	if (typeof cur !== "function") {
		window.listUniqueCarriedXchangePills = listUniqueCarriedXchangePillsLimited;
		return;
	}

	// Already wrapped? leave it.
	if (cur.__xchangePremiumWrapped) return;

	const orig = cur;
	function wrapped() {
		const V = getV();
		if (!V) return [];
		ensureAllInvEntries();
		return orig.apply(this, arguments);
	}

	wrapped.__xchangePremiumWrapped = true;
	wrapped.__orig = orig; // make captured original visible for debugging
	window.listUniqueCarriedXchangePills = wrapped;
}

try { wrapCoreListUniqueCarriedXchangePills(); } catch (e) {}
try {
	if (typeof jQuery !== "undefined") {
		jQuery(document).on(":passagestart", wrapCoreListUniqueCarriedXchangePills);
	}
} catch (e) {}

function ensurePillPremiumFlagDefault() {
	const V = getV();
	const pill = V && V.xchange && V.xchange.pill ? V.xchange.pill : null;
	if (pill && pill.active && typeof pill.isPremium !== "boolean") {
		pill.isPremium = false;
	}
	}

	try { ensurePillPremiumFlagDefault(); } catch (e) {}
	try {
	if (typeof jQuery !== "undefined") {
		jQuery(document).on(":passagestart", ensurePillPremiumFlagDefault);
	}
	} catch (e) {}

	// --- Pronoun/text override while active ---
	(function patchPresentationOverride() {
		let origMan = typeof window.playerFeelsManlike === "function" ? window.playerFeelsManlike : null;
		let origGirl = typeof window.playerFeelsGirllike === "function" ? window.playerFeelsGirllike : null;

		window.playerFeelsManlike = function () {
			const V = getV();
			const pill = V && V.xchange && V.xchange.pill ? V.xchange.pill : null;
			const ov = pill && pill.active ? pill.presentationGenderOverride : null;
			if (ov === "m") return true;
			if (ov === "f") return false;
			return origMan ? origMan() : !!(V && V.player && V.player.gender === "m");
		};

		window.playerFeelsGirllike = function () {
			const V = getV();
			const pill = V && V.xchange && V.xchange.pill ? V.xchange.pill : null;
			const ov = pill && pill.active ? pill.presentationGenderOverride : null;
			if (ov === "f") return true;
			if (ov === "m") return false;
			return origGirl ? origGirl() : !!(V && V.player && V.player.gender === "f");
		};
	})();

	// Try to ensure inventory exists early and on each passage.
	try { ensureAllInvEntries(); } catch (e) {}
	try {
		if (typeof jQuery !== "undefined") {
			jQuery(document).on(":passagestart", ensureAllInvEntries);
		}
	} catch (e) {}
})();


/* X-Change Premium popup/dialog helpers */
(function () {
	"use strict";

	function premiumPassageMarkup(name) {
		if (typeof Story === "undefined" || !Story.has(name)) {
			return "''Missing premium menu passage:'' " + name;
		}
		return Story.get(name).processText();
	}

	function ensurePremiumVars() {
		const V = (typeof State !== "undefined" && State.variables) ? State.variables : (typeof window.V !== "undefined" ? window.V : null);
		if (!V) return null;
		V.xchange = V.xchange || {};
		V.xchange.pill = V.xchange.pill || {};
		V.xchange.premium = V.xchange.premium || {};
		if (!V.xchange.premium.screenPassage) V.xchange.premium.screenPassage = "X-Change Premium Menu";
		return V;
	}

	window.renderXChangePremiumMenu = function renderXChangePremiumMenu(name) {
		const V = ensurePremiumVars();
		if (!V || typeof Dialog === "undefined") return false;

		const passageName = name || V.xchange.premium.screenPassage || "X-Change Premium Menu";
		V.xchange.premium.screenPassage = passageName;

		try {
			if (typeof Dialog.isOpen === "function" && Dialog.isOpen("xchange-premium")) {
				Dialog.empty();
			} else if (typeof Dialog.create === "function") {
				Dialog.create("Premium Pill", "xchange-premium");
			} else if (typeof Dialog.setup === "function") {
				Dialog.setup("Premium Pill", "xchange-premium");
			} else {
				console.error("[X-Change Premium] No compatible Dialog API found.");
				return false;
			}

			if (typeof Dialog.wikiPassage === "function") {
				Dialog.wikiPassage(passageName);
			} else if (typeof Dialog.wiki === "function") {
				Dialog.wiki(premiumPassageMarkup(passageName));
			} else {
				console.error("[X-Change Premium] Dialog exists, but cannot render wiki content.");
				return false;
			}

			if (!(typeof Dialog.isOpen === "function" && Dialog.isOpen("xchange-premium"))) {
				Dialog.open();
			}
			return true;
		} catch (e) {
			console.error("[X-Change Premium] Failed to render popup menu.", e);
			return false;
		}
	};

	window.openXChangePremiumMenu = function openXChangePremiumMenu() {
		return window.renderXChangePremiumMenu();
	};

	window.closeXChangePremiumMenu = function closeXChangePremiumMenu() {
		if (typeof Dialog !== "undefined" && typeof Dialog.close === "function") {
			Dialog.close();
		}
	};
})();
