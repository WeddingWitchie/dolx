/* globals DateTime pocketOutfitReveal pocketOutfitGender pocketOutfitName pocketOutfitPieceNames pocketOutfitSurrender pocketOutfitCarrying fameTotal */

/* Cafe work */

/* Robin's second job at the Ocean Breeze (DoLX).
 *
 * Robin works weekday afternoons at the cafe after being introduced to Sam.
 * This does not overlap with the weekend drink stand.
 * Cafe shifts also reduce the time Robin can spend preparing for the stand.
 *
 * V.robinCafe:
 *   stage        0 not started
 *                1 Sam agreed, Robin not told
 *                2 trial shift
 *                3 working normally
 *                4 difficult customer scene ready
 *                5 scene resolved
 *   shifts       total weekday shifts worked
 *   weekShifts   shifts worked this week
 *   rainDays     weekend stand days lost to rain
 *   startTime    date the job was accepted; work begins on the next school day
 *   lastWage     last cafe wage
 *   totalWage    total cafe earnings
 *   handled      "" | "player" | "robin"
 *   outfit       serving outfit given to Robin, or null
 *   ended        "" | "kept" | "quit"
 *   seen         one-off scene flags
 */

setup.robinCafe = {
	/* Base £ Robin takes home per weekday shift, before their serving skill is counted. */
	wagePerShift: 45,
	/* The stand loses this share of its weekly income while Robin is also working the cafe. */
	standPenalty: 0.25,
	/* Shifts needed to reach each stage. */
	settleShifts: 5,
	confidentShifts: 10,
	/* Hours Robin is behind the counter on a weekday. */
	shiftStart: 17,
	shiftEnd: 19,
};

function ensureRobinCafe() {
	if (!V.robinCafe || typeof V.robinCafe !== "object") V.robinCafe = {};
	const cafe = V.robinCafe;
	if (!Number.isFinite(cafe.stage)) cafe.stage = 0;
	cafe.stage = Math.clamp(Math.trunc(cafe.stage), 0, 5);
	if (!Number.isFinite(cafe.shifts)) cafe.shifts = 0;
	if (!Number.isFinite(cafe.weekShifts)) cafe.weekShifts = 0;
	if (!Number.isFinite(cafe.rainDays)) cafe.rainDays = 0;
	if (cafe.startTime !== undefined && !Number.isFinite(cafe.startTime)) delete cafe.startTime;
	if (!Number.isFinite(cafe.lastWage)) cafe.lastWage = 0;
	if (!Number.isFinite(cafe.totalWage)) cafe.totalWage = 0;
	if (typeof cafe.handled !== "string") cafe.handled = "";
	if (typeof cafe.ended !== "string") cafe.ended = "";
	if (cafe.ended === "quit") delete cafe.startTime;
	if (!cafe.seen || typeof cafe.seen !== "object") cafe.seen = {};
	if (cafe.outfit && typeof cafe.outfit === "object" && Array.isArray(cafe.outfit.pieces) && cafe.outfit.pieces.length > 0) {
		if (!Number.isFinite(cafe.outfit.shifts)) cafe.outfit.shifts = 0;
		if (!cafe.outfit.seen || typeof cafe.outfit.seen !== "object") cafe.outfit.seen = {};
		cafe.outfit.worn = !!cafe.outfit.worn;
	} else {
		cafe.outfit = null;
	}
	return cafe;
}
window.ensureRobinCafe = ensureRobinCafe;

/* Robin is actually on the rota: told about the job, and hasn't walked away from it. */
function robinCafeEmployed() {
	const cafe = ensureRobinCafe();
	const today = new DateTime(Time.year, Time.month, Time.monthDay).timeStamp;
	return cafe.stage >= 2 && cafe.ended !== "quit" && (!Number.isFinite(cafe.startTime) || today > cafe.startTime);
}
window.robinCafeEmployed = robinCafeEmployed;

function robinCafeClosed() {
	return (V.chef_state === 7 && V.chef_rework <= 30) || V.chef_state === 8;
}
window.robinCafeClosed = robinCafeClosed;

/* Whether Robin is behind the counter right now. Read by getRobinLocation(). */
function robinCafeShiftNow() {
	if (!robinCafeEmployed()) return false;
	if (robinCafeClosed()) return false;
	if (!Time.schoolDay) return false;
	if (C.npc.Robin.trauma >= 70) return false;
	if (V.robin.timer.hurt >= 1) return false;
	if (V.robinmissing) return false;
	/* Half-open: shiftEnd is when Robin clocks off, so 17-19 is five until seven, not until 19:59. */
	return Time.hour >= setup.robinCafe.shiftStart && Time.hour < setup.robinCafe.shiftEnd;
}
window.robinCafeShiftNow = robinCafeShiftNow;

/* The player can only put Robin forward once they work at the cafe themselves and Robin trusts them. */
function robinCafeIntroAvailable() {
	const cafe = ensureRobinCafe();
	if (cafe.stage !== 0 || cafe.ended) return false;
	if (C.npc.Robin.init !== 1 || V.robinmissing) return false;
	if (V.oceanbreezejob !== 1) return false;
	if (C.npc.Robin.love < 30 || C.npc.Robin.trauma >= 60) return false;
	if (V.robin.timer.hurt >= 1 || V.robinbreakupCooldown) return false;
	return true;
}
window.robinCafeIntroAvailable = robinCafeIntroAvailable;

/* Sam has said yes but Robin doesn't know yet — the conversation waits at the orphanage. */
function robinCafeTellAvailable() {
	const cafe = ensureRobinCafe();
	return cafe.stage === 1 && !V.robinmissing && V.robin.timer.hurt === 0 && !V.robinbreakupCooldown;
}
window.robinCafeTellAvailable = robinCafeTellAvailable;

/* Which one-off cafe scene, if any, is owed the next time the player drops in on a shift. */
function robinCafeSceneDue() {
	const cafe = ensureRobinCafe();
	if (!robinCafeEmployed()) return "";
	if (cafe.stage === 2 && cafe.shifts >= 1) return "first";
	if (cafe.stage === 3 && cafe.shifts >= setup.robinCafe.confidentShifts) return "difficult";
	return "";
}
window.robinCafeSceneDue = robinCafeSceneDue;

/* Robin decides what to do with the job once the difficult customer is behind them. */
function robinCafeResolutionAvailable() {
	const cafe = ensureRobinCafe();
	return cafe.stage === 4 && !V.robinmissing && V.robin.timer.hurt === 0 && !V.robinbreakupCooldown;
}
window.robinCafeResolutionAvailable = robinCafeResolutionAvailable;

/* £ Robin takes home for one shift. Their stand skill transfers: serving is serving. */
function robinCafeShiftWage() {
	const stand = ensureRobinStand();
	return Math.round(setup.robinCafe.wagePerShift * (1 + stand.skill / 2000));
}
window.robinCafeShiftWage = robinCafeShiftWage;

/* Daily tick. Records the shift Robin worked, and notes weekends the stand was rained off. */
function robinCafeDayPassed() {
	const cafe = ensureRobinCafe();
	if (!robinCafeEmployed()) return;
	if (!robinCafeClosed() && Time.isWeekEnd() && Weather.precipitation === "rain") cafe.rainDays++;
	/* The renovation countdown has already advanced; 30 today means yesterday was still open. */
	if ((V.chef_state === 7 && V.chef_rework < 30) || V.chef_state === 8) return;
	if (!Time.isSchoolDay(Time.yesterday)) return;
	/* The offer says Robin starts on the next school day. Do not back-credit the day the player told them. */
	if (Number.isFinite(cafe.startTime) && Time.yesterday.timeStamp <= cafe.startTime) return;
	delete cafe.startTime;
	if (V.robinmissing || C.npc.Robin.trauma >= 70 || V.robin.timer.hurt >= 1) return;
	cafe.shifts++;
	cafe.weekShifts++;
	/* Working a counter every weekday teaches the same things the stand does, a little faster. */
	const stand = ensureRobinStand();
	if (stand.skill < 1000) stand.skill = Math.min(stand.skill + 3, 1000);
	if (cafe.outfit && cafe.outfit.worn) cafe.outfit.shifts++;
	if (cafe.stage === 2 && cafe.shifts >= setup.robinCafe.settleShifts && cafe.seen.first) cafe.stage = 3;
}
window.robinCafeDayPassed = robinCafeDayPassed;

/* Weekly cafe payout. Returns the amount added to Robin's savings. */
function robinCafeWeeklyTick() {
	const cafe = ensureRobinCafe();
	const shifts = cafe.weekShifts;
	/* A washed-out weekend is a week Robin picks up whatever extra hours Sam has going. */
	const extra = Math.min(cafe.rainDays, 2);
	cafe.weekShifts = 0;
	cafe.rainDays = 0;
	/* Shifts already worked are still owed if Robin leaves before payday. */
	if (shifts <= 0) {
		cafe.lastWage = 0;
		return 0;
	}
	const wage = (shifts + extra) * robinCafeShiftWage();
	cafe.lastWage = wage;
	cafe.totalWage += wage;
	return wage;
}
window.robinCafeWeeklyTick = robinCafeWeeklyTick;

/* Share of the stand's weekly income lost to the hours the cafe takes up. */
function robinCafeStandModifier() {
	/* weekShifts is cleared after the stand payout, so it describes the same week being calculated. */
	return ensureRobinCafe().weekShifts > 0 ? 1 - setup.robinCafe.standPenalty : 1;
}
window.robinCafeStandModifier = robinCafeStandModifier;

/* Serving outfits */

/* Reveal above this reads as a deliberately sexy outfit; below the lower one it reads as modest.
A plain t-shirt sits at 400, for scale. */
setup.robinOutfit = {
	sexyReveal: 650,
	modestReveal: 400,
	/* Robin has to have been comfortable crossdressing somewhere public before wearing one to work. */
	crossdressPublicLevel: 4,
	/* Confidence needed to wear one on shift, by how much the outfit asks of Robin. */
	domPlain: 40,
	domCharged: 55,
	domBoth: 70,
};

/* What Robin makes of an outfit, without changing anything.
Returns { verdict, crossdress, sexy, modest, domNeeded }.
  refuse: won't take it at all
  keep  : takes it, but won't wear it where people can see
  wear  : wears it on shift */
function robinOutfitReaction(pieces) {
	const robin = C.npc.Robin;
	const reveal = pocketOutfitReveal(pieces);
	const gender = pocketOutfitGender(pieces);
	const identity = robin.xchange && robin.xchange.genderflipEffect ? robin.startingSex : robin.pronoun;
	const crossdress = gender !== "n" && gender !== identity;
	const sexy = reveal >= setup.robinOutfit.sexyReveal;
	const modest = reveal < setup.robinOutfit.modestReveal;
	const comfort = robin.crossdress || 0;
	const result = { verdict: "refuse", crossdress, sexy, modest, reveal, domNeeded: setup.robinOutfit.domPlain, reason: "" };

	if (robin.trauma >= 60) {
		result.reason = "trauma";
		return result;
	}
	if (crossdress && comfort < 2) {
		/* Robin's crossdressing has its own arc; a gift shouldn't skip the start of it. */
		result.reason = "never";
		return result;
	}

	if (crossdress && sexy) result.domNeeded = setup.robinOutfit.domBoth;
	else if (crossdress || sexy) result.domNeeded = setup.robinOutfit.domCharged;

	if (robin.dom < result.domNeeded) {
		result.verdict = "keep";
		result.reason = "shy";
		return result;
	}
	if (crossdress && comfort < setup.robinOutfit.crossdressPublicLevel) {
		result.verdict = "keep";
		result.reason = "public";
		return result;
	}
	result.verdict = "wear";
	return result;
}
window.robinOutfitReaction = robinOutfitReaction;

/* The player can offer an outfit once Robin actually has somewhere to wear one. */
function robinOutfitOfferAvailable() {
	const cafe = ensureRobinCafe();
	if (cafe.outfit) return false;
	/* Robin needs somewhere to wear one: the cafe rota, or the stand they went back to. */
	if (!robinCafeEmployed() && cafe.ended !== "quit") return false;
	if (typeof pocketOutfitCarrying !== "function" || !pocketOutfitCarrying()) return false;
	if (V.robinmissing || V.robin.timer.hurt >= 1 || V.robinbreakupCooldown) return false;
	return true;
}
window.robinOutfitOfferAvailable = robinOutfitOfferAvailable;

/* The offer scene has three outcomes that use $robinOutfitPending.
Rebuild it from the current outfit if missing so opening an outcome directly does not cause an error. */
function robinOutfitPendingRebuild() {
	const cafe = ensureRobinCafe();
	let pieces = [];
	if (typeof pocketOutfitCarrying === "function" && pocketOutfitCarrying()) pieces = V.pocket.outfit.pieces;
	else if (cafe.outfit && Array.isArray(cafe.outfit.pieces)) pieces = cafe.outfit.pieces;
	const reaction = robinOutfitReaction(pieces);
	V.robinOutfitPending = {
		verdict: reaction.verdict,
		reason: reaction.reason,
		crossdress: reaction.crossdress,
		sexy: reaction.sexy,
		modest: reaction.modest,
		name: pocketOutfitName(pieces) || "outfit",
		list: pocketOutfitPieceNames(pieces),
	};
	return V.robinOutfitPending;
}
window.robinOutfitPendingRebuild = robinOutfitPendingRebuild;

/* Take the bundle off the player and record it against Robin. */
function robinOutfitAccept(wear) {
	const cafe = ensureRobinCafe();
	const pieces = pocketOutfitSurrender();
	/* Nothing is being carried, likely from re-entering or clicking twice. Keep what Robin already has. */
	if (!pieces.length) return cafe.outfit;
	const reaction = robinOutfitReaction(pieces);
	cafe.outfit = {
		pieces,
		name: pocketOutfitName(pieces),
		names: pocketOutfitPieceNames(pieces),
		reveal: reaction.reveal,
		crossdress: reaction.crossdress,
		sexy: reaction.sexy,
		modest: reaction.modest,
		worn: !!wear,
		shifts: 0,
		seen: {},
	};
	return cafe.outfit;
}
window.robinOutfitAccept = robinOutfitAccept;

/* Robin is on shift and dressed in the gift. */
function robinOutfitWorn() {
	const cafe = ensureRobinCafe();
	return !!(cafe.outfit && cafe.outfit.worn);
}
window.robinOutfitWorn = robinOutfitWorn;

/* Robin has the outfit but hasn't dared wear it out yet, and has since grown into it. */
function robinOutfitReadyToWear() {
	const cafe = ensureRobinCafe();
	if (!cafe.outfit || cafe.outfit.worn) return false;
	if (V.robinmissing || V.robin.timer.hurt >= 1 || V.robinbreakupCooldown) return false;
	return robinOutfitReaction(cafe.outfit.pieces).verdict === "wear";
}
window.robinOutfitReadyToWear = robinOutfitReadyToWear;

/* Which one-off outfit scene the cafe owes the player. */
function robinOutfitSceneDue() {
	const cafe = ensureRobinCafe();
	if (!robinOutfitWorn() || !robinCafeEmployed()) return "";
	if (!cafe.outfit.seen.debut) return "debut";
	if (cafe.outfit.shifts >= 4 && !cafe.outfit.seen.regulars) return "regulars";
	return "";
}
window.robinOutfitSceneDue = robinOutfitSceneDue;

/* Drink stand income and independence */

/* Robin's drink stand economy (DoLX).
 *
 * Replaces the flat weekly stand income in time.js with a tier/upgrade/skill/weather driven calculation, still funnelled through $robinmoney.
 * All amounts are in £ (the same unit as $robinmoney), NOT the 100-per-£ player money units.
 *
 * State lives in V.robinStand:
 *   tier            1..4 (backpack, folding table, wagon, fixture)
 *   upgrades        array of owned upgrade ids (shared between lemonade/hot chocolate)
 *   skill           0..1000, Robin's serving/stand skill
 *   helpCount       times the player helped at the stand (gates auto-upgrades)
 *   nudeRounds      lifetime naked advertising rounds, which give the stand a reputation of its own
 *   named           the name painted on the stand, "" until Robin picks one
 *   lastIncome      last weekly income in £ (drives the self-sufficiency scene)
 *   selfSufficient  0|1, set when Robin takes their rent back from the player
 *   notice          name of the last thing Robin bought on their own, "" if none
 *   owed            £ of rent a self-sufficient Robin still owes Bailey
 *   missedWeeks     weeks in a row the self-sufficient Robin's debt grew
 *   fellBehind      0|1, Robin lost self-sufficiency and hasn't told the player yet
 */

setup.robinStand = {
	/* Floor for Robin's weekly rent in £. The live figure is robinStandRent(). */
	rent: 400,
	/* £/week income at which Robin can free the player of their debt. */
	selfSufficiencyIncome: 2000,
	tiers: [
		null /* 1-indexed */,
		{ name: "backpack stand", cost: 0, income: 300, fluct: 0.3 },
		{ name: "folding table stand", cost: 1000, income: 420, fluct: 0.2 },
		{ name: "wagon stand", cost: 3000, income: 600, fluct: 0.15 },
		{ name: "fixture stall", cost: 10000, income: 850, fluct: 0.1 },
	],
	/* Upgrades are shared between the summer and winter stand.
	 * lemonade/cocoa fields hold seasonal flavour names for the UI. */
	upgrades: [
		/* Tier 1 */
		{ id: "properIngredients", tier: 1, cost: 200, income: 25, name: "proper ingredients", lemonade: "real lemons", cocoa: "real cocoa" },
		{ id: "garnish", tier: 1, cost: 300, income: 35, name: "garnish", lemonade: "mint garnish", cocoa: "marshmallows" },
		{ id: "premiumSweetener", tier: 1, cost: 400, income: 45, name: "premium sweetener", lemonade: "cane sugar", cocoa: "honey" },
		{ id: "flyers", tier: 1, cost: 150, income: 20, name: "flyers", lemonade: "flyers", cocoa: "flyers" },
		{ id: "tablecloth", tier: 1, cost: 200, income: 25, name: "bright tablecloth", lemonade: "bright tablecloth", cocoa: "bright tablecloth" },
		{ id: "smallDecor", tier: 1, cost: 300, income: 35, name: "small decorations", lemonade: "small decorations", cocoa: "small decorations" },
		/* Tier 2 */
		{ id: "premiumCups", tier: 2, cost: 500, income: 55, name: "premium cups", lemonade: "branded cups", cocoa: "holiday mugs" },
		{ id: "syrups", tier: 2, cost: 650, income: 70, name: "flavoured syrups", lemonade: "fruit syrups", cocoa: "vanilla syrup" },
		{ id: "sparkleSpice", tier: 2, cost: 800, income: 85, name: "sparkle and spice", lemonade: "sparkling lemonade", cocoa: "cinnamon sticks" },
		{ id: "chalkboard", tier: 2, cost: 400, income: 45, name: "chalkboard menu", lemonade: "chalkboard menu", cocoa: "chalkboard menu" },
		{ id: "shadeHeat", tier: 2, cost: 500, income: 55, name: "shade and warmth", lemonade: "parasol", cocoa: "small heater" },
		{ id: "loyaltyCards", tier: 2, cost: 700, income: 75, name: "loyalty cards", lemonade: "loyalty cards", cocoa: "loyalty cards" },
		/* Tier 3 */
		{ id: "multiFlavors", tier: 3, cost: 1200, income: 120, name: "multiple flavours", lemonade: "multiple flavours", cocoa: "multiple flavours" },
		{ id: "largeSize", tier: 3, cost: 1500, income: 150, name: "large size option", lemonade: "large cups", cocoa: "large mugs" },
		{ id: "seasonalSpecials", tier: 3, cost: 1800, income: 180, name: "seasonal specials", lemonade: "berry mix special", cocoa: "pumpkin spice special" },
		{ id: "bigBanner", tier: 3, cost: 1000, income: 100, name: "big banner", lemonade: "big banner", cocoa: "big banner" },
		{ id: "wagonDisplay", tier: 3, cost: 1200, income: 120, name: "wagon display", lemonade: "fruit display", cocoa: "holiday props" },
		{ id: "tipJarGame", tier: 3, cost: 1500, income: 150, name: "tip jar game", lemonade: "lemons vs limes tip game", cocoa: "cocoa vs coffee tip game" },
		/* Tier 4 */
		{ id: "brandedStall", tier: 4, cost: 3000, income: 280, name: "branded stall", lemonade: "branded stall", cocoa: "branded stall" },
		{ id: "premiumMenu", tier: 4, cost: 4000, income: 370, name: "premium menu", lemonade: "premium menu", cocoa: "premium menu" },
		{ id: "seasonalDecor", tier: 4, cost: 5000, income: 450, name: "seasonal decor", lemonade: "summer umbrellas", cocoa: "holiday lights" },
		{ id: "awning", tier: 4, cost: 2500, income: 240, name: "decorative awning", lemonade: "decorative awning", cocoa: "decorative awning" },
		{ id: "seating", tier: 4, cost: 3500, income: 330, name: "seating", lemonade: "seating", cocoa: "seating" },
		{ id: "music", tier: 4, cost: 4000, income: 370, name: "music", lemonade: "music", cocoa: "music" },
	],
};

function ensureRobinStand() {
	if (!V.robinStand || typeof V.robinStand !== "object") {
		V.robinStand = {};
	}
	const stand = V.robinStand;
	if (!Number.isFinite(stand.tier) || stand.tier < 1) stand.tier = 1;
	stand.tier = Math.min(Math.trunc(stand.tier), 4);
	if (!Array.isArray(stand.upgrades)) stand.upgrades = [];
	stand.upgrades = stand.upgrades.filter((id, index) => robinStandUpgrade(id) && stand.upgrades.indexOf(id) === index);
	if (!Number.isFinite(stand.skill)) stand.skill = 0;
	stand.skill = Math.clamp(Math.round(stand.skill), 0, 1000);
	if (!Number.isFinite(stand.helpCount)) stand.helpCount = 0;
	/* Lifetime naked advertising rounds. */
	if (!Number.isFinite(stand.nudeRounds)) stand.nudeRounds = 0;
	if (typeof stand.named !== "string") stand.named = "";
	if (!Number.isFinite(stand.saveWeeks)) stand.saveWeeks = 0;
	if (!Number.isFinite(stand.lastIncome)) stand.lastIncome = 0;
	if (stand.selfSufficient !== 1) stand.selfSufficient = 0;
	if (typeof stand.notice !== "string") stand.notice = "";
	if (!Number.isFinite(stand.owed)) stand.owed = 0;
	if (!Number.isFinite(stand.missedWeeks)) stand.missedWeeks = 0;
	if (stand.fellBehind !== 1) stand.fellBehind = 0;
	return stand;
}
window.ensureRobinStand = ensureRobinStand;

function robinStandUpgrade(id) {
	return setup.robinStand.upgrades.find(upgrade => upgrade.id === id);
}
window.robinStandUpgrade = robinStandUpgrade;

/* Percentage modifier from the current weather.
Robin sells whichever drink suits the season, so temperature extremes help rather than hurt; rain hurts. */
function robinStandWeatherModifier() {
	let modifier = 1;
	const temp = Weather.temperature;
	if (temp >= 36) modifier += 0.25;
	else if (temp >= 30) modifier += 0.15;
	else if (temp >= 22) modifier += 0;
	else if (temp >= 15) modifier += 0.05;
	else if (temp >= 8) modifier += 0.15;
	else modifier += 0.25;
	if (Weather.precipitation === "rain") {
		modifier -= Weather.precipitationIntensity >= 2 ? 0.5 : 0.15;
	} else if (Weather.precipitation === "snow") {
		modifier -= 0.15;
	}
	return Math.max(modifier, 0.1);
}
window.robinStandWeatherModifier = robinStandWeatherModifier;

/* Steady £/week the stand produces before weather and luck. */
function robinStandBaseIncome() {
	const stand = ensureRobinStand();
	let income = setup.robinStand.tiers[stand.tier].income;
	stand.upgrades.forEach(id => {
		const upgrade = robinStandUpgrade(id);
		if (upgrade) income += upgrade.income;
	});
	income *= 1 + stand.skill / 2000;
	/* A named, painted stand reads as a real business rather than a kid with a table. */
	if (stand.named) income *= 1.05;
	return Math.round(income);
}
window.robinStandBaseIncome = robinStandBaseIncome;

/* The actual income for one week, weather and luck included. */
function robinStandWeeklyIncome() {
	const stand = ensureRobinStand();
	const fluct = setup.robinStand.tiers[stand.tier].fluct;
	let income = robinStandBaseIncome();
	income *= robinStandWeatherModifier();
	/* Cafe shifts eat into the hours Robin needs to prep and restock. */
	income *= robinCafeStandModifier();
	income *= 1 + (Math.random() * 2 - 1) * fluct;
	if (V.robin.stayup >= 1) income -= 50;
	income += V.robin.moneyModifier;
	return Math.max(Math.round(income), 0);
}
window.robinStandWeeklyIncome = robinStandWeeklyIncome;

/* Everything Robin could buy next: the next stand tier plus unowned upgrades available at the current tier.
Sorted cheapest first. */
function robinStandAvailablePurchases() {
	const stand = ensureRobinStand();
	const purchases = [];
	if (stand.tier < 4) {
		const nextTier = setup.robinStand.tiers[stand.tier + 1];
		purchases.push({ id: "tier", name: nextTier.name, cost: nextTier.cost, income: nextTier.income - setup.robinStand.tiers[stand.tier].income });
	}
	setup.robinStand.upgrades.forEach(upgrade => {
		if (upgrade.tier <= stand.tier && !stand.upgrades.includes(upgrade.id)) {
			purchases.push(upgrade);
		}
	});
	purchases.sort((a, b) => a.cost - b.cost);
	return purchases;
}
window.robinStandAvailablePurchases = robinStandAvailablePurchases;

function robinStandBuy(id) {
	const stand = ensureRobinStand();
	if (id === "tier") {
		if (stand.tier < 4) stand.tier++;
	} else {
		const upgrade = robinStandUpgrade(id);
		if (!stand.upgrades.includes(id) && upgrade?.tier <= stand.tier) stand.upgrades.push(id);
	}
}
window.robinStandBuy = robinStandBuy;

function robinStandRecordHelp() {
	const stand = ensureRobinStand();
	stand.helpCount++;
}
window.robinStandRecordHelp = robinStandRecordHelp;

/* Robin starts investing in the stand once the pressure is off: the player pays their rent, has helped at the stand a lot, or has given them a real cushion. */
function robinStandAutoUpgradeEligible() {
	const stand = ensureRobinStand();
	return V.robinpaid === 1 || stand.selfSufficient === 1 || stand.helpCount >= 8 || (V.robinGivenTotal || 0) >= 400;
}
window.robinStandAutoUpgradeEligible = robinStandAutoUpgradeEligible;

/* Robin is ready to put a name on the stand once it is a real fixture rather than a table. */
function robinStandNamingReady() {
	const stand = ensureRobinStand();
	return !stand.named && stand.tier >= 3 && V.robin.timer.hurt === 0 && !V.robinbreakupCooldown;
}
window.robinStandNamingReady = robinStandNamingReady;

function robinStandSelfSufficiencyReady() {
	const stand = ensureRobinStand();
	return (
		V.robinpaid === 1 &&
		stand.selfSufficient !== 1 &&
		stand.lastIncome >= Math.max(setup.robinStand.selfSufficiencyIncome, robinStandRent()) &&
		V.robinmissing === 0 &&
		C.npc.Robin.trauma < 60
	);
}
window.robinStandSelfSufficiencyReady = robinStandSelfSufficiencyReady;

/* Robin's weekly rent in £: the player's single rent for the current stage, with the rent setting and economy inflation applied, never below the vanilla £400. */
function robinStandRent() {
	let rent = [10000, 30000, 50000, 70000, 100000, 150000, 200000][Math.clamp((V.rentstage || 1) - 1, 0, 6)];
	if (setup.inflation) rent = setup.inflation.price(Math.floor(rent * setup.inflation.rentSettingModifier()));
	return Math.max(setup.robinStand.rent, Math.round(rent / 100));
}
window.robinStandRent = robinStandRent;

/* Weekly rent for a self-sufficient Robin, called from time.js before income is added.
Anything Robin can't cover is owed to Bailey and collected first the next week.
If the debt grows for as many weeks as the vanilla docks limit allows, Robin gives up, and the player covers their rent again. */
function robinStandPayOwnRent() {
	const stand = ensureRobinStand();
	const before = stand.owed;
	const due = robinStandRent() + before;
	const paid = Math.min(Math.max(V.robinmoney, 0), due);
	V.robinmoney -= paid;
	stand.owed = due - paid;
	if (stand.owed === 0) stand.missedWeeks = 0;
	else if (stand.owed > before) stand.missedWeeks++;
	if (stand.missedWeeks >= (V.robindebtlimit || 5)) {
		stand.selfSufficient = 0;
		stand.owed = 0;
		stand.missedWeeks = 0;
		stand.fellBehind = 1;
	}
}
window.robinStandPayOwnRent = robinStandPayOwnRent;

function robinStandBecomeSelfSufficient() {
	if (!robinStandSelfSufficiencyReady()) return false;
	ensureRobinStand().selfSufficient = 1;
	V.robinfirstrentfight = 0;
	V.robinmoney = Math.max(V.robinmoney - robinStandRent(), 0);
	/* Rebuild the current demand without Robin's doubled share. rentpay advances to the next stage later. */
	V.rentmoney = [10000, 30000, 50000, 70000, 100000, 150000, 200000][Math.clamp(V.rentstage - 1, 0, 6)];
	wikifier("rentmod");
	return true;
}
window.robinStandBecomeSelfSufficient = robinStandBecomeSelfSufficient;

/* Weekly tick, called from time.js after rent is settled.
Handles natural skill growth, Robin's own purchases, and computes the week's income. */
function robinStandWeeklyTick() {
	const stand = ensureRobinStand();
	/* Robin slowly gets better at running the stand on their own. */
	if (stand.skill < 1000) stand.skill = Math.min(stand.skill + 4, 1000);
	/* Living costs: once the player shoulders the rent, Robin spends a little of the freed money on themselves and the younger orphans.
	Keeps the no-help path from snowballing; the vanilla debt treadmill is untouched. */
	if (V.robinpaid === 1) V.robinmoney = Math.max(V.robinmoney - 100, 0);
	/* Auto-upgrade: Robin deliberates before spending.
	A confident Robin commits after two weeks of saving with one week of rent spare; a timid Robin waits four weeks and keeps three in reserve. */
	if (robinStandAutoUpgradeEligible()) {
		stand.saveWeeks++;
		const confident = C.npc.Robin.dom >= 60;
		const cushion = robinStandRent() * (confident ? 1 : 3);
		const deliberation = confident ? 2 : 4;
		const purchases = robinStandAvailablePurchases();
		if (purchases.length && stand.saveWeeks >= deliberation && V.robinmoney - purchases[0].cost >= cushion) {
			V.robinmoney -= purchases[0].cost;
			robinStandBuy(purchases[0].id);
			stand.notice = purchases[0].name;
			stand.saveWeeks = 0;
		}
	}
	const income = robinStandWeeklyIncome();
	stand.lastIncome = income;
	return income;
}
window.robinStandWeeklyTick = robinStandWeeklyTick;

/* Stand advertising */

/* Naked advertising for Robin's stand (DoLX).
 *
 * Nude advertising replaces the sign/tray round. Longer runs increase both payout and risk.
 * Earnings go to $robinmoney (£).
 * V.robinNudeAd: venue, rounds, earned
 * V.robinStand.nudeRounds: lifetime completed rounds
 */

setup.robinStandNude = {
	/* Naked advertising pulls this many times the crowd a sign does. */
	multiplier: 3,
	/* Each completed round adds this much again, as the crowd gathers. */
	crowdGrowth: 0.3,
	/* Cap on that growth, reached after six rounds. */
	crowdGrowthMax: 1.2,
	/* Lifetime rounds needed for the full reputation bonus, and the size of that bonus. */
	reputationRounds: 50,
	reputationBonus: 0.25,
	/* Hard ceilings, so a beautiful famous player can't turn a weekend into a fortune. */
	roundCap: 120,
	runCap: 400,
	/* Chance of the round going wrong, as a percentage, rising with each round already done. */
	riskBase: 10,
	riskPerRound: 12,
	/* Rounds completed before a groper becomes a possible outcome instead of only an official warning. */
	roundsBeforeMolestation: 3,
};

function ensureRobinNudeAd() {
	if (!V.robinNudeAd || typeof V.robinNudeAd !== "object" || Array.isArray(V.robinNudeAd)) {
		V.robinNudeAd = { venue: "beach", rounds: 0, earned: 0 };
	}
	const run = V.robinNudeAd;
	if (run.venue !== "park") run.venue = "beach";
	if (!Number.isFinite(run.rounds) || run.rounds < 0) run.rounds = 0;
	if (!Number.isFinite(run.earned) || run.earned < 0) run.earned = 0;
	return run;
}
window.ensureRobinNudeAd = ensureRobinNudeAd;

/* Exhibitionism 5 and promiscuity 2 are required to advertise naked. */
function robinStandNudeEligible() {
	if (!hasSexStat("exhibitionism", 5) || !hasSexStat("promiscuity", 2)) return false;
	if (pcAreArmsBound("any")) return false;
	return true;
}
window.robinStandNudeEligible = robinStandNudeEligible;

/* Start a fresh advertising run at the beach or park. */
function robinStandNudeStart(venue) {
	V.robinNudeAd = { venue: venue === "park" ? "park" : "beach", rounds: 0, earned: 0 };
}
window.robinStandNudeStart = robinStandNudeStart;

/* Shared crowd multiplier for ordinary and naked advertising. */
function robinStandCrowdPull() {
	return 1 + V.beauty / 5000 + fameTotal() / 2000;
}
window.robinStandCrowdPull = robinStandCrowdPull;

/* Next round's income in whole pounds, limited by the round and run caps. */
function robinStandNudeRoundIncome() {
	const rules = setup.robinStandNude;
	const stand = ensureRobinStand();
	const run = ensureRobinNudeAd();

	let income = 5 * robinStandCrowdPull() * rules.multiplier;
	/* The crowd builds while the player keeps going. */
	income *= 1 + Math.min(run.rounds * rules.crowdGrowth, rules.crowdGrowthMax);
	/* A stand already known for this draws people who came looking. */
	income *= 1 + (Math.min(stand.nudeRounds, rules.reputationRounds) / rules.reputationRounds) * rules.reputationBonus;
	/* A bigger stand can actually serve the queue the player brings it. */
	income *= 1 + (stand.tier - 1) * 0.15;

	income = Math.min(Math.round(income), rules.roundCap);
	return Math.max(Math.min(income, rules.runCap - run.earned), 0);
}
window.robinStandNudeRoundIncome = robinStandNudeRoundIncome;

function robinStandNudeCanContinue() {
	return ensureRobinNudeAd().earned < setup.robinStandNude.runCap;
}
window.robinStandNudeCanContinue = robinStandNudeCanContinue;

/* Bank a completed round and return its earnings in pounds. */
function robinStandNudeRound() {
	const stand = ensureRobinStand();
	const run = ensureRobinNudeAd();
	const income = robinStandNudeRoundIncome();

	run.rounds++;
	run.earned += income;
	V.robinmoney += income;
	stand.nudeRounds++;
	return income;
}
window.robinStandNudeRound = robinStandNudeRound;

/* Percentage chance of trouble during the current round. */
function robinStandNudeRisk() {
	const rules = setup.robinStandNude;
	return Math.min(rules.riskBase + ensureRobinNudeAd().rounds * rules.riskPerRound, 90);
}
window.robinStandNudeRisk = robinStandNudeRisk;

function robinStandNudeOutcome() {
	if (random(1, 100) > robinStandNudeRisk()) return "safe";
	const run = ensureRobinNudeAd();
	if (run.rounds >= setup.robinStandNude.roundsBeforeMolestation && random(1, 100) <= 60) return "molested";
	return "caught";
}
window.robinStandNudeOutcome = robinStandNudeOutcome;
