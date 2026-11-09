/* globals currentSkillValue */
function getEyeDisplayName(key) {
	const entry = setup.colours.eyes_map[key];
	if (!entry) return key;

	if (typeof entry.name === "string" && !/^colorWheelTemporary\d+$/.test(entry.name)) {
		return entry.name;
	}

	if (entry.canvasfilter && typeof entry.canvasfilter.blend === "string" && typeof window.colorNamer === "function") {
		const colourName = window.colorNamer(entry.canvasfilter.blend);
		if (typeof window.colorNameTranslate === "function") {
			return window.colorNameTranslate(colourName, "spaced name");
		}
		return colourName;
	}

	return entry.name || key;
}
window.getEyeDisplayName = getEyeDisplayName;

function buildEyeDetails() {
	let sentence = "";
	let concatFlag = false;
	const lenses = V.makeup.eyelenses;
	const colourMap = setup.colours.eyes_map;

	if (lenses.right !== 0 || lenses.left !== 0) {
		sentence += "You wear ";
		if (typeof lenses.left === "string") {
			sentence += getEyeDisplayName(lenses.left);
			concatFlag = true;
		}
		if (typeof lenses.right === "string" && lenses.left !== lenses.right) {
			if (concatFlag) sentence += " and ";
			sentence += getEyeDisplayName(lenses.right);
			concatFlag = true;
		}
		if (concatFlag) {
			sentence += " eye lenses ";
		}
		sentence += "on top of your ";
	} else {
		sentence += "You have ";
	}
	concatFlag = false;

	const leftEyeColour = colourMap[V.leftEyeColour];
	const rightEyeColour = colourMap[V.rightEyeColour];
	if (typeof leftEyeColour === "object") {
		sentence += getEyeDisplayName(V.leftEyeColour);
		concatFlag = true;
	}
	if (typeof rightEyeColour === "object" && V.leftEyeColour !== V.rightEyeColour) {
		if (concatFlag) sentence += " and ";
		sentence += getEyeDisplayName(V.rightEyeColour);
		concatFlag = true;
	}
	if (concatFlag) sentence += " eyes";
	return sentence + ".";
}
window.buildEyeDetails = buildEyeDetails;

/**
 * Attempts to extrapolate $eyecolour and $makeup.lenses into distinct units.
 * $makeup.lenses gets turned into an object { left : 0, right : 0 }, where the values are 0 or a string.
 * $eyecolour gets assigned to both $leftEyeColour and $rightEyeColour.
 */
function restructureEyeColourVariable() {
	if (V.objectVersion.eyeRepair === undefined) {
		V.objectVersion.eyeRepair = 0;
	}

	switch (V.objectVersion.eyeRepair) {
		case 0: {
			/* Both $leftEyeColour and $rightEyeColour should be the original colours for a character's eyes.
				This function below sets it to $eyecolour, if that fails, $eyeselect, then defaults to purple, the default.
				For it to fail, it must be undefined, it is unlikely that $eyeselect is undefined, but it's likely possible. */
			const getColour = () => (typeof V.eyecolour === "string" ? V.eyecolour : V.eyeselect) || "purple";
			if (!V.leftEyeColour) {
				V.leftEyeColour = getColour();
			}
			if (!V.rightEyeColour) {
				V.rightEyeColour = getColour();
			}
			delete V.eyecolour;
			V.objectVersion.eyeRepair = 1;
		}
		/* falls through */
		case 1:
		case 2:
		case 3: {
			if (!V.makeup) return; /* back out if makeup broken */

			let lenses = V.makeup.eyelenses;
			/* If lenses is not string object or number, or null, it's bad and we hard set */
			if (!["string", "object", "number"].includes(typeof lenses) || !lenses) V.makeup.eyelenses = { left: 0, right: 0 };
			else if (typeof lenses !== "object") {
				/* String or Number so we assign in to new object */
				V.makeup.eyelenses = {
					left: lenses,
					right: lenses,
				};
			}
			lenses = V.makeup.eyelenses;
			/* object - reassign and fix number if needed */
			if (typeof lenses.left === "number") lenses.left = 0;
			if (typeof lenses.right === "number") lenses.right = 0;
			V.objectVersion.eyeRepair = 4;
			break;
		}
	}
}
window.restructureEyeColourVariable = restructureEyeColourVariable;

/* Old saves stored some children's eyeColour as a parent's name instead of a colour, so swap those for a real inherited one. */
function fixChildEyeColours() {
	const validEyeColours = [...setup.colours.eyes.map(e => e.variable), ...(V.custom_eyecolours ?? []).map(e => e.variable)];
	const fixEye = record => {
		if (!record.features || validEyeColours.includes(record.features.eyeColour)) return;
		const known = [record.mother, record.father].map(p => (p === "pc" ? V.eyeselect : C.npc[p] ? C.npc[p].eyeColour : undefined)).filter(Boolean);
		record.features.eyeColour = eyeColourCalc(known.length ? known[random(0, known.length - 1)] : undefined);
	};
	// Reads V.children from old pregnancy code and repairs broken eyeColours before migration to new pregnancy code.
	Object.values(V.children ?? {}).forEach(fixEye);
	[V.sexStats?.vagina?.pregnancy, V.sexStats?.anus?.pregnancy].forEach(p => p?.fetus?.forEach(fixEye));
	(V.NPCName ?? []).forEach(npc => npc?.pregnancy?.fetus?.forEach(fixEye));
	Object.values(V.storedNPCs ?? {}).forEach(npc => npc?.pregnancy?.fetus?.forEach(fixEye));
}
window.fixChildEyeColours = fixChildEyeColours;

window.patchCorruptLensesColors = function () {
	if (V.custom_eyecolours != null) {
		for (const index in V.custom_eyecolours)
			V.custom_eyecolours[index].canvasfilter.blend = window.colorNameTranslate(V.custom_eyecolours[index].variable, "hex");
	}
};

function initCustomLenses() {
	/* push custom eye_colours into setup.colours.eyes and sync eye colour map */
	let found, i, i2;
	for (i in V.custom_eyecolours) {
		found = 0;
		for (i2 in setup.colours.eyes) {
			if (setup.colours.eyes[i2].variable === V.custom_eyecolours[i].variable) found = 1;
		}
		if (!found) setup.colours.eyes.push(V.custom_eyecolours[i]);
	}
	window.buildColourMap("eyes", "custom_eyecolours");
}
window.initCustomLenses = initCustomLenses;

function hexToRgbArray(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;
}

function ColorToHex(color) {
	const hexadecimal = color.toString(16);
	return hexadecimal.length === 1 ? "0" + hexadecimal : hexadecimal;
}

const eyeColourGradient = function (rgbBegin, rgbEnd, p) {
	/* rgb can be RGB value in an array, or hex value in string */
	const w = p * 2 - 1;
	const w1 = (w + 1) / 2.0;
	const w2 = 1 - w1;

	if (typeof rgbBegin === "string" && rgbBegin[0] === "#") rgbBegin = hexToRgbArray(rgbBegin);
	if (typeof rgbEnd === "string" && rgbEnd[0] === "#") rgbEnd = hexToRgbArray(rgbEnd);
	const rgb = [parseInt(rgbBegin[0] * w2 + rgbEnd[0] * w1), parseInt(rgbBegin[1] * w2 + rgbEnd[1] * w1), parseInt(rgbBegin[2] * w2 + rgbEnd[2] * w1)];
	return "#" + ColorToHex(rgb[0]) + ColorToHex(rgb[1]) + ColorToHex(rgb[2]);
};

/* Randomize array in-place using Durstenfeld shuffle algorithm */
function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	}
	return array;
}

window.determineCatEyeStages = function () {
	/* to change the amount of changes, you only need to change the stages variable.
	same for targetColours */
	const green = "#36f029";
	const yellow = "#fbff26";
	const blue = "#26ccff";
	const orange = "#f59b25";

	const stages = 4; // amount of stages we'll have before reaching final colour
	const totalPercentage = 0.5 + Math.random() / 4; // 50%-75%
	/* How much of targetColour the current eye colour needs to adapt into.
	0.0 to 1.0 (0%-100%) */
	const baseColour = [setup.colours.eyes_map[V.leftEyeColour].canvasfilter.blend, setup.colours.eyes_map[V.rightEyeColour].canvasfilter.blend]; // base eye colours [left, right]

	let targetColours = shuffleArray([green, yellow, blue, orange]); // can add or edit colours
	/* We've already shuffled these so they're already random */
	targetColours.splice(-2); /* keep the last 2 */

	/* Clear existing variables 'cat_tf_stage_' */
	V.custom_eyecolours = V.custom_eyecolours.filter(obj => !obj.variable.includes("cat_tf_stage_"));

	/* The right eye is the one we see the most.
	   If this eye is light blue and the target colour is blue, the player
	   might not notice a difference. So, swap the two eyes */
	if (V.rightEyeColour === "light blue" && targetColours[1] === blue) targetColours = [targetColours[1], targetColours[0]];
	for (let index = 1; index <= stages; index++) {
		const eyesResult = {
			left: eyeColourGradient(baseColour[0], targetColours[0], (totalPercentage / stages) * index), // left eye
			right: eyeColourGradient(baseColour[1], targetColours[1], (totalPercentage / stages) * index), // right eye
		};
		/* i goes between "left" and "right" here with these keys */
		for (const i in eyesResult) {
			const colourName = window.colorNamer(eyesResult[i]);
			const colourObject = {
				variable: "cat_tf_stage_" + (index - 1) + "_" + i,
				name: window.colorNameTranslate(colourName, "spaced name"),
				name_cap: window.colorNameTranslate(colourName, "spaced name").toUpperFirst(),
				csstext: colourName,
				natural: true,
				lens: false,
				canvasfilter: {
					blend: eyesResult[i],
					brightness: 0.27,
				},
			};
			for (const x in V.custom_eyecolours) {
				/* create new object for our new colour eye */
				/* again, 'i' is either "left" or "right" here */
				/* and x is actually a string */
				if (V.custom_eyecolours[x].variable === "cat_tf_stage_" + (index - 1) + "_" + i) V.custom_eyecolours[x] = colourObject;
				else if (x === (V.custom_eyecolours.length - 1).toString()) V.custom_eyecolours.push(colourObject);
			}
			if (V.custom_eyecolours.length === 0) V.custom_eyecolours.push(colourObject);
		}
	}
	initCustomLenses(); // sync new eye colours
};

window.defineCustomEyeColourStyle = function () {
	const normalEyes = { left: V.leftEyeColour, right: V.rightEyeColour };
	for (const side of ["left", "right"]) {
		/* This code constructs _custom_eyelenses_left_style / right_style */
		const varSideStyle = "custom_eyelenses_" + side + "_style";

		if (V.makeup.eyelenses[side] !== 0) {
			/* custom eyes colours */
			const colourArray = V.makeup.eyelenses[side].includes("colorWheelTemporary") ? setup.colours.eyes : V.custom_eyecolours;
			for (const colour of colourArray) {
				/* this does this for left and right */
				if (colour.variable === V.makeup.eyelenses[side])
					T[varSideStyle] =
						"filter: " +
						(V.makeup.eyelenses[side].includes("colorWheelTemporary")
							? window.colorNameTranslate(window.colorNamer(colour.canvasfilter.blend), "hue")
							: window.colorNameTranslate(V.makeup.eyelenses[side], "hue"));
			}
		} else if (normalEyes[side] !== 0 && (normalEyes[side].includes("colorWheelTemporary") || normalEyes[side].includes("cat_tf_stage"))) {
			// normal eyes colours
			const colourArray = normalEyes[side].includes("cat_tf_stage") ? V.custom_eyecolours : setup.colours.eyes;
			for (const colour of colourArray) {
				/* this does this for left and right */
				if (colour.variable === normalEyes[side]) T[varSideStyle] = "filter: " + window.colorNameTranslate(window.colorNamer(colour.canvasfilter.blend), "hue");
			}
		}
	}
};

/*
	Physical eye covering, including after the player has adapted.

	The player is blinded by a blindfold, by the sleeping mask when it is pulled down, or by blackout lenses in both eyes.
	Use pcIsBlinded() to check whether the covering still prevents navigation.
*/
function pcEyesCovered() {
	return pcFaceCoversEyes() || pcBlackoutLensesWorn();
}
window.pcEyesCovered = pcEyesCovered;

/* Eye covering worn in the face slot, which other people can see. */
function pcFaceCoversEyes() {
	const face = V.worn?.face;
	if (!face || !Array.isArray(face.type)) return false;
	/* A blindfold torn off in combat leaves the item behind but stops covering anything. */
	if (face.type.includes("broken")) return false;
	if (face.type.includes("blindfold")) return true;
	if (face.variable === "sleeping mask" && face.altposition === "alt") return true;
	return false;
}
window.pcFaceCoversEyes = pcFaceCoversEyes;

/* Blackout contact lenses only blind the player when both eyes are occupied by a blackout lens. */
function pcBlackoutLensesWorn() {
	const lenses = V.makeup?.eyelenses;
	return !!(lenses?.left && lenses.right && lenses.blackoutLeft && lenses.blackoutRight);
}
window.pcBlackoutLensesWorn = pcBlackoutLensesWorn;

/* Name of the item blocking the player's sight, for text shown while blinded. */
function pcBlindCoveringName() {
	return pcFaceCoversEyes() ? V.worn.face.name : "contacts";
}
window.pcBlindCoveringName = pcBlindCoveringName;

/* Colours the player owns as blackout lenses for stock and custom lenses. */
function ownedBlackoutLenses() {
	return V.makeup.owned.blackout_eyelenses || [];
}
window.ownedBlackoutLenses = ownedBlackoutLenses;

function addBlackoutLens(colour) {
	V.makeup.owned.blackout_eyelenses ??= [];
	V.makeup.owned.blackout_eyelenses.pushUnique(colour);
}
window.addBlackoutLens = addBlackoutLens;

/* Whether a blackout lens is inserted in each eye is stored next to that eye's colour. */
function wearContactLens(colour, eyes, blackout) {
	if (eyes === "Left eye") {
		V.makeup.eyelenses.left = colour;
		V.makeup.eyelenses.blackoutLeft = !!blackout;
	} else if (eyes === "Right eye") {
		V.makeup.eyelenses.right = colour;
		V.makeup.eyelenses.blackoutRight = !!blackout;
	} else {
		V.makeup.eyelenses = { left: colour, right: colour, blackoutLeft: !!blackout, blackoutRight: !!blackout };
	}
}
window.wearContactLens = wearContactLens;

/* Whether the player owns, or is already wearing, the lens saved for this eye ("left" or "right"). */
function outfitLensAvailable(lenses, side) {
	const colour = lenses[side];
	if (!colour) return true;
	const blackoutKey = side === "left" ? "blackoutLeft" : "blackoutRight";
	if (lenses[blackoutKey]) return ownedBlackoutLenses().includes(colour);
	const owned = V.makeup.owned ?? {};
	const wearingOrdinary = V.makeup.eyelenses[side] === colour && !V.makeup.eyelenses[blackoutKey];
	return !!(owned.eyelenses?.includes(colour) || owned.custom_eyelenses?.includes(colour) || wearingOrdinary);
}
window.outfitLensAvailable = outfitLensAvailable;

function outfitLensName(lenses, side) {
	const blackout = lenses[side === "left" ? "blackoutLeft" : "blackoutRight"];
	return `${getEyeDisplayName(lenses[side])} ${blackout ? "blackout " : ""}contacts`;
}
window.outfitLensName = outfitLensName;

/* The text shown on the makeup preset screen for the lens saved for this eye, such as "Red Blackout". */
function presetLensLabel(lenses, side) {
	const colour = lenses[side];
	if (!colour) return "None";
	return colour.toUpperFirst() + (lenses[side === "left" ? "blackoutLeft" : "blackoutRight"] ? " Blackout" : "");
}
window.presetLensLabel = presetLensLabel;

/* The mirror's description of the worn lenses. Empty when no blackout lens is inserted. */
function blackoutLensDescription() {
	const lenses = V.makeup.eyelenses;
	const leftBlackout = !!(lenses.left && lenses.blackoutLeft);
	const rightBlackout = !!(lenses.right && lenses.blackoutRight);
	if (!leftBlackout && !rightBlackout) return "";
	const single = (colour, blackout) => {
		const name = getEyeDisplayName(colour);
		return `${/^[aeiou]/i.test(name) ? "an" : "a"} ${name} ${blackout ? "blackout " : ""}contact`;
	};
	if (leftBlackout && rightBlackout) {
		if (lenses.left === lenses.right) return `You are wearing ${getEyeDisplayName(lenses.left)} blackout contacts. You can't see through them.`;
		return `You are wearing ${single(lenses.left, true)} in your left eye and ${single(lenses.right, true)} in your right eye. You can't see through them.`;
	}
	const [eye, otherEye] = leftBlackout ? ["left", "right"] : ["right", "left"];
	if (lenses[otherEye]) {
		const parts = { left: single(lenses.left, leftBlackout), right: single(lenses.right, rightBlackout) };
		return `You are wearing ${parts.left} in your left eye and ${parts.right} in your right eye. You can still see through your ${otherEye} eye.`;
	}
	const natural = getEyeDisplayName(otherEye === "left" ? V.leftEyeColour : V.rightEyeColour);
	return `You are wearing ${single(
		lenses[eye],
		true
	)} in your ${eye} eye. Your ${otherEye} eye is your natural ${natural} colour, and you can still see through it.`;
}
window.blackoutLensDescription = blackoutLensDescription;

/* Redraws the pharmacy's colour list when the blackout box changes, because each list leaves out the colours already owned in that form. */
function bindBlackoutLensToggle() {
	$(document).one(":passagedisplay", () => {
		$("#lensBlackoutToggle input").on("change", () => {
			$("#pharmacyLensStock").empty().wiki('<<pharmacyLensStock>><<numberify "#passages > .passage">>');
		});
	});
}
window.bindBlackoutLensToggle = bindBlackoutLensToggle;

function blindAdaptationStrength() {
	if (V.blindAdaptation?.locked) return 1;
	return Math.min(1, (V.blindAdaptation?.minutes ?? 0) / 10080);
}
window.blindAdaptationStrength = blindAdaptationStrength;

function blindSkillFailureChance() {
	return pcEyesCovered() ? Math.ceil(30 * (1 - blindAdaptationStrength()) * (pcHasBlindCane() ? 0.8 : 1)) : 0;
}
window.blindSkillFailureChance = blindSkillFailureChance;

function pcHasBlindCane() {
	const handheld = V.worn?.handheld;
	return handheld?.variable === "cane" && handheld.integrity >= 1 && !handheld.type.includes("broken");
}
window.pcHasBlindCane = pcHasBlindCane;

function pcIsBlinded() {
	return pcEyesCovered() && blindAdaptationStrength() < 1;
}
window.pcIsBlinded = pcIsBlinded;

function blindAdaptationTimePassed(minutes) {
	if (minutes <= 0 || V.statFreeze) return;
	const covered = pcEyesCovered();
	/* With the "Locks in" setting, full Adaptability becomes permanent. A lock is kept if the setting changes later. */
	if (V.blindAdaptation?.minutes >= 10080 && V.xchange?.blindAdaptabilityKeep === "auto") V.blindAdaptation.locked = true;
	if (!covered && (!V.blindAdaptation || V.blindAdaptation.minutes === 0 || V.blindAdaptation.locked || V.hypnosis_traits?.adaptability)) return;
	V.blindAdaptation ??= { minutes: 0 };
	const state = V.blindAdaptation;
	let senses = 0;
	for (const animal of ["wolf", "bear", "cat", "fox", "bunny", "waterdragon", "bird", "cow"]) {
		if (Transformations.effectiveLevel(animal) >= 2) senses++;
	}
	if (covered) {
		const before = state.minutes;
		state.minutes = Math.min(10080, state.minutes + minutes * (1 + senses * 0.25) * (pcHasBlindCane() ? 0.25 : 1));
		if (before < 10080 && state.minutes === 10080) {
			V.timeMessages ??= [];
			V.timeMessages.pushUnique("blindAdaptation");
			if (V.xchange?.blindAdaptabilityKeep === "auto") state.locked = true;
		}
		if (Transformations.effectiveLevel("bird") >= 2 || Transformations.effectiveLevel("cow") >= 2) statChange.stress(-minutes / 60);
		if (V.backgroundTraits.includes("insanity") && !V.insanityPermanent) statChange.trauma(-minutes / 1440);
	} else {
		state.minutes = Math.max(0, state.minutes - minutes / (1 + senses * 0.25));
	}
}
window.blindAdaptationTimePassed = blindAdaptationTimePassed;

/*
	Whether Gwylan offers help with full Adaptability. The "Gwylan locks it in" setting makes the help permanent; otherwise it is a timed hypnosis.
	Gwylan needs 50% love, or with the no-love setting, Gwylan's first favour done.
*/
function blindAdaptationGwylanReady(lovePercent) {
	const keep = V.xchange?.blindAdaptabilityKeep;
	if (blindAdaptationStrength() < 1 || V.blindAdaptation?.locked || keep === "auto") return false;
	if (keep !== "gwylan" && V.hypnosis_traits?.adaptability) {
		const timer = V.hypnosisTimers?.adaptability;
		if (!timer || timer.time >= Math.floor(timer.max / 2)) return false;
	}
	return V.xchange?.blindAdaptabilityNoLove ? V.gwylanSeen.includes("request_intro") : lovePercent >= 50;
}
window.blindAdaptationGwylanReady = blindAdaptationGwylanReady;

/*
	True only when the player chose removable darkness, not when it was forced on them.
*/
function pcIsBlindedByChoice() {
	if (!pcIsBlinded()) return false;
	return !pcFaceCoversEyes() || V.worn.face.cursed !== 1;
}
window.pcIsBlindedByChoice = pcIsBlindedByChoice;

/*
	Performance penalty when acting blind. Only applies when the player uses a sex skill.

	Forced blindness has a larger penalty than chosen blindness.
	Higher skill reduces the penalty.
*/
function blindSexMultiplier(skillName) {
	if (!pcIsBlinded()) return 1;
	const penalty = pcIsBlindedByChoice() ? 0.2 : 0.3;
	/* Up to half the penalty is bought back at maxed skill in the act being performed. */
	let skill = 0;
	if (skillName && typeof currentSkillValue === "function") {
		skill = Math.clamp(currentSkillValue(skillName) / 1000, 0, 1);
	}
	return 1 - penalty * (1 - skill * 0.5) * (1 - blindAdaptationStrength());
}
window.blindSexMultiplier = blindSexMultiplier;
