/**
 * As the v0.18.0 DoLX update, DNA separated gender-identity and pill related handling:
 * - JS-side logic moved/split from `xchange.js` into `identity.js`
 * - The split also applied for the corresponding Twine-side logic
 * =========================
 * Important:
 * Some gender-identity "core" functions / related utilities are still live inside `xchange.js`.
 * If what you're looking for isn't defined here, there's a good chance it's still in `xchange.js`
 * (likewise, some mirrored behavior may be in `identity.twee` and its Twine-side correspondence).
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
	* If the player actively uses the identity system, let identity preferences decide.
	* Only use the legacy crossdress/genderify inversion when the player does NOT care for gender.
	*/
	const legacyCrossdressMode = (genderifyActive || hypnoCrossdressLevel >= 1) && !playerCaresForGender();

	const bodyIsMale = (typeof playerBodyIsMale === "function")
		? playerBodyIsMale()
		: (!!V.player?.penisExist && !V.player?.vaginaExist);

	const bodyIsFemale = (typeof playerBodyIsFemale === "function")
		? playerBodyIsFemale()
		: (!!V.player?.vaginaExist && !V.player?.penisExist);

	if (legacyCrossdressMode) {
		if (bodyIsMale && currentWornFemininity < 0) {
			wikifier("stress", 800 * hours, 1);
			V.genderificationStressMessage = 1;
			V.effectsmessage = 1;
		}
		else if (
			bodyIsMale &&
			currentWornFemininity > 0 &&
			(genderifyActive || hypnoCrossdressLevel < 4)
		) {
			wikifier("stress", -10 * hours);
			V.tiredness -= 200 * hours;
			V.genderificationStressMessage = 2;
			V.effectsmessage = 1;
		}

		if (bodyIsFemale && currentWornFemininity > 0) {
			wikifier("stress", 800 * hours, 1);
			V.genderificationStressMessage = 3;
			V.effectsmessage = 1;
		}
		else if (
			bodyIsFemale &&
			currentWornFemininity < 0 &&
			(genderifyActive || hypnoCrossdressLevel < 4)
		) {
			wikifier("stress", -10 * hours);
			V.tiredness -= 200 * hours;
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
	

	// GI safety: keep the Gender Identity drift system truly OFF unless explicitly enabled,
	// and prevent "armed" drift/stage from firing later.
	setup.xchangeEnsureGiSafety = function () {
		const V = State?.variables;
		if (!V) return;
		V.xchange ??= {};
		const x = V.xchange;

		const toStrictBool = (v) => (v === true || v === 1 || v === "true");

		// Ensure flags are strict booleans
		if (x.genderIdentityEnabled === undefined) x.genderIdentityEnabled = true;
		x.genderIdentityEnabled = toStrictBool(x.genderIdentityEnabled);

		x.giAutoEnabled = toStrictBool(x.giAutoEnabled);
		x.giTransformEnabled = toStrictBool(x.giTransformEnabled);

		// Consent gate (sticky-off): defaults to current transform setting once, but if transforms are later disabled,
		// consent is revoked and must be explicitly re-enabled by the player.
		if (x.giTransformConsent === undefined) x.giTransformConsent = x.giTransformEnabled;
		x.giTransformConsent = toStrictBool(x.giTransformConsent);

		// Lock behind the same unlock the UI uses
		const unlocked = (V.attitudesControl?.unlockGender === true) && (V.identityCap === true);
		if (!unlocked) {
			x.giAutoEnabled = false;
			x.giTransformEnabled = false;
			x.giTransformConsent = false;
		}

		// Turning transforms off revokes consent (prevents them silently coming back later)
		if (x.giTransformEnabled !== true) {
			x.giTransformConsent = false;
		}

		// If the system isn't fully enabled+consented, clear queued drift/stage so it can't "fire later".
		if (x.giAutoEnabled !== true || x.giTransformEnabled !== true || x.giTransformConsent !== true) {
			x.giDrift = 0;
			x.giShiftStage = 0;
			x.giShiftMode = "";
		}
	};

};
	// Run once now (if State is ready), and again whenever a passage starts (to catch freshly-loaded saves).
	try { setup.xchangeEnsurePillDefaults(); } catch (e) {}
	try { setup.xchangeEnsureCompatGlobals(); } catch (e) {}
			try { setup.xchangeEnsureGiSafety(); } catch (e) {}
	try { setup.xchangeEnsureGiSafety(); } catch (e) {}
	if (typeof jQuery === "function") {
		jQuery(document).on(":passagestart", () => {
			try { setup.xchangeEnsurePillDefaults(); } catch (e) {}
	try { setup.xchangeEnsureCompatGlobals(); } catch (e) {}
		});
	}
})();
