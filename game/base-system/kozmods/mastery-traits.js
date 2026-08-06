/* globals V, setup */
/*
 * Mastery traits.
 *
 * Reaching the SSS grade in a skill takes a Tempered talent and a great deal of practice, and
 * on its own it only means slightly bigger numbers. These traits give a reason to push two
 * related skills to the top at once: each pair unlocks a named perk with a real effect.
 *
 * A trait is never stored on the save. It is worked out from the player's current skills every
 * time it is needed, so it appears the moment the skills qualify and disappears if something
 * later drags a skill back down. Nothing to migrate, nothing to backfill.
 */

/* The SSS grade. See the skill grade tables in characteristics.twee. */
const MASTERY_GRADE = 2000;

/*
 * These read the stored skill rather than currentSkillValue(), which shaves skills for
 * tiredness, clothing and the like. A trait that has been earned should not come and go with
 * the weather, and the grade on the characteristics screen is the stored value too.
 */

/**
 * @param {string} skill a plain skill variable, e.g. "oralskill" or "athletics"
 * @returns {boolean} true once that skill sits at the SSS grade
 */
function masterySkillMaxed(skill) {
	return (Number(V[skill]) || 0) >= MASTERY_GRADE;
}

/**
 * @param {string} skill a Combat Extended skill, e.g. "brawling"
 * @returns {boolean} true once that skill sits at the SSS grade
 */
function masteryCombatSkillMaxed(skill) {
	return (Number(V.combatExtended?.[skill]) || 0) >= MASTERY_GRADE;
}

/**
 * Physique has no letter grade, it is measured against the body's own ceiling instead.
 *
 * @returns {boolean} true when the PC is as strong as their body can get
 */
function masteryPhysiqueMaxed() {
	const max = (V.physiquesize || 0) * (V.AMCTraits?.physique ?? 1);
	if (max <= 0) return false;
	return (Number(V.physique) || 0) >= max * 0.95;
}

/*
 * Milk and semen are volumes rather than skills, so the measure is how much the body can hold
 * at its fullest. The two have different ceilings in normal play: a fully transformed cow holds
 * 6000 of milk, while the largest semen capacity is 4000.
 */
const MASTERY_FLUID_CAPACITY = { milk: 6000, semen: 4000 };

/**
 * @param {"milk"|"semen"} fluid
 * @returns {boolean} true when the body holds as much of that fluid as it can
 */
function masteryFluidCapacityMaxed(fluid) {
	const capacity = (fluid === "milk" ? V.milk_max : V.semen_max) || 0;
	return capacity * (V.AMCTraits?.[fluid] ?? 1) >= MASTERY_FLUID_CAPACITY[fluid];
}

/*
 * The traits themselves. `has` is the unlock condition, `requires` is what the overlay shows.
 * Order matters: an upgraded trait is listed before the one it replaces, and `supersedes`
 * names the lesser trait so both never show at once.
 */
setup.masteryTraits = [
	{
		id: "rockEmSockEm",
		name: "Rock 'Em, Sock 'Em",
		colour: "teal",
		requires: "Physique + Brawling",
		text: "You throw your whole weight behind a hook. Hook punches deal 10% more damage.",
		has: () => masteryPhysiqueMaxed() && masteryCombatSkillMaxed("brawling"),
	},
	{
		id: "happyFeet",
		name: "Happy Feet, Wombo Combo!",
		colour: "gold",
		requires: "Footwork + Kicking + Feet",
		text: "Your feet do the thinking for you. Kicks deal 25% more damage, and you are much harder to hit.",
		has: () => masteryCombatSkillMaxed("footwork") && masteryCombatSkillMaxed("kicking") && masterySkillMaxed("feetskill"),
	},
	{
		id: "sleekAndSteady",
		name: "Sleek and Steady",
		colour: "teal",
		requires: "Footwork + Kicking",
		text: "You kick from a balanced stance. Kicks deal 10% more damage, and you are harder to hit.",
		supersededBy: "happyFeet",
		has: () => masteryCombatSkillMaxed("footwork") && masteryCombatSkillMaxed("kicking"),
	},
	{
		id: "preciseBlows",
		name: "Precise Blows",
		colour: "teal",
		requires: "Athletics + Striking",
		text: "Even your feints carry weight. Feints deal 10% more damage.",
		has: () => masterySkillMaxed("athletics") && masteryCombatSkillMaxed("striking"),
	},
	{
		id: "milkyGoddess",
		name: "Milky Goddess",
		colour: "lewd",
		requires: "Milk + Chest",
		text: "Using your chest arouses and pleasures others 25% more.",
		has: () => masteryFluidCapacityMaxed("milk") && masterySkillMaxed("chestskill"),
	},
	{
		id: "thatCannotFit",
		name: "That Cannot Fit!",
		colour: "lewd",
		requires: "Semen + Penile",
		text: "Using your penis arouses and pleasures others 25% more.",
		has: () => masteryFluidCapacityMaxed("semen") && masterySkillMaxed("penileskill"),
	},
	{
		id: "abyssalThroat",
		name: "Abyssal Throat",
		colour: "lewd",
		requires: "Swimming + Oral",
		text: "Using your mouth arouses and pleasures others 25% more.",
		has: () => masterySkillMaxed("swimmingskill") && masterySkillMaxed("oralskill"),
	},
	{
		id: "tenderHands",
		name: "Tender Hands",
		colour: "lewd",
		requires: "Tending + Hands",
		text: "Using your hands arouses and pleasures others 25% more.",
		has: () => masterySkillMaxed("tending") && masterySkillMaxed("handskill"),
	},
	{
		id: "sweetPleasure",
		name: "Sweet Pleasure",
		colour: "lewd",
		requires: "Vagina + Thighs",
		text: "Using your vagina or thighs arouses and pleasures others 25% more.",
		has: () => masterySkillMaxed("vaginalskill") && masterySkillMaxed("thighskill"),
	},
	{
		id: "backendBeauty",
		name: "Backend Beauty",
		colour: "lewd",
		requires: "Ass + Buttocks",
		text: "Using your ass arouses and pleasures others 25% more.",
		has: () => masterySkillMaxed("analskill") && masterySkillMaxed("bottomskill"),
	},
];

/**
 * @param {string} id
 * @returns {boolean} whether the PC currently has this mastery trait
 */
function masteryTrait(id) {
	const trait = setup.masteryTraits.find(t => t.id === id);
	if (!trait) return false;
	try {
		return !!trait.has();
	} catch (e) {
		/* A missing skill variable on an old save must never break combat. */
		return false;
	}
}
window.masteryTrait = masteryTrait;

/**
 * The traits to show the player, with any trait replaced by a better version left out.
 *
 * @returns {object[]}
 */
function masteryTraitsHeld() {
	const held = setup.masteryTraits.filter(t => masteryTrait(t.id));
	return held.filter(t => !t.supersededBy || !held.some(other => other.id === t.supersededBy));
}
window.masteryTraitsHeld = masteryTraitsHeld;

/**
 * Damage bonus for a particular kind of blow.
 *
 * @param {"hook"|"kick"|"feint"} kind
 * @returns {number} a multiplier to apply to the damage, 1 when no trait applies
 */
function masteryDamageMultiplier(kind) {
	switch (kind) {
		case "hook":
			return masteryTrait("rockEmSockEm") ? 1.1 : 1;
		case "kick":
			if (masteryTrait("happyFeet")) return 1.25;
			return masteryTrait("sleekAndSteady") ? 1.1 : 1;
		case "feint":
			return masteryTrait("preciseBlows") ? 1.1 : 1;
		default:
			return 1;
	}
}
window.masteryDamageMultiplier = masteryDamageMultiplier;

/**
 * Extra dodge chance, in percentage points, added before the usual dodge caps apply.
 *
 * @returns {number}
 */
function masteryDodgeBonus() {
	if (masteryTrait("happyFeet")) return 15;
	return masteryTrait("sleekAndSteady") ? 6 : 0;
}
window.masteryDodgeBonus = masteryDodgeBonus;

/* Which trait boosts which body part. */
const MASTERY_SEX_TRAITS = {
	chestskill: "milkyGoddess",
	penileskill: "thatCannotFit",
	oralskill: "abyssalThroat",
	handskill: "tenderHands",
	vaginalskill: "sweetPleasure",
	thighskill: "sweetPleasure",
	analskill: "backendBeauty",
	bottomskill: "backendBeauty",
};

/**
 * How much more arousal and pleasure the PC draws out of a partner with a given body part.
 *
 * @param {string} skill the body part's skill, e.g. "oralskill"
 * @returns {number} a multiplier, 1 when no trait applies
 */
function masterySexMultiplier(skill) {
	const trait = MASTERY_SEX_TRAITS[skill];
	return trait && masteryTrait(trait) ? 1.25 : 1;
}
window.masterySexMultiplier = masterySexMultiplier;
