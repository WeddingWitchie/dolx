/* global V statChange */
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
