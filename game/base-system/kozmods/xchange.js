function paramError(functionName = "", param = "", value, expectedValues = "") {
	if (typeof value === "object") value = JSON.stringify(value);
	/* Included both types of error reporting, since this often will only occur in a link */
	Errors.report(
		`Unexpected value for the function "${functionName}" in the passage "${V.passage}". Param "${param}" had unexpected value of "${value}".${
			expectedValues ? ` ${expectedValues}` : ""
		}`
	);
	throw new Error(
		`Unexpected value for the function "${functionName}". Param "${param}" had unexpected value of "${value}".${
			expectedValues ? ` ${expectedValues}` : ""
		}`
	);
}

function getSensitivity(part) {
	let purityMod = (1000 - V.purity) * V.xchange.impuritySensitivityBonus / 1000;
	const xchangeMod = playerIsXChanged() ? 
		(V.player.sex === "f"? 1 : -1) * V.xchange.pillSensitivityChange : 0; 
	const orgasmingMod = V.orgasmCum > 0 ? 1 : 0;

	switch(part) {
		case "mouth":
			return V.mouthsensitivity;
		case "breast":
		case "breasts":
			return Math.clamp(V.breastsensitivity + purityMod + xchangeMod + orgasmingMod, 0.25, 6);
		case "bottom":
			return Math.clamp(V.bottomsensitivity + purityMod + xchangeMod + orgasmingMod, 0.25, 3);
		case "genital":
		case "genitals":
			return Math.clamp(V.genitalsensitivity + 2 * purityMod + xchangeMod + orgasmingMod, 0.25, 10);
		default:
			paramError("getSensitivity", "part", part, "Expected a string, see function for accepted values");
			break;
	}
}
window.getSensitivity = getSensitivity;

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
			}
			else {
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
			if (V.substanceRebalance == 1) {
				mod *= 1 + V.drugged / 250;
			} else {
				mod *= 1 + V.drugged / 1000;
			}
		}

		const beingPenetrated = ["penis", "penisdouble", "tentacle", "tentacledeep", "machine"];
		const penetrating = ["penetrated", "othervagina", "otheranus", "othermouth"];
		
		const playerIsBeingPenetrated =
			beingPenetrated.includes(V.vaginause) || beingPenetrated.includes(V.anususe) || [0,3].includes(V.portalPanties.state.vagina?.new) || [0,3].includes(V.portalPanties.state.anus?.new) || V.portalejacvagina || V.portalejacanus;

		const penisAddictionFulfilled = playerIsBeingPenetrated || playerHasButtPlug() ;
		const holeAddictionFulfilled = penetrating.includes(V.penisuse);

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
				if (playerIsPregnant()) sensitivity += 0.5;
				break;
			case "bottom":
			case "anus":
			case "anal":
			case "ass":
			case "butt":
			case "masturbationAnal":
			case "masturbationAss":
			case "bottom_grope":
				let analWetnessPenalty = 1;
				if (amount > 0 && beingPenetrated.includes(V.anusstate)) {
					statChange.pain(V.analPain || 0);
					analWetnessPenalty = Math.min(V.anusWetness/60, 1);
					if (V.penis_addict_trait === 1) sensitivity += 0.5;
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
				let wetnessPenalty = 1;
				if (amount > 0 && V.player.vaginaExist === "t" && beingPenetrated.includes(V.vaginause)) {
					statChange.pain(V.vaginalPain);
					wetnessPenalty = Math.min(V.vaginaWetness/60, 1);
					if (V.penis_addict_trait === 1) sensitivity += 0.5;
				}
				sensitivity += getSensitivity("genital");
				if (playerIsPregnant()) sensitivity += 0.5;
				break;
			case "time":
				pleasure = Math.clamp(V.pleasure + amount * (amount > 0? mod : 1), 0, V.pleasuremax);
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

		// Adjusts modifier for body part sensitivity, if applicable
		if (amount > 0) {
			let sensitivityMod = (sensitivity - 1) ** 2 / 4;
			// Halve sensitivity boosts during chef job
			// todo: rebalance chef job better
			if (V.masturbation_bowl) sensitivityMod /= 2;
			mod += sensitivityMod;
		}

		if (amount > 0 && ((V.penis_addict_trait === 1 && (!playerIsBeingPenetrated || playerHasButtPlug())) || (V.hole_addict_trait === 1 && (!holeAddictionFulfilled || playerHasStrapon())))) {
			mod *= 0.6;
		}

		// Concentration reduces incoming arousal by half
		// Whilst failed concentration adds half a point of sensitivity to all incoming arousal
		if (V.xchange.resistCombatArousal === 1 && amount > 0) {
			mod *= 0.50;
		}
		else if (V.xchange.resistCombatArousal === -1 && amount > 0) {
			mod += 0.50;
		}

		// Reduce the mod if masturbating while in heat and/or rut
		if (source && source.includes("masturbation")) {
			mod *= 1 - Math.clamp(playerHeatMinArousal() + playerRutMinArousal(), 0, 4000) / 5000;
		}

		// Scale down stimulation according to current arousal
		mod *= V.arousal / V.arousalmax;

		let oldPleasure = V.pleasure;
		let pleasureChange = amount * (amount > 0? mod : 1) * (amount > 0? Weather.BodyTemperature.arousalModifier : 1);
		V.pleasure += pleasureChange;

		// Prevent orgasming unless addictions are fulfilled
		const addictionsUnmet =
			(V.penis_addict_trait === 1 && !penisAddictionFulfilled) ||
			(V.hole_addict_trait === 1 && !holeAddictionFulfilled);

		// toy detection (does NOT break if the selected toy index is 0)
		const usingSexToy = (() => {
			// If already set a flag elsewhere, respect it
			if (V.usingSexToy) return true;

			// Masturbation toy selectors (0 is a valid selection!)
			const slots = ["Left", "Right", "Mouth", "Vagina", "Anus"];
			for (const s of slots) {
				const v = V["currentToy" + s];
				if (v !== undefined && v !== null && v !== "none") return true;
			}

			// Fallback: worn items sometimes include plugs/vibes by name
			const names = [];
			try {
				if (V.worn?.genitals?.name) names.push(V.worn.genitals.name);
				if (V.worn?.under_lower?.name) names.push(V.worn.under_lower.name);
				if (V.worn?.lower?.name) names.push(V.worn.lower.name);
			} catch (e) {}

			return names.some(n => /plug|buttplug|vibe|vibrator|bullet/i.test(String(n)));
		})();

		if (!addictionsUnmet) {
			// Do nothing
		} else {
			const cap = V.pleasuremax * 4 / 5 - 1;

			// Keep the message behavior
			const showBlockedMsg = () => {
				V.effectsmessage = 1;
				V.sexual_addiction_message = 1;
			};

			if (usingSexToy) {
				// Soft gate for toys:
				// - clamp to cap
				// - when capped, sometimes force a "breakthrough" to orgasm
				if (V.pleasure > cap) V.pleasure = cap;

				if (V.pleasure >= cap) {
					showBlockedMsg();

					// Chance per check to allow orgasm once you reach the cap
					// Tune: 5-10 = hard, 15-25 = medium, 30+ = easy
					const breakthroughChance = 20;
					const roll = Math.floor(Math.random() * 100) + 1;

					if (roll <= breakthroughChance) {
						// Let the normal orgasm check happen this tick
						V.pleasure = V.pleasuremax;
					}
				}
			} else {
				// Original hard block for non-toy situations
				V.pleasure = Math.clamp(V.pleasure, 0, cap);
				if (V.pleasure === cap) showBlockedMsg();
			}
		}

		// Cannot orgasm under breeder unless there's semen in vagina
		if (playerIsXChanged() && V.xchange.pill?.breederEffect && (!playerIsCreampied() || V.xchange.breederOrgasmLock && !V.xchange.breederOrgasm) && oldPleasure + pleasureChange >= V.pleasuremax * 4/5) {
			V.pleasure = Math.clamp(V.pleasure, 0, V.pleasuremax * 4/5 - 1);
			V.xchange.pill.breederEdgingCount++;
		}
		if (V.xchange.pill.breederEdgingCount > 10) {
			V.effectsmessage = 1;
			V.breederEdgingMessage = 1;
			V.xchange.breederDenial++;
			V.xchange.pill.breederEdgingCount = 0;
			V.xchange.pill.breederEdgingStress = Math.min(V.xchange.pill.breederEdgingStress + 50, 800);
			fragment.append(wikifier("stress", V.xchange.pill.breederEdgingStress, 1));
		}

		fragment.append(wikifier("arousal-moan", amount * (amount > 0? mod : 1) * (amount > 0? Weather.BodyTemperature.arousalModifier : 1), sensitivity));

		// Add to the tracker
		if (amount > 0) {
			V.trackedArousal[V.trackedArousal.length - 1] += Math.round(amount * (amount > 0? mod : 1));
			V.timeSinceArousal = 0;
		}

		V.pleasure = Math.max(V.pleasure, 0);

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
				addedPleasure += Math.clamp(minuteMultiplier * 4, 0, V.earSlime.vibration * 40) * V.genitalsensitivity;
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

function updatePhysique() {
	// Add more sizes to match your extended bodysize system.
	// 0..3 are original values, 4..6 are example "giant" tiers.
	const physiquesizes = [6000, 10000, 12000, 16000, 20000, 24000, 28000];

	// Don't compute until X-Change base stats exist
	if (!V.xchange?.baseStats) return;
	if (typeof V.xchange.baseStats.physique !== "number") return;
	if (typeof V.xchange.baseStats.physiquesize !== "number") return;

	const bs = V.bodysize;

	// Resolve physiquesize from bodysize (supports fractional & out-of-range)
	let ps = null;

	if (typeof bs === "number" && !Number.isNaN(bs)) {
		// miniature (negative bodysize): scale down from smallest
		if (bs < 0) {
			ps = Math.round(physiquesizes[0] * Math.pow(0.8, Math.abs(Math.round(bs))));
		} else {
			// giant/fractional: interpolate between nearest entries
			const lo = Math.floor(bs);
			const hi = Math.ceil(bs);

			if (physiquesizes[lo] != null && physiquesizes[hi] != null) {
				const t = bs - lo;
				ps = Math.round(physiquesizes[lo] + (physiquesizes[hi] - physiquesizes[lo]) * t);
			} else if (physiquesizes[Math.round(bs)] != null) {
				ps = physiquesizes[Math.round(bs)];
			}
		}
	}

	// If we still couldn't resolve, DON'T overwrite the existing value
	if (typeof ps !== "number" || Number.isNaN(ps) || ps <= 0) return;

	V.physiquesize = ps;

	const pct = (typeof V.xchange.physiqueChangePercent === "number")
		? (V.xchange.physiqueChangePercent / 100)
		: 1;

	const genderMismatch =
		V.player?.gender != null && V.player?.sex != null && (V.player.gender !== V.player.sex);

	V.physique = Math.round(
		V.xchange.baseStats.physique *
		(V.physiquesize / V.xchange.baseStats.physiquesize) *
		(genderMismatch ? pct : 1)
	);
}
window.updatePhysique = updatePhysique;

if (typeof updatePhysique === "function") updatePhysique();

function sumTalents() {
	return V.AMCTraits.skulduggery + V.AMCTraits.dancing + V.AMCTraits.swimming + V.AMCTraits.athletics + V.AMCTraits.tending + V.AMCTraits.housekeeping + V.AMCTraits.brawling + V.AMCTraits.footwork + V.AMCTraits.striking + V.AMCTraits.kicking + V.AMCTraits.science + V.AMCTraits.maths + V.AMCTraits.english + V.AMCTraits.history;
}
window.sumTalents = sumTalents;

function sumSexTalents() {
	return V.AMCTraits.seductionskill + V.AMCTraits.oralskill + V.AMCTraits.chestskill + V.AMCTraits.handskill + V.AMCTraits.bottomskill + V.AMCTraits.penileskill + V.AMCTraits.vaginalskill + V.AMCTraits.analskill + V.AMCTraits.thighskill + V.AMCTraits.feetskill;
}
window.sumSexTalents = sumSexTalents;


function playerHasCharacteristic(characteristic) {
	const categories = [
				"over_upper", "over_lower", "upper", "lower",
				"under_upper", "under_lower", "over_head", "head",
				"face", "neck", "hands", "handheld", "legs",
				"feet", "genitals"
			];

	let count = 0;

	switch (characteristic) {
		case "Masculine Appearance":
			return V.player.gender_appearance === "m" ? 2 : 0;
		case "Feminine Appearance":
			return V.player.gender_appearance === "f" ? 2 : 0;
		case "Masculine Clothing":
			categories.forEach(cat => {
				if (V.worn[cat]?.gender === "m") count++;	
			});
			return count; 
		case "Feminine Clothing":
			categories.forEach(cat => {
				if (V.worn[cat]?.gender === "f") count++;	
			});
			return count;
		case "Masculine Pronouns":
			return V.identity.presentation.pronouns.masculine.misgendered;
		case "Feminine Pronouns":
			return V.identity.presentation.pronouns.feminine.misgendered;
		case "Neutral Pronouns":
			return V.identity.presentation.pronouns.neutral.misgendered;
		case "Flat Chest":
			return V.player.breastsize === 0 ? 2 : 0;
		case "Small Breasts":
			return between(V.player.breastsize, 1, 4) ? 2 : 0;
		case "Medium Breasts":
			return between(V.player.breastsize, 5, 7) ? 2 : 0;
		case "Big Breasts":
			return V.player.breastsize > 7 ? 2 : 0;
		case "Small Ass":
			return V.player.bottomsize <= 2 ? 2 : 0;
		case "Medium Ass":
			return between(V.player.bottomsize, 3, 6) ? 2 : 0;
		case "Big Ass":
			return V.player.bottomsize > 6 ? 2 : 0;
		case "Vagina":
			return V.player.vaginaExist ? 2 : 0;
		case "Small Penis":
			return (V.player.penisExist && V.player.penissize <= 1) ? 2 : 0;
		case "Medium Penis":
			return (V.player.penisExist && V.player.penissize === 2) ? 2 : 0;
		case "Big Penis":
			return (V.player.penisExist && V.player.penissize >= 3) ? 2 : 0;
		case "Short Hair":
			return V.hairlength <= 100 ? 2 : 0;
		case "Medium Hair":
			return between(V.hairlength, 100, 600) ? 2 : 0;
		case "Long Hair":
			return V.hairlength > 600 ? 2 : 0;
		case "Miniature Body":
			return V.bodysize === -1 ? 2 : 0;
		case "Tiny Body":
			return V.bodysize === 0 ? 2 : 0;
		case "Small Body":
			return V.bodysize === 1 ? 2 : 0;
		case "Normal Body":
			return V.bodysize === 2 ? 2 : 0;
		case "Tall Body":
			return V.bodysize === 2.5 ? 2 : 0;
		case "Large Body":
			return V.bodysize === 3 ? 2 : 0;
		case "Giant Body":
			return V.bodysize === 4 ? 2 : 0;
		case "Lactation":
			return (V.lactating >= 1 && V.breastfeedingdisable === "f") ? 2 : 0;
		case "Pregnancy":
			return (playerAwareTheyArePregnant() || (playerAwareTheyCanBePregnant() && playerIsCreampied())) ? 2 : 0;
		case "In Heat":
		case "In heat":
			return (typeof playerHeatMinArousal === "function" && playerHeatMinArousal() > 0) ? 2 : 0;
		case "In Rut":
		case "In rut":
			return (typeof playerRutMinArousal === "function" && playerRutMinArousal() > 0) ? 2 : 0;
		default:
			return 0;
	}
}
window.playerHasCharacteristic = playerHasCharacteristic;

function getFemininityContribution(characteristic) {
	let femininity = 0;

	switch (characteristic) {
		case "Masculine Appearance":
			femininity += Number(V.identity.presentation.appearance.masculine.acceptance) * -100;
			femininity += Number(V.identity.presentation.appearance.masculine.reject) * 100;
			femininity += (V.identity.presentation.appearance.preferred === "m") * -100;
			break;
		case "Feminine Appearance":
			femininity += Number(V.identity.presentation.appearance.feminine.acceptance) * 100;
			femininity += Number(V.identity.presentation.appearance.feminine.reject) * -100;
			femininity += (V.identity.presentation.appearance.preferred === "f") * 100;
			break;
		case "Masculine Clothing":
			femininity += Number(V.identity.presentation.clothing.masculine.acceptance) * -100;
			femininity += Number(V.identity.presentation.clothing.masculine.reject) * 100;
			femininity += (V.identity.presentation.clothing.preferred === "m") * -100;
			break;
		case "Feminine Clothing":
			femininity += Number(V.identity.presentation.clothing.feminine.acceptance) * 100;
			femininity += Number(V.identity.presentation.clothing.feminine.reject) * -100;
			femininity += (V.identity.presentation.clothing.preferred === "f") * 100;
			break;
		case "Masculine Pronouns":
			femininity += Number(V.identity.presentation.pronouns.masculine.acceptance) * -100;
			femininity += Number(V.identity.presentation.pronouns.masculine.reject) * 100;
			femininity += (V.identity.presentation.pronouns.preferred === "m") * -100;
			break;
		case "Feminine Pronouns":
			femininity += Number(V.identity.presentation.pronouns.feminine.acceptance) * 100;
			femininity += Number(V.identity.presentation.pronouns.feminine.reject) * -100;
			femininity += (V.identity.presentation.pronouns.preferred === "f") * 100;
			break;
		case "Neutral Pronouns":
			femininity += Number(V.identity.presentation.pronouns.neutral.acceptance) * 0;
			femininity += Number(V.identity.presentation.pronouns.neutral.reject) * -0;
			femininity += (V.identity.presentation.pronouns.preferred === "n") * 0;
			break;
		case "Flat Chest":
			femininity += Number(V.identity.body.chest.flat.acceptance) * -50;
			femininity += Number(V.identity.body.chest.flat.reject) * 50;
			femininity += (V.identity.body.chest.preferred === "flat") * -50;
			break;
		case "Small Breasts":
			femininity += Number(V.identity.body.chest.small.acceptance) * 25;
			femininity += Number(V.identity.body.chest.small.reject) * -25;
			femininity += (V.identity.body.chest.preferred === "small") * 25;
			break;
		case "Medium Breasts":
			femininity += Number(V.identity.body.chest.medium.acceptance) * 50;
			femininity += Number(V.identity.body.chest.medium.reject) * -50;
			femininity += (V.identity.body.chest.preferred === "medium") * 50;
			break;
		case "Big Breasts":
			femininity += Number(V.identity.body.chest.big.acceptance) * 50;
			femininity += Number(V.identity.body.chest.big.reject) * -50;
			femininity += (V.identity.body.chest.preferred === "big") * 50;
			break;
		case "Small Ass":
			femininity += Number(V.identity.body.bottom.small.acceptance) * 50;
			femininity += Number(V.identity.body.bottom.small.reject) * -50;
			femininity += (V.identity.body.bottom.preferred === "small") * 50;
			break;
		case "Medium Ass":
			femininity += Number(V.identity.body.bottom.medium.acceptance) * 50;
			femininity += Number(V.identity.body.bottom.medium.reject) * -50;
			femininity += (V.identity.body.bottom.preferred === "medium") * 50;
			break;
		case "Big Ass":
			femininity += Number(V.identity.body.bottom.big.acceptance) * 50;
			femininity += Number(V.identity.body.bottom.big.reject) * -50;
			femininity += (V.identity.body.bottom.preferred === "big") * 50;
			break;
		case "Vagina":
			femininity += Number(V.identity.body.genitals.vagina.acceptance) * 50;
			femininity += Number(V.identity.body.genitals.vagina.reject) * -50;
			femininity += (V.identity.body.genitals.preferred === "vagina") * 50;
			break;
		case "Small Penis":
			femininity += Number(V.identity.body.genitals.smallpenis.acceptance) * -25;
			femininity += Number(V.identity.body.genitals.smallpenis.reject) * 25;
			femininity += (V.identity.body.genitals.preferred === "small") * -25;
			break;
		case "Medium Penis":
			femininity += Number(V.identity.body.genitals.mediumpenis.acceptance) * -50;
			femininity += Number(V.identity.body.genitals.mediumpenis.reject) * 50;
			femininity += (V.identity.body.genitals.preferred === "medium") * -50;
			break;
		case "Big Penis":
			femininity += Number(V.identity.body.genitals.bigpenis.acceptance) * -50;
			femininity += Number(V.identity.body.genitals.bigpenis.reject) * 50;
			femininity += (V.identity.body.genitals.preferred === "big") * -50;
			break;
		case "Short Hair":
			femininity += Number(V.identity.body.hairlength.short.acceptance) * -50;
			femininity += Number(V.identity.body.hairlength.short.reject) * 50;
			femininity += (V.identity.body.hairlength.preferred === "short") * -50;
			break;
		case "Medium Hair":
			femininity += Number(V.identity.body.hairlength.medium.acceptance) * 25;
			femininity += Number(V.identity.body.hairlength.medium.reject) * -25;
			femininity += (V.identity.body.hairlength.preferred === "medium") * 25;
			break;
		case "Long Hair":
			femininity += Number(V.identity.body.hairlength.long.acceptance) * 50;
			femininity += Number(V.identity.body.hairlength.long.reject) * -50;
			femininity += (V.identity.body.hairlength.preferred === "long") * 50;
			break;
			case "Miniature Body":
			femininity += Number(V.identity.body.bodysize.tiny.acceptance) * 50;
			femininity += Number(V.identity.body.bodysize.tiny.reject) * -50;
			femininity += (V.identity.body.bodysize.preferred === "tiny") * 50;
			break;
		case "Tiny Body":
			femininity += Number(V.identity.body.bodysize.tiny.acceptance) * 50;
			femininity += Number(V.identity.body.bodysize.tiny.reject) * -50;
			femininity += (V.identity.body.bodysize.preferred === "tiny") * 50;
			break;
		case "Small Body":
			femininity += Number(V.identity.body.bodysize.small.acceptance) * 0;
			femininity += Number(V.identity.body.bodysize.small.reject) * -0;
			femininity += (V.identity.body.bodysize.preferred === "small") * 0;
			break;
		case "Normal Body":
			femininity += Number(V.identity.body.bodysize.normal.acceptance) * 0;
			femininity += Number(V.identity.body.bodysize.normal.reject) * -0;
			femininity += (V.identity.body.bodysize.preferred === "normal") * 0;
			break;
		case "Tall Body":
			femininity += Number(V.identity.body.bodysize.normal.acceptance) * 0;
			femininity += Number(V.identity.body.bodysize.normal.reject) * -0;
			femininity += (V.identity.body.bodysize.preferred === "normal") * 0;
			break;
		case "Large Body":
			femininity += Number(V.identity.body.bodysize.large.acceptance) * -50;
			femininity += Number(V.identity.body.bodysize.large.reject) * 50;
			femininity += (V.identity.body.bodysize.preferred === "large") * -50;
			break;
		case "Giant Body":
			femininity += Number(V.identity.body.bodysize.large.acceptance) * -50;
			femininity += Number(V.identity.body.bodysize.large.reject) * 50;
			femininity += (V.identity.body.bodysize.preferred === "large") * -50;
			break;
		case "Lactation":
			femininity += Number(V.identity.body.lactation.acceptance) * 50;
			femininity += Number(V.identity.body.lactation.reject) * -50;
			femininity += (V.identity.body.lactation.preferred === "lactation") * 50;
			break;
		case "Pregnancy":
			femininity += Number(V.identity.body.pregnancy.acceptance) * 50;
			femininity += Number(V.identity.body.pregnancy.reject) * -50;
			femininity += (V.identity.body.pregnancy.preferred === "pregnancy") * 50;
			break;
		default:
			break;
	}

	return femininity;
}
window.getFemininityContribution = getFemininityContribution;

function identityCharacteristicCategory(category) {
	switch(category) {
		case "Appearance":
			return playerHasCharacteristic("Masculine Appearance") ? "Masculine Appearance" : "Feminine Appearance";
		case "Breasts":
			if (playerHasCharacteristic("Flat Chest")) return "Flat Chest";
			else if (playerHasCharacteristic("Small Breasts")) return "Small Breasts";
			else if (playerHasCharacteristic("Medium Breasts")) return "Medium Breasts";
			else return "Big Breasts";
		case "Ass":
			if (playerHasCharacteristic("Small Ass")) return "Small Ass";
			else if (playerHasCharacteristic("Medium Ass")) return "Medium Ass";
			else return "Big Ass";
		case "Penis":
			if (playerHasCharacteristic("Small Penis")) return "Small Penis";
			else if (playerHasCharacteristic("Medium Penis")) return "Medium Penis";
			else if (playerHasCharacteristic("Big Penis")) return "Big Penis";
			else return false;
		case "Hair":
			if (playerHasCharacteristic("Short Hair")) return "Short Hair";
			else if (playerHasCharacteristic("Medium Hair")) return "Medium Hair";
			else return "Long Hair";
		case "Size":
			if (playerHasCharacteristic("Tiny Body")) return "Tiny Body";
			else if (playerHasCharacteristic("Small Body")) return "Small Body";
			else if (playerHasCharacteristic("Normal Body")) return "Normal Body";
			else return "Large Body";
		default:
			return false;
	}
}
window.identityCharacteristicCategory = identityCharacteristicCategory;

function preferredPronouns(gender) {
	switch(gender) {
		case "m":
			if (V.identity.presentation.pronouns.preferred === "m") return true;
			else if (V.identity.presentation.pronouns.preferred === "body") return V.player.penisExist;
			else if (V.identity.presentation.pronouns.preferred === "clothing") {
				if (playerHasCharacteristic("Masculine Clothing")) return true;
				else return false;
			}
			else if (V.identity.presentation.pronouns.preferred === "appearance") return V.player.gender_appearance === "m";
			else if (V.identity.presentation.pronouns.preferred === "posture") return V.player.gender_posture === "m";
		case "f":
			if (V.identity.presentation.pronouns.preferred === "f") return true;
			else if (V.identity.presentation.pronouns.preferred === "body") return V.player.vaginaExist;
			else if (V.identity.presentation.pronouns.preferred === "clothing") {
				if (playerHasCharacteristic("Feminine Clothing")) return true;
				else return false;
			}
			else if (V.identity.presentation.pronouns.preferred === "appearance") return V.player.gender_appearance === "f";
			else if (V.identity.presentation.pronouns.preferred === "posture") return V.player.gender_posture === "f";
		default:
			return false;
	}
}
window.preferredPronouns = preferredPronouns;

function mapToLegacyGenderIdentity() {
	let identityValue = 750;
	for (const category in setup.identityIndex) {
		for (const characteristic in setup.identityIndex[category]) {
			const contribution = getFemininityContribution(characteristic);
			identityValue += contribution * (V.player.gender === "f" ? 1 : -1);
		}
	}

	V.genderidentity = Math.clamp(identityValue, 0, 1500);
	return identityValue;
}
window.mapToLegacyGenderIdentity = mapToLegacyGenderIdentity;

function hasGenderIdentity(stage) {
	mapToLegacyGenderIdentity();

	switch (stage) {
		case 8:
			return V.genderidentity === 1500;
		case 7:
			return V.genderidentity >= 1300;
		case 6:
			return V.genderidentity >= 1100;
		case 5:
			return V.genderidentity >= 900;
		case 4:
			return V.genderidentity >= 600;
		case 3:
			return V.genderidentity >= 400;
		case 2:
			return V.genderidentity >= 200;
		case 1:
			return V.genderidentity >= 1;
		case 0:
			return V.genderidentity === 0;
		default:
			return false;
	}
	// const preferenceMatchesStartingSex = V.identity.presentation.pronouns.preferred === V.player.gender;
	// const manNonAcceptingFemininity = V.identity.presentation.pronouns.masculine.acceptance && !V.identity.presentation.pronouns.feminine.acceptance;
	// const womanNonAcceptingMasculinity = V.identity.presentation.pronouns.feminine.acceptance && !V.identity.presentation.pronouns.masculine.acceptance;
	// const acceptsEitherGender = V.identity.presentation.pronouns.feminine.acceptance && V.identity.presentation.pronouns.masculine.acceptance;
	// const manNonAcceptingMasculinity = !V.identity.presentation.pronouns.masculine.acceptance && V.identity.presentation.pronouns.feminine.acceptance;
	// const womanNonAcceptingFemininity = !V.identity.presentation.pronouns.feminine.acceptance && V.identity.presentation.pronouns.masculine.acceptance;

	// switch (stage) {
	// 	case 8:
	// 	case 7:
	// 		return preferenceMatchesStartingSex;
	// 	case 6:
	// 	case 5:
	// 		if (V.player.gender === "m") return manNonAcceptingFemininity;
	// 		else if (V.player.gender === "f") return womanNonAcceptingMasculinity;
	// 	case 4:
	// 		return acceptsEitherGender;
	// 	case 3:
	// 	case 2:
	// 		if (V.player.gender === "m") return manNonAcceptingMasculinity;
	// 		else if (V.player.gender === "f") return womanNonAcceptingFemininity;
	// 	case 1:
	// 	case 0:
	// 		return V.identity.presentation.pronouns.preferred != V.player.gender;
	// 	default:
	// 		return false;
	// }
}
window.hasGenderIdentity = hasGenderIdentity;

function playerFeelsManlike() {
	return (V.player.gender === "m" && hasGenderIdentity(5)) || (V.player.gender === "f" && !hasGenderIdentity(4));
}
window.playerFeelsManlike = playerFeelsManlike;

function playerFeelsGirllike() {
	return (V.player.gender === "f" && hasGenderIdentity(5)) || (V.player.gender === "m" && !hasGenderIdentity(4));
}
window.playerFeelsGirllike = playerFeelsGirllike;

function playerIsXChanged() {
	return (
		V.xchange.pill && V.xchange.pill.active
	);
}
window.playerIsXChanged = playerIsXChanged;

function isNumber(value) {
	return typeof value == 'number' ||
	(isObjectLike(value) && baseGetTag(value) == numberTag);
}
window.isNumber = isNumber;

/* 
	@args:
	 - path: type string, representing the relative path to an 'img' asset.
*/
function getGenderedPath(path) {
	if (typeof path === 'string' && V.options?.useAltImg === 1 && V.player?.sex === V.options?.altImgGender) {
		path = path.substring(4);
		if (path[0] === '/') {
			path = path.substring(1);
		} 
		return 'img2/' + path;
	}
	else 
		return path;
}
window.getGenderedPath = getGenderedPath;

function pillTimerPaused() {
	let vaginalPregnancy = V.sexStats.vagina.pregnancy.type !== null;
	let earSlimeHasGrown = V.earSlime.growth > 50;
	return V.xchange.pillPermanence !== 1 && (vaginalPregnancy || earSlimeHasGrown);
}
window.pillTimerPaused = pillTimerPaused;

function pillIsPermanent() {
	return V.xchange.pill.duration <= -1;
}
window.pillIsPermanent = pillIsPermanent;

function wondersAboutPillEnd() {
	return V.xchange.pill.shouldHaveEnded === true && V.xchange.pill.countdown < 24; 
}
window.wondersAboutPillEnd = wondersAboutPillEnd;

function playerBodyIsMale() {
	return (V.player.gender === "m" && !playerIsXChanged()) || (V.player.gender === "f" && playerIsXChanged());
}
window.playerBodyIsMale = playerBodyIsMale;


function playerBodyIsFemale() {
	return (V.player.gender === "f" && !playerIsXChanged()) || (V.player.gender === "m" && playerIsXChanged());
}
window.playerBodyIsMale = playerBodyIsMale;

function playerIsCreampied() {
	return V.sexStats.vagina.sperm.length > 0 || V.player.bodyliquid.vagina.semen > 0 || V.player.bodyliquid.vagina.nectar > 0;
}
window.playerIsCreampied = playerIsCreampied;

function playerMayBeSpiked() {
	return V.xchange.nonconEnabled === 1 && ((!playerIsXChanged() && !playerIsPregnant()) || playerIsXChanged());
}
window.playerMayBeSpiked = playerMayBeSpiked;

function playerCaresForGender() {
	return V.xchange.genderIdentityEnabled === 1;
}
window.playerCaresForGender = playerCaresForGender;

function genderIsIgnored() {
	return V.xchange.disregardGender === 1;
}
window.genderIsIgnored = genderIsIgnored;

function updateRemoverPillCatalogue() {
	wikifier("xchange-get-spikepool"); 
	T.effectPool.deleteWith((val)=>val==="genderflip");
	T.effectPool.deleteWith((val)=>val==="herm");

	V.xchange.removerPillCatalogue = [];
	for (let i = 0; i < 5; i++) {
		// if (T.effectPool.length <= 0) break;
		const pillType = T.effectPool.random();
		V.xchange.removerPillCatalogue.push(pillType);
	}
}
window.updateRemoverPillCatalogue = updateRemoverPillCatalogue;

function xchangeTimePassedCheck(minutes = 1) {
	
	if (V.arousal >= V.arousalmax * 2/5) 
		wikifier("willpower-spending", minutes * 0.5 * Math.ceil( (V.arousal - V.arousalmax*2/5) / (V.arousalmax/10) ));
	else if (V.xchange.willpowerPoints < V.willpower * 0.5) 
		wikifier("willpower-recovery", minutes * 0.5 * Math.ceil( (V.arousalmax*2/5 - V.arousal) / (V.arousalmax/10) ));
	
	if (V.drugged > 200 && V.arousal < V.arousalmax * 4/5) 
		wikifier("arousal", (V.drugged / 10) * 3 * minutes);
	else if (V.drugged > 100 && V.arousal < V.arousalmax * 3/5) 
		wikifier("arousal", (V.drugged / 10) * 2 * minutes);
	else if (V.drugged > 0 && V.arousal < V.arousalmax * 2/5)
		wikifier("arousal", (V.drugged / 10) * minutes);

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
}
window.xchangeTimePassedCheck = xchangeTimePassedCheck;

function xchangeWeeklyCheck(weeks = 1) {
	if (!V.statFreeze) {
		if (V.xchange.pubGamblingEnabled && !V.weekly.gamblingUpkeepPaid) {
			V.xchange.gamblingUpkeepFailed = 1;
			V.xchange.pubGamblingEnabled = 0;
	
			if (V.location != "prison") {
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
	const dealerOdds = [1,2,4];
	V.xchange.weeklyShadyDealer = dealerOdds.pluck() | dealerOdds.pluck();
	if (V.xchange.weeklyShadyDealer & 4) updateRemoverPillCatalogue();

}
window.xchangeWeeklyCheck = xchangeWeeklyCheck;

function xchangeDailyCheck(days = 1) {
	if (!V.statFreeze) {
		if ((V.hourlyFemininity > 0 && V.player.gender === "f") || (V.hourlyFemininity < 0 && V.player.gender === "m"))
			wikifier("genderidentity", 1 * days);
		else if ((V.hourlyFemininity > 0 && V.player.gender === "m") || (V.hourlyFemininity < 0 && V.player.gender === "f"))
			wikifier("genderidentity", -1 * days);
	
		if (playerIsXChanged())
			wikifier("genderidentity", -2 * days);
	
		V.effectsmessage = 1;
		V.genderIdentityMessage = V.hourlyFemininity > 0? "f": (V.hourlyFemininity < 0? "m": 0);
		V.hourlyFemininity = 0;
	
		wikifier("blackmail-daypassed");
	
		V.recentmolest = Math.max(V.recentmolest - 1 * days, 0);
		V.recentrape = Math.max(V.recentrape - 1 * days, 0);
	
		if (V.robinbreakupCooldown > 0) {
			V.robinbreakupCooldown -= 1 * days;
		}
	
		V.xchange.blackmailHalt = Math.max(0, V.xchange.blackmailHalt - 1 * days);
				
		wikifier("dailyIdentityEffects");
	}
}
window.xchangeDailyCheck = xchangeDailyCheck;

function xchangeHourlyCheck(hours = 1) {
	if (!V.statFreeze) {
		const pill = V.xchange.pill;
		if (pill?.active)
		{
			// Tick the pill's duration down if the pill isn't permanent
			if (!pillIsPermanent()) pill.duration = Math.max(pill.duration - 1 * hours, 0);
	
			// Clamp the pill duration to only ever save up to 30 days (in particular for Continue pills)
			if (pill.continueEffect)
				pill.duration = Math.min(pill.duration, 30*24);
			
			// If the pill has the continue effect, and a remaining duration of 30 days is accumulated
			// then, the change becomes permanent
			if (V.xchange.pillPermanence === 1 && !pillIsPermanent() && pill.continueEffect && pill.duration >= 30 * 24)
				wikifier("xchange-setpermanent");

			// If got impregnated in the vagina, or allowed an ear slime to grow to a certain point
			// then, the change becomes permanent 
			if (V.xchange.pillPermanence === 1 && !pillIsPermanent() && (V.sexStats.vagina.pregnancy.type !== null || V.earSlime.growth > 50))
				wikifier("xchange-setpermanent");

			// Check if the pill should expire
			if (pill.duration == 0)
			{
				pill.shouldHaveEnded = true;


				if (!pillIsPermanent() && !pillTimerPaused() && pill.resistanceEffect && random(0,100) > pill.resistanceChance) {
					if (V.xchange.pillPermanence === 1) wikifier("xchange-setpermanent");
					else {
						pill.duration += Math.max(1, V.xchange.resistanceDaysPenalty) * 24;
						pill.resistanceEffect = false;
						pill.fertile = true;
						pill.resistanceFakeout = true;
					}
				}
				else if (!pillIsPermanent() && !pillTimerPaused()) {
					if (V.xchange.pill.clone === "none") {
						wikifier("xchange-restore");
					} 
					else {
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
					} 
					else {
						wikifier("xchange-restore", "nosave");
					}
				}
			}

			// Progress the fakeout timer for as long as the "should have ended" flag stands, else reset it.
			if (pill.shouldHaveEnded) 
				pill.countdown += 1 * hours;
			else
				pill.countdown = 0;

			// Reveal that you didn't turn back
			if (pill.shouldHaveEnded && !wondersAboutPillEnd()) {
				V.xchangePermanenceMessage = 1;
				delete pill.shouldHaveEnded; 
			}

			// Drop the resistance facade when the uncertain period has expired
			if (pill.resistanceFakeout === true && !wondersAboutPillEnd()) {
				delete pill.resistanceFakeout;
				delete pill.shouldHaveEnded;
			}
		}
	
		// Apply hour-random passion effect
		for (let i = 0; i < hours; i++) {
			if (pill?.passionEffect && ((V.substanceRebalance == 1 && random(0,10) == 0) || random(0,8) == 0)) {
				wikifier("drugs", V.substanceRebalance == 1? 120 : 200); 
				V.effectsmessage = 1;
				V.xchange_passion_message = 1;
			}
		}
		
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

function hourlyClothingFemininityCheck(hours = 1) {
	// Compute the sum of all clothing femininity
	let currentWornFemininity = 0;
	if (setup.clothes["over_head"][clothesIndex("over_head", V.worn.over_head)].femininity)
		currentWornFemininity += setup.clothes["over_head"][clothesIndex("over_head", V.worn.over_head)].femininity;
	if (setup.clothes["head"][clothesIndex("head", V.worn.head)].femininity)
		currentWornFemininity += setup.clothes["head"][clothesIndex("head", V.worn.head)].femininity;
	if (setup.clothes["face"][clothesIndex("face", V.worn.face)].femininity)
		currentWornFemininity += setup.clothes["face"][clothesIndex("face", V.worn.face)].femininity;
	if (setup.clothes["neck"][clothesIndex("neck", V.worn.neck)].femininity)
		currentWornFemininity += setup.clothes["neck"][clothesIndex("neck", V.worn.neck)].femininity;
	if (setup.clothes["over_upper"][clothesIndex("over_upper", V.worn.over_upper)].femininity)
		currentWornFemininity += setup.clothes["over_upper"][clothesIndex("over_upper", V.worn.over_upper)].femininity;
	if (setup.clothes["upper"][clothesIndex("upper", V.worn.upper)].femininity)
		currentWornFemininity += setup.clothes["upper"][clothesIndex("upper", V.worn.upper)].femininity;
	if (setup.clothes["under_upper"][clothesIndex("under_upper", V.worn.under_upper)].femininity)
		currentWornFemininity += setup.clothes["under_upper"][clothesIndex("under_upper", V.worn.under_upper)].femininity;
	if (setup.clothes["over_lower"][clothesIndex("over_lower", V.worn.over_lower)].femininity)
		currentWornFemininity += setup.clothes["over_lower"][clothesIndex("over_lower", V.worn.over_lower)].femininity;
	if (setup.clothes["lower"][clothesIndex("lower", V.worn.lower)].femininity)
		currentWornFemininity += setup.clothes["lower"][clothesIndex("lower", V.worn.lower)].femininity;
	if (setup.clothes["under_lower"][clothesIndex("under_lower", V.worn.under_lower)].femininity)
		currentWornFemininity += setup.clothes["under_lower"][clothesIndex("under_lower", V.worn.under_lower)].femininity;
	if (setup.clothes["legs"][clothesIndex("legs", V.worn.legs)].femininity)
		currentWornFemininity += setup.clothes["legs"][clothesIndex("legs", V.worn.legs)].femininity;
	if (setup.clothes["handheld"][clothesIndex("handheld", V.worn.handheld)].femininity)
		currentWornFemininity += setup.clothes["handheld"][clothesIndex("handheld", V.worn.handheld)].femininity;
	if (setup.clothes["feet"][clothesIndex("feet", V.worn.feet)].femininity)
		currentWornFemininity += setup.clothes["feet"][clothesIndex("feet", V.worn.feet)].femininity;

	// Add up the makeup femininity
	currentWornFemininity += V.makeup.lipstick ? 50 : 0;
	currentWornFemininity += V.makeup.mascara ? 50 : 0;
	currentWornFemininity += V.makeup.eyeshadow ? 50 : 0;
	
	// Tick the hourly counter
	V.hourlyFemininity += currentWornFemininity > 0 ? 1 : 0;
	V.hourlyFemininity += currentWornFemininity < 0 ? -1 : 0;

	const hasFemClothesPreference = V.identity.presentation.clothing.preferred === 'f';
	const hasFemClothesAcceptance = V.identity.presentation.clothing.feminine.acceptance;
	const hasFemClothesRejection = V.identity.presentation.clothing.feminine.reject;
	
	const hasMascClothesPreference = V.identity.presentation.clothing.preferred === 'm';
	const hasMascClothesAcceptance = V.identity.presentation.clothing.masculine.acceptance;
	const hasMascClothesRejection = V.identity.presentation.clothing.masculine.reject;

// --- Hypno crossdress cheat gate (keeps X-Change working) ---
V.cheats = V.cheats || {};
const genderifyActive = !!(V.xchange?.pill?.active && V.xchange.pill.genderificationEffect);
const hypnoCrossdressLevel = V.cheats.disableHypnoCrossdress ? 0 : (V.hypnosis_traits?.crossdressing || 0);

	if (genderifyActive || hypnoCrossdressLevel >= 1) {
		if (V.player.gender === "m" && currentWornFemininity < 0) {
			wikifier("stress", 800 * hours, 1);
			V.genderificationStressMessage = 1;
			V.effectsmessage = 1;
		}
		else if (
			(V.player.gender === "m" && (!hasFemClothesAcceptance || !playerCaresForGender()) && currentWornFemininity > 0) &&
			(genderifyActive || hypnoCrossdressLevel < 4)
		) {
			wikifier("stress", -10 * hours);
			V.tiredness -= 200 * hours;
			V.genderificationStressMessage = 2;
			V.effectsmessage = 1;
		}
		if (V.player.gender === "f" && currentWornFemininity > 0) {
			wikifier("stress", 800 * hours, 1);
			V.genderificationStressMessage = 3;
			V.effectsmessage = 1;
		}
		else if (
			(V.player.gender === "f" && (!hasMascClothesAcceptance || !playerCaresForGender()) && currentWornFemininity < 0) &&
			(genderifyActive || hypnoCrossdressLevel < 4)
		) {
			wikifier("stress", -10 * hours);
			V.tiredness -= 200 * hours; // <-- fixed: original was missing "* hours"
			V.genderificationStressMessage = 4;
			V.effectsmessage = 1;
		}
	}
	else if (playerCaresForGender()) {
		if (hasFemClothesRejection && !hasFemClothesAcceptance && currentWornFemininity > 0) {
			wikifier("stress", 800 * hours, 1);
			V.genderStressMessage = 2;
			V.effectsmessage = 1;
		}
		else if (!hasFemClothesRejection && !hasFemClothesAcceptance && currentWornFemininity > 0) {
			wikifier("stress", 400 * hours, 1);
			V.genderStressMessage = 1;
			V.effectsmessage = 1;
		}
		else if (hasMascClothesRejection && !hasMascClothesAcceptance && currentWornFemininity < 0) {
			wikifier("stress", 800 * hours, 1);
			V.genderStressMessage = 4;
			V.effectsmessage = 1;
		}
		else if (!hasMascClothesRejection && !hasMascClothesAcceptance && currentWornFemininity < 0) {
			wikifier("stress", 400 * hours, 1);
			V.genderStressMessage = 3;
			V.effectsmessage = 1;
		}
	}
	
}
window.hourlyClothingFemininityCheck = hourlyClothingFemininityCheck;

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
		element("span", "You've just loaded a save file featuring a character of unsupported sex or gender (quite likely a Vanilla herm). You've been forcefully turned into the available one to attempt to keep the mod's systems working, but proceeding from here onward is entirely ill-adviced and if you run into odd behaviour, that is expected.", "red"); br(); br();
		delete V.hermSaveWarningMessage;
	}

	if (V.identityWarningMessage) {
		if (V.identity.init < 2) {
			element("span", "WARNING:", "yellow");
			element("span", "You haven't locked in your identity preferences yet. Please, head to your room and into Gameplay Settings > Modded Settings > Identity Settings, and check the box at the bottom that says 'Lock Choices'. Make sure to review your character's identity preferences before saving your settings.", "red"); br(); br();
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

	if (V.xchange_passion_message) {
		element("span", `Aphrodisiacs have been released into your bloodstream.`, "pink"); br();
		delete V.xchange_passion_message;
	}

	if (V.xchangeFameMessage) {
		element("span", "People have been gossiping about your X-Change escapades, and even the law has fully caught on."); br();
		element("span", "You no longer benefit from having two identities.", "red");
		delete V.xchangeFameMessage;
	}

	if (V.xchangePermanenceMessage) {
		if (V.xchange.pillPermanence === 1) {
			element("span", "Seems you didn't turn back. Your pill's effects have become permanent", "red"); br();
		}
		else {
			element("span", "Seems you didn't turn back...", "red"); br();
		}
		delete V.xchangePermanenceMessage;
	}

	switch (V.xchangeRestoreMessage) {
		case 1:
			element("span", "Your body twists and turns as it returns to its original form.", "blue"); br();
			delete V.xchangeRestoreMessage;
			break;
		case 2:
			element("span", "Despite having climaxed under the effects of Resistance, the pill did not become permanent.", "blue"); br();
			delete V.xchangeRestoreMessage;
			break;
		case 3:
			element("span", "The pill's effects should be running out right about now.", "blue"); br();
			delete V.xchangeRestoreMessage;
			break;
		default:
			break;
	}

	switch (V.genderificationStressMessage) {
		case 1:
			element("span", "You have an urge to dress cute.", "purple");
			fragment.append(wikifier("ggstress")); br();
			delete V.genderificationStressMessage;
			break;
		case 2:
			element("span", "You are feeling cute and refreshed with your outfit.", "light-pink");
			fragment.append(wikifier("llstress")); fragment.append(wikifier("ltiredness")); br();
			delete V.genderificationStressMessage;
			break;
		case 3:
			element("span", "You have an urge to dress more manly.", "purple");
			fragment.append(wikifier("ggstress")); br();
			delete V.genderificationStressMessage;
			break;
		case 3:
			element("span", "You are feeling manly and vigourous in your fit.", "blue");
			fragment.append(wikifier("llstress")); fragment.append(wikifier("ltiredness")); br();
			delete V.genderificationStressMessage;
			break;
		default:
			break;
	}

	switch (V.genderStressMessage) {
		case 1:
			element("span", "You feel awkward dressed up girly like this.", "purple");
			fragment.append(wikifier("gstress")); br();
			delete V.genderStressMessage;
			break;
		case 2:
			element("span", "You feel gross in these girly clothes.", "red");
			fragment.append(wikifier("ggstress")); br();
			delete V.genderStressMessage;
			break;
		case 3:
			element("span", "You feel awkward dressed up boyish like this.", "purple");
			fragment.append(wikifier("gstress")); br();
			delete V.genderStressMessage;
			break;
		case 4:
			element("span", "You feel gross in these boyish clothes.", "red");
			fragment.append(wikifier("ggstress")); br();
			delete V.genderStressMessage;
			break;
		default:
			break;
	}

	if (V.identityCapMessage) {
		if (V.player.gender === "m") {
			element("span", "You reject these girly feelings from taking a hold of you!", "purple");
		} else {
			element("span", "You stubbornly cling to your feminine self despite your growing masculine tendencies.", "purple");
		}	
		fragment.append(wikifier("gstress"));
		fragment.append(wikifier("gtrauma")); br();
		delete V.identityCapMessage;
	}

	if (V.breastSensitiveRubMessage) {
		if (!V.worn.under_upper.type.includes("naked") && V.worn.under_upper.exposed < 2) {
			wikifier("breastsensitivity");
			element("span", `Your ${T.text_output2 ?? " "}nipples are rubbing against your ${V.worn.under_upper.name}.`, "pink");
		}
		else {
			wikifier("breastsensitivity");
			element("span", `Your ${T.text_output2 ?? " "}nipples are rubbing against your ${V.worn.upper.name}.`, "pink");
		}
		br();
		delete V.breastSensitiveRubMessage;
	}

	if (V.genitalSensitiveRubMessage) {
		if (!V.worn.under_lower.type.includes("naked") && V.worn.under_lower.exposed < 2) {
			wikifier("genitalsensitivity");
			element("span", `Your ${T.text_output2 ?? " "}${V.player.penisExist? "penis" : "clit"} is rubbing against your ${V.worn.under_lower.name}.`, "pink");
		}
		else {
			wikifier("genitalsensitivity");
			element("span", `Your ${T.text_output2 ?? " "}${V.player.penisExist? "penis" : "clit"} is rubbing against your ${V.worn.lower.name}.`, "pink");
		}
		br();
		delete V.genitalSensitiveRubMessage;
	}

	if (V.breederEdgingMessage) {
		element("span", "Your body refuses to cum like this.", "purple"); 
		element("span", "You crave some thick gooey semen in your "+ either("pussy.","vagina."), "red");
		if (V.xchange.pill.breederEdgingStress > 400)
			fragment.append(wikifier("ggstress"));
		else
			fragment.append(wikifier("gstress")); 
		
		br();

		delete V.breederEdgingMessage;
	}

	if (V.sexual_addiction_message) {
		element("span", "Your body refuses to cum like this.", "purple"); 
		if (V.penis_addict_trait === 1 && V.hole_addict_trait === 1) 
			element("span", "You need real sex! Doesn't matter who does the fucking.", "red");
		else if (V.penis_addict_trait === 1)
			element("span", "You need dick, and you need it deep inside you. Now!", "red");
		else if (V.hole_addict_trait === 1 && V.player.penisExist)
			element("span", "Your dick craves some pussy, and it demands it now!", "red");
		else if (V.hole_addict_trait === 1 && !V.player.penisExist)
			element("span", "You miss the feeling of some pussy on your dick.", "red");
		
		br();

		delete V.sexual_addiction_message;
	}

	if (V.dumbBitchOrgasmMessage) {
		element("span", "Your orgasm is frying your brain.", "red"); 
		fragment.append(wikifier("llstress"));
		fragment.append(wikifier("lwillpower"));
		if (V.dumbBitchOrgasmMessage === 1) {
			element("span", "|",);
			element("span", "- School Grades", "red");
			br();
		}
		if (V.dumbBitchOrgasmMessage === 2) {
			element("span", 
				either(
					"Lockpicking is now like... just so hard or something.",
					"Everyone seems like... so trustworthy now.",
					"Malice?... Like... what's that?"
				), 
			"red");
			fragment.append(wikifier("lskulduggery"));
			br();
		}
		else if (V.dumbBitchOrgasmMessage === 3) {
			element("span", 
				either(
					"Everyone's so nice... Like, you should totally fuck more.",
					"Sex is like... so yummy right now. You want it all.",
					"You want to, like... feel g- good-er? Better? Oh just fuck~"
				), 
			"lewd");
			element("span", "|",);
			element("span", "+ Lewdness", "lewd");
			br();
		}
		br();
		delete V.dumbBitchOrgasmMessage;
	}

	if (V.refractoryPeriodMessage) {
		element("span", "Your body is still recovering from your last orgasm.", "blue"); br();
		delete V.refractoryPeriodMessage;
	}

	if (V.dysphoriaReasonMessage) {
		const msgs = Array.isArray(V.dysphoriaReasonMessage)
			? V.dysphoriaReasonMessage
			: [V.dysphoriaReasonMessage];

		for (const msg of msgs) {
			if (typeof msg === "string" && msg.trim().length) {
				element("span", msg, "purple");
				br();
			}
		}

		delete V.dysphoriaReasonMessage;
	}

	if (V.dysphoriaMessage) {
		element("span", "You suffer from dysphoria.", "purple"); br();
		delete V.dysphoriaMessage;
	}

	if (V.dysphoriaProcessingMessage) {
		element("span", "You're slowly processing how you feel about your current self.", "blue"); 
		fragment.append(wikifier("lwillpower"));
		br();
		delete V.dysphoriaProcessingMessage;
	}

	if (V.identityAcceptanceMessage) {
		element("span", "You have learned to embrace a new aspect of yourself.", "green"); br();
		delete V.identityAcceptanceMessage;
	}

	if (V.breakdownMessage) {
		element("span", "The dysphoria has become too much.", "purple"); 
		element("span", "You begrudgingly surrender yourself to being this way.", "red"); 
		fragment.append(wikifier("lllwillpower"));
		br();
		delete V.breakdownMessage;
	}

	if (V.breakdownEndMessage) {
		element("span", "You recover from your begrudging acceptance.", "green"); br();
		delete V.breakdownEndMessage;
	}

	return fragment;
}
window.xchangeEffectsMessages = xchangeEffectsMessages;

(() => {
	// Ensure setup exists
	if (typeof window.setup !== "object" || window.setup === null) {
		window.setup = {};
	}

	// Ensure Math.clamp exists (some forks have it, some don't)
	if (typeof Math.clamp !== "function") {
		Math.clamp = (n, min, max) => Math.min(max, Math.max(min, n));
	}

	// Valid bodysize values in your build
	setup.bodySizeSteps = [-1, 0, 1, 2, 2.5, 3, 4];

	// Snap any number to nearest valid bodysize step
	setup.snapBodySize = function (v) {
		v = Number(v);
		if (!Number.isFinite(v)) return 2;

		let best = setup.bodySizeSteps[0];
		let bestD = Math.abs(v - best);

		for (const s of setup.bodySizeSteps) {
			const d = Math.abs(v - s);
			if (d < bestD) { best = s; bestD = d; }
		}
		return best;
	};

	// Move by N steps in the discrete list (prevents 1.5 / 3.5 etc)
	setup.stepBodySize = function (cur, stepDelta) {
		cur = setup.snapBodySize(cur);
		stepDelta = Math.trunc(Number(stepDelta) || 0);

		const arr = setup.bodySizeSteps;
		let idx = arr.indexOf(cur);
		if (idx < 0) idx = arr.indexOf(2);

		let next = idx + stepDelta;
		next = Math.clamp(next, 0, arr.length - 1);

		return arr[next];
	};
})();

(() => {
  // Can the CURRENT player body get pregnant?
  // Keep this anatomy-based (not sex-based) to avoid the “male can get pregnant” bug.
  setup.xchangeCanBePregnant = function () {
    const V = State.variables;
    return V.player?.vaginaExist === true;
  };

  // Fertile effect should only be "effective" when pregnancy is anatomically possible.
  // This does NOT modify the save; it just gates behavior/UI.
  setup.xchangeEffectiveFertile = function () {
    const V = State.variables;
    const pill = V.xchange?.pill;
    if (!pill?.active) return false;
    if (!pill.effectsKnown) return false;
    if (pill.resistanceFakeout) return false;
    if (!pill.fertile) return false;
    return setup.xchangeCanBePregnant();
  };
})();

(() => {
	// XChange Fertile Helpers
	setup.xchangeCanBePregnantNow = function () {
		const V = State.variables;
		// Keep this anatomy-based to match setup.xchangeCanBePregnant()
		return V.player?.vaginaExist === true;
	};

	setup.xchangeSanitiseFertile = function () {
		const V = State.variables;
		const pill = V.xchange?.pill;
		if (!pill?.active) return;

		// If the current body can't be pregnant, Fertile must not exist.
		if (pill.fertile && !setup.xchangeCanBePregnantNow()) {
			pill.fertile = false;
		}
	};
	// Back-compat: old saves may be missing newer X-Change pill fields.
	// We only *fill in missing* fields; we don't wipe or "sanitise" existing data.
	setup.xchangeEnsurePillDefaults = function () {
		const V = State?.variables;
		const pill = V?.xchange?.pill;
		if (!pill) return;

		// effectsKnown was introduced later; if missing and the pill is active or any effect is present,
		// assume the player is aware (they'd notice the changes anyway).
		if (pill.effectsKnown === undefined) {
			const hasAnyEffect =
				!!pill.fertile ||
				!!pill.breederEffect ||
				!!pill.bullEffect ||
				!!pill.genderflipEffect ||
				!!pill.genderificationEffect ||
				!!pill.hermEffect ||
				!!pill.resistanceEffect ||
				!!pill.continueEffect ||
				!!pill.portalEffect;

			pill.effectsKnown = !!pill.active || hasAnyEffect;
		}
	};


	// Back-compat: older saves may be missing global X-Change fields that core game code expects.
	// We only initialise values when they're missing/invalid, to avoid wiping legitimate data.
	setup.xchangeEnsureCompatGlobals = function () {
		const V = State?.variables;
		if (!V) return;
		V.xchange ??= {};

		// story-functions.js uses V.xchange.breederDenial in arithmetic.
		// If it's missing or non-numeric, it can turn risk into NaN and silently disable heat.
		const bd = Number(V.xchange.breederDenial);
		if (!Number.isFinite(bd)) {
			V.xchange.breederDenial = 0;
		} else {
			V.xchange.breederDenial = Math.clamp(bd, 0, 6);
		}

		// story-functions.js also gates heat when pregnant using V.pregnancyStats.heatStillEnabled
		V.pregnancyStats ??= {};
		if (typeof V.pregnancyStats.heatStillEnabled !== "boolean") {
			try {
				V.pregnancyStats.heatStillEnabled = (typeof playerIsPregnant === "function") ? !playerIsPregnant() : true;
			} catch (e) {
				V.pregnancyStats.heatStillEnabled = true;
			}
		}
	};
	// Run once now (if State is ready), and again whenever a passage starts (to catch freshly-loaded saves).
	try { setup.xchangeEnsurePillDefaults(); } catch (e) {}
	try { setup.xchangeEnsureCompatGlobals(); } catch (e) {}
	if (typeof jQuery === "function") {
		jQuery(document).on(":passagestart", () => {
			try { setup.xchangeEnsurePillDefaults(); } catch (e) {}
	try { setup.xchangeEnsureCompatGlobals(); } catch (e) {}
		});
	}

})();
