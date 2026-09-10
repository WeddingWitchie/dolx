/* Mundane medication: prescriptions, sleep aids, and the antidepressant course.
 * Prescriptions are granted by Doctor Harper and spent at the hospital pharmacy.
 * Sleep aids suppress insomnia for one night, may cause oversleeping, and build dependence.
 *
 * Also holds the foraging baskets, further down.
 */
/* globals statChange V setup random */

const MEDICATION_SLEEP_WINDOW = 6 * 3600; /* A sleeping pill only helps if sleep follows within six hours. */
const MEDICATION_DEPENDENCE_MAX = 20;
const MEDICATION_WITHDRAWAL_THRESHOLD = 6;
const PRESCRIPTION_DURATION = 7 * 86400; /* A prescription runs for a week, then Harper has to write it again. */
const PRESCRIPTION_BOX_SIZE = 10; /* Doses handed over per collection. */
const PRESCRIPTION_PILL_NAMES = {
	painkiller: "prescription painkillers",
	sleep: "prescription sleeping pills",
	antidepressant: "Dr Harper's prescription",
};

/* The trauma suppressant used to be branded "Calmoryl", which told the player nothing.
Carry old stock over to the plain name. Can delete later */
function migrateCalmorylStock() {
	const pills = V.sexStats?.pills?.pills;
	if (!pills || typeof pills !== "object" || !pills.Calmoryl) return;
	const legacy = pills.Calmoryl;
	const current = pills["anti-anxiety tablets"];
	if (current && typeof current === "object") {
		current.owned = (Number(current.owned) || 0) + (Number(legacy.owned) || 0);
		current.doseTaken = Math.max(Number(current.doseTaken) || 0, Number(legacy.doseTaken) || 0);
		current.overdose = Math.max(Number(current.overdose) || 0, Number(legacy.overdose) || 0);
	} else {
		pills["anti-anxiety tablets"] = legacy;
	}
	delete pills.Calmoryl;
}
window.migrateCalmorylStock = migrateCalmorylStock;

/* Pills of one kind share a daily limit, whichever box they came out of. */
function pillDosesTodayByType(type) {
	const pills = V.sexStats?.pills?.pills;
	if (!pills || !setup?.pills) return 0;
	return setup.pills.filter(pill => pill.type === type).reduce((total, pill) => total + (Number(pills[pill.name]?.doseTaken) || 0), 0);
}
window.pillDosesTodayByType = pillDosesTodayByType;

/* Both sleeping pills are the same drug family: two of either in one day is an overdose. */
function sleepPillDosesToday() {
	return pillDosesTodayByType("sleep");
}
window.sleepPillDosesToday = sleepPillDosesToday;

/* Shelf and prescribed painkillers count against one another. The prescribed ones have the lower ceiling. */
function painkillerDosesToday() {
	return pillDosesTodayByType("painkiller");
}
window.painkillerDosesToday = painkillerDosesToday;

function ensureMedicationState() {
	migrateCalmorylStock();
	if (!V.prescriptions || typeof V.prescriptions !== "object") V.prescriptions = {};
	const scrips = V.prescriptions;
	if (!scrips.expiry || typeof scrips.expiry !== "object") scrips.expiry = {};
	if (!scrips.collected || typeof scrips.collected !== "object") scrips.collected = {};
	for (const kind of ["painkiller", "sleep", "antidepressant"]) {
		scrips[kind] = scrips[kind] === true;
		const expiry = Number(scrips.expiry[kind]);
		scrips.expiry[kind] = Number.isFinite(expiry) ? expiry : 0;
		scrips.collected[kind] = scrips.collected[kind] === true;
		/* A prescription that has run its week lapses. Harper has to be asked again. */
		if (scrips[kind] && V.timeStamp >= scrips.expiry[kind]) {
			scrips[kind] = false;
			scrips.expiry[kind] = 0;
			scrips.collected[kind] = false;
		}
	}

	if (!V.sleepAid || typeof V.sleepAid !== "object") V.sleepAid = {};
	const aid = V.sleepAid;
	if (aid.strength !== "otc" && aid.strength !== "prescription") aid.strength = null;
	aid.takenAt = Number.isFinite(Number(aid.takenAt)) ? Number(aid.takenAt) : 0;
	aid.dependence = Number.isFinite(Number(aid.dependence)) ? Math.clamp(Number(aid.dependence), 0, MEDICATION_DEPENDENCE_MAX) : 0;
	aid.usedToday = aid.usedToday === true;
	aid.suppressing = aid.suppressing === true;
	return { prescriptions: scrips, sleepAid: aid };
}
window.ensureMedicationState = ensureMedicationState;

function grantPrescription(kind) {
	const scrips = ensureMedicationState().prescriptions;
	if (!["painkiller", "sleep", "antidepressant"].includes(kind)) return false;
	scrips[kind] = true;
	scrips.expiry[kind] = V.timeStamp + PRESCRIPTION_DURATION;
	scrips.collected[kind] = false; /* a fresh prescription is one fresh box */
	return true;
}
window.grantPrescription = grantPrescription;

/* Whole days left before the prescription lapses, for the pharmacy and Harper's notes. */
function prescriptionDaysLeft(kind) {
	const scrips = ensureMedicationState().prescriptions;
	if (!scrips[kind]) return 0;
	return Math.max(1, Math.ceil((scrips.expiry[kind] - V.timeStamp) / 86400));
}
window.prescriptionDaysLeft = prescriptionDaysLeft;

/* Hand over this week's box. Prescribed medication costs the PC nothing; the ration is the limit. */
function collectPrescriptionBox(kind) {
	const scrips = ensureMedicationState().prescriptions;
	const pillName = PRESCRIPTION_PILL_NAMES[kind];
	if (!scrips[kind] || !pillName) return 0;
	if (scrips.collected[kind]) return 0;
	const record = V.sexStats?.pills?.pills?.[pillName];
	if (!record) return 0;
	record.owned = (Number(record.owned) || 0) + PRESCRIPTION_BOX_SIZE;
	scrips.collected[kind] = true;
	V.sexStats.pills.boughtOnce = true;
	return PRESCRIPTION_BOX_SIZE;
}
window.collectPrescriptionBox = collectPrescriptionBox;
window.prescriptionBoxSize = () => PRESCRIPTION_BOX_SIZE;

/* The antidepressant course rides on Harper's existing prescription: it only works while the PC is actually medicated. */
function antidepressantActive() {
	if (V.statFreeze) return false;
	if (!V.prescriptions || V.prescriptions.antidepressant !== true) return false;
	return (Number(V.medicated) || 0) >= 1;
}
window.antidepressantActive = antidepressantActive;

function sleepAidPending() {
	if (V.statFreeze) return null;
	const aid = ensureMedicationState().sleepAid;
	if (!aid.strength) return null;
	if (V.timeStamp - aid.takenAt > MEDICATION_SLEEP_WINDOW) return null;
	return aid;
}
window.sleepAidPending = sleepAidPending;

function takeSleepAid(strength) {
	if (V.statFreeze) return;
	const aid = ensureMedicationState().sleepAid;
	aid.strength = strength === "prescription" ? "prescription" : "otc";
	aid.takenAt = V.timeStamp;
	aid.usedToday = true;
	aid.dependence = Math.clamp(aid.dependence + (aid.strength === "prescription" ? 1 : 0.25), 0, MEDICATION_DEPENDENCE_MAX);
	refreshSleepAidState();
}
window.takeSleepAid = takeSleepAid;

/* The mild pill can't quiet a badly distressed mind. Checked before taking one so the PC can be told. */
function sleepAidOtcStrongEnough() {
	/* Anything short of severe trauma. Past that the PC needs the prescription. */
	return V.trauma < (V.traumamax / 10) * 8;
}
window.sleepAidOtcStrongEnough = sleepAidOtcStrongEnough;

/* Prescription strength settles anyone. The over-the-counter pill only holds against mild distress. */
function sleepAidSuppressesInsomnia() {
	const aid = sleepAidPending();
	if (!aid) return false;
	if (aid.strength === "prescription") return true;
	return sleepAidOtcStrongEnough();
}
window.sleepAidSuppressesInsomnia = sleepAidSuppressesInsomnia;

/* True when the PC would have insomnia right now if the pills weren't holding it down. Drives the trait display. */
function insomniaSuppressedBySleepAid() {
	if (!sleepAidSuppressesInsomnia()) return false;
	const aid = ensureMedicationState().sleepAid;
	return V.trauma >= 1 || aid.dependence >= MEDICATION_WITHDRAWAL_THRESHOLD;
}
window.insomniaSuppressedBySleepAid = insomniaSuppressedBySleepAid;

/* Once the body is used to the pills, sleeping without them is broken sleep on its own. */
function sleepAidWithdrawal() {
	if (V.statFreeze) return false;
	const aid = ensureMedicationState().sleepAid;
	return aid.dependence >= MEDICATION_WITHDRAWAL_THRESHOLD && !sleepAidPending();
}
window.sleepAidWithdrawal = sleepAidWithdrawal;

function sleepAidDependenceLevel() {
	if (V.statFreeze) return 0;
	const aid = ensureMedicationState().sleepAid;
	if (aid.dependence >= 12) return 2;
	if (aid.dependence >= MEDICATION_WITHDRAWAL_THRESHOLD) return 1;
	return 0;
}
window.sleepAidDependenceLevel = sleepAidDependenceLevel;

/* Extra hours the PC sleeps through the alarm. Returns 0 when the pills don't drag them under. */
function sleepAidOversleepHours() {
	const aid = sleepAidPending();
	if (!aid) return 0;
	const chance = (aid.strength === "prescription" ? 45 : 25) + aid.dependence;
	if (random(1, 100) > chance) return 0;
	return aid.strength === "prescription" ? random(1, 3) : random(1, 2);
}
window.sleepAidOversleepHours = sleepAidOversleepHours;

/* A dose only covers one sleep. */
function consumeSleepAid() {
	if (V.statFreeze) return;
	const aid = ensureMedicationState().sleepAid;
	aid.strength = null;
	aid.takenAt = 0;
	refreshSleepAidState();
}
window.consumeSleepAid = consumeSleepAid;

/* Insomnia is only recalculated when trauma changes, so a dose that quietly wore off would otherwise
   leave the PC sleeping well on nothing. Called from the passage header; only recalculates when the answer moved. */
function refreshSleepAidState() {
	if (V.statFreeze) return;
	const aid = ensureMedicationState().sleepAid;
	/* A dose taken and never slept on simply wears off. */
	if (aid.strength && V.timeStamp - aid.takenAt > MEDICATION_SLEEP_WINDOW) {
		aid.strength = null;
		aid.takenAt = 0;
	}
	const suppressing = sleepAidSuppressesInsomnia();
	if (aid.suppressing === suppressing) return;
	aid.suppressing = suppressing;
	if (typeof statChange?.updatePlayerTraumaState === "function") statChange.updatePlayerTraumaState();
}
window.refreshSleepAidState = refreshSleepAidState;

function medicationDayPassed() {
	if (V.statFreeze) return;
	const aid = ensureMedicationState().sleepAid;
	if (!aid.usedToday) aid.dependence = Math.clamp(aid.dependence - 0.5, 0, MEDICATION_DEPENDENCE_MAX);
	aid.usedToday = false;
}
window.medicationDayPassed = medicationDayPassed;

/* Foraging baskets: handheld items for the forest. Carrying one makes the forest offer a gathering
event a little more often, and skews which crop that event is: mushrooms, berries/fruit, or flowers.
No new events are added; only the odds of the existing ones change. */
/* Which crop each basket favours, keyed by the handheld's variable. */
setup.forageBasketCrop = {
	mushroombasket: "mushroom",
	fruitbasket: "fruit",
	flowerbasket: "flower",
};
/* Reduces the roll needed to trigger a foraging event.
   Normal: 20% chance, or 40% when searching.
   With a basket: 30% chance, or 50% when searching. */
setup.forageBasketEventBonus = 10;
/* How strongly a basket favours its own crop, as a percentage of gathering events. */
setup.forageBasketFocusChance = 80;
/* Multipliers applied to an event pool weight when a basket does or doesn't favour that event. */
setup.forageBasketWeightBonus = 3;
setup.forageBasketWeightPenalty = 0.5;

/* Which crop the worn handheld favours, or "" when carrying anything else. */
function forageBasketFocus() {
	const held = V.worn && V.worn.handheld;
	if (!held || !Array.isArray(held.type) || !held.type.includes("foraging")) return "";
	return setup.forageBasketCrop[held.variable] ?? "";
}
window.forageBasketFocus = forageBasketFocus;

/* Chooses the gathering event. Without a basket, it randomly picks mushrooms or berries.
Flowers still only come from the event pool. */
function forageBasketPick() {
	const focus = forageBasketFocus();
	if (!focus) return random(1, 2) === 2 ? "mushroom" : "fruit";
	if (random(1, 100) <= setup.forageBasketFocusChance) return focus;
	/* The remainder goes to one of the other two crops, so a basket is never a guarantee. */
	const others = ["mushroom", "fruit", "flower"].filter(kind => kind !== focus);
	return others.random();
}
window.forageBasketPick = forageBasketPick;

/* Scales an event pool weight for events that belong to one of the three crops. */
function forageBasketWeight(weight, kind) {
	const focus = forageBasketFocus();
	if (!focus) return weight;
	return weight * (focus === kind ? setup.forageBasketWeightBonus : setup.forageBasketWeightPenalty);
}
window.forageBasketWeight = forageBasketWeight;

/* Makes forest gathering events more likely when carrying a basket. */
function forageBasketThreshold(threshold) {
	if (!forageBasketFocus()) return threshold;
	return Math.max(1, threshold - setup.forageBasketEventBonus);
}
window.forageBasketThreshold = forageBasketThreshold;
