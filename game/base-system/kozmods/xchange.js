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

	switch(part) {
		case "mouth":
			return V.mouthsensitivity;
		case "breast":
		case "breasts":
			return Math.clamp(V.breastsensitivity + purityMod + xchangeMod, 0.25, 6);
		case "bottom":
			return Math.clamp(V.bottomsensitivity + purityMod + xchangeMod, 0.25, 3);
		case "genital":
		case "genitals":
			return Math.clamp(V.genitalsensitivity + 2 * purityMod + xchangeMod, 0.25, 10);
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
					statChange.pain(V.analPain);
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

		// Prevent orgasming unless addictions are fulfilled (or you don't have them)
		if ( ( V.penis_addict_trait !== 1 || penisAddictionFulfilled ) && ( V.hole_addict_trait !== 1 || holeAddictionFulfilled ) ) {
			// Do Nothing
		} else {
			V.pleasure = Math.clamp(V.pleasure, 0, V.pleasuremax * 4/5 - 1);
			if (V.pleasure === V.pleasuremax * 4/5 - 1) {
				V.effectsmessage = 1;
				V.sexual_addiction_message = 1;
			}
		}

		// Cannot orgasm under breeder unless there's semen in vagina
		if (playerIsXChanged() && V.xchange.pill?.breederEffect && !playerIsCreampied() && oldPleasure + pleasureChange >= V.pleasuremax * 4/5) {
			V.pleasure = Math.clamp(V.pleasure, 0, V.pleasuremax * 4/5 - 1);
			V.xchange.pill.breederEdgingCount++;
		}
		if (V.xchange.pill.breederEdgingCount > 10) {
			V.effectsmessage = 1;
			V.breederEdgingMessage = 1;
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
	const physiquesizes = [6000, 10000, 12000, 16000];

	V.physiquesize = physiquesizes[V.bodysize];
	V.physique = 
		V.xchange.baseStats.physique * (V.physiquesize / V.xchange.baseStats.physiquesize) * 
		(V.player.gender !== V.player.sex ? V.xchange.physiqueChangePercent / 100 : 1);
}
window.updatePhysique = updatePhysique;

function sumTalents() {
	return V.AMCTraits.skulduggery + V.AMCTraits.dancing + V.AMCTraits.swimming + V.AMCTraits.athletics + V.AMCTraits.tending + V.AMCTraits.housekeeping + V.AMCTraits.brawling + V.AMCTraits.footwork + V.AMCTraits.striking + V.AMCTraits.kicking + V.AMCTraits.science + V.AMCTraits.maths + V.AMCTraits.english + V.AMCTraits.history;
}
window.sumTalents = sumTalents;

function sumSexTalents() {
	return V.AMCTraits.seductionskill + V.AMCTraits.oralskill + V.AMCTraits.chestskill + V.AMCTraits.handskill + V.AMCTraits.bottomskill + V.AMCTraits.penileskill + V.AMCTraits.vaginalskill + V.AMCTraits.analskill + V.AMCTraits.thighskill + V.AMCTraits.feetskill;
}
window.sumSexTalents = sumSexTalents;


function hasGenderIdentity(stage) {
	switch (stage) {
		case 8:
			return V.genderidentity === 1000;
		case 7:
			return V.genderidentity >= 875;
		case 6:
			return V.genderidentity >= 750;
		case 5:
			return V.genderidentity >= 625;
		case 4:
			return V.genderidentity >= 375;
		case 3:
			return V.genderidentity >= 250;
		case 2:
			return V.genderidentity >= 125;
		case 1:
			return V.genderidentity >= 1;
		case 0:
			return V.genderidentity === 0;
		default:
			return false;
	}
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
		const pillType = T.effectPool.pluck();
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

	// Pub
	V.xchange.pubtimer = Math.max(V.xchange.pubtimer - 1, 0);


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
			pill.duration = Math.min(pill.duration, 30*24);
			
			// Check if the pill should expire
			if (pill.duration == 0)
			{
				pill.shouldHaveEnded = true;

				// If got impregnated in the vagina, or allowed an ear slime to grow to a certain point
				// then, the change becomes permanent 
				if (V.xchange.pillPermanence === 1 && !pillIsPermanent() && (V.sexStats.vagina.pregnancy.type !== null || V.earSlime.growth > 50))
					wikifier("xchange-setpermanent");
			
				// If the pill has the continue effect, and a remaining duration of 30 days is accumulated
				// then, the change becomes permanent
				if (V.xchange.pillPermanence === 1 && !pillIsPermanent() && pill.continueEffect && pill.duration > 30 * 24)
					wikifier("xchange-setpermanent");

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
	}
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

	if (V.xchange.pill.active && V.xchange.pill.genderificationEffect) {
		if (V.player.gender === "m" && currentWornFemininity < 0) {
			wikifier("stress",800 * hours,1);
			V.genderificationStressMessage = 1;
			V.effectsmessage = 1;
		}
		else if (V.player.gender === "m" && (V.genderidentity > 625 || !playerCaresForGender()) && currentWornFemininity > 0) {
			wikifier("stress",-10 * hours);
			V.tiredness -= 200 * hours;
			V.genderificationStressMessage = 2;
			V.effectsmessage = 1;
		}
		if (V.player.gender === "f" && currentWornFemininity > 0) {
			wikifier("stress",800 * hours,1);
			V.genderificationStressMessage = 3;
			V.effectsmessage = 1;
		}
		else if (V.player.gender === "f" && (V.genderidentity > 625 || !playerCaresForGender()) && currentWornFemininity < 0) {
			wikifier("stress",-10 * hours);
			V.tiredness -= 200;
			V.genderificationStressMessage = 4;
			V.effectsmessage = 1;
		}
	}
	else if (playerCaresForGender()) {
		if (hasGenderIdentity(7) && V.player.gender === "m" && V.player.sex === "m" && currentWornFemininity > 0) {
			wikifier("stress",800 * hours,1);
			V.genderStressMessage = 2;
			V.effectsmessage = 1;
		}
		else if (hasGenderIdentity(5) && V.player.gender === "m" && currentWornFemininity > 0) {
			wikifier("stress",400 * hours,1);
			V.genderStressMessage = 1;
			V.effectsmessage = 1;
		}
		else if (!hasGenderIdentity(2) && V.player.gender === "f" && V.player.sex === "m" && currentWornFemininity > 0) {
			wikifier("stress",800 * hours,1);
			V.genderStressMessage = 2;
			V.effectsmessage = 1;
		}
		else if (!hasGenderIdentity(4) && V.player.gender === "f" && currentWornFemininity > 0) {
			wikifier("stress",400 * hours,1);
			V.genderStressMessage = 1;
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
		default:
			break;
	}

	if (V.breastSensitiveRubMessage) {
		if (V.worn.under_upper.type !== "naked" && V.worn.under_upper.exposed < 2)
			element("span", `Your ${wikifier("breasts")} are rubbing against your ${V.worn.under_upper.name}.`);
		else
			element("span", `Your ${wikifier("breasts")} are rubbing against your ${V.worn.upper.name}.`);
		br();
		delete V.breastSensitiveRubMessage;
	}

	if (V.genitalSensitiveRubMessage) {
		if (V.worn.under_lower.type !== "naked" && V.worn.under_lower.exposed < 2)
			element("span", `Your ${V.player.penisExist? wikifier("penis") : wikifier("clit")} is rubbing against your ${V.worn.under_lower.name}.`);
		else
			element("span", `Your ${V.player.penisExist? wikifier("penis") : wikifier("clit")} is rubbing against your ${V.worn.lower.name}.`);
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
		element("span", "|",);
		element("span", "- Intelligence", "red");
		br();
		if (V.dumbBitchOrgasmMessage === 2) {
			element("span", 
				either(
					"Lockpicking is now like... just so hard or something.",
					"Everyone seems like... so trustworthy now.",
					"Malice?... Like... what's that?"
				), 
			"red");
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
			br();
		}
		br();
		delete V.dumbBitchOrgasmMessage;
	}

	if (V.refractoryPeriodMessage) {
		element("span", "Your body is still recovering from your last orgasm.", "blue"); br();
		delete V.refractoryPeriodMessage;
	}

	return fragment;
}
window.xchangeEffectsMessages = xchangeEffectsMessages;