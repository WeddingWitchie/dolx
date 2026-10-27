/* globals playerIsXChanged, fertilityTreatmentActive, xchangeAlwaysFertileActive, xchangeFakeBreederInfertile, hasOmegaAnalPregnancy, playerGenitalFluidRetained */
// Did a pregnancy happen, and who caused it?
//
// In realistic mode, loads of cum are stored per orifice.
// Once past their washing grace period, each one takes its own roll, once per day, at that day's fertility.
// Heavier loads (deeper cum, higher potency) carry a better chance.
// The winner becomes a pending conception which implants two days later.
// Fetish mode rolls each load's odds the moment it lands (instantConception) and stores nothing.

/**
 * Completes the ear-slime "get sperm into your {orifice}" tasks when cum lands in the PC.
 *
 * @param {"vagina"|"anus"} orifice where the cum landed
 * @param {string} donor who it came from ("pc" for the player's own sperm)
 */
function completeEarSlimeSpermTask(orifice, donor) {
	const event = V.earSlime.event;
	if (event.includes("completed") || !event.includes(orifice)) return;
	if (event.includes("get your own sperm into your")) {
		if (donor === "pc") V.earSlime.event += " completed";
	} else if (event.includes("get sperm into your")) {
		V.earSlime.event += " completed";
	}
}

/**
 * Call this when cum lands in an orifice (vagina or anus).
 * In realistic mode the load is stored for future pregnancy rolls to pick.
 * In fetish mode the caller rolls it on the spot instead, so nothing is kept.
 *
 * The settings and anatomy checks happen in here, so the caller only passes what the scene provides.
 * Player only. An NPC pregnancy is a single roll at its scene, with no loads involved.
 *
 * @param {"vagina"|"anus"} orifice
 * @param {string} donor who it came from: an NPC's name, or "pc"
 * @param {DonorSpecies} donorSpecies the donor's species
 * @param {"outside"|"imminent"|"deep"} depth where the load landed
 * @param {string} location where the sex happened
 * @param {number} potency scales the weight. 1 for a normal load, 0.5 for the small penis dribble,
 *   1.25 for a knotting beast
 * @param {number|null} lifespan how long the load keeps counting, in seconds. null = 4 to 8 days
 * @returns {Load|null} the load, stored in realistic mode. null = pregnancy can't happen here
 */
function inseminate(orifice, donor, donorSpecies, depth, location, potency, lifespan) {
	const depthWeight = PregnancyConstants.depthWeight[depth];
	if (depthWeight === undefined) throw new Error(`unknown depth "${depth}"`);
	if (V.activeNightmare) return null;
	completeEarSlimeSpermTask(orifice, donor);
	if (!canPlayerConceive(orifice, donor, donorSpecies)) return null;

	// Cum outside or at the entrance can still be washed away. Deep cum can't.
	const canWash = depth !== "deep";
	if (lifespan === null) lifespan = random(PregnancyConstants.loadLifespanDays.min, PregnancyConstants.loadLifespanDays.max) * TimeConstants.secondsPerDay;
	const load = { donor, donorSpecies, time: Time.date.timeStamp, weight: depthWeight * potency, canWash, lifespan, location };
	if (V.settings.pregnancyType === "realistic") V.cumLoads[orifice].push(load);
	return load;
}
window.inseminate = inseminate;

/**
 * Whether a load still counts, meaning it hasn't outlived its lifespan.
 *
 * @param {Load} load
 * @returns {boolean}
 */
function loadIsLive(load) {
	return Time.date.timeStamp - load.time < load.lifespan;
}
window.loadIsLive = loadIsLive;

/** Remove the loads that have expired, from both orifices. */
function trimExpiredLoads() {
	V.cumLoads.vagina = V.cumLoads.vagina.filter(loadIsLive);
	V.cumLoads.anus = V.cumLoads.anus.filter(loadIsLive);
}
window.trimExpiredLoads = trimExpiredLoads;

/**
 * Washing removes all washable loads from both orifices; internal cum remains.
 * Inserted plugs/dildos prevent washing that orifice's load, matching waterwash behavior.
 */
function washLoads() {
	const retained = genital => typeof playerGenitalFluidRetained === "function" && playerGenitalFluidRetained(genital);
	if (!retained("vagina")) V.cumLoads.vagina = V.cumLoads.vagina.filter(l => !l.canWash);
	if (!retained("anus")) V.cumLoads.anus = V.cumLoads.anus.filter(l => !l.canWash);
}
window.washLoads = washLoads;

/**
 * A fertility pill's dose count as it will stand a number of days from now.
 *
 * @param {string} pill a key of V.sexStats.pills.pills
 * @param {number} [daysAhead=0] real days from now
 * @returns {number} doses still in effect that day
 */
function doseTakenIn(pill, daysAhead = 0) {
	return Math.max(0, V.sexStats.pills.pills[pill].doseTaken - daysAhead);
}
window.doseTakenIn = doseTakenIn;

/**
 * Conception modifier that influences how likely pc is to get pregnant.
 *
 * Contraceptive pills are 90% effective, or 100% at 2+ pills.
 *
 * Fertility boosters add 0.5x per dose, up to 4 doses (1.5x at one dose, 3x at four).
 *
 * The magic tattoo gives 1.5x.
 *
 * Earslime gives 2x when focused on pc conceiving, 0.5x when focused on pc impregnating others.
 *
 * @param {number} [daysAhead=0] real days from now, so a projection reads that day's doses
 * @returns {number} a multiplier on the base pregnancy chance
 */
function playerConceptionModifier(daysAhead = 0) {
	const modifiers = PregnancyConstants.conceptionModifiers;
	let modifier = contraceptiveGuard(daysAhead);
	if (modifier === 0) return 0;
	modifier *= fertilityBoost(daysAhead);
	if (hasPregnancyTattoo()) modifier *= modifiers.pregnancyTattooMultiplier;
	if (V.earSlime.growth >= 100) modifier *= modifiers.earSlimeMultiplier[V.earSlime.focus] ?? 1;
	return modifier * xchangeConceptionModifier();
}
window.playerConceptionModifier = playerConceptionModifier;

/**
 * DoLX: Scales the player's conception chance based on X-Change pills/settings.
 * Only affects potency; cycle fertility is handled separately.
 *
 * @returns {number} Multiplier on base pregnancy chance; 0 prevents conception.
 */
function xchangeConceptionModifier() {
	if (V.statFreeze || typeof playerIsXChanged !== "function" || !playerIsXChanged()) return 1;

	// Fake Breeder: the pill's behaviour without any of its fertility, so nothing can take.
	if (typeof xchangeFakeBreederInfertile === "function" && xchangeFakeBreederInfertile()) return 0;

	let modifier = 1;

	// The mod's global "pregnancy is this much as likely while X-Changed" dial.
	const mult = Number(V.xchange?.pregnancyMultPercent);
	if (Number.isFinite(mult) && mult >= 0) modifier *= mult / 100;

	// Breeder pill or Hyper Fertility greatly boosts conception, capped at 100%.
	// Omega bodies qualify separately because breeder-pill fertility is disabled without a vagina.
	const omegaFertile =
		(typeof hasOmegaAnalPregnancy === "function" && hasOmegaAnalPregnancy()) || (typeof omegaTargetsVagina === "function" && omegaTargetsVagina());
	const breeder = !!V.xchange?.pill?.breederEffect && (!!V.xchange.pill.fertile || omegaFertile);
	const hyper = typeof fertilityTreatmentActive === "function" && fertilityTreatmentActive();
	if (breeder || hyper) modifier *= 10 * xchangeFertilityStrength();

	/* Superfetation becomes less likely as the first Beta pregnancy progresses, but fertility boosts can still increase the chance. */
	if (typeof betaSecondWombOpen === "function" && betaSecondWombOpen()) {
		const firstPregnancy = getActiveVaginalPregnancies()[0];
		if (firstPregnancy) modifier *= Math.max(0.1, 1 - pregnancyProgress(firstPregnancy));
	}

	return modifier;
}
window.xchangeConceptionModifier = xchangeConceptionModifier;

/**
 * DoLX: the "Fertility strength" setting as a plain scale, 1 at the default 100%.
 *
 * @returns {number} the scale, at least 0.01
 */
function xchangeFertilityStrength() {
	const raw = Number(V.xchange?.fertilityStrengthPercent);
	return Number.isFinite(raw) && raw > 0 ? raw / 100 : 1;
}
window.xchangeFertilityStrength = xchangeFertilityStrength;

/**
 * DoLX: whether an X-Change effect keeps the player fertile regardless of cycle state.
 *
 * @returns {boolean}
 */
function xchangeIgnoresCycleTiming() {
	if (V.statFreeze) return false;
	if (typeof fertilityTreatmentActive === "function" && fertilityTreatmentActive()) return true;
	if (typeof xchangeAlwaysFertileActive === "function" && xchangeAlwaysFertileActive()) return true;
	return false;
}
window.xchangeIgnoresCycleTiming = xchangeIgnoresCycleTiming;

/**
 * Extra conception weight when the player sires an NPC.
 *
 * @returns {number} NPC conception chance multiplier
 */
function xchangeDonorFertility() {
	if (V.statFreeze || typeof playerIsXChanged !== "function" || !playerIsXChanged()) return 1;
	const bull = !!V.xchange?.pill?.bullEffect;
	const hyper = typeof fertilityTreatmentActive === "function" && fertilityTreatmentActive();
	if (!bull && !hyper) return 1;
	return 10 * xchangeFertilityStrength();
}
window.xchangeDonorFertility = xchangeDonorFertility;

/**
 * The fertility curve's slope: 1 at the peak, sliding to 0 windowDays away from it.
 *
 * @param {number} daysFromPeak days from the fertile peak (0 or less = at it)
 * @param {number} windowDays how far from the peak fertility reaches 0
 * @returns {number} 0 = no chance, 1 = most chance
 */
function fertilityRamp(daysFromPeak, windowDays) {
	if (daysFromPeak <= 0) return 1;
	if (!(windowDays > 0)) return 0;
	return Math.clamp(1 - daysFromPeak / windowDays, 0, 1);
}
window.fertilityRamp = fertilityRamp;

/**
 * Whether the body can take on a new pregnancy at all.
 * Already carrying a pregnancy or recovering from one means no.
 * Covers both orifices, in every pregnancy mode, with or without the cycle setting.
 *
 * @returns {boolean}
 */
function readyToCarry() {
	return V.sexStats.vagina.menstruation.currentState === "normal";
}
window.readyToCarry = readyToCarry;

/** Keep the second Beta womb slot safe on new games and same-version old saves. */
function ensurePendingPregnancySlots() {
	if (!V.pendingPregnancies || typeof V.pendingPregnancies !== "object" || Array.isArray(V.pendingPregnancies)) {
		V.pendingPregnancies = { vagina: null, vagina2: null, anus: null };
	}
	if (V.pendingPregnancies.vagina === undefined) V.pendingPregnancies.vagina = null;
	if (V.pendingPregnancies.vagina2 === undefined) V.pendingPregnancies.vagina2 = null;
	if (V.pendingPregnancies.anus === undefined) V.pendingPregnancies.anus = null;
	// Clear second-womb conception data when Beta ends to prevent blocked conceptions and delayed harpy egg cycles.
	// statFreeze uses a saved body state instead of the current one.
	if (!V.statFreeze && V.pendingPregnancies.vagina2 !== null && !playerHasBetaWombs()) V.pendingPregnancies.vagina2 = null;
}
window.ensurePendingPregnancySlots = ensurePendingPregnancySlots;

/**
 * The pending slot available to an insemination.
 * Beta permits two independent vaginal conceptions; without it the original one-pregnancy-per-body rule remains intact.
 *
 * @param {"vagina"|"anus"} orifice where the load landed
 * @param {boolean} [ignorePending=false] treat pending conceptions as absent, for the fertility meter:
 * a pending conception is one the player has no way to know about yet, so it must not read as a full slot.
 * @returns {"vagina"|"vagina2"|"anus"|null} the free slot, or null when nothing can conceive here
 */
function availablePlayerPregnancySlot(orifice, ignorePending = false) {
	ensurePendingPregnancySlots();
	const pending = ignorePending ? { vagina: null, vagina2: null, anus: null } : V.pendingPregnancies;
	const active = getActivePregnancies("pc");
	if (orifice === "anus") {
		/* Shared anal pregnancy check. This also covers fetish mode and Force Impregnation, which create pregnancies directly. statFreeze scenes are excluded because they use a saved body state. */
		if (!V.statFreeze && !playerCanCarryAnally()) return null;
		return active.length === 0 && pending.vagina === null && pending.vagina2 === null && pending.anus === null ? "anus" : null;
	}
	if (orifice !== "vagina") return null;
	if (!playerHasBetaWombs()) {
		return active.length === 0 && pending.vagina === null && pending.vagina2 === null && pending.anus === null ? "vagina" : null;
	}
	if (active.some(p => p.orifice === "anus") || pending.anus !== null) return null;
	const occupied = new Set(getActiveVaginalPregnancies().map(p => p.womb ?? 1));
	if (pending.vagina !== null) occupied.add(1);
	if (pending.vagina2 !== null) occupied.add(2);
	if (!occupied.has(1)) return "vagina";
	if (!occupied.has(2)) return "vagina2";
	return null;
}
window.availablePlayerPregnancySlot = availablePlayerPregnancySlot;

/**
 * Whether one Beta womb is pregnant while the other is still free.
 * This allows a second pregnancy, so pregnancy and fertility checks should use this.
 *
 * @returns {boolean}
 */
function betaSecondWombOpen() {
	return playerHasBetaWombs() && getActiveVaginalPregnancies().length === 1;
}
window.betaSecondWombOpen = betaSecondWombOpen;

/**
 * How much the fertility boosters in the PC lift conception on a given day
 *
 * @param {number} [daysAhead=0] days from now
 * @returns {number} 1 with no boosters, rising with the dose
 */
function fertilityBoost(daysAhead = 0) {
	const doses = Math.clamp(doseTakenIn("fertility booster", daysAhead), 0, PregnancyConstants.fertilityMaxDoses);
	return 1 + PregnancyConstants.conceptionModifiers.fertilityMultiplierPerDose * doses;
}
window.fertilityBoost = fertilityBoost;

/**
 * How far birth control holds conception down on a given day, leaving out everything that only
 * scales potency. 1 is no protection at all, 0 is full protection.
 *
 * @param {number} [daysAhead=0] days from now
 * @returns {number} 0 to 1
 */
function contraceptiveGuard(daysAhead = 0) {
	const modifiers = PregnancyConstants.conceptionModifiers;
	const doses = doseTakenIn("contraceptive", daysAhead);
	if (doses >= modifiers.contraceptiveDosesToBlock) return 0;
	return doses >= 1 ? modifiers.contraceptiveMultiplier : 1;
}
window.contraceptiveGuard = contraceptiveGuard;

/**
 * The floor under any day's fertility, so conception is never flatly impossible.
 * Fertility boosters raise it so a dose makes the body fertile now.
 *
 * @param {number} [daysAhead=0] days from now
 * @returns {number} 0 to 1
 */
function fertilityFloor(daysAhead = 0) {
	const cycle = PregnancyConstants.menstrualCycle;
	// DoLX: Hyper Fertility and "always fertile" keep fertility at full, but Heat uses menstrualCycleFertility, so the player is not permanently in heat.
	if (xchangeIgnoresCycleTiming()) return 1;
	const doses = Math.clamp(doseTakenIn("fertility booster", daysAhead), 0, PregnancyConstants.fertilityMaxDoses);
	return Math.clamp(Math.max(cycle.baselineFertility, doses * cycle.fertilityFloorPerDose), 0, 1);
}
window.fertilityFloor = fertilityFloor;

/**
 * How likely conception is on a day of the cycle: a long rise into ovulation, a short fall out of it.
 * With the fertility cycle setting off, every day is fertile.
 *
 * @param {number} day the day of the cycle to read
 * @param {number} [daysAhead=0] real days from now, so a projection reads that day's pill doses
 * @returns {number} 0 while carrying or recovering, otherwise the fertility floor at worst, up to 1 at ovulation
 */
function fertilityOnCycleDay(day, daysAhead = 0) {
	// Pregnancy or recovery normally removes fertility, unless Beta leaves one womb free to conceive.
	if (!readyToCarry() && !betaSecondWombOpen()) return 0;
	if (V.settings.fertilityCycleEnabled === false) return 1;
	return Math.max(cycleFertilityRamp(day), fertilityFloor(daysAhead));
}
window.fertilityOnCycleDay = fertilityOnCycleDay;

/**
 * Where a day sits on the cycle's own curve, with no floor and no pills.
 * Heat reads this rather than fertilityOnCycleDay.
 *
 * @param {number} day the day of the cycle to read
 * @returns {number} 0 well away from ovulation, up to 1 at it
 */
function cycleFertilityRamp(day) {
	const cycle = PregnancyConstants.menstrualCycle;
	const menstruation = V.sexStats.vagina.menstruation;
	const [, , ovulationStart, ovulationEnd] = menstruation.stages; // [cycleStart, menstrualEnd, ovulationStart, ovulationEnd]
	return day > ovulationEnd ? fertilityRamp(day - ovulationEnd, cycle.lutealTailDays) : fertilityRamp(ovulationStart - day, menstruation.fertileLeadDays);
}
window.cycleFertilityRamp = cycleFertilityRamp;

/**
 * Today's place on the cycle curve. What heat runs on.
 *
 * @returns {number} 0 to 1
 */
function menstrualCycleFertility() {
	if (!readyToCarry()) return 0;
	if (V.settings.fertilityCycleEnabled === false) return 1;
	return cycleFertilityRamp(V.sexStats.vagina.menstruation.currentDay);
}
window.menstrualCycleFertility = menstrualCycleFertility;

/**
 * The share of loads still alive this many days after landing.
 * A load's lifespan is rolled uniformly across loadLifespanDays, so it is certain to see the first
 * min days and progressively less likely to see each one after.
 *
 * @param {number} daysAfterLanding 0 on the day it landed
 * @returns {number} 0 to 1
 */
function loadSurvival(daysAfterLanding) {
	const { min, max } = PregnancyConstants.loadLifespanDays;
	const rolls = max - min + 1;
	return Math.clamp(max - Math.max(daysAfterLanding, min - 1), 0, rolls) / rolls;
}
window.loadSurvival = loadSurvival;

/**
 * How fertile pc is today.
 *
 * @returns {number} 0 for no chance up to 1 at ovulation
 */
function menstrualFertility() {
	return fertilityOnCycleDay(V.sexStats.vagina.menstruation.currentDay);
}
window.menstrualFertility = menstrualFertility;

/**
 * Which day of the load's own life this is. A load takes one conception roll per day it lives,
 * counted from when it landed, so no two loads roll on the same hour.
 *
 * @param {Load} load
 * @returns {number} 0 on the day it landed, 1 the next, and so on
 */
function loadAgeDay(load) {
	return Math.floor((Time.date.timeStamp - load.time) / TimeConstants.secondsPerDay);
}
window.loadAgeDay = loadAgeDay;

/**
 * How fertile an NPC carrier is right now.
 * The NPC fertile window runs from cycleDangerousDay to postOvulationDays past it.
 * The Great Hawk is fertile only from its dangerous day onward.
 *
 * @param {string} carrier the NPC's name
 * @returns {number} 0 for no chance up to 1 at peak fertility
 */
function npcMenstrualFertility(carrier) {
	const npcPregnancy = C.npc[carrier] && C.npc[carrier].pregnancy;
	if (!npcPregnancy || !npcPregnancy.enabled) return 1;
	if (V.settings.fertilityCycleEnabled === false) return 1;
	if (carrier === "Great Hawk") return npcPregnancy.cycleDay >= npcPregnancy.cycleDangerousDay ? 1 : 0;
	const cycle = PregnancyConstants.menstrualCycle;
	if (npcPregnancy.cycleDay > npcPregnancy.cycleDangerousDay + cycle.postOvulationDays) return 0;
	const fertileLeadDays = npcPregnancy.fertileLeadDays ?? Math.round((cycle.fertileLeadDaysMin + cycle.fertileLeadDaysMax) / 2);
	return fertilityRamp(npcPregnancy.cycleDangerousDay - npcPregnancy.cycleDay, fertileLeadDays);
}
window.npcMenstrualFertility = npcMenstrualFertility;

/**
 * Conception multiplier from a carrier NPC's birth-control state (C.npc[carrier].pregnancy.pills),
 * mirroring playerConceptionModifier. Contraceptives cut it right down, fertility pills raise it.
 *
 * @param {string} carrier the NPC who might get pregnant
 * @returns {number} a multiplier on the base NPC pregnancy chance
 */
function npcConceptionModifier(carrier) {
	const modifiers = PregnancyConstants.conceptionModifiers;
	const npc = C.npc[carrier];
	if (!npc || !npc.pregnancy) return 1;
	if (npc.pregnancy.pills === "contraceptive") return modifiers.npcContraceptiveMultiplier;
	if (npc.pregnancy.pills === "fertility") return modifiers.npcFertilityMultiplier;
	return 1;
}
window.npcConceptionModifier = npcConceptionModifier;

/**
 * Realistic pregnancy gives every load one roll per day of its life, at that day's fertility.
 * Risk builds up across the fertile window. A winner becomes the pending conception.
 *
 * @param {"vagina"|"anus"} orifice
 */
function rollAndRecordConception(orifice) {
	const slot = availablePlayerPregnancySlot(orifice);
	if (slot === null) return;
	// Anal pregnancy is checked for several days after ejaculation.
	// Stop those checks if the player can no longer carry an anal pregnancy.
	if (orifice === "anus" && !playerCanCarryAnally()) return;
	if (orificeHasParasites(orifice)) return;
	if (!readyToCarry() && !(orifice === "vagina" && betaSecondWombOpen())) return;

	const now = Time.date.timeStamp;
	const grace = PregnancyConstants.loadGracePeriod;
	const eligible = V.cumLoads[orifice].filter(load => !load.conceptionClaimed && now - load.time >= grace);
	if (eligible.length === 0) return;
	const clutchLoads = V.harpyEggs ? eligible.filter(load => childBaseSpecies(load.donorSpecies) === "hawk") : [];
	const ripeClutch = clutchLoads.length > 0;
	const running = ripeClutch ? clutchLoads : eligible;
	const setting = V.settings.basePlayerPregnancyChance;
	const baseChance = ripeClutch && setting > 0 ? 100 : setting;
	const fertility = ripeClutch ? 1 : menstrualFertility();

	const winners = [];
	for (const load of running) {
		const ageDay = loadAgeDay(load);
		if (load.rolledDay === ageDay) continue;
		load.rolledDay = ageDay;
		const chance = Math.clamp(baseChance * playerConceptionModifier() * fertility * load.weight, 0, 100);
		if (State.random() * 100 < chance) winners.push(load);
	}
	if (winners.length > 0) recordPendingPregnancy(orifice, winners[random(0, winners.length - 1)], slot);
}
window.rollAndRecordConception = rollAndRecordConception;

/**
 * The pregnancy system's hourly upkeep in every pregnancy mode.
 * Removes expired loads and implants due conceptions.
 * hourPassed (time.js) should call this once per game hour.
 */
function hourlyPregnancyUpdate() {
	trimExpiredLoads();
	startDuePregnancies();
}
window.hourlyPregnancyUpdate = hourlyPregnancyUpdate;

/**
 * Store a winning pick as the orifice's pending conception. It waits there until it is due,
 * and the morning-after pill can still discard it during the wait.
 *
 * @param {"vagina"|"anus"} orifice
 * @param {Load} load the picked load
 * @param {"vagina"|"vagina2"|"anus"|null} [slot] the pending slot to fill, resolved from the orifice by default
 * @returns {boolean} whether the pending conception was stored
 */
function recordPendingPregnancy(orifice, load, slot = availablePlayerPregnancySlot(orifice)) {
	if (slot === null) return false;
	load.conceptionClaimed = true;
	V.pendingPregnancies[slot] = {
		// The player's own body is the base of the child. Their transformations are read as heritage
		// when the record is made in generateChildren.
		carrierSpecies: "human",
		donor: load.donor,
		donorSpecies: load.donorSpecies,
		// Loads wash and expire later, so the list is remembered at the pick here or it's gone.
		possibleDonors: V.cumLoads[orifice]
			.filter(loadIsLive)
			.map(l => ({ name: l.donor, species: l.donorSpecies }))
			.filter((donor, i, all) => all.findIndex(other => other.name === donor.name) === i),
		conceivedDate: Time.date.timeStamp,
		conceivedLocation: load.location,
	};
	return true;
}
window.recordPendingPregnancy = recordPendingPregnancy;

/**
 * Whether hawk seed has already won a draw and is waiting to implant.
 *
 * @returns {boolean}
 */
function birdConceptionPending() {
	ensurePendingPregnancySlots();
	return ["vagina", "vagina2", "anus"].some(slot => {
		const pending = V.pendingPregnancies[slot];
		return pending !== null && childBaseSpecies(pending.donorSpecies) === "hawk";
	});
}
window.birdConceptionPending = birdConceptionPending;

/**
 * The morning-after pill throws out both orifices' pending conceptions and flushes all stored loads.
 *
 * Returns a result token. The pharmacy scene turns it into the text shown to the player.
 *
 * @returns {"notPregnant"|"success"|"aLittleLate"|"late"|"tooLate"} what the pill did
 */
function takeMorningAfterPill() {
	// DoLX: count pills taken; repair non-finite values before use.
	V.pregnancyStats ??= {};
	const taken = Number(V.pregnancyStats.aftermorningpills);
	V.pregnancyStats.aftermorningpills = (Number.isFinite(taken) ? taken : 0) + 1;

	// Work out the result before clearing, since clearing throws away the conception it reads.
	let outcome = "notPregnant";
	ensurePendingPregnancySlots();
	const pending = [V.pendingPregnancies.vagina, V.pendingPregnancies.vagina2, V.pendingPregnancies.anus].filter(p => p !== null);
	// Instant conceptions skip the pending stage, so implantation-window pregnancies count as pending here.
	const fresh = getActivePregnancies("pc").filter(p => Time.date.timeStamp - p.conceivedDate < PregnancyConstants.implantationWindow);
	pending.push(...fresh);
	for (const record of fresh) clearPregnancyRecord(record.pregnancyId);
	if (pending.length > 0) {
		// Beta can clear a pending second conception despite an established first pregnancy.
		// For multiple pending conceptions, judge by the oldest (closest to implantation).
		const age = Math.max(...pending.map(p => Time.date.timeStamp - p.conceivedDate));
		const implantation = PregnancyConstants.implantationWindow;
		if (age < implantation * PregnancyConstants.morningAfterPill.successFraction) outcome = "success";
		else if (age < implantation * PregnancyConstants.morningAfterPill.aLittleLateFraction) outcome = "aLittleLate";
		else outcome = "late";
	} else if (getActivePregnancy("pc", "vagina") || getActivePregnancy("pc", "anus")) {
		outcome = "tooLate";
	}
	V.pendingPregnancies.vagina = null;
	V.pendingPregnancies.vagina2 = null;
	V.pendingPregnancies.anus = null;
	V.cumLoads.vagina = [];
	V.cumLoads.anus = [];
	return outcome;
}
window.takeMorningAfterPill = takeMorningAfterPill;

/**
 * Make the pregnancy record for any pending conception that has finished its window.
 */
function startDuePregnancies() {
	ensurePendingPregnancySlots();
	for (const slot of ["vagina", "vagina2", "anus"]) {
		const pending = V.pendingPregnancies[slot];
		if (pending === null) continue;
		if (Time.date.timeStamp - pending.conceivedDate < PregnancyConstants.implantationWindow) continue;
		const orifice = slot === "vagina2" ? "vagina" : slot;
		if (slot === "vagina2" && !playerHasBetaWombs()) {
			V.pendingPregnancies[slot] = null;
			continue;
		}
		// Keep the saved body for pending anal conception; statFreeze may still need it for implantation.
		if (orifice === "anus" && !V.statFreeze && !playerCanCarryAnally()) {
			V.pendingPregnancies[slot] = null;
			continue;
		}
		if (orificeHasParasites(orifice)) {
			V.pendingPregnancies[slot] = null;
			continue;
		}
		createPregnancy(
			"pc",
			pending.carrierSpecies,
			pending.donor,
			pending.donorSpecies,
			pending.possibleDonors,
			pending.conceivedDate,
			orifice,
			pending.conceivedLocation,
			slot === "vagina2" ? 2 : 1
		);
		V.pendingPregnancies[slot] = null;
	}
}
window.startDuePregnancies = startDuePregnancies;

/**
 * Fetish pregnancy rolls for pregnancy the moment a load lands.
 * A win is an instant pregnancy. The caller makes the pregnancy record on the spot.
 *
 * @param {Load} load the load that just landed
 * @param {"vagina"|"anus"} [orifice="vagina"] where it landed, so a free Beta womb can still take it
 * @returns {Load|null} the load when it took, or null when nothing happened
 */
function fetishPregnancyRoll(load, orifice = "vagina") {
	if (!readyToCarry() && !(orifice === "vagina" && betaSecondWombOpen())) return null;
	const chance = V.settings.basePlayerPregnancyChance * playerConceptionModifier() * menstrualFertility();
	if (chance >= 100) return load;
	return State.random() * 100 < Math.clamp(chance * load.weight, 0, 100) ? load : null;
}
window.fetishPregnancyRoll = fetishPregnancyRoll;
