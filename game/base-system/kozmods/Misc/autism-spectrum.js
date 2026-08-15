/* Autism Spectrum starting trait.
 *
 * Includes three systems:
 *  Gifted / Burnout: alternating phases with a new random duration each time.
 *  Hyperfixation: one stat is chosen for 3 to 5 days. Its gains are doubled and practising it reduces stress.
 *  Focus fatigue: repeatedly practising other stats without a break increases stress.
 *
 * Stat bonuses apply to all gains, but focus fatigue only counts deliberate practice.
 * Some stats always count as practice when gained. Physique and athletics only count at training locations,
 * so normal travelling does not build focus fatigue. */

const autismSpectrumStats = Object.freeze({
	science: "science",
	maths: "maths",
	english: "English",
	history: "history",
	physique: "physique",
	willpower: "willpower",
	athletics: "athletics",
	swimming: "swimming",
	dancing: "dancing",
	tending: "tending",
	housekeeping: "housekeeping",
	skulduggery: "skulduggery",
	brawling: "brawling",
	footwork: "footwork",
	striking: "striking",
	kicking: "kicking",
	seductionskill: "seduction",
	oralskill: "oral skill",
	vaginalskill: "vaginal skill",
	penileskill: "penile skill",
	handskill: "hand skill",
	analskill: "anal skill",
	feetskill: "foot skill",
	bottomskill: "bottom skill",
	thighskill: "thigh skill",
	chestskill: "chest skill",
});

/* Subjects that Burnout makes especially draining to study. */
const autismSchoolSubjects = Object.freeze(["science", "maths", "english", "history"]);

/* Places where the PC goes specifically to train. Walking through an area does not count as practice.
The beach, park, and orphanage are excluded because their training activities are handled separately. */
const autismTrainingLocations = Object.freeze(["mma_gym", "pool", "dance_studio", "school", "temple", "alex_farm"]);

/* Stats that count as practice at training venues. Sex skills are excluded because they do not count as training. */
const autismVenueTrainableStats = Object.freeze(["physique", "athletics", "willpower", "swimming", "brawling", "footwork", "striking", "kicking"]);

/* Stats that can be chosen for the daily hyperfixation.
Only stats the player can actively practise are included, so every fixation can give both doubled gains and Stress relief.
Sex skills and Skulduggery are excluded because they have no regular practice option. */
const autismHyperfixationPool = Object.freeze([
	"science",
	"maths",
	"english",
	"history",
	"physique",
	"willpower",
	"athletics",
	"swimming",
	"dancing",
	"tending",
	"housekeeping",
	"brawling",
	"footwork",
	"striking",
	"kicking",
]);

/* Advanced combat skills can only be practised when their toggle is enabled.
Disabled skills are excluded from fixations. */
const autismToggledStats = Object.freeze({
	brawling: "brawlingToggle",
	footwork: "footworkToggle",
	striking: "strikingToggle",
	kicking: "kickingToggle",
});

function autismStatIsAvailable(stat) {
	const toggle = autismToggledStats[stat];
	return !toggle || V.combatExtended?.[toggle] === 1;
}

/* Never empty: only the four combat skills can be disabled. All other skills remain available. */
function autismAvailableHyperfixations() {
	return autismHyperfixationPool.filter(autismStatIsAvailable);
}

/* Swimming is less likely to be chosen as a fixation during winter */
const autismWinterSwimmingChance = 25;

function autismRollHyperfixation(exclude) {
	let available = autismAvailableHyperfixations();
	if (Time?.season === "winter" && random(1, 100) > autismWinterSwimmingChance) {
		const withoutSwimming = available.filter(stat => stat !== "swimming");
		if (withoutSwimming.length) available = withoutSwimming;
	}
	if (exclude && available.length > 1) available = available.filter(stat => stat !== exclude);
	return available.random();
}

const autismHyperfixationDays = Object.freeze({ min: 3, max: 5 });

function autismRollHyperfixationDays() {
	return random(autismHyperfixationDays.min, autismHyperfixationDays.max);
}

function autismHyperfixationLengthText() {
	return `A fixation lasts ${autismHyperfixationDays.min} to ${autismHyperfixationDays.max} days.`;
}

/* Each phase gets a new random duration.
Gifted lasts longer than Burnout, so the trait is helpful most of the time. */
const autismPhaseDays = Object.freeze({
	gifted: { min: 25, max: 30 },
	burnout: { min: 14, max: 18 },
});

function autismRollPhaseDays(phase) {
	const range = autismPhaseDays[phase] || autismPhaseDays.gifted;
	return random(range.min, range.max);
}

/* One source for the day counts quoted in the settings and trait tooltips, so they cannot drift. */
function autismPhaseLengthText() {
	return `Gifted lasts ${autismPhaseDays.gifted.min} to ${autismPhaseDays.gifted.max} days, then Burnout lasts ${autismPhaseDays.burnout.min} to ${autismPhaseDays.burnout.max} days, over and over.`;
}

/* A break this long counts as rest. Sleeping, long journeys, or time in a cell clears focus fatigue. */
const autismSpectrumBreakMinutes = 180;

/* Maximum time counted as one practice session.
   Short actions like lessons, swimming, or gardening count normally.
   Longer events may raise a stat along the way, but their full duration should not count as practice or Burnout. */
const autismSpectrumSessionMaxMinutes = 120;

function playerHasAutismSpectrum() {
	return V.backgroundTraits?.includes("autism") === true;
}

function ensureAutismSpectrumState() {
	if (!V.autismSpectrum || typeof V.autismSpectrum !== "object" || Array.isArray(V.autismSpectrum)) {
		V.autismSpectrum = {};
	}
	const state = V.autismSpectrum;
	const today = Number(Time?.days) || 0;
	/* Also re-rolls a fixation on a combat skill the player has since switched off. */
	if (!autismAvailableHyperfixations().includes(state.hyperfixation)) {
		state.hyperfixation = autismRollHyperfixation();
		state.hyperfixationEndsDay = today + autismRollHyperfixationDays();
	}
	/* Older saves have a focus but no end day. Give that focus a full new stretch instead of replacing it on load. */
	if (!Number.isFinite(state.hyperfixationEndsDay)) state.hyperfixationEndsDay = today + autismRollHyperfixationDays();
	if (!Array.isArray(state.pendingStats)) state.pendingStats = [];
	if (!Number.isFinite(state.trainingMinutes) || state.trainingMinutes < 0) state.trainingMinutes = 0;
	if (!Number.isFinite(state.pendingMinutes) || state.pendingMinutes < 0) state.pendingMinutes = 0;
	/* Checks the full pool because this practice was valid when it started, even if its option has since been turned off. */
	if (state.pendingFocus != null && !autismHyperfixationPool.includes(state.pendingFocus)) delete state.pendingFocus;
	if (state.pendingPhase != null && !["gifted", "burnout"].includes(state.pendingPhase)) delete state.pendingPhase;
	if (state.kylarTrainingFocus != null && !autismHyperfixationPool.includes(state.kylarTrainingFocus)) delete state.kylarTrainingFocus;
	if (state.kylarEventFocus != null && !autismHyperfixationPool.includes(state.kylarEventFocus)) delete state.kylarEventFocus;
	/* Clear any invalid leftover outing location so it can't move the player somewhere unexpected. */
	if (state.kylarReturn != null && typeof state.kylarReturn?.location !== "string") delete state.kylarReturn;
	if (state.phase !== "gifted" && state.phase !== "burnout") state.phase = "gifted";
	/* An absolute day, never a countdown, so reloading or skipping time cannot knock it out of step. */
	if (!Number.isFinite(state.phaseEndsDay)) state.phaseEndsDay = today + autismRollPhaseDays(state.phase);
	/* Left over from when both phases were a fixed 90 days and the phase was derived from it. */
	if (state.startDay !== undefined) delete state.startDay;
	return state;
}

function autismSpectrumPhase() {
	if (!playerHasAutismSpectrum()) return "none";
	return ensureAutismSpectrumState().phase;
}

function autismSpectrumDaysRemaining() {
	if (!playerHasAutismSpectrum()) return 0;
	const state = ensureAutismSpectrumState();
	return Math.max(0, state.phaseEndsDay - (Number(Time?.days) || 0));
}

function autismHyperfixationName() {
	if (!playerHasAutismSpectrum()) return "";
	return autismSpectrumStats[ensureAutismSpectrumState().hyperfixation] || "something new";
}

function autismHyperfixationDaysRemaining() {
	if (!playerHasAutismSpectrum()) return 0;
	const state = ensureAutismSpectrumState();
	return Math.max(0, state.hyperfixationEndsDay - (Number(Time?.days) || 0));
}

function autismBeginKylarTraining() {
	if (!playerHasAutismSpectrum()) return false;
	const state = ensureAutismSpectrumState();
	if (state.kylarTrainingFocus === state.hyperfixation) return false;
	state.kylarEventFocus = state.hyperfixation;
	/* Where Kylar was found. The outing only changes location and outside, so restore those here. */
	state.kylarReturn = { location: V.location, outside: Number.isFinite(Number(V.outside)) ? V.outside : 0 };
	return true;
}

function autismKylarTrainingFocus() {
	if (!playerHasAutismSpectrum()) return "";
	const state = ensureAutismSpectrumState();
	return state.kylarEventFocus || state.hyperfixation;
}

function autismKylarTrainingName() {
	return autismSpectrumStats[autismKylarTrainingFocus()] || "something new";
}

function autismKylarTrainingAvailable() {
	if (!playerHasAutismSpectrum()) return false;
	const state = ensureAutismSpectrumState();
	return state.documentation === true && state.kylarDiscussed === true && state.kylarTrainingFocus !== state.hyperfixation;
}

function autismFinishKylarTraining() {
	if (!playerHasAutismSpectrum()) return;
	const state = ensureAutismSpectrumState();
	state.kylarTrainingFocus = state.kylarEventFocus || state.hyperfixation;
	delete state.kylarEventFocus;
}

/* Called once, from character creation, after "autism" is pushed onto $backgroundTraits. */
function initAutismSpectrumState() {
	if (!playerHasAutismSpectrum()) return;
	/* Start the Autism Spectrum cycle today.
	The setup function handles Gifted, its duration, and the first hyperfixation automatically. */
	delete V.autismSpectrum;
	ensureAutismSpectrumState();
	V.timeMessages ||= [];
	V.timeMessages.pushUnique("autismHyperfixation");
}

function autismSpectrumDailyUpdate() {
	if (!playerHasAutismSpectrum()) return;
	const state = ensureAutismSpectrumState();
	const today = Number(Time?.days) || 0;
	if (today >= state.phaseEndsDay) {
		state.phase = state.phase === "gifted" ? "burnout" : "gifted";
		state.phaseEndsDay = today + autismRollPhaseDays(state.phase);
		/* Sticky: the notice has to survive until effects() actually renders it. */
		state.phaseChanged = true;
	}
	if (today >= state.hyperfixationEndsDay) {
		state.hyperfixation = autismRollHyperfixation(state.hyperfixation);
		state.hyperfixationEndsDay = today + autismRollHyperfixationDays();
		/* Sticky for the same reason as phaseChanged: it has to survive until effects() renders it. */
		state.focusChanged = true;
	}
	state.trainingMinutes = 0;
	/* Only on the mornings something actually turned over. A fixation now runs 3 to 5 days, so announcing
	   it daily would repeat the same line up to five times for news the trait overlay already carries. */
	if (state.phaseChanged || state.focusChanged) {
		V.timeMessages ||= [];
		V.timeMessages.pushUnique("autismHyperfixation");
	}
}

/*
 * Multiplier for positive stat gains, kind:
 * "training"      = active practice
 * "school"        = active school work
 * "schoolPassive" = passive school progress
 * ""              = incidental gains; only counts as practice at a training location
 *
 * Only practice is affected by focus fatigue.
 */
function autismStatGainMultiplier(stat, amount = 1, kind = "") {
	if (!playerHasAutismSpectrum() || !(Number(amount) > 0) || !autismSpectrumStats[stat]) return 1;
	const state = ensureAutismSpectrumState();
	/* Kylar's outing uses the actual beach, park, and orphanage locations.
   	only the real practice reward counts as training. */
	const kylarTraining = typeof T !== "undefined" && T.autismKylarTraining === true && state.kylarEventFocus === stat;
	/* The outing holds the focus it set out with, even if midnight has since rolled the fixation over. */
	const activeFocus = kylarTraining ? stat : state.hyperfixation;
	const training =
		kind === "training" || kind === "school" || kylarTraining || (autismVenueTrainableStats.includes(stat) && autismTrainingLocations.includes(V.location));
	const school = kind === "school" || kind === "schoolPassive";
	const gifted = state.phase === "gifted";

	let multiplier = gifted ? 1.05 : 1;
	if (gifted && school) multiplier *= 1.25;

	if (activeFocus === stat) {
		multiplier *= 2;
	} else if (training && state.trainingMinutes > 0) {
		multiplier *= Math.max(0.5, 1 / (1 + Math.floor(state.trainingMinutes / 60) * 0.2));
	}

	if (training) {
		if (!state.pendingStats.length) {
			state.pendingFocus = activeFocus;
			state.pendingPhase = gifted ? "gifted" : "burnout";
		}
		state.pendingStats.pushUnique(stat);
	}
	return multiplier;
}

/* Time.pass reports here. Several passes can happen in one turn, so they accumulate. */
function autismTrainingTimePassed(minutes) {
	if (!playerHasAutismSpectrum()) return;
	const state = ensureAutismSpectrumState();
	state.pendingMinutes += Math.max(0, Number(minutes) || 0);
}

/*
 * Check this at the end of the turn so time passes and skill gains are both counted first.
 */
function autismSettleTraining() {
	if (!playerHasAutismSpectrum()) return;
	const state = ensureAutismSpectrumState();
	const minutes = state.pendingMinutes;
	const trained = state.pendingStats;
	const focus = state.pendingFocus;
	const phase = state.pendingPhase;
	state.pendingMinutes = 0;
	state.pendingStats = [];
	delete state.pendingFocus;
	delete state.pendingPhase;

	/* A zero-time passage change is neither training nor a break. */
	if (minutes <= 0) return;

	/* Long enough to be rest, whatever happened to tick up along the way. */
	if (minutes >= autismSpectrumBreakMinutes) {
		state.trainingMinutes = 0;
		return;
	}

	/* A short moment with no practice in it: not a break, so the streak stands. */
	if (!trained.length) return;

	/* Do not charge a half-written transient action restored from an older or interrupted save. */
	if (!focus || !phase) return;

	/* Too long for one session, but too short to count as rest.
	Since the actual practice time is unknown, don't add any practice hours. */
	if (minutes > autismSpectrumSessionMaxMinutes) return;

	/* Practising your fixation reduces stress, giving back twice as much as normal practice would cost. */
	if (trained.every(stat => stat === focus)) {
		state.trainingMinutes = 0;
		statChange.stress(-(minutes / 10));
		return;
	}

	const priorMinutes = state.trainingMinutes;
	state.trainingMinutes += minutes;
	const escalation = Math.min(4, 1 + Math.floor(priorMinutes / 60) * 0.5);
	let stress = (minutes / 15) * escalation;
	if (phase === "burnout" && trained.some(stat => autismSchoolSubjects.includes(stat))) {
		stress *= 2;
	}
	statChange.stress(stress);
}

/*
 * Extra stress from heat and liquid on the skin.
 * Uses raw stress points, so the multiplier is 1.
 */
function autismDiscomfortStress(minutes) {
	if (!playerHasAutismSpectrum() || V.timeSkip !== undefined || V.possessed) return;
	let extra = 0;

	const heatStress = Number(Weather?.BodyTemperature?.stressModifier) || 0;
	if (heatStress > 0) extra += heatStress * minutes * 0.5;

	/* Measures how much of the body is covered, not how much liquid there is.
	combined() adds three separately capped liquids, so the total does not show coverage well. */
	if (V.player?.bodyliquid && setup.bodyliquid?.outerbodyparts?.length) {
		const parts = setup.bodyliquid.outerbodyparts;
		const covered = parts.filter(part => (Number(setup.bodyliquid.combined(part)) || 0) > 0).length;
		if (covered > 0) extra += minutes * 4 * (covered / parts.length);
	}

	if (extra > 0) statChange.stress(Math.round(extra), 1);
}

/*
 * Relationship percentages may be slightly inaccurate.
 * The displayed number stays the same for the day and changes the next day.
 */
function autismRelationshipDisplayPercent(progress, label = "") {
	progress = Math.clamp(Math.round(Number(progress) || 0), 0, 100);
	if (!playerHasAutismSpectrum()) return progress;
	const seed = `${label}:${progress}:${Number(Time?.days) || 0}`;
	let hash = 0;
	for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
	const error = (Math.abs(hash) % 11) - 5;
	return Math.clamp(progress + error, 0, 100);
}

$(document).on(":passageend", autismSettleTraining);

Object.assign(window, {
	playerHasAutismSpectrum,
	autismPhaseLengthText,
	autismHyperfixationLengthText,
	autismSpectrumPhase,
	autismSpectrumDaysRemaining,
	ensureAutismSpectrumState,
	initAutismSpectrumState,
	autismSpectrumDailyUpdate,
	autismHyperfixationName,
	autismHyperfixationDaysRemaining,
	autismBeginKylarTraining,
	autismKylarTrainingFocus,
	autismKylarTrainingName,
	autismKylarTrainingAvailable,
	autismFinishKylarTraining,
	autismStatGainMultiplier,
	autismTrainingTimePassed,
	autismDiscomfortStress,
	autismRelationshipDisplayPercent,
});
