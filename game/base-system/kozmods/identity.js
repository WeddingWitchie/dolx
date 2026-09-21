/**
 * As the v0.17.0 DoLX update, D.N.A. separated gender-identity and pill related handling:
 * - JS-side logic moved/split from `xchange.js` into `identity.js`
 * - The split also applied for the corresponding Twine-side logic
 * Some gender-identity core functions and utilities are still in `xchange.js`, and some mirrored behaviour
 * is in `identity.twee`. Check both if what you're looking for isn't defined here.
 */
/* globals ANDROGYNOUS_FEMININITY_DEADZONE makeupPartEquipped */

/*
 * Reject, Accepted, and Preferred are parts of the same choice, but importing settings and Random start can roll them
 * separately. This can create combinations that are impossible to select normally, such as rejecting and preferring
 * every pronoun, or preferring something that was never accepted.
 *
 * This only fixes invalid combinations. Rejected + Accepted is allowed during play because it represents a Begrudged
 * characteristic, which can also be Preferred. During character creation, Begrudged cannot exist yet, so Rejected wins.
 *
 * "Don't care" clothing and makeup options are handled by their own normalisers because they also affect dysphoria
 * and tolerance, so they are skipped here.
 */
function identityNormalisePresentation() {
	const presentation = V.identity?.presentation;
	if (!presentation || typeof presentation !== "object") return;
	const creatingCharacter = V.passage === "Start";

	const isAccepted = characteristic => {
		if (!characteristic || typeof characteristic !== "object") return false;
		if (creatingCharacter && characteristic.reject) characteristic.acceptance = false;
		return characteristic.acceptance === true;
	};

	const pronouns = presentation.pronouns;
	if (pronouns && typeof pronouns === "object") {
		/* Nothing preferred at all is a state <<repairPronounPreferenceFallback>> already resolves at lock-in. */
		if (!isAccepted(pronouns.masculine)) pronouns.preferredMasculine = false;
		if (!isAccepted(pronouns.feminine)) pronouns.preferredFeminine = false;
		if (!isAccepted(pronouns.neutral)) pronouns.preferredNeutral = false;
		/* The dynamic modes are only offered while all three are preferred. */
		if (!(pronouns.preferredMasculine && pronouns.preferredFeminine && pronouns.preferredNeutral)) pronouns.pronounDynamicMode = "";
	}

	const exclusiveGroups = [
		{ group: presentation.appearance, options: { m: "masculine", f: "feminine", n: "neutral" }, dontCare: null },
		{ group: presentation.clothing, options: { m: "masculine", f: "feminine", u: "neutral" }, dontCare: "n" },
		{ group: presentation.makeup, options: { wearing: "wearing", bare: "bare" }, dontCare: "n" },
	];
	for (const { group, options, dontCare } of exclusiveGroups) {
		if (!group || typeof group !== "object") continue;
		if (dontCare != null && group.preferred === dontCare) continue;
		for (const name of Object.values(options)) isAccepted(group[name]);

		const preferredName = options[group.preferred];
		if (preferredName && group[preferredName]?.acceptance === true) continue;
		/* The preferred option has to be one the character accepts. Move it to another accepted option if there is one. */
		const accepted = Object.keys(options).find(value => group[options[value]]?.acceptance === true);
		if (accepted != null) {
			group.preferred = accepted;
		} else if (creatingCharacter) {
			/* A randomised character who rejected every option still needs one to live with. Keep the one already chosen. */
			const fallbackName = preferredName || Object.values(options)[0];
			const fallback = group[fallbackName];
			if (fallback && typeof fallback === "object") {
				fallback.reject = false;
				fallback.acceptance = true;
				group.preferred = Object.keys(options).find(value => options[value] === fallbackName);
			}
		}
	}
}
window.identityNormalisePresentation = identityNormalisePresentation;

function playerCaresForGender() {
	// Normalised to a strict boolean by setup.xchangeEnsureGiSafety; older saves may still hold the numeric 1.
	return V.xchange.genderIdentityEnabled === true || V.xchange.genderIdentityEnabled === 1;
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

function makeupIdentityIsIgnored() {
	return V.identity?.presentation?.makeup?.preferred === "n";
}
window.makeupIdentityIsIgnored = makeupIdentityIsIgnored;

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
	currentWornFemininity += makeupPartEquipped("lipstick") ? 50 : 0;
	currentWornFemininity += makeupPartEquipped("mascara") ? 50 : 0;
	currentWornFemininity += makeupPartEquipped("eyeshadow") ? 50 : 0;
	currentWornFemininity += makeupPartEquipped("blusher") ? 50 : 0;

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

/**
 * How the player reads to onlookers, forced to "m" or "f".
 *
 * For "would we be seen as a same-sex couple" checks, which care about what the public reads off the
 * player rather than what the player is carrying.
 * `perceivedGender()` is the right source, but it can return "n" for an androgynous look, and "n" matches no NPC pronoun.
 * Left alone that turns dressing androgynously into a blanket bypass for every check built on this,
 * so an androgynous read falls back to the body underneath: appearance decides it, without handing out a free pass.
 */
function perceivedGenderBinary() {
	const perceived = typeof window.perceivedGender === "function" ? window.perceivedGender() : undefined;
	if (perceived === "m" || perceived === "f") return perceived;
	return V.player.sex === "m" ? "m" : "f";
}
window.perceivedGenderBinary = perceivedGenderBinary;

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

	// Tick the hourly counter, excluding sleep so waking outfits aren't outweighed by sleepwear.
	if (!V.sleepTimePassing) {
		V.hourlyFemininity += currentWornFemininity > 0 ? 1 : 0;
		V.hourlyFemininity += currentWornFemininity < 0 ? -1 : 0;
	}

	/* A chest binder can cause pain over time. Check once per hour, then apply the total pain and show one message. */
	if (!V.statFreeze && V.worn?.under_upper?.variable === "chestbinder" && V.worn.under_upper.integrity > 0 && V.worn.under_upper.exposed < 1) {
		let binderPain = 0;
		for (let i = 0; i < hours; i++) {
			if (random(1, 12) === 1) binderPain++;
		}
		if (binderPain > 0) {
			wikifier("pain", binderPain);
			V.binderPainMessage = true;
			V.effectsmessage = 1;
		}
	}

	/*
	 * Hypno crossdress / genderify should still run even when the player cares for gender.
	 * Use the player's baseline gender for the compulsion direction so body changes from X-Change do not flip the urge from feminine to masculine mid-pill.
	 * Unlike identity dysphoria this one is a standing compulsion, so it does belong on the clock.
	 */
	const { genderifyActive, hypnoCrossdressLevel } = clothingCompulsionState();
	if ((genderifyActive || hypnoCrossdressLevel >= 1) && !V.sleepTimePassing) {
		if (V.player.gender === "m" && currentWornFemininity < 0) {
			wikifier("stress", 30 * hours, 1);
			V.genderificationStressMessage = 1;
			V.effectsmessage = 1;
		} else if (V.player.gender === "m" && currentWornFemininity > 0 && (genderifyActive || hypnoCrossdressLevel < 4)) {
			wikifier("stress", -3 * hours, 1);
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
			wikifier("tiredness", -2.5 * hours, 1);

			if (Math.random() < 0.5) {
				V.genderificationStressMessage = 4;
				V.effectsmessage = 1;
			}
		}
	}
}
window.hourlyClothingFemininityCheck = hourlyClothingFemininityCheck;

/* The same four the mirror counts when it tells the player they're wearing makeup, including custom cosmetics.
Concealer is left out on purpose: it's a 0/1 freckle cover rather than a look anyone reads off your face. */
function playerIsWearingMakeup() {
	return ["lipstick", "eyeshadow", "mascara", "blusher"].some(makeupPartEquipped);
}
window.playerIsWearingMakeup = playerIsWearingMakeup;

function playerHasCharacteristic(characteristic) {
	/* Chest identity uses the visible chest size while dressed, so binders and similar clothes can reduce dysphoria without changing actual breast size. */
	const perceivedBreastSize = Number.isFinite(V.player.perceived_breastsize) ? V.player.perceived_breastsize : V.player.breastsize;
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
		case "Wearing Makeup":
			return playerIsWearingMakeup() ? 2 : 0;
		case "Bare Face":
			return playerIsWearingMakeup() ? 0 : 2;
		case "Masculine Pronouns":
			return V.identity.presentation.pronouns.masculine.misgendered;
		case "Feminine Pronouns":
			return V.identity.presentation.pronouns.feminine.misgendered;
		case "Neutral Pronouns":
			return V.identity.presentation.pronouns.neutral.misgendered;
		case "Flat Chest":
			return perceivedBreastSize === 0 ? 2 : 0;
		case "Small Breasts":
			return between(perceivedBreastSize, 1, 4) ? 2 : 0;
		case "Medium Breasts":
			return between(perceivedBreastSize, 5, 7) ? 2 : 0;
		case "Big Breasts":
			return perceivedBreastSize > 7 ? 2 : 0;
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
			/* Creampies already trigger immediate dysphoria. Viable loads should not repeat it every hour. */
			return playerAwareTheyArePregnant() ? 2 : 0;
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

/* Identity characteristic config.
   group      - meter/state group
   dir/meterW - meter direction and weight
   fem        - femininity weight; null = no contribution
   femKey     - key used for femininity checks
   key        - selector key; "self" = use the container itself
   pref       - preferred state check ({ field, value } or { flag })

   Add new characteristics by adding a row here. */
const IDENTITY_GROUPS = {
	appearance: { fem: id => id.presentation.appearance, sel: (p, b) => p.appearance },
	clothing: { fem: id => id.presentation.clothing, sel: (p, b) => p.clothing },
	pronouns: { fem: id => id.presentation.pronouns, sel: (p, b) => p.pronouns },
	makeup: { fem: id => id.presentation.makeup, sel: (p, b) => p.makeup },
	chest: { fem: id => id.body.chest, sel: (p, b) => b.chest },
	ass: { fem: id => id.body.bottom, sel: (p, b) => b.bottom },
	genitals: { fem: id => id.body.genitals, sel: (p, b) => b.genitals },
	hair: { fem: id => id.body.hairlength, sel: (p, b) => b.hairlength },
	bodysize: { fem: id => id.body.bodysize, sel: (p, b) => b.bodysize },
	lactation: { fem: id => id.body.lactation, sel: (p, b) => b.lactation },
	pregnancy: { fem: id => id.body.pregnancy, sel: (p, b) => b.pregnancy },
};

const IDENTITY_CHARACTERISTICS = {
	"Masculine Appearance": { group: "appearance", dir: -1, meterW: 1, fem: -100, key: "masculine", pref: { field: "preferred", value: "m" } },
	"Feminine Appearance": { group: "appearance", dir: 1, meterW: 1, fem: 100, key: "feminine", pref: { field: "preferred", value: "f" } },
	"Androgynous Appearance": { group: "appearance", dir: 0, meterW: 1.25, fem: null, key: "neutral", pref: { field: "preferred", value: "n" } },
	"Masculine Clothing": { group: "clothing", dir: -1, meterW: 1, fem: -100, key: "masculine", pref: { field: "preferred", value: "m" } },
	"Feminine Clothing": { group: "clothing", dir: 1, meterW: 1, fem: 100, key: "feminine", pref: { field: "preferred", value: "f" } },
	"Neutral Clothing": { group: "clothing", dir: 0, meterW: 1.25, fem: null, key: "neutral", pref: { field: "preferred", value: "u" } },
	"Masculine Pronouns": { group: "pronouns", dir: -1, meterW: 1, fem: -100, key: "masculine", pref: { flag: "preferredMasculine" } },
	"Feminine Pronouns": { group: "pronouns", dir: 1, meterW: 1, fem: 100, key: "feminine", pref: { flag: "preferredFeminine" } },
	"Neutral Pronouns": { group: "pronouns", dir: 0, meterW: 1.25, fem: 0, key: "neutral", pref: { flag: "preferredNeutral" } },
	"Wearing Makeup": { group: "makeup", dir: 1, meterW: 1, fem: 100, key: "wearing", pref: { field: "preferred" } },
	"Bare Face": { group: "makeup", dir: -1, meterW: 1, fem: -100, key: "bare", pref: { field: "preferred" } },
	"Flat Chest": { group: "chest", dir: -1, meterW: 1, fem: -50, key: "flat", pref: { field: "preferred" } },
	"Small Breasts": { group: "chest", dir: 0, meterW: 1.25, fem: 25, key: "small", pref: { field: "preferred" } },
	"Medium Breasts": { group: "chest", dir: 1, meterW: 1, fem: 50, key: "medium", pref: { field: "preferred" } },
	"Big Breasts": { group: "chest", dir: 1, meterW: 1, fem: 50, key: "big", pref: { field: "preferred" } },
	"Small Ass": { group: "ass", dir: 0, meterW: 1.25, fem: 50, key: "small", pref: { field: "preferred" } },
	"Medium Ass": { group: "ass", dir: 1, meterW: 1, fem: 50, key: "medium", pref: { field: "preferred" } },
	"Big Ass": { group: "ass", dir: 1, meterW: 1, fem: 50, key: "big", pref: { field: "preferred" } },
	Vagina: { group: "genitals", dir: 1, meterW: 1, fem: 50, key: "vagina", pref: { flag: "preferredVagina" } },
	"Tiny Penis": { group: "genitals", dir: -1, meterW: 1, fem: -15, key: "tinypenis", pref: { field: "preferredPenis" } },
	"Small Penis": { group: "genitals", dir: -1, meterW: 1, fem: -25, key: "smallpenis", pref: { field: "preferredPenis" } },
	"Medium Penis": { group: "genitals", dir: -1, meterW: 1, fem: -50, key: "mediumpenis", pref: { field: "preferredPenis" } },
	"Big Penis": { group: "genitals", dir: -1, meterW: 1, fem: -50, key: "bigpenis", pref: { field: "preferredPenis" } },
	"Short Hair": { group: "hair", dir: -1, meterW: 1, fem: -50, key: "short", pref: { field: "preferred" } },
	"Medium Hair": { group: "hair", dir: 0, meterW: 1.25, fem: 25, key: "medium", pref: { field: "preferred" } },
	"Long Hair": { group: "hair", dir: 1, meterW: 1, fem: 50, key: "long", pref: { field: "preferred" } },
	"Miniature Body": { group: "bodysize", dir: 0, meterW: 1.25, fem: 50, femKey: "tiny", key: "miniature", pref: { field: "preferred" } },
	"Tiny Body": { group: "bodysize", dir: 0, meterW: 1.25, fem: 50, key: "tiny", pref: { field: "preferred" } },
	"Small Body": { group: "bodysize", dir: 0, meterW: 1.25, fem: 0, key: "small", pref: { field: "preferred" } },
	"Normal Body": { group: "bodysize", dir: 0, meterW: 1.25, fem: 0, key: "normal", pref: { field: "preferred" } },
	"Tall Body": { group: "bodysize", dir: -1, meterW: 1, fem: 0, femKey: "normal", key: "tall", pref: { field: "preferred" } },
	"Large Body": { group: "bodysize", dir: -1, meterW: 1, fem: -50, key: "large", pref: { field: "preferred" } },
	"Giant Body": { group: "bodysize", dir: -1, meterW: 1, fem: -50, femKey: "large", key: "giant", pref: { field: "preferred" } },
	Lactation: { group: "lactation", dir: 1, meterW: 1, fem: 50, key: "self", pref: { field: "preferred", value: "lactation" } },
	Pregnancy: { group: "pregnancy", dir: 1, meterW: 1, fem: 50, key: "self", pref: { field: "preferred", value: "pregnancy" } },
};

/* True if `preferred` is set for this characteristic. */
function identityPreferenceMatches(container, entry, key) {
	if (entry.pref.flag) return !!container?.[entry.pref.flag];
	const wanted = entry.pref.value === undefined ? key : entry.pref.value;
	return container?.[entry.pref.field] === wanted;
}

function getFemininityContribution(characteristic) {
	const entry = IDENTITY_CHARACTERISTICS[characteristic];
	if (!entry || entry.fem === null) return 0;
	/* A neutral outfit or an ignored face takes those axes out of the score entirely. */
	if (entry.group === "clothing" && clothingIdentityIsNeutral()) return 0;
	if (entry.group === "makeup" && makeupIdentityIsIgnored()) return 0;

	const container = IDENTITY_GROUPS[entry.group].fem(V.identity);
	const key = entry.femKey === undefined ? entry.key : entry.femKey;
	const option = key === "self" ? container : container[key];
	const weight = entry.fem;

	let femininity = 0;
	femininity += Number(option.acceptance) * weight;
	femininity += Number(option.reject) * -weight;
	femininity += identityPreferenceMatches(container, entry, key) * weight;
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
 * Whether the player has accepted their current chest size in Gender Identity.
 * Prevents breast-size insecurity from triggering for an accepted chest size.
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
 * Same idea as chestIdentityAccepted(), for pregnancy.
 * Only meaningful while GI fecundity tracking is on.
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

/**
 * The pronoun sets the player has marked as preferred and still accepts, as an array of "m"/"f"/"n".
 *
 * @param {object} pronouns `V.identity.presentation.pronouns`
 */
function preferredPronounSet(pronouns) {
	const preferred = [];
	if (pronouns.preferredMasculine && pronouns.masculine?.acceptance !== false) preferred.push("m");
	if (pronouns.preferredFeminine && pronouns.feminine?.acceptance !== false) preferred.push("f");
	if (pronouns.preferredNeutral && pronouns.neutral?.acceptance !== false) preferred.push("n");
	return preferred;
}
window.preferredPronounSet = preferredPronounSet;

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

	const preferred = preferredPronounSet(pronouns);

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

	const preferred = preferredPronounSet(pronouns);

	if (preferred.length > 0) return preferred.map(gender => PRONOUN_LABELS[gender]).join(" or ");
	return PRONOUN_LABELS[playerPronoun()];
}
window.pronounSummaryLabel = pronounSummaryLabel;

/* globals perceivedGender */

/**
 * Whether a named NPC knows the player's actual identity/pronouns.
 * True at 50+ love or if tracked in $genderknown.
 *
 * @param {string} npcName NPC name in `C.npc`.
 */
function npcKnowsPlayerIdentity(npcName) {
	if (!npcName) return false;
	if (Array.isArray(V.genderknown) && V.genderknown.includes(npcName)) return true;
	const npc = window.C?.npc?.[npcName];
	return !!npc && Number(npc.love) >= 50;
}
window.npcKnowsPlayerIdentity = npcKnowsPlayerIdentity;

/**
 * Gets the pronoun an NPC uses for the player, based on known preference or appearance.
 *
 * @param {string} npcName NPC name in `C.npc`.
 */
function npcAddressPronoun(npcName) {
	if (!npcKnowsPlayerIdentity(npcName)) return perceivedGender();

	const pronouns = V.identity?.presentation?.pronouns || {};
	if (!getPronounDynamicMode(pronouns)) {
		const preferred = preferredPronounSet(pronouns);
		if (preferred.length > 1 && typeof window.playerFeltGender === "function") {
			const felt = window.playerFeltGender();
			if (preferred.includes(felt)) return felt;
		}
	}
	return playerPronoun();
}
window.npcAddressPronoun = npcAddressPronoun;

/**
 * Checks whether <<misgender>> should apply identity effects.
 * Each pronoun only counts once per turn.
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
	/* Universal axis:
	 *   min	= strongly masculine
	 *   max	= strongly feminine
	So masculine-leaning traits push NEGATIVE and feminine-leaning POSITIVE. */
	const entry = IDENTITY_CHARACTERISTICS[characteristic];
	if (!entry) return { dir: 0, weight: 0 };
	return { dir: entry.dir, weight: entry.meterW };
}
window.getIdentityMeterDirection = getIdentityMeterDirection;

/* Checks whether this characteristic is enabled.
   gi* flags may be stored as booleans or 0/1 in older saves. */
function identitySelectorEnabled(group, x) {
	switch (group) {
		case "clothing":
			return !clothingIdentityIsNeutral();
		case "makeup":
			return !makeupIdentityIsIgnored();
		case "chest":
			return x.giBreastSizeEnabled;
		case "ass":
			return x.giAssSizeEnabled;
		case "genitals":
			return x.giGenitalsEnabled;
		case "hair":
			return x.giHairLengthEnabled;
		case "bodysize":
			return x.giBodySizeEnabled;
		case "pregnancy":
		case "lactation":
			return x.giFecundityEnabled;
		default:
			return true;
	}
}

function selectIdentityCharacteristic(characteristic) {
	const id = V.identity || {};
	const x = V.xchange || {};
	const presentation = id.presentation || {};
	const body = id.body || {};

	const entry = IDENTITY_CHARACTERISTICS[characteristic];
	if (!entry || !identitySelectorEnabled(entry.group, x)) return { option: undefined, preferred: false };

	const container = IDENTITY_GROUPS[entry.group].sel(presentation, body);
	const option = entry.key === "self" ? container : container?.[entry.key];
	const preferred = identityPreferenceMatches(container, entry, entry.key);
	return { option, preferred };
}
window.selectIdentityCharacteristic = selectIdentityCharacteristic;

function getIdentityMeterGroup(characteristic) {
	const entry = IDENTITY_CHARACTERISTICS[characteristic];
	return entry ? entry.group : false;
}
window.getIdentityMeterGroup = getIdentityMeterGroup;
function isIdentityMeterCharacteristicEnabled(characteristic) {
	const x = V.xchange || {};
	switch (getIdentityMeterGroup(characteristic)) {
		case "clothing":
			return !clothingIdentityIsNeutral();
		case "makeup":
			return !makeupIdentityIsIgnored();
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
	 * -1 = masculine, +1 = feminine.
	 * Don't flip by starting gender.
	 * If inactive, use current gender.
	 */
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

	/* Breakdown data for the Statistics "Choice Breakdown" UI.
	 * Groups characteristics as included, diluting, or dormant.
	 * Derived data; safe to overwrite each call.
	 */
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

	const currentMeter = Number(V.genderidentity);
	const meterUsable = V.genderidentity !== null && V.genderidentity !== "" && Number.isFinite(currentMeter);
	const needsSeed = !meterUsable;
	const needsMigration = V.xchange.giMeterVersion !== meterVersion && V.xchange.giAutoEnabled === true;

	V.genderidentity = needsSeed || needsMigration ? V.xchange.giTarget : currentMeter;
	V.xchange.giInitialized = true;
	V.xchange.giMeterVersion = meterVersion;
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
	return current < Math.round(range * (6 / 15));
}
window.playerFeelsManlike = playerFeelsManlike;

function playerFeelsGirllike() {
	mapToLegacyGenderIdentity();
	const range = Number(V.xchange?.giRange) || 1500;
	const current = Math.clamp(Number(V.genderidentity) || 0, 0, range);
	return current >= Math.round(range * (9 / 15));
}
window.playerFeelsGirllike = playerFeelsGirllike;

/* Returns player identity: "m", "f", or "n". Use this instead of body sex for gender identity. */
function playerFeltGender() {
	/* Use window so premium pills preserve presentationGenderOverride. */
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

/* Determines crossdress/genderification direction by body sex:
male = "sissy", female = "butch".
Not used for genderflip or herm changes. */
function xchangeGenderificationDirection() {
	const pill = V.xchange?.pill;
	if (pill && (pill.genderflipEffect || pill.hermEffect)) return "none";
	if (V.player?.sex === "m") return "sissy";
	if (V.player?.sex === "f") return "butch";
	return "none";
}
window.xchangeGenderificationDirection = xchangeGenderificationDirection;
