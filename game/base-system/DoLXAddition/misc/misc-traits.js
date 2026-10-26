/* globals V, setup, playerCaresForGender perceivedGender currentAppearanceBand */
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
window.masteryCombatSkillMaxed = masteryCombatSkillMaxed;

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
	if (V.statFreeze) return false;
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

/**
 * Audience dysphoria: how people around you currently read your gender.
 *
 * This is based on the gender of the surrounding group, not your identity.
 * It uses the normal Masculine/Feminine Appearance topics, so existing acceptance, tolerance and rejection rules still apply.
 */
/** Gendered spaces, by exact passage name. */
const AUDIENCE_SEGREGATED_PASSAGES = {
	"School Boy Changing Room": "m",
	"School Girl Changing Room": "f",
};

/**
 * Gendered toilet follow-up passages count as the same room.
 */
const AUDIENCE_SEGREGATED_PREFIXES = [
	{ prefix: "School Boy's", gender: "m", school: true },
	{ prefix: "School Girl's", gender: "f", school: true },
	{ prefix: "Men's Toilets", gender: "m", school: false },
	{ prefix: "Women's Toilets", gender: "f", school: false },
];

/** How much each audience affects you. People matter more than the room's label. */
const AUDIENCE_WEIGHT_CROWD = 3;
const AUDIENCE_WEIGHT_SPACE = 1;

/**
 * How many people it takes to make a room feel like it has a gender.
 * One person is a conversation, and counting those would fire this in nearly every scene in the game.
 */
const AUDIENCE_MIN_GROUP = 2;

/** Whether students are currently in the school changing rooms and using the lockers. */
function schoolChangingRoomCrowded() {
	return V.changingroomstate !== undefined && V.changingroomstate !== "empty";
}

/** Whether school is in session and the gendered toilets are occupied. */
function schoolInSession() {
	return !!(Time.schoolDay && Time.schoolTime);
}

/**
 * The gendered space the player is standing in, if any.
 *
 * @param {string} [passageName] The passage to judge, for callers that know it before `$passage` catches up.
 * @returns {{gender: string, crowded: boolean}} gender is "" when the passage isn't a gendered space.
 */
function audienceSegregatedSpace(passageName) {
	const passage = passageName || V.passage || "";
	const none = { gender: "", crowded: false };

	if (AUDIENCE_SEGREGATED_PASSAGES[passage]) {
		return { gender: AUDIENCE_SEGREGATED_PASSAGES[passage], crowded: schoolChangingRoomCrowded() };
	}

	/* The pool lockers are inside whichever changing room the player walked through, so they inherit its gender. */
	if (passage === "School Pool Wardrobe") {
		const gender = V.changingRoomGender === "boys" ? "m" : V.changingRoomGender === "girls" ? "f" : "";
		return gender ? { gender, crowded: schoolChangingRoomCrowded() } : none;
	}

	const match = AUDIENCE_SEGREGATED_PREFIXES.find(entry => passage.startsWith(entry.prefix));
	if (!match) return none;
	return { gender: match.gender, crowded: match.school ? schoolInSession() : false };
}
window.audienceSegregatedSpace = audienceSegregatedSpace;

/**
 * Returns the gender of the NPC group when they are all the same gender.
 * Requires at least AUDIENCE_MIN_GROUP NPCs, not counting love interests or Gwylan. Mixed or herm groups, or any group with Mickey, return "".
 *
 * @returns {string} "m", "f", or ""
 */
function audienceCompanyGender() {
	const list = Array.isArray(V.NPCList) ? V.NPCList : [];
	/* Love interests and Gwylan aren't sizing you up, so they don't count toward the crowd. */
	const present = list.filter(
		npc =>
			npc && npc.description && (npc.type === undefined || npc.type === "human") && npc.fullDescription !== "Gwylan" && !isLoveInterest(npc.fullDescription)
	);
	if (present.length < AUDIENCE_MIN_GROUP) return "";
	/* Mickey's gender is "No", whatever pronoun the settings give them, so a group with Mickey in it is never single-gender. */
	if (present.some(npc => npc.role === "hacker")) return "";
	/* Strap-ons change combat gender to "m", but leave the NPC's pronouns unchanged. */
	const gender = present[0].pronoun;
	if (gender !== "m" && gender !== "f") return "";
	return present.every(npc => npc.pronoun === gender) ? gender : "";
}
window.audienceCompanyGender = audienceCompanyGender;

/**
 * Who's watching, and how hard.
 *
 * A gendered room the player shares with people beats their company, because the room labels them on the way in.
 *
 * @param {string} [passageName] Passed through to audienceSegregatedSpace.
 * @returns {{gender: string, weight: number}} gender is "" when nobody is reading the player as anything in particular.
 */
function currentAudience(passageName) {
	const space = audienceSegregatedSpace(passageName);
	if (space.gender && space.crowded) return { gender: space.gender, weight: AUDIENCE_WEIGHT_CROWD };

	const company = audienceCompanyGender();
	if (company) return { gender: company, weight: AUDIENCE_WEIGHT_CROWD };

	if (space.gender) return { gender: space.gender, weight: AUDIENCE_WEIGHT_SPACE };
	return { gender: "", weight: 0 };
}
window.currentAudience = currentAudience;

/** The identity topic a forced binary reading lands on. */
const AUDIENCE_APPEARANCE_CHARACTERISTIC = { m: "Masculine Appearance", f: "Feminine Appearance" };

/**
 * Gets the audience, how they see the player's gender, and how the player feels about it.
 *
 * School toilets and changing rooms use the same clothed appearance as their access and bullying checks.
 * Elsewhere, visible-body perception applies, with an androgynous result forced to the binary appearance side.
 *
 * @param {string} [passageName] Passed to currentAudience.
 * @returns {{gender: string, weight: number, seen: string, characteristic: string, contrast: boolean, erased: boolean, exposed: boolean}}
 */
function audienceIdentityContext(passageName) {
	const { gender, weight } = currentAudience(passageName);
	const empty = { gender: "", weight: 0, seen: "", characteristic: "", contrast: false, erased: false, exposed: false };
	if (!gender) return empty;

	const passage = passageName || V.passage || "";
	const schoolRoom =
		AUDIENCE_SEGREGATED_PASSAGES[passage] !== undefined ||
		passage === "School Pool Wardrobe" ||
		AUDIENCE_SEGREGATED_PREFIXES.some(entry => entry.school && passage.startsWith(entry.prefix));
	const perceived = perceivedGender();
	const seen = schoolRoom || perceived === "n" ? V.player.gender_appearance : perceived;
	const characteristic = AUDIENCE_APPEARANCE_CHARACTERISTIC[seen];
	if (!characteristic) return empty;

	return {
		gender,
		/* Being looked at with your clothes off is the same reading, delivered louder. */
		weight: weight + (V.exposed >= 1 ? 1 : 0),
		seen,
		characteristic,
		contrast: seen !== gender,
		erased: currentAppearanceBand() === "n",
		exposed: V.exposed >= 1,
	};
}
window.audienceIdentityContext = audienceIdentityContext;

/**
 * Creates a key so the reaction only triggers when the situation changes, not every passage.
 *
 * @param {string} [passageName] Passed to audienceIdentityContext.
 */
function audienceIdentityReading(passageName) {
	const context = audienceIdentityContext(passageName);
	if (!context.gender) return "";
	return [context.gender, context.seen, context.erased ? "n" : "b", context.exposed ? "x" : "-"].join("");
}
window.audienceIdentityReading = audienceIdentityReading;

/**
 * Updates the audience identity check when the player's situation changes.
 * Runs at `:passagestart` so effects appear in the current passage.
 * Leaving a gendered audience resets the check, so returning triggers a new reaction.
 *
 * @param {object} [ev] The `:passagestart` event.
 */
function audienceIdentityCheck(ev) {
	/* Runs on every passage, including the ones before X-Change has set itself up. */
	if (!V.xchange || typeof playerCaresForGender !== "function" || !playerCaresForGender()) return;
	if (V.xchange.audienceDysphoriaEnabled === false) return;
	if (V.statFreeze || V.combat) return;

	/* Don't create `V.identity` here. X-Change sets it up when it's undefined,
	and creating it early would leave it incomplete. */
	if (!V.identity || !V.identity.presentation) return;
	V.identity.audience = V.identity.audience || {};
	const audience = V.identity.audience;

	/* `$passage` still names the passage being left while `:passagestart` runs, so take the incoming one from the event. */
	const reading = audienceIdentityReading(ev?.passage?.title);
	if (reading === audience.lastReading) return;

	const firstReading = audience.lastReading === undefined;
	audience.lastReading = reading;
	/* No audience is the absence of a reading, not a reading of its own. */
	if (!reading || firstReading) return;

	/* The widget has to judge the same passage this check did, for the same reason. */
	wikifier("audienceIdentityEffects", JSON.stringify(ev?.passage?.title || V.passage || ""));
}
window.audienceIdentityCheck = audienceIdentityCheck;

$(document).on(":passagestart", audienceIdentityCheck);

/* Willpower rest and recovery.
 * The daily willpower pool used to recover mainly through sleep, fights, and a slow passive refill.
 * This adds daytime recovery from calming down and taking proper breaks.
 *
 * Calm: Lowering stress restores a small amount of willpower.
 * Rest: Activities like praying, meditating, eating, or sitting down restore more willpower over time.
 *
 * Both share a daily recovery limit so they support sleep without replacing it or being easy to farm.
 */
/* Recovery here is balanced around sleep, which restores 12.5% of the pool per hour.
Sleep should remain the strongest recovery method, so other sources restore less. */

/* Daily rest recovery cap. About three hours of sleep, so rest helps but can't replace sleeping. */
const willpowerRestAllowanceFraction = 0.4;

/* Calm recovery based on stress relieved. A <<stress -6>> gives about 1.5% of the willpower pool. */
const willpowerCalmRate = 0.35;

/* Rest restores willpower at one-third the rate of sleep. */
const willpowerRestRatePerHour = 0.04;

/* Limits each recovery gain so large stress relief events can't restore too much willpower at once. */
const willpowerRestSingleGrantFraction = 0.08;

/* Long events pass hours at a time. Only the first stretch is a rest; the rest of it is just time. */
const willpowerRestSessionMaxMinutes = 120;

/* Deliberate rest also helps the Autism Spectrum trait. One hour restores a third of its daily recovery limit. */
const willpowerRestLoadPerHour = 4;

function willpowerRestPool() {
	return Math.max(200, Number(V.willpower) || 0);
}

/* Maximum value for the settings slider. Keeps the slider, clamp, and export setting in sync. */
const willpowerRestPercentMax = 300;

/* Player-facing strength setting, as a multiplier. Missing reads as full strength. */
function willpowerRestStrength() {
	const percent = Number(V.xchange && V.xchange.willpowerRestPercent);
	if (!Number.isFinite(percent)) return 1;
	return Math.clamp(percent, 0, willpowerRestPercentMax) / 100;
}

function willpowerRestSystemActive() {
	if (V.statFreeze) return false;
	if (!V.xchange || V.xchange.willpowerSystemEnabled !== 1) return false;
	/* Defaults on: the flag is absent on saves made before this system existed. */
	if (V.xchange.willpowerRestEnabled === 0 || V.xchange.willpowerRestEnabled === false) return false;
	return Number.isFinite(V.xchange.willpowerPoints);
}

/* How much willpower resting can still restore today. Returns 0 if disabled or the daily limit is reached. */
function willpowerRestAllowanceLeft() {
	if (!willpowerRestSystemActive()) return 0;
	const used = Number(V.daily && V.daily.willpowerRested) || 0;
	return Math.max(0, willpowerRestPool() * willpowerRestAllowanceFraction * willpowerRestStrength() - used);
}
window.willpowerRestAllowanceLeft = willpowerRestAllowanceLeft;

/* Add willpower up to today's remaining limit. Returns the amount added. */
function willpowerRestGrant(points) {
	points = Number(points) || 0;
	if (points <= 0 || !willpowerRestSystemActive()) return 0;
	const pool = willpowerRestPool();
	if (V.xchange.willpowerPoints >= pool) return 0;
	const granted = Math.min(points, pool * willpowerRestSingleGrantFraction, willpowerRestAllowanceLeft(), pool - V.xchange.willpowerPoints);
	if (granted <= 0) return 0;
	if (!V.daily || typeof V.daily !== "object" || Array.isArray(V.daily)) V.daily = {};
	V.daily.willpowerRested = (Number(V.daily.willpowerRested) || 0) + granted;
	V.xchange.willpowerPoints = Math.clamp(V.xchange.willpowerPoints + granted, 0, pool);
	updateDynamicStatCaps();
	return granted;
}

/*
 * Reducing stress also restores a little daily willpower.
 * Called from statChange.stress, so it works for all stress-reducing activities.
 */
function willpowerCalmRecovery(stressPoints) {
	if (!willpowerRestSystemActive()) return 0;
	stressPoints = Math.max(0, Number(stressPoints) || 0);
	if (!stressPoints) return 0;
	/* Sex already handles willpower separately.
	Orgasm relief should not also count as calm, or it would give double recovery.
	Use the climax marker, not $orgasmcount, since that lasts for hours after sex. */
	if (V.combat || V.masturbating || V.orgasmInProgress) return 0;
	const max = Number(V.stressmax) || 10000;
	if (max <= 0) return 0;
	return willpowerRestGrant((stressPoints / max) * willpowerRestPool() * willpowerCalmRate * willpowerRestStrength());
}
window.willpowerCalmRecovery = willpowerCalmRecovery;

/*
 * Rest recovery. `minutes` is the time spent resting, and `quality` changes how effective it is.
 * 1 = normal, below 1 = poor rest, above 1 = good rest.
 */
function willpowerRest(minutes, quality = 1) {
	if (V.statFreeze || V.combat) return 0;
	minutes = Math.clamp(Number(minutes) || 0, 0, willpowerRestSessionMaxMinutes);
	if (!minutes) return 0;
	quality = Math.clamp(Number(quality) || 1, 0, 3);
	if (!quality) return 0;

	/* Quiet rest lowers the trait's load even if stress does not change.
	This is separate from willpower settings and still uses its own daily cap. */
	if (typeof autismRestBreak === "function") autismRestBreak((minutes / 60) * willpowerRestLoadPerHour * quality);

	return willpowerRestGrant(willpowerRestPool() * willpowerRestRatePerHour * (minutes / 60) * quality * willpowerRestStrength());
}
window.willpowerRest = willpowerRest;

/*
 * Meals also provide a little rest.
 * Larger meals restore more, using the existing food value scale.
 * An average meal counts as 10 minutes of rest, while snacks give very little and large meals give more.
 */
function willpowerRestMeal(key) {
	const scale = typeof foodValueScale === "function" ? foodValueScale(key) : 1;
	return willpowerRest(10 * scale, 1);
}
window.willpowerRestMeal = willpowerRestMeal;

/* <<willpower-rest minutes [quality]>> - Rest and recover willpower while time passes. */
DefineMacro("willpower-rest", willpowerRest);

/* Safety fallback: <<orgasm>> clears this normally, but an interrupted passage might leave calm recovery disabled. */
$(document).on(":passagestart", () => {
	if (V.orgasmInProgress) delete V.orgasmInProgress;
});
