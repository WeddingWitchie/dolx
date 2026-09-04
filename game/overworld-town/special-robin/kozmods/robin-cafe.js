/* globals DateTime ensureRobinStand pocketOutfitReveal pocketOutfitGender pocketOutfitName pocketOutfitPieceNames pocketOutfitSurrender pocketOutfitCarrying */
/* Robin's second job at the Ocean Breeze (DoLX).
 *
 * Robin works weekday afternoons at the cafe after being introduced to Sam.
 * This does not overlap with the weekend drink stand.
 * Cafe shifts also reduce the time Robin can spend preparing for the stand.
 *
 * V.robinCafe:
 *   stage        0 not started
 *                1 Sam agreed, Robin not told
 *                2 trial shift
 *                3 working normally
 *                4 difficult customer scene ready
 *                5 scene resolved
 *   shifts       total weekday shifts worked
 *   weekShifts   shifts worked this week
 *   rainDays     weekend stand days lost to rain
 *   startTime    date the job was accepted; work begins on the next school day
 *   lastWage     last cafe wage
 *   totalWage    total cafe earnings
 *   handled      "" | "player" | "robin"
 *   outfit       serving outfit given to Robin, or null
 *   ended        "" | "kept" | "quit"
 *   seen         one-off scene flags
 */

setup.robinCafe = {
	/* Base £ Robin takes home per weekday shift, before their serving skill is counted. */
	wagePerShift: 45,
	/* The stand loses this share of its weekly income while Robin is also working the cafe. */
	standPenalty: 0.25,
	/* Shifts needed to reach each stage. */
	settleShifts: 5,
	confidentShifts: 10,
	/* Hours Robin is behind the counter on a weekday. */
	shiftStart: 17,
	shiftEnd: 19,
};

function ensureRobinCafe() {
	if (!V.robinCafe || typeof V.robinCafe !== "object") V.robinCafe = {};
	const cafe = V.robinCafe;
	if (!Number.isFinite(cafe.stage)) cafe.stage = 0;
	cafe.stage = Math.clamp(Math.trunc(cafe.stage), 0, 5);
	if (!Number.isFinite(cafe.shifts)) cafe.shifts = 0;
	if (!Number.isFinite(cafe.weekShifts)) cafe.weekShifts = 0;
	if (!Number.isFinite(cafe.rainDays)) cafe.rainDays = 0;
	if (cafe.startTime !== undefined && !Number.isFinite(cafe.startTime)) delete cafe.startTime;
	if (!Number.isFinite(cafe.lastWage)) cafe.lastWage = 0;
	if (!Number.isFinite(cafe.totalWage)) cafe.totalWage = 0;
	if (typeof cafe.handled !== "string") cafe.handled = "";
	if (typeof cafe.ended !== "string") cafe.ended = "";
	if (cafe.ended === "quit") delete cafe.startTime;
	if (!cafe.seen || typeof cafe.seen !== "object") cafe.seen = {};
	if (cafe.outfit && typeof cafe.outfit === "object") {
		if (!Array.isArray(cafe.outfit.pieces) || cafe.outfit.pieces.length === 0) cafe.outfit = null;
		else {
			if (!Number.isFinite(cafe.outfit.shifts)) cafe.outfit.shifts = 0;
			if (!cafe.outfit.seen || typeof cafe.outfit.seen !== "object") cafe.outfit.seen = {};
			cafe.outfit.worn = !!cafe.outfit.worn;
		}
	} else if (cafe.outfit !== null) {
		cafe.outfit = null;
	}
	return cafe;
}
window.ensureRobinCafe = ensureRobinCafe;

/* Robin is actually on the rota: told about the job, and hasn't walked away from it. */
function robinCafeEmployed() {
	const cafe = ensureRobinCafe();
	const today = new DateTime(Time.year, Time.month, Time.monthDay).timeStamp;
	return cafe.stage >= 2 && cafe.ended !== "quit" && (!Number.isFinite(cafe.startTime) || today > cafe.startTime);
}
window.robinCafeEmployed = robinCafeEmployed;

/* Whether Robin is behind the counter right now. Read by getRobinLocation(). */
function robinCafeShiftNow() {
	if (!robinCafeEmployed()) return false;
	if (!Time.schoolDay) return false;
	if (C.npc.Robin.trauma >= 70) return false;
	if (V.robin.timer.hurt >= 1) return false;
	if (V.robinmissing) return false;
	return between(Time.hour, setup.robinCafe.shiftStart, setup.robinCafe.shiftEnd);
}
window.robinCafeShiftNow = robinCafeShiftNow;

/* The player can only put Robin forward once they work at the cafe themselves and Robin trusts them. */
function robinCafeIntroAvailable() {
	const cafe = ensureRobinCafe();
	if (cafe.stage !== 0 || cafe.ended) return false;
	if (C.npc.Robin.init !== 1 || V.robinmissing) return false;
	if (V.oceanbreezejob !== 1) return false;
	if (C.npc.Robin.love < 30 || C.npc.Robin.trauma >= 60) return false;
	if (V.robin.timer.hurt >= 1 || V.robinbreakupCooldown) return false;
	return true;
}
window.robinCafeIntroAvailable = robinCafeIntroAvailable;

/* Sam has said yes but Robin doesn't know yet — the conversation waits at the orphanage. */
function robinCafeTellAvailable() {
	const cafe = ensureRobinCafe();
	return cafe.stage === 1 && !V.robinmissing && V.robin.timer.hurt === 0 && !V.robinbreakupCooldown;
}
window.robinCafeTellAvailable = robinCafeTellAvailable;

/* Which one-off cafe scene, if any, is owed the next time the player drops in on a shift. */
function robinCafeSceneDue() {
	const cafe = ensureRobinCafe();
	if (!robinCafeEmployed()) return "";
	if (cafe.stage === 2 && cafe.shifts >= 1) return "first";
	if (cafe.stage === 3 && cafe.shifts >= setup.robinCafe.confidentShifts) return "difficult";
	return "";
}
window.robinCafeSceneDue = robinCafeSceneDue;

/* Robin decides what to do with the job once the difficult customer is behind them. */
function robinCafeResolutionAvailable() {
	const cafe = ensureRobinCafe();
	return cafe.stage === 4 && !V.robinmissing && V.robin.timer.hurt === 0 && !V.robinbreakupCooldown;
}
window.robinCafeResolutionAvailable = robinCafeResolutionAvailable;

/* £ Robin takes home for one shift. Their stand skill transfers: serving is serving. */
function robinCafeShiftWage() {
	const stand = ensureRobinStand();
	return Math.round(setup.robinCafe.wagePerShift * (1 + stand.skill / 2000));
}
window.robinCafeShiftWage = robinCafeShiftWage;

/* Daily tick. Records the shift Robin worked, and notes weekends the stand was rained off. */
function robinCafeDayPassed() {
	const cafe = ensureRobinCafe();
	if (robinCafeEmployed() && Time.isWeekEnd() && Weather.precipitation === "rain") cafe.rainDays++;
	if (!robinCafeEmployed()) return;
	if (!Time.isSchoolDay(Time.yesterday)) return;
	/* The offer says Robin starts on the next school day. Do not back-credit the day the player told them. */
	if (Number.isFinite(cafe.startTime) && Time.yesterday.timeStamp <= cafe.startTime) return;
	delete cafe.startTime;
	if (V.robinmissing || C.npc.Robin.trauma >= 70 || V.robin.timer.hurt >= 1) return;
	cafe.shifts++;
	cafe.weekShifts++;
	/* Working a counter every weekday teaches the same things the stand does, a little faster. */
	const stand = ensureRobinStand();
	if (stand.skill < 1000) stand.skill = Math.min(stand.skill + 3, 1000);
	if (cafe.outfit && cafe.outfit.worn) cafe.outfit.shifts++;
	if (cafe.stage === 2 && cafe.shifts >= setup.robinCafe.settleShifts && cafe.seen.first) cafe.stage = 3;
}
window.robinCafeDayPassed = robinCafeDayPassed;

/* Weekly cafe payout. Returns the amount added to Robin's savings. */
function robinCafeWeeklyTick() {
	const cafe = ensureRobinCafe();
	const shifts = cafe.weekShifts;
	/* A washed-out weekend is a week Robin picks up whatever extra hours Sam has going. */
	const extra = Math.min(cafe.rainDays, 2);
	cafe.weekShifts = 0;
	cafe.rainDays = 0;
	/* Shifts already worked are still owed if Robin leaves before payday. */
	if (shifts <= 0) {
		cafe.lastWage = 0;
		return 0;
	}
	const wage = (shifts + extra) * robinCafeShiftWage();
	cafe.lastWage = wage;
	cafe.totalWage += wage;
	return wage;
}
window.robinCafeWeeklyTick = robinCafeWeeklyTick;

/* Share of the stand's weekly income lost to the hours the cafe takes up. */
function robinCafeStandModifier() {
	/* weekShifts is cleared after the stand payout, so it describes the same week being calculated. */
	return ensureRobinCafe().weekShifts > 0 ? 1 - setup.robinCafe.standPenalty : 1;
}
window.robinCafeStandModifier = robinCafeStandModifier;

/* ------------------------------------------------------------------ *
 * The serving outfit the player can hand over
 * ------------------------------------------------------------------ */
/* Reveal above this reads as a deliberately sexy outfit; below the lower one it reads as modest.
A plain t-shirt sits at 400, for scale. */
setup.robinOutfit = {
	sexyReveal: 650,
	modestReveal: 400,
	/* Robin has to have been comfortable crossdressing somewhere public before wearing one to work. */
	crossdressPublicLevel: 4,
	/* Confidence needed to wear one on shift, by how much the outfit asks of Robin. */
	domPlain: 40,
	domCharged: 55,
	domBoth: 70,
};

/* What Robin makes of an outfit, without changing anything.
Returns { verdict, crossdress, sexy, modest, domNeeded }.
  refuse: won't take it at all
  keep  : takes it, but won't wear it where people can see
  wear  : wears it on shift */
function robinOutfitReaction(pieces) {
	const robin = C.npc.Robin;
	const reveal = pocketOutfitReveal(pieces);
	const gender = pocketOutfitGender(pieces);
	const identity = robin.xchange && robin.xchange.genderflipEffect ? robin.startingSex : robin.pronoun;
	const crossdress = gender !== "n" && gender !== identity;
	const sexy = reveal >= setup.robinOutfit.sexyReveal;
	const modest = reveal < setup.robinOutfit.modestReveal;
	const comfort = robin.crossdress || 0;
	const result = { verdict: "refuse", crossdress, sexy, modest, reveal, domNeeded: setup.robinOutfit.domPlain, reason: "" };

	if (robin.trauma >= 60) {
		result.reason = "trauma";
		return result;
	}
	if (crossdress && comfort < 2) {
		/* Robin's crossdressing has its own arc; a gift shouldn't skip the start of it. */
		result.reason = "never";
		return result;
	}

	if (crossdress && sexy) result.domNeeded = setup.robinOutfit.domBoth;
	else if (crossdress || sexy) result.domNeeded = setup.robinOutfit.domCharged;

	if (robin.dom < result.domNeeded) {
		result.verdict = "keep";
		result.reason = "shy";
		return result;
	}
	if (crossdress && comfort < setup.robinOutfit.crossdressPublicLevel) {
		result.verdict = "keep";
		result.reason = "public";
		return result;
	}
	result.verdict = "wear";
	return result;
}
window.robinOutfitReaction = robinOutfitReaction;

/* The player can offer an outfit once Robin actually has somewhere to wear one. */
function robinOutfitOfferAvailable() {
	const cafe = ensureRobinCafe();
	if (cafe.outfit) return false;
	/* Robin needs somewhere to wear one: the cafe rota, or the stand they went back to. */
	if (!robinCafeEmployed() && cafe.ended !== "quit") return false;
	if (typeof pocketOutfitCarrying !== "function" || !pocketOutfitCarrying()) return false;
	if (V.robinmissing || V.robin.timer.hurt >= 1 || V.robinbreakupCooldown) return false;
	return true;
}
window.robinOutfitOfferAvailable = robinOutfitOfferAvailable;

/* The offer scene has three outcomes that use $robinOutfitPending.
Rebuild it from the current outfit if missing so opening an outcome directly does not cause an error. */
function robinOutfitPendingRebuild() {
	const cafe = ensureRobinCafe();
	let pieces = [];
	if (typeof pocketOutfitCarrying === "function" && pocketOutfitCarrying()) pieces = V.pocket.outfit.pieces;
	else if (cafe.outfit && Array.isArray(cafe.outfit.pieces)) pieces = cafe.outfit.pieces;
	const reaction = robinOutfitReaction(pieces);
	V.robinOutfitPending = {
		verdict: reaction.verdict,
		reason: reaction.reason,
		crossdress: reaction.crossdress,
		sexy: reaction.sexy,
		modest: reaction.modest,
		name: pocketOutfitName(pieces) || "outfit",
		list: pocketOutfitPieceNames(pieces),
	};
	return V.robinOutfitPending;
}
window.robinOutfitPendingRebuild = robinOutfitPendingRebuild;

/* Take the bundle off the player and record it against Robin. */
function robinOutfitAccept(wear) {
	const cafe = ensureRobinCafe();
	const pieces = pocketOutfitSurrender();
	/* Nothing is being carried, likely from re-entering or clicking twice. Keep what Robin already has. */
	if (!pieces.length) return cafe.outfit;
	const reaction = robinOutfitReaction(pieces);
	cafe.outfit = {
		pieces,
		name: pocketOutfitName(pieces),
		names: pocketOutfitPieceNames(pieces),
		reveal: reaction.reveal,
		crossdress: reaction.crossdress,
		sexy: reaction.sexy,
		modest: reaction.modest,
		worn: !!wear,
		shifts: 0,
		seen: {},
	};
	return cafe.outfit;
}
window.robinOutfitAccept = robinOutfitAccept;

/* Robin is on shift and dressed in the gift. */
function robinOutfitWorn() {
	const cafe = ensureRobinCafe();
	return !!(cafe.outfit && cafe.outfit.worn);
}
window.robinOutfitWorn = robinOutfitWorn;

/* Robin has the outfit but hasn't dared wear it out yet, and has since grown into it. */
function robinOutfitReadyToWear() {
	const cafe = ensureRobinCafe();
	if (!cafe.outfit || cafe.outfit.worn) return false;
	if (V.robinmissing || V.robin.timer.hurt >= 1 || V.robinbreakupCooldown) return false;
	return robinOutfitReaction(cafe.outfit.pieces).verdict === "wear";
}
window.robinOutfitReadyToWear = robinOutfitReadyToWear;

/* Which one-off outfit scene the cafe owes the player. */
function robinOutfitSceneDue() {
	const cafe = ensureRobinCafe();
	if (!robinOutfitWorn() || !robinCafeEmployed()) return "";
	if (!cafe.outfit.seen.debut) return "debut";
	if (cafe.outfit.shifts >= 4 && !cafe.outfit.seen.regulars) return "regulars";
	return "";
}
window.robinOutfitSceneDue = robinOutfitSceneDue;
