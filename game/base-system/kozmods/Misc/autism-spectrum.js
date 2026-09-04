/* globals permanentInsanityTalentLockActive isLiveNPC */

/* Autism Spectrum starting trait.
 *
 * Includes three systems:
 * 	Load and capacity: demands raise your load, while recovery lowers it. Your current load decides whether you are Settled,
 *  Strained, or in Burnout. Burnout has no timer; it starts when load stays too high and ends after enough recovery.
 *  Settled means you are coping well, so its bonus only lasts while your load stays low.
 *  Focused interest: one activity remains especially engaging for a few weeks. Practising it can help regulate stress and load.
 *  Demand fatigue: abrupt task changes and prolonged deliberate practice raise stress and load until the PC gets a proper break.
 *
 * Stat bonuses apply to all gains, but demand fatigue only counts deliberate practice.
 * Some stats always count as practice when gained. Physique and athletics only count at training locations,
 * so normal travelling does not build demand fatigue. */

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

/* Activities that can be chosen for the current focused interest.
Only stats the player can actively practise are included, so every interest can provide Stress and Load relief.
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
Disabled skills are excluded from focused interests. */
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

/* Swimming is less likely to be chosen as a focused interest during winter. */
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

const autismHyperfixationDays = Object.freeze({ min: 20, max: 30 });

function autismRollHyperfixationDays() {
	return random(autismHyperfixationDays.min, autismHyperfixationDays.max);
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

/* How much load a day of recovery can take off, for the tooltips. */
function autismRecoveryCapValue() {
	return autismDailyRecoveryCap;
}

/* A break this long counts as rest. Sleeping, long journeys, or time in a cell clears demand fatigue. */
const autismSpectrumBreakMinutes = 180;

/* Ordinary practice is manageable. Fatigue only starts after this much deliberate practice without a proper break. */
const autismDemandGraceMinutes = 120;

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

/*
 * Autism trait: 5 general talents instead of 3, and 3 sex skills instead of 2.
 * Also works during character creation before the trait is fully applied.
 */
const autismTalentBonus = Object.freeze({ general: 5, sex: 3 });
const autismTalentBase = Object.freeze({ general: 3, sex: 2 });
/* The paired talents are one-of-two whether or not the trait is present, so the bonus never touches them. */
const fixedTalentLimits = Object.freeze({ physical: 1, volume: 1 });

function autismTalentBonusActive() {
	return playerHasAutismSpectrum() || V.background?.autism === true;
}

/*
 * @param {string} group A key from autismTalentGroups
 * @param {boolean} bonusActive Whether the trait is active
 */
function autismTalentLimit(group, bonusActive = autismTalentBonusActive()) {
	if (group in fixedTalentLimits) return fixedTalentLimits[group];
	const limits = bonusActive ? autismTalentBonus : autismTalentBase;
	return limits[group === "sex" ? "sex" : "general"];
}

/* Every talent group and how many picks it allows. The trait raises the general and sex limits only. 1 is untempered, 2 is tempered. */
const autismTalentGroups = Object.freeze({
	physical: ["physique", "willpower"],
	volume: ["milk", "semen"],
	general: [
		"skulduggery",
		"dancing",
		"swimming",
		"athletics",
		"tending",
		"housekeeping",
		"brawling",
		"footwork",
		"striking",
		"kicking",
		"science",
		"maths",
		"english",
		"history",
	],
	sex: ["seductionskill", "oralskill", "chestskill", "handskill", "bottomskill", "penileskill", "vaginalskill", "analskill", "thighskill", "feetskill"],
});

/*
 * Removing the trait also removes its bonus picks.
 * If a group is over the limit, it is cleared instead of guessing which picks to remove.
 * The paired groups can only go over the limit through a randomised or imported start, since the settings screen greys out the second pick.
 */
function autismEnforceTalentLimits() {
	if (!V.AMCTraits) return false;
	if (typeof permanentInsanityTalentLockActive === "function" && permanentInsanityTalentLockActive()) return false;
	let cleared = false;
	for (const [group, stats] of Object.entries(autismTalentGroups)) {
		const taken = stats.reduce((count, stat) => count + (V.AMCTraits[stat] === 2 ? 1 : 0), 0);
		if (taken <= autismTalentLimit(group)) continue;
		for (const stat of stats) if (V.AMCTraits[stat] === 2) V.AMCTraits[stat] = 1;
		cleared = true;
	}
	return cleared;
}

function ensureAutismSpectrumState() {
	if (!V.autismSpectrum || typeof V.autismSpectrum !== "object" || Array.isArray(V.autismSpectrum)) {
		V.autismSpectrum = {};
	}
	const state = V.autismSpectrum;
	const today = Number(Time?.days) || 0;
	/* Also re-rolls a focused interest on a combat skill the player has since switched off. */
	if (!autismAvailableHyperfixations().includes(state.hyperfixation)) {
		state.hyperfixation = autismRollHyperfixation();
		state.hyperfixationEndsDay = today + autismRollHyperfixationDays();
		/* This also makes the first queued trait notice contain the newly chosen interest. */
		state.focusChanged = true;
	}
	/* Older saves have a focus but no end day. Give that interest a full new stretch instead of replacing it on load. */
	if (!Number.isFinite(state.hyperfixationEndsDay)) state.hyperfixationEndsDay = today + autismRollHyperfixationDays();
	if (!Array.isArray(state.pendingStats)) state.pendingStats = [];
	if (!Number.isFinite(state.trainingMinutes) || state.trainingMinutes < 0) state.trainingMinutes = 0;
	if (!Number.isFinite(state.pendingMinutes) || state.pendingMinutes < 0) state.pendingMinutes = 0;
	/* Checks the full pool because this practice was valid when it started, even if its option has since been turned off. */
	if (state.pendingFocus != null && !autismHyperfixationPool.includes(state.pendingFocus)) delete state.pendingFocus;
	if (state.pendingPhase != null && !["settled", "strained", "burnout"].includes(state.pendingPhase)) delete state.pendingPhase;
	if (state.lastPractice != null && !autismHyperfixationPool.includes(state.lastPractice)) delete state.lastPractice;
	/* The previous focus-fatigue model stored minutes without a task. Do not reinterpret that stale streak as demand fatigue. */
	if (state.lastPractice == null && state.trainingMinutes > 0) state.trainingMinutes = 0;
	delete state.fatigueNoticeFocus;
	if (state.kylarTrainingFocus != null && !autismHyperfixationPool.includes(state.kylarTrainingFocus)) delete state.kylarTrainingFocus;
	if (state.kylarEventFocus != null && !autismHyperfixationPool.includes(state.kylarEventFocus)) delete state.kylarEventFocus;
	/* Clear any invalid leftover outing location so it can't move the player somewhere unexpected. */
	if (state.kylarReturn != null && (typeof state.kylarReturn?.location !== "string" || !Number.isFinite(Number(state.kylarReturn?.outside)))) {
		delete state.kylarReturn;
	} else if (state.kylarReturn != null) {
		state.kylarReturn.outside = Number(state.kylarReturn.outside);
	}
	/* Old saves used a timed phase. Convert that phase to load once, then remove the old timer. */
	if (state.phaseEndsDay !== undefined) {
		if (!Number.isFinite(state.load)) state.load = state.phase === "burnout" ? autismLoadBurnout + 5 : autismLoadStrained;
		delete state.phaseEndsDay;
	}
	if (!Number.isFinite(state.load)) state.load = 0;
	state.load = Math.clamp(state.load, 0, autismLoadMax);
	if (!Number.isFinite(state.recoveredToday) || state.recoveredToday < 0) state.recoveredToday = 0;
	else state.recoveredToday = Math.min(state.recoveredToday, autismDailyRecoveryCap);
	/* Notices only need storage while queued. Remove false values left by older versions. */
	if (state.phaseChanged !== true) delete state.phaseChanged;
	if (state.focusChanged !== true) delete state.focusChanged;
	if (state.reliefNotice !== true) delete state.reliefNotice;
	if (state.meltdownNotice !== true) delete state.meltdownNotice;
	if (state.meltdownEndNotice !== true) delete state.meltdownEndNotice;
	/* Use the same load rules as live updates, so saves always restore the correct state while preserving Burnout hysteresis. */
	state.phase = autismDerivedCapacity(state.load, state.phase);
	if (typeof state.meltdown !== "boolean") state.meltdown = false;
	if (state.overloadForm !== "meltdown" && state.overloadForm !== "shutdown") delete state.overloadForm;
	if (!["alone", "known", "strangers"].includes(state.overloadPlace)) delete state.overloadPlace;
	if (state.pendingScene !== true) delete state.pendingScene;
	/* Return points survive saves made inside their scenes, but invalid old data must not strand the player. */
	if (
		state.sceneReturn != null &&
		(typeof state.sceneReturn?.passage !== "string" ||
			typeof state.sceneReturn?.location !== "string" ||
			!Number.isFinite(Number(state.sceneReturn?.outside)) ||
			(typeof Story !== "undefined" && !Story.has(state.sceneReturn.passage)))
	) {
		delete state.sceneReturn;
	}
	if (state.stimReturn != null && (typeof state.stimReturn !== "string" || (typeof Story !== "undefined" && !Story.has(state.stimReturn)))) {
		delete state.stimReturn;
	}
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
		/* Decided once, as it starts, so the scene cannot change form while the player is reading it. */
		state.overloadForm = autismRollOverloadForm();
		state.overloadPlace = autismPrivacyTier();
		state.pendingScene = true;
		autismQueueFocusMessage();
	} else if (state.meltdown && fraction <= autismMeltdownRecovery) {
		state.meltdown = false;
		state.meltdownEndNotice = true;
		/* Keep the chosen form while a queued or active scene still needs to describe the episode. */
		if (!state.pendingScene && !state.sceneReturn) {
			delete state.overloadForm;
			delete state.overloadPlace;
		}
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
	/* Start with no load carried and the first focused interest already chosen. */
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
	delete state.lastPractice;
	/* Only on the mornings something actually turned over. A focused interest lasts for weeks, so announcing
	   it daily would repeat information the trait overlay already carries. */
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
	/* The outing holds the interest it set out with, even if midnight has since rolled the current one over. */
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

	/* A focused interest can help regulate Stress and Load, but does not grant exceptional skill gains. */
	if (state.meltdown) multiplier *= 0.65;
	else if (training && state.trainingMinutes >= autismDemandGraceMinutes) {
		const tiredHours = 1 + Math.floor((state.trainingMinutes - autismDemandGraceMinutes) / 60);
		multiplier *= Math.max(0.75, 1 - tiredHours * 0.05);
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
		delete state.lastPractice;
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

	/* Compound activities often award a supporting stat as well as their main skill. */
	const practisedInterest = trained.includes(focus);
	if (practisedInterest) {
		statChange.stress(-(minutes / 20));
		autismAdjustLoad(-minutes / 40);
		/* Only once a day, so the recovery line is not printed after every lesson. */
		const today = Number(Time?.days) || 0;
		if (!V.statFreeze && state.reliefNoticeDay !== today) {
			state.reliefNoticeDay = today;
			state.reliefNotice = true;
			state.reliefNoticeFocus = autismSpectrumStats[focus] || "";
			autismQueueFocusMessage();
		}
	}

	const priorMinutes = state.trainingMinutes;
	state.trainingMinutes += minutes;
	/* Changing directly from one deliberate task to another adds a small, one-off transition cost.
	Compound activities include their prior main skill and do not count as a change. */
	const changedTask = state.lastPractice && !trained.includes(state.lastPractice);
	state.lastPractice = practisedInterest ? focus : trained[0];

	/* Only the part beyond two hours of continuous demand adds fatigue. Ordinary off-interest practice is neutral. */
	const priorDemandMinutes = Math.max(0, priorMinutes - autismDemandGraceMinutes);
	const currentDemandMinutes = Math.max(0, state.trainingMinutes - autismDemandGraceMinutes);
	const sustainedDemand = (currentDemandMinutes - priorDemandMinutes) / 30;
	let demand = sustainedDemand + (changedTask ? 2 : 0);
	if (phase === "burnout" && trained.some(stat => autismSchoolSubjects.includes(stat))) demand *= 2;

	if (demand > 0) {
		autismAdjustLoad(demand * 0.5);
		if (state.meltdown) autismOverloadTrauma(demand);
		else {
			statChange.stress(demand);
			autismOverloadTrauma(demand);
		}
	}

	/* Announce a disruptive switch or each additional hour of sustained demand, not every action. */
	const priorTier = Math.floor(Math.max(0, priorMinutes - autismDemandGraceMinutes) / 60);
	const tier = Math.floor(Math.max(0, state.trainingMinutes - autismDemandGraceMinutes) / 60);
	if (!V.statFreeze && (changedTask || tier > priorTier)) {
		state.fatigueNotice = changedTask ? 0 : Math.min(3, tier);
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

	/* Somewhere loud, bright, or busy costs something even when nothing is touching you. */
	if (autismPlaceIsLoud()) extra += minutes * 2;
	if (autismPlaceIsBright()) extra += minutes * 1.5;

	if (extra > 0) {
		extra = Math.round(extra);
		statChange.stress(extra, 1);
		autismAdjustLoad(extra / 300);
		return;
	}

	/* Quiet indoor time helps recovery when the PC is dry, comfortable, unbothered and not fighting. */
	if (!V.outside && V.combat !== 1) autismAdjustLoad(-minutes * 0.012);
}

/* Places that are loud and crowded. Sound is the main sensory issue here, so it should also affect gameplay. */
const autismLoudPlaces = Object.freeze(["school", "town", "shopping_centre", "pub", "brothel", "strip_club", "arcade", "mma_gym", "pool", "docks", "cafe"]);
const autismQuietPassages = Object.freeze([
	"School Toilets",
	"School Boy's Toilets",
	"School Girl's Toilets",
	"School Infirmary",
	"School Infirmary Bed",
	"School Library",
	"Library Study",
]);

function autismPlaceIsLoud() {
	return autismLoudPlaces.includes(V.location) && !autismQuietPassages.includes(V.passage);
}

/*
 * Bright outdoor glare during the day, with no shade overhead.
 * Snow also counts because it reflects the light.
 */
function autismPlaceIsBright() {
	if (!V.outside) return false;
	if (Time?.dayState !== "day" || Time.hour < 11 || Time.hour >= 15) return false;
	const weather = Weather?.precipitation;
	return weather === "snow" || (weather === "none" && !Weather?.isOvercast);
}

/*
 * Workplace fit based on the skill used for wages.
 * Clear, predictable work is easier for the PC and reduces changing social demands.
 * This only affects suitable jobs, not general skills or talents.
 */
const autismStructuredWageSkills = Object.freeze(["housekeeping", "tending"]);

function autismJobPayMultiplier(skill) {
	if (!playerHasAutismSpectrum() || typeof skill !== "string") return 1;
	if (autismStructuredWageSkills.includes(skill)) return 1.15;
	return 1;
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
 * Resting, praying, or eating lowers sensory load.
 * The daily recovery cap still applies.
 */
function autismRestBreak(load) {
	if (!playerHasAutismSpectrum() || V.statFreeze) return;
	load = Math.max(0, Number(load) || 0);
	if (!load) return;
	autismAdjustLoad(-load);
}

/*
 * Ambiguous, performative, or unstructured social situations can add demand.
 * Call this from specific scenes rather than treating nearby NPCs as inherently draining.
 */
function autismSocialDemand(load) {
	if (!playerHasAutismSpectrum() || V.statFreeze || V.timeSkip !== undefined || V.possessed) return;
	load = Math.max(0, Number(load) || 0);
	if (!load) return;
	autismAdjustLoad(load);
}

/*
 * Who is around, which decides both how an overload comes out and how it lands.
 * "alone"     nobody to perform for
 * "known"     people who know you, and who are still there tomorrow
 * "strangers" onlookers with no idea who you are
 */
const autismAlonePlaces = Object.freeze([
	"forest",
	"moor",
	"lake",
	"lake_ruin",
	"drain",
	"sewers",
	"underground",
	"landfill",
	"wolf_cave",
	"old_temple",
	"tower",
	"alley",
	"cabin",
	"forest_shop_garden",
]);

const autismKnownPlaces = Object.freeze(["home", "flats", "temple", "asylum", "farm", "compound", "riding_school", "avery_mansion", "forest_shop", "prison"]);

/* Rooms with a door the PC can shut, inside locations that are otherwise full of people. */
const autismPrivateRooms = Object.freeze([
	"Bedroom",
	"Bathroom",
	"Farm Bedroom",
	"Flats Poppy Bedroom",
	"Flats Poppy Bathroom",
	"School Toilets",
	"School Boy's Toilets",
	"School Girl's Toilets",
]);

function autismPrivacyTier(passage = V.passage) {
	if (autismPrivateRooms.includes(passage)) return "alone";
	const place = V.location;
	if (autismAlonePlaces.includes(place)) return "alone";
	if (autismKnownPlaces.includes(place)) return "known";
	return "strangers";
}

/*
 * Meltdown is outward, shutdown is inward. They are two forms of the same overload, not two severities.
 * Being watched pushes towards shutdown, because the effort of holding together goes inward first.
 * Willpower does the same, so a PC with none left is likelier to break outward.
 */
function autismRollOverloadForm() {
	const place = autismPrivacyTier();
	let shutdownChance = place === "strangers" ? 70 : place === "known" ? 50 : 30;
	const willMax = Number(V.willpowermax) || 1000;
	const willFraction = Math.clamp((Number(V.willpower) || 0) / willMax, 0, 1);
	shutdownChance += Math.round((willFraction - 0.5) * 30);
	return random(1, 100) <= Math.clamp(shutdownChance, 5, 95) ? "shutdown" : "meltdown";
}

function autismOverloadForm() {
	if (!playerHasAutismSpectrum()) return "meltdown";
	const state = ensureAutismSpectrumState();
	return state.overloadForm === "shutdown" ? "shutdown" : "meltdown";
}

function autismOverloadPlace() {
	if (!playerHasAutismSpectrum()) return "strangers";
	const state = ensureAutismSpectrumState();
	return state.overloadPlace || autismPrivacyTier();
}

/*
 * Stimming helps regulate stress and sensory input.
 * When alone, it works normally. Around others, hiding it takes extra effort and adds stress.
 */
const autismStimLoadRelief = 5;

function autismStimIsMasked() {
	return autismPrivacyTier() !== "alone";
}

function autismStim(minutes, place = autismPrivacyTier()) {
	if (!playerHasAutismSpectrum()) return "alone";
	minutes = Math.max(1, Number(minutes) || 10);
	if (!["alone", "known", "strangers"].includes(place)) place = autismPrivacyTier();
	/* Masking takes most of it back. Somewhere that knows you costs less than a room of strangers. */
	const scale = place === "alone" ? 1 : place === "known" ? 0.6 : 0.35;
	autismAdjustLoad(-autismStimLoadRelief * scale * (minutes / 10));
	statChange.stress(-Math.round(minutes * 1.2 * scale));
	/* Holding a stim down is work, so what masking saves is not free. */
	if (place !== "alone") autismAdjustLoad(minutes / 60);
	return place;
}

/* The scene must never tear the player out of anything that owns cleanup of its own. */
const autismSceneBlockedPassages = Object.freeze([
	"Autism Overload",
	"Autism Overload Stim",
	"Autism Overload Card",
	"Autism Overload Leave",
	"Autism Overload Mask",
	"Autism Overload End",
	"Police Molestation Finish",
	"Sleep",
	"Bed",
	"Passout",
]);
const autismSceneBlockedTags = Object.freeze(["widget", "script", "stylesheet", "nosave", "ending", "exitCheckBypass"]);

function autismSceneReady() {
	if (!playerHasAutismSpectrum()) return false;
	if (V.statFreeze || V.possessed || V.combat === 1) return false;
	/* Do not save an interface, setup passage, or ending as a gameplay return point. */
	if (typeof Story !== "undefined") {
		if (typeof V.passage !== "string" || !Story.has(V.passage)) return false;
		if (Story.get(V.passage).tags.some(tag => autismSceneBlockedTags.includes(tag))) return false;
	}
	if (Array.isArray(V.NPCList) && typeof isLiveNPC === "function" && V.NPCList.some(isLiveNPC)) return false;
	if (autismSceneBlockedPassages.includes(V.passage)) return false;
	return true;
}

/*
 * The overload is not optional, but it waits for a moment where leaving the passage is safe.
 * Until then its penalties already apply, so waiting costs the player nothing.
 */
function autismTryOverloadScene() {
	const state = ensureAutismSpectrumState();
	if (!state.pendingScene) return;
	if (!autismSceneReady()) return;
	delete state.pendingScene;
	state.overloadPlace = autismPrivacyTier();
	state.sceneReturn = {
		passage: V.passage,
		location: V.location,
		outside: Number.isFinite(Number(V.outside)) ? V.outside : 0,
	};
	/* Out of the render pass before navigating, or the passage would be replaced while still drawing. */
	setTimeout(() => Engine.play("Autism Overload"), 0);
}

/* Settle first so this turn's practice has been charged, then judge the resulting stress level. */
function autismPassageEnd() {
	if (!playerHasAutismSpectrum()) return;
	autismSettleTraining();
	autismUpdateOverload();
	autismTryOverloadScene();
}

$(document).on(":passageend", autismPassageEnd);

Object.assign(window, {
	playerHasAutismSpectrum,
	autismInMeltdown,
	autismRecoveryCapValue,
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
	autismRestBreak,
	autismSocialDemand,
	autismPrivacyTier,
	autismJobPayMultiplier,
	autismPlaceIsLoud,
	autismTalentLimit,
	autismTalentGroups,
	autismEnforceTalentLimits,
	autismOverloadForm,
	autismOverloadPlace,
	autismStim,
	autismStimIsMasked,
});
