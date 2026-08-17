/**
 * @param {number|string} id
 */
function npcPillTimerPaused(id) {
	let vaginalPregnancy;
	if (typeof id === "number") vaginalPregnancy = !!V.NPCName[id]?.pregnancy.type;
	else vaginalPregnancy = !!C.npc[id]?.pregnancy.type;

	return V.xchange.pillPermanence !== 1 && vaginalPregnancy;
}
window.npcPillTimerPaused = npcPillTimerPaused;

/**
 * @param {number|string} id
 */
function npcPillIsPermanent(id) {
	if (typeof id === "number") return (V.NPCName[id]?.xchange?.duration ?? 0) <= -1;
	else return (C.npc[id].xchange?.duration ?? 0) <= -1;
}
window.npcPillIsPermanent = npcPillIsPermanent;

/**
 * @param {number} npcno
 * @param {string} npcname
 * @param {string} sex "f" or "m"
 */
function npcStartingSexIs(npcno, npcname, sex) {
	const npc = npcname !== undefined && C.npc[npcname] ? C.npc[npcname] : npcno !== undefined ? V.NPCList[npcno] : undefined;
	if (!npc) return false;
	/* Use the live, pre-pill body to choose a transformation direction.
	Once pilled, startingSex remains the stable baseline used by removal/restoration paths. */
	return (npc.xchange ? npc.startingSex : npc.gender) === sex;
}
window.npcStartingSexIs = npcStartingSexIs;

/* The one authoritative breast-size word list.
Every X-Change body-swap widget used to carry its own copy of this array; they now all read it from here so the wording can never drift apart. */
const npcBreastSizeWords = ["nipple", "budding", "tiny", "small", "pert", "modest", "full", "large", "ample", "massive", "huge", "gigantic", "enormous"];
window.npcBreastSizeWords = npcBreastSizeWords;

/**
 * Breast wording for a given size, e.g. 0 -> "nipple"/"nipples", 6 -> "full breast"/"full breasts".
 *
 * @param {number} size
 * @returns {{breastdesc: string, breastsdesc: string}}
 */
function npcBreastText(size) {
	const n = Math.clamp(Math.round(Number(size)) || 0, 0, npcBreastSizeWords.length - 1);
	if (n === 0) return { breastdesc: "nipple", breastsdesc: "nipples" };
	return { breastdesc: npcBreastSizeWords[n] + " breast", breastsdesc: npcBreastSizeWords[n] + " breasts" };
}
window.npcBreastText = npcBreastText;

/**
 * Rebuilds a generic NPC's "<description> <noun>" name after a body swap has changed their pronoun
 * e.g. "slender man" -> "slender woman". Falls back to sane words rather than letting a missing field reach the player as "undefined".
 *
 * @param {object} npc an $NPCList slot
 */
function npcRebuildFullDescription(npc) {
	if (!npc) return;
	const description = npc.description && npc.description !== "undefined" ? npc.description : npc.nam || "mysterious";
	let noun;
	if (npc.role && npc.role !== "normal" && npc.role !== "undefined") noun = npc.role;
	else if (npc.pronoun === "m") noun = npc.teen === 1 ? "boy" : "man";
	else noun = npc.teen === 1 ? "girl" : "woman";
	npc.description = description;
	npc.fullDescription = description + " " + noun;
}
window.npcRebuildFullDescription = npcRebuildFullDescription;

/**
 * Repairs the descriptive text fields of a single NPC record so combat narration can never print
 * "undefined" or echo a raw variable name at the player.
 *
 * Only genuinely broken values are touched: a body-swap widget can leave a record with a new
 * breast size but no matching wording, or with an identity field that never existed on the
 * source record it was copied from. Sound records pass through untouched, so this is not a
 * blanket sanitiser - it is the write-side guarantee for the pill widgets that call it.
 *
 * @param {object} npc an $NPCList slot or an $NPCName row
 * @param {string} [where] label for the console warning, so a recurring producer can be pinned
 * @returns {string[]} the names of the fields that had to be repaired
 */
function npcRepairBodyText(npc, where) {
	if (!npc || typeof npc !== "object") return [];
	const fixed = [];
	const broken = v => v === undefined || v === null || v === "undefined" || (typeof v === "string" && v.includes("undefined"));

	/* A non-numeric size makes every "lte 1" flat-chest test fall through to the breasts branch. */
	if (!Number.isFinite(Number(npc.breastsize))) {
		npc.breastsize = npc.pronoun === "m" ? 0 : 3;
		fixed.push("breastsize");
	}
	if (broken(npc.breastdesc) || broken(npc.breastsdesc)) {
		const text = npcBreastText(npc.breastsize);
		npc.breastdesc = text.breastdesc;
		npc.breastsdesc = text.breastsdesc;
		fixed.push("breastdesc", "breastsdesc");
	}
	if (broken(npc.penisdesc)) {
		npc.penisdesc = npc.penis === "none" ? "none" : "penis";
		fixed.push("penisdesc");
	}

	/* Identity text, for generic enemies only. A persistent $NPCName row is named by .nam/.title and
	   has no .description/.role/.fullDescription of its own, so it must not have them invented. */
	if (!npc.nam) {
		if (broken(npc.role)) {
			npc.role = "normal";
			fixed.push("role");
		}
		if (broken(npc.description)) {
			npc.description = "mysterious";
			fixed.push("description");
		}
		if (broken(npc.fullDescription) && npc.type === "human") {
			let noun;
			if (npc.role !== "normal") noun = npc.role;
			else if (npc.pronoun === "m") noun = npc.teen === 1 ? "boy" : "man";
			else noun = npc.teen === 1 ? "girl" : "woman";
			npc.fullDescription = npc.description + " " + noun;
			fixed.push("fullDescription");
		}
	}

	if (fixed.length) console.warn("[DoLX] repaired NPC text fields [" + fixed.join(", ") + "] in " + (where || "unknown") + " (passage " + V.passage + ")");
	return fixed;
}
window.npcRepairBodyText = npcRepairBodyText;

/**
 * Whitelist gate for pilling NPCs in combat. Generic (unnamed) enemies stay pillable as before.
 * Named NPCs are restricted:
 *   - Kylar, Robin and Sydney can always be pilled.
 *   - Bailey can always be pilled, but erupts on the spot (see <<xchange-pilled-fury>>).
 *   - Whitney can only be pilled when fond and not too dominant (love >= 25, dom <= 15).
 *   - Any other named NPC cannot be pilled (they angrily slap the pill away).
 *
 * `$statFreeze` is used for flashbacks and fixed past events that happened before X-Change pills existed, so pilling is disabled in those scenes.
 * The only exception is Raul in the Raul and Janet daydream, since that scene is the player's imagination and can change to fit the current situation.
 *
 * @param {number|string} id an NPCList index, or an NPC name / fullDescription
 */
function npcXchangePillable(id) {
	let name;
	if (typeof id === "number") {
		const npc = V.NPCList && V.NPCList[id];
		if (!npc) return false;
		name = npc.fullDescription;
	} else {
		name = id;
	}
	if (V.statFreeze && name !== "Raul") return false;
	const isNamed = V.NPCNameList && V.NPCNameList.includes(name);
	if (!isNamed) return true; // generic/unnamed enemies
	if (name === "Kylar" || name === "Robin" || name === "Sydney" || name === "Bailey") return true;
	if (name === "Whitney") {
		const w = C.npc && C.npc.Whitney;
		return !!w && w.love >= 25 && w.dom <= 15;
	}
	return false; // any other named NPC
}
window.npcXchangePillable = npcXchangePillable;

/**
 * Live pill status for a Named NPC, for UI display (social tab tag, traits overlay).
 * Returns null when the NPC has no active pill, otherwise {label, colour, text}.
 *
 * @param {string} name
 */
function npcXchangePillStatus(name) {
	const npc = name ? C.npc[name] : undefined;
	const pill = npc?.xchange;
	if (!pill) return null;

	const toFemale = npc.gender === "f";
	let colour = "grey";
	let body;
	if (pill.hermEffect) {
		colour = "purple";
		body = "a hermaphrodite body";
	} else if (pill.genderflipEffect) {
		colour = toFemale ? "pink" : "lblue";
		body = toFemale ? "a female body" : "a male body";
	} else if (pill.genderificationEffect) {
		colour = "teal";
		body = toFemale ? "a feminised body" : "a masculinised body";
	}

	let text = body ? `${name} is under an X-Change pill and currently has ${body}.` : `${name} is under an effect-only X-Change pill.`;
	if (pill.genderflipEffect) {
		const pronouns = npc.pronoun === "f" ? "she/her" : "he/him";
		/* genderChanged is only recorded since the "sex only" setting exists; older pills always flipped gender. */
		text +=
			pill.genderChanged === false
				? ` Only ${name}'s sex changed: still referred to as ${pronouns}.`
				: ` ${name}'s gender changed too: now referred to as ${pronouns}.`;
	}

	if (pill.duration <= -1) {
		text += " The change is permanent.";
	} else if (V.xchange.pillPermanence !== 1 && !!npc.pregnancy?.type) {
		text += " The pill timer is paused by pregnancy.";
	} else {
		const days = Math.floor(pill.duration / 24);
		const hours = pill.duration % 24;
		const parts = [];
		if (days > 0) parts.push(`${days} day${days === 1 ? "" : "s"}`);
		if (hours > 0) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
		text += ` Wears off in ${parts.length ? parts.join(" and ") : "less than an hour"}.`;
	}

	return { label: "X-Changed", colour, text };
}
window.npcXchangePillStatus = npcXchangePillStatus;

function npcIsXChanged(id) {
	if (typeof id === "number") {
		return !!V.NPCList[id]?.xchange;
	} else {
		return !!C.npc[id]?.xchange;
	}
}
window.npcIsXChanged = npcIsXChanged;

function npcXChangeHourlyCheck(hours = 1) {
	if (!V.statFreeze) {
		for (let n = 0; n < V.NPCName.length; n++) {
			const pill = V.NPCName[n].xchange;
			if (pill !== undefined) {
				// Tick the pill's duration down if the pill isn't permanent
				if (!npcPillIsPermanent(n)) pill.duration = Math.max(pill.duration - 1 * hours, 0);

				// Clamp the pill duration to only ever save up to 30 days (in particular for Continue pills)
				if (pill.continueEffect) pill.duration = Math.min(pill.duration, 30 * 24);

				// If the pill has the continue effect, and a remaining duration of 30 days is accumulated
				// then, the change becomes permanent
				if (V.xchange.pillPermanence === 1 && !npcPillIsPermanent(n) && pill.continueEffect && pill.duration >= 30 * 24)
					wikifier("npc-xchange-setpermanent", V.NPCName[n].nam);

				// If got impregnated in the vagina, then, the change becomes permanent
				if (V.xchange.pillPermanence === 1 && !npcPillIsPermanent(n) && !!V.NPCName[n].pregnancy.type) wikifier("npc-xchange-setpermanent", V.NPCName[n].nam);

				// Check if the pill should expire
				if (pill.duration === 0) {
					pill.shouldHaveEnded = true;

					if (!npcPillIsPermanent(n) && !npcPillTimerPaused(n) && pill.resistanceEffect && random(0, 100) > pill.resistanceChance) {
						if (V.xchange.pillPermanence === 1) wikifier("npc-xchange-setpermanent", V.NPCName[n].nam);
						else {
							pill.duration += Math.max(1, V.xchange.resistanceDaysPenalty) * 24;
							pill.resistanceEffect = false;
							pill.fertile = true;
							pill.resistanceFakeout = true;
						}
					} else if (!npcPillIsPermanent(n) && !npcPillTimerPaused(n)) {
						wikifier("npc-xchange-restore", V.NPCName[n].nam);
					}
				}

				// Force the pill to expire if pill permanence is disabled, and no condition is preventing it from expiring
				else if (V.xchange.pillPermanence !== 1 && npcPillIsPermanent(n) && !V.xchange.pill.choiceEffect) {
					pill.duration = 0;
					if (!npcPillTimerPaused(n)) {
						wikifier("npc-xchange-restore", V.NPCName[n].nam);
					}
				}

				// // Progress the fakeout timer for as long as the "should have ended" flag stands, else reset it.
				// if (pill.shouldHaveEnded)
				//     pill.countdown += 1 * hours;
				// else
				//     pill.countdown = 0;

				// // Reveal that you didn't turn back
				// if (pill.shouldHaveEnded && !wondersAboutPillEnd()) {
				//     V.xchangePermanenceMessage = 1;
				//     delete pill.shouldHaveEnded;
				// }

				// // Drop the resistance facade when the uncertain period has expired
				// if (pill.resistanceFakeout === true && !wondersAboutPillEnd()) {
				//     delete pill.resistanceFakeout;
				//     delete pill.shouldHaveEnded;
				// }
			}

			// Apply hour-random passion effect
			for (let i = 0; i < hours; i++) {
				if (pill?.passionEffect && ((V.substanceRebalance === 1 && random(0, 10) === 0) || random(0, 8) === 0)) {
					V.NPCName[n].lust = Math.clamp(V.NPCName[n].lust + 5, 0, 100);
					// wikifier("drugs", V.substanceRebalance == 1? 120 : 200);
					// V.effectsmessage = 1;
					// V.xchange_passion_message = 1;
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
}
window.npcXChangeHourlyCheck = npcXChangeHourlyCheck;
