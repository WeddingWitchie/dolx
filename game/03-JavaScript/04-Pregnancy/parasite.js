function fertiliseParasites(orifice = "anus") {
	// Runs whenever someone ejaculates in your `orifice`
	const pregnancy = V.sexStats[orifice].pregnancy;
	if (pregnancy.type === "parasite") {
		pregnancy.fetus.forEach(parasite => {
			if (!parasite.fertilised) {
				parasite.fertilised = true;
				parasite.daysLeft = parasite.stats.growth;
				if (parasite.stats.gender === "Hermaphrodite") {
					pregnancy.motherStatus = 2;
				}
			}
		});
	}
}
DefineMacro("fertiliseParasites", fertiliseParasites);

// eslint-disable-next-line no-unused-vars
function parasiteProgressDay(orifice = "anus") {
	const pregnancy = V.sexStats[orifice].pregnancy;
	V.pregnancyStats.namesParasitesChild = V.deviancy >= 75;
	if (pregnancy.type === "parasite") {
		let impregnate;
		pregnancy.fetus.forEach(parasite => {
			if (parasite.daysLeft > 0) parasite.daysLeft--;
			if (parasite.stats.gender === "Hermaphrodite" && parasite.daysLeft <= 3) {
				if (parasite.stats.lastEgg > 0) {
					parasite.stats.lastEgg--;
				} else if (V.sexStats[orifice].pregnancy.fetus.length < maxParasites(orifice)) {
					impregnate = clone(parasite);
				}
			}
		});
		if (impregnate) impregnateParasite(impregnate.creature, true, orifice, impregnate);
		pregnancy.fetus = pregnancy.fetus.filter(parasite => parasite.daysLeft > 0 || parasite.fertilised);
		if (!pregnancy.fetus.length) pregnancy.type = null;
	}
}
DefineMacro("parasiteProgressDay", parasiteProgressDay);

// eslint-disable-next-line no-unused-vars
function parasiteProgressTime(pass, orifice = "anus") {
	const pregnancy = V.sexStats[orifice].pregnancy;
	if (pregnancy.type === "parasite") {
		pregnancy.fetus.forEach(parasite => {
			if (parasite.fertilised) {
				if (parasite.timeLeft === null) parasite.timeLeft = parasite.stats.speed;
				parasite.timeLeft -= pass;
				if (parasite.timeLeft <= 0) {
					parasite.timeLeft = parasite.stats.speed;
					if (!V.daily.parasiteEvent) {
						V.daily.parasiteEvent = [];
					}
					if (parasite.stats.gender === "Hermaphrodite" && parasite.daysLeft <= 3) {
						if ((parasite.daysLeft <= 3 && random(0, 100) < 20) || (parasite.daysLeft === 0 && random(0, 100) < 50)) {
							V.daily.parasiteEvent.pushUnique(orifice + 0);
							if (V.pregnancyStats.parasiteDoctorEvents === 2) V.pregnancyStats.parasiteDoctorEvents = 3;
						} else if (parasite.daysLeft === 0 || random(0, 100) < 60) {
							V.daily.parasiteEvent.pushUnique(orifice + 2);
						}
					} else {
						if ((parasite.daysLeft === 0 && random(0, 100) < 50) || (parasite.daysLeft <= 3 && random(0, 100) < 20)) {
							V.daily.parasiteEvent.pushUnique(orifice + 1);
							if (V.pregnancyStats.parasiteDoctorEvents === 0) V.pregnancyStats.parasiteDoctorEvents = 1;
							if (V.pregnancyStats.parasiteDoctorEvents >= 2) pregnancy.parasiteFeltMovement = true;
						} else if (parasite.daysLeft === 0 || (parasite.daysLeft <= 3 && random(0, 100) < 60)) {
							V.daily.parasiteEvent.pushUnique(orifice + 2);
						} else if (parasite.daysLeft < 7 && random(0, 100) < 50) {
							V.daily.parasiteEvent.pushUnique(orifice + 3);
						}
					}
					if (V.daily.parasiteEvent.length > 0) V.effectsmessage = 1;
				}
			}
		});
	}
}

/**
 * Tries to put a parasite in an orifice.
 *
 * @param {string} parasiteType the creature, e.g. "Lurker", "vine", "slimes"
 * @param {number|true} chance weight for the roll, scaled down by how many parasites are already
 *   there. Pass true to skip the roll and always take
 * @param {"anus"|"vagina"} [orifice="anus"] where it goes
 * @param {object} [hermParasite] the parent parasite when a herm parasite seeds a new one
 * @returns {boolean} whether one took
 */
function impregnateParasite(parasiteType, chance, orifice = "anus", hermParasite) {
	if (V.settings.parasitePregnancyEnabled === false || !parasiteType || (!V.player.vaginaExist && orifice === "vagina")) return false;
	if (V.sexStats.pills.pills["Anti-Parasite Cream"] && V.sexStats.pills.pills["Anti-Parasite Cream"].doseTaken && !hermParasite) return false;

	const pregnancy = V.sexStats[orifice].pregnancy;

	if (pregnancy.fetus.length >= maxParasites(orifice) || (pregnancy.type !== null && pregnancy.type !== "parasite")) return false;

	const rngCheck = chance === true || random(0, 100) <= 1 + chance / (pregnancy.fetus.length + 1);

	if (rngCheck) {
		switch (parasiteType) {
			case "slimes":
			case "pale slimes":
			case "eels":
			case "worms":
			case "snakes":
			case "spiders":
			case "slugs":
			case "maggots":
				parasiteType = toTitleCase(parasiteType);
				parasiteType = parasiteType.substring(0, parasiteType.length - 1);
				break;
			default:
				parasiteType = toTitleCase(parasiteType);
				break;
		}

		const newPregnancy = generateParasitePregnancy({
			parasiteType,
			orifice,
			hermParasite,
		});
		if (newPregnancy && typeof newPregnancy !== "string") {
			V.sexStats[orifice].pregnancy = {
				...pregnancy,
				...newPregnancy,
			};
			if (!hermParasite) T.impreg = true;
			return true;
		}
	}
	return false;
}
DefineMacro("impregnateParasite", impregnateParasite);

/**
 * How many parasites this orifice can hold at once.
 *
 * @param {"anus"|"vagina"} orifice the orifice it targets
 * @returns {number} 1, 2, or 4
 */
function maxParasites(orifice = "anus") {
	switch (V.sexStats[orifice].pregnancy.motherStatus) {
		case 1:
			return 2;
		case 2:
			return 4;
		default:
			return 1;
	}
}
window.maxParasites = maxParasites;

/**
 * Whether parasites are occupying an orifice. The other orifice is unaffected.
 *
 * @param {"anus"|"vagina"} orifice the orifice to check
 * @returns {boolean}
 */
function orificeHasParasites(orifice) {
	return V.sexStats[orifice].pregnancy.fetus.length > 0;
}
window.orificeHasParasites = orificeHasParasites;

/**
 * Whether a real pregnancy is holding this orifice against parasites.
 * A free Beta second womb is still open to them, so one womb carrying a baby does not shut the other one out.
 *
 * @param {"anus"|"vagina"} orifice the orifice to check
 * @returns {boolean}
 */
function pregnancyBlocksParasites(orifice) {
	if (!getActivePregnancy("pc", orifice)) return false;
	return !(orifice === "vagina" && betaSecondWombOpen());
}
window.pregnancyBlocksParasites = pregnancyBlocksParasites;

/**
 * Checks whether the PC can get a new parasite in this orifice.
 * Requires parasites to be enabled, no active protection or pregnancy blocking it, and at least one free parasite slot.
 *
 * @param {"anus"|"vagina"} orifice
 * @returns {boolean}
 */
function canImpregnateParasite(orifice = "anus") {
	if (V.settings.parasitePregnancyEnabled === false || (orifice === "vagina" && !V.player.vaginaExist)) return false;
	if (V.sexStats.pills.pills["Anti-Parasite Cream"] && V.sexStats.pills.pills["Anti-Parasite Cream"].doseTaken) return false;
	if (pregnancyBlocksParasites(orifice)) return false;
	const pregnancy = V.sexStats[orifice].pregnancy;

	if ((pregnancy.type !== null && pregnancy.type !== "parasite") || pregnancy.fetus.length >= maxParasites(orifice)) return false;

	return true;
}
window.canImpregnateParasite = canImpregnateParasite;

/**
 * Checks if pc can host a pregnancy in this orifice and returns the parasite pregnancy object
 * ($sexStats[orifice].pregnancy) to add to or an error string when something blocks it.
 *
 * @param {string} parasiteType the parasite to add
 * @param {"anus"|"vagina"} orifice the orifice it targets
 * @returns {object|string} the pregnancy object to add to, or an error string when blocked
 */
function parasitePrep(parasiteType, orifice) {
	if (!["anus", "vagina"].includes(orifice)) return `Invalid orifice '${orifice}' set`;
	if (orifice === "vagina" && !V.player.vaginaExist) return "Player doesn't have a vagina for pregnancy";

	const pregnancy = V.sexStats[orifice].pregnancy;
	// An active pregnancy, or a non-parasite occupant, blocks the orifice. A free Beta womb doesn't.
	if (pregnancyBlocksParasites(orifice) || (pregnancy.type !== "parasite" && pregnancy.fetus.length)) {
		return "Player currently pregnant and cannot support other types";
	}
	if (pregnancy.fetus.length >= maxParasites(orifice)) return "Player does not have room for more parasites";

	return pregnancy;
}

/**
 * Builds the replacement parasite pregnancy state for an orifice.
 *
 * @param {object} opts
 * @param {string} opts.parasiteType the parasite to add
 * @param {object|null} [opts.hermParasite] the parent parasite when a herm parasite seeds a new one
 * @param {"anus"|"vagina"} [opts.orifice] the orifice it targets
 * @returns {object|string} the new pregnancy fields to merge in, or an error string when blocked
 */
function generateParasitePregnancy({ parasiteType, hermParasite = null, orifice = "anus" }) {
	const pregnancy = parasitePrep(parasiteType, orifice);
	if (typeof pregnancy === "string") return pregnancy;

	/*
		creature: the type of creature it is. "Lurker", "Slime", "Pale Tentacle", etc
		fertilised: whether it's fertilised or not. Parasites need to be fertilised before they can be birthed
		daysLeft: how long until it can be birthed. Birthing is possible when it's 3 or less, but significantly more likely at 0
		timeLeft: how long until it prompts a daily event. Speed impacts how fast it goes down
		stats.growth: how long it takes to birth and how much the parasite is worth when selling
		stats.speed: how often it prompts a daily event. Also determines the parasite's activity
	*/
	const result = { fetus: clone(pregnancy.fetus), type: "parasite" };
	const parasite = {
		creature: parasiteType,
		fertilised: !!hermParasite,
		daysLeft: 1,
		timeLeft: null,
		stats: {
			growth: random(7, 14),
			speed: random(60, 360),
		},
	};
	if (hermParasite) {
		parasite.daysLeft = Math.floor(hermParasite.stats.growth * 0.8);
		parasite.stats.growth = Math.floor(hermParasite.stats.growth * 0.8);
		parasite.stats.speed = Math.floor(hermParasite.stats.speed * 0.8);
	} else {
		if (parasiteType.includes("Pale")) {
			// Pale parasites have significantly better activity
			parasite.stats.speed *= 0.6;
		} else if (parasiteType.includes("Tentacle") || parasiteType.includes("Vine")) {
			// Tentacles and vines have better activity. Done in an elseif so pale tentacles don't get the calculation twice
			parasite.stats.speed *= 0.9;
		}
		if (parasiteType.includes("Vine") && random(0, 100) > 99) {
			// Vine Vine easter egg lol
			parasite.creature += " Vine";
			parasite.stats.growth--;
		}
		if (parasiteType.includes("Lurker")) {
			// Lurkers have better activity, but sell for less and take longer to birth
			parasite.stats.growth += 14;
			for (let i = 0; i < 3; i++) {
				if (parasite.stats.speed >= 100) {
					parasite.stats.speed -= 50;
				}
			}
		}
	}

	const genderCheck = random(0, 100);
	if (genderCheck < 70) {
		// Female parasites are most likely
		parasite.stats.gender = "Female";
	} else if (genderCheck > 90 && maxParasites(orifice) > 1 && !pregnancy.fetus.find(currentParasite => currentParasite.stats.gender === "Hermaphrodite")) {
		// You can only get a futa if you're ready for a futa and don't currently have one
		parasite.stats.gender = "Hermaphrodite";
		parasite.stats.lastEgg = Math.floor(parasite.stats.growth / 3);
	} else {
		parasite.stats.gender = "Male";
	}
	result.fetus.push(clone(parasite));

	T.impregnatedParasite = orifice;
	return result;
}

/**
 * DoLX: fertility bonus from a latched tummy parasite, 0 to 0.75.
 *
 * Nothing for the first two weeks, then a linear ramp to 75% over the following
 * fortnight, capped there. Read by the child generator to swell the PC's litters.
 *
 * @returns {number} 0 to 0.75
 */
function tummyParasiteFertilityBonus() {
	const p = V.parasite && V.parasite.tummy;
	if (!p || !p.name || !p.latchedMinutes) return 0;

	const startMinutes = 14 * 24 * 60; // 2 weeks
	const peakMinutes = 30 * 24 * 60; // ~1 month
	if (p.latchedMinutes < startMinutes) return 0;

	const progress = Math.clamp((p.latchedMinutes - startMinutes) / (peakMinutes - startMinutes), 0, 1);
	return 0.75 * progress;
}
window.tummyParasiteFertilityBonus = tummyParasiteFertilityBonus;
