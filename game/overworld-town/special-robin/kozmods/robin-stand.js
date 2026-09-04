/* globals robinCafeStandModifier */
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
 *   lastIncome      last weekly income in £ (drives the self-sufficiency scene)
 *   selfSufficient  0|1, set when Robin takes their rent back from the player
 *   notice          name of the last thing Robin bought on their own, "" if none
 */

setup.robinStand = {
	/* Weekly £ income Robin needs to cover their own rent. Keep in sync with time.js. */
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
	if (!Number.isFinite(stand.saveWeeks)) stand.saveWeeks = 0;
	if (!Number.isFinite(stand.lastIncome)) stand.lastIncome = 0;
	if (stand.selfSufficient !== 1) stand.selfSufficient = 0;
	if (typeof stand.notice !== "string") stand.notice = "";
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
	return Math.round(income);
}
window.robinStandBaseIncome = robinStandBaseIncome;

/* The actual income for one week, weather and luck included. */
function robinStandWeeklyIncome() {
	const stand = ensureRobinStand();
	const fluct = setup.robinStand.tiers[stand.tier].fluct;
	let income = robinStandBaseIncome();
	income *= robinStandWeatherModifier();
	/* Cafe shifts eat into the hours Robin needs to prep and restock. See robin-cafe.js. */
	if (typeof robinCafeStandModifier === "function") income *= robinCafeStandModifier();
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

function robinStandSelfSufficiencyReady() {
	const stand = ensureRobinStand();
	return (
		V.robinpaid === 1 &&
		stand.selfSufficient !== 1 &&
		stand.lastIncome >= setup.robinStand.selfSufficiencyIncome &&
		V.robinmissing === 0 &&
		C.npc.Robin.trauma < 60
	);
}
window.robinStandSelfSufficiencyReady = robinStandSelfSufficiencyReady;

function robinStandBecomeSelfSufficient() {
	if (!robinStandSelfSufficiencyReady()) return false;
	ensureRobinStand().selfSufficient = 1;
	V.robinfirstrentfight = 0;
	V.robinmoney = Math.max(V.robinmoney - setup.robinStand.rent, 0);
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
		const cushion = confident ? setup.robinStand.rent : setup.robinStand.rent * 3;
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
