/* globals amcClamp pcIsBlinded wornSetupClothes playerHasWornVaginalDildo playerHasVibrator npcXChangeHourlyCheck chastityConsensual chastityFrustrationImmune loadIsLive autismEnforceTalentLimits xchangePregnancyBlocksPill */
/**
 * D.N.A. separated some X-Change misc/helper widgets from the main pill handling file:
 * - Core pill, body-save, effect, and transformation handling remains here or `xchange.twee`
 * - Misc/shared helper widgets are being moved/split into `koztools`
 * - JS-side logic may still live across `xchange.js`, `identity.js`, and related files
 * If what you're looking for isn't defined here, check the other files too.
 */

function paramError(functionName = "", param = "", value, expectedValues = "") {
	if (typeof value === "object") value = JSON.stringify(value);
	/* Included both types of error reporting, since this often will only occur in a link */
	Errors.report(
		`Unexpected value for the function "${functionName}" in the passage "${V.passage}". Param "${param}" had unexpected value of "${value}".${
			expectedValues ? ` ${expectedValues}` : ""
		}`
	);
	throw new Error(
		`Unexpected value for the function "${functionName}". Param "${param}" had unexpected value of "${value}".${expectedValues ? ` ${expectedValues}` : ""}`
	);
}

function xChangeRepairNoticeOnce(id, message) {
	const clean = String(message ?? "").replace(/<[^>]*>/g, " ");
	try {
		const existing = typeof setup !== "undefined" ? setup.xChangeRepairNoticeOnce : null;
		if (typeof existing === "function" && existing !== xChangeRepairNoticeOnce) {
			existing(id, message);
			return;
		}
		if (typeof window.xChangeQueueNotice === "function") {
			window.xChangeQueueNotice(id, message);
			return;
		}
		const SV = typeof State !== "undefined" && State.variables ? State.variables : window.V;
		if (SV) {
			SV.xChangeFlags ??= {};
			SV.xChangeNotices ??= [];
			if (!SV.xChangeFlags[id] && !SV.xChangeNotices.some(n => n?.id === id)) SV.xChangeNotices.push({ id, html: message });
			return;
		}
	} catch (e) {}
	console.warn(`[X-Change repair] ${id}: ${clean}`);
}
if (typeof window.setup !== "object" || window.setup === null) window.setup = {};
if (typeof setup.xChangeRepairNoticeOnce !== "function") setup.xChangeRepairNoticeOnce = xChangeRepairNoticeOnce;

/* Pure validation: never mutates the snapshot. A snapshot that fails this is reported
	loudly (see the <<error>> in xchange.twee load-body/save-body) instead of being silently
	"repaired" into a lossy shape. Legacy data (e.g. base-DoL sex/gender_body "h") is fixed
	once by the flagged migration in version-update.twee, not on every load. */
function xChangeBodySnapshotUsable(body) {
	if (!body || typeof body !== "object" || Array.isArray(body)) return false;
	if (Object.keys(body).length === 0) return false;

	const requiredNumbers = ["bodysize", "breastsize", "bottomsize", "penissize", "ballssize"];
	if (!requiredNumbers.every(key => typeof body[key] === "number" && Number.isFinite(body[key]))) return false;

	if (typeof body.facestyle !== "string" || body.facestyle.length === 0) return false;
	if (typeof body.facevariant !== "string" || body.facevariant.length === 0) return false;
	if (!["m", "f", "a"].includes(body.gender_body)) return false;
	if (typeof body.bodyshape !== "string" || body.bodyshape.length === 0) return false;
	if (!["m", "f"].includes(body.sex)) return false;

	return true;
}
window.xChangeBodySnapshotUsable = xChangeBodySnapshotUsable;

/* One-time legacy migration, called from version-update.twee.
	Old body snapshots may use "h" for sex/gender_body or lack those fields entirely.
	Derive only gender_body and sex so old snapshots can load. Other invalid data is left
	untouched and will still be caught by xChangeBodySnapshotUsable. */
function xChangeDeriveSnapshotGenderBody(body) {
	if (body.gender_body === "h") return "a"; // legacy herm value
	if (["m", "f", "a"].includes(body.gender_body)) return body.gender_body;
	const hasPenis = body.penisExist === true;
	const hasVagina = body.vaginaExist === true;
	if (hasPenis && hasVagina) return "a";
	if (hasVagina) return "f";
	if (hasPenis) return "m";
	return undefined;
}

function xChangeDeriveSnapshotSex(body, genderBody) {
	if (["m", "f"].includes(body.sex)) return body.sex;
	if (genderBody === "f") return "f";
	if (genderBody === "m") return "m";
	// Herm ("a") or unknown: the underlying sex isn't recoverable from legacy data. Prefer an explicit
	// vagina-only signal, otherwise default to "m". The body still reads as a herm via gender_body "a".
	if (body.vaginaExist === true && body.penisExist !== true) return "f";
	return "m";
}

function xChangeMigrateLegacyHermSnapshot(body) {
	if (!body || typeof body !== "object" || Array.isArray(body)) return false;
	if (Object.keys(body).length === 0) return false; // empty {} placeholder = "no body saved"; leave it
	let changed = false;
	const genderBody = xChangeDeriveSnapshotGenderBody(body);
	if (genderBody !== undefined && body.gender_body !== genderBody) {
		body.gender_body = genderBody;
		changed = true;
	}
	if (!["m", "f"].includes(body.sex)) {
		body.sex = xChangeDeriveSnapshotSex(body, body.gender_body);
		changed = true;
	}
	return changed;
}

function xChangeMigrateLegacyHermSnapshots() {
	const pill = V.xchange && V.xchange.pill;
	if (!pill || typeof pill !== "object" || Array.isArray(pill)) return false;
	let changed = false;
	for (const key of ["originalBody", "changedBody", "hermBody"]) {
		if (xChangeMigrateLegacyHermSnapshot(pill[key])) changed = true;
	}
	if (pill.clonedBody && typeof pill.clonedBody === "object") {
		for (const name of Object.keys(pill.clonedBody)) {
			if (xChangeMigrateLegacyHermSnapshot(pill.clonedBody[name])) changed = true;
		}
	}
	return changed;
}
window.xChangeMigrateLegacyHermSnapshots = xChangeMigrateLegacyHermSnapshots;
setup.xChangeMigrateLegacyHermSnapshots = xChangeMigrateLegacyHermSnapshots;

function getAntiPillSensitivityBonus(part) {
	if (V.statFreeze || activeInsanityTrait()) return 0;
	const anti = V.xchange?.antiPillSensitivity;
	if (!anti || typeof anti.hours !== "number" || anti.hours <= 0) return 0;

	const bonus = Number(anti.globalBonus);
	if (!Number.isFinite(bonus) || bonus <= 0) return 0;

	switch (part) {
		case "mouth":
			return bonus * 3;
		case "breast":
		case "breasts":
			return bonus * 3;
		case "bottom":
			return bonus * 3;
		case "anal":
		case "buttocks":
		case "genital":
		case "genitals":
			return bonus * 3;
		case "hands":
			return bonus * 3;
		case "thighs":
			return bonus * 3;
		case "feet":
			return bonus * 3;

		default:
			return 0;
	}
}
window.getAntiPillSensitivityBonus = getAntiPillSensitivityBonus;

function getGeneralSensitivity(part) {
	const antiPillMod = insanitySensitivityAdjustment(getAntiPillSensitivityBonus(part));
	return applySensitivityMedication(1 + antiPillMod, 6);
}
window.getGeneralSensitivity = getGeneralSensitivity;

function getSensitivityMedication() {
	if (V.statFreeze) return null;
	const medication = V.sensitivityMedication;
	if (!medication || !["suppressant", "stimulant"].includes(medication.type)) return null;
	if (!Number.isFinite(medication.endsAt) || medication.endsAt <= V.timeStamp) return null;
	return medication;
}
window.getSensitivityMedication = getSensitivityMedication;

function sensitivityMedicationRemainingHours() {
	const medication = getSensitivityMedication();
	return medication ? Math.ceil((medication.endsAt - V.timeStamp) / 3600) : 0;
}
window.sensitivityMedicationRemainingHours = sensitivityMedicationRemainingHours;

function applySensitivityMedication(value, max) {
	const medication = getSensitivityMedication();
	if (medication?.type === "suppressant") return 0.25;
	return Math.clamp(value + (medication?.type === "stimulant" ? 3 : 0), 0.25, max);
}
window.applySensitivityMedication = applySensitivityMedication;

// Number of consecutive daily suppressant applications. Drives the escalating stress penalty and the status hint.
function sensitivitySuppressantStreakCount() {
	const streak = V.sensitivitySuppressantStreak;
	return streak && Number.isFinite(streak.count) ? streak.count : 0;
}
window.sensitivitySuppressantStreakCount = sensitivitySuppressantStreakCount;

// Applies a sensitivity cream: sets up the 16h timed effect, tracks the consecutive-day suppressant streak, and rolls whether this application came from a tampered batch that hoards arousal instead of blocking it.
function applySensitivityCream(type) {
	if (!["suppressant", "stimulant"].includes(type)) return;
	const durationSeconds = 16 * 3600;
	const endsAt = V.timeStamp + durationSeconds;

	if (type === "stimulant") {
		// A stimulant replaces any active suppressant and breaks its dependency streak.
		delete V.sensitivitySuppressantStreak;
		V.sensitivityMedication = { type, endsAt };
		return;
	}

	// Suppressant: extend the consecutive-day streak if the last dose was yesterday/today, otherwise restart it.
	const today = Time.days;
	const streak = V.sensitivitySuppressantStreak;
	if (streak && Number.isFinite(streak.lastDay) && today - streak.lastDay <= 1) {
		streak.count = (Number.isFinite(streak.count) ? streak.count : 0) + 1;
		streak.lastDay = today;
	} else {
		V.sensitivitySuppressantStreak = { count: 1, lastDay: today };
	}

	// ~15% of applications are tampered: sensation is still numbed, but the blocked arousal is quietly stockpiled.
	const tampered = random(1, 100) <= 15;
	V.sensitivityMedication = { type, endsAt, tampered, stockpile: 0 };
}
window.applySensitivityCream = applySensitivityCream;

function getSensitivity(part) {
	const xchangeActive = playerIsXChanged() && !V.statFreeze;
	const purityMod = insanitySensitivityAdjustment(xchangeActive ? ((1000 - V.purity) * V.xchange.impuritySensitivityBonus) / 1000 : 0);
	const xchangeMod = insanitySensitivityAdjustment(xchangeActive ? (V.player.sex === "f" ? 1 : -1) * V.xchange.pillSensitivityChange : 0);
	const orgasmingMod = insanitySensitivityAdjustment(V.orgasmCum > 0 ? 1 : 0);
	const antiPillMod = insanitySensitivityAdjustment(getAntiPillSensitivityBonus(part));

	switch (part) {
		case "mouth": {
			const oralFixationMod = insanitySensitivityAdjustment(oralFixationActive() ? 2 : 0);
			return applySensitivityMedication(V.mouthsensitivity + antiPillMod + oralFixationMod, 6);
		}
		case "breast":
		case "breasts":
			return applySensitivityMedication(V.breastsensitivity + purityMod + xchangeMod + orgasmingMod + antiPillMod, 8);
		case "bottom":
			return applySensitivityMedication(V.bottomsensitivity + purityMod + xchangeMod + orgasmingMod + antiPillMod, 5);
		case "genital":
		case "genitals": {
			// An internal-insert chastity belt keeps you constantly primed while it's worn; the bump vanishes the instant it comes off.
			const internalChastityMod = V.player.vaginaExist && V.worn.genitals.type.includes("internal") ? 1 : 0;
			return applySensitivityMedication(V.genitalsensitivity + 2 * purityMod + xchangeMod + orgasmingMod + antiPillMod + internalChastityMod, 12);
		}
		default:
			paramError("getSensitivity", "part", part, "Expected a string, see function for accepted values");
			break;
	}
}
window.getSensitivity = getSensitivity;

/* An empty clothing slot holds the "naked" placeholder item. Scenes freely shove `exposed` around on whatever is in a slot without checking
   whether anything is actually there, so the placeholder's own `exposed` can't be trusted
   the name is what says there's no garment to rub. */
function wornSlotIsBare(slot) {
	const item = V.worn[slot];
	if (!item) return true;
	return item.name === "naked" || (item.type || []).includes("naked");
}
window.wornSlotIsBare = wornSlotIsBare;

function getBreastSensitiveRubSlot() {
	const under = V.worn.under_upper;
	const upper = V.worn.upper;
	const underSetup = wornSetupClothes("under_upper");
	const upperSetup = wornSetupClothes("upper");
	const underTypes = under.type || [];
	const upperTypes = upper.type || [];
	const underBare = wornSlotIsBare("under_upper");
	const upperBare = wornSlotIsBare("upper");
	const silky = types => V.silkyTrait !== 0 && types.includes("silky");
	// Sticky nipple coverings protect even when their minimal coverage gives them the "naked" trait.
	const protectedByUnder =
		(!underBare || underTypes.includes("sticky")) &&
		under.exposed < 2 &&
		(underTypes.includes("sticky") || underTypes.includes("chest_bind") || underSetup.formfitting === 1 || under.name === "swim shirt" || silky(underTypes));

	if (protectedByUnder) return null;
	if (!underBare && under.exposed < 2) return "under_upper";
	if (
		(!upperBare || upperTypes.includes("sticky")) &&
		upper.exposed < 2 &&
		(upperTypes.includes("sticky") || upperTypes.includes("chest_bind") || upperSetup.formfitting === 1 || upper.name === "swim shirt" || silky(upperTypes))
	)
		return null;
	if (!upperBare && upper.exposed < 2) return "upper";
	return null;
}
window.getBreastSensitiveRubSlot = getBreastSensitiveRubSlot;

function getGenitalSensitiveRubSlot() {
	const under = V.worn.under_lower;
	const lower = V.worn.lower;
	const underSetup = wornSetupClothes("under_lower");
	const lowerSetup = wornSetupClothes("lower");
	const underBare = wornSlotIsBare("under_lower");
	const lowerBare = wornSlotIsBare("lower");
	const silky = setupItem => V.silkyTrait !== 0 && !!setupItem?.type?.includes("silky");
	const protectedByUnder =
		!underBare && under.exposed < 2 && (underSetup.one_piece === 1 || silky(underSetup) || (under.name === "boxers" && !V.player.penisExist));

	if (protectedByUnder) return null;
	if (!underBare && under.exposed < 2) return "under_lower";
	if (!lowerBare && lower.exposed < 2 && lowerSetup.skirt !== 1 && !silky(lowerSetup)) return "lower";
	return null;
}
window.getGenitalSensitiveRubSlot = getGenitalSensitiveRubSlot;

function oralFixationActive() {
	return !V.statFreeze && !V.hc && V.oral_fixation_trait === 1 && !!V.xchange?.oralFixationTraitEnabled;
}
window.oralFixationActive = oralFixationActive;

/* Oral Fixation craves the mouth busy with a partner, or (optional setting) cum swallowed within the last hour. */
function oralFixationCravingUnmet() {
	if (!oralFixationActive()) return false;
	if (["penis", "othervagina", "otheranus", "facesit", "tentacle"].includes(V.mouthuse)) return false;
	if (["penetrated", "othervagina", "otheranus"].includes(V.mouthstate)) return false;
	if (Array.isArray(V.NPCList) && V.NPCList.some(npc => npc && npc.penis === "mouth")) return false;
	if (V.xchange.oralFixationSwallowRelief && Number.isFinite(V.oralFixationLastSwallow) && V.timeStamp - V.oralFixationLastSwallow <= 3600) return false;
	return true;
}
window.oralFixationCravingUnmet = oralFixationCravingUnmet;

/* The craving only blocks orgasm while "allow orgasm" is off. */
function oralFixationDenies() {
	return !V.xchange?.oralFixationFreeOrgasm && oralFixationCravingUnmet();
}
window.oralFixationDenies = oralFixationDenies;

function pleasure(amount, source) {
	if (isNaN(amount)) paramError("pleasure", "amount", amount, "Expected a number.");
	amount = Number(amount);
	const fragment = document.createDocumentFragment();

	if (amount) {
		let mod = 1;

		// If currently under the refractory period post-orgasm, prevent arousal from raising.
		if (V.refractoryPeriod > 0 && amount > 0) {
			if (V.drugged > 0) {
				V.refractoryPeriod--;
				V.refractoryPeriodMessage = 2;
			} else {
				V.refractoryPeriodMessage = 1;
			}

			amount = 0;
			V.effectsmessage = 1;
		}

		// Trait checks & effects
		if (amount > 0 && V.orgasmtrait) mod *= 0.6;

		// adds up to +1 to the arousal modifier when suffocating
		if (V.choketrait) mod += (V.oxygenmax - V.oxygen) / V.oxygenmax;

		if (V.drugged > 0) {
			/*
				Multiplies the modifier by up to 2x at full bar
				Comment Akoz: I chose to make it multiply, rather than add to the modifier
				so that the aphrodisiacs become quite threatening during nonconsensual use,
				and more thrilling when used intentionally
			*/
			if (V.substanceRebalance === 1) {
				mod *= 1 + V.drugged / 250;
			} else {
				mod *= 1 + V.drugged / 1000;
			}
		}

		const penetrating = ["penetrated", "othervagina", "otheranus", "othermouth"];

		// Read the hole state, not $vaginause/$anususe: those are already set while a penis, tentacle or machine only rests at the entrance.
		const penetratedStates = ["penetrated", "doublepenetrated", "tentacle", "tentacledeep"];
		const npcPenetratingHole = ["anus", "anusdouble", "vagina", "vaginadouble"];

		const anusPenetratedNow = penetratedStates.includes(V.anusstate);
		const vaginaPenetratedNow = penetratedStates.includes(V.vaginastate);

		const playerIsBeingPenetrated =
			anusPenetratedNow ||
			vaginaPenetratedNow ||
			(Array.isArray(V.NPCList) && V.NPCList.some(npc => npc && npcPenetratingHole.includes(npc.penis))) ||
			[0, 3].includes(V.portalPanties?.state?.vagina?.new) ||
			[0, 3].includes(V.portalPanties?.state?.anus?.new) ||
			V.portalejacvagina ||
			V.portalejacanus;

		const penisAddictionFulfilled = playerIsBeingPenetrated;
		const holeAddictionFulfilled = penetrating.includes(V.penisuse);
		const alphaEffectActive = !V.statFreeze && !V.hc && playerIsXChanged() && V.xchange.pill?.alphaEffect && V.player?.penisExist;
		// Gwylan's ritual has its own bespoke orgasm pacing ($sexRitual.playerOrgasms / orgasmTarget);
		// the addiction/breeder/alpha/omega denial gates below fight that system instead of complementing it, so they're suspended for the ritual's duration.
		// $sexRitual only exists between gwylanRitualStart and gwylanRitualEnd, so this cleanly brackets the whole scene.
		const gwylanRitualActive = !!V.sexRitual;
		// The hole addiction craves getting the player's own cock into something; with no penis (e.g. genderflipped by a pill) it cannot possibly be fulfilled, so it lies dormant instead of soft-locking every orgasm.
		// Each craving's "allow orgasm" setting lifts its block; the orgasm then comes out hollow instead (see freedCravings below).
		const penisAddictActive = !V.statFreeze && !V.hc && V.penis_addict_trait === 1 && !V.xchange.genitalAddictFreeOrgasm;
		const holeAddictActive =
			!gwylanRitualActive &&
			((!V.statFreeze && !V.hc && V.hole_addict_trait === 1 && V.player?.penisExist === true && !V.xchange.genitalAddictFreeOrgasm) ||
				(alphaEffectActive && !V.xchange.alphaFreeOrgasm));
		const oralFixationUnmet = !gwylanRitualActive && oralFixationDenies();

		// Apply effect according to source
		let sensitivity = 0;
		let pleasure;
		switch (source) {
			case undefined:
			case "masturbation":
			case "maso":
			case "other":
				// No modifier. The usual behaviour for this widget
				break;
			case "mouth":
			case "oral":
			case "lips":
			case "masturbationMouth":
			case "masturbationOral":
			case "kiss":
				sensitivity += getSensitivity("mouth");
				break;
			case "breast":
			case "breasts":
			case "chest":
			case "nipple":
			case "nipples":
			case "masturbationBreasts":
			case "masturbationNipples":
			case "chest_grope":
				sensitivity += getSensitivity("breast");
				fragment.append(wikifier("playWithBreasts"));
				if (playerIsPregnant()) sensitivity += insanitySensitivityAdjustment(0.5);
				break;
			case "bottom":
			case "anus":
			case "anal":
			case "ass":
			case "butt":
			case "masturbationAnal":
			case "masturbationAss":
			case "bottom_grope":
				if (amount > 0 && anusPenetratedNow) {
					statChange.pain(V.analPain || 0);
					if (!V.statFreeze && !V.hc && V.penis_addict_trait === 1) sensitivity += insanitySensitivityAdjustment(0.5);
				}
				sensitivity += getSensitivity("bottom");
				break;
			case "genital":
			case "genitals":
			case "penis":
			case "penile":
			case "pussy":
			case "vaginal":
			case "vagina":
			case "masturbationGenital":
			case "masturbationPenis":
			case "masturbationVagina":
			case "pussy_grope":
			case "penis_grope":
				if (amount > 0 && V.player.vaginaExist === true && vaginaPenetratedNow) {
					statChange.pain(V.vaginalPain || 0);
					if (!V.statFreeze && !V.hc && V.penis_addict_trait === 1) sensitivity += insanitySensitivityAdjustment(0.5);
				}
				sensitivity += getSensitivity("genital");
				if (playerIsPregnant()) sensitivity += insanitySensitivityAdjustment(0.5);
				break;
			case "time":
				pleasure = Math.clamp(V.pleasure + amount * (amount > 0 ? mod : 1), 0, V.pleasuremax);
				if (V.trackedArousal.length > 4) {
					V.trackedArousal.deleteAt(0);
					V.trackedArousal[V.trackedArousal.length - 1] += (pleasure * pleasure) / (V.pleasuremax * 0.8);
				}
				V.trackedArousal.push(0);
				break;
			default:
				paramError("pleasure", "source", source, "Expected a string, see function for values");
				break;
		}

		// Adjusts modifier for body part sensitivity, if applicable.
		// sensitivity === 0 is the "no source" sentinel (undefined/masturbation/maso/other) and must be treated as "no sensitivity modifier" (the old quadratic gives +0.25), NOT multiplied to zero.
		if (amount > 0) {
			if (sensitivity > 0 && sensitivity < 1) {
				mod *= sensitivity;
			} else {
				let sensitivityMod = (sensitivity - 1) ** 2 / 4;
				// Halve sensitivity boosts during chef job
				// todo: rebalance chef job better
				if (V.masturbation_bowl) sensitivityMod /= 2;
				mod += sensitivityMod;
			}
		}

		if (
			amount > 0 &&
			!gwylanRitualActive &&
			((penisAddictActive && !penisAddictionFulfilled) || (holeAddictActive && !holeAddictionFulfilled) || oralFixationUnmet)
		) {
			mod *= 0.6;
		}

		// Concentration reduces incoming arousal by half
		// Whilst failed concentration adds half a point of sensitivity to all incoming arousal
		if (V.xchange.resistCombatArousal === 1 && amount > 0) {
			mod *= 0.5;
		} else if (V.xchange.resistCombatArousal === -1 && amount > 0) {
			mod += 0.5;
		}

		// Blindfolds and sleeping masks slightly increase sensitivity.
		if (amount > 0 && pcIsBlinded()) {
			mod += 0.35;
		}

		// Reduce the mod if masturbating while in heat and/or rut
		if (source && source.includes("masturbation")) {
			mod *= 1 - Math.clamp(playerHeatMinArousal() + playerRutMinArousal(), 0, 4000) / 5000;
		}

		// Scale down stimulation according to current arousal
		mod *= V.arousal / V.arousalmax;

		const oldPleasure = V.pleasure;
		const pleasureChange = amount * (amount > 0 ? mod : 1) * (amount > 0 ? Weather.BodyTemperature.arousalModifier : 1);
		V.pleasure += pleasureChange;

		// Prevent orgasming unless addictions are fulfilled (suspended during Gwylan's ritual, see gwylanRitualActive above)
		const genitalAddictionsUnmet = !gwylanRitualActive && ((penisAddictActive && !penisAddictionFulfilled) || (holeAddictActive && !holeAddictionFulfilled));
		const addictionsUnmet = genitalAddictionsUnmet || oralFixationUnmet;

		const cap = (V.pleasuremax * 4) / 5 - 1;

		// NPC-wielded toys in combat live on the NPCs' hand slots ($NPCList[n].lefthand/righthand, set by combat-set-hand-target), NOT on the player's action vars, so toy detection must read them too.
		const npcHands = Array.isArray(V.NPCList) ? V.NPCList.flatMap(npc => (npc ? [npc.lefthand, npc.righthand] : [])) : [];

		// A processed orgasm (or letting arousal fade out of the session) drops pleasure well below the edge;
		// the breakthrough pity counter resets with it.
		if (V.xchange?.toyEdgingCount && V.pleasure < (V.pleasuremax * 2) / 5) delete V.xchange.toyEdgingCount;

		/*
			Shared escalating "pity" roll for toy relief.
			Each denied roll at the edge raises the next chance (10%, 25%, 40%... guaranteed by the 7th), so the hollow forced orgasm reliably arrives within a few combat turns.
			The old flat 10% only LOOKED functional in masturbation because the "To orgasm" skip-loop ran up to 100 iterations of pleasure() calls; combat gets roughly one roll per turn and encounters ended long before the orgasm ever fired.
			messageKind: 1 = addiction/alpha gate, 2 = breeder/omega gate, 3 = Oral Fixation alone, with no toy (picks the notice flavour).
		*/
		let toyBreakthroughRolled = false;
		const rollToyBreakthrough = messageKind => {
			// Combined effects can reach both gates in one pleasure() call, but should only get one roll per stimulation.
			if (toyBreakthroughRolled) return false;
			toyBreakthroughRolled = true;
			V.xchange = V.xchange || {};
			const priorDenials = Number.isFinite(Number(V.xchange.toyEdgingCount)) ? Number(V.xchange.toyEdgingCount) : 0;
			const roll = Math.floor(Math.random() * 100) + 1;

			if (roll <= 10 + priorDenials * 15) {
				// Real orgasm; hollow and unsatisfying, but it IS an orgasm.
				// Set bypass flag so subsequent pleasure() calls don't re-clamp.
				V.pleasure = V.pleasuremax;
				V.xchange.breakthroughOrgasm = true;
				delete V.xchange.toyEdgingCount;
				V.effectsmessage = 1;
				V.sexual_addiction_toy_breakthrough_message = messageKind;
				return true;
			}
			V.xchange.toyEdgingCount = priorDenials + 1;
			return false;
		};

		// If a breakthrough orgasm was already triggered, let it through until pleasure drops (orgasm processed).
		// Don't re-clamp.
		if (V.xchange.breakthroughOrgasm && V.pleasure >= (V.pleasuremax * 4) / 5) {
			// Let it ride, orgasm processing will handle it
		} else if (V.xchange.breakthroughOrgasm && V.pleasure < (V.pleasuremax * 4) / 5) {
			// Orgasm processed, clear the bypass
			delete V.xchange.breakthroughOrgasm;
		} else if (addictionsUnmet) {
			// Trait-aware toy detection: each addiction needs a DIFFERENT type of toy.
			// Penis addict ("getting railed") → insertive toys (things inside the player)
			// Hole addict ("get your cock into something") → enveloping toys (things around the penis)
			const usingSexToy = (() => {
				// Live action states from the masturbation system (actions.js):
				//   V.leftarm / V.rightarm  — current hand action ("mvaginadildo" = toy inside vagina, "mpenisstroker" = penis inside stroker, "mpickupdildo" = merely holding it)
				//   V.vaginause / V.anususe — "mdildopenetrate" = riding a toy on the floor
				//   V.penisuse              — "stroker" while the penis is inside a stroker
				// These only hold toy values while the toy is actually IN USE, so a toy that is merely carried in the inventory can never satisfy the check.

				// NOTE: deliberately NOT using V.currentToyLeft/Right/Vagina/Anus here those are indices into the carried-toys list, are set the moment a toy is picked up, and can go stale; they don't prove anything is inserted.
				const arms = [V.leftarm, V.rightarm];

				// Penis Addict: needs something INSIDE the player
				if (penisAddictActive && !penisAddictionFulfilled) {
					// Worn (inserted) toys: the V.worn slots are the single source of truth for what's actually in the body, and these helpers verify state === "worn".
					// The per-item inventory `worn` flags are shop-UI bookkeeping that other systems (combat "removed" state, vision morphs, save/load breaking the slot↔item alias) don't maintain, so they must never be read here as a stale flag made merely carried toys count as inserted.
					// Every insertable worn toy lands in one of these three slots (anal beads share butt_plug; all vibes share vibrator).
					try {
						if (playerHasButtPlug()) return true;
						if (playerHasWornVaginalDildo()) return true;
						if (playerHasVibrator()) return true;
					} catch (e) {}

					// Worn insertive genital accessory (vibe/egg in the genitals slot)
					try {
						if (V.worn?.genitals?.name && !["none", "naked"].includes(String(V.worn.genitals.name).toLowerCase())) {
							if (/vibe|vibrator|bullet|egg/i.test(String(V.worn.genitals.name))) return true;
						}
					} catch (e) {}

					// Hand-held toy actually inserted ("entrance" tease states don't count): masturbation states plus the combat self-use equivalents
					if (arms.some(a => ["mvaginadildo", "manusdildo", "dildoSelfPussy", "dildoSelfAnus"].includes(a))) return true;

					// Riding a toy placed on the floor
					if (V.vaginause === "mdildopenetrate" || V.anususe === "mdildopenetrate") return true;

					// An NPC actively fucking the player with a dildo in combat
					if (npcHands.includes("vaginadildo") || npcHands.includes("anusdildo")) return true;

					// Swarm creatures inside the body are tracked separately from hand or worn slots.
					if (V.swarm?.amount?.butt?.[1] > 0) return true;
					if (V.player?.vaginaExist && V.swarm?.amount?.genital?.[1] > 0) return true;
				}

				// Hole Addict: needs the penis INSIDE something
				if (holeAddictActive && !holeAddictionFulfilled && V.player?.penisExist) {
					if (V.penisuse === "stroker" || V.penisuse === "strokerSelfPenis") return true;
					if (arms.some(a => ["mpenisstroker", "strokerSelfPenis"].includes(a))) return true;
					// An NPC working a stroker over the player's penis in combat
					if (npcHands.includes("penisstroker")) return true;

					// A swarm at the genitals envelops the penis rather than entering anything.
					if (V.swarm?.amount?.genital?.[1] > 0) return true;
				}

				return false;
			})();

			// 1 = penis craving unmet, 2 = hole/alpha craving unmet, 3 = both.
			// This makes the notice show the actual missing craving instead of guessing from traits.
			const showBlockedMsg = () => {
				const penisUnmet = penisAddictActive && !penisAddictionFulfilled;
				const holeUnmet = holeAddictActive && !holeAddictionFulfilled;
				V.effectsmessage = 1;
				if (penisUnmet || holeUnmet) V.sexual_addiction_message = penisUnmet && holeUnmet ? 3 : holeUnmet ? 2 : 1;
				if (oralFixationUnmet) V.oral_fixation_message = 1;
			};

			// No toy stands in for a mouthful, so an Oral Fixation that is the only craving left always gets the escalating breakthrough roll.
			// Without it, scenes with no oral option would pin pleasure at the edge forever.
			if (usingSexToy || !genitalAddictionsUnmet) {
				// Soft gate: clamp to cap, with an escalating chance of breakthrough orgasm
				if (V.pleasure > cap) V.pleasure = cap;

				if (V.pleasure >= cap && !rollToyBreakthrough(usingSexToy ? 1 : 3)) {
					showBlockedMsg();
				}
			} else {
				// Hard block without appropriate toy
				V.pleasure = Math.clamp(V.pleasure, 0, cap);
				if (V.pleasure === cap) showBlockedMsg();
			}
		}

		if (V.xchange.breederEdgingCount == null) V.xchange.breederEdgingCount = 0;
		if (V.xchange.breederEdgingStress == null) V.xchange.breederEdgingStress = 100;

		// Cannot orgasm under breeder/omega unless there is actual internal semen, or a valid insemination event just occurred.
		// Skipped entirely when the player has enabled free orgasms (breederOrgasmDenied() returns false).
		// Also skipped when a breakthrough orgasm already fired this call (addiction/alpha toy gate above); re-clamping here used to silently eat that orgasm along with its message and stress.
		const breederEffectActive =
			!V.statFreeze && !V.hc && !gwylanRitualActive && playerIsXChanged() && (V.xchange.pill?.breederEffect || V.xchange.pill?.omegaEffect);
		const breederSatisfied = !breederOrgasmDenied() || V.xchange.breederOrgasm || V.breederCreampied;
		if (breederEffectActive && !breederSatisfied && !V.xchange.breakthroughOrgasm && oldPleasure + pleasureChange >= (V.pleasuremax * 4) / 5) {
			// Toy relief: a toy working the needy hole turns the hard denial into the same soft gate the addiction traits get, clamped at the edge with an escalating chance of a hollow forced orgasm.
			// It is NOT satisfaction: no blissful creampie payoff, breederDenial keeps building, and the forced release costs stress (see the toy breakthrough message).
			const usingBreederToy = (() => {
				const pill = V.xchange.pill || {};
				const arms = [V.leftarm, V.rightarm];

				// Omega prefers anal stimulation from inserted toys or NPC dildo use. If "needs no vagina" redirects Omega to vaginal use, use the Breeder logic below instead.
				if (omegaTargetsAnus()) {
					try {
						if (playerHasButtPlug()) return true;
					} catch (e) {}
					if (arms.some(a => ["manusdildo", "dildoSelfAnus"].includes(a))) return true;
					if (V.anususe === "mdildopenetrate") return true;
					if (npcHands.includes("anusdildo")) return true;
				}

				// Breeder craves the womb: same logic for the vagina.
				if ((pill.breederEffect || (pill.omegaEffect && !omegaTargetsAnus())) && V.player?.vaginaExist) {
					try {
						if (playerHasWornVaginalDildo()) return true;
						if (playerHasVibrator()) return true;
					} catch (e) {}
					if (arms.some(a => ["mvaginadildo", "dildoSelfPussy"].includes(a))) return true;
					if (V.vaginause === "mdildopenetrate") return true;
					if (npcHands.includes("vaginadildo")) return true;
				}

				return false;
			})();

			if (usingBreederToy) {
				if (V.pleasure > cap) V.pleasure = cap;
				if (V.pleasure >= cap && !rollToyBreakthrough(2)) {
					V.xchange.breederEdgingCount++;
				}
			} else {
				V.pleasure = Math.clamp(V.pleasure, 0, cap);
				V.xchange.breederEdgingCount++;
			}
		}

		if (V.xchange.breederEdgingCount > 10) {
			V.effectsmessage = 1;
			V.breederEdgingMessage = 1;
			const breederDenial = Number(V.xchange.breederDenial);
			V.xchange.breederDenial = Number.isFinite(breederDenial) ? Math.clamp(breederDenial + 1, 0, 6) : 1;
			V.xchange.breederEdgingCount = 0;
			const edgingStress = Number(V.xchange.breederEdgingStress);
			const denialStress = Math.clamp(Number.isFinite(edgingStress) ? edgingStress : 100, 50, 400);
			fragment.append(wikifier("stress", denialStress, 1));
			V.xchange.breederEdgingStress = Math.min(denialStress + 25, 400);

			// Treat the denial like a failed climax instead of leaving pleasure pinned at the edge.
			// The player must build back from 40% before another denial can charge, preventing one sex action from chaining stress/trauma hits.
			V.pleasure = Math.min(V.pleasure, (V.pleasuremax * 2) / 5 - 1);
		}

		// Cravings whose block a setting lifted but which are still unmet. <<orgasm>> reads this to make the release hollow and stressful.
		if (amount > 0) {
			const freedCravings = [];
			if (!gwylanRitualActive && !V.statFreeze && !V.hc) {
				if (V.xchange.genitalAddictFreeOrgasm && V.penis_addict_trait === 1 && !penisAddictionFulfilled) freedCravings.push("penis");
				if (V.xchange.genitalAddictFreeOrgasm && V.hole_addict_trait === 1 && V.player?.penisExist && !holeAddictionFulfilled) freedCravings.push("hole");
				else if (V.xchange.alphaFreeOrgasm && alphaEffectActive && !holeAddictionFulfilled) freedCravings.push("alpha");
				if (V.xchange.oralFixationFreeOrgasm && oralFixationCravingUnmet()) freedCravings.push("oral");
				const breederUnfilled = breederEffectActive && !playerIsBreederCreampied() && !V.xchange.breederOrgasm && !V.breederCreampied;
				if (breederUnfilled && V.xchange.breederFreeOrgasm && V.xchange.pill?.breederEffect) freedCravings.push("breeder");
				if (breederUnfilled && V.xchange.omegaFreeOrgasm && V.xchange.pill?.omegaEffect) freedCravings.push("omega");
			}
			if (freedCravings.length) V.xchange.freedCravings = { kinds: freedCravings, at: V.timeStamp };
			else delete V.xchange.freedCravings;
		}

		fragment.append(wikifier("arousal-moan", amount * (amount > 0 ? mod : 1) * (amount > 0 ? Weather.BodyTemperature.arousalModifier : 1), sensitivity));

		// Add to the tracker
		if (amount > 0) {
			V.trackedArousal[V.trackedArousal.length - 1] += Math.round(amount * (amount > 0 ? mod : 1));
			V.timeSinceArousal = 0;
		}

		// Tampered suppressant: the sensation you don't feel is quietly hoarded, capped, and dumped when the cream wears off.
		if (amount > 0) {
			const med = getSensitivityMedication();
			if (med?.type === "suppressant" && med.tampered) {
				const stored = Number.isFinite(med.stockpile) ? med.stockpile : 0;
				med.stockpile = Math.clamp(stored + amount, 0, V.arousalmax * 3);
			}
		}

		// Bounded overshoot: the headroom above pleasuremax keeps violent-action orgasms reachable (statChange.pain drains pleasure below 100 masochism, so a hard clamp at max let each hit pull the value back under the orgasm threshold), while an unbounded value let single huge gains (e.g. <<arousal $arousalmax*2>>) bank tens of thousands of pleasure that dozens of orgasms couldn't drain.
		V.pleasure = Math.clamp(V.pleasure, 0, V.pleasuremax * 1.25);

		return fragment;
	}
}
Macro.add("pleasure", {
	handler() {
		const fragment = pleasure(...this.args);
		this.output.append(fragment);
	},
});
window.pleasure = pleasure;

function getPleasure(passMinutes) {
	const minuteMultiplier = passMinutes * 10;
	let addedPleasure = 0;

	if (
		V.worn.genitals.name === "chastity parasite" ||
		(V.parasite.penis.name && V.parasite.penis.name === "parasite") ||
		(V.parasite.clit.name && V.parasite.clit.name === "parasite")
	) {
		if (!V.masturbating) {
			if (V.earSlime.corruption >= 100 && !V.earSlime.defyCooldown && !V.earSlime.vibration && !V.earSlime.event) {
				V.earSlime.lastVibration += passMinutes;
				if (V.earSlime.lastVibration > random(240, 720)) {
					V.earSlime.vibration = random(60, 120);
					V.earSlime.lastVibration = 0;
				}
			}
			if (V.earSlime.defyCooldown) {
				if (V.pain < 25) V.pain += Math.clamp(passMinutes, 0, 20 - Math.floor(V.pain));
				if (V.worn.genitals.name === "chastity parasite") {
					// Helps to reduce the penis size
					V.penisgrowthtimer += Math.floor(Math.clamp(passMinutes / 8, 0, (passMinutes * 60) / V.earSlime.defyCooldown));
				}
			} else if (V.earSlime.vibration > 0) {
				addedPleasure += Math.clamp(minuteMultiplier * 4, 0, V.earSlime.vibration * 40) * getSensitivity("genitals");
				V.earSlime.vibration -= Math.clamp(passMinutes, 0, V.earSlime.vibration);
				V.earSlime.lastVibration = Math.clamp(passMinutes - V.earSlime.vibration, 0, Infinity);
			}
		}
	} else {
		V.earSlime.vibration = 0;
		V.earSlime.lastVibration = 0;
	}

	return addedPleasure;
}
window.getPleasure = getPleasure;

function updatePhysique() {
	// Vanilla physique ceiling per bodysize (indexed 0..4):
	//   -1: 3000 (extrapolated below),  0: 6000,  1: 8000,
	//    2: 10000, (2.5 -> 12000 via interpolation), 3: 14000, 4: 15000
	const physiquesizes = [6000, 8000, 10000, 14000, 15000];

	if (!V.xchange?.baseStats) return;
	if (typeof V.xchange.baseStats.physique !== "number") return;
	if (typeof V.xchange.baseStats.physiquesize !== "number") return;
	if (V.xchange.baseStats.physiquesize <= 0) return;

	const bs = V.bodysize;
	let ps = null;

	if (typeof bs === "number" && !Number.isNaN(bs)) {
		if (bs < 0) {
			// Vanilla anchors bs = -1 at 3000; extrapolate further-negative bs downward.
			const extraSteps = Math.max(0, Math.abs(Math.round(bs)) - 1);
			ps = Math.round(3000 * Math.pow(0.8, extraSteps));
		} else {
			const lastIdx = physiquesizes.length - 1;
			if (bs >= lastIdx) {
				// At or above top of the curve -> clamp (vanilla has no bs > 4 case).
				ps = physiquesizes[lastIdx];
			} else {
				const lo = Math.floor(bs);
				const hi = Math.ceil(bs);
				const t = bs - lo;
				ps = Math.round(physiquesizes[lo] + (physiquesizes[hi] - physiquesizes[lo]) * t);
			}
		}
	}

	if (typeof ps !== "number" || Number.isNaN(ps) || ps <= 0) return;
	V.physiquesize = ps;

	const pct = typeof V.xchange.physiqueChangePercent === "number" ? V.xchange.physiqueChangePercent / 100 : 1;
	const genderMismatch = V.player?.gender != null && V.player?.sex != null && V.player.gender !== V.player.sex;

	// Cheat target: convert desired final physique into baseStats.physique
	const target = V.xchange?.physiqueCheatTarget;
	if (typeof target === "number" && !Number.isNaN(target)) {
		const factor = (V.physiquesize / V.xchange.baseStats.physiquesize) * (genderMismatch ? pct : 1);

		if (factor > 0) {
			V.xchange.baseStats.physique = Math.max(0, Math.round(target / factor));
		}
		delete V.xchange.physiqueCheatTarget;
	}

	// Respect the same ceiling as clamp; this runs on :passageend and would otherwise overwrite the clamped value with an uncapped one.
	V.physique = amcClamp(
		Math.round(V.xchange.baseStats.physique * (V.physiquesize / V.xchange.baseStats.physiquesize) * (genderMismatch ? pct : 1)),
		V.physiquesize,
		Number(V.AMCTraits?.physique) || 1
	);
}
window.updatePhysique = updatePhysique;

if (typeof updatePhysique === "function") updatePhysique();

const permanentInsanityTalentKeys = [
	"physique",
	"willpower",
	"milk",
	"semen",
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
	"seductionskill",
	"oralskill",
	"chestskill",
	"handskill",
	"bottomskill",
	"penileskill",
	"vaginalskill",
	"analskill",
	"thighskill",
	"feetskill",
];

function permanentInsanityTalentLockActive() {
	// The doubled skill caps / locked talent menu are a deliberate character-creation tradeoff only.
	// A naturally-gained permanent Insanity (insanityPermanent set mid-game via the settings toggle) is a punishment, not a build choice, so it does NOT receive them.
	return V.background?.insanity === true;
}
window.permanentInsanityTalentLockActive = permanentInsanityTalentLockActive;

function insanitySuppressed() {
	// Gwylan's Clarity hypnosis dampens the Insanity's effects for as long as it holds (it never cures it).
	return !!V.hypnosis_traits?.clarity;
}
window.insanitySuppressed = insanitySuppressed;

function activeInsanityTrait() {
	if (V.statFreeze) return false;
	if (insanitySuppressed()) return false;
	return V.backgroundTraits?.includes("insanity") === true;
}
window.activeInsanityTrait = activeInsanityTrait;

function insanitySensitivityAdjustment(amount) {
	const value = Number(amount);
	if (!Number.isFinite(value)) return 0;
	// A fractured mind is numb: while Insane, every sensitivity modifier is fully nullified regardless of sign.
	// Nullifying only positives let sex-flipped modifiers (e.g. -1 * pillSensitivityChange) slip through as a sensitivity *decrease*, the "reflection" bug where +1 became -1.
	return activeInsanityTrait() ? 0 : value;
}
window.insanitySensitivityAdjustment = insanitySensitivityAdjustment;

function applyPermanentInsanityTalents() {
	if (V.statFreeze) return;
	if (!V.AMCTraits || typeof V.AMCTraits !== "object" || Array.isArray(V.AMCTraits)) return;

	if (!permanentInsanityTalentLockActive()) {
		// Turning Insanity off refunds the free talents. Without this, both talents in max-1 pairs can stay active for free.
		if (V.AMCTraitsPreInsanity && typeof V.AMCTraitsPreInsanity === "object" && !Array.isArray(V.AMCTraitsPreInsanity)) {
			permanentInsanityTalentKeys.forEach(key => {
				V.AMCTraits[key] = V.AMCTraitsPreInsanity[key] === 2 ? 2 : 1;
			});
			delete V.AMCTraitsPreInsanity;
			// The restored picks were legal when they were made. Autism Spectrum may have been dropped since, taking its extra picks with it.
			if (typeof autismEnforceTalentLimits === "function") autismEnforceTalentLimits();
			return;
		}
		delete V.AMCTraitsPreInsanity;
		return;
	}

	// Snapshot the player's own picks the first time the lock takes hold, so they survive the forced-on pass.
	if (!V.AMCTraitsPreInsanity || typeof V.AMCTraitsPreInsanity !== "object" || Array.isArray(V.AMCTraitsPreInsanity)) {
		V.AMCTraitsPreInsanity = {};
		permanentInsanityTalentKeys.forEach(key => {
			V.AMCTraitsPreInsanity[key] = V.AMCTraits[key] === 2 ? 2 : 1;
		});
	}

	permanentInsanityTalentKeys.forEach(key => {
		V.AMCTraits[key] = 2;
	});
}
window.applyPermanentInsanityTalents = applyPermanentInsanityTalents;

function sumTalents() {
	return (
		V.AMCTraits.skulduggery +
		V.AMCTraits.dancing +
		V.AMCTraits.swimming +
		V.AMCTraits.athletics +
		V.AMCTraits.tending +
		V.AMCTraits.housekeeping +
		V.AMCTraits.brawling +
		V.AMCTraits.footwork +
		V.AMCTraits.striking +
		V.AMCTraits.kicking +
		V.AMCTraits.science +
		V.AMCTraits.maths +
		V.AMCTraits.english +
		V.AMCTraits.history
	);
}
window.sumTalents = sumTalents;

function sumSexTalents() {
	return (
		V.AMCTraits.seductionskill +
		V.AMCTraits.oralskill +
		V.AMCTraits.chestskill +
		V.AMCTraits.handskill +
		V.AMCTraits.bottomskill +
		V.AMCTraits.penileskill +
		V.AMCTraits.vaginalskill +
		V.AMCTraits.analskill +
		V.AMCTraits.thighskill +
		V.AMCTraits.feetskill
	);
}
window.sumSexTalents = sumSexTalents;

function playerIsXChanged() {
	return V.xchange.pill && V.xchange.pill.active;
}
window.playerIsXChanged = playerIsXChanged;

// Recognition requires a body swap, not gray effects, height changes, or a makeover.
function playerHasXChangeBody() {
	const pill = V.xchange.pill;
	return !!(playerIsXChanged() && (pill.genderflipEffect || pill.hermEffect || setup.xChangeCloneVirginityRole(pill.clone)));
}
window.playerHasXChangeBody = playerHasXChangeBody;

/**
 * Whether Alpha and Omega pills can trigger heat or rut.
 * When "ABO drives" is enabled, Omega can enter heat through the fertility cycle,
 * while Alpha can enter rut. When disabled, heat only happens through breeding denial.
 *
 * @returns {boolean}
 */
function aboDrivesHeat() {
	return !V.statFreeze && !V.hc && !!V.xchange?.aboDrivesHeat && playerIsXChanged();
}
window.aboDrivesHeat = aboDrivesHeat;

/**
 * Adds extra allure from active Alpha, Beta, and Omega pheromones.
 * Each active pheromone adds to allure and can stack with the others.
 * Does not affect attractiveness.
 *
 * @returns {number} Extra allure, or 0 if none are active
 */
function xchangePheromoneAllure() {
	if (V.statFreeze || V.hc || !V.xchange?.pheromoneAllure || !playerIsXChanged()) return 0;
	const pill = V.xchange.pill;
	if (!pill) return 0;
	let allure = 0;
	// Alpha only signals while there is a cock to signal with, the same condition its knot runs on.
	if (pill.alphaEffect && V.player?.penisExist) allure += 400;
	// Omega signals from whichever hole it is aiming at, so it needs no anatomy test of its own.
	if (pill.omegaEffect) allure += 400;
	// Beta is the quiet one: two wombs to fill, but nothing about it advertises as loudly.
	if (pill.betaEffect && V.player?.vaginaExist) allure += 200;
	return allure;
}
window.xchangePheromoneAllure = xchangePheromoneAllure;

function isNumber(value) {
	return typeof value === "number" || value instanceof Number;
}
window.isNumber = isNumber;

function pillTimerPaused() {
	const pregnancy = xchangePregnancyBlocksPill();
	const earSlimeHasGrown = V.earSlime.growth > 50;
	return V.xchange.pillPermanence !== 1 && (pregnancy || earSlimeHasGrown);
}
window.pillTimerPaused = pillTimerPaused;

/* A held masturbation action can outlive the body part it targets when a pill applies or wears off
 * mid-scene, which is why a penis could be kept until the hand let go of it. Reports actions whose
 * target genital is no longer there so <<xchangeMasturbationDesyncCheck>> can drop them. */
setup.xchangeStaleMasturbationAction = function (action) {
	if (typeof action !== "string") return false;
	// The "mpenisflower..." actions are the moor phallus plant, not the player's own penis, so they survive a body change.
	if (/flower/i.test(action)) return false;
	const noPenis = !(V.player.penisExist || (typeof playerHasStrapon === "function" && playerHasStrapon()));
	const noVagina = !V.player.vaginaExist;
	if (noPenis && /penis|balls/i.test(action)) return true;
	if (noVagina && /vagina/i.test(action)) return true;
	return false;
};

function pillIsPermanent() {
	// A duration of -1 only means "permanent" while the pill is still the body you're in.
	// A cure/reversal clears pill.active, and the leftover -1 must not keep reading as a permanent transformation.
	const pill = V.xchange?.pill;
	if (!pill || !pill.active) return false;
	return pill.duration <= -1;
}
window.pillIsPermanent = pillIsPermanent;

/* Whether the player is currently wearing a borrowed, temporary body */
function playerInTemporaryXChangeBody() {
	if (V.statFreeze) return false;
	if (!playerIsXChanged() || pillIsPermanent()) return false;
	if (typeof setup === "undefined" || typeof setup.xChangeActiveBodyVirginityRole !== "function") return true;
	return setup.xChangeActiveBodyVirginityRole() !== "real";
}
window.playerInTemporaryXChangeBody = playerInTemporaryXChangeBody;

/* Body adjustment: after a body change, physical skills dip until you get used to the new body.
 * How bad and how long depends on how long you lived in the body you just left, so quick NOW pill
 * swaps barely register while months in one body make the other feel foreign.
 * $xchange.bodySince is stamped on every body change even while the setting is off, so turning it
 * on later still knows how long the current body has been worn. Missing means "since the game began". */
setup.xchangeBodyAdjustment = {
	graceDays: 2, // time in the old body that causes no adjustment at all
	fullDays: 60, // time in the old body that gives the full penalty
	maxPenalty: 0.3, // fraction of the skill lost right after the change at full severity
	maxDays: 14, // how long the adjustment lasts at full severity
};

function xchangeBodyChanged() {
	// Leaving a frozen scene restores the old body, so a swap inside one never happened.
	if (V.statFreeze) return;
	// Several hooks can fire for one swap (Choice herm runs genderflip then herm, a clone pill runs both); only the first counts.
	if (V.xchange.bodySince === V.timeStamp) return;
	const cfg = setup.xchangeBodyAdjustment;
	const daysInOldBody = Math.max(0, V.timeStamp - (V.xchange.bodySince ?? 0)) / 86400;
	V.xchange.bodySince = V.timeStamp;
	delete V.xchange.bodyAdjustment;
	if (!V.xchange.bodyAdjustmentEnabled) return;

	const severity = Math.clamp((daysInOldBody - cfg.graceDays) / (cfg.fullDays - cfg.graceDays), 0, 1);
	if (severity <= 0) return;
	const hours = Math.round(24 + (cfg.maxDays - 1) * 24 * severity);
	V.xchange.bodyAdjustment = { severity, hours, endsAt: V.timeStamp + hours * 3600 };
	V.effectsmessage = 1;
	V.xchangeBodyAdjustmentMessage = severity >= 0.5 ? "strong" : "mild";
}
window.xchangeBodyChanged = xchangeBodyChanged;

/** @returns {number} Fraction (0 to maxPenalty) taken off physical skills right now. Fades linearly to 0. */
function xchangeBodyAdjustmentPenalty() {
	const adjustment = V.xchange?.bodyAdjustment;
	if (!adjustment || !V.xchange.bodyAdjustmentEnabled || V.statFreeze || V.hc) return 0;
	const remaining = (adjustment.endsAt - V.timeStamp) / (adjustment.hours * 3600);
	if (!(remaining > 0)) return 0;
	return setup.xchangeBodyAdjustment.maxPenalty * adjustment.severity * Math.min(remaining, 1);
}
window.xchangeBodyAdjustmentPenalty = xchangeBodyAdjustmentPenalty;

/* Hyper Fertility is an X-Change pill effect, not a separate medicine timer.
 * While $xchange.pill.hyperFertilityEffect is true, PC-carried pregnancies advance faster and PC-caused conceptions can roll twins/triplets/quads.
 */
setup.xchangeHyperFertility = Object.assign(
	{
		speedMultiplier: 6,
		twinChance: 80,
		tripletChance: 50,
		quadChance: 30,
		accelerateParasites: true,
	},
	setup.xchangeHyperFertility || {}
);

function xchangeHyperFertilityActive() {
	return !!(V.xchange?.pill?.active && V.xchange.pill.hyperFertilityEffect);
}
window.xchangeHyperFertilityActive = xchangeHyperFertilityActive;

// xchangeHyperFertilityActive() is whether the effect is on the pill (still true during a flashback / hopeless cycle).
// This gate decides whether the effect should *apply right now*: never during statFreeze or hopeless cycle, so those sequences can't trigger conception/acceleration.
// The instant-conception roll fires at insemination and would otherwise bypass the time system that statFreeze halts.
// Off if EITHER state is set.
function fertilityTreatmentActive() {
	return xchangeHyperFertilityActive() && !V.statFreeze && !V.hc;
}
window.fertilityTreatmentActive = fertilityTreatmentActive;

// "Always fertile" setting: while X-Changed with a womb/vagina, treat the player as fertile regardless of cycle timing or the pill's own effects.
// Only affects the pilled body; the natural body is untouched. Off during statFreeze / hopeless cycle like the other fertility gates.
function xchangeAlwaysFertileActive() {
	return !!(V.xchange?.alwaysFertile && playerIsXChanged() && V.player?.vaginaExist && !V.statFreeze && !V.hc);
}
window.xchangeAlwaysFertileActive = xchangeAlwaysFertileActive;

// "Fake breeder (infertile)" setting: a breeder pill grants its behavioural effect but no fertility, so it can never cause pregnancy.
// Hyper Fertility on the same pill, or the Always-fertile override, both win over this and keep the player fertile.
function xchangeFakeBreederInfertile() {
	return !!(
		!V.statFreeze &&
		V.xchange?.breederInfertile &&
		playerIsXChanged() &&
		V.xchange.pill?.breederEffect &&
		!V.xchange.pill?.hyperFertilityEffect &&
		!(V.xchange?.alwaysFertile && V.player?.vaginaExist)
	);
}
window.xchangeFakeBreederInfertile = xchangeFakeBreederInfertile;

// "Fertility strength" setting: player multiplier (%) scaling how potent the Fertility / Hyper Fertility course is at causing conception.
// Higher strength lowers the pregnancy "penalty" cap (conception is more reliable). 100% reproduces the default behaviour.
function xchangeFertilityPenaltyCap(baseCap = 2) {
	const raw = Number(V.xchange?.fertilityStrengthPercent);
	const strength = Number.isFinite(raw) && raw > 0 ? raw : 100;
	return Math.max(1, Math.round((baseCap * 100) / strength));
}
window.xchangeFertilityPenaltyCap = xchangeFertilityPenaltyCap;

function fertilityTreatmentApplyMultiples(baseCount, max = 4) {
	if (!fertilityTreatmentActive()) return baseCount;
	const cfg = setup.xchangeHyperFertility;
	let count = baseCount;

	if (count >= 1 && count < 2 && random(1, 100) <= cfg.twinChance) count = 2;
	if (count >= 2 && count < 3 && random(1, 100) <= cfg.tripletChance) count = 3;
	if (count >= 3 && count < 4 && random(1, 100) <= cfg.quadChance) count = 4;

	return Math.min(count, max);
}
window.fertilityTreatmentApplyMultiples = fertilityTreatmentApplyMultiples;

/* Since Vanilla 0.5.12, pregnancy progress is based on $pregnancies.conceivedDate.
 * Acceleration works by moving conceivedDate backward; parasites still use $sexStats.
 */
function fertilityTreatmentDailyTick(days = 1) {
	if (!fertilityTreatmentActive()) return;
	const cfg = setup.xchangeHyperFertility;
	const extraFactor = Math.max(0, cfg.speedMultiplier - 1);
	if (extraFactor <= 0 || days <= 0) return;
	const extraSeconds = extraFactor * days * TimeConstants.secondsPerDay;

	(typeof getActivePregnancies === "function" ? getActivePregnancies("pc") : []).forEach(preg => {
		if (!Number.isFinite(preg?.conceivedDate)) return;
		// Once the waters break the birth runs on its own clock, so leave a labouring record alone
		if (preg.waterBreaking) return;
		// Skip malformed spans to avoid writing NaN to conceivedDate
		let span;
		try {
			span = getDueDate(preg) - preg.conceivedDate;
		} catch (e) {
			return;
		}
		if (!Number.isFinite(span) || span <= 0) return;
		// Never advance a pregnancy past its due date; overdue pregnancies must remain unchanged.
		const earliest = Time.date.timeStamp - span;
		preg.conceivedDate = Math.min(preg.conceivedDate, Math.max(preg.conceivedDate - extraSeconds, earliest));
	});

	if (!cfg.accelerateParasites) return;
	const stats = V.sexStats;
	if (!stats) return;
	["vagina", "anus"].forEach(genital => {
		const preg = stats[genital]?.pregnancy;
		if (preg?.type !== "parasite" || !Array.isArray(preg.fetus)) return;
		preg.fetus.forEach(fetus => {
			if (typeof fetus?.daysLeft === "number") fetus.daysLeft = Math.max(0, fetus.daysLeft - extraFactor * days);
		});
	});
}
window.fertilityTreatmentDailyTick = fertilityTreatmentDailyTick;

function wondersAboutPillEnd() {
	return V.xchange.pill.shouldHaveEnded === true && V.xchange.pill.countdown < 24;
}
window.wondersAboutPillEnd = wondersAboutPillEnd;

/** Vanilla 0.5.12 moved recorded loads off $sexStats onto $cumLoads. */
function playerIsCreampied() {
	return V.cumLoads.vagina.some(loadIsLive) || V.player.bodyliquid.vagina.semen > 0 || V.player.bodyliquid.vagina.nectar > 0;
}
window.playerIsCreampied = playerIsCreampied;

function playerIsAnalCreampied() {
	return V.cumLoads.anus.some(loadIsLive) || V.player.bodyliquid.anus.semen > 0 || V.player.bodyliquid.anus.nectar > 0;
}
window.playerIsAnalCreampied = playerIsAnalCreampied;

function playerIsBreederCreampied() {
	const pill = V.xchange?.pill;
	// Which hole has to be filled follows which hole the pill is aiming at, so an Omega turned toward
	// the womb is satisfied by a vaginal creampie rather than waiting on an anal one that never comes.
	const omegaAnal = omegaTargetsAnus();
	if (pill?.breederEffect && omegaAnal) return playerIsCreampied() || playerIsAnalCreampied();
	return omegaAnal ? playerIsAnalCreampied() : playerIsCreampied();
}
window.playerIsBreederCreampied = playerIsBreederCreampied;

// Whether the breeder/omega "you can't climax unless there's cum inside you" restriction is currently in force.
// Breeder and Omega each have their own "allow orgasm" setting (breederFreeOrgasm / omegaFreeOrgasm) that lifts only that effect's block.
function breederOrgasmDenied() {
	if (V.statFreeze || V.hc || !playerIsXChanged()) return false;
	const pill = V.xchange?.pill;
	const breederBlocks = pill?.breederEffect && !V.xchange.breederFreeOrgasm;
	const omegaBlocks = pill?.omegaEffect && !V.xchange.omegaFreeOrgasm;
	return !!((breederBlocks || omegaBlocks) && !playerIsBreederCreampied());
}
window.breederOrgasmDenied = breederOrgasmDenied;

/* Anti X-Change therapy: while a purchased "clean" period is running the player cannot be involuntarily spiked.
	It does NOT remove effects already active, only blocks new ones. */
function xchangeTherapyActive() {
	const t = V.xchange?.therapy;
	return !!(t && t.active && t.countdown > 0);
}
window.xchangeTherapyActive = xchangeTherapyActive;

/* A feat-boost trait uses the same neutralisation as Harper's treatment, but is permanent.
	Keep it separate from therapy so it never expires and does not block pill-related story events. */
function xchangePillPurityActive() {
	return V.xchange?.pillPurityTrait === true;
}
window.xchangePillPurityActive = xchangePillPurityActive;

/* X-Change Gray Agent (feat boost): forced pills act like gray pills.
The pill's other effects still apply, but it cannot change the player's gender or body type.
Pills the player takes willingly are unaffected. */
function xchangeGrayAgentActive() {
	return V.xchange?.grayAgentTrait === true;
}
window.xchangeGrayAgentActive = xchangeGrayAgentActive;

/* Use a depth counter instead of a save variable, since the dose is handled in one render and won't persist across save/load. */
let xchangeVoluntaryDoseDepth = 0;
function xchangeVoluntaryDoseBegin() {
	xchangeVoluntaryDoseDepth++;
}
window.xchangeVoluntaryDoseBegin = xchangeVoluntaryDoseBegin;

function xchangeVoluntaryDoseEnd() {
	xchangeVoluntaryDoseDepth = Math.max(0, xchangeVoluntaryDoseDepth - 1);
}
window.xchangeVoluntaryDoseEnd = xchangeVoluntaryDoseEnd;

function xchangeDoseIsVoluntary() {
	return xchangeVoluntaryDoseDepth > 0;
}

/* Body shape before this pill dose, so scenes can check if it actually changed anything.
	Don't use $xchange.pill.genderflipEffect, as it may still be set from an earlier pill. */
let xchangeSpikeBodyBefore = null;
function xchangeSpikeBodyMark() {
	xchangeSpikeBodyBefore = {
		sex: V.player?.sex,
		penis: !!V.player?.penisExist,
		vagina: !!V.player?.vaginaExist,
	};
}
window.xchangeSpikeBodyMark = xchangeSpikeBodyMark;

/* Whether the latest dose actually changed the player's body.
   Gray Agent prevents the body change, so spike scenes check this before describing a transformation.
   Checked live so forced gender changes after the spike still work correctly. */
function xchangeSpikeChangedBody() {
	const before = xchangeSpikeBodyBefore;
	/* No dose was marked this passage, so fall back to whether a body-changing effect is running at all. */
	if (!before) return !!(V.xchange?.pill?.genderflipEffect || V.xchange?.pill?.hermEffect);
	return V.player?.sex !== before.sex || !!V.player?.penisExist !== before.penis || !!V.player?.vaginaExist !== before.vagina;
}
window.xchangeSpikeChangedBody = xchangeSpikeChangedBody;

/* Safety net: reset both per-dose values so they don't carry over to the next dose. */
$(document).on(":passageinit", () => {
	xchangeVoluntaryDoseDepth = 0;
	xchangeSpikeBodyBefore = null;
});

/* True when the Gray Agent trait should swallow this effect. Only the two body-swapping effects are blocked. */
function xchangeGrayAgentBlocks(effect) {
	if (effect !== "genderflip" && effect !== "herm") return false;
	if (!xchangeGrayAgentActive()) return false;
	return !xchangeDoseIsVoluntary();
}
window.xchangeGrayAgentBlocks = xchangeGrayAgentBlocks;

function xchangePillProtectionActive() {
	return xchangeTherapyActive() || xchangePillPurityActive();
}
window.xchangePillProtectionActive = xchangePillProtectionActive;

function playerMayBeSpiked() {
	if (V.statFreeze) return false;
	if (xchangeTherapyActive()) return false;
	/* Use the same checks as the drawer. Pregnancy blocks forced pills, even during an active transformation. */
	return V.xchange.nonconEnabled === 1 && !xchangePregnancyBlocksPill();
}
window.playerMayBeSpiked = playerMayBeSpiked;

function updateRemoverPillCatalogue() {
	V.xchange ??= {};
	const antiTypes = [];

	for (const pill of setup.pills ?? []) {
		if (!pill || pill.type !== "xchange" || pill.subtype !== "anti-pill") continue;
		if (typeof pill.name !== "string") continue;
		const match = pill.name.match(/^SWP Anti-(.+) Pill$/);
		if (!match) continue;
		const type = match[1];
		antiTypes.push(type);
	}

	const filtered = antiTypes.filter(type => {
		if (type === "portal" && !V.portalPantiesEnabled) return false;
		// No point stocking the counter-agent for an effect the player has switched off, unless they're carrying it right now.
		if (type === "feartoxin" && !V.xchange?.spikepool?.feartoxin && !V.xchange?.pill?.feartoxinEffect) return false;
		return true;
	});
	const uniqueTypes = [...new Set(filtered)];
	const shownTypes = 2;
	const stockPerType = 1;

	// Yesterday's picks are held back so the dealer's shelf actually changes from one day to the next.
	// If holding them back would leave too few types to fill the shelf, they're allowed back in.
	const previous = Array.isArray(V.xchange.removerPillCataloguePrevious) ? V.xchange.removerPillCataloguePrevious : [];
	const fresh = uniqueTypes.filter(type => !previous.includes(type));
	const pool = fresh.length >= Math.min(shownTypes, uniqueTypes.length) ? fresh : [...uniqueTypes];

	V.xchange.removerPillCatalogue = [];

	const picks = Math.min(shownTypes, pool.length);
	// Anti-pills already in the medicine cabinet get one tenth the selection weight.
	let weightedPool = pool.flatMap(type => Array(V.sexStats?.pills?.pills?.[`SWP Anti-${type} Pill`]?.owned > 0 ? 1 : 10).fill(type));

	for (let i = 0; i < picks; i++) {
		const type = weightedPool.pluck();
		weightedPool = weightedPool.filter(candidate => candidate !== type); // Keep the two offers distinct, regardless of their weights.
		for (let j = 0; j < stockPerType; j++) {
			V.xchange.removerPillCatalogue.push(type);
		}
	}

	V.xchange.removerPillCataloguePrevious = [...new Set(V.xchange.removerPillCatalogue)];
}
window.updateRemoverPillCatalogue = updateRemoverPillCatalogue;

function xchangeXtendGrowth(target, spermOwner, spermType) {
	if (V.statFreeze) return;
	if (target !== "pc" || spermType !== "human") return;

	const pill = V.xchange?.pill;
	if (!pill?.active || !pill.xtendEffect) return;
	if (!pill.originalBody || typeof pill.originalBody.penissize !== "number") return;
	/* Self-heal a missing/corrupt tracker so an active X-Tend can still record growth rather than silently doing nothing. */
	if (!pill.xtendTracker || typeof pill.xtendTracker.penisSizeGains !== "number") {
		pill.xtendTracker = { orgasmed: 0, penisSizeGains: 0 };
	}
	if (!spermOwner || typeof spermOwner.penissize !== "number") return;

	if (pill.originalBody.penissize - 2 + Math.floor(pill.xtendTracker.penisSizeGains / 1000) < spermOwner.penissize) {
		pill.xtendTracker.penisSizeGains += 250 + Math.random() * 250;
		V.xtendMessage = 1;
	} else {
		V.xtendMessage = 6;
	}
	V.effectsmessage = 1;
}
window.xchangeXtendGrowth = xchangeXtendGrowth;

function xchangeTimePassedCheck(minutes = 1) {
	if (V.statFreeze) return;

	if (V.arousal >= (V.arousalmax * 2) / 5)
		wikifier("willpower-spending", minutes * 0.5 * Math.ceil((V.arousal - (V.arousalmax * 2) / 5) / (V.arousalmax / 10)));
	else if (V.xchange.willpowerPoints < V.willpower * 0.5)
		wikifier("willpower-recovery", minutes * 0.5 * Math.ceil(((V.arousalmax * 2) / 5 - V.arousal) / (V.arousalmax / 10)));

	if (V.drugged > 200 && V.arousal < (V.arousalmax * 4) / 5) wikifier("arousal", (V.drugged / 10) * 3 * minutes);
	else if (V.drugged > 100 && V.arousal < (V.arousalmax * 3) / 5) wikifier("arousal", (V.drugged / 10) * 2 * minutes);
	else if (V.drugged > 0 && V.arousal < (V.arousalmax * 2) / 5) wikifier("arousal", (V.drugged / 10) * minutes);

	wikifier("blackmail-timepassed");

	// Portal Panties
	wikifier("portalPantiesPass", minutes);

	// Pub: pubtimer is valid only if it's >= 1; otherwise it should not exist.
	if (V.xchange) {
		const n = Number(V.xchange.pubtimer);

		// If it's missing, do nothing (inactive).
		if (V.xchange.pubtimer === undefined) {
			// no-op
		}
		// If it exists but isn't a valid number, delete it.
		else if (!Number.isFinite(n)) {
			delete V.xchange.pubtimer;
		}
		// Otherwise tick it down by minutes; delete when it expires.
		else {
			const next = n - minutes;
			if (next < 1) delete V.xchange.pubtimer;
			else V.xchange.pubtimer = next;
		}
	}

	// Sensitivity creams: escalating stress from repeated daily suppressant use, plus the tampered-batch arousal dump on expiry.
	const medication = V.sensitivityMedication;
	if (medication) {
		const active = Number.isFinite(medication.endsAt) && medication.endsAt > V.timeStamp;
		if (active) {
			if (medication.type === "suppressant") {
				// From the second consecutive daily dose onward, the forced numbness wears on the mind. 0.8 raw stress/min per extra dose (tunable).
				const streakCount = sensitivitySuppressantStreakCount();
				if (streakCount >= 2) {
					statChange.stress((streakCount - 1) * 0.8 * minutes, 1);
				}
			}
		} else {
			// The cream has worn off. A tampered batch releases everything it hoarded, all at once.
			if (medication.type === "suppressant" && medication.tampered && Number.isFinite(medication.stockpile) && medication.stockpile > 0) {
				V.arousal = Math.clamp(V.arousal + medication.stockpile, 0, V.arousalmax);
				// 2 = the flood overflowed past the edge and forces a release; 1 = a hard, unwanted spike short of it.
				V.sensitivityFloodMessage = V.arousal >= (V.arousalmax * 4) / 5 ? 2 : 1;
				V.effectsmessage = 1;
			}
			// Clear the worn-off record whatever it was, so an expired stimulant doesn't sit in the save forever.
			delete V.sensitivityMedication;
		}
	}
}
window.xchangeTimePassedCheck = xchangeTimePassedCheck;

function xchangeWeeklyCheck(weeks = 1) {
	if (!V.statFreeze) {
		if (V.xchange.pubGamblingEnabled && !V.weekly.gamblingUpkeepPaid) {
			V.xchange.gamblingUpkeepFailed = 1;
			V.xchange.pubGamblingEnabled = 0;

			if (V.location !== "prison") {
				wikifier("crimeUp", 3000, "obstruction");
				wikifier("crimeUpFlat", V.xchange.gamblingEarnings, "thievery");

				V.gamblingUpkeepFailedMessage = 1;
				V.effectsmessage = 1;
			}
		}
	}

	// 1 - 0b001: Suspicious Pills Dealer
	// 2 - 0b010: Portal Pill Dealer
	// 4 - 0b100: Effect Remover Pill Dealer
	const dealerOdds = [1, 2, 4];
	V.xchange.weeklyShadyDealer = dealerOdds.pluck() | dealerOdds.pluck();
}
window.xchangeWeeklyCheck = xchangeWeeklyCheck;

function xchangeDailyCheck(days = 1) {
	if (!V.statFreeze) {
		const useIdentityMeterDrift = !!V.xchange?.genderIdentityEnabled;
		if (!useIdentityMeterDrift) {
			if ((V.hourlyFemininity > 0 && V.player.gender === "f") || (V.hourlyFemininity < 0 && V.player.gender === "m")) wikifier("genderidentity", 1 * days);
			else if ((V.hourlyFemininity > 0 && V.player.gender === "m") || (V.hourlyFemininity < 0 && V.player.gender === "f"))
				wikifier("genderidentity", -1 * days);

			if (playerIsXChanged()) wikifier("genderidentity", -2 * days);

			V.effectsmessage = 1;
			V.genderIdentityMessage = V.hourlyFemininity > 0 ? "f" : V.hourlyFemininity < 0 ? "m" : 0;
		}
		V.hourlyFemininity = 0;

		wikifier("blackmail-daypassed", days);

		// Underground Colosseum: heal injuries and reduce heat over time.
		try {
			const col = V.xchange?.colosseum;
			if (col) {
				if (col.injuryDays > 0) {
					col.injuryDays = Math.max(0, col.injuryDays - days);
					if (col.injuryDays === 0) col.injury = 0;
					else if (col.injuryDays <= 1 && col.injury > 1) col.injury -= 1;
				}
				if (col.joined && Time.days - (col.storyDay || 0) > 7) {
					col.heat = Math.max(0, col.heat - days);
				}
			}
		} catch (e) {
			/* defensive: never let the colosseum break the daily tick */
		}

		V.recentmolest = Math.max(V.recentmolest - 1 * days, 0);
		V.recentrape = Math.max(V.recentrape - 1 * days, 0);

		if (V.robinbreakupCooldown > 0) {
			V.robinbreakupCooldown = Math.max(V.robinbreakupCooldown - 1 * days, 0);
		}
		if (V.robinconfessionCooldown > 0) {
			V.robinconfessionCooldown = Math.max(V.robinconfessionCooldown - 1 * days, 0);
		}

		V.xchange.blackmailHalt = Math.max(0, V.xchange.blackmailHalt - 1 * days);

		wikifier("dailyIdentityEffects");

		const isTrans = !!(V.background && V.background.transgender);

		try {
			const refl = V.xchange?.permaReflection;
			const today = typeof Time !== "undefined" && Time && typeof Time.days === "number" ? Time.days : 0;
			if (isTrans && refl && refl.pending && !refl.answer && pillIsPermanent() && today > (refl.lastShownDay ?? -1)) {
				V.xchangePermaReflectionMessage = 1;
				V.effectsmessage = 1;
			}
		} catch (e) {
			/* defensive: never let scheduling break the daily tick */
		}

		try {
			const refl2 = V.xchange?.permaReflection;
			if (isTrans && refl2 && refl2.answer && pillIsPermanent()) {
				if (refl2.answer === "no") {
					wikifier("stress", 5 * days);
					wikifier("trauma", 5 * days);
				} else if (refl2.answer === "yes") {
					wikifier("stress", -5 * days);
				}
			}
		} catch (e) {
			/* defensive */
		}
	}

	// Effect Remover Pill Dealer now restocks daily instead of weekly, but availability stays in weekly check.
	if (V.xchange?.weeklyShadyDealer & 4) {
		updateRemoverPillCatalogue();
	}

	// Hyper Fertility: accelerate PC-carried pregnancies while the X-Change effect is active.
	if (typeof fertilityTreatmentDailyTick === "function") fertilityTreatmentDailyTick(days);
}
window.xchangeDailyCheck = xchangeDailyCheck;

function xchangeHourlyCheck(hours = 1) {
	if (!V.statFreeze) {
		const pill = V.xchange.pill;
		if (pill?.active) {
			// Tick the pill's duration down if the pill isn't permanent
			if (!pillIsPermanent()) pill.duration = Math.max(pill.duration - 1 * hours, 0);

			// Clamp the pill duration to only ever save up to 30 days (in particular for Continue pills)
			if (pill.continueEffect) pill.duration = Math.min(pill.duration, 30 * 24);

			// If the pill has the continue effect, and a remaining duration of 30 days is accumulated
			// then, the change becomes permanent
			if (V.xchange.pillPermanence === 1 && !pillIsPermanent() && pill.continueEffect && pill.duration >= 30 * 24) wikifier("xchange-setpermanent", "continue");

			// If pregnancy or a pregnancy-enabling parasite locks the body, the change becomes permanent.
			const pregnancy = xchangePregnancyBlocksPill();
			if (V.xchange.pillPermanence === 1 && !pillIsPermanent() && (pregnancy || V.earSlime.growth > 50))
				wikifier("xchange-setpermanent", V.earSlime.growth > 50 && !pregnancy ? "parasite" : "pregnancy");

			if (pill.innocenceEffect && (V.innocencestate !== 1 || V.awareness >= 0)) {
				if (pill.innocenceWasNatural === true) {
					if (V.awareness >= 0 && V.innocencestate === 1) {
						V.innocencestate = 0;
						V.trauma = V.innocencetrauma;
						V.innocencetrauma = 0;
						V.innocencemessage = "end";
					}
					V.innocenceawareness = 0;
				} else if (V.awareness >= 0 && V.innocencestate === 1) {
					V.innocencestate = 0;
					V.awareness = typeof V.innocenceawareness === "number" ? V.innocenceawareness : 0;
					V.trauma = V.innocencetrauma;
					V.innocencetrauma = 0;
					V.innocenceawareness = 0;
					V.innocencemessage = "end";
				}
				pill.innocenceEffect = false;
				pill.innocenceWasNatural = false;
			}

			// Check if the pill should expire
			if (pill.duration === 0) {
				pill.shouldHaveEnded = true;

				if (!pillIsPermanent() && !pillTimerPaused() && pill.resistanceEffect && random(0, 100) > pill.resistanceChance) {
					if (V.xchange.pillPermanence === 1) wikifier("xchange-setpermanent", "resistance");
					else {
						pill.duration += Math.max(1, V.xchange.resistanceDaysPenalty) * 24;
						pill.resistanceEffect = false;
						pill.fertile = true;
						pill.resistanceFakeout = true;
					}
				} else if (!pillIsPermanent() && !pillTimerPaused()) {
					if (V.xchange.pill.clone === "none") {
						wikifier("xchange-restore");
					} else {
						wikifier("xchange-restore", "nosave");
					}
				}
			}

			// Force the pill to expire if pill permanence is disabled, and no condition is preventing it from expiring
			else if (V.xchange.pillPermanence !== 1 && pillIsPermanent() && !V.xchange.pill.choiceEffect) {
				pill.duration = 0;
				if (!pillTimerPaused()) {
					if (V.xchange.pill.clone === "none") {
						wikifier("xchange-restore");
					} else {
						wikifier("xchange-restore", "nosave");
					}
				}
			}

			// Progress the fakeout timer for as long as the "should have ended" flag stands, else reset it.
			if (pill.shouldHaveEnded) pill.countdown += 1 * hours;
			else pill.countdown = 0;

			// Reveal that you didn't turn back
			if (pill.shouldHaveEnded && !wondersAboutPillEnd()) {
				if (!V.daily.xchangePermanenceMessage) {
					V.xchangePermanenceMessage = 1;
					V.daily.xchangePermanenceMessage = true;
				}
				delete pill.shouldHaveEnded;
			}

			// Drop the resistance facade when the uncertain period has expired
			if (pill.resistanceFakeout === true && !wondersAboutPillEnd()) {
				delete pill.resistanceFakeout;
				delete pill.shouldHaveEnded;
			}
		}

		// Tick hypersensitivity side-effect timer
		if (V.xchange?.antiPillSensitivity && typeof V.xchange.antiPillSensitivity.hours === "number") {
			V.xchange.antiPillSensitivity.hours = Math.max(V.xchange.antiPillSensitivity.hours - 1 * hours, 0);
			if (V.xchange.antiPillSensitivity.hours === 0) {
				const endSource = V.xchange.antiPillSensitivity.source || "generic";
				delete V.xchange.antiPillSensitivity;
				V.effectsmessage = 1;
				V.antiPillSensitivityEndMessage = endSource;
			}
		}

		// Body adjustment has run its course
		if (V.xchange.bodyAdjustment && V.timeStamp >= V.xchange.bodyAdjustment.endsAt) {
			delete V.xchange.bodyAdjustment;
			if (V.xchange.bodyAdjustmentEnabled) {
				V.effectsmessage = 1;
				V.xchangeBodyAdjustmentMessage = "end";
			}
		}

		// Tick the Anti X-Change therapy "clean" period (independent of the pill timer).
		if (V.xchange?.therapy?.active && typeof V.xchange.therapy.countdown === "number") {
			V.xchange.therapy.countdown = Math.max(V.xchange.therapy.countdown - 1 * hours, 0);
			if (V.xchange.therapy.countdown === 0) {
				V.xchange.therapy.active = false;
				V.xchange.therapy.duration = 0;
				V.effectsmessage = 1;
				V.xchange_therapy_expired_message = 1;
			}
		}

		// Apply hour-random passion effect
		for (let i = 0; i < hours; i++) {
			if (pill?.passionEffect && ((V.substanceRebalance === 1 && random(0, 10) === 0) || random(0, 8) === 0)) {
				wikifier("drugs", V.substanceRebalance === 1 ? 120 : 200);
				V.effectsmessage = 1;
				V.xchange_passion_message = 1;
			}
		}

		// Fear Toxin keeps trauma pinned at max and control at zero for as long as the pill lasts.
		if (pill?.feartoxinEffect) wikifier("xchange-feartoxin-pin");

		// Tick portal effect timer, and end the effect if timer lapses
		if (pill?.portalEffect && pill?.portalEffectTimer >= 0) {
			pill.portalEffectTimer = Math.max(pill.portalEffectTimer - 1 * hours, 0);
			if (pill.portalEffectTimer === 0) {
				pill.portalEffect = false;
			}
		}
		wikifier("hourlyIdentityEffects");
	}
	npcXChangeHourlyCheck(hours);
}
window.xchangeHourlyCheck = xchangeHourlyCheck;

function xchangeEffectsMessages() {
	const fragment = document.createDocumentFragment();
	const element = (element, text, colour) => {
		const result = document.createElement(element);
		if (colour) result.classList.add(colour);
		result.textContent = text + " ";
		fragment.append(result);
	};
	const br = () => fragment.append(document.createElement("br"));

	if (V.hermSaveWarningMessage) {
		element("span", "WARNING:", "yellow");
		element(
			"span",
			"You've just loaded a save file featuring a character of unsupported sex or gender (quite likely a Vanilla herm). You've been forcefully turned into the available one to attempt to keep the mod's systems working, but proceeding from here onward is entirely ill-adviced and if you run into odd behaviour, that is expected.",
			"red"
		);
		br();
		br();
		delete V.hermSaveWarningMessage;
	}

	/* Set by colosseumDrugTick when an arena dose wears off. */
	if (V.colosseumDrugCrashMessage) {
		delete V.colosseumDrugCrashMessage;
		element("span", "The arena dose lets go of you all at once.", "red");
		element("span", "Every hit it held off arrives at the same time, and none of it feels like it happened to you.", "red");
		br();
		br();
	}

	if (V.identityWarningMessage) {
		if (V.identity.init < 2 && !(V.background && V.background.transgender)) {
			element("span", "WARNING:", "yellow");
			element(
				"span",
				"You haven't locked in your identity preferences yet. Please, head to your room and into Gameplay Settings > Modded Settings > Identity Settings, and check the box at the bottom that says 'Lock Choices'. Make sure to review your character's identity preferences before saving your settings.",
				"red"
			);
			br();
			br();
		}
		delete V.identityWarningMessage;
	}

	if (V.genderIdentityMessage) {
		fragment.append(wikifier("genderidentity-text", V.genderIdentityMessage));
		delete V.genderIdentityMessage;
	}

	if (V.gamblingUpkeepFailedMessage) {
		element("span", "The cops didn't receive their bribe this week. Your gambling ring has been raided.", "purple");
		fragment.append(wikifier("gggcrime", "thievery"));
		br();
		delete V.gamblingUpkeepFailedMessage;
	}

	if (V.xchangeSpikedMessage) {
		delete V.xchangeSpikedMessage;
		// Revalidate at render:
		// the notice is queued when the pill is applied, and a scene may have cured, blocked or reverted it before this ever reaches the screen.
		if (V.xchange && V.xchange.pill && V.xchange.pill.active && V.xchange.pill.effectsKnown === false) {
			element(
				"span",
				"You've been dosed with an unidentified X-Change pill. There's no telling what it's done to you until you take an X-Change test.",
				"pink"
			);
			br();
		}
	}

	if (V.xchange_passion_message) {
		element("span", `Aphrodisiacs have been released into your bloodstream.`, "pink");
		br();
		delete V.xchange_passion_message;
	}

	if (V.xchange_feartoxin_message) {
		if (V.xchange_feartoxin_message === "start") {
			element(
				"span",
				`Your heart pounds and your hands shake. Everything around you feels like a threat, and you can't hold yourself together. Nothing will calm you down while the drug is in you.`,
				"red"
			);
		} else {
			element(
				"span",
				`The drugged fear has faded. Your thoughts are your own again, and your trauma can start to settle, but what the drug did to you is still there.`,
				"blue"
			);
		}
		br();
		delete V.xchange_feartoxin_message;
	}

	if (V.xchange_therapy_expired_message) {
		element("span", `Your X-Change cleansing treatment has worn off. You're no longer protected against being pilled.`, "blue");
		br();
		delete V.xchange_therapy_expired_message;
	}

	if (V.xchangeFameMessage) {
		element("span", "People have been gossiping about your X-Change escapades, and even the law has fully caught on.");
		br();
		element("span", "You no longer benefit from having two identities.", "red");
		delete V.xchangeFameMessage;
	}

	if (V.antiPillSensitivityMessage) {
		switch (V.antiPillSensitivityMessage) {
			case "suspicious":
				element("span", "The suspicious pill goes wrong; it leaves your skin itchy to the point of pain and oversensitive.", "pink");
				br();
				break;
			case "antipill":
				element("span", "The anti-pill reacts badly; your skin turns itchy to the point of pain and oversensitive.", "pink");
				br();
				break;
			case "dumbbitch":
				element("span", "The pill does more than dull your wits; it leaves your skin itchy to the point of pain and oversensitive.", "pink");
				br();
				break;
			case "suspicious-insanity":
				element("span", "The suspicious pill triggers a torturous itch, swallowed by your psychopathy.", "pink");
				br();
				break;
			case "antipill-insanity":
				element("span", "The anti-pill burns your skin, but your shattered perception numbs the itch.", "pink");
				br();
				break;
			case "dumbbitch-insanity":
				element("span", "The pill dulls your wits and sparks a painful itch, drowned out by absolute darkness.", "pink");
				br();
				break;
			case "generic-insanity":
				element("span", "The pill goes wrong, leaving a burning itch ignored by the weight of your insanity.", "pink");
				br();
				break;
			default:
				element("span", "The pill goes wrong; it leaves your skin itchy to the point of pain and oversensitive.", "pink");
				br();
		}
		delete V.antiPillSensitivityMessage;
	}

	if (V.antiPillSensitivityEndMessage) {
		switch (V.antiPillSensitivityEndMessage) {
			case "suspicious":
				element("span", "The suspicious pill's itchy, painful hypersensitivity finally fades.", "blue");
				br();
				break;
			case "antipill":
				element("span", "The anti-pill's itchy, painful hypersensitivity finally fades.", "blue");
				br();
				break;
			case "dumbbitch":
				element("span", "The pill's itchy, painful hypersensitivity finally fades.", "blue");
				br();
				break;
			default:
				element("span", "The botched pill's itchy, painful hypersensitivity finally fades.", "blue");
				br();
		}
		delete V.antiPillSensitivityEndMessage;
	}

	if (V.xchangeBodyAdjustmentMessage) {
		switch (V.xchangeBodyAdjustmentMessage) {
			case "strong":
				element(
					"span",
					"This body feels wrong after so long in the other one. You keep misjudging your reach, your balance and the length of your stride.",
					"red"
				);
				break;
			case "mild":
				element("span", "Your body feels a little unfamiliar. Your balance and reach are slightly off.", "orange");
				break;
			case "end":
				element("span", "You've gotten used to this body. Your movements feel natural again.", "green");
				break;
		}
		br();
		delete V.xchangeBodyAdjustmentMessage;
	}

	if (!V.statFreeze && V.alcoholToleranceMessage) {
		switch (V.alcoholToleranceMessage) {
			case "developing":
				element("span", "Your body is starting to adapt to being drunk.", "pink");
				br();
				break;
			case "moderate":
				element("span", "Drunkenness has become something your body recognises.", "blue");
				br();
				break;
			case "high":
				element("span", "You've developed a strong tolerance to intoxication.", "green");
				br();
				break;
			case "full":
				element("span", "Your body has fully adapted to being drunk.", "gold");
				br();
				break;
			case "withdrawal":
				element("span", "Your body has grown dependent on alcohol. While sober, withdrawal gradually increases your stress.", "red");
				br();
				break;
			case "fading":
				element("span", "Without getting drunk regularly, your body's adaptation is beginning to fade.", "blue");
				br();
				break;
			case "recovered":
				element("span", "Your body has fully recovered from chronic drunkenness.", "green");
				br();
				break;
		}
		delete V.alcoholToleranceMessage;
	}

	if (!V.statFreeze && V.cigaretteCravingMessage) {
		switch (V.cigaretteCravingMessage) {
			case "craving":
				element("span", "You crave a cigarette.", "pink");
				br();
				break;
			case "quit":
				element("span", "The craving for cigarettes has finally left you.", "green");
				br();
				break;
		}
		delete V.cigaretteCravingMessage;
	}

	if (V.painMedicationWarningMessage) {
		element("span", "You are writhing in pain.", "red");
		element("span", "Painkillers from the hospital pharmacy may help, or you could rest somewhere safe until it passes.", "blue");
		br();
		delete V.painMedicationWarningMessage;
	}

	if (V.xchangePermanenceMessage) {
		const pregnancy = xchangePregnancyBlocksPill();

		if (V.xchange.pillPermanence === 1) {
			element("span", "Seems you didn't turn back. Your pill's effects have become permanent", "red");
			br();
		} else if (pregnancy && typeof pillTimerPaused === "function" && pillTimerPaused()) {
			element("span", "Seems you didn't turn back. The life growing inside you holds the changes in place.", "red");
			br();
		} else {
			element("span", "Seems you didn't turn back...", "red");
			br();
		}
		delete V.xchangePermanenceMessage;
	}

	if (V.xchangePermaReflectionMessage) {
		try {
			const isTrans = !!(V.background && V.background.transgender);
			if (isTrans && pillIsPermanent() && V.xchange?.permaReflection?.pending && !V.xchange.permaReflection.answer) {
				fragment.append(wikifier("perma-reflection-prompt"));
				if (V.xchange.permaReflection) {
					V.xchange.permaReflection.lastShownDay = typeof Time !== "undefined" && Time && typeof Time.days === "number" ? Time.days : 0;
				}
			}
		} catch (e) {
			/* defensive */
		}
		delete V.xchangePermaReflectionMessage;
	}

	try {
		const isTrans = !!(V.background && V.background.transgender);
		if (isTrans && pillIsPermanent() && V.xchange?.permaReflection?.answer) {
			fragment.append(wikifier("perma-reflection-daily-reminder"));
		}
	} catch (e) {
		/* defensive */
	}

	switch (V.xchangeRestoreMessage) {
		case 1:
			element("span", "Your body twists and turns as it returns to its original form.", "blue");
			br();
			delete V.xchangeRestoreMessage;
			break;
		case 2:
			element("span", "Despite having climaxed under the effects of Resistance, the pill did not become permanent.", "blue");
			br();
			delete V.xchangeRestoreMessage;
			break;
		case 3:
			element("span", "The pill's effects should be running out right about now.", "blue");
			br();
			delete V.xchangeRestoreMessage;
			break;
		default:
			break;
	}

	switch (V.genderificationStressMessage) {
		case 1:
			element("span", "You have an urge to dress cute.", "purple");
			fragment.append(wikifier("gggstress"));
			br();
			delete V.genderificationStressMessage;
			break;
		case 2:
			element("span", "You are feeling cute and refreshed with your outfit.", "light-pink");
			fragment.append(wikifier("lstress"));
			fragment.append(wikifier("ltiredness"));
			br();
			delete V.genderificationStressMessage;
			break;
		case 3:
			element("span", "You have an urge to dress more manly.", "purple");
			fragment.append(wikifier("gggstress"));
			br();
			delete V.genderificationStressMessage;
			break;
		case 4:
			element("span", "You are feeling manly and vigourous in your fit.", "blue");
			fragment.append(wikifier("lstress"));
			fragment.append(wikifier("ltiredness"));
			br();
			delete V.genderificationStressMessage;
			break;
		default:
			break;
	}

	if (V.giDriftMessage) {
		element("span", V.giDriftMessage, "purple");
		br();
		delete V.giDriftMessage;
	}

	// Set when $identityCap keeps the identity meter above its minimum. Prevents hidden stress and trauma with no visible explanation.
	if (V.identityCapMessage) {
		element("span", "You try to think of yourself as less of a woman, and fail. That's simply who you are now.", "purple");
		br();
		delete V.identityCapMessage;
	}

	if (V.binderPainMessage) {
		element("span", "Your chest binder feels too tight, making your chest ache.", "red");
		br();
		delete V.binderPainMessage;
	}

	if (V.breastSensitiveRubMessage) {
		// The slot is picked during the time tick, but this prints once the passage has run and a link that passes time then strips
		// (washing, bathing, going to bed) leaves the stored slot empty. Re-check it, and fall back to whatever is being worn now.
		const storedSlot = typeof V.breastSensitiveRubMessage === "string" ? V.breastSensitiveRubMessage : null;
		const rubSlot = storedSlot && !wornSlotIsBare(storedSlot) ? storedSlot : getBreastSensitiveRubSlot();
		if (rubSlot) {
			// The widget prints nothing useful here; it's called for the adjective it leaves in _text_output2 ("sensitive ", "tender ", ...).
			wikifier("breastsensitivity");
			element("span", `Your ${T.text_output2 ?? ""}nipples are rubbing against your ${V.worn[rubSlot].name}.`, "pink");
			br();
		}
		delete V.breastSensitiveRubMessage;
	}

	if (V.genitalSensitiveRubMessage) {
		const storedSlot = typeof V.genitalSensitiveRubMessage === "string" ? V.genitalSensitiveRubMessage : null;
		const currentSlot = getGenitalSensitiveRubSlot();
		const rubSlot = playerChastity() || !currentSlot ? null : storedSlot && !wornSlotIsBare(storedSlot) ? storedSlot : currentSlot;
		if (rubSlot) {
			// <<genitalsensitivity>> leaves its adjective in _text_output, not _text_output2 like <<breastsensitivity>> does.
			wikifier("genitalsensitivity");
			element("span", `Your ${T.text_output ?? ""}${V.player.penisExist ? "penis" : "clit"} is rubbing against your ${V.worn[rubSlot].name}.`, "pink");
			br();
		}
		delete V.genitalSensitiveRubMessage;
	}

	if (V.chastityArousalSpikeMessage) {
		element("span", `Locked away like this, a sudden wave of arousal catches you off guard.`, "pink");
		br();
		delete V.chastityArousalSpikeMessage;
	}

	if (V.chastityPurityCalmMessage) {
		// Queued during the time tick, so the device could be off, unlocked or the state lost by the time this prints. Only say it if it's still true.
		if (playerChastity() && !chastityConsensual() && chastityFrustrationImmune()) {
			element(
				"span",
				V.chastityPurityCalmMessage === "innocence"
					? `You're locked away, but you don't know what you're supposed to be missing.`
					: `You're locked away, but you don't mind. You don't feel any urge to resist.`,
				"teal"
			);
			br();
		} else {
			V.chastityPurityCalmShown = false;
		}
		delete V.chastityPurityCalmMessage;
	}

	if (V.chastityControlLostMessage) {
		const control = V.chastityControlLostMessage === "remote" ? "vibrator remote" : "key to your chastity device";
		element("span", `When you check your belongings, the ${control} is gone. Someone must have taken it while you were unconscious.`, "red");
		br();
		delete V.chastityControlLostMessage;
	}

	if (V.vibratorRemoteGlitchMessage) {
		element("span", `Without the remote, your vibrator changes setting on its own.`, "pink");
		br();
		delete V.vibratorRemoteGlitchMessage;
	}

	// Tampered sensitivity-decreasing cream wearing off: the hoarded arousal crashes back all at once.
	if (V.sensitivityFloodMessage) {
		element("span", "The cream's numbness abruptly lifts,", "pink");
		element("span", "and every sensation it had been quietly holding back floods over you all at once.", "red");
		br();
		if (V.sensitivityFloodMessage === 2) {
			element("span", "It's far too much to hold against! Your body seizes and gives in.", "pink");
			fragment.append(wikifier("orgasm"));
			br();
		}
		delete V.sensitivityFloodMessage;
	}

	if (V.breederEdgingMessage) {
		const omegaAnal = omegaTargetsAnus();
		const breederTarget = omegaAnal && V.xchange?.pill?.breederEffect ? "pussy or ass." : omegaAnal ? "ass." : either("pussy.", "vagina.");
		element("span", "Your body refuses to cum like this.", "purple");
		element("span", "You crave some thick gooey semen in your " + breederTarget, "red");
		if ((V.xchange.breederEdgingStress ?? 0) >= 300) fragment.append(wikifier("ggstress"));
		else fragment.append(wikifier("gstress"));

		br();

		delete V.breederEdgingMessage;
	}

	if (V.sexual_addiction_toy_breakthrough_message) {
		// 2 = the breeder/omega gate forced the orgasm, anything else = the addiction/alpha gate did.
		const fromBreederGate = V.sexual_addiction_toy_breakthrough_message === 2;
		const pill = !V.statFreeze && playerIsXChanged() ? V.xchange?.pill : null;

		// A swarm can reach the same gates a toy does, and it is still on the player as this prints.
		const swarmAmounts = V.swarm?.amount;
		const swarmRelief = !!swarmAmounts && (swarmAmounts.genital?.[1] > 0 || swarmAmounts.butt?.[1] > 0);
		const fromOralGate = V.sexual_addiction_toy_breakthrough_message === 3;
		const pushedYou = fromOralGate
			? "You stay on the edge so long that your body finally gives in."
			: swarmRelief
			? `The ${swarmWord()} ${swarmAmounts.active?.[0] === 1 ? "pushes" : "push"} you over the edge, and your body finally gives in.`
			: "The toy pushes you over the edge, and your body finally gives in.";
		element("span", pushedYou, "purple");
		if (fromOralGate) {
			element("span", "The orgasm washes through you, but it feels hollow. Your mouth still aches to be filled.", "blue");
		} else if (fromBreederGate) {
			const omegaAnal = omegaTargetsAnus();
			const breederTarget = omegaAnal && pill?.breederEffect ? "holes" : omegaAnal ? "ass" : "womb";
			element(
				"span",
				`The forced orgasm washes through you, but it feels hollow; your ${breederTarget} ${
					breederTarget === "holes" ? "still ache" : "still aches"
				} for hot seed.`,
				"blue"
			);
		} else if (pill?.alphaEffect && V.player.penisExist) {
			element("span", "The forced orgasm washes through you, but it feels hollow; your knot aches to lock inside a real partner.", "blue");
		} else {
			element("span", "The orgasm washes through you, but it feels hollow; your body craves the real thing.", "blue");
		}
		fragment.append(wikifier("ggstress"));
		fragment.append(wikifier("stress", 15));
		br();

		delete V.sexual_addiction_toy_breakthrough_message;
	}

	const refusalShown = !!V.sexual_addiction_message;
	if (V.sexual_addiction_message) {
		const alphaEffectActive = !V.statFreeze && !V.hc && playerIsXChanged() && V.xchange?.pill?.alphaEffect && V.player.penisExist;
		// Tracks which craving is unmet: 1 = penis, 2 = hole/alpha, 3 = both.
		// Old saves may still use 1, so the trait check below handles that case.
		const unmet = V.sexual_addiction_message;
		const holeLine =
			alphaEffectActive && (V.statFreeze || V.hole_addict_trait !== 1 || V.xchange.genitalAddictFreeOrgasm)
				? "Your knot aches to lock inside someone, and it demands it now!"
				: "Your dick craves some pussy, and it demands it now!";
		element("span", "Your body refuses to cum like this.", "purple");
		if (unmet === 3) element("span", "You need real sex! Doesn't matter who does the fucking.", "red");
		else if (unmet === 2) element("span", holeLine, "red");
		else if (!V.statFreeze && V.penis_addict_trait === 1) element("span", "You need dick, and you need it deep inside you. Now!", "red");
		else if ((!V.statFreeze && V.hole_addict_trait === 1 && V.player.penisExist) || alphaEffectActive) element("span", holeLine, "red");

		br();

		delete V.sexual_addiction_message;
	}

	if (V.oral_fixation_message) {
		if (oralFixationActive()) {
			if (!refusalShown) element("span", "Your body refuses to cum like this.", "purple");
			element("span", "You need something in your mouth, or a fresh taste of cum on your tongue.", "red");
			br();
		}
		delete V.oral_fixation_message;
	}

	if (V.xtendMessage) {
		switch (V.xtendMessage) {
			case 1:
				element("span", "Your body accepts the new genetic code.", "gold");
				element("span", "Your penis will be larger when you turn back.", "green");
				break;
			case 2:
				element("span", "You just lost all your penis size gains! And your dick will be smaller when you turn back.", "red");
				break;
			case 3:
				element("span", "Your original body's dick just shrank even further.", "red");
				break;
			case 4:
				element("span", V.options.showExactMeasurements ? `Your dick shrank by ${V.xtendMessageValue}cm.` : "Your dick is smaller than it used to be.", "red");
				break;
			case 5:
				element("span", V.options.showExactMeasurements ? `Your dick grew by ${V.xtendMessageValue}cm.` : "Your dick is larger than it used to be.", "green");
				break;
			case 6:
				element("span", "That genetic material was of inferior quality.", "gold");
				element("span", "Your projected penis size remains unchanged.", "blue");
				break;
			default:
				break;
		}
		br();
		delete V.xtendMessage;
		delete V.xtendMessageValue;
	}

	if (V.dumbBitchOrgasmMessage) {
		element("span", "Your orgasm is frying your brain.", "red");
		fragment.append(wikifier("llstress"));
		fragment.append(wikifier("lwillpower"));
		if (V.dumbBitchOrgasmMessage === 1) {
			element("span", "|");
			element("span", "- School Grades", "red");
			br();
		}
		if (V.dumbBitchOrgasmMessage === 2) {
			element(
				"span",
				either("Lockpicking is now like... just so hard or something.", "Everyone seems like... so trustworthy now.", "Malice?... Like... what's that?"),
				"red"
			);
			fragment.append(wikifier("lskulduggery"));
			br();
		} else if (V.dumbBitchOrgasmMessage === 3) {
			element(
				"span",
				either(
					"Everyone's so nice... Like, you should totally fuck more.",
					"Sex is like... so yummy right now. You want it all.",
					"You want to, like... feel g- good-er? Better? Oh just fuck~"
				),
				"lewd"
			);
			element("span", "|");
			element("span", "+ Lewdness", "lewd");
			br();
		}
		br();
		delete V.dumbBitchOrgasmMessage;
	}

	if (V.refractoryPeriodMessage) {
		element("span", "Your body is still recovering from your last orgasm.", "blue");
		br();
		delete V.refractoryPeriodMessage;
	}

	if (V.dysphoriaReasonMessage) {
		const msgs = Array.isArray(V.dysphoriaReasonMessage) ? V.dysphoriaReasonMessage : [V.dysphoriaReasonMessage];

		for (const msg of msgs) {
			if (typeof msg === "string" && msg.trim().length) {
				element("span", msg, "purple");
				br();
			}
		}

		delete V.dysphoriaReasonMessage;
	}

	if (typeof V.audienceErasureMessage === "string" && V.audienceErasureMessage.trim().length) {
		element("span", V.audienceErasureMessage, "purple");
		br();
		delete V.audienceErasureMessage;
	}

	if (typeof V.audienceAffirmationMessage === "string" && V.audienceAffirmationMessage.trim().length) {
		element("span", V.audienceAffirmationMessage, "green");
		br();
		delete V.audienceAffirmationMessage;
	}

	if (V.dysphoriaMessage) {
		element("span", "You suffer from dysphoria.", "purple");
		br();
		delete V.dysphoriaMessage;
	}

	if (V.dysphoriaProcessingMessage) {
		element("span", "You're slowly processing how you feel about your current self.", "blue");
		fragment.append(wikifier("lwillpower"));
		br();
		delete V.dysphoriaProcessingMessage;
	}

	if (V.identityAcceptanceMessage) {
		element("span", "You have learned to embrace a new aspect of yourself.", "green");
		br();
		delete V.identityAcceptanceMessage;
	}
	if (V.identityFamiliarityMessage) {
		element(
			"span",
			"Settling back into this feels strangely familiar. Your body remembers being at peace with it, and the comfort returns far quicker than the first time.",
			"green"
		);
		br();
		delete V.identityFamiliarityMessage;
	}
	if (Array.isArray(V.giBodyChangeMessages) && V.giBodyChangeMessages.length) {
		for (const msg of V.giBodyChangeMessages) {
			if (typeof msg === "string" && msg.trim().length) {
				element("span", msg, "gold");
				br();
			}
		}
		delete V.giBodyChangeMessages;
	}

	if (V.breakdownMessage) {
		element("span", "The dysphoria has become too much.", "purple");
		element("span", "You begrudgingly surrender yourself to being this way.", "red");
		fragment.append(wikifier("lllwillpower"));
		br();
		delete V.breakdownMessage;
	}

	if (V.breakdownEndMessage) {
		element("span", "You recover from your begrudging acceptance.", "green");
		br();
		delete V.breakdownEndMessage;
	}

	if (V.suspiciousPillDebuffMessage) {
		const skills = V.suspiciousPillDebuffMessage;
		element("span", "Something went wrong with the suspicious pill.", "red");
		br();
		element("span", `The botched transformation has weakened your ${skills.join(", ")}.`, "purple");
		br();
		delete V.suspiciousPillDebuffMessage;
	}

	if (V.xchangeAlphaGrewPenisMessage) {
		if (V.xchangeAlphaGrewPenisMessage === "end") {
			element("span", "The ache from the Alpha pill fades. Your cock softens, then slowly shrinks away.", "purple");
			br();
		} else {
			element("span", "You feel a growing ache between your legs.", "purple");
			element("span", "The Alpha pill grows you a cock with a knot, without removing anything else.", "pink");
			br();
		}
		delete V.xchangeAlphaGrewPenisMessage;
	}

	if (V.xchange?.chastityAdaptedMessage) {
		if (V.xchange.chastityAdaptedMessage === "feminize") {
			element("span", "You feel your chastity device shift and reshape around your new anatomy, enclosing your new sex tightly.", "teal");
			br();
		} else if (V.xchange.chastityAdaptedMessage === "butchify") {
			element("span", "You feel your chastity device constrict and reform into a cage around your new anatomy, locking your new sex in place.", "teal");
			br();
		} else if (V.xchange.chastityAdaptedMessage === "fellOff") {
			element("span", "Your chastity cage has nothing left to enclose, and slips off into your wardrobe back home.", "teal");
			br();
		}
		delete V.xchange.chastityAdaptedMessage;
	}

	return fragment;
}
window.xchangeEffectsMessages = xchangeEffectsMessages;

/* ============================================================
   GRAY X-CHANGE PILLS helpers (consolidated)
*/
(function () {
	"use strict";
	if (typeof window.setup !== "object" || window.setup === null) window.setup = {};
	/* hospital pharmacy stock */
	/* Hospital gray price. 
	Landry sells the full line at 6000 "twice the hospital price" so the hospital baseline is 3000 per pill. */
	const GRAY_PRICE = 300000;

	/* key -> pill name (the pill name is also the inventory `type`) */
	const GRAY_STOCK = {
		xchange_gray_breeder: "X-Change Breeder",
		xchange_gray_bull: "X-Change Bull",
		xchange_gray_omega: "X-Change Omega",
		xchange_gray_alpha: "X-Change Alpha",
		xchange_gray_beta: "X-Change Beta",
		xchange_gray_swell: "X-Change Swell",
		xchange_gray_hyper_fertility: "X-Change Hyper Fertility",
		xchange_gray_fertility: "X-Change Fertility",
		xchange_gray_passion: "X-Change Passion",
		xchange_gray_innocence: "X-Change Innocence",
		xchange_gray_bimbo: "X-Change Bimbo",
		xchange_gray_cumcure: "X-Change CumCure",
		xchange_gray_dumb_bitch: "X-Change Dumb-Bitch",
		xchange_gray_xtend: "X-Change X-Tend (Gray)",
		xchange_gray_resistance: "X-Change Resistance",
		xchange_gray_continue: "X-Change Continue",
		xchange_gray_extension: "X-Change Weekly Extension",
		xchange_gray_portal: "X-Change Portal",
	};

	function ensureGrayPharmacyItems() {
		if (typeof setup !== "object" || setup === null) return false;
		if (typeof setup.pharmacyItems !== "object" || setup.pharmacyItems === null) {
			setup.pharmacyItems = {};
		}
		for (const [key, pillName] of Object.entries(GRAY_STOCK)) {
			if (!setup.pharmacyItems[key]) {
				setup.pharmacyItems[key] = { name: pillName, type: pillName, price: GRAY_PRICE };
			}
		}
		return true;
	}
	setup.ensureGrayPharmacyItems = ensureGrayPharmacyItems;
	window.ensureGrayPharmacyItems = ensureGrayPharmacyItems;

	/* Run now (synchronous; no deferral, no race)... */
	ensureGrayPharmacyItems();

	/* ...and once more after load, in case a later core file reassigns
	   setup.pharmacyItems wholesale. Idempotent, so this is always safe. */
	if (typeof window !== "undefined" && typeof window.$ === "function") {
		window.$(ensureGrayPharmacyItems);
	}
})();

/* ============================================================
   HERM SCHOOL RUMOUR DECAY ACROSS BODY CHANGES
   $schoolrep.herm is the "student with both boy and girl parts" rumour (0-5). Vanilla never lowers it,
   so a player who spent one afternoon herm kept a maxed rumour forever, and one who swapped bodies twice
   a week kept collecting rumours nobody could ever confirm.

   Losing the parts is what makes the rumour fade: once you no longer have both, the students who repeat it
   can be proven wrong. How much survives depends on how well known your X-Change use already is. At low
   X-Change fame nobody connects you to the pills, so the rumour dies outright. At high fame the town knows
   your body changes, so a herm rumour keeps its weight even when your current body does not match it.

   This is checked on the passage cycle rather than at the pill sites so every route into a body change is
   covered: pills, the pill wearing off, restore-body, clones, the cheat menu and the slow identity shift. */
(() => {
	"use strict";

	/**
	 * Levels of herm rumour lost when the player stops having both sets of genitals.
	 * A returned level of 5 wipes the rumour outright (the bar caps at 5).
	 */
	function hermRumourDecayLevels() {
		const fame = Number(V.xchange_fame) || 0;
		if (fame < 101) return 5;
		if (fame < 201) return 3;
		if (fame < 301) return 2;
		if (fame < 500) return 1;
		return 0;
	}

	function playerBodyIsHerm() {
		return !!(V.player && V.player.penisExist && V.player.vaginaExist);
	}

	function hermRumourBodyCheck() {
		if (!V.schoolrep || V.statFreeze) return;

		const isHerm = playerBodyIsHerm();
		const wasHerm = V.schoolrep.hermBody;
		if (wasHerm === isHerm) return;

		V.schoolrep.hermBody = isHerm;

		// A save from before this check has no baseline. Record one instead of pretending the body just changed.
		if (wasHerm === undefined) return;
		// Gaining the parts back never costs rumour.
		if (isHerm) return;
		if (!(V.schoolrep.herm > 0)) return;

		const levels = hermRumourDecayLevels();
		if (levels < 1) return;

		V.schoolrep.herm = Math.max(0, V.schoolrep.herm - levels);

		// Read by the effects panel (effect.js), which prints how much of the rumour survived.
		V.school_herm_fade_message = V.schoolrep.herm;
		V.effectsmessage = 1;
	}

	if (typeof window !== "undefined" && typeof window.$ === "function") {
		window.$(document).on(":passagestart", hermRumourBodyCheck);
	}
})();

/* When a pill changes the player's genitals mid-scene, clear any NPC links to those changed parts so the scene and combat options stay in sync.
 * parts: array containing "vagina" and/or "penis". */
setup.xchangeClearNpcGenitalLinks = function (parts) {
	if (!Array.isArray(V.NPCList)) return;
	const wanted = Array.isArray(parts) ? parts : [parts];
	const playerVagina = ["vagina", "vaginaimminent", "vaginaentrance", "vaginadouble", "vaginaimminentdouble", "vaginaentrancedouble", "othermouth"];
	const playerPenis = [
		"frot",
		"otherfrot",
		"otheranusfrot",
		"penis",
		"penisimminent",
		"penisentrance",
		"penisdouble",
		"otheranus",
		"otheranusimminent",
		"otheranusentrance",
	];
	const linked = [];
	if (wanted.includes("vagina")) linked.push(...playerVagina);
	if (wanted.includes("penis")) linked.push(...playerPenis);
	if (!linked.length) return;

	let clearedVagina = false;
	let clearedPenis = false;
	V.NPCList.forEach(npc => {
		if (!npc || typeof npc !== "object") return;
		let touched = false;
		["penis", "vagina"].forEach(field => {
			if (!linked.includes(npc[field])) return;
			// The NPC's penis field may refer to their own hole, but the player part it was using is no longer holding it.
			if (playerVagina.includes(npc[field])) clearedVagina = true;
			else clearedPenis = true;
			npc[field] = 0;
			touched = true;
		});
		if (touched && npc.location) npc.location.genitals = 0;
	});

	if (clearedVagina || wanted.includes("vagina")) {
		V.vaginause = 0;
		V.vaginastate = 0;
		V.vaginaaction = 0;
		V.vaginatarget = 0;
	}
	if (clearedPenis || wanted.includes("penis")) {
		V.penisuse = 0;
		V.penisstate = 0;
		V.penisaction = 0;
		V.penistarget = 0;
	}
};
