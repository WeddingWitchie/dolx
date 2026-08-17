/* Autism Spectrum starting trait.
 *
 * Includes three systems:
 * 	Load and capacity: demands raise your load, while recovery lowers it. Your current load decides whether you are Settled,
 * Strained, or in Burnout. Burnout has no timer; it starts when load stays too high and ends after enough recovery.
 * Settled means you are coping well, so its bonus only lasts while your load stays low.
 *  Hyperfixation: one stat is chosen for 3 to 5 days. Its gains are doubled and practising it lowers load.
 *  Focus fatigue: repeatedly practising other stats without a break raises stress and load.
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

/* Subjects that are especially draining to study while in Burnout. */
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
	return `Your fixation may shift to something new after a while.`;
}

/* Load ranges from 0 to 100. Demand raises it, while recovery lowers it.
   The current state depends on recent activity instead of a timer. */
const autismLoadMax = 100;

/* Burnout starts at high load and ends only after load drops below the recovery point.
   This prevents small changes from switching Burnout on or off too easily. */
const autismLoadStrained = 35;
const autismLoadBurnout = 70;
const autismLoadBurnoutRelief = 55;

/* Maximum load recovery per day across all recovery methods.
   Recovery is slower than load gain, so one good day cannot erase several bad days. */
const autismDailyRecoveryCap = 12;

/* One source for the numbers quoted in the settings and trait tooltips, so they cannot drift. */
function autismLoadText() {
	return `Too much noise, discomfort, and demand can wear you down. As Load builds, you may become Strained and eventually fall into Burnout. Rest and calming activities help you recover, but Burnout takes time to ease.`;
}

/* How much load a day of recovery can take off, for the tooltips. */
function autismRecoveryCapValue() {
	return autismDailyRecoveryCap;
}

/* A break this long counts as rest. Sleeping, long journeys, or time in a cell clears focus fatigue. */
const autismSpectrumBreakMinutes = 180;

/* A meltdown starts only when both load and stress are very high.
   It ends when stress drops, but the high load and Burnout remain. */
const autismMeltdownLoad = 90;
const autismMeltdownStress = 0.9;
const autismMeltdownRecovery = 0.7;

/* One-off hit when a meltdown starts. */
const autismMeltdownTrauma = 10;

/* Staying at this load all day can cause trauma. Ordinary strain does not. */
const autismLoadTraumaThreshold = 95;
const autismLoadDailyTrauma = 4;

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
	if (state.pendingPhase != null && !["settled", "strained", "burnout"].includes(state.pendingPhase)) delete state.pendingPhase;
	if (state.kylarTrainingFocus != null && !autismHyperfixationPool.includes(state.kylarTrainingFocus)) delete state.kylarTrainingFocus;
	if (state.kylarEventFocus != null && !autismHyperfixationPool.includes(state.kylarEventFocus)) delete state.kylarEventFocus;
	/* Clear any invalid leftover outing location so it can't move the player somewhere unexpected. */
	if (state.kylarReturn != null && typeof state.kylarReturn?.location !== "string") delete state.kylarReturn;
	/* Old saves used a timed phase. Convert that phase to load once, then remove the old timer. */
	if (state.phaseEndsDay !== undefined) {
		if (!Number.isFinite(state.load)) state.load = state.phase === "burnout" ? autismLoadBurnout + 5 : autismLoadStrained;
		delete state.phaseEndsDay;
	}
	if (!Number.isFinite(state.load)) state.load = 0;
	state.load = Math.clamp(state.load, 0, autismLoadMax);
	if (!Number.isFinite(state.recoveredToday) || state.recoveredToday < 0) state.recoveredToday = 0;
	/* Use the same load rules as live updates, so saves always restore the correct state. */
	if (state.phase !== "settled" && state.phase !== "strained" && state.phase !== "burnout") {
		state.phase = autismDerivedCapacity(state.load, null);
	}
	if (typeof state.meltdown !== "boolean") state.meltdown = false;
	/* Left over from when both phases were a fixed 90 days and the phase was derived from it. */
	if (state.startDay !== undefined) delete state.startDay;
	return state;
}

/*
 * All load changes go through here. Recovery is capped per day so one good day cannot remove too much built-up strain.
 * Load gain is not capped.
 */
function autismAdjustLoad(delta) {
	delta = Number(delta) || 0;
	if (!delta || V.statFreeze) return;
	const state = ensureAutismSpectrumState();
	if (delta < 0) {
		const allowance = autismDailyRecoveryCap - state.recoveredToday;
		if (allowance <= 0) return;
		delta = Math.max(delta, -allowance);
		state.recoveredToday += -delta;
	}
	state.load = Math.clamp(state.load + delta, 0, autismLoadMax);
	autismUpdateCapacity();
}

function autismLoadPercent() {
	if (!playerHasAutismSpectrum()) return 0;
	return Math.round(ensureAutismSpectrumState().load);
}

/* Cheat menu only. Sets load outright and refreshes capacity at once, so the readout cannot show a
state its load no longer supports. Skips the daily recovery cap on purpose: this is not recovery. */
function autismSetLoad(value) {
	if (!playerHasAutismSpectrum()) return;
	const state = ensureAutismSpectrumState();
	state.load = Math.clamp(Number(value) || 0, 0, autismLoadMax);
	autismUpdateCapacity();
}

/* How much recovery is left today, for the trait screen. */
function autismRecoveryLeftToday() {
	if (!playerHasAutismSpectrum()) return 0;
	return Math.max(0, Math.round(autismDailyRecoveryCap - ensureAutismSpectrumState().recoveredToday));
}

/*
 * Gets the state from the current load.
 * Burnout starts at the upper limit and ends only after load drops below the lower limit.
 * Pass null for current to ignore the current state.
 */
function autismDerivedCapacity(load, current) {
	if (current === "burnout" && load >= autismLoadBurnoutRelief) return "burnout";
	if (load >= autismLoadBurnout) return "burnout";
	if (load >= autismLoadStrained) return "strained";
	return "settled";
}

function autismUpdateCapacity() {
	const state = ensureAutismSpectrumState();
	const previous = state.phase;
	state.phase = autismDerivedCapacity(state.load, previous);
	if (state.phase !== previous) {
		/* Sticky: the notice has to survive until effects() actually renders it. */
		state.phaseChanged = true;
		V.timeMessages ||= [];
		V.timeMessages.pushUnique("autismHyperfixation");
	}
}

function autismSpectrumPhase() {
	if (!playerHasAutismSpectrum()) return "none";
	return ensureAutismSpectrumState().phase;
}

function autismStressFraction() {
	const max = Number(V.stressmax) || 10000;
	if (max <= 0) return 0;
	return (Number(V.stress) || 0) / max;
}

function autismInMeltdown() {
	if (!playerHasAutismSpectrum()) return false;
	return ensureAutismSpectrumState().meltdown === true;
}

/* Queues a focus notice so it still appears on the next passage, then clears it after showing. */
function autismQueueFocusMessage() {
	V.timeMessages ||= [];
	V.timeMessages.pushUnique("autismFocus");
}

/*
 * Trauma from pushing through severe overload. Only Burnout and meltdowns cause it; Strained does not.
 * "amount" uses the same scale as statChange.stress.
 */
function autismOverloadTrauma(amount) {
	amount = Number(amount) || 0;
	if (amount <= 0 || V.statFreeze) return;
	const state = ensureAutismSpectrumState();
	if (state.meltdown) statChange.trauma(amount);
	else if (state.phase === "burnout") statChange.trauma(amount * 0.5);
}

/* Runs every turn, so a meltdown can start from any source of stress, not only from practice. */
function autismUpdateOverload() {
	if (!playerHasAutismSpectrum() || V.statFreeze || V.timeSkip !== undefined || V.possessed) return;
	const state = ensureAutismSpectrumState();
	/* Keeps capacity synced when load changes outside autismAdjustLoad, such as migration or cheats. */
	autismUpdateCapacity();
	/* effects() reads V.timeMessages with forEach and then empties it, so a key queued while it is
	already rendering would be dropped without ever being shown. That can happen when another time
	message lowers stress far enough to change capacity. The flags are sticky and effects() clears
	them, so re-queueing until then costs nothing and guarantees the notice appears. */
	if (state.phaseChanged || state.focusChanged) {
		V.timeMessages ||= [];
		V.timeMessages.pushUnique("autismHyperfixation");
	}
	const fraction = autismStressFraction();
	if (!state.meltdown && fraction >= autismMeltdownStress && state.load >= autismMeltdownLoad) {
		state.meltdown = true;
		/* The streak ends here, so escalation restarts from nothing and one meltdown cannot run straight into another. */
		state.trainingMinutes = 0;
		statChange.trauma(autismMeltdownTrauma);
		state.meltdownNotice = true;
		autismQueueFocusMessage();
	} else if (state.meltdown && fraction <= autismMeltdownRecovery) {
		state.meltdown = false;
		state.meltdownEndNotice = true;
		autismQueueFocusMessage();
	}
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
	/* Start with no load carried and the first hyperfixation already chosen. */
	delete V.autismSpectrum;
	ensureAutismSpectrumState();
	V.timeMessages ||= [];
	V.timeMessages.pushUnique("autismHyperfixation");
}

function autismSpectrumDailyUpdate() {
	if (!playerHasAutismSpectrum()) return;
	const state = ensureAutismSpectrumState();
	const today = Number(Time?.days) || 0;

	/* Going a full day without a long break increases Burnout load. Sleeping counts as a break. */
	const rested = state.restedToday === true;
	if (!rested) autismAdjustLoad(6);
	state.restedToday = false;
	state.recoveredToday = 0;

	/* Sitting at high stress all day is a demand in itself, whatever caused it. */
	const stressFraction = autismStressFraction();
	if (stressFraction > 0.5) autismAdjustLoad((stressFraction - 0.5) * 16);

	/* At maximum load, another full day without rest causes trauma. Resting prevents this, even if load is still high. */
	if (!rested && state.load >= autismLoadTraumaThreshold) statChange.trauma(autismLoadDailyTrauma);

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

	/* Capacity is based on load, not a timed cycle. Settled gives bonuses, Strained is normal, and Burnout adds penalties. */
	let multiplier = 1;
	if (state.phase === "settled") {
		multiplier = 1.05;
		if (school) multiplier *= 1.25;
	} else if (state.phase === "burnout") {
		multiplier = 0.8;
		if (school) multiplier *= 0.875;
	}

	if (activeFocus === stat) {
		/* The fixation still carries through Burnout and meltdowns. It is the way back out of both. */
		multiplier *= 2;
	} else if (state.meltdown) {
		/* Meltdown replaces focus fatigue so the penalties do not stack. */
		multiplier *= 0.5;
	} else if (training && state.trainingMinutes > 0) {
		multiplier *= Math.max(0.5, 1 / (1 + Math.floor(state.trainingMinutes / 60) * 0.2));
	}

	if (training) {
		if (!state.pendingStats.length) {
			state.pendingFocus = activeFocus;
			state.pendingPhase = state.phase;
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

	/* A long enough break counts as rest. Sleep is the main source of recovery,
	but recovery is capped so one long rest cannot remove too much load at once. */
	if (minutes >= autismSpectrumBreakMinutes) {
		state.trainingMinutes = 0;
		state.restedToday = true;
		autismAdjustLoad(-Math.min(20, (minutes / 60) * 2));
		return;
	}

	/* A short moment with no practice in it: not a break, so the streak stands. */
	if (!trained.length) return;

	/* Do not charge a half-written transient action restored from an older or interrupted save. */
	if (!focus || !phase) return;

	/* Too long for one session, but too short to count as rest.
	Since the actual practice time is unknown, don't add any practice hours. */
	if (minutes > autismSpectrumSessionMaxMinutes) return;

	/* Practising your fixation lowers stress and load, making it one of several ways to recover. */
	if (trained.every(stat => stat === focus)) {
		const brokeStreak = state.trainingMinutes > 0;
		state.trainingMinutes = 0;
		statChange.stress(-(minutes / 10));
		autismAdjustLoad(-minutes / 20);
		/* Worth saying when it broke a streak, and otherwise only once a day, so it is not printed every lesson. */
		const today = Number(Time?.days) || 0;
		if (!V.statFreeze && (brokeStreak || state.reliefNoticeDay !== today)) {
			state.reliefNoticeDay = today;
			state.reliefNotice = true;
			state.reliefNoticeFocus = autismSpectrumStats[focus] || "";
			autismQueueFocusMessage();
		}
		return;
	}

	const priorMinutes = state.trainingMinutes;
	const escalation = Math.min(4, 1 + Math.floor(priorMinutes / 60) * 0.5);
	/* Load uses the session's normal demand before Burnout increases study stress,
	so Burnout cannot increase its own load and keep itself going. */
	const demand = (minutes / 15) * escalation;
	let stress = demand;
	if (phase === "burnout" && trained.some(stat => autismSchoolSubjects.includes(stat))) {
		stress *= 2;
	}
	autismAdjustLoad(demand * 0.25);

	/* During a meltdown, focus fatigue pauses. It adds trauma instead of stress until the meltdown ends. */
	if (state.meltdown) {
		autismOverloadTrauma(stress);
		return;
	}

	state.trainingMinutes += minutes;
	statChange.stress(stress);
	autismOverloadTrauma(stress);

	/* Announce the streak when it starts and each hour it gets worse, not on every action. */
	const tier = Math.floor(state.trainingMinutes / 60);
	if (!V.statFreeze && (priorMinutes === 0 || tier > Math.floor(priorMinutes / 60))) {
		state.fatigueNotice = tier;
		state.fatigueNoticeFocus = autismSpectrumStats[focus] || "";
		autismQueueFocusMessage();
	}
}

/*
 * Sensory input, in both directions.
 * Heat and liquid on the skin are extra stress and extra load; time spent somewhere calm and dry,
 * with none of that going on, brings load back down. Uses raw stress points, so the multiplier is 1.
 */
function autismSensoryUpdate(minutes) {
	if (!playerHasAutismSpectrum() || V.timeSkip !== undefined || V.possessed) return;
	minutes = Math.max(0, Number(minutes) || 0);
	if (!minutes) return;
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

	if (extra > 0) {
		extra = Math.round(extra);
		statChange.stress(extra, 1);
		autismAdjustLoad(extra / 300);
		return;
	}

	/* Quiet indoor time helps recovery when the PC is dry, comfortable, and not fighting. */
	if (!V.outside && V.combat !== 1) autismAdjustLoad(-minutes * 0.012);
}

/*
 * Anything that lowers stress also lowers load.
 * This is handled through statChange.stress instead of listing each activity separately.
 */
function autismStressRecovered(points) {
	if (!playerHasAutismSpectrum() || V.statFreeze || V.possessed) return;
	points = Math.max(0, Number(points) || 0);
	if (!points) return;
	const max = Number(V.stressmax) || 10000;
	if (max <= 0) return;
	autismAdjustLoad(-(points / max) * 15);
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

/* Settle first so this turn's practice has been charged, then judge the resulting stress level. */
function autismPassageEnd() {
	if (!playerHasAutismSpectrum()) return;
	autismSettleTraining();
	autismUpdateOverload();
}

$(document).on(":passageend", autismPassageEnd);

Object.assign(window, {
	playerHasAutismSpectrum,
	autismInMeltdown,
	autismLoadText,
	autismRecoveryCapValue,
	autismHyperfixationLengthText,
	autismSpectrumPhase,
	autismLoadPercent,
	autismSetLoad,
	autismRecoveryLeftToday,
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
	autismSensoryUpdate,
	autismStressRecovered,
	autismRelationshipDisplayPercent,
});
