/* global V Time statChange npcPregnancyRoll inseminate conceiveNow availablePlayerPregnancySlot orificeHasParasites getActivePregnancies */
/**
 * Force an impregnation of the NPC in a slot, skipping the conception roll.
 * The record is tagged so randomPregnancyProgress clears it at term instead of sending the child to Bailey.
 *
 * @param {number} slot $NPCList slot of the carrier
 * @returns {boolean} whether a pregnancy was recorded
 */
window.colosseumBreedNpc = function (slot) {
	const npc = V.NPCList[slot];
	if (!npc?.fullDescription) return false;
	const pregnancyId = npcPregnancyRoll(npc.fullDescription, npc.type, "pc", "human", "vagina", "deep", V.location, 1, slot, true);
	if (!Number.isInteger(pregnancyId) || !V.pregnancies[pregnancyId]) return false;
	V.pregnancies[pregnancyId].colosseum = 1;
	V.xchange.colosseum.sired = (V.xchange.colosseum.sired ?? 0) + 1;
	return true;
};

/**
 * Close out a Colosseum breeding encounter for the NPC in a slot.
 * Any pregnancy the fight itself created since the snapshot in storedBefore is tagged for the house.
 * If the fight made none and the player has a cock and climaxed, one is forced.
 *
 * @param {number} slot $NPCList slot of the carrier
 * @returns {boolean} whether the carrier ended up pregnant
 */
window.colosseumSettleBreeding = function (slot) {
	const col = V.xchange.colosseum;
	const known = col.storedBefore ?? [];
	let tagged = 0;
	for (const key of Object.keys(V.storedNPCs)) {
		if (known.includes(key)) continue;
		for (const record of getActivePregnancies(key)) {
			V.pregnancies[record.pregnancyId].colosseum = 1;
			tagged++;
		}
	}
	delete col.storedBefore;
	if (tagged > 0) {
		col.sired = (col.sired ?? 0) + tagged;
		return true;
	}
	if (!V.player.penisExist || !(V.speechorgasmcount > 0)) return false;
	return window.colosseumBreedNpc(slot);
};

/**
 * Force the player to conceive from a Colosseum opponent, skipping the conception roll.
 * Anatomy, parasites and the pregnancy settings are still respected.
 *
 * @param {string} donor the opponent's description, recorded as the other parent
 * @returns {boolean} whether the player is now pregnant
 */
window.colosseumBreedPlayer = function (donor) {
	const orifice = V.player.vaginaExist ? "vagina" : "anus";
	const slot = availablePlayerPregnancySlot(orifice);
	if (slot === null || orificeHasParasites(orifice)) return false;
	const load = inseminate(orifice, donor, "human", "deep", V.location, 1, null);
	if (!load) return false;
	return Number.isInteger(conceiveNow(orifice, load, slot));
};

/**
 * Apply the maximum Combat fame deterrent to a city danger roll.
 *
 * @param {number} threshold minimum dangerous roll on a 1-10000 die
 * @returns {number} adjusted threshold
 */
window.colosseumDangerThreshold = function (threshold) {
	if (!(V.fame?.scrap >= 4000) || !["town", "alley", "flats", "canals"].includes(V.location)) return threshold;
	const col = V.xchange?.colosseum;
	if (col?.hunt >= 1 && !(col.huntUntil > 0 && Time.days >= col.huntUntil)) return threshold;
	const chance = Math.clamp(10001 - Math.ceil(threshold), 0, 10000);
	return 10001 - Math.floor(chance * 0.85);
};

/* One saved expiry covers the dose and its two-hour rebound, including time spent outside the arena. */
window.colosseumDrugStage = function () {
	const until = V.xchange?.colosseum?.drugUntil;
	if (!Number.isFinite(until)) return "";
	if (V.timeStamp < until) return "active";
	return V.timeStamp < until + 7200 ? "crash" : "";
};

/* Pain let through while the dose holds. */
window.COLOSSEUM_DRUG_PAIN_LET_THROUGH = 0.1;

/* Comedown trauma hit: ~2x the worst arena scene after an hour of numbness to bodily harm. */
window.COLOSSEUM_DRUG_CRASH_TRAUMA = 10;

/**
 * Advance the dose clock and trigger the comedown when due.
 * Crash trauma is awarded once, unless the scene is frozen.
 *
 * @returns {boolean} Whether crash trauma was awarded.
 */
window.colosseumDrugTick = function () {
	const col = V.xchange?.colosseum;
	if (!col || !Number.isFinite(col.drugUntil)) return false;
	if (V.statFreeze) return false;
	const stage = window.colosseumDrugStage();
	let crashed = false;
	// Long rests can skip the entire crash window; settle the cost before expiry cleanup.
	if (V.timeStamp >= col.drugUntil && !col.drugCrashed) {
		col.drugCrashed = 1;
		statChange.trauma(window.COLOSSEUM_DRUG_CRASH_TRAUMA);
		/* Shared effects channel, since the dose can wear off anywhere. */
		V.colosseumDrugCrashMessage = 1;
		V.effectsmessage = 1;
		crashed = true;
	}
	if (!stage) {
		delete col.drugUntil;
		delete col.drugCrashed;
	}
	if (!crashed) statChange.updatePlayerTraumaState();
	return crashed;
};
