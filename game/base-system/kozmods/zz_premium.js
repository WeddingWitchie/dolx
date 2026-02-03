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
			inv[name] = { owned: 0, doseTaken: 0, overdose: 0 };
		} else {
			if (typeof inv[name].owned !== "number") inv[name].owned = 0;
			if (typeof inv[name].doseTaken !== "number") inv[name].doseTaken = 0;
			if (typeof inv[name].overdose !== "number") inv[name].overdose = 0;
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

	// --- Safe listUniqueCarriedXchangePills() ---
	window.listUniqueCarriedXchangePills = function () {
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
			const owned = entry && typeof entry.owned === "number" ? entry.owned : 0;
			if (owned <= 0) continue;
			if (seen.has(def.name)) continue;

			seen.add(def.name);
			out.push(def);
		}
		return out;
	};

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
