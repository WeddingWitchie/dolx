/**
 * As the v0.17.0 DoLX update, D.N.A. separated gender-identity and pill related handling:
 * - JS-side logic moved/split from `xchange.js` into `identity.js`
 * - The split also applied for the corresponding Twine-side logic
 * =========================
 * Important!
 * Some gender-identity "core" functions / related utilities are still live inside `xchange.js`.
 * If what you're looking for isn't defined here, there's a good chance it's still in `xchange.js`
 * (likewise, some mirrored behavior may be in `identity.twee` and its Twine-side correspondence)
 */
/* globals ANDROGYNOUS_FEMININITY_DEADZONE */

function playerCaresForGender() {
	return V.xchange.genderIdentityEnabled === 1;
}
window.playerCaresForGender = playerCaresForGender;

function genderIsIgnored() {
	return V.xchange.disregardGender === 1;
}
window.genderIsIgnored = genderIsIgnored;

function playerBodyIsMale() {
	return V.player.sex === "m";
}
window.playerBodyIsMale = playerBodyIsMale;

function playerBodyIsFemale() {
	return V.player.sex === "f";
}
window.playerBodyIsFemale = playerBodyIsFemale;

/**
 * Whether the player picked "Don't care" for Clothing Preference, meaning they simply don't care what they wear.
 * The entire clothing topic goes dormant: no dysphoria, no tolerance drift, no preferred-outfit comfort, and it stops pulling on the identity meter.
 * Mirrors how the Body topic toggles ($xchange.gi*Enabled) mute their categories.
 *
 * NOTE: the two presentation axes use different sentinels for androgyny,
 * because clothing had already claimed "n" for don't-care before the androgynous option existed:
 *   appearance.preferred - "m" | "f" | "n"        ("n" = prefers androgynous)
 *   clothing.preferred   - "m" | "f" | "u" | "n"  ("u" = prefers androgynous, "n" = don't care)
 * Testing clothing against "n" for androgyny is the easy mistake here; it silences the whole topic instead.
 */
function clothingIdentityIsNeutral() {
	return V.identity?.presentation?.clothing?.preferred === "n";
}
window.clothingIdentityIsNeutral = clothingIdentityIsNeutral;

/* The slots that make up "what the player is wearing" for identity purposes. Underwear counts, jewellery doesn't. */
const OUTFIT_SLOTS = [
	"over_head",
	"head",
	"face",
	"neck",
	"over_upper",
	"upper",
	"under_upper",
	"over_lower",
	"lower",
	"under_lower",
	"legs",
	"handheld",
	"feet",
];

/**
 * Sums the femininity value of every worn clothing slot plus makeup into one continuous score for the character's overall outfit:
 * negative reads masculine, positive reads feminine, near 0 reads androgynous.
 * Shared by the hourly clothing tick and by playerHasCharacteristic's clothing cases,
 * so "is the player currently dressed masculine/feminine/androgynous" always judges the whole outfit together
 * (a feminine skirt under a strongly masculine jacket can net out androgynous) instead of flagging on a single garment.
 */
function getCurrentWornFemininity() {
	let currentWornFemininity = 0;
	OUTFIT_SLOTS.forEach(slot => {
		const femininity = setup.clothes[slot][clothesIndex(slot, V.worn[slot])].femininity;
		if (femininity) currentWornFemininity += femininity;
	});

	// Add up the makeup femininity
	currentWornFemininity += V.makeup.lipstick ? 50 : 0;
	currentWornFemininity += V.makeup.mascara ? 50 : 0;
	currentWornFemininity += V.makeup.eyeshadow ? 50 : 0;

	return currentWornFemininity;
}
window.getCurrentWornFemininity = getCurrentWornFemininity;

/**
 * Whether the player is wearing any clothes the outfit score is built from.
 * A bare body scores 0 femininity, which sits inside the androgynous deadzone, but being naked isn't a
 * clothing choice; without this gate every hour spent asleep or stripped would count as "wearing an
 * androgynous outfit" and charge clothing dysphoria for it.
 * Makeup can shift an outfit's score, but it does not turn a naked body into an outfit by itself.
 */
function playerIsDressed() {
	return OUTFIT_SLOTS.some(slot => V.worn[slot] && V.worn[slot].name !== "naked");
}
window.playerIsDressed = playerIsDressed;

/**
 * Which single band the player's overall look currently falls into: "m", "f", or "n" for androgynous.
 *
 * `V.player.gender_appearance` is strictly binary (at a dead-even femininity score it falls back to the
 * player's sex) so the androgynous band has to be carved out of the raw score here.
 * Doing it anywhere else lets a balanced look count as BOTH "Feminine Appearance" and "Androgynous Appearance",
 * which charges dysphoria and grants tolerance on two appearance axes in the same hour.
 */
function currentAppearanceBand() {
	const femininity = Number(V.player.femininity);
	if (Number.isFinite(femininity) && Math.abs(femininity) <= ANDROGYNOUS_FEMININITY_DEADZONE) return "n";
	return V.player.gender_appearance === "m" ? "m" : "f";
}
window.currentAppearanceBand = currentAppearanceBand;

/** The identity characteristic each appearance band counts as. */
const APPEARANCE_CHARACTERISTIC_BY_BAND = { m: "Masculine Appearance", n: "Androgynous Appearance", f: "Feminine Appearance" };

/**
 * Which single band the player's outfit currently falls into: "m", "f", or "n" for androgynous.
 * Returns "" when the player isn't dressed at all, so no clothing characteristic applies.
 */
function currentClothingBand() {
	if (!playerIsDressed()) return "";
	const worn = getCurrentWornFemininity();
	if (worn > ANDROGYNOUS_FEMININITY_DEADZONE) return "f";
	if (worn < -ANDROGYNOUS_FEMININITY_DEADZONE) return "m";
	return "n";
}
window.currentClothingBand = currentClothingBand;

/**
 * What's currently dictating the player's wardrobe against their will, if anything: a genderification pill or a hypnotic crossdressing suggestion.
 * While one is in force it owns the reaction to their outfit and the identity system stays quiet about clothing
 * the two were mutually exclusive when both lived in the hourly tick, and still are.
 */
function clothingCompulsionState() {
	V.cheats = V.cheats || {};
	return {
		genderifyActive: !!(!V.statFreeze && V.xchange?.pill?.active && V.xchange.pill.genderificationEffect),
		hypnoCrossdressLevel: V.cheats.disableHypnoCrossdress ? 0 : V.hypnosis_traits?.crossdressing || 0,
	};
}
window.clothingCompulsionState = clothingCompulsionState;

/** Whether any such compulsion is in force. */
function clothingCompulsionActive() {
	const { genderifyActive, hypnoCrossdressLevel } = clothingCompulsionState();
	return genderifyActive || hypnoCrossdressLevel >= 1;
}
window.clothingCompulsionActive = clothingCompulsionActive;

/** What each outfit band maps to. The single source for which identity topics count as clothing. */
const CLOTHING_BANDS = {
	m: { side: "masculine", characteristic: "Masculine Clothing" },
	f: { side: "feminine", characteristic: "Feminine Clothing" },
	n: { side: "neutral", characteristic: "Neutral Clothing" },
};

/**
 * The characteristic an outfit band counts as, or undefined when the player isn't dressed.
 *
 * @param {string} band "m", "f" or "n".
 */
function clothingCharacteristicForBand(band) {
	return CLOTHING_BANDS[band]?.characteristic;
}
window.clothingCharacteristicForBand = clothingCharacteristicForBand;

/**
 * The clothing characteristics, which are driven by changes of outfit rather than by the hourly tick.
 *
 * @param {string} characteristic A name from setup.identityIndex.
 */
function isClothingCharacteristic(characteristic) {
	return Object.values(CLOTHING_BANDS).some(band => band.characteristic === characteristic);
}
window.isClothingCharacteristic = isClothingCharacteristic;

/**
 * What the player's outfit currently says to them: the band it reads as, marked when they're at odds with that band right now.
 *
 * Both halves belong in the key.
 * Deciding you can't stand the clothes already on your back is as much a new reaction as changing them, and it's reachable from several directions
 * rejecting the style in the Identity screen, or tolerance running out under you.
 * Keying on the band alone would swallow all of it silently.
 * Empty string means undressed, which is the absence of a reading rather than a reading of its own.
 */
function currentClothingReading() {
	const band = currentClothingBand();
	if (!band) return "";
	const option = V.identity?.presentation?.clothing?.[CLOTHING_BANDS[band].side];
	return option && (!option.acceptance || option.reject) ? band + "!" : band;
}
window.currentClothingReading = currentClothingReading;

/**
 * How many hourly ticks' worth one change of outfit is worth. Rare but heavy, instead of a constant drip.
 * Only the dysphoria half of the clothing axis is weighted this way.
 */
const CLOTHING_CHANGE_WEIGHT = 5;
window.CLOTHING_CHANGE_WEIGHT = CLOTHING_CHANGE_WEIGHT;

/**
 * Comfort from wearing clothes you prefer stays hourly for every axis, but clothing gets a heavier hourly
 * rate than the rest: the change of outfit that starts it grants no comfort of its own, and the point of
 * keeping this on the clock is that continuing to wear the right thing is what pays, not swapping outfits.
 */
const CLOTHING_COMFORT_WEIGHT = 3;
window.CLOTHING_COMFORT_WEIGHT = CLOTHING_COMFORT_WEIGHT;

/**
 * Fires the clothing side of the identity system once, when the outfit's overall reading changes.
 *
 * Wearing something you can't stand is a reaction to putting it on and catching sight of yourself, not a
 * feeling that renews every hour you keep it on, so this is hooked to the passage cycle rather than the clock.
 * What counts as a change is the outfit's reading (see currentClothingReading), so swapping one feminine
 * outfit for another is not news, and neither is being stripped and put back in the same clothes.
 *
 * Hooked to `:passagestart`, not `:passagedisplay`: the effects panel is built while the passage renders, so
 * anything raised after that shows up a passage late. Getting dressed happens inside a passage (a wardrobe, a
 * shop), and the reaction lands as the player leaves it.
 */
function clothingIdentityChangeCheck() {
	const clothing = V.identity?.presentation?.clothing;
	if (!clothing || V.statFreeze) return;
	// Mid-fight the player isn't choosing an outfit. Whatever they're left in settles once the fight is over.
	if (V.combat) return;

	const reading = currentClothingReading();
	// Undressed doesn't overwrite the reading we compare against - being stripped isn't getting changed.
	if (!reading || reading === clothing.lastReading) return;

	const firstReading = clothing.lastReading === undefined;
	// Tracked even when nothing comes of it, so switching off "Don't care" later compares against real history.
	clothing.lastReading = reading;

	// A save that predates this check has no baseline yet. Record one rather than pretending they just got changed.
	if (firstReading || clothingIdentityIsNeutral()) return;

	wikifier("clothingChangeIdentityEffects", `"${currentClothingBand()}"`);
}
window.clothingIdentityChangeCheck = clothingIdentityChangeCheck;

$(document).on(":passagestart", clothingIdentityChangeCheck);

function hourlyClothingFemininityCheck(hours = 1) {
	const currentWornFemininity = getCurrentWornFemininity();

	// Tick the hourly counter
	V.hourlyFemininity += currentWornFemininity > 0 ? 1 : 0;
	V.hourlyFemininity += currentWornFemininity < 0 ? -1 : 0;

	/*
	 * Hypno crossdress / genderify should still run even when the player cares for gender.
	 * Use the player's baseline gender for the compulsion direction so body changes from X-Change do not flip the urge from feminine to masculine mid-pill.
	 * Unlike identity dysphoria this one is a standing compulsion, so it does belong on the clock.
	 */
	const { genderifyActive, hypnoCrossdressLevel } = clothingCompulsionState();
	if (genderifyActive || hypnoCrossdressLevel >= 1) {
		if (V.player.gender === "m" && currentWornFemininity < 0) {
			wikifier("stress", 30 * hours, 1);
			V.genderificationStressMessage = 1;
			V.effectsmessage = 1;
		} else if (V.player.gender === "m" && currentWornFemininity > 0 && (genderifyActive || hypnoCrossdressLevel < 4)) {
			wikifier("stress", -3 * hours, 1);
			/*
			 * Route through the tiredness macro instead of direct V.tiredness writes.
			 * This prevents fractional/direct fatigue changes and lets normal fatigue modifiers apply.
			 * Negative tiredness macro values are multiplied by 20, so -2.5 hours = -50 raw fatigue per hour before modifiers.
			 */
			wikifier("tiredness", -2.5 * hours, 1);

			if (Math.random() < 0.5) {
				V.genderificationStressMessage = 2;
				V.effectsmessage = 1;
			}
		}

		if (V.player.gender === "f" && currentWornFemininity > 0) {
			wikifier("stress", 30 * hours, 1);
			V.genderificationStressMessage = 3;
			V.effectsmessage = 1;
		} else if (V.player.gender === "f" && currentWornFemininity < 0 && (genderifyActive || hypnoCrossdressLevel < 4)) {
			wikifier("stress", -3 * hours, 1);
			/*
			 * Route through the tiredness macro instead of direct V.tiredness writes.
			 * This prevents fractional/direct fatigue changes and lets normal fatigue modifiers apply.
			 * Negative tiredness macro values are multiplied by 20, so -2.5 hours = -50 raw fatigue per hour before modifiers.
			 */
			wikifier("tiredness", -2.5 * hours, 1);

			if (Math.random() < 0.5) {
				V.genderificationStressMessage = 4;
				V.effectsmessage = 1;
			}
		}
	}
}
window.hourlyClothingFemininityCheck = hourlyClothingFemininityCheck;

function playerHasCharacteristic(characteristic) {
	switch (characteristic) {
		/* Appearance and clothing are each a single three-way band.
		Exactly one of the three can be true at a time: they're the answer to "what does the player look like right now", not "what would upset them". */
		case "Masculine Appearance":
			return currentAppearanceBand() === "m" ? 2 : 0;
		case "Feminine Appearance":
			return currentAppearanceBand() === "f" ? 2 : 0;
		case "Androgynous Appearance":
			return currentAppearanceBand() === "n" ? 2 : 0;
		case "Masculine Clothing":
			return currentClothingBand() === "m" ? 2 : 0;
		case "Feminine Clothing":
			return currentClothingBand() === "f" ? 2 : 0;
		case "Neutral Clothing":
			return currentClothingBand() === "n" ? 2 : 0;
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
		case "Tiny Penis":
			return V.player.penisExist && V.player.penissize <= 2 ? 2 : 0;
		case "Small Penis":
			return V.player.penisExist && V.player.penissize === 3 ? 2 : 0;
		case "Medium Penis":
			return V.player.penisExist && V.player.penissize === 4 ? 2 : 0;
		case "Big Penis":
			return V.player.penisExist && V.player.penissize >= 5 ? 2 : 0;
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
			return lactating && enabled ? 2 : 0;
		}
		case "Pregnancy":
			return playerAwareTheyArePregnant() || (playerAwareTheyCanBePregnant() && (playerIsCreampied() || playerIsAnalCreampied())) ? 2 : 0;
		case "In Heat":
		case "In heat":
			return typeof playerHeatMinArousal === "function" && playerHeatMinArousal() > 0 ? 2 : 0;
		case "In Rut":
		case "In rut":
			return typeof playerRutMinArousal === "function" && playerRutMinArousal() > 0 ? 2 : 0;
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
		case "Androgynous Appearance":
			/* Neutral-axis trait, like Neutral Pronouns: wanting to read as neither pulls the score toward neither, so it contributes nothing in either direction.
			Listed to stay exhaustive over the axes. */
			break;
		case "Masculine Clothing":
			if (clothingIdentityIsNeutral()) break;
			femininity += Number(V.identity.presentation.clothing.masculine.acceptance) * -100;
			femininity += Number(V.identity.presentation.clothing.masculine.reject) * 100;
			femininity += (V.identity.presentation.clothing.preferred === "m") * -100;
			break;
		case "Feminine Clothing":
			if (clothingIdentityIsNeutral()) break;
			femininity += Number(V.identity.presentation.clothing.feminine.acceptance) * 100;
			femininity += Number(V.identity.presentation.clothing.feminine.reject) * -100;
			femininity += (V.identity.presentation.clothing.preferred === "f") * 100;
			break;
		case "Neutral Clothing":
			/* As above: a balanced outfit is the goal, so this axis pulls the score neither way. */
			break;
		case "Masculine Pronouns":
			femininity += Number(V.identity.presentation.pronouns.masculine.acceptance) * -100;
			femininity += Number(V.identity.presentation.pronouns.masculine.reject) * 100;
			femininity += !!V.identity.presentation.pronouns.preferredMasculine * -100;
			break;
		case "Feminine Pronouns":
			femininity += Number(V.identity.presentation.pronouns.feminine.acceptance) * 100;
			femininity += Number(V.identity.presentation.pronouns.feminine.reject) * -100;
			femininity += !!V.identity.presentation.pronouns.preferredFeminine * 100;
			break;
		case "Neutral Pronouns":
			femininity += Number(V.identity.presentation.pronouns.neutral.acceptance) * 0;
			femininity += Number(V.identity.presentation.pronouns.neutral.reject) * -0;
			femininity += !!V.identity.presentation.pronouns.preferredNeutral * 0;
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
			femininity += !!V.identity.body.genitals.preferredVagina * 50;
			break;
		case "Tiny Penis":
			femininity += Number(V.identity.body.genitals.tinypenis.acceptance) * -15;
			femininity += Number(V.identity.body.genitals.tinypenis.reject) * 15;
			femininity += (V.identity.body.genitals.preferredPenis === "tinypenis") * -15;
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
	switch (category) {
		case "Appearance":
			return APPEARANCE_CHARACTERISTIC_BY_BAND[currentAppearanceBand()];
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
			if (playerHasCharacteristic("Tiny Penis")) return "Tiny Penis";
			else if (playerHasCharacteristic("Small Penis")) return "Small Penis";
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

/**
 * Whether the player has explicitly Accepted (and not Rejected) their current chest-size bucket in the Gender Identity screen.
 * Only meaningful while GI breast-size tracking is on; used to stop the vanilla insecurity system from forcing distress over a chest the player
 * has deliberately accepted (e.g. a trans man who prefers a flat/small chest).
 */
function chestIdentityAccepted() {
	if (!V.xchange?.giBreastSizeEnabled) return false;
	const { option } = selectIdentityCharacteristic(identityCharacteristicCategory("Breasts"));
	return !!(option && option.acceptance && !option.reject);
}
window.chestIdentityAccepted = chestIdentityAccepted;

/**
 * Same idea as chestIdentityAccepted(), for the player's current penis-size bucket.
 * Only meaningful while GI genital tracking is on.
 */
function penisIdentityAccepted() {
	if (!V.xchange?.giGenitalsEnabled) return false;
	const characteristic = identityCharacteristicCategory("Penis");
	if (!characteristic) return false;
	const { option } = selectIdentityCharacteristic(characteristic);
	return !!(option && option.acceptance && !option.reject);
}
window.penisIdentityAccepted = penisIdentityAccepted;

/**
 * Same idea as chestIdentityAccepted(), for pregnancy. Only meaningful while GI fecundity tracking is on.
 */
function pregnancyIdentityAccepted() {
	if (!V.xchange?.giFecundityEnabled) return false;
	const { option } = selectIdentityCharacteristic("Pregnancy");
	return !!(option && option.acceptance && !option.reject);
}
window.pregnancyIdentityAccepted = pregnancyIdentityAccepted;

const PRONOUN_DYNAMIC_MODES = ["body", "clothing", "appearance", "posture"];

/**
 * The active dynamic pronoun mode ("body"/"clothing"/"appearance"/"posture"),
 * or "" if pronouns are resolved from the static preferred set instead.
 *
 * @param {"body"|"clothing"|"appearance"|"posture"|""} pronouns
 */
function getPronounDynamicMode(pronouns) {
	const hasPreferenceFlags = [pronouns.preferredMasculine, pronouns.preferredFeminine, pronouns.preferredNeutral].some(value => value !== undefined);
	const allPronounsPreferred =
		pronouns.preferredMasculine &&
		pronouns.preferredFeminine &&
		pronouns.preferredNeutral &&
		pronouns.masculine?.acceptance !== false &&
		pronouns.feminine?.acceptance !== false &&
		pronouns.neutral?.acceptance !== false;
	const savedDynamicMode = pronouns.pronounDynamicMode || (PRONOUN_DYNAMIC_MODES.includes(pronouns.preferred) ? pronouns.preferred : "");
	return (!hasPreferenceFlags || allPronounsPreferred) && PRONOUN_DYNAMIC_MODES.includes(savedDynamicMode) ? savedDynamicMode : "";
}

function playerPronoun() {
	const pronouns = V.identity?.presentation?.pronouns || {};
	const dynamicMode = getPronounDynamicMode(pronouns);

	if (dynamicMode === "body") {
		if (V.player.sex === "m" || V.player.sex === "f") return V.player.sex;
		if (!!V.player.penisExist === !!V.player.vaginaExist) return "n";
		return V.player.penisExist ? "m" : "f";
	}
	if (dynamicMode === "clothing") {
		const masculine = playerHasCharacteristic("Masculine Clothing") > 0;
		const feminine = playerHasCharacteristic("Feminine Clothing") > 0;
		if (masculine === feminine) return "n";
		return masculine ? "m" : "f";
	}
	if (dynamicMode === "appearance") return ["m", "f"].includes(V.player.gender_appearance) ? V.player.gender_appearance : "n";
	if (dynamicMode === "posture") return ["m", "f"].includes(V.player.gender_posture) ? V.player.gender_posture : "n";

	const preferred = [];
	if (pronouns.preferredMasculine && pronouns.masculine?.acceptance !== false) preferred.push("m");
	if (pronouns.preferredFeminine && pronouns.feminine?.acceptance !== false) preferred.push("f");
	if (pronouns.preferredNeutral && pronouns.neutral?.acceptance !== false) preferred.push("n");

	if (preferred.length === 1) return preferred[0];
	if (preferred.length > 1) {
		const perceived = typeof window.perceivedGender === "function" ? window.perceivedGender() : V.player.gender_appearance;
		if (preferred.includes(perceived)) return perceived;
		return preferred.includes("n") ? "n" : preferred[0];
	}

	if (["m", "f", "n"].includes(pronouns.preferred)) return pronouns.preferred;
	if (["m", "f", "n"].includes(V.player.pronoun)) return V.player.pronoun;
	return ["m", "f"].includes(V.player.gender) ? V.player.gender : "n";
}
window.playerPronoun = playerPronoun;

const PRONOUN_LABELS = { m: "he / him", f: "she / her", n: "they / them" };

/**
 * Label for the "Currently used" line in the Identity settings tab.
 */
function pronounSummaryLabel() {
	const pronouns = V.identity?.presentation?.pronouns || {};
	const dynamicMode = getPronounDynamicMode(pronouns);

	if (dynamicMode) return PRONOUN_LABELS[playerPronoun()];

	const preferred = [];
	if (pronouns.preferredMasculine && pronouns.masculine?.acceptance !== false) preferred.push("m");
	if (pronouns.preferredFeminine && pronouns.feminine?.acceptance !== false) preferred.push("f");
	if (pronouns.preferredNeutral && pronouns.neutral?.acceptance !== false) preferred.push("n");

	if (preferred.length > 0) return preferred.map(gender => PRONOUN_LABELS[gender]).join(" or ");
	return PRONOUN_LABELS[playerPronoun()];
}
window.pronounSummaryLabel = pronounSummaryLabel;

/* globals perceivedGender */

/**
 * Whether a named NPC knows the player's actual identity/pronoun well enough to address them correctly, rather than guessing from appearance.
 * True once love reaches 50 (established relationship) or the NPC is explicitly tracked in $genderknown (identity reveal plot flag).
 *
 * @param {string} npcName The NPC's name as used in `C.npc`.
 */
function npcKnowsPlayerIdentity(npcName) {
	if (!npcName) return false;
	if (Array.isArray(V.genderknown) && V.genderknown.includes(npcName)) return true;
	const npc = window.C?.npc?.[npcName];
	return !!npc && Number(npc.love) >= 50;
}
window.npcKnowsPlayerIdentity = npcKnowsPlayerIdentity;

/**
 * Pronoun an NPC would use to address the player: their stated preference if the NPC already knows them, otherwise a guess from appearance alone.
 *
 * @param {string} npcName The NPC's name as used in `C.npc`.
 */
function npcAddressPronoun(npcName) {
	return npcKnowsPlayerIdentity(npcName) ? playerPronoun() : perceivedGender();
}
window.npcAddressPronoun = npcAddressPronoun;

/**
 * Whether <<misgender>> should apply identity effects for this pronoun.
 * The same pronoun may appear several times in one turn, but it should only count as one identity event.
 * Effects apply on the first use and are skipped for repeated uses of that pronoun.
 * This is temporary render data and is not saved.
 *
 * @param {string} pronoun The player's pronoun ("m", "f" or "n").
 */
const misgenderCounted = { turn: -1, seen: new Set() };
function misgenderShouldCount(pronoun) {
	const turn = State.turns;
	if (misgenderCounted.turn !== turn) {
		misgenderCounted.turn = turn;
		misgenderCounted.seen = new Set();
	}
	if (misgenderCounted.seen.has(pronoun)) return false;
	misgenderCounted.seen.add(pronoun);
	return true;
}
window.misgenderShouldCount = misgenderShouldCount;

function preferredPronouns(gender) {
	const pronouns = V.identity?.presentation?.pronouns || {};
	const dynamicModes = ["body", "clothing", "appearance", "posture"];
	const dynamicMode = pronouns.pronounDynamicMode || (dynamicModes.includes(pronouns.preferred) ? pronouns.preferred : "");
	if (dynamicModes.includes(dynamicMode)) return playerPronoun() === gender;
	if (gender === "m") return !!pronouns.preferredMasculine;
	if (gender === "f") return !!pronouns.preferredFeminine;
	if (gender === "n") return !!pronouns.preferredNeutral;
	return false;
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
		case "Tiny Penis":
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
		case "Androgynous Appearance":
		case "Neutral Clothing":
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
			if (!clothingIdentityIsNeutral()) {
				option = presentation.clothing?.masculine;
				preferred = presentation.clothing?.preferred === "m";
			}
			break;
		case "Feminine Clothing":
			if (!clothingIdentityIsNeutral()) {
				option = presentation.clothing?.feminine;
				preferred = presentation.clothing?.preferred === "f";
			}
			break;
		case "Neutral Clothing":
			if (!clothingIdentityIsNeutral()) {
				option = presentation.clothing?.neutral;
				preferred = presentation.clothing?.preferred === "u";
			}
			break;
		case "Masculine Appearance":
			option = presentation.appearance?.masculine;
			preferred = presentation.appearance?.preferred === "m";
			break;
		case "Feminine Appearance":
			option = presentation.appearance?.feminine;
			preferred = presentation.appearance?.preferred === "f";
			break;
		case "Androgynous Appearance":
			option = presentation.appearance?.neutral;
			preferred = presentation.appearance?.preferred === "n";
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
			if (x.giBreastSizeEnabled) {
				option = body.chest?.flat;
				preferred = body.chest?.preferred === "flat";
			}
			break;
		case "Small Breasts":
			if (x.giBreastSizeEnabled) {
				option = body.chest?.small;
				preferred = body.chest?.preferred === "small";
			}
			break;
		case "Medium Breasts":
			if (x.giBreastSizeEnabled) {
				option = body.chest?.medium;
				preferred = body.chest?.preferred === "medium";
			}
			break;
		case "Big Breasts":
			if (x.giBreastSizeEnabled) {
				option = body.chest?.big;
				preferred = body.chest?.preferred === "big";
			}
			break;
		case "Small Ass":
			if (x.giAssSizeEnabled) {
				option = body.bottom?.small;
				preferred = body.bottom?.preferred === "small";
			}
			break;
		case "Medium Ass":
			if (x.giAssSizeEnabled) {
				option = body.bottom?.medium;
				preferred = body.bottom?.preferred === "medium";
			}
			break;
		case "Big Ass":
			if (x.giAssSizeEnabled) {
				option = body.bottom?.big;
				preferred = body.bottom?.preferred === "big";
			}
			break;
		case "Vagina":
			if (x.giGenitalsEnabled) {
				option = body.genitals?.vagina;
				preferred = !!body.genitals?.preferredVagina;
			}
			break;
		case "Tiny Penis":
			if (x.giGenitalsEnabled) {
				option = body.genitals?.tinypenis;
				preferred = body.genitals?.preferredPenis === "tinypenis";
			}
			break;
		case "Small Penis":
			if (x.giGenitalsEnabled) {
				option = body.genitals?.smallpenis;
				preferred = body.genitals?.preferredPenis === "smallpenis";
			}
			break;
		case "Medium Penis":
			if (x.giGenitalsEnabled) {
				option = body.genitals?.mediumpenis;
				preferred = body.genitals?.preferredPenis === "mediumpenis";
			}
			break;
		case "Big Penis":
			if (x.giGenitalsEnabled) {
				option = body.genitals?.bigpenis;
				preferred = body.genitals?.preferredPenis === "bigpenis";
			}
			break;
		case "Short Hair":
			if (x.giHairLengthEnabled) {
				option = body.hairlength?.short;
				preferred = body.hairlength?.preferred === "short";
			}
			break;
		case "Medium Hair":
			if (x.giHairLengthEnabled) {
				option = body.hairlength?.medium;
				preferred = body.hairlength?.preferred === "medium";
			}
			break;
		case "Long Hair":
			if (x.giHairLengthEnabled) {
				option = body.hairlength?.long;
				preferred = body.hairlength?.preferred === "long";
			}
			break;
		case "Miniature Body":
			if (x.giBodySizeEnabled) {
				option = body.bodysize?.miniature;
				preferred = body.bodysize?.preferred === "miniature";
			}
			break;
		case "Tiny Body":
			if (x.giBodySizeEnabled) {
				option = body.bodysize?.tiny;
				preferred = body.bodysize?.preferred === "tiny";
			}
			break;
		case "Small Body":
			if (x.giBodySizeEnabled) {
				option = body.bodysize?.small;
				preferred = body.bodysize?.preferred === "small";
			}
			break;
		case "Normal Body":
			if (x.giBodySizeEnabled) {
				option = body.bodysize?.normal;
				preferred = body.bodysize?.preferred === "normal";
			}
			break;
		case "Tall Body":
			if (x.giBodySizeEnabled) {
				option = body.bodysize?.tall;
				preferred = body.bodysize?.preferred === "tall";
			}
			break;
		case "Large Body":
			if (x.giBodySizeEnabled) {
				option = body.bodysize?.large;
				preferred = body.bodysize?.preferred === "large";
			}
			break;
		case "Giant Body":
			if (x.giBodySizeEnabled) {
				option = body.bodysize?.giant;
				preferred = body.bodysize?.preferred === "giant";
			}
			break;
		case "Lactation":
			if (x.giFecundityEnabled) {
				option = body.lactation;
				preferred = body.lactation?.preferred === "lactation";
			}
			break;
		case "Pregnancy":
			if (x.giFecundityEnabled) {
				option = body.pregnancy;
				preferred = body.pregnancy?.preferred === "pregnancy";
			}
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
		case "Androgynous Appearance":
			return "appearance";
		case "Masculine Clothing":
		case "Feminine Clothing":
		case "Neutral Clothing":
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
		case "Tiny Penis":
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
		case "clothing":
			return !clothingIdentityIsNeutral();
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
	return !!(preferred || option.acceptance === true || option.reject === true || (Number(option.dysphoria) || 0) > 0);
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
		axis = V.player?.gender === "f" ? 1 : V.player?.gender === "m" ? -1 : 0;
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
						axis: group in groupAxis ? groupAxis[group] : 0,
						included: [],
						diluting: [],
						dormant: [],
					};
				}

				const entry = {
					characteristic,
					dir,
					weight,
					support,
					effect,
					preferred,
					accepted,
					rejected,
					dysphoria,
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

/* Returns the player's identity: "m", "f", or "n" (nonbinary).
   Always use this for gender identity, including transgender players.
   Do not determine identity from the player's body, as this can misidentify trans and nonbinary characters. */
function playerFeltGender() {
	/* Called through window so premium pills can apply presentationGenderOverride.
	A direct call would skip the X-Change wrapper and lose the override. */
	if (window.playerFeelsManlike()) return "m";
	if (window.playerFeelsGirllike()) return "f";
	return "n";
}
window.playerFeltGender = playerFeltGender;

/* The noun <<pcGender>> prints. */
function playerGenderWord() {
	switch (playerFeltGender()) {
		case "m":
			return "boy";
		case "f":
			return "girl";
		default:
			return "enby";
	}
}
window.playerGenderWord = playerGenderWord;

/* The possessive <<pcGenderher>> prints. */
function playerGenderPossessive() {
	switch (playerFeltGender()) {
		case "m":
			return "his";
		case "f":
			return "her";
		default:
			return "their";
	}
}
window.playerGenderPossessive = playerGenderPossessive;

/* Shows "trans boy", "trans girl", or "trans enby" */
function playerTransLabel() {
	return "trans " + playerGenderWord();
}
window.playerTransLabel = playerTransLabel;

/* Determines the direction of a crossdress/genderification body change.
X-Change uses body sex ($player.sex), not gender identity: male body = "sissy", female body = "butch".
Only applies to a normal crossdress effect, not genderflip or herm changes.
Returns "sissy" | "butch" | "none". */
function xchangeGenderificationDirection() {
	const pill = V.xchange?.pill;
	if (pill && (pill.genderflipEffect || pill.hermEffect)) return "none";
	if (V.player?.sex === "m") return "sissy";
	if (V.player?.sex === "f") return "butch";
	return "none";
}
window.xchangeGenderificationDirection = xchangeGenderificationDirection;
