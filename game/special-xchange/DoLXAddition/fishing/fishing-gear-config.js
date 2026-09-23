/* DoLX fishing expansion: every tunable value lives here.
   Nothing in this file reaches into a fishing passage, and nothing in a fishing passage
   hardcodes a number that belongs here. When vanilla changes its fishing tables, the work
   is re-checking this file rather than hunting through the twee. */

function initFishingGear() {
	const fish = setup.fishing.lootTables.fish;

	setup.fishing.config = {
		/* Bait */
		/* How many worms one can holds. */
		wormCanCapacity: 20,
		/* Pennies. The can itself, plus the worms it comes filled with. */
		wormCanPrice: 600,
		wormPrice: 120,

		/* Tags describe what a fish is, so bait can be written against the tags instead of
		   listing every species. A new vanilla fish only needs a row here to join the system. */
		fishTags: {
			haddock: ["salt"],
			salmon: ["salt", "fresh", "cold", "predator", "large"],
			trout: ["fresh", "cold", "river", "predator"],
			herring: ["salt", "small"],
			whiting: ["salt", "predator"],
			mackerel: ["salt", "predator", "fast"],
			flounder: ["salt", "bottom"],
			bass: ["salt", "predator", "large"],
			roach: ["fresh", "slow", "small"],
			perch: ["fresh", "predator"],
			chub: ["fresh", "river"],
			grayling: ["fresh", "cold", "river"],
			cod: ["salt", "predator", "large", "bottom"],
			pike: ["fresh", "predator", "large", "slow"],
			eel: ["fresh", "predator", "large", "bottom", "slow"],
			small_carp: ["fresh", "small"],
			baitfish: ["salt", "small"],
		},

		/* A catch from the bottom half of a species' size range is kept as its small variant instead.
		   These fish replace vanilla's common baitfish supply, so they need to be practical catches,
		   not rare minimum-size rolls. A species may still override the fraction. */
		smallCatchFraction: 0.5,
		/* Bass, herring and trout must also turn up often enough for that lower half to matter. */
		smallCatchWeight: 1.5,
		/* Each matching source multiplies the small-fish roll, so worms plus both bone pieces
		   provide the strongest result without introducing another player-state counter. */
		smallFishBonuses: {
			worm: 1.5,
			boneRod: 1.25,
			boneReel: 1.25,
		},
		smallCatch: {
			bass: { key: "small_bass" },
			herring: { key: "small_herring" },
			trout: { key: "small_trout" },
		},

		/* The transformations whose jaws can take a whole fish. Level 3 is where the muzzle or
		   beak is pronounced enough for it. Listed once and read by both the "Eat the fish" gate
		   and the bag, so adding an animal is a one-word change. */
		fishEatingTransformations: ["cat", "fox", "bird", "bear", "waterdragon"],
		/* The largest catch that will go down whole. */
		fishEatingMaxSize: 20,

		/* Per-bait tuning.
		   catchWeight - multiplies the odds of the bite event itself.
		   favours     - multiplier per matching fish tag, multiplied together. Below 1 repels.

		   Whether a bait counts as a bait fish (satisfies requiresBaitFish, uses the baitfish
		   weight class, and has to be carried) is not repeated here. It comes from the one
		   `baitFish` flag on the foodstuff, so the two can never disagree.

		   baitSizeBonusAt - a favour product at or above this pushes the size roll toward the top
		                     of the range, the same way a preferred season or location does. */
		baitSizeBonusAt: 2,
		bait: {
			bait_worm: {
				catchWeight: 0.5,
				favours: {},
			},
			/* Strong on big predators, and leans freshwater, so sea-caught bass are worth
			   carrying inland to the lake. */
			small_bass: {
				catchWeight: 1.1,
				favours: { predator: 2.2, large: 1.8, fresh: 1.6, salt: 0.6, small: 0.35 },
			},
			/* The broad freshwater bait. Best on the big, slow lake fish. */
			small_carp: {
				catchWeight: 1.1,
				favours: { fresh: 2, slow: 2, large: 1.5, salt: 0.4, small: 0.35 },
			},
			/* River and cold water. */
			small_trout: {
				catchWeight: 1.1,
				favours: { river: 2.2, cold: 2, fresh: 1.6, predator: 1.6, salt: 0.4, small: 0.35 },
			},
			/* The sea bait. */
			small_herring: {
				catchWeight: 1.1,
				favours: { salt: 2.2, large: 1.8, predator: 1.4, fresh: 0.4, small: 0.35 },
			},
		},

		/* Rods and reels */
		/* A rod governs tension: how much punishment the line and your arms take while the fish
		   fights, and how fast the fish wears itself out against the rod's backbone.
		     tensionMult - scales the line-tension clock and arm fatigue. Below 1 is forgiving.
		     exhaustMult - scales the fish stamina you drain.
		     holdBonus   - chance that holding drains one extra point of stamina. */
		rods: {
			black: {
				displayName: "Black Rod",
				icon: "fish/mod/rod/black.png",
				order: 0,
				tensionMult: 1,
				exhaustMult: 1,
				holdBonus: 0,
				source: "starter",
				blurb: "A basic fishing rod. Simple and reliable.",
			},
			silver: {
				displayName: "Silver Rod",
				icon: "fish/mod/rod/silver.png",
				order: 1,
				tensionMult: 0.9,
				exhaustMult: 1,
				holdBonus: 0,
				source: "shop",
				price: 4500,
				unlock: { fishCaught: 10 },
				blurb: "A lighter rod that puts less strain on your line.",
			},
			gold: {
				displayName: "Gold Rod",
				icon: "fish/mod/rod/gold.png",
				order: 2,
				tensionMult: 0.8,
				exhaustMult: 1,
				holdBonus: 0.5,
				source: "shop",
				price: 15000,
				unlock: { fishCaught: 40, requestsCompleted: 3 },
				blurb: "A strong rod that reduces strain and helps tire fish while holding.",
			},
			bone: {
				displayName: "Bone Rod",
				icon: "fish/mod/rod/bone.png",
				order: 3,
				tensionMult: 1.15,
				exhaustMult: 1.2,
				holdBonus: 0,
				source: "special",
				blurb: "A rigid rod that tires fish faster and draws small fish, but puts more strain on you and the line.",
			},
		},

		/* A reel governs retrieval: ground gained on Reel, ground lost on Slack, and what a
		   mistimed Reel costs.
		     reelMult       - scales the distance a successful Reel closes.
		     slackMult      - scales the distance lost while slacking. Below 1 is forgiving.
		     misreelPenalty - extra line-tension loss when a Reel fails its check. */
		reels: {
			black: {
				displayName: "Black Reel",
				icon: "fish/mod/reel/black.png",
				order: 0,
				reelMult: 1,
				slackMult: 1,
				misreelPenalty: 0,
				source: "starter",
				blurb: "A basic reel with no special effects.",
			},
			silver: {
				displayName: "Silver Reel",
				icon: "fish/mod/reel/silver.png",
				order: 1,
				reelMult: 1.1,
				slackMult: 1,
				misreelPenalty: 0,
				source: "shop",
				price: 3500,
				unlock: { fishCaught: 10 },
				blurb: "A smoother reel that pulls fish in faster.",
			},
			gold: {
				displayName: "Gold Reel",
				icon: "fish/mod/reel/gold.png",
				order: 2,
				reelMult: 1.2,
				slackMult: 0.8,
				misreelPenalty: 0,
				source: "shop",
				price: 12000,
				unlock: { fishCaught: 40, requestsCompleted: 3 },
				blurb: "A strong reel that pulls fish in faster and loses less distance when giving slack.",
			},
			bone: {
				displayName: "Bone Reel",
				icon: "fish/mod/reel/bone.png",
				order: 3,
				reelMult: 1.5,
				slackMult: 1,
				misreelPenalty: 1.25,
				source: "special",
				blurb: "A powerful reel that pulls fish in much faster and draws small fish, but mistakes put more strain on the line.",
			},
		},

		/* The Bone Reel can be found near fishing spots at night. */
		boneFind: {
			locations: ["fishingPier", "fishingBeach", "fishingCoastPath", "fishingForestLake", "fishingMoor"],
			minFishCaught: 25,
			eventWeight: 0.35,
		},
	};

	/* The sardine */
	/* Vanilla's "baitfish" is a proper fish in DoLX: a sardine. The key and the sprite filename
	   stay `baitfish` so vanilla's own references and any future fishing update still line up.
	   Only its player-facing identity and where it swims change here.

	   It is no longer usable as bait. That job and vanilla's common bait-fish weight class now
	   belong to the four small fish instead. */
	Object.assign(fish.baitfish, {
		preferredLocation: ["fishingBeach", "fishingPier"],
		preferredBait: undefined,
		locations: {
			fishingBeach: 1,
			fishingPier: 1,
			fishingCoastPath: 0.75,
		},
		isBaitFish: false,
		/* Sardines shoal, so the hook often comes up with more than one. */
		shoal: { chance: 0.55, min: 2, max: 3 },
	});

	Object.assign(setup.foodstuff.baitfish, {
		name: "sardine",
		singular: "sardine",
		plural: "sardines",
		is_fishing_bait: false,
		shop: { sell_price: 150 },
	});

	/* New species: small carp */
	/* The other three bait fish are undersized catches of a species vanilla already has. Vanilla
	   has no carp, so the small carp is caught directly instead: the freshwater counterpart to the
	   sardine, and the little fish a worm brings up in the lake and on the moor.

	   `isBaitFish` is vanilla's weight class for exactly that, so it carries it. That is separate
	   from the `baitFish` flag on the foodstuff, which is what makes it usable as bait. */
	fish.small_carp = {
		minSize: 6,
		maxSize: 18,
		preferredSeason: ["spring", "summer", "autumn", "winter"],
		preferredLocation: ["fishingForestLake", "fishingMoor"],
		locations: {
			fishingForestLake: 1,
			fishingMoor: 1,
		},
		cookable: false,
		isBaitFish: true,
		icon: "fish/mod/small-carp.png",
		preferredBait: "bait_worm",
	};

	/* Vanilla builds its icon paths from the fish key. Store the path on the config for the
	   journal to read, so a modded fish can keep its art wherever it lives. */
	for (const [key, config] of Object.entries(fish)) {
		config.icon ??= `fish/${key}.png`;
	}

	/* Foodstuff entries */
	const smallFishFood = {
		small_bass: { index: 166, name: "small bass", plural: "small bass", icon: "fish/mod/small-bass.png", sell_price: 220 },
		small_carp: { index: 167, name: "small carp", plural: "small carp", icon: "fish/mod/small-carp.png", sell_price: 200 },
		small_herring: { index: 168, name: "small herring", plural: "small herring", icon: "fish/mod/small-herring.png", sell_price: 180 },
		small_trout: { index: 169, name: "small trout", plural: "small trout", icon: "fish/mod/small-trout.png", sell_price: 220 },
	};
	for (const [key, row] of Object.entries(smallFishFood)) {
		setup.foodstuff[key] = {
			index: row.index,
			name: row.name,
			singular: row.name,
			plural: row.plural,
			icon: row.icon,
			icon_path: row.icon,
			category: "seafood",
			kitchen_item_type_icon: "recipe-seafood.png",
			prop_folder: "ingredient",
			is_fishing_bait: true,
			/* The shared flag that marks a small fish as usable bait. Deliberately not the
			   `baitfish` species key, so the two ideas stay separate. */
			baitFish: true,
			shop: {
				sell_price: row.sell_price,
			},
		};
	}

	/* Keep the catalogue in the sorted order the rest of the game expects. */
	const sortedFoodstuff = {};
	Object.keys(setup.foodstuff)
		.sort()
		.forEach(key => {
			sortedFoodstuff[key] = setup.foodstuff[key];
		});
	setup.foodstuff = sortedFoodstuff;

	/* Held props */
	/* No new sprites: a small fish in your hand is a small fish. */
	for (const key of Object.keys(smallFishFood)) {
		setup.props[`caught_${key}`] = {
			folder: "fish",
			armPosition: "right_hold",
			overUnderSplit: true,
			fileName: "caught-baitfish",
		};
	}
}
window.initFishingGear = initFishingGear;
