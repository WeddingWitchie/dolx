/**
 * As the v0.17.0 DoLX update, DNA separated gender-identity and pill related handling:
 * - JS-side logic moved/split from `xchange.js` into `identity.js`
 * - The split also applied for the corresponding Twine-side logic
 * =========================
 * Important!
 * Some gender-identity "core" functions / related utilities are still live inside `xchange.js`.
 * If what you're looking for isn't defined here, there's a good chance it's still in `xchange.js`
 * (likewise, some mirrored behavior may be in `identity.twee` and its Twine-side correspondence)
**/

function playerCaresForGender() {
	return V.xchange.genderIdentityEnabled === 1;
}
window.playerCaresForGender = playerCaresForGender;

function genderIsIgnored() {
	return V.xchange.disregardGender === 1;
}
window.genderIsIgnored = genderIsIgnored;

function playerBodyIsMale() {
	return (V.player.gender === "m" && !playerIsXChanged()) || (V.player.gender === "f" && playerIsXChanged());
}
window.playerBodyIsMale = playerBodyIsMale;

function playerBodyIsFemale() {
	return (V.player.gender === "f" && !playerIsXChanged()) || (V.player.gender === "m" && playerIsXChanged());
}
window.playerBodyIsFemale = playerBodyIsFemale;

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

// --- Hypno crossdress / genderify handling ---
	V.cheats = V.cheats || {};
	const genderifyActive = !!(V.xchange?.pill?.active && V.xchange.pill.genderificationEffect);
	const hypnoCrossdressLevel = V.cheats.disableHypnoCrossdress ? 0 : (V.hypnosis_traits?.crossdressing || 0);

	/*
	* Hypno crossdress / genderify should still run even when the player cares for gender.
	* Use the player's baseline gender for the compulsion direction so body changes from X-Change
	* do not flip the urge from feminine to masculine mid-pill.
	*/
	if (genderifyActive || hypnoCrossdressLevel >= 1) {
		if (V.player.gender === "m" && currentWornFemininity < 0) {
			wikifier("stress", 30 * hours, 1);
			V.genderificationStressMessage = 1;
			V.effectsmessage = 1;
		}
		else if (
			V.player.gender === "m" &&
			currentWornFemininity > 0 &&
			(genderifyActive || hypnoCrossdressLevel < 4)
		) {
			wikifier("stress", -3 * hours, 1);
			V.tiredness -= 50 * hours;
			/* Throttle the positive message to avoid spam, show ~50% of the time */
			if (Math.random() < 0.50) {
				V.genderificationStressMessage = 2;
				V.effectsmessage = 1;
			}
		}

		if (V.player.gender === "f" && currentWornFemininity > 0) {
			wikifier("stress", 30 * hours, 1);
			V.genderificationStressMessage = 3;
			V.effectsmessage = 1;
		}
		else if (
			V.player.gender === "f" &&
			currentWornFemininity < 0 &&
			(genderifyActive || hypnoCrossdressLevel < 4)
		) {
			wikifier("stress", -3 * hours, 1);
			V.tiredness -= 50 * hours;
			/* Throttle the positive message to avoid spam, show ~50% of the time */
			if (Math.random() < 0.50) {
				V.genderificationStressMessage = 4;
				V.effectsmessage = 1;
			}
		}
	}
	else if (playerCaresForGender()) {
		if (hasFemClothesRejection && !hasFemClothesAcceptance && currentWornFemininity > 0) {
			wikifier("stress", 30 * hours, 1);
			V.genderStressMessage = 2;
			V.effectsmessage = 1;
		}
		else if (!hasFemClothesRejection && !hasFemClothesAcceptance && currentWornFemininity > 0) {
			wikifier("stress", 20 * hours, 1);
			V.genderStressMessage = 1;
			V.effectsmessage = 1;
		}
		else if (hasMascClothesRejection && !hasMascClothesAcceptance && currentWornFemininity < 0) {
			wikifier("stress", 30 * hours, 1);
			V.genderStressMessage = 4;
			V.effectsmessage = 1;
		}
		else if (!hasMascClothesRejection && !hasMascClothesAcceptance && currentWornFemininity < 0) {
			wikifier("stress", 20 * hours, 1);
			V.genderStressMessage = 3;
			V.effectsmessage = 1;
		}
	}
}
window.hourlyClothingFemininityCheck = hourlyClothingFemininityCheck;

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
		case "Lactation": {
			// Lactation dysphoria should trigger when the player is lactating AND lactation content is enabled.
			// Some builds use V.settings.breastFeedingEnabled; older saves/builds may still have V.breastfeedingdisable ("f" = not disabled).
			const lactating = Number(V.lactating) >= 1;
			const enabled = (V.settings && V.settings.breastFeedingEnabled === true) || V.breastfeedingdisable === "f";
			return (lactating && enabled) ? 2 : 0;
		}
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
			femininity += (!!V.identity.presentation.pronouns.preferredMasculine) * -100;
			break;
		case "Feminine Pronouns":
			femininity += Number(V.identity.presentation.pronouns.feminine.acceptance) * 100;
			femininity += Number(V.identity.presentation.pronouns.feminine.reject) * -100;
			femininity += (!!V.identity.presentation.pronouns.preferredFeminine) * 100;
			break;
		case "Neutral Pronouns":
			femininity += Number(V.identity.presentation.pronouns.neutral.acceptance) * 0;
			femininity += Number(V.identity.presentation.pronouns.neutral.reject) * -0;
			femininity += (!!V.identity.presentation.pronouns.preferredNeutral) * 0;
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
			femininity += (!!V.identity.body.genitals.preferredVagina) * 50;
			break;
		case "Small Penis":
			femininity += Number(V.identity.body.genitals.smallpenis.acceptance) * -25;
			femininity += Number(V.identity.body.genitals.smallpenis.reject) * 25;
			femininity += (V.identity.body.genitals.preferredPenis === "smallpenis") * -25;
			break;
		case "Medium Penis":
			femininity += Number(V.identity.body.genitals.mediumpenis.acceptance) * -50;
			femininity += Number(V.identity.body.genitals.mediumpenis.reject) * 50;
			femininity += (V.identity.body.genitals.preferredPenis === "mediumpenis") * -50;
			break;
		case "Big Penis":
			femininity += Number(V.identity.body.genitals.bigpenis.acceptance) * -50;
			femininity += Number(V.identity.body.genitals.bigpenis.reject) * 50;
			femininity += (V.identity.body.genitals.preferredPenis === "bigpenis") * -50;
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
			else if (playerHasCharacteristic("Miniature Body")) return "Miniature Body";
			else if (playerHasCharacteristic("Small Body")) return "Small Body";
			else if (playerHasCharacteristic("Tall Body")) return "Tall Body";
			else if (playerHasCharacteristic("Normal Body")) return "Normal Body";
			else if (playerHasCharacteristic("Large Body")) return "Large Body";
			else return "Giant Body";
		default:
			return false;
	}
}
window.identityCharacteristicCategory = identityCharacteristicCategory;

function preferredPronouns(gender) {
	const pronouns = V.identity.presentation.pronouns;
	const dynamicMode = pronouns.pronounDynamicMode || "";
	switch(gender) {
		case "m":
			if (pronouns.preferredMasculine && !dynamicMode) return true;
			if (dynamicMode === "body") return V.player.penisExist;
			else if (dynamicMode === "clothing") {
				if (playerHasCharacteristic("Masculine Clothing")) return true;
				else return false;
			}
			else if (dynamicMode === "appearance") return V.player.gender_appearance === "m";
			else if (dynamicMode === "posture") return V.player.gender_posture === "m";
			return !!pronouns.preferredMasculine;
		case "f":
			if (pronouns.preferredFeminine && !dynamicMode) return true;
			if (dynamicMode === "body") return V.player.vaginaExist;
			else if (dynamicMode === "clothing") {
				if (playerHasCharacteristic("Feminine Clothing")) return true;
				else return false;
			}
			else if (dynamicMode === "appearance") return V.player.gender_appearance === "f";
			else if (dynamicMode === "posture") return V.player.gender_posture === "f";
			return !!pronouns.preferredFeminine;
		default:
			return false;
	}
}
window.preferredPronouns = preferredPronouns;

function getIdentityMeterDirection(characteristic) {
	switch (characteristic) {
		/* Universal axis:
		 *   min	= strongly masculine
		 *   max	= strongly feminine
		So masculine-leaning traits should push NEGATIVE and feminine-leaning POSITIVE. */
		case "Masculine Clothing":
		case "Masculine Appearance":
		case "Masculine Pronouns":
		case "Small Penis":
		case "Medium Penis":
		case "Big Penis":
		case "Flat Chest":
		case "Short Hair":
		case "Tall Body":
		case "Large Body":
		case "Giant Body":
			return { dir: -1, weight: 1 };
		case "Feminine Clothing":
		case "Feminine Appearance":
		case "Feminine Pronouns":
		case "Vagina":
		case "Medium Breasts":
		case "Big Breasts":
		case "Medium Ass":
		case "Big Ass":
		case "Long Hair":
		case "Pregnancy":
		case "Lactation":
			return { dir: 1, weight: 1 };
		/* Neutral-ish */
		case "Neutral Pronouns":
		case "Medium Hair":
		case "Small Breasts":
		case "Small Ass":
		case "Miniature Body":
		case "Tiny Body":
		case "Small Body":
		case "Normal Body":
			return { dir: 0, weight: 1.25 };
		default:
			return { dir: 0, weight: 0 };
	}
}
window.getIdentityMeterDirection = getIdentityMeterDirection;

function selectIdentityCharacteristic(characteristic) {
	let option;
	let preferred = false;
	const id = V.identity || {};
	const x = V.xchange || {};
	const presentation = id.presentation || {};
	const body = id.body || {};
	switch (characteristic) {
		case "Masculine Clothing":
			option = presentation.clothing?.masculine;
			preferred = presentation.clothing?.preferred === "m";
			break;
		case "Feminine Clothing":
			option = presentation.clothing?.feminine;
			preferred = presentation.clothing?.preferred === "f";
			break;
		case "Masculine Appearance":
			option = presentation.appearance?.masculine;
			preferred = presentation.appearance?.preferred === "m";
			break;
		case "Feminine Appearance":
			option = presentation.appearance?.feminine;
			preferred = presentation.appearance?.preferred === "f";
			break;
		case "Masculine Pronouns":
			option = presentation.pronouns?.masculine;
			preferred = !!presentation.pronouns?.preferredMasculine;
			break;
		case "Feminine Pronouns":
			option = presentation.pronouns?.feminine;
			preferred = !!presentation.pronouns?.preferredFeminine;
			break;
		case "Neutral Pronouns":
			option = presentation.pronouns?.neutral;
			preferred = !!presentation.pronouns?.preferredNeutral;
			break;
		case "Flat Chest":
			if (x.giBreastSizeEnabled) { option = body.chest?.flat; preferred = body.chest?.preferred === "flat"; }
			break;
		case "Small Breasts":
			if (x.giBreastSizeEnabled) { option = body.chest?.small; preferred = body.chest?.preferred === "small"; }
			break;
		case "Medium Breasts":
			if (x.giBreastSizeEnabled) { option = body.chest?.medium; preferred = body.chest?.preferred === "medium"; }
			break;
		case "Big Breasts":
			if (x.giBreastSizeEnabled) { option = body.chest?.big; preferred = body.chest?.preferred === "big"; }
			break;
		case "Small Ass":
			if (x.giAssSizeEnabled) { option = body.bottom?.small; preferred = body.bottom?.preferred === "small"; }
			break;
		case "Medium Ass":
			if (x.giAssSizeEnabled) { option = body.bottom?.medium; preferred = body.bottom?.preferred === "medium"; }
			break;
		case "Big Ass":
			if (x.giAssSizeEnabled) { option = body.bottom?.big; preferred = body.bottom?.preferred === "big"; }
			break;
		case "Vagina":
			if (x.giGenitalsEnabled) { option = body.genitals?.vagina; preferred = !!body.genitals?.preferredVagina; }
			break;
		case "Small Penis":
			if (x.giGenitalsEnabled) { option = body.genitals?.smallpenis; preferred = body.genitals?.preferredPenis === "smallpenis"; }
			break;
		case "Medium Penis":
			if (x.giGenitalsEnabled) { option = body.genitals?.mediumpenis; preferred = body.genitals?.preferredPenis === "mediumpenis"; }
			break;
		case "Big Penis":
			if (x.giGenitalsEnabled) { option = body.genitals?.bigpenis; preferred = body.genitals?.preferredPenis === "bigpenis"; }
			break;
		case "Short Hair":
			if (x.giHairLengthEnabled) { option = body.hairlength?.short; preferred = body.hairlength?.preferred === "short"; }
			break;
		case "Medium Hair":
			if (x.giHairLengthEnabled) { option = body.hairlength?.medium; preferred = body.hairlength?.preferred === "medium"; }
			break;
		case "Long Hair":
			if (x.giHairLengthEnabled) { option = body.hairlength?.long; preferred = body.hairlength?.preferred === "long"; }
			break;
		case "Miniature Body":
			if (x.giBodySizeEnabled) { option = body.bodysize?.miniature; preferred = body.bodysize?.preferred === "miniature"; }
			break;
		case "Tiny Body":
			if (x.giBodySizeEnabled) { option = body.bodysize?.tiny; preferred = body.bodysize?.preferred === "tiny"; }
			break;
		case "Small Body":
			if (x.giBodySizeEnabled) { option = body.bodysize?.small; preferred = body.bodysize?.preferred === "small"; }
			break;
		case "Normal Body":
			if (x.giBodySizeEnabled) { option = body.bodysize?.normal; preferred = body.bodysize?.preferred === "normal"; }
			break;
		case "Tall Body":
			if (x.giBodySizeEnabled) { option = body.bodysize?.tall; preferred = body.bodysize?.preferred === "tall"; }
			break;
		case "Large Body":
			if (x.giBodySizeEnabled) { option = body.bodysize?.large; preferred = body.bodysize?.preferred === "large"; }
			break;
		case "Giant Body":
			if (x.giBodySizeEnabled) { option = body.bodysize?.giant; preferred = body.bodysize?.preferred === "giant"; }
			break;
		case "Lactation":
			if (x.giFecundityEnabled) { option = body.lactation; preferred = body.lactation?.preferred === "lactation"; }
			break;
		case "Pregnancy":
			if (x.giFecundityEnabled) { option = body.pregnancy; preferred = body.pregnancy?.preferred === "pregnancy"; }
			break;
	}
	return { option, preferred };
}
window.selectIdentityCharacteristic = selectIdentityCharacteristic;

function getIdentityMeterGroup(characteristic) {
	switch (characteristic) {
		case "Masculine Pronouns":
		case "Feminine Pronouns":
		case "Neutral Pronouns":
			return "pronouns";
		case "Masculine Appearance":
		case "Feminine Appearance":
			return "appearance";
		case "Masculine Clothing":
		case "Feminine Clothing":
			return "clothing";
		case "Flat Chest":
		case "Small Breasts":
		case "Medium Breasts":
		case "Big Breasts":
			return "chest";
		case "Small Ass":
		case "Medium Ass":
		case "Big Ass":
			return "ass";
		case "Vagina":
		case "Small Penis":
		case "Medium Penis":
		case "Big Penis":
			return "genitals";
		case "Short Hair":
		case "Medium Hair":
		case "Long Hair":
			return "hair";
		case "Miniature Body":
		case "Tiny Body":
		case "Small Body":
		case "Normal Body":
		case "Tall Body":
		case "Large Body":
		case "Giant Body":
			return "bodysize";
		case "Pregnancy":
			return "pregnancy";
		case "Lactation":
			return "lactation";
		default:
			return false;
	}
}
window.getIdentityMeterGroup = getIdentityMeterGroup;

function isIdentityMeterCharacteristicEnabled(characteristic) {
	const x = V.xchange || {};
	switch (getIdentityMeterGroup(characteristic)) {
		case "chest":
			return x.giBreastSizeEnabled === true;
		case "ass":
			return x.giAssSizeEnabled === true;
		case "genitals":
			return x.giGenitalsEnabled === true;
		case "hair":
			return x.giHairLengthEnabled === true;
		case "bodysize":
			return x.giBodySizeEnabled === true;
		case "pregnancy":
		case "lactation":
			return x.giFecundityEnabled === true;
		default:
			return true;
	}
}
window.isIdentityMeterCharacteristicEnabled = isIdentityMeterCharacteristicEnabled;

function isIdentityMeterCharacteristicSelected(characteristic) {
	if (!isIdentityMeterCharacteristicEnabled(characteristic)) return false;
	const selected = selectIdentityCharacteristic(characteristic);
	const option = selected.option;
	const preferred = selected.preferred;
	if (!option) return false;
	return !!(
		preferred ||
		option.acceptance === true ||
		option.reject === true ||
		(Number(option.dysphoria) || 0) > 0
	);
}
window.isIdentityMeterCharacteristicSelected = isIdentityMeterCharacteristicSelected;

function getIdentityMeterSupport(characteristic) {
	if (typeof setup === "undefined" || !setup.identityIndex) return 0;
	if (!isIdentityMeterCharacteristicEnabled(characteristic)) return 0;
	const selected = selectIdentityCharacteristic(characteristic);
	const option = selected.option;
	const preferred = selected.preferred;
	if (!option) return 0;

	let support = 0;
	if (preferred) support += 0.75;
	if (option.acceptance === true) support += 0.25;
	if (option.reject === true) support -= 1.0;

	const dys = Number(option.dysphoria) || 0;
	support -= Math.clamp((dys / 100) * 0.6, 0, 0.6);

	return Math.clamp(support, -1, 1);
}
window.getIdentityMeterSupport = getIdentityMeterSupport;

function mapToLegacyGenderIdentity() {
	const range = Number(V.xchange?.giRange) || 1500;
	const meterVersion = 7;
	const groups = {};
	if (!V.xchange) V.xchange = {};

	/* Early boot / partially initialized saves: avoid crashing before $player exists. */
	if (!V.player || typeof V.player !== "object") {
		V.xchange.giAxis = 0;
		return V.xchange.giTarget;
	}

	if (setup?.identityIndex) {
		for (const category in setup.identityIndex) {
			for (const characteristic in setup.identityIndex[category]) {
				const group = getIdentityMeterGroup(characteristic) || category;
				const { dir, weight } = getIdentityMeterDirection(characteristic);
				if (!weight) continue;
				if (!isIdentityMeterCharacteristicSelected(characteristic)) continue;
				const support = getIdentityMeterSupport(characteristic);
				if (Math.abs(support) <= 1e-6) continue;
				if (!groups[group]) groups[group] = { sum: 0, weight: 0, included: [] };
				groups[group].sum += dir * support * weight;
				groups[group].weight += weight;
				groups[group].included.push({ characteristic, dir, weight, support });
			}
		}
	}

	let categorySum = 0;
	let categoryCount = 0;
	const groupAxis = {};
	for (const [group, data] of Object.entries(groups)) {
		if (!(data.weight > 0)) continue;
		const axis = Math.clamp(data.sum / data.weight, -1, 1);
		groupAxis[group] = axis;
		categorySum += axis;
		categoryCount += 1;
	}

	/* Universal meter:
	 *   axis -1 => fully masculine => 0
	 *   axis +1 => fully feminine => range
	 * Do NOT flip by the player's starting gender.
	 * When no identity topics are active, default based on player's current gender */
	let axis;
	if (categoryCount === 0) {
		axis = V.player?.gender === "f" ? 1 : -1;
	} else {
		axis = Math.clamp(categorySum / categoryCount, -1, 1);
	}
	const absVal = Math.round(((axis + 1) / 2) * range);

	V.xchange.giGroupAxis = groupAxis;
	V.xchange.giAxis = axis;
	V.xchange.giTarget = absVal;

	/* === Full breakdown for the Statistics "Choice Breakdown" foldout ===
	 * Re-walks every enabled characteristic so the UI can show even the ones that currently push nothing (e.g. "Not accepted" with zero dysphoria)
	 * Three buckets per group:
	 *   included  — actually moves the meter (|effect| > 0)
	 *   diluting  — has a stance but dir is neutral, so it only pulls the
	 *               group's axis toward centre (contributes weight, no push)
	 *   dormant   — no stance at all (unaccepted, no dysphoria, not preferred)
	 * This is derived data; safe to overwrite every call */
	const breakdown = {};
	if (setup?.identityIndex) {
		for (const category in setup.identityIndex) {
			for (const characteristic in setup.identityIndex[category]) {
				const group = getIdentityMeterGroup(characteristic) || category;
				const { dir, weight } = getIdentityMeterDirection(characteristic);
				if (!weight) continue;
				if (!isIdentityMeterCharacteristicEnabled(characteristic)) continue;

				const selected = selectIdentityCharacteristic(characteristic);
				const opt = selected.option || {};
				const preferred = !!selected.preferred;
				const accepted = opt.acceptance === true;
				const rejected = opt.reject === true;
				const dysphoria = Number(opt.dysphoria) || 0;
				const hasStance = preferred || accepted || rejected || dysphoria > 0;
				const support = hasStance ? getIdentityMeterSupport(characteristic) : 0;
				const effect = dir * support * weight;

				if (!breakdown[group]) {
					breakdown[group] = {
						axis: (group in groupAxis) ? groupAxis[group] : 0,
						included: [],
						diluting: [],
						dormant: [],
					};
				}

				const entry = {
					characteristic, dir, weight, support, effect,
					preferred, accepted, rejected, dysphoria,
				};

				if (!hasStance) {
					breakdown[group].dormant.push(entry);
				} else if (Math.abs(effect) > 1e-6) {
					breakdown[group].included.push(entry);
				} else {
					/* Has a stance but dir is 0 (neutral-axis trait); contributes weight only, pulling the group's axis toward centre. */
					breakdown[group].diluting.push(entry);
				}
			}
		}
	}
	V.xchange.giBreakdown = breakdown;

	if (V.genderidentity === undefined || Number.isNaN(V.genderidentity) || V.xchange.giMeterVersion !== meterVersion) {
		V.genderidentity = V.xchange.giTarget;
		V.xchange.giInitialized = true;
		V.xchange.giMeterVersion = meterVersion;
	}
	V.genderidentity = Math.clamp(V.genderidentity, 0, range);
	return V.xchange.giTarget;
}
window.mapToLegacyGenderIdentity = mapToLegacyGenderIdentity;

function hasGenderIdentity(stage) {
	mapToLegacyGenderIdentity();
	const range = Number(V.xchange?.giRange) || 1500;
	const current = Math.clamp(Number(V.genderidentity) || 0, 0, range);
	const threshold = ratio => Math.round(range * ratio);

	switch (stage) {
		case 8:
			return current >= range;
		case 7:
			return current >= threshold(13 / 15);
		case 6:
			return current >= threshold(11 / 15);
		case 5:
			return current >= threshold(9 / 15);
		case 4:
			return current >= threshold(6 / 15);
		case 3:
			return current >= threshold(4 / 15);
		case 2:
			return current >= threshold(2 / 15);
		case 1:
			return current >= 1;
		case 0:
			return current <= 0;
		default:
			return false;
	}
}
window.hasGenderIdentity = hasGenderIdentity;

function playerFeelsManlike() {
	mapToLegacyGenderIdentity();
	const range = Number(V.xchange?.giRange) || 1500;
	const current = Math.clamp(Number(V.genderidentity) || 0, 0, range);
	return current <= Math.round(range * (6 / 15));
}
window.playerFeelsManlike = playerFeelsManlike;

function playerFeelsGirllike() {
	mapToLegacyGenderIdentity();
	const range = Number(V.xchange?.giRange) || 1500;
	const current = Math.clamp(Number(V.genderidentity) || 0, 0, range);
	return current >= Math.round(range * (9 / 15));
}
window.playerFeelsGirllike = playerFeelsGirllike;


/***
 *     ██████  ██████  ██████  ███████     ██   ██ ███████ ██      ██████  ███████ ██████
 *    ██      ██    ██ ██   ██ ██          ██   ██ ██      ██      ██   ██ ██      ██   ██
 *    ██      ██    ██ ██████  █████       ███████ █████   ██      ██████  █████   ██████
 *    ██      ██    ██ ██   ██ ██          ██   ██ ██      ██      ██      ██      ██   ██
 *     ██████  ██████  ██   ██ ███████     ██   ██ ███████ ███████ ██      ███████ ██   ██
 *
 */
(() => {
	// Ensure setup exists
	if (typeof window.setup !== "object" || window.setup === null) {
		window.setup = {};
	}

	// Ensure Math.clamp exists (some forks have it, some don't)
	if (typeof Math.clamp !== "function") {
		Math.clamp = (n, min, max) => Math.min(max, Math.max(min, n));
	}

	// Valid bodysize values in build
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
	// Ensure setup exists
	if (typeof window.setup !== "object" || window.setup === null) {window.setup = {};}

	// Ensure Math.clamp exists
	if (typeof Math.clamp !== "function") {Math.clamp = (n, min, max) => Math.min(max, Math.max(min, n));}

	// Back-compat: old saves may be missing newer X-Change pill fields.
	// We only fill in missing fields; we don't wipe or "sanitise" existing data.
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
		V.xchange.heat ??= {};
		if (V.xchange.heat.permanentOn === undefined) {
			V.xchange.heat.permanentOn = 0;
		}
		
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

		// Ensure $ballssize always exists (female-start characters may never have it initialised,
		// which causes NaN when save-body runs Number($ballssize)).
		if (V.ballssize === undefined || V.ballssize === null || !Number.isFinite(Number(V.ballssize))) {
			V.ballssize = V.player?.ballsExist ? 0 : -2;
		}

		// Repair corrupted cached body snapshots from older versions.
		// Old saves may have NaN penissize/ballssize/hair baked into the snapshot.
		const pill = V.xchange?.pill;
		if (pill) {
			const slots = ["originalBody", "changedBody", "hermBody"];
			for (const slot of slots) {
				const body = pill[slot];
				if (!body || typeof body !== "object" || !Object.keys(body).length) continue;

				// Fix penissize
				if ("penissize" in body && !Number.isFinite(Number(body.penissize))) {
					body.penissize = body.penisExist ? 0 : -2;
				}

				// Fix ballssize
				if ("ballssize" in body && !Number.isFinite(Number(body.ballssize))) {
					body.ballssize = body.ballsExist ? 0 : -2;
				}

				// Fix breastsize
				if ("breastsize" in body && !Number.isFinite(Number(body.breastsize))) {
					body.breastsize = 0;
				}

				// Fix bottomsize
				if ("bottomsize" in body && !Number.isFinite(Number(body.bottomsize))) {
					body.bottomsize = 2;
				}

				// Fix undefined hair fields that cause image path errors
				if (body.hairtype === undefined) body.hairtype = V.hairtype ?? "default";
				if (body.hairlength === undefined || !Number.isFinite(Number(body.hairlength))) {
					body.hairlength = Number.isFinite(Number(V.hairlength)) ? V.hairlength : 200;
				}
				if (body.fringetype === undefined) body.fringetype = V.fringetype ?? "default";
				if (body.fringelength === undefined || !Number.isFinite(Number(body.fringelength))) {
					body.fringelength = Number.isFinite(Number(V.fringelength)) ? V.fringelength : 200;
				}
				if (body.haircolour === undefined) body.haircolour = V.haircolour ?? "brown";
				if (body.naturalhaircolour === undefined) body.naturalhaircolour = V.naturalhaircolour ?? body.haircolour ?? "brown";
				if (body.hairfringecolour === undefined) body.hairfringecolour = V.hairfringecolour ?? body.haircolour ?? "brown";
			}

			// Also repair cloned bodies if present
			if (pill.clonedBody && typeof pill.clonedBody === "object") {
				for (const [name, body] of Object.entries(pill.clonedBody)) {
					if (!body || typeof body !== "object") continue;
					if ("penissize" in body && !Number.isFinite(Number(body.penissize))) {
						body.penissize = body.penisExist ? 0 : -2;
					}
					if ("ballssize" in body && !Number.isFinite(Number(body.ballssize))) {
						body.ballssize = body.ballsExist ? 0 : -2;
					}
				}
			}
		}
	};

	// GI safety: keep the Gender Identity drift system truly OFF unless explicitly enabled,
	// and prevent "armed" drift/stage from firing later.
	setup.xchangeEnsureGiSafety = function () {
		const V = State?.variables;
		if (!V) return;
		V.xchange ??= {};
		const x = V.xchange;

		const toStrictBool = (v) => (v === true || v === 1 || v === "true");

		if (x.genderIdentityEnabled === undefined) x.genderIdentityEnabled = true;
		x.genderIdentityEnabled = toStrictBool(x.genderIdentityEnabled);

		x.giAutoEnabled = toStrictBool(x.giAutoEnabled);
		x.giTransformEnabled = toStrictBool(x.giTransformEnabled);

		// Consent tracks the transform checkbox directly.
		// The checkbox IS the consent, there is no separate consent UI.
		// When transforms are enabled, consent is granted.
		// When transforms are disabled, consent is revoked and drift is cleared.
		x.giTransformConsent = x.giTransformEnabled;

		// Lock behind the same unlock the UI uses.
		// identityCap is NOT checked here — it controls how far the meter can drift,
		// not whether the system is enabled. The genderidentity widget already enforces
		// the cap floor when identityCap is true.
		const unlocked = (V.attitudesControl?.unlockGender === true);
		if (!unlocked) {
			x.giAutoEnabled = false;
			x.giTransformEnabled = false;
			x.giTransformConsent = false;
		}

		// If the system isn't fully enabled, clear queued drift/stage so it can't "fire later".
		if (x.giAutoEnabled !== true || x.giTransformEnabled !== true) {
			x.giDrift = 0;
			x.giShiftStage = 0;
			x.giShiftMode = "";
		}
	};

	// Run once now
	try { setup.xchangeEnsurePillDefaults(); } catch (e) {}
	try { setup.xchangeEnsureCompatGlobals(); } catch (e) {}
	try { setup.xchangeEnsureGiSafety(); } catch (e) {}

	// Run again on every passage start
	if (typeof jQuery === "function") {
		jQuery(document).on(":passagestart", () => {
			try { setup.xchangeEnsurePillDefaults(); } catch (e) {}
			try { setup.xchangeEnsureCompatGlobals(); } catch (e) {}
			try { setup.xchangeEnsureGiSafety(); } catch (e) {}
		});
	}
})();

/* X-CHANGE SAVE REPAIR NOTICE */
window.xChangeQueueNotice = function (id, html) {
	const V = (typeof State !== "undefined" && State.variables) ? State.variables : window.V;
	if (!V) return;

	V.xChangeFlags ??= {};
	if (V.xChangeFlags[id]) return;

	V.xChangeNotices ??= [];
	V.xChangeNotices.push({ id, html });
};
(function () {
	function renderNotices() {
		const V = (typeof State !== "undefined" && State.variables) ? State.variables : window.V;
		if (!V?.xChangeNotices?.length) return;

		V.xChangeFlags ??= {};

		const passEl = document.querySelector("#passage") || document.querySelector(".passage");
		if (!passEl) return;

		while (V.xChangeNotices.length) {
			const n = V.xChangeNotices.shift();
			if (!n || !n.id || V.xChangeFlags[n.id]) continue;

			V.xChangeFlags[n.id] = true;

			const box = document.createElement("div");
			box.innerHTML = n.html;
			box.style.cssText = [
				"border:2px solid #ff4d4d",
				"background:rgba(255,0,0,0.12)",
				"color:#ffb3b3",
				"padding:12px 12px",
				"border-radius:8px",
				"margin:0 0 14px 0",
				"font-size:1em",
				"line-height:1.4",
				"word-break:break-word",
				"overflow-wrap:anywhere",
				"box-sizing:border-box"
			].join(";");

			passEl.prepend(box);
		}
	}

	if (window.jQuery) {
		jQuery(document).on(":passagedisplay", renderNotices);
	} else {
		document.addEventListener(":passagedisplay", renderNotices);
	}
})();

function pruneNPCName() {
  const V = State.variables;
  if (!Array.isArray(V.NPCName) || !Array.isArray(V.NPCNameList)) return;

  const allowed = new Set(setup.NPCNameList);

  for (let i = V.NPCName.length - 1; i >= 0; i--) {
    const nam = V.NPCName[i]?.nam;
    if (typeof nam !== "string" || !allowed.has(nam)) V.NPCName.splice(i, 1);
  }

  const have = new Set(V.NPCName.map(n => n?.nam).filter(n => typeof n === "string"));
  for (let i = V.NPCNameList.length - 1; i >= 0; i--) {
    if (!have.has(V.NPCNameList[i])) V.NPCNameList.splice(i, 1);
  }
}

window.pruneNPCName = pruneNPCName;