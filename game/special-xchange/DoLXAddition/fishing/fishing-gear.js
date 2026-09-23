/* DoLX fishing expansion: the can of worms, bait fish, and the rod/reel equipment layer.

   The vanilla Reel / Hold / Slack fight is untouched. Everything here either feeds the numbers
   vanilla already uses (catch weights, size rolls, the values a turn produces) or lives entirely
   beside it (the can, the gear the PC owns). Every tunable value comes from
   setup.fishing.config in fishing-gear-config.js. */

/* globals numberOfFishCaught pocketEnsure pocketSyncBag pocketCommit pocketBagItem pocketBagCapacity pocketSlotIndex pocketLockReason canOpenBaitOverlay wikifier closeOverlay effectiveTransformationLevel */

/* State */
/* Runs on load and before anything reads the gear, so old saves and new ones look the same. */
function fishingEnsure() {
	/* StoryInit builds the config before any save loads, so this only guards against the mod's
	   own config file being absent. Freezing the load path over it would be far worse. */
	if (!setup.fishing || !setup.fishing.config) return V.fishing;
	if (!V.fishing || typeof V.fishing !== "object" || Array.isArray(V.fishing)) V.fishing = {};

	const can = V.fishing.wormCan;
	if (!can || typeof can !== "object" || Array.isArray(can)) {
		V.fishing.wormCan = { owned: false, worms: 0 };
	} else {
		can.owned = can.owned === true;
		can.worms = Math.clamp(Number(can.worms) || 0, 0, wormCanSize());
	}

	const gear = V.fishing.gear;
	if (!gear || typeof gear !== "object" || Array.isArray(gear)) {
		V.fishing.gear = { rod: "black", reel: "black", rods: ["black"], reels: ["black"] };
	} else {
		if (!Array.isArray(gear.rods)) gear.rods = ["black"];
		if (!Array.isArray(gear.reels)) gear.reels = ["black"];
		/* The plain set comes with the rod itself, so it can never be missing. */
		if (!gear.rods.includes("black")) gear.rods.unshift("black");
		if (!gear.reels.includes("black")) gear.reels.unshift("black");
		gear.rods = gear.rods.filter(key => setup.fishing.config.rods[key]);
		gear.reels = gear.reels.filter(key => setup.fishing.config.reels[key]);
		if (!gear.rods.includes(gear.rod)) gear.rod = "black";
		if (!gear.reels.includes(gear.reel)) gear.reel = "black";
	}

	/* The sardine is a fish now, not bait. Give back anything still on the hook from before. */
	if (V.fishing.currentBait === "baitfish") {
		delete V.fishing.currentBait;
		if (V.foodstuff && V.foodstuff.baitfish) V.foodstuff.baitfish.amount = (Number(V.foodstuff.baitfish.amount) || 0) + 1;
	}

	/* New foodstuff keys need a row before anything reads .amount off them. */
	if (V.foodstuff && typeof V.foodstuff === "object") {
		for (const key of baitFishKeys()) {
			if (V.foodstuff[key] === undefined) V.foodstuff[key] = { amount: 0 };
		}
	}
	return V.fishing;
}
window.fishingEnsure = fishingEnsure;

/* The can of worms */
function wormCanSize() {
	return setup.fishing.config.wormCanCapacity;
}
window.wormCanSize = wormCanSize;

function wormCanOwned() {
	return V.fishing?.wormCan?.owned === true;
}
window.wormCanOwned = wormCanOwned;

function wormCanCount() {
	return wormCanOwned() ? Math.clamp(Number(V.fishing.wormCan.worms) || 0, 0, wormCanSize()) : 0;
}
window.wormCanCount = wormCanCount;

/* "Can of Worms | 7/20", or "Empty Can of Worms | 0/20". */
function wormCanName() {
	return wormCanCount() > 0 ? "Can of Worms" : "Empty Can of Worms";
}
window.wormCanName = wormCanName;

function wormCanLabel() {
	return `${wormCanName()} | ${wormCanCount()}/${wormCanSize()}`;
}
window.wormCanLabel = wormCanLabel;

/* Buying the first can gets the tin and a full fill. After that the tin is yours for good. */
function wormCanBuyPrice() {
	return setup.fishing.config.wormCanPrice + setup.fishing.config.wormPrice * wormCanSize();
}
window.wormCanBuyPrice = wormCanBuyPrice;

function wormCanRefillPrice() {
	return setup.fishing.config.wormPrice * (wormCanSize() - wormCanCount());
}
window.wormCanRefillPrice = wormCanRefillPrice;

function wormCanBuy() {
	fishingEnsure();
	V.fishing.wormCan.owned = true;
	V.fishing.wormCan.worms = wormCanSize();
	/* A tin of worms is the point of the pocket, so put it there if there is room. */
	pocketAutoPack("worm_can");
}
window.wormCanBuy = wormCanBuy;

function wormCanRefill() {
	fishingEnsure();
	if (!wormCanOwned()) return;
	V.fishing.wormCan.worms = wormCanSize();
}
window.wormCanRefill = wormCanRefill;

/* Bait stock */
/* Bait worms live in two places: loose ones bought by the pack, and the ones in the can.
   Everywhere that adds or removes a bait goes through these three, so the can drains and
   refills like ordinary stock without vanilla needing to know it exists. */
function baitConfig(key) {
	return key ? setup.fishing.config.bait[key] : undefined;
}
window.baitConfig = baitConfig;

/* Every foodstuff flagged as usable bait fish. Reads the flag, not a list of keys, so adding a
   fifth bait fish is a config change and nothing else. */
function baitFishKeys() {
	return Object.keys(setup.foodstuff).filter(isBaitFishItem);
}
window.baitFishKeys = baitFishKeys;

/* The one test for "this is a small fish you can bait a hook with". Everything else asks this:
   the weight class, the carry rule, the POCKET list, and requiresBaitFish. */
function isBaitFishItem(key) {
	return !!key && setup.foodstuff[key]?.baitFish === true;
}
window.isBaitFishItem = isBaitFishItem;

function baitLooseStock(key) {
	return Math.max(0, Number(V.foodstuff?.[key]?.amount) || 0);
}
window.baitLooseStock = baitLooseStock;

function baitStock(key) {
	if (!key) return 0;
	if (key === "bait_worm") return baitLooseStock(key) + wormCanCount();
	return baitLooseStock(key);
}
window.baitStock = baitStock;

/* The can is only a source of worms while it is actually on you. Loose worms bought by the pack
   are unaffected, so the plain vanilla worm loop never depends on the POCKET. */
function wormCanUsable() {
	return wormCanOwned() && wormCanCount() > 0 && baitPacked("bait_worm");
}
window.wormCanUsable = wormCanUsable;

/* What the PC can actually put on a hook right now, as opposed to what they own. */
function baitUsableStock(key) {
	if (key === "bait_worm") return baitLooseStock(key) + (wormCanUsable() ? wormCanCount() : 0);
	return baitStock(key);
}
window.baitUsableStock = baitUsableStock;

/* Takes one bait off the shelf and onto the hook. Worms come out of the can first, so the can is
   what actually empties while you fish. Returns false when there was nothing to take. */
function baitTake(key) {
	if (!key) return false;
	if (key === "bait_worm" && wormCanUsable()) {
		V.fishing.wormCan.worms -= 1;
		return true;
	}
	if (baitLooseStock(key) > 0) {
		V.foodstuff[key].amount -= 1;
		/* Once a bait fish has been on the hook the player knows what they are for, so the
		   catch text stops explaining it. */
		if (isBaitFishItem(key)) V.fishing.baitFishLearned = true;
		return true;
	}
	return false;
}
window.baitTake = baitTake;

/* Puts an unused bait back. Worms go back in the can when it's on you and has room. */
function baitReturn(key) {
	if (!key) return;
	if (key === "bait_worm" && wormCanUsable() && wormCanCount() < wormCanSize()) {
		V.fishing.wormCan.worms += 1;
		return;
	}
	if (!V.foodstuff) V.foodstuff = {};
	if (!V.foodstuff[key]) V.foodstuff[key] = { amount: 0 };
	V.foodstuff[key].amount = (Number(V.foodstuff[key].amount) || 0) + 1;
}
window.baitReturn = baitReturn;

/* A bait fish is only usable when it is actually in the POCKET. Vanilla food bait is unaffected,
   so nothing the base game lets you hook stops working. */
function baitNeedsPacking(key) {
	return isBaitFishItem(key);
}
window.baitNeedsPacking = baitNeedsPacking;

function baitPacked(key) {
	if (typeof pocketSlotIndex !== "function") return true;
	if (key === "bait_worm") return pocketSlotIndex("bait", "worm_can") !== -1;
	return pocketSlotIndex("bait", key) !== -1;
}
window.baitPacked = baitPacked;

/* Can this bait go on the hook right now? */
function baitUsable(key) {
	if (key === "bait_worm") return baitUsableStock(key) > 0;
	if (baitStock(key) <= 0) return false;
	if (!baitNeedsPacking(key)) return true;
	return baitPacked(key);
}
window.baitUsable = baitUsable;

/* The name and count shown in the bait list, the sidebar tooltip and the tackle summary. */
function baitLabel(key) {
	if (!key) return "No bait";
	if (key === "bait_worm" && wormCanOwned() && baitLooseStock(key) === 0) {
		return `${wormCanName()} (${wormCanCount()} remaining)`;
	}
	const food = setup.foodstuff[key];
	const name = food ? food.name.replace(/_/g, " ").toUpperFirst() : key;
	return `${name} (${baitUsableStock(key)})`;
}
window.baitLabel = baitLabel;

/* Bait worms and the four bait fish first, then everything else the kitchen can spare. */
function baitOrderedKeys() {
	const front = ["bait_worm"].concat(baitFishKeys());
	return front.concat(Object.keys(setup.foodstuff).filter(key => !front.includes(key)));
}
window.baitOrderedKeys = baitOrderedKeys;

/* Catch weighting */
/* Replaces vanilla's per-fish bait weight class when the current bait is one of ours.
   Returns undefined so vanilla keeps its own answer for every bait it already knows. */
function gearBaitWeightMultiplier(fishKey) {
	if (!isBaitFishItem(V.fishing?.currentBait)) return undefined;
	const fishInfo = setup.fishing.lootTables.fish[fishKey];
	if (fishInfo.requiresBaitFish) return 0.75;
	/* Live bait favours large fish, but it must not make the replacement small-fish supply vanish. */
	if (fishInfo.isBaitFish) return 0.7;
	return 0.5;
}
window.gearBaitWeightMultiplier = gearBaitWeightMultiplier;

/* What the bait actually attracts, expressed against the fish's tags rather than its name.
   Multiplied into the roll weight on top of vanilla's location and preferred-bait weights. */
function fishingBaitAffinity(fishKey) {
	const config = baitConfig(V.fishing?.currentBait);
	if (!config || !config.favours) return 1;
	/* Every bait remains viable for the direct small-fish roll. */
	if (setup.fishing.lootTables.fish[fishKey]?.isBaitFish) return 1;
	const tags = setup.fishing.config.fishTags[fishKey];
	if (!tags) return 1;
	let multiplier = 1;
	for (const tag of tags) {
		if (config.favours[tag]) multiplier *= config.favours[tag];
	}
	return multiplier;
}
window.fishingBaitAffinity = fishingBaitAffinity;

/* Small carp and the parents of small catches fill vanilla's old baitfish niche. Worms and each
   equipped bone piece multiply this weight independently, so all three bonuses stack. */
function fishingSmallFishWeight(fishKey) {
	const config = setup.fishing.config;
	const isSmallCatchParent = config.smallCatch[fishKey] !== undefined;
	const isDirectSmallFish = setup.fishing.lootTables.fish[fishKey]?.isBaitFish === true;
	if (!isSmallCatchParent && !isDirectSmallFish) return 1;

	let weight = isSmallCatchParent ? config.smallCatchWeight : 1;
	if (V.fishing?.currentBait === "bait_worm") weight *= config.smallFishBonuses.worm;
	if (fishingRodKey() === "bone") weight *= config.smallFishBonuses.boneRod;
	if (fishingReelKey() === "bone") weight *= config.smallFishBonuses.boneReel;
	return weight;
}
window.fishingSmallFishWeight = fishingSmallFishWeight;

/* Bait that strongly suits a fish also pulls a bigger one, the same way its preferred season
   and location do. Worth one step, never more, so bait tilts the odds without deciding them. */
function fishingBaitSizeBonus(fishKey) {
	return fishingBaitAffinity(fishKey) >= setup.fishing.config.baitSizeBonusAt ? 1 : 0;
}
window.fishingBaitSizeBonus = fishingBaitSizeBonus;

/* Replaces vanilla's bite-event weight for our bait. Undefined leaves vanilla alone. */
function gearCatchWeightBaitMultiplier() {
	const config = baitConfig(V.fishing?.currentBait);
	return config && config.catchWeight !== undefined ? config.catchWeight : undefined;
}
window.gearCatchWeightBaitMultiplier = gearCatchWeightBaitMultiplier;

/* Small catches */
/* The largest a catch can be and still count as a small one. */
function smallCatchThreshold(fishKey) {
	const row = setup.fishing.config.smallCatch[fishKey];
	if (!row) return 0;
	const config = setup.fishing.lootTables.fish[fishKey];
	const fraction = row.fraction ?? setup.fishing.config.smallCatchFraction;
	return config.minSize + (config.maxSize - config.minSize) * fraction;
}
window.smallCatchThreshold = smallCatchThreshold;

/* The foodstuff a catch is worth keeping as: its own species, or the small variant when the
   fish came in under the threshold. */
function fishKeepKey(fish) {
	if (!fish || !fish.type) return undefined;
	const row = setup.fishing.config.smallCatch[fish.type];
	if (!row) return fish.type;
	return fish.size <= smallCatchThreshold(fish.type) ? row.key : fish.type;
}
window.fishKeepKey = fishKeepKey;

/* Whether the catch text should explain what a bait fish is for. Covers both ways of getting
   one -- an undersized bass, and a small carp caught outright -- and stops once the player has
   actually used one. */
function fishBaitHint(fish) {
	if (V.fishing?.baitFishLearned) return "";
	const keep = fishKeepKey(fish);
	if (!isBaitFishItem(keep)) return "";
	return fishNamePlural(keep);
}
window.fishBaitHint = fishBaitHint;

/* Shoaling fish come up more than one at a time. Rolled once, when the fish is hooked, and
   carried on the catch so the text and the stow agree. */
function fishRollShoal(fish) {
	const shoal = setup.fishing.lootTables.fish[fish.type]?.shoal;
	if (!shoal) return fish;
	if (State.random() >= shoal.chance) return fish;
	fish.count = random(shoal.min, shoal.max);
	return fish;
}
window.fishRollShoal = fishRollShoal;

function fishCatchCount(fish) {
	const count = Number(fish?.count);
	return Number.isFinite(count) && count > 1 ? count : 1;
}
window.fishCatchCount = fishCatchCount;

/* The label on the "Stow the ... away" link. */
function fishStowLabel(fish) {
	const keep = fishKeepKey(fish);
	const count = fishCatchCount(fish);
	if (count > 1) {
		return `Stow the ${count} ${fishNamePlural(keep)} away`;
	}
	return `Stow the ${fishDisplayName(keep)} away`;
}
window.fishStowLabel = fishStowLabel;

/* Keeps the catch. A small one goes into the tin as bait; anything else is the fish itself. */
function fishStow(fish, amount) {
	const keep = fishKeepKey(fish);
	if (!keep) return;
	const kept = amount ?? fishCatchCount(fish);
	if (!V.foodstuff) V.foodstuff = {};
	if (!V.foodstuff[keep]) V.foodstuff[keep] = { amount: 0 };
	V.foodstuff[keep].amount = (Number(V.foodstuff[keep].amount) || 0) + kept;
	/* Bait is no use in the cupboard at home, so put it where it can reach the hook. */
	if (baitNeedsPacking(keep)) pocketAutoPack(keep);
}
window.fishStow = fishStow;

/* Rods and reels */
function fishingRodKey() {
	fishingEnsure();
	return V.fishing.gear.rod;
}
window.fishingRodKey = fishingRodKey;

function fishingReelKey() {
	fishingEnsure();
	return V.fishing.gear.reel;
}
window.fishingReelKey = fishingReelKey;

function fishingRod() {
	return setup.fishing.config.rods[fishingRodKey()] ?? setup.fishing.config.rods.black;
}
window.fishingRod = fishingRod;

function fishingReel() {
	return setup.fishing.config.reels[fishingReelKey()] ?? setup.fishing.config.reels.black;
}
window.fishingReel = fishingReel;

function fishingGearOwned(kind, key) {
	fishingEnsure();
	return V.fishing.gear[kind === "rod" ? "rods" : "reels"].includes(key);
}
window.fishingGearOwned = fishingGearOwned;

function fishingGearGive(kind, key) {
	fishingEnsure();
	const list = V.fishing.gear[kind === "rod" ? "rods" : "reels"];
	if (!list.includes(key)) list.push(key);
}
window.fishingGearGive = fishingGearGive;

function fishingGearEquip(kind, key) {
	fishingEnsure();
	if (!fishingGearOwned(kind, key)) return false;
	V.fishing.gear[kind === "rod" ? "rod" : "reel"] = key;
	return true;
}
window.fishingGearEquip = fishingGearEquip;

/* Gear listed in the order it is meant to be worked through. */
function fishingGearList(kind) {
	const table = kind === "rod" ? setup.fishing.config.rods : setup.fishing.config.reels;
	return Object.entries(table)
		.sort((a, b) => a[1].order - b[1].order)
		.map(([key, config]) => ({ key, config }));
}
window.fishingGearList = fishingGearList;

/* The shop only puts a piece out once the PC has done enough fishing to want it. */
function fishingGearUnlocked(config) {
	const unlock = config.unlock;
	if (!unlock) return true;
	if (unlock.fishCaught !== undefined && numberOfFishCaught() < unlock.fishCaught) return false;
	if (unlock.requestsCompleted !== undefined && (Number(V.fishing?.baitShopRequestsCompleted) || 0) < unlock.requestsCompleted) return false;
	return true;
}
window.fishingGearUnlocked = fishingGearUnlocked;

/* The bone set */
/* Not stocked anywhere. It comes up on the line in the quiet places, once the PC has fished
   enough to recognise what they have pulled out. */
function boneFindPiece() {
	fishingEnsure();
	if (!fishingGearOwned("rod", "bone")) return "rod";
	if (!fishingGearOwned("reel", "bone")) return "reel";
	return undefined;
}
window.boneFindPiece = boneFindPiece;

function boneFindWeight() {
	const find = setup.fishing.config.boneFind;
	if (!find.locations.includes(V.bus)) return 0;
	if (!boneFindPiece()) return 0;
	if (numberOfFishCaught() < find.minFishCaught) return 0;
	/* The water only gives it up in the dark, or under a blood moon. */
	if (Weather.dayState !== "night" && !Time.isBloodMoon()) return 0;
	return find.eventWeight;
}
window.boneFindWeight = boneFindWeight;

/* Whether the record holds at least one of every small fish */
function smallFishRecordComplete() {
	const keys = baitFishKeys();
	if (!keys.length) return false;
	return keys.every(key => V.fishing?.record?.[key]?.numCaught > 0);
}
window.smallFishRecordComplete = smallFishRecordComplete;

/* Both halves of the bone tackle, found rather than bought. */
function boneSetOwned() {
	return fishingGearOwned("rod", "bone") && fishingGearOwned("reel", "bone");
}
window.boneSetOwned = boneSetOwned;

function boneFindTake() {
	const piece = boneFindPiece();
	if (!piece) return undefined;
	fishingGearGive(piece, "bone");
	return piece;
}
window.boneFindTake = boneFindTake;

/* Minigame modifiers */
/* Fractional gear effects are resolved by chance rather than accumulated, so a 20% better reel
   is 20% better on average and the turn still moves the fish a whole number of lengths. */
function fishingRoundRandom(value) {
	if (!Number.isFinite(value)) return 0;
	const whole = Math.floor(value);
	return whole + (State.random() < value - whole ? 1 : 0);
}
window.fishingRoundRandom = fishingRoundRandom;

/* Applied to the turn's result before vanilla writes it into the minigame state.
   Reel and Hold and Slack still do what they did; the gear only changes by how much. */
function fishingGearApplyResult(result, playerAction) {
	if (!result) return result;
	const rod = fishingRod();
	const reel = fishingReel();

	/* Ground the reel takes back. */
	if (playerAction === "reel" && result.fishDistance < 0) {
		result.fishDistance = -fishingRoundRandom(-result.fishDistance * (reel.reelMult ?? 1));
	}
	/* Ground given away while the line is slack. A good drag holds some of it. */
	if (playerAction === "slack" && result.fishDistance > 0) {
		result.fishDistance = fishingRoundRandom(result.fishDistance * (reel.slackMult ?? 1));
	}
	/* How hard the fish works against the rod. */
	if (result.fishStamina < 0) {
		result.fishStamina = -fishingRoundRandom(-result.fishStamina * (rod.exhaustMult ?? 1));
	}
	/* A rod with backbone tires a fish just by being held against it. */
	if (playerAction === "hold" && (rod.holdBonus ?? 0) > 0 && State.random() < rod.holdBonus) {
		result.fishStamina = (result.fishStamina || 0) - 1;
	}
	/* Everything the fight puts through your arms. */
	if (result.armFatigue > 0) {
		result.armFatigue = fishingRoundRandom(result.armFatigue * (rod.tensionMult ?? 1));
	}
	return result;
}
window.fishingGearApplyResult = fishingGearApplyResult;

/* How fast the line-tension clock runs down. Below 1 is a more forgiving rod. */
function fishingTensionMult() {
	return fishingRod().tensionMult ?? 1;
}
window.fishingTensionMult = fishingTensionMult;

/* What a Reel that misses costs on top of the ordinary failure. Only the bone reel charges it. */
function fishingMisreelPenalty(playerAction) {
	if (playerAction !== "reel") return 0;
	return fishingReel().misreelPenalty ?? 0;
}
window.fishingMisreelPenalty = fishingMisreelPenalty;

/* POCKET */
/* Bait packs like everything else: one slot per kind of thing, however many of it you carry.
   The can is one slot whatever is in it, and stays a slot when it's empty, because an empty
   tin is still a tin you can refill. */
function pocketBaitKeys() {
	return ["worm_can"].concat(baitFishKeys());
}
window.pocketBaitKeys = pocketBaitKeys;

function pocketBaitValid(key) {
	if (key === "worm_can") return wormCanOwned();
	return isBaitFishItem(key) && baitLooseStock(key) > 0;
}
window.pocketBaitValid = pocketBaitValid;

function pocketBaitName(key) {
	if (key === "worm_can") return wormCanName();
	const food = setup.foodstuff[key];
	return food ? food.name.toLocaleUpperFirst() : key;
}
window.pocketBaitName = pocketBaitName;

function pocketBaitIconPath(key) {
	if (key === "worm_can") return "fish/mod/wormcan.png";
	return setup.foodstuff[key]?.icon_path ?? "fish/hook.png";
}
window.pocketBaitIconPath = pocketBaitIconPath;

/* The line under a packed bait: how much is in it, and what it's for. */
function pocketBaitDetail(key) {
	if (key === "worm_can") return `${wormCanCount()}/${wormCanSize()}`;
	return String(baitLooseStock(key));
}
window.pocketBaitDetail = pocketBaitDetail;

/* Put a new bait item straight into the pocket when there's room, so buying a can or landing a
   bait fish doesn't quietly leave it behind. Never bumps anything already packed. */
function pocketAutoPack(key) {
	if (typeof pocketEnsure !== "function" || typeof pocketLockReason !== "function") return false;
	if (!pocketReachable()) return false;
	pocketEnsure();
	pocketSyncBag();
	if (pocketSlotIndex("bait", key) !== -1) return true;
	if (!pocketBaitValid(key)) return false;

	let location = "pocket";
	if (V.pocket.bag.slots.some(slot => slot.location === "pocket")) {
		if (!pocketBagItem()) return false;
		if (V.pocket.bag.slots.filter(slot => slot.location === "bag").length >= pocketBagCapacity()) return false;
		location = "bag";
	}
	V.pocket.bag.slots.push({ kind: "bait", key, location });
	pocketCommit();
	return true;
}
window.pocketAutoPack = pocketAutoPack;

/* Bait is bought and landed at counters and riverbanks where an NPC often sits in the scene, so
   the bait panel uses the relaxed gate: it still refuses when the PC genuinely can't reach their
   things, but a shopkeeper standing there is not a reason to keep you out of your own bag. */
function pocketReachable() {
	if (typeof pocketLockReason !== "function") return false;
	return pocketLockReason(true) === "";
}
window.pocketReachable = pocketReachable;

/* Packs or unpacks one bait kind. Mirrors pocketSlotToggle, on the relaxed gate. */
function pocketBaitToggle(key) {
	if (!pocketReachable()) return false;
	pocketEnsure();
	pocketSyncBag();
	const existing = pocketSlotIndex("bait", key);
	if (existing !== -1) {
		V.pocket.bag.slots.splice(existing, 1);
		pocketCommit();
		return true;
	}
	return pocketAutoPack(key);
}
window.pocketBaitToggle = pocketBaitToggle;

/* Everything the PC could pack right now, for the packing panel. */
function pocketBaitList() {
	return pocketBaitKeys().filter(key => pocketBaitValid(key));
}
window.pocketBaitList = pocketBaitList;

/* Shop and UI helpers */
/* Prices go through the X-Change inflation hook so the label matches the charge. */
function fishingPrice(base) {
	return typeof setup !== "undefined" && setup.inflation ? setup.inflation.spendPrice(base, "fishing") : base;
}
window.fishingPrice = fishingPrice;

function fishingAfford(base) {
	if (typeof setup !== "undefined" && setup.inflation) return setup.inflation.canAfford(base, "fishing");
	return V.money >= base;
}
window.fishingAfford = fishingAfford;

/* Opens the bait overlay on its Tackle tab. */
function openFishingTackle() {
	if (!canOpenBaitOverlay()) return;
	V.fishing.displayBaitNotification = false;
	wikifier("overlayReplace", '"tackle"');
}
window.openFishingTackle = openFishingTackle;

/* The passage a fishing spot's wait loop returns to. */
function fishingWaitPassage(bus) {
	switch (bus) {
		case "fishingBeach":
			return "Fishing Beach Wait";
		case "fishingPier":
			return "Fishing Pier Wait";
		case "fishingCoastPath":
			return "Fishing Coast Path Wait";
		case "fishingForestLake":
			return "Fishing Forest Lake Wait";
		case "fishingMoor":
			return "Fishing Moor Wait";
		default:
			throw new Error(`fishingWaitPassage: unknown bus "${bus}"`);
	}
}
window.fishingWaitPassage = fishingWaitPassage;

/* Debug */
/* Hands over every rod and reel and a full can, for testing the fight modifiers side by side. */
function debugUnlockAllFishingGear() {
	fishingEnsure();
	for (const key of Object.keys(setup.fishing.config.rods)) fishingGearGive("rod", key);
	for (const key of Object.keys(setup.fishing.config.reels)) fishingGearGive("reel", key);
	V.fishing.wormCan.owned = true;
	V.fishing.wormCan.worms = wormCanSize();
	for (const key of baitFishKeys()) {
		if (!V.foodstuff[key]) V.foodstuff[key] = { amount: 0 };
		V.foodstuff[key].amount += 10;
	}
	pocketAutoPack("worm_can");
}
window.debugUnlockAllFishingGear = debugUnlockAllFishingGear;

/* Eating a fish whole */
/* The animal transformations far enough along to swallow a fish, strongest build last so the
   caller can just take the highest. */
function fishEatingTfs() {
	const names = setup.fishing?.config?.fishEatingTransformations || [];
	return names.filter(name => effectiveTransformationLevel(name) >= 3);
}
window.fishEatingTfs = fishEatingTfs;

/* A bait fish is small by definition, so the size test a hooked fish gets is already satisfied. */
function canEatBaitFish(key) {
	return isBaitFishItem(key) && baitLooseStock(key) > 0 && fishEatingTfs().length > 0;
}
window.canEatBaitFish = canEatBaitFish;

/* Worms need no transformation. Anyone can swallow one; almost nobody enjoys it */
function canEatWorm() {
	return (wormCanOwned() && wormCanCount() > 0) || baitLooseStock("bait_worm") > 0;
}
window.canEatWorm = canEatWorm;

/* Takes one bait out of the bag to eat. The stat effects belong to the passage, the way they do
   when a fish is eaten off the hook. Returns false when there was nothing to take. */
function eatBait(key, commit = true) {
	if (key === "bait_worm") {
		if (!canEatWorm()) return false;
		/* The can empties first, the same order the hook takes them in */
		if (wormCanOwned() && wormCanCount() > 0) {
			V.fishing.wormCan.worms -= 1;
			V.dolxBaitEatenFromCan = true;
		} else {
			V.foodstuff.bait_worm.amount -= 1;
			V.dolxBaitEatenFromCan = false;
		}
	} else {
		if (!canEatBaitFish(key)) return false;
		V.foodstuff[key].amount -= 1;
	}
	/* The can stays in the bag when it empties; a fish leaves once the last one is gone. */
	pocketSyncBag();
	if (commit) pocketCommit();
	return true;
}
window.eatBait = eatBait;

/* Prepare the state the Eat link carries into its passage, the same way the POCKET's food does. */
function pocketEatBaitFromMenu(key) {
	/* Keep the original passage when the player opens the bag again from the eating report. */
	const destination = V.passage === "Pocket Eat Bait" ? V.dolxBaitEatReturn : V.passage;
	if (!eatBait(key, false)) return false;
	V.dolxBaitEatReturn = destination;
	V.dolxBaitEaten = key;
	if (typeof closeOverlay === "function") closeOverlay();
	return true;
}
window.pocketEatBaitFromMenu = pocketEatBaitFromMenu;

/* The journal */
/* The species an undersized catch comes from, or undefined for a bait fish that is caught
   outright. The small carp is the only one of those. */
function smallCatchParent(baitKey) {
	return Object.keys(setup.fishing.config.smallCatch).find(parent => setup.fishing.config.smallCatch[parent].key === baitKey);
}
window.smallCatchParent = smallCatchParent;

/* Every fish that has a record of its own, bait fish included. */
function journalAllFishKeys() {
	const keys = Object.keys(setup.fishing.lootTables.fish);
	return keys.concat(baitFishKeys().filter(key => !keys.includes(key)));
}
window.journalAllFishKeys = journalAllFishKeys;

/* An undersized catch turns up wherever its parent does; everything else reads its own table.
   No location means "anywhere", which is what the records list wants. */
function fishAtLocation(fishKey, location) {
	if (!location) return true;
	const fish = setup.fishing.lootTables.fish;
	const key = fish[fishKey] ? fishKey : smallCatchParent(fishKey);
	return !!key && (fish[key]?.locations?.[location] || 0) > 0;
}
window.fishAtLocation = fishAtLocation;

/* The journal lists bait fish apart from the fish they are used to catch. Passing a location
   narrows either list to what can be caught there. */
function journalFishKeys(location) {
	return journalAllFishKeys().filter(key => !isBaitFishItem(key) && fishAtLocation(key, location));
}
window.journalFishKeys = journalFishKeys;

function journalBaitFishKeys(location) {
	return baitFishKeys().filter(key => fishAtLocation(key, location));
}
window.journalBaitFishKeys = journalBaitFishKeys;

/* Icon and size range for a record entry. A bait fish with no loot table of its own borrows its
   parent's floor and tops out at the threshold that made it small in the first place, so the
   biggest-possible star still means something. */
function fishRecordConfig(fishKey) {
	const config = setup.fishing.lootTables.fish[fishKey];
	if (config) return config;
	const parent = smallCatchParent(fishKey);
	const parentConfig = setup.fishing.lootTables.fish[parent];
	return {
		minSize: parentConfig ? parentConfig.minSize : 0,
		maxSize: parent ? smallCatchThreshold(parent) : 0,
		icon: setup.foodstuff[fishKey] ? setup.foodstuff[fishKey].icon_path : undefined,
	};
}
window.fishRecordConfig = fishRecordConfig;

/* Names */
/* Vanilla prints a fish's loot-table key as its name, which works only while the two are the
   same word. The sardine keeps the key `baitfish` for compatibility with vanilla and with future
   fishing updates, so every player-facing print goes through here instead. */
function fishDisplayName(fishKey) {
	return setup.foodstuff[fishKey]?.name?.replace(/_/g, " ") ?? fishKey;
}
window.fishDisplayName = fishDisplayName;

function fishNamePlural(fishKey) {
	return setup.foodstuff[fishKey]?.plural?.replace(/_/g, " ") ?? fishDisplayName(fishKey);
}
window.fishNamePlural = fishNamePlural;
