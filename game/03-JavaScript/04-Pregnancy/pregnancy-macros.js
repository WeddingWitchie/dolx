/* globals xchangeDonorFertility, playerClearClimax */
// The pregnancy macros that scenes can call.
// Combat calls <<combatInseminate>> and everything about the load is worked out from the fight.
// Story scenes call <<sceneInseminate>> and provide the details themselves.
// Cum inside an NPC is one <<npcPregnancyRoll>> on the spot, NPCs store no loads.

// Which impregnable hole and landing depth each penis state means.
// The names come from the $NPCList[n].penis states during combat/sex.
// States not listed here (mouth, thighs, etc.) leave nothing behind.
const depthFromPenisState = {
	vaginaentrance: ["vagina", "outside"],
	vaginaentrancedouble: ["vagina", "outside"],
	vaginaimminent: ["vagina", "imminent"],
	vaginaimminentdouble: ["vagina", "imminent"],
	vagina: ["vagina", "deep"],
	vaginadouble: ["vagina", "deep"],
	anusentrance: ["anus", "outside"],
	anusentrancedouble: ["anus", "outside"],
	anusimminent: ["anus", "imminent"],
	anusimminentdouble: ["anus", "imminent"],
	anus: ["anus", "deep"],
	anusdouble: ["anus", "deep"],
	cheeks: ["anus", "outside"],
};

// The generated NPC types with birth content.
const randomCarrierTypes = ["human", "wolf", "wolfboy", "wolfgirl"];

/**
 * Called by the ejaculation widgets when an NPC climaxes in combat.
 * The fight fills in every detail of the load.
 *
 * `<<combatInseminate _nn>>` or `<<combatInseminate _jj true>>` (beast)
 *
 * @param {0|1|2|3|4|5} slot which $NPCList slot climaxed
 * @param {boolean} [beast=false] pass true from the beast widget to keep the beast's species and
 *   let _pregnancyBoost raise potency
 * @returns {Load|null} the stored load. null = nothing was stored
 */
function combatInseminate(slot, beast = false) {
	const npc = V.NPCList[slot];
	const landing = depthFromPenisState[npc.penis];
	if (!landing) return null;
	const [orifice, depth] = landing;

	if (npcHasStrapon(slot)) return null;
	if (condomState(slot) === "worn") return null;
	if (playerChastity(orifice)) return null;
	const donorSpecies = !beast && V.enemytype === "man" ? "human" : npc.type;
	// canPlayerConceive treats an unlisted species as a bug and throws
	if (!setup.pregnancy.typesEnabled.includes(donorSpecies)) return null;

	// Beast widget makes knots more potent (_pregnancyBoost)
	// A size 1 penis dribbles at half potency
	let potency = 1;
	if (beast && T.pregnancyBoost) potency = 1 + T.pregnancyBoost / 100;
	else if (npc.penissize === 1) potency = 0.5;

	const load = inseminate(orifice, npc.fullDescription, donorSpecies, depth, V.location, potency, null);
	if (load) {
		const carrierAction = orifice === "vagina" ? V.vaginaaction : V.anusaction;
		instantConception(orifice, load, carrierAction === "forceImpregnation");
	}
	return load;
}
window.combatInseminate = combatInseminate;

/**
 * Conceive from a load right now. Creates the PC's pregnancy and displays the fetish mode banner.
 * Shared by the Force Impregnation action and the fetish pregnancy roll.
 *
 * @param {"vagina"|"anus"} orifice
 * @param {Load} load the load that conceives
 * @returns {number} the new pregnancyId
 */

function conceiveNow(orifice, load, slot = availablePlayerPregnancySlot(orifice)) {
	if (slot === null) return null;
	const pregnancyId = createPregnancy(
		"pc",
		"human",
		load.donor,
		load.donorSpecies,
		[{ name: load.donor, species: load.donorSpecies }],
		Time.date.timeStamp,
		orifice,
		load.location,
		slot === "vagina2" ? 2 : 1
	);
	// Realistic mode keeps the player in the dark. Fetish and silly both tell them at once.
	if (V.settings.pregnancyType !== "realistic") {
		setKnowsDonor(pregnancyId, "pc");
		setKnowsCarrier(pregnancyId, "pc");
		T.playerIsNowPregnant = load.donor;
	}
	return pregnancyId;
}

/**
 * Instant conception when a load lands. Demon PC's Force Impregnation action
 * conceives on the spot in every pregnancy mode. Fetish mode rolls the load's
 * realistic-mode odds in the moment.
 *
 * @param {"vagina"|"anus"} orifice
 * @param {Load} load the load that just landed
 * @param {boolean} [force=false] conceive unconditionally instead of the fetish-mode roll
 */
function instantConception(orifice, load, force = false) {
	const forced = force && !load.canWash;
	if (!forced && V.settings.pregnancyType !== "fetish") return;
	const slot = availablePlayerPregnancySlot(orifice);
	if (slot === null) return;
	if (orificeHasParasites(orifice)) return;
	const won = forced ? load : fetishPregnancyRoll(load, orifice);
	if (won) conceiveNow(orifice, won, slot);
}
window.instantConception = instantConception;

/**
 * Call this when a scene puts cum inside the player outside of combat.
 * Say who and where, the pregnancy system does the rest.
 *
 * For a creampie, `<<sceneInseminate "vagina" "Whitney" "human" "deep">>`
 *
 * For six loads lasting 12 days, `<<sceneInseminate "anus" "Harper's serum" "human" "deep" 6 12>>`
 *
 * @param {"vagina"|"anus"} orifice vagina or anus
 * @param {string} donor who it came from: an NPC's name, or "pc"
 * @param {DonorSpecies} donorSpecies the donor's species
 * @param {"outside"|"imminent"|"deep"} depth where it landed
 * @param {number} [quantity=1] how many loads. Optional (default = 1)
 * @param {number|null} [days] how long the loads last in days. Optional (default = 4 to 8 days)
 * @returns {Load|null} the last stored load. null = nothing was stored
 */
function sceneInseminate(orifice, donor, donorSpecies, depth, quantity = 1, days = null) {
	if (PregnancyConstants.depthWeight[depth] === undefined) throw new Error(`unknown depth "${depth}"`);
	if (!donorSpecies) throw new Error(`no donor species given for "${donor}"`);
	if (!setup.pregnancy.typesEnabled.includes(donorSpecies)) return null; // a quiet no for everyday non-impregnating species
	let lifespan = null;
	if (days !== null) lifespan = days * TimeConstants.secondsPerDay;
	let stored = null;
	for (let i = 0; i < quantity; i++) {
		const load = inseminate(orifice, donor, donorSpecies, depth, V.location, 1, lifespan);
		if (load === null) return null; // if the first load refuses, they all would
		stored = load;
		instantConception(orifice, load);
	}
	return stored;
}
window.sceneInseminate = sceneInseminate;

/**
 * Whether a generated NPC's pregnancy is followed to term, filing them in $storedNPCs if so.
 *
 * DoLX: a deliberate breeding is followed whether or not it was consensual, so a defeated enemy
 * still turns up with the baby later. Both paths stay capped so $storedNPCs cannot grow without bound.
 *
 * @param {number} slot the carrier's $NPCList slot
 * @param {string} location where it happened
 * @param {boolean} [deliberate=false] a forced impregnation, or a Bull/hyper-fertile player siring it
 * @returns {string|null} the key to record their pregnancy under, null when the game lets them walk away
 */
function rememberRandomCarrier(slot, location, deliberate = false) {
	if (V.consensual !== 1 && !deliberate) return null;
	const followed = Object.keys(V.storedNPCs).reduce((count, key) => (getActivePregnancies(key).length ? count + 1 : count), 0);
	const keep = deliberate || setup.pregnancy.randomAlwaysKeep.includes(location) ? followed <= 15 : followed <= 10 && random(0, 1 + followed) === 0;
	if (!keep) return null;
	return storeNPC(slot, "pregnancy");
}

/**
 * Call this when someone cums inside an NPC who could get pregnant from it.
 * One roll on the spot decides it, scaled by depth. NPCs store no loads, this roll is their whole conception.
 * An NPC with no pregnancy content written for them can only conceive when the player has turned unfinished content on.
 *
 * For a creampie, `<<npcPregnancyRoll "Robin" "human" "pc" "human" "vagina">>`
 *
 * For a spill that never went in, `<<npcPregnancyRoll "Robin" "human" "someone" "human" "vagina" "imminent">>`
 *
 * From a fight, pass the slot and it sorts named from generated NPCs itself:
 * `<<npcPregnancyRoll $NPCList[_nn].fullDescription $NPCList[_nn].type "pc" "human" "vagina" "deep" $location 1 _nn>>`
 *
 * @param {string} carrier the NPC who might get pregnant: a name, or a generated one like "lissome man"
 * @param {string} carrierSpecies what the carrier is, e.g. "human"
 * @param {string} donor who came inside them: an NPC's name, or "pc"
 * @param {DonorSpecies} donorSpecies the donor's species
 * @param {"vagina"|"anus"} orifice where the cum went
 * @param {"outside"|"imminent"|"deep"} [depth="deep"] where it landed. Can be left out for a creampie, a spill scales the chance down
 * @param {string} [location] where it happened. Left out reads the player's location, pass one when the scene runs off-screen
 * @param {number} [donorFertility=1] extra multiplier on the conception chance from the donor's side (e.g. the pc's low-semen or earSlime state)
 * @param {number|null} [slot=null] the carrier's $NPCList slot. A generated NPC in a slot is filed in $storedNPCs
 * @returns {number|null} the new pregnancyId. null = no conception, or a generated carrier the game does not follow
 */
function npcPregnancyRoll(carrier, carrierSpecies, donor, donorSpecies, orifice, depth = "deep", location = V.location, donorFertility = 1, slot = null) {
	const depthWeight = PregnancyConstants.depthWeight[depth];
	if (depthWeight === undefined) throw new Error(`unknown depth "${depth}"`);
	if (!donorSpecies) throw new Error(`no donor species given for "${donor}"`);
	if (!setup.pregnancy.typesEnabled.includes(donorSpecies)) return null; // a quiet no for everyday non-impregnating species
	const generated = slot !== null && !C.npc[carrier];
	if (generated && (V.NPCList[slot].pregnancy || !randomCarrierTypes.includes(carrierSpecies))) return null;
	if (getActivePregnancies(carrier).length) return null; // one pregnancy per body, as the player has
	// Unfinished pregnancy content toggle
	if (!V.settings.incompletePregnancyEnabled && C.npc[carrier] && !setup.pregnancy.canBePregnant.includes(carrier)) return null;
	// Dream sex leaves nothing behind, so a nightmare counts as a disabled scene.
	if (V.activeNightmare || impregnationDisabled(T.npcForceImpregnation)) return null;
	if (donor === "pc" && playerClearClimax()) return null; // clear climax carries no semen
	const infertile = setup.pregnancy.infertile.includes(carrier) || setup.pregnancy.infertile.includes(donor);
	if (!canNpcConceive(orifice, carrier, infertile)) return null;
	// GH bears eggs, BW bears pups
	const offspring = offspringSpecies(donorSpecies, carrierSpecies);
	if (!offspring) return null;
	// A forced impregnation skips the chance roll entirely.
	if (
		!T.npcForceImpregnation &&
		State.random() >=
			(V.settings.baseNpcPregnancyChance / 100) *
				depthWeight *
				npcMenstrualFertility(carrier) *
				npcConceptionModifier(carrier) *
				donorFertility *
				// DoLX: the Bull pill and Hyper Fertility make the player's own seed take.
				(donor === "pc" ? xchangeDonorFertility() : 1)
	)
		return null;

	// Fetish and silly modes only, and only when the player is the donor/the one impregnating
	const playerImpregnated = donor === "pc" && V.settings.pregnancyType !== "realistic";
	if (playerImpregnated) T.pregnantNpc = carrier; // the fetishPregnancyImg widget prints the banner from this
	let recorded = carrier;
	if (generated) {
		V.NPCList[slot].pregnancy = 1;
		/* A Bull or hyper-fertile player, or a forced impregnation, is a deliberate breeding. */
		const deliberate = !!T.npcForceImpregnation || (donor === "pc" && xchangeDonorFertility() > 1);
		recorded = rememberRandomCarrier(slot, location, deliberate);
		if (recorded === null) return null;
	}

	const time = Time.date.timeStamp;
	const pregnancyId = createPregnancy(recorded, carrierSpecies, donor, offspring, [{ name: donor, species: donorSpecies }], time, orifice, location);
	if (playerImpregnated) {
		setKnowsDonor(pregnancyId, "pc");
		if (!generated) setKnowsCarrier(pregnancyId, "pc");
	}
	return pregnancyId;
}
window.npcPregnancyRoll = npcPregnancyRoll;

// Silly pregnancy mode. Handholding and kissing conceive, sex does not.
// The virginity widgets call this on every handhold and kiss, and it is a no-op in the other modes.
const sillyTriggers = ["hand", "kiss"];

/**
 * Silly mode only. A handhold or a kiss can conceive, in either direction.
 *
 * `<<sillyInseminate "kiss" $_fullDescription $_type>>`
 *
 * The touch has to be skin on skin, so gloves stop a handhold and a face covering stops a kiss.
 * Being close to a love interest doubles the odds, the way the old silly mode did.
 *
 * @param {"hand"|"kiss"} trigger which contact happened
 * @param {string|object} other the other party: a name, or an NPC object
 * @param {DonorSpecies} [otherSpecies] their species, when `other` is a name
 * @returns {number|null} the player's new pregnancyId, null when nothing came of it
 */
function sillyInseminate(trigger, other, otherSpecies) {
	if (V.settings.pregnancyType !== "silly") return null;
	if (!sillyTriggers.includes(trigger) || !other) return null;

	// The widgets pass either the name or the whole NPC, so accept both.
	const name = typeof other === "string" || other instanceof String ? String(other) : other.fullDescription;
	const species = (typeof other === "string" || other instanceof String ? otherSpecies : other.type) || otherSpecies;
	if (!name || !species) return null;
	// Gwylan has to be hardcoded out, or their story content breaks down beyond repair.
	if (name === "Gwylan") return null;
	if (setup.pregnancy.infertile.includes(name)) return null;
	// A nightmare, flashback, dream or replay is not really happening, so nothing comes of it.
	if (V.activeNightmare || V.statFreeze || impregnationDisabled(false)) return null;

	// Skin on skin only.
	if (trigger === "hand" && V.worn.hands.name !== "naked") return null;
	if (trigger === "kiss" && V.worn.face.type.includes("face_covering")) return null;

	// Someone the player loves being in the scene makes it twice as likely.
	const boost = V.loveInterest && Object.values(V.loveInterest).some(n => V.NPCNameList.includes(n)) ? 2 : 1;

	// NPC side: one pregnancy roll, like a creampie.
	// Named NPCs only, since generated NPC pregnancies cannot be saved without an NPCList slot.
	if (C.npc[name]) npcPregnancyRoll(name, species, "pc", "human", "vagina", "deep", V.location, boost);

	// The player's side: the touch lands wherever their body can carry.
	if (!setup.pregnancy.typesEnabled.includes(species)) return null;
	const orifice = V.player.vaginaExist ? "vagina" : "anus";
	const slot = availablePlayerPregnancySlot(orifice);
	if (slot === null || orificeHasParasites(orifice)) return null;
	// Nothing is stored: silly mode is instant, like fetish mode, so this load only carries the roll.
	const load = inseminate(orifice, name, species, "deep", V.location, boost, null);
	if (!load || !fetishPregnancyRoll(load, orifice)) return null;
	return conceiveNow(orifice, load, slot);
}
window.sillyInseminate = sillyInseminate;

DefineMacro("combatInseminate", combatInseminate);
DefineMacro("sceneInseminate", sceneInseminate);
DefineMacro("npcPregnancyRoll", npcPregnancyRoll);
DefineMacro("sillyInseminate", sillyInseminate);
