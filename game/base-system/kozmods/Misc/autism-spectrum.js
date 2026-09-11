/* globals permanentInsanityTalentLockActive isLiveNPC namedNpcInSlot livesInAveryMansion */

/* Autism Spectrum starting trait: load and capacity, a rotating focused interest, and demand fatigue.
 * Physique and athletics only count as practice at a training location, so travelling does not build fatigue. */

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

/* Baselines for a PC of middling willpower. The thresholds in use are scaled from these; see
   autismStrainedThreshold. Burnout releases at a lower load than it starts, so it cannot flicker. */
const autismLoadStrained = 35;
const autismLoadBurnout = 70;
const autismLoadBurnoutRelief = 55;

/* How far below the Burnout threshold load must fall before Burnout lifts. Held constant as the thresholds move,
   so scaling changes where Burnout starts without also changing how hard it is to climb out of. */
const autismBurnoutReliefGap = autismLoadBurnout - autismLoadBurnoutRelief;

/*
 * Ratio against a full willpower bar: 0 to 1, or up to 2 with the AMC talent. Null when unavailable.
 *
 * Deliberately reads the trained stat, not currentSkillValue: a drink or a spent willpower pool must not move
 * the thresholds and shunt the PC across one when nothing about their situation has changed.
 */
const autismWillpowerPoolFloor = 200;

function autismWillpowerCapacity() {
	const max = Number(V.willpowermax);
	if (!Number.isFinite(max) || max <= 0) return null;
	const skill = Number(V.willpower);
	if (!Number.isFinite(skill)) return null;
	/* Daily consumption on: the pool's ceiling, which is the trained stat with the same floor the clamp applies. */
	const capacity = V.xchange?.willpowerSystemEnabled === 1 ? Math.max(autismWillpowerPoolFloor, skill) : skill;
	return Math.clamp(capacity / max, 0, 2);
}

/* Pivoted at half a bar so an ordinary PC gets the baseline numbers. Shallow: headroom, not immunity. */
const autismThresholdSlope = 0.3;
const autismThresholdPivot = 0.5;
const autismThresholdMultiplier = Object.freeze({ min: 0.85, max: 1.2 });

/* Absolute bounds, so no combination of stats can make overload unreachable or leave the PC permanently strained. */
const autismStrainedBounds = Object.freeze({ min: 28, max: 44 });
const autismBurnoutBounds = Object.freeze({ min: 56, max: 88 });

function autismThresholdScale() {
	const capacity = autismWillpowerCapacity();
	if (capacity === null) return 1;
	return Math.clamp(1 + (capacity - autismThresholdPivot) * autismThresholdSlope, autismThresholdMultiplier.min, autismThresholdMultiplier.max);
}

/* Computed live rather than stored, so a save can never carry a threshold that its stats no longer support. */
function autismStrainedThreshold() {
	return Math.round(Math.clamp(autismLoadStrained * autismThresholdScale(), autismStrainedBounds.min, autismStrainedBounds.max));
}

/* Kept at about twice Strained, which is the shape the trait was balanced around. */
function autismBurnoutThreshold() {
	return Math.round(Math.clamp(autismStrainedThreshold() * 2, autismBurnoutBounds.min, autismBurnoutBounds.max));
}

function autismBurnoutReliefThreshold() {
	return autismBurnoutThreshold() - autismBurnoutReliefGap;
}

/* Two budgets, not one: incidental stress relief anywhere in the game draws on the passive cap, and
   deliberate regulation on its own. Sharing one lets an ordinary day spend the lot before the player
   chooses to regulate at all. */
const autismPassiveRecoveryCap = 12;
const autismDeliberateRecoveryCap = 15;
const autismDailyRecoveryCap = autismPassiveRecoveryCap + autismDeliberateRecoveryCap;

function autismRecoveryCapValue() {
	return autismDailyRecoveryCap;
}

/* Which budget a recovery draws on. "free" skips both, for sleep. */
function autismRecoveryBudget(budget) {
	if (budget === true || budget === "free") return "free";
	if (budget === "deliberate") return "deliberate";
	return "passive";
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

/* Overload and the trauma check stay absolute where Strained and Burnout scale: they are hard extremes,
   not states a PC lives in. The trait screen says so, or the mix of fixed and scaled numbers reads as a bug. */
function autismMeltdownLoadValue() {
	return autismMeltdownLoad;
}

function autismMeltdownStressPercent() {
	return Math.round(autismMeltdownStress * 100);
}

function autismLoadTraumaValue() {
	return autismLoadTraumaThreshold;
}

/* Maximum time counted as one practice session.
   Short actions like lessons, swimming, or gardening count normally.
   Longer events may raise a stat along the way, but their full duration should not count as practice or Burnout. */
const autismSpectrumSessionMaxMinutes = 120;

function playerHasAutismSpectrum() {
	if (V.statFreeze) return false;
	return V.backgroundTraits?.includes("autism") === true;
}

/* Also called during character creation, before the trait is fully applied. */
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

/* An over-limit group is cleared rather than guessing which picks to drop. Only a randomised or imported
   start can exceed a paired group, since the settings screen greys out the second pick. */
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
	if (!autismAvailableHyperfixations().includes(state.hyperfixation)) {
		state.hyperfixation = autismRollHyperfixation();
		state.hyperfixationEndsDay = today + autismRollHyperfixationDays();
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
	if (!Number.isFinite(state.fatigueNotice)) delete state.fatigueNotice;
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
	else state.recoveredToday = Math.min(state.recoveredToday, autismPassiveRecoveryCap);
	if (!Number.isFinite(state.masking) || state.masking < 0) state.masking = 0;
	else state.masking = Math.min(state.masking, autismMaskingMax);
	if (!Number.isFinite(state.deliberateRecoveredToday) || state.deliberateRecoveredToday < 0) state.deliberateRecoveredToday = 0;
	else state.deliberateRecoveredToday = Math.min(state.deliberateRecoveredToday, autismDeliberateRecoveryCap);
	if (state.phaseChanged !== true) delete state.phaseChanged;
	if (state.focusChanged !== true) delete state.focusChanged;
	if (state.reliefNotice !== true) delete state.reliefNotice;
	if (!Number.isFinite(state.reliefNoticeDay)) delete state.reliefNoticeDay;
	if (typeof state.reliefNoticeFocus !== "string") delete state.reliefNoticeFocus;
	if (state.coldStartNotice !== true) delete state.coldStartNotice;
	if (state.burnoutEntered !== true) delete state.burnoutEntered;
	if (!Number.isFinite(state.ambientStamp)) delete state.ambientStamp;
	if (!Number.isFinite(state.maskProseStamp)) delete state.maskProseStamp;
	if (!Number.isFinite(state.unmaskedProseStamp)) delete state.unmaskedProseStamp;
	if (state.composureLapseSaid !== true) delete state.composureLapseSaid;
	if (!Number.isFinite(state.overloadDay)) delete state.overloadDay;
	if (!Number.isFinite(state.composedUntil)) delete state.composedUntil;
	if (state.schoolPlan !== true) delete state.schoolPlan;
	if (!Array.isArray(state.preferences)) delete state.preferences;
	else state.preferences = state.preferences.filter(pref => autismSupportPreferences.includes(pref)).slice(0, autismPreferenceMax);
	if (!state.disclosureDepth || typeof state.disclosureDepth !== "object" || Array.isArray(state.disclosureDepth)) delete state.disclosureDepth;
	if (!Number.isFinite(state.schoolDayStamp)) delete state.schoolDayStamp;
	if (!Array.isArray(state.schoolDayBeats)) delete state.schoolDayBeats;
	if (!state.history || typeof state.history !== "object" || Array.isArray(state.history)) delete state.history;
	if (typeof state.lastCheckupTopic !== "string") delete state.lastCheckupTopic;
	if (!autismIdentityPositions.includes(state.identityView)) delete state.identityView;
	if (state.privateNudged !== true) delete state.privateNudged;
	if (!Array.isArray(state.disclosed)) delete state.disclosed;
	else state.disclosed = state.disclosed.filter(who => autismDisclosureTargets.includes(who));
	if (!["alone", "known", "strangers"].includes(state.overloadSeen)) delete state.overloadSeen;
	if (state.overloadWasForm !== "meltdown" && state.overloadWasForm !== "shutdown") delete state.overloadWasForm;
	if (state.aftermathDone !== true) delete state.aftermathDone;
	if (state.shutdownSeen !== true) delete state.shutdownSeen;
	if (!autismAssessmentStages.includes(state.assessmentStage)) delete state.assessmentStage;
	if (!autismAssessmentRoutes.includes(state.assessmentRoute)) delete state.assessmentRoute;
	if (!Number.isFinite(state.assessmentDay)) delete state.assessmentDay;
	if (!Array.isArray(state.assessmentSources)) delete state.assessmentSources;
	else state.assessmentSources = state.assessmentSources.filter(source => autismAssessmentSources.includes(source));
	/* The completed assessment owns the report. Convert the old duplicate flag once. */
	if (state.documentation === true && state.assessmentStage !== "diagnosed") {
		state.assessmentStage = "diagnosed";
		state.assessmentDay = Number(Time?.days) || 0;
	}
	delete state.documentation;
	/* A saved assessment without its date must still be able to finish its wait. */
	if (state.assessmentStage && !Number.isFinite(state.assessmentDay)) state.assessmentDay = today;
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
	if (state.unmaskReturn != null && (typeof state.unmaskReturn !== "string" || (typeof Story !== "undefined" && !Story.has(state.unmaskReturn)))) {
		delete state.unmaskReturn;
	}
	if (state.focusReturn != null && (typeof state.focusReturn !== "string" || (typeof Story !== "undefined" && !Story.has(state.focusReturn)))) {
		delete state.focusReturn;
	}
	if (state.composeReturn != null && (typeof state.composeReturn !== "string" || (typeof Story !== "undefined" && !Story.has(state.composeReturn)))) {
		delete state.composeReturn;
	}
	if (state.coldReturn != null && (typeof state.coldReturn !== "string" || (typeof Story !== "undefined" && !Story.has(state.coldReturn)))) {
		delete state.coldReturn;
	}
	if (typeof state.coldCost !== "string" || !state.coldCost) delete state.coldCost;
	if (state.kylarQuietReturn != null && (typeof state.kylarQuietReturn !== "string" || (typeof Story !== "undefined" && !Story.has(state.kylarQuietReturn)))) {
		delete state.kylarQuietReturn;
	}
	if (state.assessmentReturn != null && (typeof state.assessmentReturn !== "string" || (typeof Story !== "undefined" && !Story.has(state.assessmentReturn)))) {
		delete state.assessmentReturn;
	}
	/* Left over from the timed phase cycle, which startDay was measured against. */
	if (state.startDay !== undefined) delete state.startDay;
	return state;
}

/* The one entry point for load changes. Recovery is capped per day; gain is not. */
function autismAdjustLoad(delta, budget = "passive") {
	delta = Number(delta) || 0;
	if (!delta || V.statFreeze) return;
	const state = ensureAutismSpectrumState();
	if (delta < 0) {
		delta = Math.max(delta, -state.load);
		if (delta === 0) return;
		const kind = autismRecoveryBudget(budget);
		if (kind !== "free") {
			const deliberate = kind === "deliberate";
			const spent = deliberate ? state.deliberateRecoveredToday : state.recoveredToday;
			const allowance = (deliberate ? autismDeliberateRecoveryCap : autismPassiveRecoveryCap) - spent;
			if (allowance <= 0) return;
			delta = Math.max(delta, -allowance);
			if (deliberate) state.deliberateRecoveredToday += -delta;
			else state.recoveredToday += -delta;
		}
	}
	const previousPhase = state.phase;
	state.load = Math.clamp(state.load + delta, 0, autismLoadMax);
	autismUpdateCapacity(previousPhase);
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
	const previousPhase = state.phase;
	state.load = Math.clamp(Number(value) || 0, 0, autismLoadMax);
	autismUpdateCapacity(previousPhase);
}

function autismRecoveryLeftToday() {
	if (!playerHasAutismSpectrum()) return 0;
	const state = ensureAutismSpectrumState();
	const passive = autismPassiveRecoveryCap - state.recoveredToday;
	const deliberate = autismDeliberateRecoveryCap - state.deliberateRecoveredToday;
	return Math.max(0, Math.round(Math.max(0, passive) + Math.max(0, deliberate)));
}

/* Scenes read this to say the budget is spent rather than implying the stim itself stopped working. */
function autismDeliberateSpent() {
	if (!playerHasAutismSpectrum()) return false;
	return ensureAutismSpectrumState().deliberateRecoveredToday >= autismDeliberateRecoveryCap;
}

/* Deliberate regulation left today, so the trait screen can say why stimming has stopped helping. */
function autismDeliberateLeftToday() {
	if (!playerHasAutismSpectrum()) return 0;
	return Math.max(0, Math.round(autismDeliberateRecoveryCap - ensureAutismSpectrumState().deliberateRecoveredToday));
}

/* Pass null for current to derive from load alone, ignoring Burnout's hysteresis. */
function autismDerivedCapacity(load, current) {
	if (current === "burnout" && load >= autismBurnoutReliefThreshold()) return "burnout";
	if (load >= autismBurnoutThreshold()) return "burnout";
	if (load >= autismStrainedThreshold()) return "strained";
	return "settled";
}

/*
 * ensureAutismSpectrumState re-derives state.phase from the current load, so a caller that has just changed
 * the load must capture the old phase first and pass it as previousOverride. Reading state.phase here
 * instead would compare the new value with itself and never detect a change.
 */
function autismUpdateCapacity(previousOverride) {
	const state = ensureAutismSpectrumState();
	const previous = previousOverride !== undefined ? previousOverride : state.phase;
	state.phase = autismDerivedCapacity(state.load, previous);
	if (state.phase !== previous) {
		/* Entering Burnout is the one transition worth its own beat, and only on the way in. Coming out is
		   gradual and already has the capacity notice; going in is a threshold the PC crosses once. */
		if (state.phase === "burnout" && previous !== "burnout") {
			state.burnoutEntered = true;
			autismHistoryAdd("burnouts");
			V.timeMessages ||= [];
			V.timeMessages.pushUnique("autismBurnout");
		}
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

function autismQueueFocusMessage() {
	V.timeMessages ||= [];
	V.timeMessages.pushUnique("autismFocus");
}

/* Burnout and meltdowns only; Strained causes no trauma. amount is on the statChange.stress scale. */
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
	/* effects() empties V.timeMessages after iterating it, so anything queued mid-render is lost. The
	flags are sticky and effects() clears them, so re-queueing until it lands is free. */
	if (state.phaseChanged || state.focusChanged) {
		V.timeMessages ||= [];
		V.timeMessages.pushUnique("autismHyperfixation");
	}
	const fraction = autismStressFraction();
	if (!state.meltdown && fraction >= autismMeltdownStress && state.load >= autismMeltdownLoad) {
		state.meltdown = true;
		/* The streak ends here, so escalation restarts from nothing and one meltdown cannot run straight into another. */
		state.trainingMinutes = 0;
		autismBreakComposure();
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
	return state.assessmentStage === "diagnosed" && state.kylarDiscussed === true && state.kylarTrainingFocus !== state.hyperfixation;
}

function autismFinishKylarTraining() {
	if (!playerHasAutismSpectrum()) return;
	const state = ensureAutismSpectrumState();
	state.kylarTrainingFocus = state.kylarEventFocus || state.hyperfixation;
	delete state.kylarEventFocus;
}

/* Character creation, enabling the trait, and imported settings all use this entry point. */
function initAutismSpectrumState() {
	if (!playerHasAutismSpectrum()) return;
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
	state.deliberateRecoveredToday = 0;

	/* Things left undone are their own demand, whether or not the day contained any attempt at them. */
	const backlog = autismObligationLoad();
	if (backlog > 0) autismAdjustLoad(backlog);

	/* Sitting at high stress all day is a demand in itself, whatever caused it. */
	const stressFraction = autismStressFraction();
	if (stressFraction > 0.5) autismAdjustLoad((stressFraction - 0.5) * 16);

	/* At maximum load, another full day without rest causes trauma. Resting prevents this, even if load is still high. */
	if (!rested && state.load >= autismLoadTraumaThreshold) statChange.trauma(autismLoadDailyTrauma);

	if (today >= state.hyperfixationEndsDay) {
		state.hyperfixation = autismRollHyperfixation(state.hyperfixation);
		state.hyperfixationEndsDay = today + autismRollHyperfixationDays();
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
	/* Kylar's outing uses the actual beach, park, and orphanage locations; only the real practice reward counts as training. */
	const kylarTraining = typeof T !== "undefined" && T.autismKylarTraining === true && state.kylarEventFocus === stat;
	/* The outing holds the interest it set out with, even if midnight has since rolled the current one over. */
	const activeFocus = kylarTraining ? stat : state.hyperfixation;
	const training =
		kind === "training" || kind === "school" || kylarTraining || (autismVenueTrainableStats.includes(stat) && autismTrainingLocations.includes(V.location));
	const school = kind === "school" || kind === "schoolPassive";

	let multiplier = 1;
	if (state.phase === "settled") {
		multiplier = 1.05;
		if (school) multiplier *= 1.25;
	} else if (state.phase === "burnout") {
		multiplier = 0.8;
		if (school) multiplier *= 0.875;
	}

	/* A meltdown replaces demand fatigue rather than compounding with it. */
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

/* Runs at the end of the turn, so time passed and skill gains are both already counted. */
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

	/* A historical scene is not the PC's day */
	if (V.statFreeze) return;

	/* A zero-time passage change is neither training nor a break. */
	if (minutes <= 0) return;

	/* A long enough break counts as rest. Sleep is the main source of recovery,
	but recovery is capped so one long rest cannot remove too much load at once. */
	if (minutes >= autismSpectrumBreakMinutes) {
		state.trainingMinutes = 0;
		delete state.lastPractice;
		/* The first long break counts as sleep, so it doesn't use the day's recovery limit. */
		const firstBreak = state.restedToday !== true;
		state.restedToday = true;
		autismAdjustLoad(-Math.min(20, (minutes / 60) * 2), firstBreak ? "free" : "deliberate");
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
		/* Deliberate: the player chose to spend the time on the interest, so it must not be crowded out
		   by whatever incidental stress relief the day happened to contain. */
		autismAdjustLoad(-minutes / 20, "deliberate");
		/* Only once a day, so the recovery line is not printed after every lesson. */
		const today = Number(Time?.days) || 0;
		if (!V.statFreeze && state.reliefNoticeDay !== today) {
			state.reliefNoticeDay = today;
			state.reliefNotice = true;
			state.reliefNoticeFocus = autismSpectrumStats[focus] || "";
			autismQueueFocusMessage();
		}
	}

	/* Nothing in progress and nothing carried over: this turn is where the task actually began. */
	if (!state.lastPractice && state.trainingMinutes === 0 && !practisedInterest) autismColdStart(phase);

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
		/* During a meltdown the demand lands entirely as trauma */
		if (!state.meltdown) statChange.stress(demand);
		autismOverloadTrauma(demand);
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
 * Ambient strain lines: prose for the load that accrues quietly from sensory input, so a loud afternoon
 * does not read the same as a calm one. Purely descriptive and change no stats, so the meters stay the only
 * thing moving load.
 *
 * Queued from the sensory tick, which already runs everywhere load accrues, so this needs no per-location wiring
 * and automatically covers every place in autismLoudPlaces along with bright outdoor glare.
 */

/* Hours between ambient lines. Long, because this is texture, not a status readout. */
const autismAmbientCooldownHours = 3;

/* Even off cooldown, only this often, so the lines do not arrive on a predictable clock. */
const autismAmbientChance = 35;

function autismAmbientStamp() {
	const days = Number(Time?.days) || 0;
	const hour = Number(Time?.hour) || 0;
	return days * 24 + hour;
}

/*
 * Whether somewhere is currently worth remarking on. Kept separate from the message itself so the render
 * can ask the same question again: a queued message must not describe a room the PC has since left.
 */
function autismAmbientPlaceKind() {
	const loud = autismPlaceIsLoud();
	const bright = autismPlaceIsBright();
	if (loud && bright) return "both";
	if (loud) return "loud";
	if (bright) return "bright";
	return "";
}

function autismAmbientReady() {
	if (!playerHasAutismSpectrum() || V.statFreeze || V.possessed || V.timeSkip !== undefined || V.combat === 1) return false;
	const state = ensureAutismSpectrumState();
	/* A meltdown has its own scene and its own text. Nothing ambient belongs on top of it. */
	if (state.meltdown) return false;
	if (state.phase === "settled") return false;
	return autismAmbientPlaceKind() !== "";
}

function autismQueueAmbient() {
	if (!autismAmbientReady()) return;
	const state = ensureAutismSpectrumState();
	const now = autismAmbientStamp();
	if (Number.isFinite(state.ambientStamp) && now - state.ambientStamp < autismAmbientCooldownHours) return;
	if (random(1, 100) > autismAmbientChance) return;
	state.ambientStamp = now;
	V.timeMessages ||= [];
	V.timeMessages.pushUnique("autismAmbient");
}

const autismAmbientLines = Object.freeze({
	strained: {
		loud: [
			"There are too many sounds around you to ignore. You can still pick out individual voices and noises, but doing so takes more concentration than usual.",
			"Somebody laughs close behind you. You tense and turn towards the sound before realising they were not speaking to you.",
			"You keep noticing every nearby conversation. You try to ignore them, but your attention moves back whenever someone speaks.",
		],
		bright: [
			"Sunlight reflects off the pavement and makes you narrow your eyes. You start watching the ground ahead because looking around is becoming uncomfortable.",
			"You narrow your eyes against the glare, relax them when you notice, then find yourself doing it again a few seconds later.",
		],
		both: [
			"The glare makes you narrow your eyes while nearby voices keep pulling your attention away. You can manage both, but concentrating on anything else is becoming difficult.",
			"The area is bright and crowded with noise. As you move through it, you start choosing quieter parts of the route without thinking much about where you originally meant to walk.",
		],
	},
	burnout: {
		loud: [
			"Voices, footsteps, traffic and other nearby noises reach you at the same time. You struggle to separate the sounds long enough to decide which ones matter.",
			"The sounds around you blur together. Focusing on one takes effort, and you lose track of it whenever another noise interrupts.",
			"You react to every nearby noise now, even when it has nothing to do with you. You try to focus on one sound at a time, but another interrupts before you can.",
		],
		bright: [
			"The light makes it difficult to keep your eyes fully open. You watch the darker parts of the ground as you walk so you do not have to look directly at the glare.",
			"You realise you have been walking with your eyes partly closed. When you try to open them properly, the glare makes you narrow them again.",
		],
		both: [
			"The glare hurts your eyes while every nearby sound demands your attention. You keep looking for somewhere darker and quieter because concentrating here is becoming difficult.",
			"You struggle to ignore any of the light or noise around you. Your eyes stay narrowed while each new sound pulls your attention away from what you were trying to do.",
		],
	},
});

function autismAmbientLine() {
	if (!autismAmbientReady()) return "";
	const phase = ensureAutismSpectrumState().phase;
	const set = autismAmbientLines[phase === "burnout" ? "burnout" : "strained"];
	const lines = set?.[autismAmbientPlaceKind()];
	if (!Array.isArray(lines) || !lines.length) return "";
	return lines.random();
}

/* Referral, intake, gathering, feedback. Waits are compressed; a realistic one would outlast the game. */
const autismAssessmentStages = Object.freeze(["raised", "intake", "ready", "diagnosed"]);

/* "nhs" is free and slow, "private" costs money and is quick. The free route always completes, so a PC
   who never has money is never locked out of diagnosis. */
const autismAssessmentRoutes = Object.freeze(["nhs", "private"]);

/* In pence, matching the rest of the hospital's pricing. */
const autismPrivateAssessmentCost = 150000;

/* Days to wait at each stage before the next appointment, by route. */
const autismAssessmentWaits = Object.freeze({
	nhs: { raised: 45, intake: 14 },
	private: { raised: 3, intake: 7 },
});

/* Saves predating the routes were on the fast timings, so they default to private rather than stalling an
   assessment the player had already started. */
function autismAssessmentRoute() {
	if (!playerHasAutismSpectrum()) return "";
	const route = ensureAutismSpectrumState().assessmentRoute;
	return autismAssessmentRoutes.includes(route) ? route : "private";
}

function autismSetAssessmentRoute(route) {
	if (!playerHasAutismSpectrum() || !autismAssessmentRoutes.includes(route)) return false;
	ensureAutismSpectrumState().assessmentRoute = route;
	return true;
}

function autismPrivateCost() {
	return autismPrivateAssessmentCost;
}

/* Must match printprice: both run the base through the inflation hook, so comparing against the raw
   base would offer the option to someone who cannot pay the price on the label. */
function autismPrivateChargedCost() {
	if (typeof setup !== "undefined" && setup.inflation && setup.inflation.price) {
		return setup.inflation.price(autismPrivateAssessmentCost);
	}
	return autismPrivateAssessmentCost;
}

function autismCanAffordPrivate() {
	return (Number(V.money) || 0) >= autismPrivateChargedCost();
}

/* Stays available mid-wait, not only at referral: giving up on the queue is usually a later decision. */
function autismCanGoPrivate() {
	if (!playerHasAutismSpectrum()) return false;
	const stage = autismAssessmentStage();
	if (stage !== "raised" && stage !== "intake") return false;
	return autismAssessmentRoute() === "nhs" && autismCanAffordPrivate();
}

/* Waits for the route currently in use. */
const autismAssessmentWait = new Proxy(
	{},
	{
		get(_target, key) {
			const waits = autismAssessmentWaits[autismAssessmentRoute()] || autismAssessmentWaits.private;
			return waits[key];
		},
	}
);

/* None is individually required. The self-report is always available, so a PC with no cooperative adult
   can still finish the assessment. */
const autismAssessmentSources = Object.freeze(["self", "school", "teacher", "guardian"]);

/* How many sources are enough to move to the feedback appointment. */
const autismAssessmentSourcesNeeded = 1;

function autismAssessmentStage() {
	if (!playerHasAutismSpectrum()) return "";
	const stage = ensureAutismSpectrumState().assessmentStage;
	return autismAssessmentStages.includes(stage) ? stage : "";
}

function autismAssessmentDaysAtStage() {
	const state = ensureAutismSpectrumState();
	if (!Number.isFinite(state.assessmentDay)) return 0;
	return Math.max(0, (Number(Time?.days) || 0) - state.assessmentDay);
}

function autismAssessmentSetStage(stage) {
	if (!playerHasAutismSpectrum() || !autismAssessmentStages.includes(stage)) return;
	const state = ensureAutismSpectrumState();
	state.assessmentStage = stage;
	state.assessmentDay = Number(Time?.days) || 0;
}

function autismAssessmentGathered() {
	const state = ensureAutismSpectrumState();
	if (!Array.isArray(state.assessmentSources)) state.assessmentSources = [];
	return state.assessmentSources;
}

function autismAssessmentHasSource(source) {
	return autismAssessmentGathered().includes(source);
}

function autismAssessmentAddSource(source) {
	if (!playerHasAutismSpectrum() || !autismAssessmentSources.includes(source)) return false;
	const gathered = autismAssessmentGathered();
	if (gathered.includes(source)) return false;
	gathered.pushUnique(source);
	return true;
}

/* Whether the intake appointment can be attended: referred, and the wait has passed. */
function autismIntakeReady() {
	return autismAssessmentStage() === "raised" && autismAssessmentDaysAtStage() >= autismAssessmentWait.raised;
}

/*
 * Whether the feedback appointment can be attended. Needs both the wait and at least one source of history,
 * so a PC who gathers nothing at all is held at the gathering stage rather than blocked outright.
 */
function autismFeedbackReady() {
	const stage = autismAssessmentStage();
	if (stage === "ready") return true;
	if (stage !== "intake") return false;
	return autismAssessmentDaysAtStage() >= autismAssessmentWait.intake && autismAssessmentGathered().length >= autismAssessmentSourcesNeeded;
}

function autismDiagnosed() {
	return autismAssessmentStage() === "diagnosed";
}

/* Days still to wait at the current stage, for the prose to name a real number. */
function autismAssessmentWaitLeft() {
	const stage = autismAssessmentStage();
	const wait = autismAssessmentWait[stage];
	if (!wait) return 0;
	return Math.max(0, wait - autismAssessmentDaysAtStage());
}

/*
 * Which kind of thing the current focused interest is.
 *
 * A read helper, so scenes can carry one set of words per kind of interest rather than needing fifteen
 * bespoke variants, and so a new entry in the pool inherits sensible prose instead of falling through
 * to nothing. Purely descriptive: nothing keys off this mechanically.
 */
const autismFocusCategories = Object.freeze({
	science: "academic",
	maths: "academic",
	english: "academic",
	history: "academic",
	physique: "physical",
	athletics: "physical",
	swimming: "physical",
	dancing: "physical",
	tending: "practical",
	housekeeping: "practical",
	brawling: "combat",
	footwork: "combat",
	striking: "combat",
	kicking: "combat",
	willpower: "inner",
});

function autismHyperfixationCategory() {
	if (!playerHasAutismSpectrum()) return "academic";
	return autismFocusCategories[ensureAutismSpectrumState().hyperfixation] || "academic";
}

/* What form the last overload took, for scenes reacting to it afterwards. */
function autismLastOverloadForm() {
	if (!playerHasAutismSpectrum()) return "meltdown";
	return ensureAutismSpectrumState().overloadWasForm === "shutdown" ? "shutdown" : "meltdown";
}

/*
 * Whether the last overload happened somewhere other people could see it, which is what decides
 * whether anyone has anything to react to at all.
 */
function autismLastOverloadWitnessed() {
	if (!playerHasAutismSpectrum()) return false;
	return ensureAutismSpectrumState().overloadSeen !== "alone" && autismOverloadDaysAgo() >= 0;
}

/*
 * Whether the phase-aware lesson event should replace this lesson's ordinary safe event.
 * At most once a week, only while the PC is carrying real strain, and never on top of a meltdown,
 * which owns a scene of its own.
 */
function autismLessonEventReady() {
	if (!playerHasAutismSpectrum() || V.statFreeze || V.possessed) return false;
	if (Number(V.exposed) > 0) return false;
	if (V.weekly?.autismLesson) return false;
	const state = ensureAutismSpectrumState();
	if (state.meltdown) return false;
	return state.phase !== "settled";
}

/* Days an overload stays recent enough for someone to bring it up. */
const autismOverloadRecentDays = 2;

/*
 * Whether the PC had an overload recently enough for a scene to react to it, and how long ago.
 * Returns -1 when there is nothing recent.
 */
function autismOverloadDaysAgo() {
	if (!playerHasAutismSpectrum()) return -1;
	const state = ensureAutismSpectrumState();
	if (!Number.isFinite(state.overloadDay)) return -1;
	const ago = (Number(Time?.days) || 0) - state.overloadDay;
	if (ago < 0 || ago > autismOverloadRecentDays) return -1;
	return ago;
}

/*
 * Executive dysfunction.
 *
 * The backlog: obligations the PC knows about and has not dealt with cost something just by being outstanding.
 * This is drawn from state the game already tracks, so it only ever names things the player can actually see and
 * act on, and it stops charging the moment the obligation is settled rather than when the scene acknowledging it plays.
 *
 * Cold starts: the hard part of an unwanted task is beginning it. Starting deliberate work that is not the focused
 * interest, from a standstill, costs willpower and stress on top of the work itself. It is charged once per start,
 * not per minute, so a long session is not punished twice for being long.
 */

/* What each outstanding obligation is worth per day. */
const autismObligationWeights = Object.freeze({ rent: 3, service: 2.5, suspension: 1.5 });

/* Rent stops being a distant fact and starts being a problem this many days out. */
const autismRentNoticeDays = 3;

/* However bad the backlog gets, it is not the whole day's load on its own. */
const autismObligationDailyMax = 7;

/* Reads live state only, so an obligation cannot go stale in a save. */
function autismObligations() {
	const list = [];
	if (!playerHasAutismSpectrum()) return list;

	/* Rent counts only when it is close and the money is not already put aside, which is when it starts
	   occupying the PC rather than simply existing on a calendar. */
	const due = Number(V.renttime);
	if (Number.isFinite(due) && due <= autismRentNoticeDays && V.rentday !== undefined) {
		const owed = (Number(V.rentmoney) || 0) + (Number(V.babyRent) || 0);
		if (owed > 0 && (Number(V.baileyDeposit) || 0) < owed) {
			list.push({ label: due <= 0 ? "rent overdue" : `rent due in ${due} ${due === 1 ? "day" : "days"}`, weight: autismObligationWeights.rent });
		}
	}

	const discipline = V.schoolDiscipline;
	if (discipline?.suspended === 1) {
		const outstanding = Math.max(0, (Number(discipline.serviceRequired) || 0) - (Number(discipline.serviceDone) || 0));
		if (outstanding > 0) {
			list.push({
				label: `${outstanding} community service ${outstanding === 1 ? "session" : "sessions"} left`,
				weight: autismObligationWeights.service,
			});
		}
		const daysLeft = Math.max(0, Number(discipline.daysLeft) || 0);
		if (daysLeft > 0)
			list.push({ label: `${daysLeft} school ${daysLeft === 1 ? "day" : "days"} of suspension left`, weight: autismObligationWeights.suspension });
	}
	return list;
}

function autismObligationLoad() {
	const total = autismObligations().reduce((sum, item) => sum + item.weight, 0);
	return Math.min(total, autismObligationDailyMax);
}

function autismObligationLabels() {
	return autismObligations().map(item => item.label);
}

/*
 * Whether the PC could settle the rent right now, for the rent-day beat in <<autism-bailey>>.
 *
 * Mirrors the affordability test the rent widgets use, so the explanation the PC gives Bailey matches
 * what the payment options below it are about to offer. Deposits and surcharges are deliberately left
 * out: this asks whether the money was there to hand over, not what the final bill comes to.
 */
function autismRentCanPay() {
	const owed = (Number(V.rentmoney) || 0) + (Number(V.babyRent) || 0);
	const held = setup.inflation?.rentPayable ? Number(setup.inflation.rentPayable()) : Number(V.money);
	return (Number.isFinite(held) ? held : 0) >= owed;
}

const autismColdStartWillpower = 30;
const autismColdStartStress = 6;

/*
 * Charged when deliberate off-interest work begins from a standstill.
 *
 * Spends the daily willpower pool and never the willpower stat: the stat is what autismWillpowerCapacity
 * reads, so draining it here would lower the Load thresholds mid-day and push the PC into Strained for
 * having started a task. With daily consumption off, the cost lands entirely as stress and Load.
 */
function autismColdStart(phase) {
	const state = ensureAutismSpectrumState();
	/* Below Strained, starting something is not the problem. */
	if (V.statFreeze || phase === "settled") return false;
	const capacity = autismWillpowerCapacity();
	/* A full reserve halves the cost. An empty one pays it whole. */
	const scale = 1 - Math.clamp(capacity === null ? 0.5 : capacity / 2, 0, 1) * 0.5;
	const heavier = phase === "burnout" ? 1.5 : 1;
	if (V.xchange?.willpowerSystemEnabled === 1 && Number.isFinite(V.xchange.willpowerPoints)) {
		V.xchange.willpowerPoints = Math.max(0, V.xchange.willpowerPoints - autismColdStartWillpower * scale * heavier);
	}
	statChange.stress(Math.round(autismColdStartStress * scale * heavier));
	autismAdjustLoad(1.5 * heavier);
	state.coldStartNotice = true;
	autismHistoryAdd("coldStarts");
	autismQueueFocusMessage();
	return true;
}

/* These describe difficulty starting a task, not being bad at it. Once the PC starts, the task is normal. */
const autismColdStartLines = Object.freeze([
	"You know what you need to do and how to do it, but you still cannot make yourself start. You stand there for a while, waiting for your body to move.",
	"You get everything ready, then check it all again. You know nothing else needs preparing, but starting still feels difficult.",
	"The hardest part is beginning. Once you finally start, the work itself feels easier than the effort it took to get moving.",
	"Your hands know what to do, but you still hesitate before using them. You try to make yourself begin, but your body does not respond straight away.",
	"You have already gone through the task several times in your head. None of that gets the work done, and you already feel tired before you begin.",
]);

function autismColdStartLine() {
	return autismColdStartLines.random();
}

/*
 * Sensory input, in both directions.
 * Heat and liquid on the skin are extra stress and extra load; time spent somewhere calm and dry,
 * with none of that going on, brings load back down. Uses raw stress points, so the multiplier is 1.
 */
function autismSensoryUpdate(minutes) {
	if (!playerHasAutismSpectrum() || V.timeSkip !== undefined || V.possessed || V.sleepTimePassing) return;
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
		autismQueueAmbient();
		/* Sustained sensory input is the main way load builds, so a whole day in the loudest, brightest part
		   of town has to be able to reach Strained on its own. */
		autismAdjustLoad(extra / 45);
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
	return autismLoudPlaces.includes(V.location) && !autismQuietPassages.includes(V.passage) && !autismPrivateRooms.includes(V.passage);
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
	autismAdjustLoad(-load, "deliberate");
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

/* Private rooms/unseen activities may still have witnesses at entrances, if caught, or in later encounters. */
const autismPrivateRooms = Object.freeze([
	"Temple Prayer",
	"Temple Prayer Sneak",
	"Docks Sneak Pick",
	"Docks Search",
	"Docks Gold",
	"Docks Gold Careful",
	"Docks Gold Tear",
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
	/* A mask held all day is already effort turned inward, so an overload under one tends to keep going that way. */
	shutdownChance += Math.round((ensureAutismSpectrumState().masking / autismMaskingMax) * 25);
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
	autismAdjustLoad(-autismStimLoadRelief * scale * (minutes / 10), "deliberate");
	autismHistoryAdd("stims");
	statChange.stress(-Math.round(minutes * 1.2 * scale));
	/* Holding a stim down is work, so what masking saves is not free. */
	if (place !== "alone") autismAdjustLoad(minutes / 60);
	return place;
}

/* Masking accrues only where there is an audience, so it keys off the privacy tiers. The meter itself is
   not damage: it bleeds into Load for as long as it is held. */
const autismMaskingMax = 100;

/* Masking gained per hour at each privacy tier, before familiarity. */
const autismMaskingRate = Object.freeze({ strangers: 9, known: 4, alone: 0 });

/* Masking lost per hour with nobody to perform for. Slower than deliberately unmasking, which is the point:
   the mask comes down on its own eventually, but waiting for it wastes the day. */
const autismMaskingDrift = 4;

/* A full mask bleeds this much Load per hour. */
const autismMaskingLoadPerHour = 1.2;

/* Below this the mask is not costing anything worth reporting. */
const autismMaskingNoticeable = 20;

/* Masking text only during heavy masking, with a long cooldown. */
const autismMaskingProseFloor = 55;
const autismMaskingProseCooldownHours = 4;
const autismMaskingProseChance = 40;

const autismMaskingLines = Object.freeze([
	"You check your expression to make sure it looks right. A minute later, you check again. You cannot tell when your face changes unless you think about it.",
	"You catch yourself rehearsing a friendlier tone in your head, in case you need to speak. It takes effort to stop checking how you might sound.",
	"You run through possible replies in your head, preparing for questions nobody has asked yet.",
	"You notice that you have been keeping your shoulders in the same position. You relax them, then immediately wonder how you are supposed to hold them.",
	"You keep wondering whether your expression looks natural. Each time you adjust it, you start thinking about it again.",
	"You keep checking where you are looking and how long you hold your gaze there. Even that has become something you have to manage deliberately.",
]);

/* The one "is the mask high" question, so scenes stop inventing their own thresholds. */
function autismMaskingHigh() {
	return autismMaskingLevel() >= autismMaskingProseFloor;
}

/* A lighter reading, for scenes where any noticeable mask is worth remarking on. */
function autismMaskingNoticed() {
	return autismMaskingLevel() >= autismMaskingNoticeable;
}

function autismMaskingProseReady() {
	if (!playerHasAutismSpectrum() || V.statFreeze || V.possessed || V.timeSkip !== undefined || V.combat === 1) return false;
	const state = ensureAutismSpectrumState();
	if (state.meltdown) return false;
	if (state.masking < autismMaskingProseFloor) return false;
	/* Only while it is actually being held up, not while it drains somewhere safe. */
	return autismMaskingRateNow() > 0;
}

function autismQueueMaskingProse() {
	if (!autismMaskingProseReady()) return;
	const state = ensureAutismSpectrumState();
	const now = autismAmbientStamp();
	if (Number.isFinite(state.maskProseStamp) && now - state.maskProseStamp < autismMaskingProseCooldownHours) return;
	if (random(1, 100) > autismMaskingProseChance) return;
	state.maskProseStamp = now;
	V.timeMessages ||= [];
	V.timeMessages.pushUnique("autismMasking");
}

/* The PC is using something prepared instead of improvising. Easier, but not easy. */
const autismComposedLines = Object.freeze([
	"You use the expression you practised earlier. You still have to think about it, but you already know what your face should do.",
	"You remember the sentences you practised earlier. Having words ready makes the possibility of speaking feel easier to manage.",
	"You recall the tone you practised in front of the mirror, keeping it ready in case you need it.",
	"You settle into the posture you practised earlier. For a while, you do not have to keep correcting it.",
]);

/* A rehearsed response runs out mid-interaction, and the PC goes back to responding normally. */
const autismComposureLapsedLines = Object.freeze([
	"The preparation that helped earlier feels harder to draw on now. You start checking your expression and posture again.",
	"The replies you practised are harder to remember. You worry about finding the words if someone asks you something.",
	"You no longer feel as prepared as you did earlier. Holding your expression steady takes more of your attention again.",
]);

function autismMaskingLine() {
	if (!autismMaskingProseReady()) return "";
	/* A prepared performance and an improvised one are different experiences of the same work. */
	if (autismComposed()) return autismComposedLines.random();
	const state = ensureAutismSpectrumState();
	/* Composure that ran out during a demanding stretch gets said once, then falls back to the ordinary lines. */
	if (Number.isFinite(state.composedUntil) && !state.composureLapseSaid) {
		state.composureLapseSaid = true;
		return autismComposureLapsedLines.random();
	}
	return autismMaskingLines.random();
}

function autismMaskingLevel() {
	if (!playerHasAutismSpectrum()) return 0;
	return Math.round(ensureAutismSpectrumState().masking);
}

/* Cheat menu only, matching autismSetLoad. */
function autismSetMasking(value) {
	if (!playerHasAutismSpectrum()) return;
	ensureAutismSpectrumState().masking = Math.clamp(Number(value) || 0, 0, autismMaskingMax);
}

/* How comfortable one particular person is to be around, from 0 to 1. Love and trust are different routes to
   the same thing here, so the higher of the two stands rather than being averaged with the lower. */
function autismNpcFamiliarity(npc) {
	if (!npc) return 0;
	const love = Math.clamp(Number(npc.love) || 0, 0, 100);
	const trust = Math.clamp(Number(npc.trust) || 0, 0, 100);
	return Math.max(love, trust) / 100;
}

/* Cohabiting only puts the person in the room. Comfort still comes from the same love/trust scaling as
   anyone else, so living with someone the PC is wary of helps nothing. */
const autismResidences = Object.freeze([
	{ location: "home", npc: "Robin" },
	{ location: "flats", npc: "Poppy" },
	{ location: "farm", npc: "Alex" },
	{ location: "avery_mansion", npc: "Avery", requires: () => typeof livesInAveryMansion === "function" && livesInAveryMansion() },
]);

/* When someone who lives here is plausibly in rather than out at school or work. Deliberately coarse:
   this stands in for a housemate being somewhere in the building, not for them being in the room. */
const autismResidenceHomeHours = Object.freeze({ from: 18, until: 8 });

function autismResidentFamiliarity() {
	const home = autismResidences.find(entry => entry.location === V.location);
	if (!home) return 0;
	if (typeof home.requires === "function" && !home.requires()) return 0;
	const npc = C.npc?.[home.npc];
	/* Someone who has never been introduced is not living with the PC yet. */
	if (!npc || npc.init !== 1) return 0;
	const hour = Number(Time?.hour);
	if (!Number.isFinite(hour)) return 0;
	if (hour < autismResidenceHomeHours.from && hour >= autismResidenceHomeHours.until) return 0;
	return autismNpcFamiliarity(npc);
}

/* 0 for strangers to 1 for complete trust. Named NPCs only, and the safest person present sets the figure. */
function autismCompanyFamiliarity() {
	let best = autismResidentFamiliarity();
	if (!Array.isArray(V.NPCList) || typeof isLiveNPC !== "function") return best;
	for (let i = 0; i < V.NPCList.length; i++) {
		if (!isLiveNPC(V.NPCList[i])) continue;
		const name = typeof namedNpcInSlot === "function" ? namedNpcInSlot(i) : "";
		if (!name) continue;
		best = Math.max(best, autismNpcFamiliarity(C.npc?.[name]));
		if (best >= 1) break;
	}
	return best;
}

/* Below this, someone present is not company the PC can relax in front of. */
const autismFamiliarThreshold = 0.5;

/* A public place always counts: the onlookers are an audience whether or not they exist as NPC slots. */
function autismUntrustedCompany() {
	if (autismPrivacyTier() === "strangers") return true;
	if (!Array.isArray(V.NPCList) || typeof isLiveNPC !== "function") return false;
	for (let i = 0; i < V.NPCList.length; i++) {
		if (!isLiveNPC(V.NPCList[i])) continue;
		const name = typeof namedNpcInSlot === "function" ? namedNpcInSlot(i) : "";
		/* An ordinary NPC has no name and no history, so there is nobody there to be comfortable with. */
		if (!name || autismNpcFamiliarity(C.npc?.[name]) < autismFamiliarThreshold) return true;
	}
	return false;
}

/* The most a trusted person can help while someone else in the room still expects a performance.
   Having a safe person there is a real relief, but it does not excuse the PC from the rest of the audience. */
const autismMaskingTrustCap = 0.6;

/*
 * Masking gained per hour right now, after company. Zero means nothing is being held, which happens only
 * with nobody to perform for or in company that is entirely safe.
 */
function autismMaskingRateNow() {
	if (V.sleepTimePassing || V.combat === 1 || ensureAutismSpectrumState().meltdown) return 0;
	const base = autismMaskingRate[autismPrivacyTier()];
	if (!base) return 0;
	const trusted = autismCompanyFamiliarity();
	const relief = autismUntrustedCompany() ? trusted * autismMaskingTrustCap : trusted;
	const rate = base * (1 - Math.clamp(relief, 0, 1));
	/* A rehearsed performance is cheaper to keep up than an improvised one. */
	return autismComposed() ? rate * autismComposureRate : rate;
}

/* Whether anything is currently asking the PC to hold a presentation together. */
function autismMaskingActive() {
	if (!playerHasAutismSpectrum()) return false;
	if (V.statFreeze || V.possessed || V.timeSkip !== undefined || V.combat === 1) return false;
	return autismMaskingRateNow() > 0;
}

/* Runs alongside the sensory update, so masking follows the same clock as everything else timed. */
function autismMaskingUpdate(minutes) {
	if (!playerHasAutismSpectrum() || V.statFreeze || V.possessed || V.timeSkip !== undefined) return;
	minutes = Math.max(0, Number(minutes) || 0);
	if (!minutes) return;
	const state = ensureAutismSpectrumState();
	const hours = minutes / 60;

	/* Sleeping never requires a social performance, even in a shared or public sleeping place. */
	const suppressed = V.sleepTimePassing || V.combat === 1 || state.meltdown;
	const rate = autismMaskingRateNow();

	if (rate > 0) state.masking = Math.min(autismMaskingMax, state.masking + rate * hours);
	else {
		state.masking = Math.max(0, state.masking - autismMaskingDrift * hours);
		if (!suppressed) autismQueueUnmaskedProse();
	}

	/* Holding it is the cost, so this is charged on the level held rather than on the moment it went up. */
	if (state.masking > 0 && !suppressed) {
		autismAdjustLoad((state.masking / autismMaskingMax) * autismMaskingLoadPerHour * hours);
		autismQueueMaskingProse();
	}
}

/*
 * Two independent routes: the school plan obliges staff generally, a personal disclosure covers one person.
 * autismTeacherKnows is the single question every school scene asks, so accommodation has one source of truth.
 */
/* Everyone the game actually provides a way of telling. Avery is deliberately absent: there is no Avery
   disclosure scene, so an entry here would be a promise the content does not keep. */
const autismDisclosureTargets = Object.freeze(["Leighton", "nurse", "River", "Sirris", "Doren", "Winter", "Bailey", "Kylar"]);

function autismDisclosureList() {
	const state = ensureAutismSpectrumState();
	if (!Array.isArray(state.disclosed)) state.disclosed = [];
	return state.disclosed;
}

function autismDisclosedTo(who) {
	return autismDisclosureList().includes(who);
}

function autismDiscloseTo(who) {
	if (!playerHasAutismSpectrum() || !autismDisclosureTargets.includes(who)) return false;
	const list = autismDisclosureList();
	if (list.includes(who)) return false;
	list.pushUnique(who);
	return true;
}

/* Whether the recommended adjustments are formally on the school's file. */
function autismSchoolPlan() {
	if (!playerHasAutismSpectrum()) return false;
	return ensureAutismSpectrumState().schoolPlan === true;
}

function autismSetSchoolPlan() {
	if (!playerHasAutismSpectrum()) return;
	ensureAutismSpectrumState().schoolPlan = true;
}

/*
 * Whether a given teacher is obliged to accommodate. The plan covers everyone; a personal disclosure covers
 * that one person even without it. Documentation is a prerequisite for both: there is nothing to show
 * before the assessment concludes.
 */
function autismTeacherKnows(teacher) {
	if (!autismHasDocumentation()) return false;
	return autismSchoolPlan() || autismDisclosedTo(teacher);
}

/* Whether the PC has anything to show anyone yet. */
function autismHasDocumentation() {
	return autismDiagnosed();
}

/* Ordered by clinical urgency; the check-up takes one per visit so it does not read as a status screen. */
function autismCheckupTopics() {
	if (!playerHasAutismSpectrum()) return [];
	const state = ensureAutismSpectrumState();
	const h = autismHistory();
	const topics = [];

	if (autismOverloadDaysAgo() >= 0) topics.push("overload");
	if (state.phase === "burnout") topics.push("burnout");
	else if (h.burnouts > 0) topics.push("burnoutPast");
	if (state.masking >= 55) topics.push("masking");
	if (h.coldStarts >= 3) topics.push("coldstarts");
	if (autismObligations().length) topics.push("backlog");
	if (!autismSchoolPlan() && !autismDisclosureList().some(w => ["River", "Sirris", "Doren", "Winter", "nurse"].includes(w))) topics.push("disclosure");
	else topics.push("accommodations");
	if (h.composures > 0) topics.push("composure");
	if (h.stims > 0 || h.unmasks > 0) topics.push("regulation");
	topics.push("focus");
	return topics;
}

/* The one topic this visit is about. */
function autismCheckupTopic() {
	const topics = autismCheckupTopics();
	if (!topics.length) return "focus";
	const state = ensureAutismSpectrumState();
	/* Do not open on the same subject twice running when there is anything else to talk about. */
	const fresh = topics.filter(t => t !== state.lastCheckupTopic);
	const chosen = (fresh.length ? fresh : topics)[0];
	state.lastCheckupTopic = chosen;
	return chosen;
}

/*
 * Burnout in normal scenes.
 * The PC still acts normally, but is slower, more literal, relies more on routine, and has less energy to keep up appearances.
 */
const autismBurnoutLines = Object.freeze({
	social: [
		"You take longer to answer than usual. Sometimes you respond to the exact words someone used, then realise from their reaction that they meant something else.",
		"Making up a reply is difficult. You keep using familiar answers and phrases because thinking of something new takes too much effort.",
		"You understand what people are saying, but finding the words to answer takes longer. Sometimes you know what you want to say and still cannot get the sentence out properly.",
	],
	work: [
		"You follow the same steps in the same order you usually use. Stopping to decide what to do next feels harder than simply continuing with what you already know.",
		"You still finish your work, but everything takes longer. You check simple steps again because it is harder to remember whether you already did them.",
		"When something unexpected happens, you have to stop. You need time to work out what changed and what to do before you can continue.",
	],
	decide: [
		"Even a small choice takes longer than it should. You look through the options one at a time because considering all of them together is too difficult.",
		"You choose the familiar option because you already know what will happen. Working through the other choices feels like more than you can manage right now.",
	],
});

function autismBurnoutLine(kind = "social") {
	if (!playerHasAutismSpectrum()) return "";
	if (ensureAutismSpectrumState().phase !== "burnout") return "";
	const lines = autismBurnoutLines[kind] || autismBurnoutLines.social;
	return lines.random();
}

/*
 * Whether some activity is the PC's current focused interest, or in the same family as it. Lets ordinary
 * content light up when it happens to coincide with what the PC is fixed on this month, without every
 * interest needing bespoke scenes written for it.
 */
function autismIsFocus(stat) {
	if (!playerHasAutismSpectrum() || typeof stat !== "string") return false;
	return ensureAutismSpectrumState().hyperfixation === stat;
}

/* Prose for doing the thing the PC is currently fixed on. */
const autismFocusEngagedLines = Object.freeze([
	"You become so focused on what you are doing that everything else fades from your attention. For a while, you barely notice anything beyond the task in front of you.",
	"You look up and realise you have lost track of your surroundings. Your attention soon returns to what you were doing.",
	"You keep going longer than you planned. Even when you know you should stop, pulling yourself away feels harder than continuing.",
	"You did not have to make yourself start this. Once you began, you kept going without needing to push yourself.",
]);

function autismFocusEngagedLine() {
	return autismFocusEngagedLines.random();
}

/* Private recovery text for when nothing is being held up. */
const autismUnmaskedLines = Object.freeze([
	"You stopped thinking about what expression your face should have. A few minutes pass before you even notice.",
	"You have not worried about how long the silence lasts since you got here.",
	"You sit however feels comfortable. You are not trying to make your posture look normal for anyone.",
	"You let your thoughts wander without rehearsing how you would explain them.",
	"At some point, you stopped checking everything you said and did before doing it. You only notice after a while.",
]);

/*
 * Only where there is genuinely nothing to perform for. Deliberately routed through the same rate the masking
 * system uses, so this can never claim comfort the masking logic does not agree exists — trusted company that
 * still leaves an audience is not the same as being off duty.
 */
function autismUnmaskedProseReady() {
	if (!playerHasAutismSpectrum() || V.statFreeze || V.possessed || V.timeSkip !== undefined || V.sleepTimePassing || V.combat === 1) return false;
	const state = ensureAutismSpectrumState();
	if (state.meltdown) return false;
	if (autismMaskingRateNow() > 0) return false;
	/* Nothing to notice the absence of unless something was recently being held. */
	return state.masking >= autismMaskingNoticeable;
}

const autismUnmaskedCooldownHours = 5;

function autismQueueUnmaskedProse() {
	if (!autismUnmaskedProseReady()) return;
	const state = ensureAutismSpectrumState();
	const now = autismAmbientStamp();
	if (Number.isFinite(state.unmaskedProseStamp) && now - state.unmaskedProseStamp < autismUnmaskedCooldownHours) return;
	if (random(1, 100) > 35) return;
	state.unmaskedProseStamp = now;
	V.timeMessages ||= [];
	V.timeMessages.pushUnique("autismUnmasked");
}

function autismUnmaskedLine() {
	if (!autismUnmaskedProseReady()) return "";
	return autismUnmaskedLines.random();
}
/*
 * How the PC holds the diagnosis. Recorded once, at the end of the feedback appointment, and read by later
 * scenes so that the game does not assume one canonical emotional response to being diagnosed. It gates
 * nothing mechanical; it only changes how the PC is written talking about it.
 */
const autismIdentityPositions = Object.freeze(["relief", "label", "practical", "identity", "embarrassed", "unsure", "private"]);

function autismIdentity() {
	if (!playerHasAutismSpectrum()) return "";
	const held = ensureAutismSpectrumState().identityView;
	return autismIdentityPositions.includes(held) ? held : "";
}

function autismSetIdentity(view) {
	if (!playerHasAutismSpectrum() || !autismIdentityPositions.includes(view)) return;
	ensureAutismSpectrumState().identityView = view;
}

/* Whether the PC would rather this were not passed around. Read by disclosure prompts. */
function autismPrefersPrivate() {
	return autismIdentity() === "private";
}

/*
 * Support preferences.
 *
 * What the PC has asked staff to actually do. Set once with the school nurse and read by later scenes so that
 * the people who were told behave like people who were told. Deliberately a short list of flags rather than a
 * system: these change prose and the odd branch, and nothing else.
 */
const autismSupportPreferences = Object.freeze(["space", "plain", "notouch", "quiet", "person"]);

function autismPreferenceList() {
	const state = ensureAutismSpectrumState();
	if (!Array.isArray(state.preferences)) state.preferences = [];
	return state.preferences;
}

function autismHasPreference(pref) {
	return autismPreferenceList().includes(pref);
}

/* Two is the cap: a list long enough to be ignored is not a plan. */
const autismPreferenceMax = 2;

function autismAddPreference(pref) {
	if (!playerHasAutismSpectrum() || !autismSupportPreferences.includes(pref)) return false;
	const list = autismPreferenceList();
	if (list.includes(pref) || list.length >= autismPreferenceMax) return false;
	list.pushUnique(pref);
	return true;
}

function autismPreferenceCount() {
	return autismPreferenceList().length;
}

/*
 * How much of themselves the PC handed over along with the paperwork. A teacher can act on the recommended
 * adjustments without having been told what any of it is like from the inside, and which of those happened
 * changes how they speak about it afterwards.
 */
function autismDisclosureDepth(who) {
	const state = ensureAutismSpectrumState();
	if (!state.disclosureDepth || typeof state.disclosureDepth !== "object") return "";
	return state.disclosureDepth[who] === "full" ? "full" : state.disclosureDepth[who] === "brief" ? "brief" : "";
}

function autismSetDisclosureDepth(who, depth) {
	if (!playerHasAutismSpectrum() || !autismDisclosureTargets.includes(who)) return;
	if (depth !== "full" && depth !== "brief") return;
	const state = ensureAutismSpectrumState();
	if (!state.disclosureDepth || typeof state.disclosureDepth !== "object") state.disclosureDepth = {};
	state.disclosureDepth[who] = depth;
}

/*
 * Whether the PC may step out of a room without it being misconduct. This is the practical thing the whole
 * disclosure arc buys, so every scene that offers an exit asks this one question.
 */
function autismMayStepOut(teacher) {
	if (!autismHasDocumentation()) return false;
	return autismSchoolPlan() || autismDisclosedTo("nurse") || (teacher && autismDisclosedTo(teacher));
}

/*
 * The integrated school day. One marker so the separate events of a bad day can tell they are part of the
 * same day rather than firing independently, and so the evening can look back at it.
 */
function autismSchoolDay() {
	const state = ensureAutismSpectrumState();
	const today = Number(Time?.days) || 0;
	if (state.schoolDayStamp !== today) {
		state.schoolDayStamp = today;
		state.schoolDayBeats = [];
	}
	if (!Array.isArray(state.schoolDayBeats)) state.schoolDayBeats = [];
	return state.schoolDayBeats;
}

function autismSchoolDayHas(beat) {
	return autismSchoolDay().includes(beat);
}

function autismSchoolDayAdd(beat) {
	if (!playerHasAutismSpectrum() || typeof beat !== "string") return false;
	const beats = autismSchoolDay();
	if (beats.includes(beat)) return false;
	beats.pushUnique(beat);
	return true;
}

function autismSchoolDayCount() {
	return autismSchoolDay().length;
}

/*
 * Recent history, so the weekly check-up can follow up on what actually happened rather than reciting
 * general facts about autism. Counters are cheap and are reset when Harper reviews them.
 */
function autismHistory() {
	const state = ensureAutismSpectrumState();
	if (!state.history || typeof state.history !== "object") state.history = {};
	const h = state.history;
	for (const key of ["coldStarts", "burnouts", "overloads", "stims", "unmasks", "composures"]) {
		if (!Number.isFinite(h[key])) h[key] = 0;
	}
	return h;
}

function autismHistoryAdd(key, amount = 1) {
	if (!playerHasAutismSpectrum()) return;
	const h = autismHistory();
	if (!Number.isFinite(h[key])) return;
	h[key] += Number(amount) || 0;
}

function autismHistoryReset() {
	if (!playerHasAutismSpectrum()) return;
	ensureAutismSpectrumState().history = {};
	autismHistory();
}

/*
 * One temporary state that discounts the masking rate and expires on the clock, not a second resource.
 * Costed in stress rather than Load: a lower mask saves little Load directly, and stress feeds the meltdown
 * check, so preparing to cope socially raises the stakes for a PC already near the edge.
 */
const autismComposureMinutes = 120;
const autismComposureRate = 0.4;
const autismComposureStress = 8;
const autismComposureLoad = 1;

/* Minutes since the start of the game, so the state expires on the clock rather than on passage count. */
function autismClockStamp() {
	const days = Number(Time?.days) || 0;
	const hour = Number(Time?.hour) || 0;
	const minute = Number(Time?.minute) || 0;
	return days * 1440 + hour * 60 + minute;
}

function autismComposed() {
	if (!playerHasAutismSpectrum()) return false;
	const until = ensureAutismSpectrumState().composedUntil;
	if (!Number.isFinite(until)) return false;
	return autismClockStamp() < until;
}

/* Minutes of composure left, for the trait screen. */
function autismComposureLeft() {
	if (!autismComposed()) return 0;
	return Math.max(0, Math.round(ensureAutismSpectrumState().composedUntil - autismClockStamp()));
}

/*
 * Rehearsing. Returns false when the PC already has composure running, so the scene can say so
 * rather than charging twice for the same preparation.
 */
function autismCompose() {
	if (!playerHasAutismSpectrum() || V.statFreeze) return false;
	const state = ensureAutismSpectrumState();
	/* Refreshing while it is still running would extend the state for free, so an active composure
	   is left exactly as it is and the scene is told nothing happened. */
	if (autismComposed()) return false;
	state.composedUntil = autismClockStamp() + autismComposureMinutes;
	delete state.composureLapseSaid;
	autismHistoryAdd("composures");
	statChange.stress(autismComposureStress);
	autismAdjustLoad(autismComposureLoad);
	return true;
}

/* An overload ends the performance, so whatever was rehearsed goes with it. */
function autismBreakComposure() {
	if (!playerHasAutismSpectrum()) return;
	delete ensureAutismSpectrumState().composedUntil;
}

/*
 * Deliberately dropping the mask somewhere private. Returns how much masking was actually shed,
 * so the scene can describe what happened instead of asserting relief.
 */
function autismUnmask(minutes = 15) {
	if (!playerHasAutismSpectrum()) return 0;
	const state = ensureAutismSpectrumState();
	const before = state.masking;
	if (before <= 0) return 0;
	minutes = Math.max(1, Number(minutes) || 15);
	/* Most of it goes at once. The mask does not need to be worn down, only put aside. */
	const shed = Math.min(before, Math.max(before * 0.6, (minutes / 15) * 25));
	autismHistoryAdd("unmasks");
	state.masking = Math.max(0, before - shed);
	/* What the mask cost to hold comes back, at the rate it was charged. */
	autismAdjustLoad(-(shed / autismMaskingMax) * 12, "deliberate");
	statChange.stress(-Math.round(shed * 0.6));
	return shed;
}

function autismCanUnmask() {
	if (!playerHasAutismSpectrum() || V.statFreeze || V.possessed || V.combat === 1) return false;
	if (autismPrivacyTier() !== "alone") return false;
	return ensureAutismSpectrumState().masking >= autismMaskingNoticeable;
}

/* The scene must never tear the player out of anything that owns cleanup of its own. */
const autismSceneBlockedPassages = Object.freeze(["Police Molestation Finish", "Sleep", "Bed"]);
const autismSceneBlockedPrefixes = Object.freeze(["Passout ", "Autism "]);
const autismSceneBlockedTags = Object.freeze(["widget", "script", "stylesheet", "nosave", "ending", "exitCheckBypass"]);

function autismSceneReadyFor(dest) {
	if (!playerHasAutismSpectrum()) return false;
	if (V.statFreeze || V.possessed || V.combat === 1) return false;
	/* Do not send the player into the scene from an interface, setup passage, or ending. */
	if (typeof dest !== "string") return false;
	if (typeof Story !== "undefined") {
		if (!Story.has(dest)) return false;
		if (Story.get(dest).tags.some(tag => autismSceneBlockedTags.includes(tag))) return false;
	}
	if (Array.isArray(V.NPCList) && typeof isLiveNPC === "function" && V.NPCList.some(isLiveNPC)) return false;
	if (autismSceneBlockedPassages.includes(dest)) return false;
	if (autismSceneBlockedPrefixes.some(prefix => dest.startsWith(prefix))) return false;
	return true;
}

/*
 * Overload waits until leaving the passage is safe; its penalties already apply while waiting.
 */
function autismOverloadRedirect(dest) {
	const state = ensureAutismSpectrumState();
	if (!state.pendingScene) return null;
	if (!autismSceneReadyFor(dest)) return null;
	delete state.pendingScene;
	state.overloadPlace = autismPrivacyTier();
	/* Stamped so later scenes can react to an overload that has already ended. Without this the world has no
	   way to know one happened: state.meltdown only describes the present moment. */
	state.overloadDay = Number(Time?.days) || 0;
	/* Kept past the scene so aftermath reactions know what people actually saw. state.overloadPlace and
	   state.overloadForm are both cleared when the scene ends, so they cannot answer this later. */
	state.overloadSeen = state.overloadPlace;
	autismHistoryAdd("overloads");
	state.overloadWasForm = state.overloadForm === "shutdown" ? "shutdown" : "meltdown";
	/* A new episode is a new thing for people to react to, so any aftermath already spent is cleared. */
	delete state.aftermathDone;
	/* The interrupted destination is where "Carry on" sends the player, so it runs its own effects then. */
	state.sceneReturn = {
		passage: dest,
		location: typeof V.location === "string" ? V.location : "",
		outside: Number.isFinite(Number(V.outside)) ? V.outside : 0,
	};
	return "Autism Overload";
}

/* Chained so the version-migration waiting rooms and passage remaps installed elsewhere still win. */
(function installAutismOverloadOverride() {
	if (typeof Config === "undefined" || !Config.navigation) return;
	const previousOverride = Config.navigation.override;
	Config.navigation.override = function (dest) {
		if (typeof previousOverride === "function") {
			const previousDest = previousOverride.apply(this, arguments);
			if (previousDest) return previousDest;
		}
		try {
			return autismOverloadRedirect(dest) || false;
		} catch (e) {
			console.error("autism overload redirect failed", e);
			return false;
		}
	};
})();

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
	autismRecoveryCapValue,
	autismStrainedThreshold,
	autismMeltdownLoadValue,
	autismMeltdownStressPercent,
	autismLoadTraumaValue,
	autismBurnoutThreshold,
	autismDeliberateLeftToday,
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
	autismTalentLimit,
	autismTalentGroups,
	autismEnforceTalentLimits,
	autismOverloadForm,
	autismOverloadPlace,
	autismStim,
	autismStimIsMasked,
	autismMaskingLevel,
	autismSetMasking,
	autismMaskingActive,
	autismMaskingUpdate,
	autismUnmask,
	autismCanUnmask,
	autismComposed,
	autismComposureLeft,
	autismCompose,
	autismObligationLabels,
	autismRentCanPay,
	autismAmbientLine,
	autismOverloadDaysAgo,
	autismLessonEventReady,
	autismLastOverloadForm,
	autismLastOverloadWitnessed,
	autismHyperfixationCategory,
	autismAssessmentStage,
	autismAssessmentSetStage,
	autismAssessmentGathered,
	autismAssessmentHasSource,
	autismAssessmentAddSource,
	autismAssessmentWaitLeft,
	autismIntakeReady,
	autismAssessmentRoute,
	autismSetAssessmentRoute,
	autismPrivateCost,
	autismCanAffordPrivate,
	autismCanGoPrivate,
	autismFeedbackReady,
	autismDiagnosed,
	autismDisclosureList,
	autismDisclosedTo,
	autismDiscloseTo,
	autismSchoolPlan,
	autismSetSchoolPlan,
	autismTeacherKnows,
	autismHasDocumentation,
	autismColdStartLine,
	autismMaskingLine,
	autismDeliberateSpent,
	autismMaskingHigh,
	autismMaskingNoticed,
	autismBurnoutLine,
	autismIsFocus,
	autismFocusEngagedLine,
	autismUnmaskedLine,
	autismIdentity,
	autismSetIdentity,
	autismPrefersPrivate,
	autismHasPreference,
	autismAddPreference,
	autismPreferenceCount,
	autismDisclosureDepth,
	autismSetDisclosureDepth,
	autismMayStepOut,
	autismSchoolDayHas,
	autismSchoolDayAdd,
	autismSchoolDayCount,
	autismHistory,
	autismHistoryReset,
	autismCheckupTopic,
});
