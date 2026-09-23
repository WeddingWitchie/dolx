/* The POCKET menu: what the PC is physically carrying. */
/* globals wikifier Time statChange statDisplay earnFeat onTakeClick updateMoment sexToysInventoryOnWearClick sexToyCanWear sexToyWearButtonText sexToyUsesVaginalWornSlot closeOverlay pocketBaitValid pocketOutfitPieceCount pocketOutfitUnpackAll */

/* Setup tables */
/* How many item types each handheld bag can hold.
   Unlisted bags default to 4 slots. Add an entry here if a bag should hold a different amount. */
setup.pocketBagCapacity = {
	luggage: 10,
	"vintage suitcase": 10,
	/* Worn on the back, the school bag included. */
	backpack: 8,
	bearbackpack: 8,
	"teddy backpack": 8,
	/* Roomy, but carried in one hand. */
	gymbag: 6,
	totebag: 6,
	/* Foraging baskets: open-topped, so roomy but only sensible for what you gathered. */
	mushroombasket: 5,
	fruitbasket: 5,
	flowerbasket: 5,
	messengerbag: 5,
	/* Barely more than a phone and a purse. */
	purse: 2,
	honeypouch: 2,
	heartpurse: 2,
	"clock purse": 2,
	"cloud purse": 2,
	"star purse": 2,
};
setup.pocketBagCapacityDefault = 4;

/* Days a cooked dish keeps once it leaves the pan. Anything not listed is derived from its food tags. */
setup.foodShelfLife = {
	chocolate: 60,
	valentines_chocolate: 60,
	rich_biscuit: 21,
	jammie_dodger: 21,
	shortbread: 21,
	flapjack: 21,
	bread: 5,
	banana_bread: 7,
	crumpet: 5,
	naan_bread: 5,
	chips: 1,
	salad: 2,
	porridge: 1,
	omelette: 1,
	roast_dinner: 3,
	full_english_breakfast: 1,
	orange_juice: 4,
	lemonade: 10,
	hot_cocoa: 1,
	wolfbrew: 90,
	ghostbrew: 90,
	poached_pear: 30,
};

/* Stat changes from eating one serving. Negative reduces a stat; positive increases it.

   Each dish uses the base effects plus one flavour row based on priority. Flavour effects do not stack,
   to avoid overlapping tags cancelling each other out. The final effects are scaled by the dish's value. */
setup.foodEffectsByTag = {
	/* A hot meal is a real comfort. */
	base: { stress: -4 },
	/* Sugar lifts you, then drops you. */
	sweet: { stress: -4, tiredness: 2 },
	/* Wakes you up and burns going down. */
	spicy: { tiredness: -2, pain: 3 },
	/* Clean and settling, but it sits oddly. */
	seafood: { trauma: -3, pain: 2 },
	/* Loosens you and makes you heavy. */
	alcohol: { stress: -4, tiredness: 3 },
	/* Rich, filling, soporific: every untagged dish is one of these. */
	hearty: { pain: -4, tiredness: 4 },
	/* Small and quick. Less comfort than a proper meal, but it doesn't weigh you down. */
	light: { stress: 2, tiredness: -2 },
};

/* Scale meal effects by serving price, which roughly reflects its ingredients, portion, and effort.
   Square-root scaling keeps expensive meals stronger without making them too powerful. */
setup.foodValue = {
	/* The median dish, so a typical serving scales 1:1 and the menu spreads either side of it. */
	reference: 800,
	/* Keep the floor low so cheap foods still scale differently instead of being grouped together. */
	min: 0.25,
	/* Safety cap only. Current dish prices do not reach it, so expensive dishes still scale separately. */
	max: 3,
};

/* First match wins. "light" covers meat-free dishes without another flavour tag.
   Anything else is treated as a main meal. */
setup.foodFlavourPriority = [
	["alcohol", "alcohol"],
	["spicy", "spicy"],
	["seafood", "seafood"],
	["sweet", "sweet"],
	["vegan", "light"],
	["vegetarian", "light"],
];
setup.foodFlavourDefault = "hearty";

/* Animal-themed food can give transformation points, like the cafe's honey challah.

   Ingredient values are weights.
   They only decide which animal the food matches, and eating a matching food always gives 1 point.
   Common ingredients have low weights, while important ingredients have higher weights.
   The animal with the highest total wins, but only if it reaches foodTransformThreshold.
   Only the recipe's listed ingredients are checked. Ingredients inside sub-recipes are ignored. */
setup.foodTransformIngredients = {
	/* Bears and honey. */
	honey: ["bear", 3],
	wild_honeycomb: ["bear", 4],
	/* Anything out of the water. */
	cod: ["waterdragon", 3],
	haddock: ["waterdragon", 3],
	salmon: ["waterdragon", 3],
	trout: ["waterdragon", 3],
	water_dragon_egg: ["waterdragon", 4],
	water_dragon_egg_pastel: ["waterdragon", 4],
	lotus: ["waterdragon", 2],
	/* Dairy is a seasoning in most recipes, so it takes a genuinely creamy dish to score. */
	prawn: ["cat", 3],
	clam: ["cat", 3],
	oyster_pearl: ["cat", 3],
	cheese: ["cat", 2],
	bottle_of_milk: ["cat", 1],
	cream: ["cat", 1],
	bottle_of_breast_milk: ["cat", 4],
	baby_bottle_of_breast_milk: ["cat", 4],
	/* Red meat. Beef and pork outweigh the trimmings so a roast reads as the meat it is. */
	beef: ["wolf", 4],
	pork: ["wolf", 4],
	bacon: ["wolf", 3],
	sausage: ["wolf", 3],
	wolfshroom: ["wolf", 4],
	/* Poultry and the grain birds pick at. */
	chicken: ["bird", 3],
	wheat: ["bird", 1],
	rice: ["bird", 1],
	oats: ["bird", 1],
	/* Berries and stolen eggs, the same pairing the forest scenes use. */
	blackberry: ["fox", 3],
	strawberry: ["fox", 3],
	cloudberry: ["fox", 3],
	cherry: ["fox", 3],
	bird_egg: ["fox", 3],
	jam: ["fox", 2],
	/* Roots and greens. */
	wild_carrot: ["bunny", 3],
	clover: ["bunny", 3],
	four_leaf_clover: ["bunny", 3],
	turnip: ["bunny", 2],
	cabbage: ["bunny", 1],
	broccoli: ["bunny", 1],
	cauliflower: ["bunny", 1],
	spinach: ["bunny", 1],
	/* Cow is Remy's specialist, so no dish leads there. */
};

/* Dishes whose name says what they are, where the ingredient sums disagree. */
setup.foodTransformOverride = {
	honeyed_pork: "bear",
	clam_chowder: "cat",
};

/* What eating one feels like. */
setup.foodTransformText = {
	bear: "The honey sits heavy and sweet in you.",
	waterdragon: "You taste salt and cold water.",
	cat: "You find yourself wanting to lick your fingers clean.",
	wolf: "The meat is rich, and you want more of it.",
	bird: "You pick at the last of it without thinking.",
	fox: "The sweetness is sharp, like something taken from a hedgerow.",
	bunny: "It leaves a green, earthy taste behind.",
};

setup.foodTransformThreshold = 3;
/* Ties go to whatever the dish is most obviously made of. */
setup.foodTransformPriority = ["waterdragon", "wolf", "bear", "cat", "fox", "bird", "bunny"];

setup.foodFlavourText = {
	sweet: "The sugar cheers you up, but makes you feel tired later.",
	spicy: "The hot meal cheers you up and wakes you up, but it hurts a bit.",
	seafood: "The meal helps you feel calmer, but leaves you a bit sore.",
	alcohol: "The drink helps you relax, but makes you sleepy.",
	hearty: "The filling meal helps you relax and eases your pain, but makes you sleepy.",
	light: "The light meal helps you relax a little and wakes you up.",
};

/* State */
function pocketEnsure() {
	if (!V.pocket || typeof V.pocket !== "object" || Array.isArray(V.pocket)) V.pocket = {};
	if (typeof V.pocket.mirror !== "boolean") V.pocket.mirror = false;
	if (!V.pocket.bag || typeof V.pocket.bag !== "object" || Array.isArray(V.pocket.bag)) V.pocket.bag = {};
	if (!Array.isArray(V.pocket.bag.slots)) V.pocket.bag.slots = [];
	if (typeof V.pocket.bag.source !== "string") V.pocket.bag.source = pocketBagSource();
	if (!V.foodBatches || typeof V.foodBatches !== "object" || Array.isArray(V.foodBatches)) V.foodBatches = {};
	if (!Number.isFinite(V.foodSatiety)) V.foodSatiety = 0;
	V.foodSatiety = Math.clamp(V.foodSatiety, 0, 60);
	if (!Number.isFinite(V.pocket.foodFullness)) V.pocket.foodFullness = 0;
	V.pocket.foodFullness = Math.clamp(V.pocket.foodFullness, 0, 9);
	if (!Number.isFinite(V.pocket.bloated)) V.pocket.bloated = 0;
	V.pocket.bloated = Math.clamp(V.pocket.bloated, 0, 10);
	if (V.foodSatiety <= 50 && V.pocket.bloated <= 0) V.pocket.foodFullness = 0;
	if (!Number.isFinite(V.homeCookedEaten)) V.homeCookedEaten = 0;
	V.homeCookedEaten = Math.max(0, V.homeCookedEaten);
	return V.pocket;
}
window.pocketEnsure = pocketEnsure;

/* Pocket changes happen outside passages, so they are not saved automatically.
   Sync them to the current moment so packing a bag is not lost after saving and reloading. */
function pocketCommit() {
	if (typeof updateMoment === "function") updateMoment();
}
window.pocketCommit = pocketCommit;

/* Gating */
/* Returns why the pocket can't be opened, or "" if it can.
   Only allows access when the PC is freely standing in their own body.
   `ignoreCompany` lets you access your bag even when a shopkeeper is present. */
function pocketLockReason(ignoreCompany) {
	if (V.passage === "Start" || V.passage === "Start2") return "Not yet.";
	if (V.hc) return "There's nothing on you here but rags.";
	if (V.statFreeze || V.frozenValues || V.replayScene) return "This already happened. You can't reach for anything now.";
	const badEnd = Array.isArray(V.badEndStats) ? V.badEndStats.last() : undefined;
	if (badEnd && badEnd.trackedStart && badEnd.trackedEnd === undefined) return "Everything you were carrying was taken from you.";
	if (V.combat) return "You can't rummage through your things mid-fight.";
	if (V.dancing) return "Not while you're on stage.";
	if (V.captured) return "Your belongings are out of reach.";
	if (V.trance) return "Your hands won't answer you.";
	/* Valid occupied NPC slots mean the PC is in an active character scene */
	if (!ignoreCompany && Array.isArray(V.NPCList) && V.NPCList.some(npc => npc && npc.gender && npc.description))
		return "Not while someone is dealing with you.";
	return "";
}
window.pocketLockReason = pocketLockReason;

function pocketAvailable() {
	return pocketLockReason() === "";
}
window.pocketAvailable = pocketAvailable;

/* The bag */
/* Whatever the player is carrying that can hold things: a bag, or a foraging basket in hand. */
function pocketBagItem() {
	for (const carried of [V.worn && V.worn.bag, V.worn && V.worn.handheld]) {
		if (!carried || !Array.isArray(carried.type)) continue;
		/* Bookbags, and foraging baskets, which carry things without being school bags. */
		if (carried.type.includesAny("bookbag", "foraging")) return carried;
	}
	return undefined;
}
window.pocketBagItem = pocketBagItem;

function pocketBagCapacity() {
	const bag = pocketBagItem();
	if (!bag) return 0;
	const named = setup.pocketBagCapacity[bag.variable] ?? setup.pocketBagCapacity[bag.name];
	return named ?? setup.pocketBagCapacityDefault;
}
window.pocketBagCapacity = pocketBagCapacity;

/* One personal pocket/hand slot exists alongside, rather than instead of, the worn bag. */
function pocketCarryCapacity() {
	return 1 + pocketBagCapacity();
}
window.pocketCarryCapacity = pocketCarryCapacity;

/* The container's name as it should read in a sentence ("your backpack" or "your pocket"). */
function pocketBagName() {
	const bag = pocketBagItem();
	return bag ? bag.name : "pocket";
}
window.pocketBagName = pocketBagName;

/* Clothing has no unique ID, so use appearance fields to detect swaps like changing backpack colours. */
function pocketBagSource() {
	const bag = pocketBagItem();
	if (!bag) return "";
	return JSON.stringify([
		bag.name,
		bag.variable || "",
		bag.colour || "",
		bag.colourCustom || "",
		bag.accessory_colour || "",
		bag.accessory_colourCustom || "",
		bag.pattern || "",
	]);
}
window.pocketBagSource = pocketBagSource;

/* Removing or changing the bag clears its slots, but keeps the personal pocket.
   Items are not lost; the slots only track what is currently accessible. */
function pocketSyncBag() {
	pocketEnsure();
	const bag = pocketBagItem();
	const source = pocketBagSource();
	let kept;
	if (V.pocket.bag.source !== source) {
		kept = V.pocket.bag.slots.filter(slot => slot.location === "pocket" && pocketSlotStillValid(slot)).slice(0, 1);
		V.pocket.bag.source = source;
	} else {
		/* Validate and trim the two containers separately if the bag shrank or an item is no longer owned. */
		const personal = V.pocket.bag.slots.filter(slot => slot.location === "pocket" && pocketSlotStillValid(slot)).slice(0, 1);
		const bagged = bag ? V.pocket.bag.slots.filter(slot => slot.location === "bag" && pocketSlotStillValid(slot)).slice(0, pocketBagCapacity()) : [];
		kept = personal.concat(bagged);
	}

	V.pocket.bag.slots = kept;

	/* A serving outfit is the one kind whose slot holds the only copy of its contents, so losing the
	slot to a smaller bag has to put the garments back in the wardrobe rather than strand them. */
	if (typeof pocketOutfitUnpackAll === "function" && !V.pocket.bag.slots.some(slot => slot.kind === "outfit")) {
		pocketOutfitUnpackAll();
	}

	/* Toys removed with bag slots return to the cupboard. */
	const toySlots = new Set(V.pocket.bag.slots.filter(slot => slot.kind === "toy").map(slot => slot.key));
	const inv = V.player && V.player.inventory && V.player.inventory.sextoys;
	if (inv && typeof inv === "object") {
		Object.keys(inv).forEach(category => {
			if (!toySlots.has(category)) pocketToyUnpackAll(category);
		});
	}
}
window.pocketSyncBag = pocketSyncBag;

function pocketSlotStillValid(slot) {
	if (!slot || !slot.kind || !slot.key) return false;
	switch (slot.kind) {
		case "food":
			return foodBatchCount(slot.key) > 0;
		case "pill":
			return pocketPillOwned(slot.key) > 0;
		case "toy":
			return pocketToyPackedCount(slot.key) > 0;
		case "bait":
			/* The can stays a slot when it's empty: an empty tin is still a tin you can refill. */
			return pocketBaitValid(slot.key);
		case "outfit":
			/* The bundle holds the only copy of its garments. See pocket-outfit.js. */
			return typeof pocketOutfitPieceCount === "function" && pocketOutfitPieceCount() > 0;
		default:
			return false;
	}
}
window.pocketSlotStillValid = pocketSlotStillValid;

function pocketSlotIndex(kind, key) {
	pocketEnsure();
	return V.pocket.bag.slots.findIndex(slot => slot.kind === kind && slot.key === key);
}
window.pocketSlotIndex = pocketSlotIndex;

function pocketCarrying(kind, key) {
	return pocketSlotIndex(kind, key) !== -1;
}
window.pocketCarrying = pocketCarrying;

function pocketSlotToggle(kind, key) {
	if (!pocketAvailable()) return false;
	/* Record the current bag before packing so the next sync does not treat it as removed and discard the contents. */
	pocketSyncBag();
	const existing = pocketSlotIndex(kind, key);
	if (existing !== -1) {
		V.pocket.bag.slots.splice(existing, 1);
		if (kind === "toy") pocketToyUnpackAll(key);
		pocketCommit();
		return true;
	}
	if (!pocketSlotStillValid({ kind, key })) return false;
	const personalUsed = V.pocket.bag.slots.some(slot => slot.location === "pocket");
	let location = "pocket";
	if (personalUsed) {
		if (!pocketBagItem()) return false;
		if (V.pocket.bag.slots.filter(slot => slot.location === "bag").length >= pocketBagCapacity()) return false;
		location = "bag";
	}
	V.pocket.bag.slots.push({ kind, key, location });
	pocketCommit();
	return true;
}
window.pocketSlotToggle = pocketSlotToggle;

/* Packing is tracked per copy. Packed toys are also `carried` so the game knows they are with you,
   while `packed` means they are stored in the bag rather than held. */
function pocketToyPacked(category, index) {
	const inv = V.player && V.player.inventory && V.player.inventory.sextoys;
	const toy = inv && Array.isArray(inv[category]) ? inv[category][index] : undefined;
	return !!(toy && toy.packed);
}
window.pocketToyPacked = pocketToyPacked;

function pocketToyPackedCount(category) {
	const inv = V.player && V.player.inventory && V.player.inventory.sextoys;
	if (!inv || !Array.isArray(inv[category])) return 0;
	return inv[category].filter(toy => toy.packed).length;
}
window.pocketToyPackedCount = pocketToyPackedCount;

/* Put one copy in the carried container, or take it out. Returns false when there's no room. */
function pocketToyPack(category, index, on) {
	if (!pocketAvailable()) return false;
	pocketEnsure();
	const inv = V.player && V.player.inventory && V.player.inventory.sextoys;
	const toy = inv && Array.isArray(inv[category]) ? inv[category][index] : undefined;
	if (!toy) return false;
	pocketSyncBag();

	if (!on) {
		toy.packed = false;
		/* Out of the bag is back in the cupboard, unless it's still in you. */
		if (!toy.worn) toy.carried = false;
		if (pocketToyPackedCount(category) === 0) {
			const slot = pocketSlotIndex("toy", category);
			if (slot !== -1) V.pocket.bag.slots.splice(slot, 1);
		}
		pocketCommit();
		return true;
	}

	const hasSlot = pocketSlotIndex("toy", category) !== -1;
	let location = "pocket";
	if (!hasSlot && V.pocket.bag.slots.some(slot => slot.location === "pocket")) {
		if (!pocketBagItem()) return false;
		if (V.pocket.bag.slots.filter(slot => slot.location === "bag").length >= pocketBagCapacity()) return false;
		location = "bag";
	}
	toy.packed = true;
	toy.carried = true;
	if (!hasSlot) V.pocket.bag.slots.push({ kind: "toy", key: category, location });
	pocketCommit();
	return true;
}
window.pocketToyPack = pocketToyPack;

function pocketToyUnpackAll(category) {
	const inv = V.player && V.player.inventory && V.player.inventory.sextoys;
	if (!inv || !Array.isArray(inv[category])) return;
	inv[category].forEach(toy => {
		if (!toy.packed) return;
		toy.packed = false;
		if (!toy.worn) toy.carried = false;
	});
}
window.pocketToyUnpackAll = pocketToyUnpackAll;

/* What can go in a slot */
function pocketPillOwned(name) {
	const record = V.sexStats && V.sexStats.pills && V.sexStats.pills.pills && V.sexStats.pills.pills[name];
	return record ? Number(record.owned) || 0 : 0;
}
window.pocketPillOwned = pocketPillOwned;

/* Wearable toys keep one row per copy so each can be used or stored separately.
   Identical lube containers share a row because the whole kind already shares one pocket slot. */
function pocketToyItems(category) {
	const inv = V.player && V.player.inventory && V.player.inventory.sextoys;
	if (!inv || !Array.isArray(inv[category])) return [];
	const items = inv[category].flatMap((toy, index) => {
		if (!toy.packed) return [];
		const setupToy = setup.sextoys[toy.index];
		return [
			{
				index,
				category,
				toy,
				setupToy,
				worn: !!toy.worn,
				carried: !!toy.carried,
				/* Only toys that can be worn or inserted need an action. The rest are simply carried for later use. */
				wearableKind: setupToy ? sexToyUsesVaginalWornSlot(toy, setupToy) || setupToy.wearable === 1 : false,
				canWear: setupToy ? sexToyCanWear(toy, setupToy) : false,
				wearLabel: setupToy ? sexToyWearButtonText(toy, setupToy) : "",
			},
		];
	});
	if (items.length > 0 && items.every(item => item.setupToy && item.setupToy.type.includes("lube"))) {
		items[0].count = items.length;
		items[0].uses = items.reduce(
			(total, item) => total + (typeof item.toy.uses === "number" && !Number.isNaN(item.toy.uses) ? item.toy.uses : item.setupToy.uses || 3),
			0
		);
		items[0].stacked = true;
		return [items[0]];
	}
	return items;
}
window.pocketToyItems = pocketToyItems;

/* The toy's own artwork. Build the small pocket copy directly so repeated items do not reuse
   the shop grid's element IDs, and so the ordinary icon macro cannot leave an empty wrapper. */
function pocketToyIcon(category, index) {
	const inv = V.player && V.player.inventory && V.player.inventory.sextoys;
	const toy = inv && Array.isArray(inv[category]) ? inv[category][index] : undefined;
	if (!toy) return "";
	const setupToy = setup.sextoys[toy.index];
	if (!setupToy || !setupToy.icon) return "";
	const colour = setupToy.colour && toy.colour ? ` clothes-${toy.colour.replace(/\s/g, "-")}` : "";
	const main = `<span class="ssm_icon icon${colour}"><img class="icon" src="img/misc/icon/${setupToy.icon}"/></span>`;
	const front = setupToy.iconFront ? `<span class="ssm_icon icon infront"><img class="icon" src="img/misc/icon/${setupToy.iconFront}"/></span>` : "";
	return `<span class="ssm_icon_wrapper">${front}${main}</span>`;
}
window.pocketToyIcon = pocketToyIcon;

/* Wear or remove a packed toy using the same rules as the cupboard. */
function pocketToyWear(category, index) {
	if (!pocketAvailable() || !pocketToyPacked(category, index)) return "";
	delete T.sexToyNotice;
	if (typeof sexToysInventoryOnWearClick !== "function") return "";
	sexToysInventoryOnWearClick(index, category);
	pocketSyncBag();
	pocketCommit();
	return T.sexToyNotice || "";
}
window.pocketToyWear = pocketToyWear;

function pocketPillSetup(name) {
	if (!Array.isArray(setup.pills)) return undefined;
	return setup.pills.find(pill => pill.name === name);
}
window.pocketPillSetup = pocketPillSetup;

/* Use the medicine drawer's own art, including the symbol layered over some pills. */
function pocketPillIcon(name) {
	const item = pocketPillSetup(name);
	if (!item || !item.icon) return "";
	return `${item.frontIcon ? `<img class="icon infront" src="${item.frontIcon}"/>` : ""}<img class="icon" src="${item.icon}"/>`;
}
window.pocketPillIcon = pocketPillIcon;

/* Why a bagged pill can't be taken right now, in the same words the medicine drawer uses. */
function pocketPillBlockedReason(name) {
	const item = pocketPillSetup(name);
	if (!item) return "";
	const reason = typeof item.take_blocked_reason === "function" ? item.take_blocked_reason() : "";
	if (reason) return reason;
	return item.type === "xchange" ? "You can't take this pill in your current state." : "";
}
window.pocketPillBlockedReason = pocketPillBlockedReason;

/* Take one from the bag using the normal medicine path, preserving repeat-dose and overdose effects.
   PillCollection then returns to the current passage. */
function pocketTakePill(name) {
	if (!pocketAvailable()) return undefined;
	if (!pocketCarrying("pill", name)) return undefined;
	const item = pocketPillSetup(name);
	if (!item || pocketPillOwned(name) <= 0) return undefined;
	if (typeof item.take_condition === "function" && item.take_condition() === 0) return undefined;
	if (typeof onTakeClick !== "function") return undefined;
	const from = V.passage;
	V.pocketPillReturn = from;
	delete V.lastPillTakenDescription;
	onTakeClick(name);
	if (V.passage === from) {
		delete V.pocketPillReturn;
		pocketSyncBag();
		pocketCommit();
		return { navigated: false, message: V.lastPillTakenDescription || "" };
	}
	return { navigated: true, message: "" };
}
window.pocketTakePill = pocketTakePill;

/* Food: shelf life and batches */
function foodIsDish(key) {
	const item = setup.foodstuff && setup.foodstuff[key];
	return !!(item && item.category === "dish" && item.recipe);
}
window.foodIsDish = foodIsDish;

function foodTags(key) {
	const item = setup.foodstuff && setup.foodstuff[key];
	return (item && item.food && Array.isArray(item.food.tags) ? item.food.tags : []).slice();
}
window.foodTags = foodTags;

function foodShelfLife(key) {
	if (!foodIsDish(key)) return Infinity;
	if (setup.foodShelfLife[key] !== undefined) return setup.foodShelfLife[key];
	const tags = foodTags(key);
	if (tags.includes("alcohol")) return 60;
	if (tags.includes("seafood")) return 3;
	if (tags.includes("drink")) return 5;
	if (tags.includes("sweet")) return 21;
	if (tags.includes("carnivore")) return 4;
	if (tags.includes("vegan") || tags.includes("vegetarian")) return 6;
	return 4;
}
window.foodShelfLife = foodShelfLife;

function foodSpoilageEnabled() {
	return V.foodSpoilage === 1;
}
window.foodSpoilageEnabled = foodSpoilageEnabled;

function foodBatchList(key) {
	pocketEnsure();
	if (!Array.isArray(V.foodBatches[key])) V.foodBatches[key] = [];
	/* Keep valid food entries if save data is damaged.
	Fix their values and recreate missing stock with fresh,
	non-home-cooked defaults instead of losing food or breaking the Journal. */
	V.foodBatches[key] = V.foodBatches[key].filter(batch => {
		if (!batch || typeof batch !== "object" || Array.isArray(batch)) return false;
		const amount = Number(batch.n);
		if (!Number.isFinite(amount) || amount <= 0) return false;
		batch.n = amount;
		const day = Number(batch.day);
		batch.day = Number.isFinite(day) ? day : Time.days;
		batch.own = batch.own === true;
		return true;
	});
	return V.foodBatches[key];
}
window.foodBatchList = foodBatchList;

function foodBatchCount(key) {
	const stock = V.foodstuff && V.foodstuff[key] ? Number(V.foodstuff[key].amount) || 0 : 0;
	return Math.max(0, stock);
}
window.foodBatchCount = foodBatchCount;

/* Track newly cooked batches. Bought or gifted food is handled by foodBatchReconcile. */
function foodBatchAdd(key, amount, own) {
	if (!foodIsDish(key)) return;
	amount = Number(amount) || 0;
	if (amount <= 0) return;
	foodBatchList(key).push({ n: amount, day: Time.days, own: own !== false });
}
window.foodBatchAdd = foodBatchAdd;

/* Keep batches synced with V.foodstuff when food changes outside the kitchen.
   Extra food is added as fresh; missing food is removed from the oldest batch first. */
function foodBatchReconcile(key) {
	if (!foodIsDish(key)) return [];
	const batches = foodBatchList(key);
	const stock = foodBatchCount(key);
	const tracked = batches.reduce((sum, batch) => sum + (Number(batch.n) || 0), 0);
	if (tracked > stock) {
		let excess = tracked - stock;
		batches.sort((a, b) => foodBatchExpiryDay(key, a) - foodBatchExpiryDay(key, b));
		while (excess > 0 && batches.length) {
			const take = Math.min(excess, batches[0].n);
			batches[0].n -= take;
			excess -= take;
			if (batches[0].n <= 0) batches.shift();
		}
	} else if (tracked < stock) {
		batches.push({ n: stock - tracked, day: Time.days, own: false });
	}
	return batches;
}
window.foodBatchReconcile = foodBatchReconcile;

function foodBatchExpiryDay(key, batch) {
	const life = foodShelfLife(key);
	if (!Number.isFinite(life)) return Infinity;
	return (Number(batch.day) || 0) + life;
}
window.foodBatchExpiryDay = foodBatchExpiryDay;

/* Days left on the batch that will be eaten next.
With spoilage disabled, reaching zero makes the batch stale rather than removing it. */
function foodDaysLeft(key) {
	if (!foodIsDish(key)) return Infinity;
	const batches = foodBatchReconcile(key);
	if (!batches.length) return Infinity;
	const soonest = batches.reduce((best, batch) => Math.min(best, foodBatchExpiryDay(key, batch)), Infinity);
	if (!Number.isFinite(soonest)) return Infinity;
	return soonest - Time.days;
}
window.foodDaysLeft = foodDaysLeft;

/* Throw out anything past its date. Runs on the day tick and again whenever the pocket is opened. */
function foodExpirySweep() {
	pocketEnsure();
	if (!foodSpoilageEnabled()) return [];
	const spoiled = [];
	Object.keys(V.foodBatches).forEach(key => {
		if (!foodIsDish(key)) {
			delete V.foodBatches[key];
			return;
		}
		const batches = foodBatchReconcile(key);
		let lost = 0;
		const kept = batches.filter(batch => {
			if (foodBatchExpiryDay(key, batch) <= Time.days) {
				lost += Number(batch.n) || 0;
				return false;
			}
			return true;
		});
		if (lost > 0) {
			V.foodBatches[key] = kept;
			if (V.foodstuff && V.foodstuff[key]) V.foodstuff[key].amount = Math.max(0, (Number(V.foodstuff[key].amount) || 0) - lost);
			spoiled.push({ key, amount: lost });
		}
		if (!V.foodBatches[key] || !V.foodBatches[key].length) delete V.foodBatches[key];
	});
	if (spoiled.length) pocketSyncBag();
	return spoiled;
}
window.foodExpirySweep = foodExpirySweep;

/* Every cooked dish the PC has at least one serving of, soonest to spoil first. */
function pocketFoodList() {
	if (!V.foodstuff) return [];
	return Object.keys(V.foodstuff)
		.filter(key => foodIsDish(key) && foodBatchCount(key) > 0)
		.sort((a, b) => {
			const left = foodDaysLeft(a);
			const right = foodDaysLeft(b);
			if (left !== right) return left - right;
			return setup.foodstuff[a].name.localeCompare(setup.foodstuff[b].name);
		});
}
window.pocketFoodList = pocketFoodList;

/* Journal rows preserve separate cooking dates, combining only batches with the same expiry day. */
function foodExpiryRows(key) {
	if (!foodIsDish(key) || foodBatchCount(key) <= 0) return [];
	const grouped = new Map();
	foodBatchReconcile(key).forEach(batch => {
		const daysLeft = foodBatchExpiryDay(key, batch) - Time.days;
		grouped.set(daysLeft, (grouped.get(daysLeft) || 0) + (Number(batch.n) || 0));
	});
	return Array.from(grouped, ([daysLeft, amount]) => ({ amount, daysLeft })).sort((a, b) => a.daysLeft - b.daysLeft);
}
window.foodExpiryRows = foodExpiryRows;

/* Food: eating */
/* Stat changes per serving, scaled by its value. Expired food has no effects when spoilage is disabled. */
/* Defines the dish's flavour type. */
function foodFlavour(key) {
	const tags = foodTags(key);
	const match = setup.foodFlavourPriority.find(([tag]) => tags.includes(tag));
	return match ? match[1] : setup.foodFlavourDefault;
}
window.foodFlavour = foodFlavour;

/* Explain both halves of the calculation in player language. */
function foodEffectText(key) {
	if (!foodIsDish(key)) return "";
	const scale = foodValueScale(key);
	const drink = foodTags(key).includes("drink");
	let size;
	if (drink) {
		if (scale < 0.5) size = "It is only a little drink, so the effect is weak.";
		else if (scale < 0.85) size = "It is a small drink, so the effect is mild.";
		else if (scale < 1.25) size = "It is a satisfying drink, so you feel the effect properly.";
		else if (scale < 1.75) size = "It is a generous drink, so the effect is strong.";
		else size = "It is a very filling drink, so the effect is very strong.";
	} else if (scale < 0.5) size = "It is only a small snack, so the effect is weak.";
	else if (scale < 0.85) size = "It is a small meal, so the effect is mild.";
	else if (scale < 1.25) size = "It is a regular meal, so you feel the effect properly.";
	else if (scale < 1.75) size = "It is a big meal, so the effect is strong.";
	else size = "It is a very big meal, so the effect is very strong.";
	return `${setup.foodFlavourText[foodFlavour(key)]} ${size}`;
}
window.foodEffectText = foodEffectText;

/* How much of a meal one serving is, from what it's worth. */
function foodValueScale(key) {
	const price = Number(setup.foodstuff[key] && setup.foodstuff[key].shop && setup.foodstuff[key].shop.sell_price) || setup.foodValue.reference;
	return Math.clamp(Math.sqrt(price / setup.foodValue.reference), setup.foodValue.min, setup.foodValue.max);
}
window.foodValueScale = foodValueScale;

function foodEffects(key, batch) {
	if (!foodIsDish(key)) return {};
	const datedBatch = batch || foodNextBatch(key);
	if (!foodSpoilageEnabled() && datedBatch && foodBatchExpiryDay(key, datedBatch) <= Time.days) return {};
	const totals = {};
	const apply = row => {
		if (!row) return;
		Object.keys(row).forEach(stat => {
			totals[stat] = (totals[stat] || 0) + row[stat];
		});
	};
	apply(setup.foodEffectsByTag.base);
	apply(setup.foodEffectsByTag[foodFlavour(key)]);
	const scale = foodValueScale(key);
	Object.keys(totals).forEach(stat => {
		const scaled = totals[stat] * scale;
		/* Round away from zero so no food effect disappears.
		Benefits cap at 6, while negative effects keep scaling normally. */
		const rounded = scaled < 0 ? -Math.round(-scaled) : Math.round(scaled);
		totals[stat] = Math.max(-6, rounded);
		if (!totals[stat]) delete totals[stat];
	});
	return totals;
}
window.foodEffects = foodEffects;

/* Which animal a dish feeds, or "" when it's just food. */
function foodTransformation(key) {
	if (!foodIsDish(key)) return "";
	if (setup.foodTransformOverride[key]) return setup.foodTransformOverride[key];
	const scores = {};
	setup.foodstuff[key].recipe.ingredients.forEach(ingredient => {
		const mapped = setup.foodTransformIngredients[ingredient];
		if (mapped) scores[mapped[0]] = (scores[mapped[0]] || 0) + mapped[1];
	});
	let best = "";
	setup.foodTransformPriority.forEach(type => {
		if ((scores[type] || 0) < setup.foodTransformThreshold) return;
		if (!best || scores[type] > scores[best]) best = type;
	});
	return best;
}
window.foodTransformation = foodTransformation;

/* Which batch gets eaten: always the one closest to spoiling. The player never picks. */
function foodNextBatch(key) {
	const batches = foodBatchReconcile(key);
	if (!batches.length) return undefined;
	return batches.reduce((best, batch) => (foodBatchExpiryDay(key, batch) < foodBatchExpiryDay(key, best) ? batch : best), batches[0]);
}
window.foodNextBatch = foodNextBatch;

/* Take one serving out of stock, oldest batch first, and report whether it was there to take */
function foodConsumeServing(key) {
	if (!foodIsDish(key) || foodBatchCount(key) <= 0) return undefined;
	const batch = foodNextBatch(key);
	if (batch) {
		batch.n -= 1;
		if (batch.n <= 0) {
			const batches = foodBatchList(key);
			const at = batches.indexOf(batch);
			if (at !== -1) batches.splice(at, 1);
		}
	}
	V.foodstuff[key].amount = Math.max(0, (Number(V.foodstuff[key].amount) || 0) - 1);
	return batch || {};
}
window.foodConsumeServing = foodConsumeServing;

/* Eat one serving and return the result for the UI */
function pocketEatFood(key, commit = true) {
	if (!pocketAvailable()) return undefined;
	pocketEnsure();
	if (!foodIsDish(key) || foodBatchCount(key) <= 0) return undefined;

	const batch = foodNextBatch(key);
	const own = batch ? batch.own !== false : false;
	const stale = !foodSpoilageEnabled() && batch && foodBatchExpiryDay(key, batch) <= Time.days;
	foodConsumeServing(key);

	const effects = foodEffects(key, batch);
	if (effects.stress) statChange.stress(effects.stress);
	if (effects.trauma) statChange.trauma(effects.trauma);
	if (effects.tiredness) statChange.tiredness(effects.tiredness);
	if (effects.pain) statChange.pain(effects.pain);

	/* The dish's ingredients push you toward that animal.
	Use the widget because <<transform>> also reduces the other transformations.
	Out-of-date food does not count. */
	const transformation = stale ? "" : foodTransformation(key);
	if (transformation && typeof wikifier === "function") wikifier("transform", transformation, 1);

	/* A proper meal restores some willpower. Out-of-date food does not. */
	const willpowerRested = stale ? 0 : typeof willpowerRestMeal === "function" ? willpowerRestMeal(key) : 0;

	/* One serving keeps the PC full for 2–5 hours, based on the food's value. */
	const scale = foodValueScale(key);
	const fullHours = scale < 0.5 ? 2 : scale < 0.85 ? 3 : scale < 1.25 ? 4 : 5;
	const fullness = foodApplyFullness(foodFullnessPoints(key), fullHours);
	if (own) {
		V.homeCookedEaten = (Number(V.homeCookedEaten) || 0) + 1;
		if (V.homeCookedEaten >= 100 && typeof earnFeat === "function") earnFeat("Own Two Hands");
	}

	pocketSyncBag();
	if (commit) pocketCommit();
	return {
		key,
		own,
		stale,
		effects,
		transformation,
		willpowerRested,
		fullness: fullness.fullness,
		becameBloated: fullness.becameBloated,
		bloatedRefreshed: fullness.bloatedRefreshed,
	};
}
window.pocketEatFood = pocketEatFood;

/* Prepare the state carried by the Eat link into its normal passage. */
function pocketEatFoodFromMenu(key) {
	/* Keep the original passage when the player opens the Pocket again from the eating report. */
	const destination = V.passage === "Pocket Eat Food" ? V.pocketFoodReturn : V.passage;
	const result = pocketEatFood(key, false);
	if (!result) return false;
	V.pocketFoodReturn = destination;
	V.pocketFoodResult = result;
	if (typeof closeOverlay === "function") closeOverlay();
	return true;
}
window.pocketEatFoodFromMenu = pocketEatFoodFromMenu;

/* Meal notation follows three readable bands and never floods the passage with signs:
   1-3 points is one sign, 4-6 is two, and 7 or more is three. Food currently tops out at 12. */
function pocketEffectMagnitude(amount) {
	const points = Math.abs(Math.round(Number(amount) || 0));
	if (!points) return 0;
	if (points <= 3) return 1;
	if (points <= 6) return 2;
	return 3;
}
window.pocketEffectMagnitude = pocketEffectMagnitude;

/* Prints a meal's effects in the game's usual stat-change notation. */
DefineMacro("pocketStatArrows", function () {
	const effects = this.args[0];
	if (!effects || typeof statDisplay !== "object") return;
	const rows = [
		["stress", "Stress"],
		["trauma", "Trauma"],
		["pain", "Pain"],
		["tiredness", "Fatigue"],
	];
	rows.forEach(([key, label]) => {
		const amount = Number(effects[key]) || 0;
		if (!amount) return;
		const magnitude = pocketEffectMagnitude(amount) * (amount < 0 ? -1 : 1);
		this.output.append(statDisplay.statChange(label, magnitude, amount < 0 ? "green" : "red"));
	});
});

/* Well Fed and Bloated */
/* Snacks use 2 fullness points, while regular and filling meals use 3. */
function foodFullnessPoints(key) {
	return foodValueScale(key) < 0.85 ? 2 : 3;
}
window.foodFullnessPoints = foodFullnessPoints;

/* Used for cooked and other food, such as cafe meals. Handles satiety and overeating only. */
function foodApplyFullness(points, fullHours) {
	pocketEnsure();
	const wasBloated = bloatedActive();
	V.foodSatiety = Math.max(Number(V.foodSatiety) || 0, 50 + Math.clamp(Math.round(Number(fullHours) || 2), 2, 5) * 2);
	if (wasBloated) {
		V.pocket.bloated = 10;
	} else {
		V.pocket.foodFullness += Math.clamp(Math.round(Number(points) || 2), 1, 3);
		if (V.pocket.foodFullness > 6) V.pocket.bloated = 10;
	}
	return {
		fullness: V.pocket.foodFullness,
		becameBloated: !wasBloated && bloatedActive(),
		bloatedRefreshed: wasBloated,
	};
}
window.foodApplyFullness = foodApplyFullness;

function pocketFoodFullness() {
	return V.pocket && Number.isFinite(V.pocket.foodFullness) ? V.pocket.foodFullness : 0;
}
window.pocketFoodFullness = pocketFoodFullness;

function bloatedActive() {
	if (V.statFreeze) return false;
	return !!(V.pocket && (Number(V.pocket.bloated) || 0) > 0);
}
window.bloatedActive = bloatedActive;

function foodWouldBloat(keyOrPoints) {
	const points = Number.isFinite(keyOrPoints) ? keyOrPoints : foodFullnessPoints(keyOrPoints);
	return !bloatedActive() && pocketFoodFullness() + points > 6;
}
window.foodWouldBloat = foodWouldBloat;

function bloatedSkillPenalty() {
	return bloatedActive() ? 5 : 0;
}
window.bloatedSkillPenalty = bloatedSkillPenalty;

/* A PC who keeps themselves fed weathers things better. */
function wellFedActive() {
	if (V.statFreeze) return false;
	return (Number(V.foodSatiety) || 0) > 50 || bloatedActive();
}
window.wellFedActive = wellFedActive;

/* Multiplier applied to incoming stress, trauma, pain and tiredness. */
function wellFedMod() {
	return wellFedActive() ? 0.95 : 1;
}
window.wellFedMod = wellFedMod;

/* Well Fed and Bloated decrease by one hour whenever an hour passes. */
/* Sweep on entry and at midnight. Journal reports stay available all day and clear the next day. */
function pocketCheckSpoilage() {
	pocketEnsure();
	const spoiled = foodExpirySweep();
	if (spoiled.length) {
		if (!V.daily || typeof V.daily !== "object" || Array.isArray(V.daily)) V.daily = {};
		const store = V.daily.foodSpoiled && typeof V.daily.foodSpoiled === "object" && !Array.isArray(V.daily.foodSpoiled) ? V.daily.foodSpoiled : {};
		spoiled.forEach(entry => {
			store[entry.key] = (Number(store[entry.key]) || 0) + entry.amount;
		});
		V.daily.foodSpoiled = store;
		pocketCommit();
	}
	return spoiled;
}
window.pocketCheckSpoilage = pocketCheckSpoilage;

/* The daily reset clears object values but leaves empty array entries behind.
   Store the notice as dish -> amount so it resets cleanly, and remove the old array format here. */
function pocketSpoiledNotice() {
	const store = V.daily && V.daily.foodSpoiled;
	if (!store || typeof store !== "object") return [];
	if (Array.isArray(store)) {
		return store.filter(entry => entry && foodIsDish(entry.key) && Number(entry.amount) > 0).map(entry => ({ key: entry.key, amount: Number(entry.amount) }));
	}
	return Object.keys(store)
		.filter(key => foodIsDish(key) && Number(store[key]) > 0)
		.map(key => ({ key, amount: Number(store[key]) }));
}
window.pocketSpoiledNotice = pocketSpoiledNotice;

function pocketHourPassed() {
	if (V.statFreeze) return;
	pocketEnsure();
	V.foodSatiety = Math.clamp((Number(V.foodSatiety) || 0) - 2, 0, 60);
	V.pocket.bloated = Math.clamp((Number(V.pocket.bloated) || 0) - 1, 0, 10);
	if (!wellFedActive()) V.pocket.foodFullness = 0;
}
window.pocketHourPassed = pocketHourPassed;

/* Food thrown out overnight is recorded in $daily for the Journal's whole-day notice. */
function pocketDayPassed(days = 1) {
	pocketEnsure();
	window.refrigeratorDayPassed(days);
	/* Batch dates do not update over time.
	With spoilage disabled, old batches stay stored and foodEffects treats them as stale. */
	if (!foodSpoilageEnabled()) return [];
	return pocketCheckSpoilage();
}
window.pocketDayPassed = pocketDayPassed;

/* Upkeep */
/* Clear carried toy flags as soon as the backpack is removed, instead of waiting for the menu to reopen. */
$(document).on(":passageend", () => {
	/* Clear old portable-pill destinations so they do not affect later medicine drawer visits. */
	if (V.pocketPillReturn && V.passage !== "Take Pill From Medicine Drawer" && !String(V.passage || "").startsWith("PillCollection")) {
		delete V.pocketPillReturn;
	}
	if (V.pocketFoodReturn && V.passage !== "Pocket Eat Food") {
		delete V.pocketFoodReturn;
		delete V.pocketFoodResult;
	}
	if (V.dolxBaitEatReturn && V.passage !== "Pocket Eat Bait") {
		delete V.dolxBaitEatReturn;
		delete V.dolxBaitEaten;
		delete V.dolxBaitEatenFromCan;
	}
	if (!V.pocket) return; /* Nothing to keep in step until the PC has opened the menu at least once. */
	if (V.statFreeze || V.frozenValues || V.replayScene || V.hc) return;
	try {
		pocketSyncBag();
	} catch (error) {
		if (typeof Errors === "object" && Errors.report) Errors.report("Pocket bag sync failed: " + error, {});
	}
});
