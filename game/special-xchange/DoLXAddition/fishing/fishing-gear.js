/* DoLX fishing expansion: the can of worms, bait fish, and the rod/reel equipment layer.

   The vanilla Reel / Hold / Slack fight is untouched. Everything here either feeds the numbers
   vanilla already uses (catch weights, size rolls, the values a turn produces) or lives entirely
   beside it (the can, the gear the PC owns). Every tunable value comes from
   setup.fishing.dolx in fishing-gear-config.js. */

/* globals numberOfFishCaught pocketEnsure pocketSyncBag pocketCommit pocketBagItem pocketBagCapacity pocketSlotIndex pocketLockReason canOpenBaitOverlay wikifier closeOverlay effectiveTransformationLevel */

/* State */
/* Runs on load and before anything reads the gear, so old saves and new ones look the same. */
function dolxFishingEnsure() {
	/* StoryInit builds the config before any save loads, so this only guards against the mod's
	   own config file being absent. Freezing the load path over it would be far worse. */
	if (!setup.fishing || !setup.fishing.dolx) return V.fishing;
	if (!V.fishing || typeof V.fishing !== "object" || Array.isArray(V.fishing)) V.fishing = {};

	const can = V.fishing.wormCan;
	if (!can || typeof can !== "object" || Array.isArray(can)) {
		V.fishing.wormCan = { owned: false, worms: 0 };
	} else {
		can.owned = can.owned === true;
		can.worms = Math.clamp(Number(can.worms) || 0, 0, dolxWormCanCapacity());
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
		gear.rods = gear.rods.filter(key => setup.fishing.dolx.rods[key]);
		gear.reels = gear.reels.filter(key => setup.fishing.dolx.reels[key]);
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
		for (const key of dolxBaitFishKeys()) {
			if (V.foodstuff[key] === undefined) V.foodstuff[key] = { amount: 0 };
		}
	}
	return V.fishing;
}
window.dolxFishingEnsure = dolxFishingEnsure;

/* The can of worms */
function dolxWormCanCapacity() {
	return setup.fishing.dolx.wormCanCapacity;
}
window.dolxWormCanCapacity = dolxWormCanCapacity;

function dolxWormCanOwned() {
	return V.fishing?.wormCan?.owned === true;
}
window.dolxWormCanOwned = dolxWormCanOwned;

function dolxWormCanCount() {
	return dolxWormCanOwned() ? Math.clamp(Number(V.fishing.wormCan.worms) || 0, 0, dolxWormCanCapacity()) : 0;
}
window.dolxWormCanCount = dolxWormCanCount;

/* "Can of Worms | 7/20", or "Empty Can of Worms | 0/20". */
function dolxWormCanName() {
	return dolxWormCanCount() > 0 ? "Can of Worms" : "Empty Can of Worms";
}
window.dolxWormCanName = dolxWormCanName;

function dolxWormCanLabel() {
	return `${dolxWormCanName()} | ${dolxWormCanCount()}/${dolxWormCanCapacity()}`;
}
window.dolxWormCanLabel = dolxWormCanLabel;

/* Buying the first can gets the tin and a full fill. After that the tin is yours for good. */
function dolxWormCanBuyPrice() {
	return setup.fishing.dolx.wormCanPrice + setup.fishing.dolx.wormPrice * dolxWormCanCapacity();
}
window.dolxWormCanBuyPrice = dolxWormCanBuyPrice;

function dolxWormCanRefillPrice() {
	return setup.fishing.dolx.wormPrice * (dolxWormCanCapacity() - dolxWormCanCount());
}
window.dolxWormCanRefillPrice = dolxWormCanRefillPrice;

function dolxWormCanBuy() {
	dolxFishingEnsure();
	V.fishing.wormCan.owned = true;
	V.fishing.wormCan.worms = dolxWormCanCapacity();
	/* A tin of worms is the point of the pocket, so put it there if there is room. */
	dolxPocketAutoPack("worm_can");
}
window.dolxWormCanBuy = dolxWormCanBuy;

function dolxWormCanRefill() {
	dolxFishingEnsure();
	if (!dolxWormCanOwned()) return;
	V.fishing.wormCan.worms = dolxWormCanCapacity();
}
window.dolxWormCanRefill = dolxWormCanRefill;

/* Bait stock */
/* Bait worms live in two places: loose ones bought by the pack, and the ones in the can.
   Everywhere that adds or removes a bait goes through these three, so the can drains and
   refills like ordinary stock without vanilla needing to know it exists. */
function dolxBaitConfig(key) {
	return key ? setup.fishing.dolx.bait[key] : undefined;
}
window.dolxBaitConfig = dolxBaitConfig;

/* Every foodstuff flagged as usable bait fish. Reads the flag, not a list of keys, so adding a
   fifth bait fish is a config change and nothing else. */
function dolxBaitFishKeys() {
	return Object.keys(setup.foodstuff).filter(dolxIsBaitFishItem);
}
window.dolxBaitFishKeys = dolxBaitFishKeys;

/* The one test for "this is a small fish you can bait a hook with". Everything else asks this:
   the weight class, the carry rule, the POCKET list, and requiresBaitFish. */
function dolxIsBaitFishItem(key) {
	return !!key && setup.foodstuff[key]?.baitFish === true;
}
window.dolxIsBaitFishItem = dolxIsBaitFishItem;

function dolxBaitLooseStock(key) {
	return Math.max(0, Number(V.foodstuff?.[key]?.amount) || 0);
}
window.dolxBaitLooseStock = dolxBaitLooseStock;

function dolxBaitStock(key) {
	if (!key) return 0;
	if (key === "bait_worm") return dolxBaitLooseStock(key) + dolxWormCanCount();
	return dolxBaitLooseStock(key);
}
window.dolxBaitStock = dolxBaitStock;

/* The can is only a source of worms while it is actually on you. Loose worms bought by the pack
   are unaffected, so the plain vanilla worm loop never depends on the POCKET. */
function dolxWormCanUsable() {
	return dolxWormCanOwned() && dolxWormCanCount() > 0 && dolxBaitPacked("bait_worm");
}
window.dolxWormCanUsable = dolxWormCanUsable;

/* What the PC can actually put on a hook right now, as opposed to what they own. */
function dolxBaitUsableStock(key) {
	if (key === "bait_worm") return dolxBaitLooseStock(key) + (dolxWormCanUsable() ? dolxWormCanCount() : 0);
	return dolxBaitStock(key);
}
window.dolxBaitUsableStock = dolxBaitUsableStock;

/* Takes one bait off the shelf and onto the hook. Worms come out of the can first, so the can is
   what actually empties while you fish. Returns false when there was nothing to take. */
function dolxBaitTake(key) {
	if (!key) return false;
	if (key === "bait_worm" && dolxWormCanUsable()) {
		V.fishing.wormCan.worms -= 1;
		return true;
	}
	if (dolxBaitLooseStock(key) > 0) {
		V.foodstuff[key].amount -= 1;
		/* Once a bait fish has been on the hook the player knows what they are for, so the
		   catch text stops explaining it. */
		if (dolxIsBaitFishItem(key)) V.fishing.baitFishLearned = true;
		return true;
	}
	return false;
}
window.dolxBaitTake = dolxBaitTake;

/* Puts an unused bait back. Worms go back in the can when it's on you and has room. */
function dolxBaitReturn(key) {
	if (!key) return;
	if (key === "bait_worm" && dolxWormCanUsable() && dolxWormCanCount() < dolxWormCanCapacity()) {
		V.fishing.wormCan.worms += 1;
		return;
	}
	if (!V.foodstuff) V.foodstuff = {};
	if (!V.foodstuff[key]) V.foodstuff[key] = { amount: 0 };
	V.foodstuff[key].amount = (Number(V.foodstuff[key].amount) || 0) + 1;
}
window.dolxBaitReturn = dolxBaitReturn;

/* A bait fish is only usable when it is actually in the POCKET. Vanilla food bait is unaffected,
   so nothing the base game lets you hook stops working. */
function dolxBaitNeedsPacking(key) {
	return dolxIsBaitFishItem(key);
}
window.dolxBaitNeedsPacking = dolxBaitNeedsPacking;

function dolxBaitPacked(key) {
	if (typeof pocketSlotIndex !== "function") return true;
	if (key === "bait_worm") return pocketSlotIndex("bait", "worm_can") !== -1;
	return pocketSlotIndex("bait", key) !== -1;
}
window.dolxBaitPacked = dolxBaitPacked;

/* Can this bait go on the hook right now? */
function dolxBaitUsable(key) {
	if (key === "bait_worm") return dolxBaitUsableStock(key) > 0;
	if (dolxBaitStock(key) <= 0) return false;
	if (!dolxBaitNeedsPacking(key)) return true;
	return dolxBaitPacked(key);
}
window.dolxBaitUsable = dolxBaitUsable;

/* The name and count shown in the bait list, the sidebar tooltip and the tackle summary. */
function dolxBaitLabel(key) {
	if (!key) return "No bait";
	if (key === "bait_worm" && dolxWormCanOwned() && dolxBaitLooseStock(key) === 0) {
		return `${dolxWormCanName()} (${dolxWormCanCount()} remaining)`;
	}
	const food = setup.foodstuff[key];
	const name = food ? food.name.replace(/_/g, " ").toUpperFirst() : key;
	return `${name} (${dolxBaitUsableStock(key)})`;
}
window.dolxBaitLabel = dolxBaitLabel;

/* Bait worms and the four bait fish first, then everything else the kitchen can spare. */
function dolxBaitOrderedKeys() {
	const front = ["bait_worm"].concat(dolxBaitFishKeys());
	return front.concat(Object.keys(setup.foodstuff).filter(key => !front.includes(key)));
}
window.dolxBaitOrderedKeys = dolxBaitOrderedKeys;

/* Catch weighting */
/* Replaces vanilla's per-fish bait weight class when the current bait is one of ours.
   Returns undefined so vanilla keeps its own answer for every bait it already knows. */
function dolxFishingBaitWeightMultiplier(fishKey) {
	if (!dolxIsBaitFishItem(V.fishing?.currentBait)) return undefined;
	const fishInfo = setup.fishing.lootTables.fish[fishKey];
	if (fishInfo.requiresBaitFish) return 0.75;
	/* Live bait favours large fish, but it must not make the replacement small-fish supply vanish. */
	if (fishInfo.isBaitFish) return 0.7;
	return 0.5;
}
window.dolxFishingBaitWeightMultiplier = dolxFishingBaitWeightMultiplier;

/* What the bait actually attracts, expressed against the fish's tags rather than its name.
   Multiplied into the roll weight on top of vanilla's location and preferred-bait weights. */
function dolxFishingBaitAffinity(fishKey) {
	const config = dolxBaitConfig(V.fishing?.currentBait);
	if (!config || !config.favours) return 1;
	/* Every bait remains viable for the direct small-fish roll. */
	if (setup.fishing.lootTables.fish[fishKey]?.isBaitFish) return 1;
	const tags = setup.fishing.dolx.fishTags[fishKey];
	if (!tags) return 1;
	let multiplier = 1;
	for (const tag of tags) {
		if (config.favours[tag]) multiplier *= config.favours[tag];
	}
	return multiplier;
}
window.dolxFishingBaitAffinity = dolxFishingBaitAffinity;

/* Small carp and the parents of small catches fill vanilla's old baitfish niche. Worms and each
   equipped bone piece multiply this weight independently, so all three bonuses stack. */
function dolxFishingSmallFishWeight(fishKey) {
	const dolx = setup.fishing.dolx;
	const isSmallCatchParent = dolx.smallCatch[fishKey] !== undefined;
	const isDirectSmallFish = setup.fishing.lootTables.fish[fishKey]?.isBaitFish === true;
	if (!isSmallCatchParent && !isDirectSmallFish) return 1;

	let weight = isSmallCatchParent ? dolx.smallCatchWeight : 1;
	if (V.fishing?.currentBait === "bait_worm") weight *= dolx.smallFishBonuses.worm;
	if (dolxFishingRodKey() === "bone") weight *= dolx.smallFishBonuses.boneRod;
	if (dolxFishingReelKey() === "bone") weight *= dolx.smallFishBonuses.boneReel;
	return weight;
}
window.dolxFishingSmallFishWeight = dolxFishingSmallFishWeight;

/* Bait that strongly suits a fish also pulls a bigger one, the same way its preferred season
   and location do. Worth one step, never more, so bait tilts the odds without deciding them. */
function dolxFishingBaitSizeBonus(fishKey) {
	return dolxFishingBaitAffinity(fishKey) >= setup.fishing.dolx.baitSizeBonusAt ? 1 : 0;
}
window.dolxFishingBaitSizeBonus = dolxFishingBaitSizeBonus;

/* Replaces vanilla's bite-event weight for our bait. Undefined leaves vanilla alone. */
function dolxFishingCatchWeightBaitMultiplier() {
	const config = dolxBaitConfig(V.fishing?.currentBait);
	return config && config.catchWeight !== undefined ? config.catchWeight : undefined;
}
window.dolxFishingCatchWeightBaitMultiplier = dolxFishingCatchWeightBaitMultiplier;

/* Small catches */
/* The largest a catch can be and still count as a small one. */
function dolxSmallCatchThreshold(fishKey) {
	const row = setup.fishing.dolx.smallCatch[fishKey];
	if (!row) return 0;
	const config = setup.fishing.lootTables.fish[fishKey];
	const fraction = row.fraction ?? setup.fishing.dolx.smallCatchFraction;
	return config.minSize + (config.maxSize - config.minSize) * fraction;
}
window.dolxSmallCatchThreshold = dolxSmallCatchThreshold;

/* The foodstuff a catch is worth keeping as: its own species, or the small variant when the
   fish came in under the threshold. */
function dolxFishKeepKey(fish) {
	if (!fish || !fish.type) return undefined;
	const row = setup.fishing.dolx.smallCatch[fish.type];
	if (!row) return fish.type;
	return fish.size <= dolxSmallCatchThreshold(fish.type) ? row.key : fish.type;
}
window.dolxFishKeepKey = dolxFishKeepKey;

/* Whether the catch text should explain what a bait fish is for. Covers both ways of getting
   one -- an undersized bass, and a small carp caught outright -- and stops once the player has
   actually used one. */
function dolxFishBaitHint(fish) {
	if (V.fishing?.baitFishLearned) return "";
	const keep = dolxFishKeepKey(fish);
	if (!dolxIsBaitFishItem(keep)) return "";
	return dolxFishNamePlural(keep);
}
window.dolxFishBaitHint = dolxFishBaitHint;

/* Shoaling fish come up more than one at a time. Rolled once, when the fish is hooked, and
   carried on the catch so the text and the stow agree. */
function dolxFishRollShoal(fish) {
	const shoal = setup.fishing.lootTables.fish[fish.type]?.shoal;
	if (!shoal) return fish;
	if (State.random() >= shoal.chance) return fish;
	fish.count = random(shoal.min, shoal.max);
	return fish;
}
window.dolxFishRollShoal = dolxFishRollShoal;

function dolxFishCatchCount(fish) {
	const count = Number(fish?.count);
	return Number.isFinite(count) && count > 1 ? count : 1;
}
window.dolxFishCatchCount = dolxFishCatchCount;

/* The label on the "Stow the ... away" link. */
function dolxFishStowLabel(fish) {
	const keep = dolxFishKeepKey(fish);
	const count = dolxFishCatchCount(fish);
	if (count > 1) {
		return `Stow the ${count} ${dolxFishNamePlural(keep)} away`;
	}
	return `Stow the ${dolxFishName(keep)} away`;
}
window.dolxFishStowLabel = dolxFishStowLabel;

/* Keeps the catch. A small one goes into the tin as bait; anything else is the fish itself. */
function dolxFishStow(fish, amount) {
	const keep = dolxFishKeepKey(fish);
	if (!keep) return;
	const kept = amount ?? dolxFishCatchCount(fish);
	if (!V.foodstuff) V.foodstuff = {};
	if (!V.foodstuff[keep]) V.foodstuff[keep] = { amount: 0 };
	V.foodstuff[keep].amount = (Number(V.foodstuff[keep].amount) || 0) + kept;
	/* Bait is no use in the cupboard at home, so put it where it can reach the hook. */
	if (dolxBaitNeedsPacking(keep)) dolxPocketAutoPack(keep);
}
window.dolxFishStow = dolxFishStow;

/* Rods and reels */
function dolxFishingRodKey() {
	dolxFishingEnsure();
	return V.fishing.gear.rod;
}
window.dolxFishingRodKey = dolxFishingRodKey;

function dolxFishingReelKey() {
	dolxFishingEnsure();
	return V.fishing.gear.reel;
}
window.dolxFishingReelKey = dolxFishingReelKey;

function dolxFishingRod() {
	return setup.fishing.dolx.rods[dolxFishingRodKey()] ?? setup.fishing.dolx.rods.black;
}
window.dolxFishingRod = dolxFishingRod;

function dolxFishingReel() {
	return setup.fishing.dolx.reels[dolxFishingReelKey()] ?? setup.fishing.dolx.reels.black;
}
window.dolxFishingReel = dolxFishingReel;

function dolxFishingGearOwned(kind, key) {
	dolxFishingEnsure();
	return V.fishing.gear[kind === "rod" ? "rods" : "reels"].includes(key);
}
window.dolxFishingGearOwned = dolxFishingGearOwned;

function dolxFishingGearGive(kind, key) {
	dolxFishingEnsure();
	const list = V.fishing.gear[kind === "rod" ? "rods" : "reels"];
	if (!list.includes(key)) list.push(key);
}
window.dolxFishingGearGive = dolxFishingGearGive;

function dolxFishingGearEquip(kind, key) {
	dolxFishingEnsure();
	if (!dolxFishingGearOwned(kind, key)) return false;
	V.fishing.gear[kind === "rod" ? "rod" : "reel"] = key;
	return true;
}
window.dolxFishingGearEquip = dolxFishingGearEquip;

/* Gear listed in the order it is meant to be worked through. */
function dolxFishingGearList(kind) {
	const table = kind === "rod" ? setup.fishing.dolx.rods : setup.fishing.dolx.reels;
	return Object.entries(table)
		.sort((a, b) => a[1].order - b[1].order)
		.map(([key, config]) => ({ key, config }));
}
window.dolxFishingGearList = dolxFishingGearList;

/* The shop only puts a piece out once the PC has done enough fishing to want it. */
function dolxFishingGearUnlocked(config) {
	const unlock = config.unlock;
	if (!unlock) return true;
	if (unlock.fishCaught !== undefined && numberOfFishCaught() < unlock.fishCaught) return false;
	if (unlock.requestsCompleted !== undefined && (Number(V.fishing?.baitShopRequestsCompleted) || 0) < unlock.requestsCompleted) return false;
	return true;
}
window.dolxFishingGearUnlocked = dolxFishingGearUnlocked;

/* The bone set */
/* Not stocked anywhere. It comes up on the line in the quiet places, once the PC has fished
   enough to recognise what they have pulled out. */
function dolxBoneFindPiece() {
	dolxFishingEnsure();
	if (!dolxFishingGearOwned("rod", "bone")) return "rod";
	if (!dolxFishingGearOwned("reel", "bone")) return "reel";
	return undefined;
}
window.dolxBoneFindPiece = dolxBoneFindPiece;

function dolxBoneFindWeight() {
	const find = setup.fishing.dolx.boneFind;
	if (!find.locations.includes(V.bus)) return 0;
	if (!dolxBoneFindPiece()) return 0;
	if (numberOfFishCaught() < find.minFishCaught) return 0;
	/* The water only gives it up in the dark, or under a blood moon. */
	if (Weather.dayState !== "night" && !Time.isBloodMoon()) return 0;
	return find.eventWeight;
}
window.dolxBoneFindWeight = dolxBoneFindWeight;

/* Whether the record holds at least one of every small fish */
function dolxSmallFishRecordComplete() {
	const keys = dolxBaitFishKeys();
	if (!keys.length) return false;
	return keys.every(key => V.fishing?.record?.[key]?.numCaught > 0);
}
window.dolxSmallFishRecordComplete = dolxSmallFishRecordComplete;

/* Both halves of the bone tackle, found rather than bought. */
function dolxBoneSetOwned() {
	return dolxFishingGearOwned("rod", "bone") && dolxFishingGearOwned("reel", "bone");
}
window.dolxBoneSetOwned = dolxBoneSetOwned;

function dolxBoneFindTake() {
	const piece = dolxBoneFindPiece();
	if (!piece) return undefined;
	dolxFishingGearGive(piece, "bone");
	return piece;
}
window.dolxBoneFindTake = dolxBoneFindTake;

/* Minigame modifiers */
/* Fractional gear effects are resolved by chance rather than accumulated, so a 20% better reel
   is 20% better on average and the turn still moves the fish a whole number of lengths. */
function dolxFishingRoundRandom(value) {
	if (!Number.isFinite(value)) return 0;
	const whole = Math.floor(value);
	return whole + (State.random() < value - whole ? 1 : 0);
}
window.dolxFishingRoundRandom = dolxFishingRoundRandom;

/* Applied to the turn's result before vanilla writes it into the minigame state.
   Reel and Hold and Slack still do what they did; the gear only changes by how much. */
function dolxFishingGearApplyResult(result, playerAction) {
	if (!result) return result;
	const rod = dolxFishingRod();
	const reel = dolxFishingReel();

	/* Ground the reel takes back. */
	if (playerAction === "reel" && result.fishDistance < 0) {
		result.fishDistance = -dolxFishingRoundRandom(-result.fishDistance * (reel.reelMult ?? 1));
	}
	/* Ground given away while the line is slack. A good drag holds some of it. */
	if (playerAction === "slack" && result.fishDistance > 0) {
		result.fishDistance = dolxFishingRoundRandom(result.fishDistance * (reel.slackMult ?? 1));
	}
	/* How hard the fish works against the rod. */
	if (result.fishStamina < 0) {
		result.fishStamina = -dolxFishingRoundRandom(-result.fishStamina * (rod.exhaustMult ?? 1));
	}
	/* A rod with backbone tires a fish just by being held against it. */
	if (playerAction === "hold" && (rod.holdBonus ?? 0) > 0 && State.random() < rod.holdBonus) {
		result.fishStamina = (result.fishStamina || 0) - 1;
	}
	/* Everything the fight puts through your arms. */
	if (result.armFatigue > 0) {
		result.armFatigue = dolxFishingRoundRandom(result.armFatigue * (rod.tensionMult ?? 1));
	}
	return result;
}
window.dolxFishingGearApplyResult = dolxFishingGearApplyResult;

/* How fast the line-tension clock runs down. Below 1 is a more forgiving rod. */
function dolxFishingTensionMult() {
	return dolxFishingRod().tensionMult ?? 1;
}
window.dolxFishingTensionMult = dolxFishingTensionMult;

/* What a Reel that misses costs on top of the ordinary failure. Only the bone reel charges it. */
function dolxFishingMisreelPenalty(playerAction) {
	if (playerAction !== "reel") return 0;
	return dolxFishingReel().misreelPenalty ?? 0;
}
window.dolxFishingMisreelPenalty = dolxFishingMisreelPenalty;

/* POCKET */
/* Bait packs like everything else: one slot per kind of thing, however many of it you carry.
   The can is one slot whatever is in it, and stays a slot when it's empty, because an empty
   tin is still a tin you can refill. */
function dolxPocketBaitKeys() {
	return ["worm_can"].concat(dolxBaitFishKeys());
}
window.dolxPocketBaitKeys = dolxPocketBaitKeys;

function dolxPocketBaitValid(key) {
	if (key === "worm_can") return dolxWormCanOwned();
	return dolxIsBaitFishItem(key) && dolxBaitLooseStock(key) > 0;
}
window.dolxPocketBaitValid = dolxPocketBaitValid;

function dolxPocketBaitName(key) {
	if (key === "worm_can") return dolxWormCanName();
	const food = setup.foodstuff[key];
	return food ? food.name.toLocaleUpperFirst() : key;
}
window.dolxPocketBaitName = dolxPocketBaitName;

function dolxPocketBaitIconPath(key) {
	if (key === "worm_can") return "fish/mod/wormcan.png";
	return setup.foodstuff[key]?.icon_path ?? "fish/hook.png";
}
window.dolxPocketBaitIconPath = dolxPocketBaitIconPath;

/* The line under a packed bait: how much is in it, and what it's for. */
function dolxPocketBaitDetail(key) {
	if (key === "worm_can") return `${dolxWormCanCount()}/${dolxWormCanCapacity()}`;
	return String(dolxBaitLooseStock(key));
}
window.dolxPocketBaitDetail = dolxPocketBaitDetail;

/* Put a new bait item straight into the pocket when there's room, so buying a can or landing a
   bait fish doesn't quietly leave it behind. Never bumps anything already packed. */
function dolxPocketAutoPack(key) {
	if (typeof pocketEnsure !== "function" || typeof pocketLockReason !== "function") return false;
	if (!dolxPocketReachable()) return false;
	pocketEnsure();
	pocketSyncBag();
	if (pocketSlotIndex("bait", key) !== -1) return true;
	if (!dolxPocketBaitValid(key)) return false;

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
window.dolxPocketAutoPack = dolxPocketAutoPack;

/* Bait is bought and landed at counters and riverbanks where an NPC often sits in the scene, so
   the bait panel uses the relaxed gate: it still refuses when the PC genuinely can't reach their
   things, but a shopkeeper standing there is not a reason to keep you out of your own bag. */
function dolxPocketReachable() {
	if (typeof pocketLockReason !== "function") return false;
	return pocketLockReason(true) === "";
}
window.dolxPocketReachable = dolxPocketReachable;

/* Packs or unpacks one bait kind. Mirrors pocketSlotToggle, on the relaxed gate. */
function dolxPocketBaitToggle(key) {
	if (!dolxPocketReachable()) return false;
	pocketEnsure();
	pocketSyncBag();
	const existing = pocketSlotIndex("bait", key);
	if (existing !== -1) {
		V.pocket.bag.slots.splice(existing, 1);
		pocketCommit();
		return true;
	}
	return dolxPocketAutoPack(key);
}
window.dolxPocketBaitToggle = dolxPocketBaitToggle;

/* Everything the PC could pack right now, for the packing panel. */
function dolxPocketBaitList() {
	return dolxPocketBaitKeys().filter(key => dolxPocketBaitValid(key));
}
window.dolxPocketBaitList = dolxPocketBaitList;

/* Shop and UI helpers */
/* Prices go through the X-Change inflation hook so the label matches the charge. */
function dolxFishingPrice(base) {
	return typeof setup !== "undefined" && setup.inflation ? setup.inflation.spendPrice(base, "fishing") : base;
}
window.dolxFishingPrice = dolxFishingPrice;

function dolxFishingAfford(base) {
	if (typeof setup !== "undefined" && setup.inflation) return setup.inflation.canAfford(base, "fishing");
	return V.money >= base;
}
window.dolxFishingAfford = dolxFishingAfford;

/* Opens the bait overlay on its Tackle tab. */
function dolxOpenFishingTackle() {
	if (!canOpenBaitOverlay()) return;
	V.fishing.displayBaitNotification = false;
	wikifier("overlayReplace", '"tackle"');
}
window.dolxOpenFishingTackle = dolxOpenFishingTackle;

/* The passage a fishing spot's wait loop returns to. */
function dolxFishingWaitPassage(bus) {
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
			throw new Error(`dolxFishingWaitPassage: unknown bus "${bus}"`);
	}
}
window.dolxFishingWaitPassage = dolxFishingWaitPassage;

/* Debug */
/* Hands over every rod and reel and a full can, for testing the fight modifiers side by side. */
function debugUnlockAllFishingGear() {
	dolxFishingEnsure();
	for (const key of Object.keys(setup.fishing.dolx.rods)) dolxFishingGearGive("rod", key);
	for (const key of Object.keys(setup.fishing.dolx.reels)) dolxFishingGearGive("reel", key);
	V.fishing.wormCan.owned = true;
	V.fishing.wormCan.worms = dolxWormCanCapacity();
	for (const key of dolxBaitFishKeys()) {
		if (!V.foodstuff[key]) V.foodstuff[key] = { amount: 0 };
		V.foodstuff[key].amount += 10;
	}
	dolxPocketAutoPack("worm_can");
}
window.debugUnlockAllFishingGear = debugUnlockAllFishingGear;

/* Eating a fish whole */
/* The animal transformations far enough along to swallow a fish, strongest build last so the
   caller can just take the highest. */
function dolxFishEatingTfs() {
	const names = setup.fishing?.dolx?.fishEatingTransformations || [];
	return names.filter(name => effectiveTransformationLevel(name) >= 3);
}
window.dolxFishEatingTfs = dolxFishEatingTfs;

/* A bait fish is small by definition, so the size test a hooked fish gets is already satisfied. */
function dolxCanEatBaitFish(key) {
	return dolxIsBaitFishItem(key) && dolxBaitLooseStock(key) > 0 && dolxFishEatingTfs().length > 0;
}
window.dolxCanEatBaitFish = dolxCanEatBaitFish;

/* Worms need no transformation. Anyone can swallow one; almost nobody enjoys it */
function dolxCanEatWorm() {
	return (dolxWormCanOwned() && dolxWormCanCount() > 0) || dolxBaitLooseStock("bait_worm") > 0;
}
window.dolxCanEatWorm = dolxCanEatWorm;

/* Takes one bait out of the bag to eat. The stat effects belong to the passage, the way they do
   when a fish is eaten off the hook. Returns false when there was nothing to take. */
function dolxEatBait(key, commit = true) {
	if (key === "bait_worm") {
		if (!dolxCanEatWorm()) return false;
		/* The can empties first, the same order the hook takes them in */
		if (dolxWormCanOwned() && dolxWormCanCount() > 0) {
			V.fishing.wormCan.worms -= 1;
			V.dolxBaitEatenFromCan = true;
		} else {
			V.foodstuff.bait_worm.amount -= 1;
			V.dolxBaitEatenFromCan = false;
		}
	} else {
		if (!dolxCanEatBaitFish(key)) return false;
		V.foodstuff[key].amount -= 1;
	}
	/* The can stays in the bag when it empties; a fish leaves once the last one is gone. */
	pocketSyncBag();
	if (commit) pocketCommit();
	return true;
}
window.dolxEatBait = dolxEatBait;

/* Prepare the state the Eat link carries into its passage, the same way the POCKET's food does. */
function dolxPocketEatBaitFromMenu(key) {
	/* Keep the original passage when the player opens the bag again from the eating report. */
	const destination = V.passage === "Pocket Eat Bait" ? V.dolxBaitEatReturn : V.passage;
	if (!dolxEatBait(key, false)) return false;
	V.dolxBaitEatReturn = destination;
	V.dolxBaitEaten = key;
	if (typeof closeOverlay === "function") closeOverlay();
	return true;
}
window.dolxPocketEatBaitFromMenu = dolxPocketEatBaitFromMenu;

/* The journal */
/* The species an undersized catch comes from, or undefined for a bait fish that is caught
   outright. The small carp is the only one of those. */
function dolxSmallCatchParent(baitKey) {
	return Object.keys(setup.fishing.dolx.smallCatch).find(parent => setup.fishing.dolx.smallCatch[parent].key === baitKey);
}
window.dolxSmallCatchParent = dolxSmallCatchParent;

/* Every fish that has a record of its own, bait fish included. */
function dolxJournalAllFishKeys() {
	const keys = Object.keys(setup.fishing.lootTables.fish);
	return keys.concat(dolxBaitFishKeys().filter(key => !keys.includes(key)));
}
window.dolxJournalAllFishKeys = dolxJournalAllFishKeys;

/* An undersized catch turns up wherever its parent does; everything else reads its own table.
   No location means "anywhere", which is what the records list wants. */
function dolxFishAtLocation(fishKey, location) {
	if (!location) return true;
	const fish = setup.fishing.lootTables.fish;
	const key = fish[fishKey] ? fishKey : dolxSmallCatchParent(fishKey);
	return !!key && (fish[key]?.locations?.[location] || 0) > 0;
}
window.dolxFishAtLocation = dolxFishAtLocation;

/* The journal lists bait fish apart from the fish they are used to catch. Passing a location
   narrows either list to what can be caught there. */
function dolxJournalFishKeys(location) {
	return dolxJournalAllFishKeys().filter(key => !dolxIsBaitFishItem(key) && dolxFishAtLocation(key, location));
}
window.dolxJournalFishKeys = dolxJournalFishKeys;

function dolxJournalBaitFishKeys(location) {
	return dolxBaitFishKeys().filter(key => dolxFishAtLocation(key, location));
}
window.dolxJournalBaitFishKeys = dolxJournalBaitFishKeys;

/* Icon and size range for a record entry. A bait fish with no loot table of its own borrows its
   parent's floor and tops out at the threshold that made it small in the first place, so the
   biggest-possible star still means something. */
function dolxFishRecordConfig(fishKey) {
	const config = setup.fishing.lootTables.fish[fishKey];
	if (config) return config;
	const parent = dolxSmallCatchParent(fishKey);
	const parentConfig = setup.fishing.lootTables.fish[parent];
	return {
		minSize: parentConfig ? parentConfig.minSize : 0,
		maxSize: parent ? dolxSmallCatchThreshold(parent) : 0,
		icon: setup.foodstuff[fishKey] ? setup.foodstuff[fishKey].icon_path : undefined,
	};
}
window.dolxFishRecordConfig = dolxFishRecordConfig;

/* Names */
/* Vanilla prints a fish's loot-table key as its name, which works only while the two are the
   same word. The sardine keeps the key `baitfish` for compatibility with vanilla and with future
   fishing updates, so every player-facing print goes through here instead. */
function dolxFishName(fishKey) {
	return setup.foodstuff[fishKey]?.name?.replace(/_/g, " ") ?? fishKey;
}
window.dolxFishName = dolxFishName;

function dolxFishNamePlural(fishKey) {
	return setup.foodstuff[fishKey]?.plural?.replace(/_/g, " ") ?? dolxFishName(fishKey);
}
window.dolxFishNamePlural = dolxFishNamePlural;
