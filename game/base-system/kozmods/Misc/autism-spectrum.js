/*
 * Autism Spectrum starting trait.
 *
 * Three moving parts:
 *  - Gifted / Burnout, alternating stretches whose length is rolled each time the phase turns over.
 *    The end is stored as an absolute day rather than a countdown, so a reloaded save cannot drift.
 *  - Hyperfixation, one stat picked fresh each day. Gains to it double and practising it sheds stress.
 *  - Focus fatigue, the cost of practising anything else for hours without a break.
 *
 * The gain bonus applies to every source of a stat. Focus fatigue does not: it is fed only by
 * deliberate practice. Some stats always count as practice when they rise, because the widget that
 * raises them is only reached by doing the activity. Physical stats are different — physique and
 * athletics tick up from ordinary travel as much as from a workout — so those count only at a venue
 * the PC went to in order to train. Without that split the PC would never get a break from walking.
 */

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

/* Places the PC goes to in order to train. A physical stat rising here is a workout;
the same stat rising in the street is just walking, and must not count against the hyperfixation. */
const autismTrainingLocations = Object.freeze(["mma_gym", "pool", "dance_studio", "school", "temple"]);

/* Stats a training venue can promote to practice. Sex skills are left out:
they rise from what happens to the PC, which is not a workout however hard the day was. */
const autismVenueTrainableStats = Object.freeze(["physique", "athletics", "willpower", "swimming", "brawling", "footwork", "striking", "kicking"]);

/* Stats the daily hyperfixation can land on.
Every one of these is something the PC can go and practise, so a fixation always offers both halves of the trait:
the doubled gain and the relief. Sex skills and skulduggery are left out
they still get the Gifted bonus, but there is nowhere to practise them, so fixating on one would be a dead day. */
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

/* The advanced combat skills only exist once the player switches them on, each by its own toggle.
   Fixating on one that is switched off would be a day the PC has no way to practise at all. */
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

/* Never empty: only the four combat skills above are toggleable, so the school subjects, physique,
   willpower, athletics, swimming, dancing, tending and housekeeping are always left to choose from. */
function autismAvailableHyperfixations() {
	return autismHyperfixationPool.filter(autismStatIsAvailable);
}

/* Percent chance that swimming is even a candidate on a winter day. Going to the lake or the pool in
   the cold is a harder thing to want, so it comes up about a quarter as often as it does in summer.
   An existing swimming fixation is left alone: this only shapes what gets picked. */
const autismWinterSwimmingChance = 25;

function autismRollHyperfixation() {
	const available = autismAvailableHyperfixations();
	if (Time?.season === "winter" && random(1, 100) > autismWinterSwimmingChance) {
		const withoutSwimming = available.filter(stat => stat !== "swimming");
		if (withoutSwimming.length) return withoutSwimming.random();
	}
	return available.random();
}

/* How long each phase runs, rolled fresh every time the phase turns over.
Gifted outlasts Burnout, so the trait spends most of its time helping, and neither stretch is the same length twice. */
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

/* A stretch this long is rest. Nothing in the game is one unbroken practice session for three hours,
   so sleeping, a long journey or a night in a cell clears focus fatigue. */
const autismSpectrumBreakMinutes = 180;

/* The longest stretch that can plausibly be a single practice session, and so the longest that can be
   charged as one. A turn's elapsed time is only a fair measure of how long the PC practised when it is
   short enough to be the action itself: lessons run 50 minutes, a swim 30, an hour in the garden 60.
   Past this the time belongs to some longer event that happened to raise a stat along the way, and
   billing those hours as practice would make unrelated time count as Burnout. */
const autismSpectrumSessionMaxMinutes = 120;

function playerHasAutismSpectrum() {
	return V.backgroundTraits?.includes("autism") === true;
}

function ensureAutismSpectrumState() {
	if (!V.autismSpectrum || typeof V.autismSpectrum !== "object" || Array.isArray(V.autismSpectrum)) {
		V.autismSpectrum = {};
	}
	const state = V.autismSpectrum;
	/* Also re-rolls a fixation on a combat skill the player has since switched off. */
	if (!autismAvailableHyperfixations().includes(state.hyperfixation)) state.hyperfixation = autismRollHyperfixation();
	if (!Array.isArray(state.pendingStats)) state.pendingStats = [];
	if (!Number.isFinite(state.trainingMinutes) || state.trainingMinutes < 0) state.trainingMinutes = 0;
	if (!Number.isFinite(state.pendingMinutes) || state.pendingMinutes < 0) state.pendingMinutes = 0;
	/* Checked against the whole pool, not the available list: this is a snapshot of practice already
	   under way, and it was valid when it started even if a toggle has been switched off since. */
	if (state.pendingFocus != null && !autismHyperfixationPool.includes(state.pendingFocus)) delete state.pendingFocus;
	if (state.pendingPhase != null && !["gifted", "burnout"].includes(state.pendingPhase)) delete state.pendingPhase;
	if (state.phase !== "gifted" && state.phase !== "burnout") state.phase = "gifted";
	/* An absolute day, never a countdown, so reloading or skipping time cannot knock it out of step. */
	if (!Number.isFinite(state.phaseEndsDay)) state.phaseEndsDay = (Number(Time?.days) || 0) + autismRollPhaseDays(state.phase);
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

/* Called once, from character creation, after "autism" is pushed onto $backgroundTraits. */
function initAutismSpectrumState() {
	if (!playerHasAutismSpectrum()) return;
	/* Start the cycle from today. ensureAutismSpectrumState opens on Gifted and rolls its end day and
	   the first hyperfixation onto the fresh object, so there is nothing to set by hand here. */
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
	state.hyperfixation = autismRollHyperfixation();
	state.trainingMinutes = 0;
	V.timeMessages ||= [];
	V.timeMessages.pushUnique("autismHyperfixation");
}

/*
 * Multiplier applied to a positive stat gain.
 * kind: "training" for a widget only reached by practising, "school" for active school work, and
 * "schoolPassive" for school progress that is not active study. Active school work is
 * training that also gets the Gifted grade bonus, and "" for a stat that can rise incidentally
 * that one counts as practice only at a training venue.
 * Only practice feeds, or is slowed by, focus fatigue.
 */
function autismStatGainMultiplier(stat, amount = 1, kind = "") {
	if (!playerHasAutismSpectrum() || !(Number(amount) > 0) || !autismSpectrumStats[stat]) return 1;
	const state = ensureAutismSpectrumState();
	const training = kind === "training" || kind === "school" || (autismVenueTrainableStats.includes(stat) && autismTrainingLocations.includes(V.location));
	const school = kind === "school" || kind === "schoolPassive";
	const gifted = state.phase === "gifted";

	let multiplier = gifted ? 1.05 : 1;
	if (gifted && school) multiplier *= 1.25;

	if (state.hyperfixation === stat) {
		multiplier *= 2;
	} else if (training && state.trainingMinutes > 0) {
		multiplier *= Math.max(0.5, 1 / (1 + Math.floor(state.trainingMinutes / 60) * 0.2));
	}

	if (training) {
		if (!state.pendingStats.length) {
			state.pendingFocus = state.hyperfixation;
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
 * Settled at the end of the turn rather than inside Time.pass, because a link commonly passes time
 * before the passage it opens awards the skill. By :passageend both halves have run.
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

	/* Too long to be one session, too short to be certain rest. The elapsed time is not the duration
	   of the practice, and there is no way to recover what that duration was, so charge nothing rather
	   than bill hours the PC spent on something else. */
	if (minutes > autismSpectrumSessionMaxMinutes) return;

	/* Practising the fixation is the one reliable way this trait gives something back, so the relief
	   is double what an equal stretch of ordinary practice would cost. */
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
 * Extra stress from heat and from liquid on the skin. Amounts are raw stress points, matching the
 * body-temperature line in minutePassed that this sits beside, so the multiplier override is 1.
 */
function autismDiscomfortStress(minutes) {
	if (!playerHasAutismSpectrum() || V.timeSkip !== undefined || V.possessed) return;
	let extra = 0;

	const heatStress = Number(Weather?.BodyTemperature?.stressModifier) || 0;
	if (heatStress > 0) extra += heatStress * minutes * 0.5;

	/* How much of the body has something on it, rather than how deep it is: combined() sums three
	   liquids that are each capped separately, so a total is a poor measure of coverage. */
	if (V.player?.bodyliquid && setup.bodyliquid?.outerbodyparts?.length) {
		const parts = setup.bodyliquid.outerbodyparts;
		const covered = parts.filter(part => (Number(setup.bodyliquid.combined(part)) || 0) > 0).length;
		if (covered > 0) extra += minutes * 4 * (covered / parts.length);
	}

	if (extra > 0) statChange.stress(Math.round(extra), 1);
}

/*
 * Relationship percentages read a few points off. The seed is the NPC, the stat and the day, so a
 * number stays put while you look at it and only shifts once the day turns over.
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
	autismSpectrumPhase,
	autismSpectrumDaysRemaining,
	ensureAutismSpectrumState,
	initAutismSpectrumState,
	autismSpectrumDailyUpdate,
	autismHyperfixationName,
	autismStatGainMultiplier,
	autismTrainingTimePassed,
	autismDiscomfortStress,
	autismRelationshipDisplayPercent,
});
